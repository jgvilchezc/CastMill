# Quick Transcribe History — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-save every logged-in user's transcription to a cheap text table with an AI-generated title, and surface it in a history panel on the transcribe page.

**Architecture:** A dedicated `transcriptions` table (text only, no embeddings, no audio). A tiny Groq `llama-3.1-8b-instant` call generates the title with a free heuristic fallback. The existing transcribe route auto-inserts on success for logged-in users; a new history API lists/deletes; the `TranscribeTool` UI gains a history panel for logged-in users.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (RLS), groq-sdk, Vitest, shadcn/ui.

**Spec:** `docs/plans/2026-06-08-transcribe-history-design.md`

---

## File Structure

- Create: `supabase/migrations/007_transcriptions.sql` — table + RLS + index.
- Create: `src/lib/transcribe/title.ts` — `generateTitle` + `fallbackTitle`.
- Create: `src/lib/transcribe/title.test.ts`
- Create: `src/lib/transcribe/history.ts` — `listTranscriptions`, `saveTranscription`, `deleteTranscription`.
- Create: `src/lib/transcribe/history.test.ts`
- Modify: `src/app/api/tools/transcribe/route.ts` — auto-save for logged-in users.
- Create: `src/app/api/tools/transcribe/history/route.ts` — GET (list) + DELETE.
- Create: `src/app/api/tools/transcribe/history/route.test.ts`
- Modify: `src/components/transcribe/TranscribeTool.tsx` — history panel.

---

## Task 1: Migration `007_transcriptions.sql`

**Files:**
- Create: `supabase/migrations/007_transcriptions.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/007_transcriptions.sql`:

```sql
-- Persistent history for Quick Transcribe (logged-in users). Text only — no
-- audio, no embeddings. Kept cheap on purpose: this is a free feature.

create table if not exists public.transcriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  text       text not null,
  language   text,
  duration   real,
  filename   text,
  provider   text,
  created_at timestamptz not null default now()
);

create index if not exists transcriptions_user_created_idx
  on public.transcriptions (user_id, created_at desc);

alter table public.transcriptions enable row level security;

create policy "Users manage own transcriptions"
  on public.transcriptions for all
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Commit** (applying to the DB is deferred to the human)

```bash
git add supabase/migrations/007_transcriptions.sql
git commit -m "feat(transcribe): migration for transcription history table"
```

---

## Task 2: `title.ts` — AI title + free fallback (TDD)

**Files:**
- Create: `src/lib/transcribe/title.ts`
- Test: `src/lib/transcribe/title.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/transcribe/title.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const createCompletion = vi.fn();

vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: createCompletion } };
  },
}));

import { generateTitle, fallbackTitle } from "./title";

beforeEach(() => {
  createCompletion.mockReset();
  process.env.GROQ_API_KEY = "test-key";
});

describe("fallbackTitle", () => {
  it("takes the first words and caps length", () => {
    expect(fallbackTitle("hola mundo esto es una prueba larga de mas palabras"))
      .toBe("hola mundo esto es una prueba");
  });

  it("returns a default for empty text", () => {
    expect(fallbackTitle("   ")).toBe("Transcripción");
  });
});

describe("generateTitle", () => {
  it("returns the trimmed model title", async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: '  Reunión de ventas  ' } }],
    });
    const title = await generateTitle("hablamos de la estrategia de ventas q1");
    expect(title).toBe("Reunión de ventas");
  });

  it("falls back to heuristic when the model errors", async () => {
    createCompletion.mockRejectedValue(new Error("groq down"));
    const title = await generateTitle("nota sobre el lanzamiento del producto nuevo");
    expect(title).toBe("nota sobre el lanzamiento del producto");
  });

  it("falls back when GROQ_API_KEY is missing", async () => {
    delete process.env.GROQ_API_KEY;
    const title = await generateTitle("texto de prueba sin clave de api configurada");
    expect(createCompletion).not.toHaveBeenCalled();
    expect(title).toBe("texto de prueba sin clave de api");
  });

  it("strips surrounding quotes from the model output", async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: '"Plan de marketing"' } }],
    });
    expect(await generateTitle("algo")).toBe("Plan de marketing");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- transcribe/title`
Expected: FAIL (module `./title` not found).

- [ ] **Step 3: Implement `title.ts`**

Create `src/lib/transcribe/title.ts`:

```ts
import Groq from "groq-sdk";

const MAX_TITLE_CHARS = 80;
const MAX_INPUT_CHARS = 1200;
const FALLBACK_WORDS = 6;

export function fallbackTitle(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Transcripción";
  return words.slice(0, FALLBACK_WORDS).join(" ").slice(0, MAX_TITLE_CHARS);
}

