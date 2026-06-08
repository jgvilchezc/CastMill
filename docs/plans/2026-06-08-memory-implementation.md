# Memory — Unified Second Brain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified semantic memory ("second brain") fed by manual notes, Quick Transcribe output, podcast episodes, and Instagram data, browsable at `/memory` and consumed by the AI Chat.

**Architecture:** Extend the existing `rag_documents` pgvector table (Approach A) with `pinned`/`title` columns and new `source` values. A new `src/lib/memory/` engine funnels every source through one `embed → upsert` path. Thin per-source adapters add data; the Chat injects pinned manual notes always and retrieves the rest semantically (retrieval is already cross-source via `match_documents`).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (pgvector), Gemini embeddings (`@ai-sdk/google`), Vitest (new), Tailwind 4, shadcn/ui.

**Spec:** `docs/plans/2026-06-08-memory-design.md`

---

## File Structure

**Phase 1 — Foundation**
- Create: `vitest.config.ts` — test runner config with `@` alias.
- Create: `src/lib/memory/chunk.ts` — pure text chunker.
- Create: `src/lib/memory/chunk.test.ts`
- Create: `src/lib/memory/store.ts` — memory CRUD engine over `rag_documents`.
- Create: `src/lib/memory/store.test.ts`
- Create: `supabase/migrations/005_memory_sources.sql` — schema extension.
- Create: `src/app/api/memory/route.ts` — manual CRUD + list (GET/POST/PATCH/DELETE).
- Create: `src/app/api/memory/route.test.ts`
- Create: `src/app/api/memory/search/route.ts` — semantic search.
- Create: `src/app/(app)/memory/page.tsx` — route entry.
- Create: `src/components/memory/MemoryDashboard.tsx` — main client view.
- Create: `src/components/memory/MemoryCard.tsx`
- Create: `src/components/memory/AddMemoryDialog.tsx`
- Modify: `src/components/layout/Sidebar.tsx` — enable nav item.
- Modify: `src/proxy.ts` — add `/memory` to auth-gated routes.

**Phase 2 — Chat integration**
- Modify: `src/app/api/chat/route.ts` — inject pinned memories, source-aware prompt.

**Phase 3 — Transcribe adapter**
- Modify: `src/app/api/memory/route.ts` — allow `source: "transcript"`.
- Modify: `src/components/transcribe/TranscribeTool.tsx` — "Save to Memory" button.

**Phase 4 — Episode adapter**
- Create: `src/app/api/memory/episode/route.ts` — index an episode transcript.
- Create: `src/app/api/memory/episode/route.test.ts`
- Modify: `src/app/(app)/episode/[id]/` page — "Index in Memory" action.

---

# PHASE 1 — FOUNDATION

## Task 1: Vitest setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest@^3`
Expected: adds `vitest` to devDependencies.

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Add test scripts**

In `package.json` `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Sanity test**

Create `src/lib/memory/chunk.test.ts` with a placeholder that proves the runner works (will be replaced in Task 2):

```ts
import { describe, it, expect } from "vitest";

describe("vitest", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/lib/memory/chunk.test.ts
git commit -m "chore: add vitest test runner"
```

---

## Task 2: `chunk.ts` — pure text chunker

**Files:**
- Create: `src/lib/memory/chunk.ts`
- Test: `src/lib/memory/chunk.test.ts` (replace sanity test)

- [ ] **Step 1: Write the failing tests**

Replace `src/lib/memory/chunk.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("returns one chunk for short text", () => {
    expect(chunkText("hello world")).toEqual(["hello world"]);
  });

  it("returns empty array for blank input", () => {
    expect(chunkText("   ")).toEqual([]);
  });

  it("splits on paragraph breaks", () => {
    const text = "para one";
    const long = `${text}\n\n${"b".repeat(900)}`;
    const chunks = chunkText(long, 800);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toBe("para one");
  });

  it("keeps every chunk within the max length", () => {
    const text = Array.from({ length: 50 }, (_, i) => `sentence ${i} text`).join("\n\n");
    const chunks = chunkText(text, 200);
    expect(chunks.every((c) => c.length <= 200)).toBe(true);
    expect(chunks.join(" ")).toContain("sentence 49 text");
  });

  it("hard-splits a single paragraph longer than max", () => {
    const chunks = chunkText("a".repeat(2000), 800);
    expect(chunks.length).toBe(3);
    expect(chunks.every((c) => c.length <= 800)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- chunk`
Expected: FAIL with "chunkText is not a function" / module not found.

- [ ] **Step 3: Implement `chunk.ts`**

Create `src/lib/memory/chunk.ts`:

```ts
const DEFAULT_MAX_CHARS = 800;

/**
 * Split text into chunks no longer than maxChars, preferring paragraph
 * boundaries. Paragraphs longer than maxChars are hard-split.
 */
export function chunkText(text: string, maxChars = DEFAULT_MAX_CHARS): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) {
      chunks.push(current);
      current = "";
    }
  };

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      pushCurrent();
      for (let i = 0; i < para.length; i += maxChars) {
        chunks.push(para.slice(i, i + maxChars));
      }
      continue;
    }
    if (!current) {
      current = para;
    } else if (current.length + 2 + para.length <= maxChars) {
      current = `${current}\n\n${para}`;
    } else {
      pushCurrent();
      current = para;
    }
  }
  pushCurrent();

  return chunks;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- chunk`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/memory/chunk.ts src/lib/memory/chunk.test.ts
git commit -m "feat(memory): add text chunker"
```

