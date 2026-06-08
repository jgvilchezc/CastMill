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
    const data = await res.json() as { memories?: MemoryItem[] };
    setItems((data.memories ?? []) as MemoryItem[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on filter change; setState inside callback, not synchronously in effect body
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
    const data = await res.json() as { matches?: { id: string; source: string; content: string; pinned?: boolean; title?: string | null }[] };
    type Match = { id: string; source: string; content: string; pinned?: boolean; title?: string | null };
    setItems(
      ((data.matches ?? []) as Match[]).map((m) => ({
        id: m.id,
        source: m.source,
        title: m.title ?? null,
        content: m.content,
        pinned: m.pinned ?? false,
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
    void load();
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
            onKeyDown={(e) => e.key === "Enter" && void runSearch()}
            placeholder="Buscar en tu memoria…"
            className="pl-9"
          />
        </div>
        <Button variant="secondary" onClick={() => void runSearch()}>
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
