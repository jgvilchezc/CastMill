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