---

## Task 3: Migration `005` — extend `rag_documents`

**Files:**
- Create: `supabase/migrations/005_memory_sources.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/005_memory_sources.sql`:

```sql
-- Extend rag_documents to back the unified Memory feature.

-- 1. Allow new source types alongside the existing instagram_* values.
alter table public.rag_documents
  drop constraint if exists rag_documents_source_check;

alter table public.rag_documents
  add constraint rag_documents_source_check check (source in (
    'instagram_caption',
    'instagram_comment',
    'instagram_profile',
    'instagram_insights',
    'manual',
    'transcript',
    'episode'
  ));

-- 2. New columns for manual notes and UI display.
alter table public.rag_documents
  add column if not exists pinned boolean not null default false;

alter table public.rag_documents
  add column if not exists title text;

-- 3. Helps the "always inject pinned" Chat query.
create index if not exists rag_documents_user_pinned_idx
  on public.rag_documents (user_id) where pinned;
```

- [ ] **Step 2: Apply the migration**

Run it against the Supabase project (SQL editor or `supabase db push`).
Expected: columns `pinned`, `title` exist on `rag_documents`; the new sources are accepted.

> NOTE: `src/lib/supabase/types.ts` is hand-maintained in this repo. After applying, add `pinned: boolean` and `title: string | null` to the `rag_documents` Row/Insert/Update types if `rag_documents` is present there. If `rag_documents` is not in `types.ts` (the existing RAG code casts to `any`), keep using the `as any` access pattern already established in `src/lib/rag/` — do not invent typed access.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/005_memory_sources.sql src/lib/supabase/types.ts
git commit -m "feat(memory): migration for memory sources, pinned, title"
```

---

## Task 4: `store.ts` — memory engine

**Files:**
- Create: `src/lib/memory/store.ts`
- Test: `src/lib/memory/store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/memory/store.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();
const generateEmbedding = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));
vi.mock("@/lib/rag/embeddings", () => ({
  generateEmbedding: (t: string) => generateEmbedding(t),
}));

import {
  saveMemory,
  listMemories,
  deleteMemory,
  togglePin,
  getPinned,
} from "./store";

/** Chainable Supabase query-builder mock that resolves to `result`. */
function queryReturning(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  for (const m of ["upsert", "update", "delete", "select", "eq", "order"]) {
    q[m] = vi.fn(() => q);
  }
  q.single = vi.fn(() => Promise.resolve(result));
  q.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return q;
}

beforeEach(() => {
  fromMock.mockReset();
  generateEmbedding.mockReset();
  generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
});

describe("saveMemory", () => {
  it("embeds content and upserts, returning the id", async () => {
    const q = queryReturning({ data: { id: "mem_1" }, error: null });
    fromMock.mockReturnValue(q);

    const res = await saveMemory({
      userId: "u1",
      source: "manual",
      sourceId: "s1",
      content: "my tone is direct",
      pinned: true,
    });

    expect(generateEmbedding).toHaveBeenCalledWith("my tone is direct");
    expect(fromMock).toHaveBeenCalledWith("rag_documents");
    expect(q.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        source: "manual",
        source_id: "s1",
        pinned: true,
        embedding: "[0.1,0.2,0.3]",
      }),
      { onConflict: "user_id,source,source_id" },
    );
    expect(res).toEqual({ id: "mem_1" });
  });

  it("throws on supabase error", async () => {
    fromMock.mockReturnValue(
      queryReturning({ data: null, error: { message: "boom" } }),
    );
    await expect(
      saveMemory({ userId: "u1", source: "manual", sourceId: "s1", content: "x" }),
    ).rejects.toThrow("boom");
  });
});