export async function generateTitle(text: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return fallbackTitle(text);

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 20,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "Generate a short, specific title (max 6 words) for this audio " +
            "transcription. Reply with ONLY the title — no quotes, no prefix — " +
            "in the same language as the text.",
        },
        { role: "user", content: text.slice(0, MAX_INPUT_CHARS) },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^["'`]+|["'`]+$/g, "").trim();
    if (!cleaned) return fallbackTitle(text);
    return cleaned.slice(0, MAX_TITLE_CHARS);
  } catch (err) {
    console.error("[transcribe/title] generation failed:", err);
    return fallbackTitle(text);
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- transcribe/title`
Expected: PASS (6 tests).

- [ ] **Step 5: Lint + commit**

Run: `npm run lint`
```bash
git add src/lib/transcribe/title.ts src/lib/transcribe/title.test.ts
git commit -m "feat(transcribe): cheap AI title with free fallback"
```

---

## Task 3: `history.ts` — store helpers (TDD)

**Files:**
- Create: `src/lib/transcribe/history.ts`
- Test: `src/lib/transcribe/history.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/transcribe/history.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

function makeClient() {
  return { from: fromMock };
}

/** Chainable Supabase query-builder mock resolving to `result`. */
function queryReturning(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  for (const m of ["insert", "delete", "select", "eq", "order", "limit"]) {
    q[m] = vi.fn(() => q);
  }
  q.single = vi.fn(() => Promise.resolve(result));
  q.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return q;
}

import {
  saveTranscription,
  listTranscriptions,
  deleteTranscription,
} from "./history";

beforeEach(() => {
  fromMock.mockReset();
});

describe("saveTranscription", () => {
  it("inserts the row and returns the new id", async () => {
    const q = queryReturning({ data: { id: "t1" }, error: null });
    fromMock.mockReturnValue(q);

    const id = await saveTranscription(makeClient() as never, {
      userId: "u1",
      title: "Reunión",
      text: "contenido",
      language: "es",
      duration: 12.5,
      filename: "audio.m4a",
      provider: "groq",
    });

    expect(fromMock).toHaveBeenCalledWith("transcriptions");
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        title: "Reunión",
        text: "contenido",
        language: "es",
        provider: "groq",
      }),
    );
    expect(id).toBe("t1");
  });

  it("returns null when insert errors", async () => {
    fromMock.mockReturnValue(
      queryReturning({ data: null, error: { message: "boom" } }),
    );
    const id = await saveTranscription(makeClient() as never, {
      userId: "u1",
      title: "x",
      text: "y",
      language: null,
      duration: 0,
      filename: "a",
      provider: "groq",
    });
    expect(id).toBeNull();
  });
});

