"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/context/user-context";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatSyncStatus } from "@/components/chat/chat-sync-status";

const SUGGESTIONS = [
  "What type of content gets the most engagement?",
  "Summarize the sentiment in my comments",
  "Which hashtags should I use more?",
  "Give me 5 content ideas based on my top posts",
  "What patterns do my best-performing posts have?",
  "What do my followers talk about in comments?",
];

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
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-1">AI Chat requires Pro plan</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Upgrade to Pro to chat with AI about your Instagram analytics data.
          </p>
          <Button asChild>
            <a href="/pricing">Upgrade to Pro</a>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-(--spacing(14))-(--spacing(12)))] max-w-5xl mx-auto gap-4">
        <div className="flex-1 flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="flex-1 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
        <div className="hidden lg:block w-72">
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  function handleSuggestion(text: string) {
    sendMessage({ text });
  }

  return (
    <div className="flex h-[calc(100vh-(--spacing(14))-(--spacing(12)))] max-w-5xl mx-auto gap-4">
      <div className="flex-1 flex flex-col min-w-0">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Instagram AI Chat</h2>
            </div>
            <p className="text-sm text-muted-foreground text-center mb-8 max-w-md">
              Ask questions about your Instagram data. Make sure to sync your data first using the panel on the right.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="text-left text-sm px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-1 py-4">
            <ChatMessages messages={messages} isStreaming={isStreaming} />
          </div>
        )}

        <div className="shrink-0 pb-2">
          <ChatInput
            onSend={(text) => sendMessage({ text })}
            onStop={stop}
            isStreaming={isStreaming}
            disabled={!hasInstagram}
          />
        </div>
      </div>

      <div className="hidden lg:flex flex-col gap-4 w-72 shrink-0 pt-4">
        <ChatSyncStatus hasInstagram={hasInstagram} />

        {hasInstagram && messages.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions</p>
            <div className="space-y-1.5">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  disabled={isStreaming}
                  className="text-left text-xs px-3 py-2 rounded-lg w-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