describe("listMemories", () => {
  it("filters by user and orders by created_at", async () => {
    const rows = [{ id: "a" }, { id: "b" }];
    const q = queryReturning({ data: rows, error: null });
    fromMock.mockReturnValue(q);

    const res = await listMemories("u1");
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(q.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(res).toEqual(rows);
  });

  it("adds a source filter when provided", async () => {
    const q = queryReturning({ data: [], error: null });
    fromMock.mockReturnValue(q);
    await listMemories("u1", { source: "manual" });
    expect(q.eq).toHaveBeenCalledWith("source", "manual");
  });
});

describe("deleteMemory", () => {
  it("scopes delete by id and user", async () => {
    const q = queryReturning({ data: null, error: null });
    fromMock.mockReturnValue(q);
    await deleteMemory("mem_1", "u1");
    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith("id", "mem_1");
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
  });
});

describe("togglePin", () => {
  it("updates pinned scoped by id and user", async () => {
    const q = queryReturning({ data: null, error: null });
    fromMock.mockReturnValue(q);
    await togglePin("mem_1", "u1", true);
    expect(q.update).toHaveBeenCalledWith({ pinned: true });
    expect(q.eq).toHaveBeenCalledWith("id", "mem_1");
  });
});

describe("getPinned", () => {
  it("returns only pinned rows for the user", async () => {
    const rows = [{ id: "p1", pinned: true }];
    const q = queryReturning({ data: rows, error: null });
    fromMock.mockReturnValue(q);
    const res = await getPinned("u1");
    expect(q.eq).toHaveBeenCalledWith("pinned", true);
    expect(res).toEqual(rows);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- store`
Expected: FAIL (module `./store` not found).

- [ ] **Step 3: Implement `store.ts`**

Create `src/lib/memory/store.ts`:

```ts
import { generateEmbedding } from "@/lib/rag/embeddings";
import { createAdminClient } from "@/lib/supabase/admin";

export type MemorySource =
  | "manual"
  | "transcript"
  | "episode"
  | "instagram_caption"
  | "instagram_comment"
  | "instagram_profile"
  | "instagram_insights";

export interface MemoryRecord {
  id: string;
  source: string;
  source_id: string;
  title: string | null;
  content: string;
  metadata: Record<string, unknown>;
  pinned: boolean;
  created_at: string;
}

export interface SaveMemoryInput {
  userId: string;
  source: MemorySource;
  sourceId: string;
  title?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
  pinned?: boolean;
}

const COLUMNS =
  "id, source, source_id, title, content, metadata, pinned, created_at";

export async function saveMemory(
  input: SaveMemoryInput,
): Promise<{ id: string }> {
  const embedding = await generateEmbedding(input.content);
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("rag_documents")
    .upsert(
      {
        user_id: input.userId,
        source: input.source,
        source_id: input.sourceId,
        title: input.title ?? null,
        content: input.content,
        metadata: input.metadata ?? {},
        pinned: input.pinned ?? false,
        embedding: `[${embedding.join(",")}]`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,source,source_id" },
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function listMemories(
  userId: string,
  opts?: { source?: string },
): Promise<MemoryRecord[]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("rag_documents")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (opts?.source) query = query.eq("source", opts.source);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as MemoryRecord[];
}

export async function deleteMemory(id: string, userId: string): Promise<void> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("rag_documents")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function togglePin(
  id: string,
  userId: string,
  pinned: boolean,
): Promise<void> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("rag_documents")
    .update({ pinned })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function getPinned(userId: string): Promise<MemoryRecord[]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("rag_documents")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("pinned", true);
  if (error) throw new Error(error.message);
  return (data ?? []) as MemoryRecord[];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- store`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/memory/store.ts src/lib/memory/store.test.ts
git commit -m "feat(memory): add memory store engine"
```

---

## Task 5: `/api/memory` route — manual CRUD + list

**Files:**
- Create: `src/app/api/memory/route.ts`
- Test: `src/app/api/memory/route.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/memory/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
const store = {
  saveMemory: vi.fn(),
  listMemories: vi.fn(),
  deleteMemory: vi.fn(),
  togglePin: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/memory/store", () => store);

import { GET, POST, PATCH, DELETE } from "./route";

const authed = () => getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
const anon = () => getUser.mockResolvedValue({ data: { user: null } });

beforeEach(() => {
  getUser.mockReset();
  Object.values(store).forEach((f) => f.mockReset());
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
});

describe("GET /api/memory", () => {
  it("401 when unauthenticated", async () => {
    anon();
    const res = await GET(new Request("http://x/api/memory"));
    expect(res.status).toBe(401);
  });

  it("returns memories for the user", async () => {
    authed();
    store.listMemories.mockResolvedValue([{ id: "a" }]);
    const res = await GET(new Request("http://x/api/memory?source=manual"));
    expect(store.listMemories).toHaveBeenCalledWith("u1", { source: "manual" });
    expect(await res.json()).toEqual({ memories: [{ id: "a" }] });
  });
});

describe("POST /api/memory", () => {
  it("401 when unauthenticated", async () => {
    anon();
    const res = await POST(
      new Request("http://x/api/memory", {
        method: "POST",
        body: JSON.stringify({ content: "x" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400 when content is empty", async () => {
    authed();
    const res = await POST(
      new Request("http://x/api/memory", {
        method: "POST",
        body: JSON.stringify({ content: "   " }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("creates a manual memory", async () => {
    authed();
    store.saveMemory.mockResolvedValue({ id: "mem_1" });
    const res = await POST(
      new Request("http://x/api/memory", {
        method: "POST",
        body: JSON.stringify({ title: "Tone", content: "direct", pinned: true }),
      }),
    );
    expect(res.status).toBe(201);
    expect(store.saveMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        source: "manual",
        title: "Tone",
        content: "direct",
        pinned: true,
      }),
    );
  });
});

describe("PATCH /api/memory", () => {
  it("toggles pin", async () => {
    authed();
    const res = await PATCH(
      new Request("http://x/api/memory", {
        method: "PATCH",
        body: JSON.stringify({ id: "mem_1", pinned: false }),
      }),
    );
    expect(store.togglePin).toHaveBeenCalledWith("mem_1", "u1", false);
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/memory", () => {
  it("deletes by id scoped to user", async () => {
    authed();
    const res = await DELETE(
      new Request("http://x/api/memory", {
        method: "DELETE",
        body: JSON.stringify({ id: "mem_1" }),
      }),
    );
    expect(store.deleteMemory).toHaveBeenCalledWith("mem_1", "u1");
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- api/memory/route`
Expected: FAIL (module `./route` not found).

- [ ] **Step 3: Implement `route.ts`**

Create `src/app/api/memory/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  saveMemory,
  listMemories,
  deleteMemory,
  togglePin,
} from "@/lib/memory/store";

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const source = new URL(req.url).searchParams.get("source") ?? undefined;
  const memories = await listMemories(userId, source ? { source } : undefined);
  return NextResponse.json({ memories });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title?: unknown; content?: unknown; pinned?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title =
    typeof body.title === "string" ? body.title.trim().slice(0, 200) : null;
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const pinned = body.pinned === true;

  if (!content) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "Embeddings not configured (GOOGLE_GENERATIVE_AI_API_KEY)" },
      { status: 503 },
    );
  }

  const { id } = await saveMemory({
    userId,
    source: "manual",
    sourceId: crypto.randomUUID(),
    title,
    content,
    pinned,
  });
  return NextResponse.json({ id }, { status: 201 });
}

export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { id?: string; pinned?: boolean };
  if (!body.id || typeof body.pinned !== "boolean") {
    return NextResponse.json(
      { error: "id and pinned required" },
      { status: 400 },
    );
  }
  await togglePin(body.id, userId, body.pinned);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await deleteMemory(body.id, userId);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- api/memory/route`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/memory/route.ts src/app/api/memory/route.test.ts
git commit -m "feat(memory): manual memory CRUD API"
```

---

## Task 6: `/api/memory/search` route — semantic search

**Files:**
- Create: `src/app/api/memory/search/route.ts`

- [ ] **Step 1: Implement (reuses existing RAG helpers)**

Create `src/app/api/memory/search/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateEmbedding,
  searchSimilarDocuments,
} from "@/lib/rag/embeddings";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { q?: string };
  const q = typeof body.q === "string" ? body.q.trim() : "";
  if (!q) {
    return NextResponse.json({ matches: [] });
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "Embeddings not configured" },
      { status: 503 },
    );
  }

  const embedding = await generateEmbedding(q);
  const matches = await searchSimilarDocuments(embedding, user.id, 20);
  return NextResponse.json({ matches });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: `/api/memory/search` appears in the route list, build passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/memory/search/route.ts
git commit -m "feat(memory): semantic search API"
```

---

## Task 7: `/memory` UI

**Files:**
- Create: `src/app/(app)/memory/page.tsx`
- Create: `src/components/memory/MemoryDashboard.tsx`
- Create: `src/components/memory/MemoryCard.tsx`
- Create: `src/components/memory/AddMemoryDialog.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/proxy.ts`

UI is verified via `npm run lint` + `npm run build` + manual browser checks (no unit tests for components per the testing decision).

- [ ] **Step 1: Page entry**

Create `src/app/(app)/memory/page.tsx`:

```tsx
import { MemoryDashboard } from "@/components/memory/MemoryDashboard";

export const metadata = {
  title: "Memory — Castmill",
  description:
    "Tu segundo cerebro: notas, transcripciones, episodios y datos que la IA recuerda.",
};

export default function MemoryPage() {
  return <MemoryDashboard />;
}
```

- [ ] **Step 2: MemoryCard**

Create `src/components/memory/MemoryCard.tsx`:

```tsx
"use client";

import { Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface MemoryItem {
  id: string;
  source: string;
  title: string | null;
  content: string;
  pinned: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "Nota",
  transcript: "Transcribe",
  episode: "Episodio",
  instagram_caption: "Instagram",
  instagram_comment: "Instagram",
  instagram_profile: "Instagram",
  instagram_insights: "Instagram",
};

export function MemoryCard({
  item,
  onTogglePin,
  onDelete,
}: {
  item: MemoryItem;
  onTogglePin: (item: MemoryItem) => void;
  onDelete: (item: MemoryItem) => void;
}) {
  const isManual = item.source === "manual";
  return (
    <Card className="p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary">{SOURCE_LABELS[item.source] ?? item.source}</Badge>
        <div className="flex items-center gap-1">
          {isManual && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onTogglePin(item)}
              aria-label={item.pinned ? "Unpin" : "Pin"}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  item.pinned && "fill-yellow-400 text-yellow-400",
                )}
              />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item)}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {item.title && <p className="font-medium text-sm">{item.title}</p>}
      <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>
    </Card>
  );
}
```

- [ ] **Step 3: AddMemoryDialog**

Create `src/components/memory/AddMemoryDialog.tsx`. Reuse the existing shadcn dialog if present (`src/components/ui/dialog.tsx`); if it is missing, run `npx shadcn@latest add dialog` first.

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function AddMemoryDialog({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, pinned }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo guardar");
      }
      setTitle("");
      setContent("");
      setPinned(false);
      setOpen(false);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Agregar nota
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva nota de memoria</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="mem-title">Título (opcional)</Label>
            <Input
              id="mem-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mi tono de voz"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mem-content">Contenido</Label>
            <Textarea
              id="mem-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Mi audiencia son founders B2B en early stage."
              rows={4}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            Fijar (siempre en el contexto del Chat)
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || !content.trim()}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: MemoryDashboard**

Create `src/components/memory/MemoryDashboard.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MemoryCard, type MemoryItem } from "./MemoryCard";
import { AddMemoryDialog } from "./AddMemoryDialog";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "manual", label: "Notas" },
  { key: "transcript", label: "Transcribe" },
  { key: "episode", label: "Episodios" },
  { key: "instagram_caption", label: "Instagram" },
];

