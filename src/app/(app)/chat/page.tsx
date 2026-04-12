"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MessageSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Hash,
  Lightbulb,
  MessageCircle,
  BarChart3,
  RefreshCw,
  Database,
  ChevronDown,
} from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/context/user-context";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatSyncStatus } from "@/components/chat/chat-sync-status";

const SUGGESTIONS = [
  {
    text: "What type of content gets the most engagement?",
    icon: TrendingUp,
  },
  {
    text: "Summarize the sentiment in my comments",
    icon: MessageCircle,
  },
  {
    text: "Which hashtags should I use more?",
    icon: Hash,
  },
  {
    text: "Give me 5 content ideas based on my top posts",
    icon: Lightbulb,
  },
  {
    text: "What patterns do my best-performing posts have?",
    icon: BarChart3,
  },
  {
    text: "What do my followers talk about in comments?",
    icon: MessageCircle,
  },
];

function SyncDropdown({ hasInstagram }: { hasInstagram: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground
          hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <Database className="h-3.5 w-3.5" />
        <span>Data Sync</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
      <div
        className={cn(
          "absolute right-0 top-full z-50 mt-1 w-72 transition-all",
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        <ChatSyncStatus hasInstagram={hasInstagram} />
      </div>
    </div>
  );
}

function EmptyState({
  onSuggestion,
}: {
  onSuggestion: (text: string) => void;
}) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
            <Sparkles className="h-3 w-3" />
            Instagram AI Assistant
          </div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Ask me anything about your Instagram performance, content strategy, or audience insights.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.text}
                onClick={() => onSuggestion(s.text)}
                className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/50
                  px-4 py-3.5 text-left transition-all duration-200
                  hover:border-primary/30 hover:bg-primary/3 hover:shadow-sm"
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[13px] leading-snug text-foreground/80 group-hover:text-foreground transition-colors">
                  {s.text}
                </span>
                <ArrowRight className="h-3.5 w-3.5 mt-0.5 ml-auto shrink-0 text-transparent group-hover:text-primary/60 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useUser();
  const plan = user?.plan ?? "free";
  const planConfig = PLANS[plan];

  const [hasInstagram, setHasInstagram] = useState(false);
  const [loading, setLoading] = useState(true);

  const { messages, sendMessage, stop, status } = useChat({
    transport: new DefaultChatTransport(),
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    async function checkAccount() {
      try {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from("connected_accounts")
          .select("platform")
          .eq("platform", "instagram")
          .single();
        setHasInstagram(!!data);
      } catch {
        setHasInstagram(false);
      } finally {
        setLoading(false);
      }
    }
    checkAccount();
  }, []);

  if (!planConfig.publishDirect) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-sm text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold tracking-tight">AI Chat requires Pro</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upgrade to Pro to chat with AI about your Instagram analytics data.
            </p>
          </div>
          <Button asChild>
            <a href="/pricing">Upgrade to Pro</a>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Skeleton className="h-10 w-10 rounded-2xl" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
        <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-lg">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  function handleSuggestion(text: string) {
    sendMessage({ text });
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[calc(100vh-(--spacing(14))-(--spacing(12)))] flex-col">
      {hasMessages && (
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary/60" />
            <span className="font-medium">Instagram AI Chat</span>
            {isStreaming && (
              <span className="flex items-center gap-1 text-primary/60">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Generating...
              </span>
            )}
          </div>
          <SyncDropdown hasInstagram={hasInstagram} />
        </div>
      )}

      {hasMessages ? (
        <ChatMessages messages={messages} isStreaming={isStreaming} />
      ) : (
        <>
          <div className="flex justify-end px-4 pt-2">
            <SyncDropdown hasInstagram={hasInstagram} />
          </div>
          <EmptyState onSuggestion={handleSuggestion} />
        </>
      )}

      <div className="shrink-0">
        <ChatInput
          onSend={(text) => sendMessage({ text })}
          onStop={stop}
          isStreaming={isStreaming}
          disabled={!hasInstagram}
        />
      </div>
    </div>
  );
}
