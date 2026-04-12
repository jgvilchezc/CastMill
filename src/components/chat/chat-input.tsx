"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
  placeholder = "Message Expandcast AI...",
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasContent = input.trim().length > 0;

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isStreaming) return;
    onSend(trimmed);
    setInput("");
  }, [input, disabled, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-4">
      <div
        className={cn(
          "relative flex items-end rounded-2xl border bg-card transition-all duration-200",
          hasContent
            ? "border-primary/30 shadow-[0_0_0_1px_var(--primary)/10]"
            : "border-border",
          disabled && "opacity-50"
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent pl-4 pr-12 py-3 text-sm leading-relaxed
            placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed
            scrollbar-thin scrollbar-thumb-border"
        />

        <div className="absolute bottom-2 right-2">
          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted
                text-foreground hover:bg-muted/80 transition-colors"
              aria-label="Stop generating"
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!hasContent || disabled}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                hasContent && !disabled
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-muted-foreground/50">
        AI can make mistakes. Verify important information with your actual Instagram data.
      </p>
    </div>
  );
}