export function MemoryDashboard() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = filter === "all" ? "" : `?source=${filter}`;
    const res = await fetch(`/api/memory${qs}`);
    const data = await res.json();
    setItems((data.memories ?? []) as MemoryItem[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSearch() {
    if (!query.trim()) return load();
    setLoading(true);
    const res = await fetch("/api/memory/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: query }),
    });
    const data = await res.json();
    type Match = { id: string; source: string; content: string };
    setItems(
      ((data.matches ?? []) as Match[]).map((m) => ({
        id: m.id,
        source: m.source,
        title: null,
        content: m.content,
        pinned: false,
      })),
    );
    setLoading(false);
  }

  async function togglePin(item: MemoryItem) {
    await fetch("/api/memory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, pinned: !item.pinned }),
    });
    load();
  }

  async function remove(item: MemoryItem) {
    await fetch("/api/memory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Memory</h1>
          <p className="text-sm text-muted-foreground">
            Tu segundo cerebro. Lo que guardes acá, la IA lo recuerda.
          </p>
        </div>
        <AddMemoryDialog onCreated={load} />
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Buscar en tu memoria…"
            className="pl-9"
          />
        </div>
        <Button variant="secondary" onClick={runSearch}>
          Buscar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setQuery("");
              setFilter(f.key);
            }}
            className={cn(
              "px-3 py-1 rounded-full text-sm border",
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay memorias todavía. Agregá una nota o guardá una transcripción.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <MemoryCard
              key={item.id}
              item={item}
              onTogglePin={togglePin}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Enable sidebar nav item**

In `src/components/layout/Sidebar.tsx`, change the Memory entry from disabled to active:

```tsx
{ label: "Memory", icon: Brain, href: "/memory" },
```

(Remove the `disabled: true` from that line. `Brain` is already imported.)

- [ ] **Step 6: Add `/memory` to proxy auth routes**

In `src/proxy.ts`, add to the `isAppRoute` chain:

```ts
    pathname.startsWith("/settings") ||
    pathname.startsWith("/transcribe") ||
    pathname.startsWith("/memory");
```

- [ ] **Step 7: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: no errors; `/memory` and `/api/memory` appear in the route tree.

- [ ] **Step 8: Manual check**

Start `npm run dev`, log in, open `/memory`. Add a note (pinned + unpinned), confirm it lists, toggle pin, delete it, run a search. Confirm Instagram-sourced rows appear under the Instagram filter if any exist.

- [ ] **Step 9: Commit**

```bash
git add src/app/\(app\)/memory src/components/memory src/components/layout/Sidebar.tsx src/proxy.ts
git commit -m "feat(memory): /memory dashboard UI"
```

> **PHASE 1 COMPLETE** — ship as PR #1 (foundation: manual brain + browse + search).

---

# PHASE 2 — CHAT INTEGRATION

## Task 8: Inject pinned memories + source-aware prompt

**Files:**
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: Import the pinned getter**

In `src/app/api/chat/route.ts`, add to the existing imports:

```ts
import { getPinned } from "@/lib/memory/store";
```

- [ ] **Step 2: Build a pinned-facts block and pass it to the prompt**

In the `POST` handler, after the user is resolved and before building the system prompt, fetch pinned memories and format them:

```ts
  let pinnedBlock = "";
  try {
    const pinned = await getPinned(user.id);
    if (pinned.length > 0) {
      pinnedBlock =
        "\n\nPINNED FACTS (always honor these — the user curated them):\n" +
        pinned
          .map((p) => `- ${p.title ? `${p.title}: ` : ""}${p.content}`)
          .join("\n");
    }
  } catch (err) {
    console.error("[chat] Failed to load pinned memories:", err);
  }
```

- [ ] **Step 3: Append the pinned block to the system prompt**

Where `buildSystemPrompt(...)` is called, append `pinnedBlock` to its returned string (or pass it in and concatenate inside). Minimal change at the call site:

```ts
  const systemPrompt = buildSystemPrompt(contextBlock, docCounts) + pinnedBlock;
```

- [ ] **Step 4: Soften the Instagram-only persona**

In `buildSystemPrompt`, change the opening persona line so it is source-aware. Replace:

```ts
    `You are an expert Instagram content strategist, social media analyst, and creative assistant.\n\n` +
```

with:

```ts
    `You are an expert content strategist and creative assistant with access to the user's Memory — ` +
    `a knowledge base that may include Instagram data, podcast episodes, transcriptions, and notes they wrote themselves.\n\n` +
```

Leave the existing `dataStatus` / CONTEXT rules intact — they still apply to whatever documents are retrieved.

- [ ] **Step 5: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: passes.

- [ ] **Step 6: Manual check**

In `/memory`, pin a note like "My tone is blunt and direct." Open `/chat`, ask "what tone should I use?" — the answer should reflect the pinned fact even with no Instagram data synced.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(memory): inject pinned memories into chat, source-aware prompt"
```

> **PHASE 2 COMPLETE** — ship as PR #2.

---

# PHASE 3 — TRANSCRIBE ADAPTER

## Task 9: Allow `transcript` source in the memory API

**Files:**
- Modify: `src/app/api/memory/route.ts`
- Modify: `src/app/api/memory/route.test.ts`

- [ ] **Step 1: Add a failing test for transcript source**

Append to `src/app/api/memory/route.test.ts` inside the `POST` describe block:

```ts
  it("accepts source=transcript with a sourceId", async () => {
    authed();
    store.saveMemory.mockResolvedValue({ id: "mem_t" });
    const res = await POST(
      new Request("http://x/api/memory", {
        method: "POST",
        body: JSON.stringify({
          source: "transcript",
          sourceId: "job_1",
          title: "nota.m4a",
          content: "texto transcrito",
        }),
      }),
    );
    expect(res.status).toBe(201);
    expect(store.saveMemory).toHaveBeenCalledWith(
      expect.objectContaining({ source: "transcript", sourceId: "job_1" }),
    );
  });

  it("rejects an unknown source", async () => {
    authed();
    const res = await POST(
      new Request("http://x/api/memory", {
        method: "POST",
        body: JSON.stringify({ source: "hacker", content: "x" }),
      }),
    );
    expect(res.status).toBe(400);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- api/memory/route`
Expected: FAIL (route still forces `source: "manual"`).

- [ ] **Step 3: Generalize POST source handling**

In `src/app/api/memory/route.ts` `POST`, replace the fixed `source: "manual"` block. After parsing `content`, add:

```ts
  const ALLOWED_CLIENT_SOURCES = new Set(["manual", "transcript"]);
  const source =
    typeof body.source === "string" && ALLOWED_CLIENT_SOURCES.has(body.source)
      ? (body.source as "manual" | "transcript")
      : "manual";
  if (typeof body.source === "string" && !ALLOWED_CLIENT_SOURCES.has(body.source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }
  const sourceId =
    typeof body.sourceId === "string" && body.sourceId
      ? body.sourceId
      : crypto.randomUUID();
```

Update the `body` type to include `source?: unknown; sourceId?: unknown;` and change the `saveMemory` call to use `source` and `sourceId` variables instead of the hardcoded literals.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- api/memory/route`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/memory/route.ts src/app/api/memory/route.test.ts
git commit -m "feat(memory): accept transcript source in memory API"
```

## Task 10: "Save to Memory" button in TranscribeTool

**Files:**
- Modify: `src/components/transcribe/TranscribeTool.tsx`

- [ ] **Step 1: Add a save handler + button**

In `src/components/transcribe/TranscribeTool.tsx`, add a state + handler near the other handlers (the component already has `result`, `editedText`, and a `baseName()` helper):

```tsx
  const [savedToMemory, setSavedToMemory] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);

  async function handleSaveToMemory() {
    if (!editedText || !result) return;
    setSavingMemory(true);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "transcript",
          sourceId: result.filename,
          title: result.filename,
          content: editedText,
        }),
      });
      if (res.ok) setSavedToMemory(true);
    } finally {
      setSavingMemory(false);
    }
  }
```

Add the button next to the existing Download buttons in the result section (around the `handleDownloadMd` controls). Use the `Sparkles` icon already imported:

```tsx
          <Button
            variant="secondary"
            onClick={handleSaveToMemory}
            disabled={savingMemory || savedToMemory}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {savedToMemory ? "Guardado en Memory" : savingMemory ? "Guardando…" : "Guardar en Memory"}
          </Button>
```

Reset `savedToMemory` to `false` inside the existing `handleFile` (when a new file is picked) so re-transcribing allows a fresh save.

- [ ] **Step 2: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: passes.

- [ ] **Step 3: Manual check**

Transcribe an audio, click "Guardar en Memory", then open `/memory` → it appears under the Transcribe filter.

- [ ] **Step 4: Commit**

```bash
git add src/components/transcribe/TranscribeTool.tsx
git commit -m "feat(memory): save transcriptions to memory"
```

> **PHASE 3 COMPLETE** — ship as PR #3.

---

# PHASE 4 — EPISODE ADAPTER

## Task 11: `/api/memory/episode` — index an episode transcript

**Files:**
- Create: `src/app/api/memory/episode/route.ts`
- Test: `src/app/api/memory/episode/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/memory/episode/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
const transcriptQuery = vi.fn();
const saveMemory = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ single: transcriptQuery }),
        }),
      }),
    }),
  }),
}));
vi.mock("@/lib/memory/store", () => ({ saveMemory }));

import { POST } from "./route";

beforeEach(() => {
  getUser.mockReset();
  transcriptQuery.mockReset();
  saveMemory.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "k";
});

describe("POST /api/memory/episode", () => {
  it("401 without a user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ episodeId: "e1" }) }),
    );
    expect(res.status).toBe(401);
  });

  it("404 when transcript not found", async () => {
    transcriptQuery.mockResolvedValue({ data: null, error: null });
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ episodeId: "e1" }) }),
    );
    expect(res.status).toBe(404);
  });

  it("chunks the transcript and saves each chunk", async () => {
    transcriptQuery.mockResolvedValue({
      data: { text: `${"a".repeat(900)}\n\nshort tail` },
      error: null,
    });
    saveMemory.mockResolvedValue({ id: "x" });
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ episodeId: "e1", title: "Ep 1" }) }),
    );
    expect(res.status).toBe(200);
    expect(saveMemory.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(saveMemory).toHaveBeenCalledWith(
      expect.objectContaining({ source: "episode", sourceId: expect.stringContaining("e1#") }),
    );
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- api/memory/episode`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the route**

Create `src/app/api/memory/episode/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveMemory } from "@/lib/memory/store";
import { chunkText } from "@/lib/memory/chunk";

export const maxDuration = 120;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    episodeId?: string;
    title?: string;
  };
  if (!body.episodeId) {
    return NextResponse.json({ error: "episodeId required" }, { status: 400 });
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "Embeddings not configured" },
      { status: 503 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: transcript } = await (supabase as any)
    .from("transcripts")
    .select("text")
    .eq("episode_id", body.episodeId)
    .eq("user_id", user.id)
    .single();

  if (!transcript?.text) {
    return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
  }

  const chunks = chunkText(transcript.text);
  for (let i = 0; i < chunks.length; i++) {
    await saveMemory({
      userId: user.id,
      source: "episode",
      sourceId: `${body.episodeId}#${i}`,
      title: body.title ?? "Episodio",
      content: chunks[i],
      metadata: { episodeId: body.episodeId, chunk: i },
    });
  }

  return NextResponse.json({ indexed: chunks.length });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- api/memory/episode`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/memory/episode
git commit -m "feat(memory): index episode transcripts into memory"
```