describe("listTranscriptions", () => {
  it("scopes by user, orders desc, limits 50", async () => {
    const rows = [{ id: "a" }];
    const q = queryReturning({ data: rows, error: null });
    fromMock.mockReturnValue(q);

    const items = await listTranscriptions(makeClient() as never, "u1");
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(q.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(q.limit).toHaveBeenCalledWith(50);
    expect(items).toEqual(rows);
  });
});

describe("deleteTranscription", () => {
  it("scopes delete by id and user", async () => {
    const q = queryReturning({ data: null, error: null });
    fromMock.mockReturnValue(q);
    await deleteTranscription(makeClient() as never, "t1", "u1");
    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith("id", "t1");
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- transcribe/history`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `history.ts`**

Create `src/lib/transcribe/history.ts`:

```ts
export interface TranscriptionRow {
  id: string;
  title: string;
  text: string;
  language: string | null;
  duration: number | null;
  filename: string | null;
  provider: string | null;
  created_at: string;
}

export interface SaveTranscriptionInput {
  userId: string;
  title: string;
  text: string;
  language: string | null;
  duration: number;
  filename: string;
  provider: string;
}

const LIST_LIMIT = 50;
const LIST_COLUMNS =
  "id, title, text, language, duration, filename, provider, created_at";

// The transcriptions table is not in the hand-maintained types.ts, so callers
// pass an untyped Supabase client and we cast — matching the rag/memory pattern.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function saveTranscription(
  supabase: AnyClient,
  input: SaveTranscriptionInput,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("transcriptions")
    .insert({
      user_id: input.userId,
      title: input.title,
      text: input.text,
      language: input.language,
      duration: input.duration,
      filename: input.filename,
      provider: input.provider,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[transcribe/history] save failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function listTranscriptions(
  supabase: AnyClient,
  userId: string,
): Promise<TranscriptionRow[]> {
  const { data, error } = await supabase
    .from("transcriptions")
    .select(LIST_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (error) throw new Error(error.message);
  return (data ?? []) as TranscriptionRow[];
}

export async function deleteTranscription(
  supabase: AnyClient,
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("transcriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- transcribe/history`
Expected: PASS (4 tests).

- [ ] **Step 5: Lint + commit**

Run: `npm run lint`
```bash
git add src/lib/transcribe/history.ts src/lib/transcribe/history.test.ts
git commit -m "feat(transcribe): transcription history store helpers"
```

---

## Task 4: Auto-save in the transcribe route

**Files:**
- Modify: `src/app/api/tools/transcribe/route.ts`

- [ ] **Step 1: Add imports**

At the top of `src/app/api/tools/transcribe/route.ts`, after the existing
`format` import block, add:

```ts
import { generateTitle } from "@/lib/transcribe/title";
import { saveTranscription } from "@/lib/transcribe/history";
```

- [ ] **Step 2: Auto-save before the final response**

In the `POST` handler, the code currently ends with:

```ts
  const text =
    result.segments.length > 0
      ? formatParagraphs(result.segments)
      : result.text.trim();
  const duration = inferDuration(result.segments);

  return NextResponse.json({
    text,
    language: result.language,
    duration,
    filename: audio.name,
    provider: result.provider,
  });
}
```

Replace that block with:

```ts
  const text =
    result.segments.length > 0
      ? formatParagraphs(result.segments)
      : result.text.trim();
  const duration = inferDuration(result.segments);

  let historyId: string | null = null;
  let title: string | null = null;
  if (user) {
    try {
      title = await generateTitle(text);
      historyId = await saveTranscription(supabase, {
        userId: user.id,
        title,
        text,
        language: result.language === "unknown" ? null : result.language,
        duration,
        filename: audio.name,
        provider: result.provider,
      });
    } catch (err) {
      console.error("[transcribe] history save failed:", err);
    }
  }

  return NextResponse.json({
    text,
    language: result.language,
    duration,
    filename: audio.name,
    provider: result.provider,
    historyId,
    title,
  });
}
```

(`user` and `supabase` are already in scope from the earlier auth block.)

- [ ] **Step 3: Verify lint + build + existing tests**

Run: `npm run lint && npm run build`
Expected: passes; `/api/tools/transcribe` still in the route tree.
Run: `npm test`
Expected: all prior tests still pass (no new tests this task).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tools/transcribe/route.ts
git commit -m "feat(transcribe): auto-save transcriptions for logged-in users"
```

---

## Task 5: History API route (TDD)

**Files:**
- Create: `src/app/api/tools/transcribe/history/route.ts`
- Test: `src/app/api/tools/transcribe/history/route.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/tools/transcribe/history/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUser, listTranscriptions, deleteTranscription } = vi.hoisted(() => ({
  getUser: vi.fn(),
  listTranscriptions: vi.fn(),
  deleteTranscription: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/transcribe/history", () => ({
  listTranscriptions,
  deleteTranscription,
}));

import { GET, DELETE } from "./route";

const authed = () => getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
const anon = () => getUser.mockResolvedValue({ data: { user: null } });

beforeEach(() => {
  getUser.mockReset();
  listTranscriptions.mockReset();
  deleteTranscription.mockReset();
});

describe("GET /api/tools/transcribe/history", () => {
  it("401 when unauthenticated", async () => {
    anon();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the user's items", async () => {
    authed();
    listTranscriptions.mockResolvedValue([{ id: "a" }]);
    const res = await GET();
    expect(listTranscriptions).toHaveBeenCalledWith(expect.anything(), "u1");
    expect(await res.json()).toEqual({ items: [{ id: "a" }] });
  });
});

describe("DELETE /api/tools/transcribe/history", () => {
  it("401 when unauthenticated", async () => {
    anon();
    const res = await DELETE(
      new Request("http://x", { method: "DELETE", body: JSON.stringify({ id: "t1" }) }),
    );
    expect(res.status).toBe(401);
  });

  it("400 when id missing", async () => {
    authed();
    const res = await DELETE(
      new Request("http://x", { method: "DELETE", body: JSON.stringify({}) }),
    );
    expect(res.status).toBe(400);
  });

  it("deletes scoped to the user", async () => {
    authed();
    const res = await DELETE(
      new Request("http://x", { method: "DELETE", body: JSON.stringify({ id: "t1" }) }),
    );
    expect(deleteTranscription).toHaveBeenCalledWith(expect.anything(), "t1", "u1");
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- transcribe/history/route`
Expected: FAIL (module `./route` not found).

- [ ] **Step 3: Implement the route**

Create `src/app/api/tools/transcribe/history/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listTranscriptions,
  deleteTranscription,
} from "@/lib/transcribe/history";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await listTranscriptions(supabase, user.id);
  return NextResponse.json({ items });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await deleteTranscription(supabase, body.id, user.id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- transcribe/history/route`
Expected: PASS (5 tests).

- [ ] **Step 5: Lint + build + commit**

Run: `npm run lint && npm run build`
Expected: `/api/tools/transcribe/history` appears in the route tree.
```bash
git add src/app/api/tools/transcribe/history/route.ts src/app/api/tools/transcribe/history/route.test.ts
git commit -m "feat(transcribe): history list + delete API"
```

---

## Task 6: History panel in TranscribeTool

**Files:**
- Modify: `src/components/transcribe/TranscribeTool.tsx`

UI verified via lint + build + manual browser checks (no unit tests for components,
matching the repo convention). The manual check is deferred to the human.

- [ ] **Step 1: Add imports and types**

At the top of `src/components/transcribe/TranscribeTool.tsx`:
- Add `useEffect` to the existing `react` import (currently `useRef, useState`).
- Add `import { useUser } from "@/lib/context/user-context";`
- Add `Clock` and `Trash2` to the existing `lucide-react` import.

Add a history item type near the existing `TranscriptionResult` interface:

```tsx
interface HistoryItem {
  id: string;
  title: string;
  text: string;
  language: string | null;
  duration: number | null;
  filename: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Add state + load/select/delete logic**

Inside the component, after the existing `useState` hooks, add:

```tsx
  const { user } = useUser();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/tools/transcribe/history")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setHistory((d.items ?? []) as HistoryItem[]))
      .catch(() => {});
  }, [user]);

  function loadFromHistory(item: HistoryItem) {
    setResult({
      text: item.text,
      language: item.language ?? "unknown",
      duration: item.duration ?? 0,
      filename: item.filename ?? "historial",
      provider: "groq",
    });
    setEditedText(item.text);
    setError(null);
  }

  async function deleteFromHistory(id: string) {
    await fetch("/api/tools/transcribe/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }
```

NOTE: `setResult` expects a `TranscriptionResult`. Confirm its fields match
(`text, language, duration, filename, provider`); the object above provides all of
them. If `TranscriptionResult.provider` is a union (`"groq" | "huggingface"`),
casting `provider: "groq"` is fine for a reloaded item.

- [ ] **Step 3: Prepend new transcriptions to history**

In the submit handler, right after `setResult(data); setEditedText(data.text);`,
add (only when the response carried a `historyId`):

```tsx
      if (data.historyId && data.title) {
        setHistory((prev) => [
          {
            id: data.historyId,
            title: data.title,
            text: data.text,
            language: data.language ?? null,
            duration: data.duration ?? null,
            filename: data.filename ?? null,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
```

- [ ] **Step 4: Render the history panel**

Add a panel rendered only when `user && history.length > 0`. Place it after the
main result/upload area, near the end of the returned JSX (match the existing
container/Card styling used elsewhere in the file). Example block:

```tsx
      {user && history.length > 0 && (
        <div className="mt-8 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Historial
          </div>
          <div className="space-y-1">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                <button
                  onClick={() => loadFromHistory(item)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.filename ?? "audio"} ·{" "}
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </button>
                <button
                  onClick={() => deleteFromHistory(item.id)}
                  aria-label="Eliminar"
                  className="text-muted-foreground/60 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
```

Adjust the wrapper to fit the component's actual outermost layout container.

- [ ] **Step 5: Verify lint + build + tests**

Run: `npm run lint && npm run build`
Expected: passes. Watch for the repo's `react-hooks/exhaustive-deps` and
`react-hooks/set-state-in-effect` rules — if the linter flags the `useEffect`,
add an inline `// eslint-disable-next-line ...` with a short justification, matching
the existing pattern in `InspirationPanel.tsx` / `PWAInstallButton.tsx`. Report what
you did.
Run: `npm test`
Expected: full suite green.

- [ ] **Step 6: Commit**

```bash
git add src/components/transcribe/TranscribeTool.tsx
git commit -m "feat(transcribe): history panel in transcribe tool"
```

---

## Self-Review Notes

- **Spec coverage:** table (T1), AI title + fallback (T2), store helpers (T3),
  auto-save for logged-in only (T4), list/delete API (T5), UI panel logged-in only
  (T6). All design sections map to tasks.
- **Cost:** one Groq 8b call (≤1200-char input, 20 output tokens) + one text insert
  per logged-in transcription. No embeddings, no audio storage. Anonymous path
  untouched (no `user` → no save).
- **Failure isolation:** auto-save is wrapped in try/catch in the route; title falls
  back to a free heuristic; history-load failures are swallowed in the UI.
- **Naming consistency:** `generateTitle`, `fallbackTitle`, `saveTranscription`,
  `listTranscriptions`, `deleteTranscription`, `HistoryItem`, `historyId` used
  consistently across lib, routes, tests, and UI.
- **Type access:** the `transcriptions` table is accessed via an untyped client cast
  (`AnyClient`), matching the established `rag_documents`/memory pattern; not added to
  `types.ts`.