## Task 12: "Index in Memory" action on the episode page

**Files:**
- Modify: the episode detail view under `src/app/(app)/episode/[id]/`

- [ ] **Step 1: Locate the episode view**

Run: `fd . 'src/app/(app)/episode'` and open the page/client component. Identify where the episode `id` and `title` are available and where action buttons live.

- [ ] **Step 2: Add the action**

Add a button (client component) that calls the new route:

```tsx
async function indexInMemory(episodeId: string, title: string) {
  const res = await fetch("/api/memory/episode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ episodeId, title }),
  });
  return res.ok;
}
```

Wire it to a `Button` labeled "Indexar en Memory" with a loading + done state, placed near the existing episode actions. Match the surrounding component's existing patterns (state hooks, button styles).

- [ ] **Step 3: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: passes.

- [ ] **Step 4: Manual check**

Open an episode with a transcript, click "Indexar en Memory", confirm chunks appear in `/memory` under Episodios and that the Chat can answer questions about that episode's content.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/episode"
git commit -m "feat(memory): index episode action"
```

> **PHASE 4 COMPLETE** — ship as PR #4.

---

## Self-Review Notes

- **Spec coverage:** manual memory (Tasks 4–7), hybrid pin (store `pinned` + Task 8 injection + Task 7 toggle), transcribe source (Tasks 9–10), episodes + chunking (Tasks 2, 11–12), Instagram surfaced via the `instagram_caption` filter (Task 7), `/memory` UI + sidebar + proxy (Task 7), source-aware Chat (Task 8), migration extending `rag_documents` (Task 3). All design sections map to tasks.
- **Pin scope:** UI pin control is manual-only (`MemoryCard` `isManual` guard), matching the v1 non-goal. `getPinned` itself is source-agnostic at the DB level, which is fine — only manual rows ever get `pinned = true` through the UI.
- **Naming consistency:** `saveMemory`, `listMemories`, `deleteMemory`, `togglePin`, `getPinned`, `chunkText` are used identically across store, routes, tests, and chat.
- **Ingestion:** opt-in per item (buttons in Tasks 10 and 12); no auto-ingestion, matching the spec non-goal.
