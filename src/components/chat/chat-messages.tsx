"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Copy,
  Check,
  Sparkles,
  ImageIcon,
  Download,
  Instagram,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import MarkdownIt from "markdown-it";
import type { UIMessage } from "ai";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

interface ChatMessagesProps {
  messages: UIMessage[];
  isStreaming: boolean;
}

function extractText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground
        hover:text-foreground hover:bg-muted/80 transition-all duration-150"
      aria-label="Copy message"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

function ToolCallIndicator({ toolName }: { toolName: string }) {
  const labels: Record<string, { text: string; icon: React.ReactNode }> = {
    generate_image: {
      text: "Generating image...",
      icon: <ImageIcon className="h-3.5 w-3.5" />,
    },
    publish_to_instagram: {
      text: "Publishing to Instagram...",
      icon: <Instagram className="h-3.5 w-3.5" />,
    },
  };

  const label = labels[toolName] ?? { text: `Running ${toolName}...`, icon: null };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border/50 px-3 py-2 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/60" />
      {label.icon}
      <span>{label.text}</span>
    </div>
  );
}

function ImageResult({ imageUrl }: { imageUrl: string }) {
  const handleDownload = useCallback(() => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `generated-${Date.now()}.png`;
    link.click();
  }, [imageUrl]);

  return (
    <div className="group/img relative overflow-hidden rounded-xl border border-border/50 bg-muted/30">
      <img
        src={imageUrl}
        alt="Generated image"
        className="w-full max-w-md rounded-xl"
        loading="lazy"
      />
      <div
        className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
      >
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 rounded-lg bg-background/80 backdrop-blur-sm
            border border-border/50 px-2.5 py-1.5 text-xs font-medium
            hover:bg-background transition-colors"
        >
          <Download className="h-3 w-3" />
          Download
        </button>
      </div>
    </div>
  );
}

function PublishResult({
  success,
  mediaId,
  error,
}: {
  success: boolean;
  mediaId?: string;
  error?: string;
}) {
  if (success) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-emerald-400 font-medium">Published to Instagram</span>
        {mediaId && (
          <span className="text-emerald-400/60">ID: {mediaId}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs">
      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
      <span className="text-destructive font-medium">Publish failed</span>
      {error && <span className="text-destructive/70">{error}</span>}
    </div>
  );
}

function ToolErrorResult({ errorText }: { errorText: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs">
      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
      <span className="text-destructive">{errorText}</span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToolPart({ part }: { part: any }) {
  const toolName = part.type.startsWith("tool-")
    ? part.type.slice(5)
    : part.toolName ?? "unknown";

  if (part.state === "input-available" || part.state === "input-streaming") {
    return <ToolCallIndicator toolName={toolName} />;
  }

  if (part.state === "output-error") {
    return <ToolErrorResult errorText={part.errorText ?? "Tool execution failed"} />;
  }

  if (part.state === "output-available") {
    if (toolName === "generate_image" && part.output?.imageUrl) {
      return <ImageResult imageUrl={part.output.imageUrl} />;
    }

    if (toolName === "publish_to_instagram") {
      return (
        <PublishResult
          success={part.output?.success ?? false}
          mediaId={part.output?.mediaId}
          error={part.output?.error}
        />
      );
    }

    return (
      <div className="rounded-lg bg-muted/50 border border-border/50 px-3 py-2 text-xs text-muted-foreground">
        Tool {toolName} completed
      </div>
    );
  }

  return null;
}

function AssistantMessage({
  message,
  isLast,
  isStreaming,
}: {
  message: UIMessage;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const text = extractText(message);
  const isActivelyStreaming = isLast && isStreaming;

  const hasToolParts = message.parts?.some(
    (p) => p.type !== "text" && p.type !== "reasoning" && p.type !== "step-start"
  );
  const hasText = text.trim().length > 0;

  return (
    <div className="group relative">
      <div className="flex items-start gap-3">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
            bg-linear-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 mt-0.5"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <span className="text-xs font-medium text-muted-foreground">Expandcast AI</span>

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {message.parts?.map((part: any, idx: number) => {
            if (part.type === "text") {
              if (!("text" in part) || !(part as { text: string }).text.trim()) return null;
              const partHtml = md.render((part as { text: string }).text.trim());
              return (
                <div
                  key={idx}
                  className={cn(
                    "prose prose-sm dark:prose-invert max-w-none",
                    "prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground",
                    "prose-h1:text-lg prose-h2:text-base prose-h3:text-sm",
                    "prose-p:text-[13.5px] prose-p:leading-[1.8] prose-p:text-foreground/85",
                    "prose-strong:text-foreground prose-strong:font-semibold",
                    "prose-ul:text-[13.5px] prose-ol:text-[13.5px] prose-li:text-foreground/85 prose-li:leading-relaxed",
                    "prose-blockquote:border-l-2 prose-blockquote:border-primary/40 prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:not-italic",
                    "prose-code:text-[11.5px] prose-code:font-mono prose-code:text-primary/80 prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
                    "prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-lg",
                    "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
                    isActivelyStreaming && idx === (message.parts?.length ?? 0) - 1 &&
                      "[&>*:last-child]:after:content-['▍'] [&>*:last-child]:after:ml-0.5 [&>*:last-child]:after:animate-pulse [&>*:last-child]:after:text-primary/60"
                  )}
                  dangerouslySetInnerHTML={{ __html: partHtml }}
                />
              );
            }

            if (part.type === "step-start" || part.type === "reasoning") {
              return null;
            }

            if (part.type === "file" && "mimeType" in part) {
              const filePart = part as { mimeType: string; url?: string; base64?: string };
              if (filePart.mimeType?.startsWith("image/")) {
                const src = filePart.url ?? (filePart.base64 ? `data:${filePart.mimeType};base64,${filePart.base64}` : "");
                if (src) return <ImageResult key={idx} imageUrl={src} />;
              }
              return null;
            }

            return <ToolPart key={idx} part={part} />;
          })}

          {!hasToolParts && !hasText && isActivelyStreaming && null}

          <div
            className={cn(
              "flex items-center gap-1 pt-1 transition-opacity duration-200",
              isActivelyStreaming
                ? "opacity-0 pointer-events-none"
                : "opacity-0 group-hover:opacity-100"
            )}
          >
            <CopyButton text={text} />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: UIMessage }) {
  const text = extractText(message);

  return (
    <div className="flex justify-end">
      <div
        className="max-w-[80%] rounded-2xl rounded-br-md bg-primary/10 border border-primary/15
          px-4 py-2.5 text-[13.5px] leading-relaxed text-foreground whitespace-pre-wrap wrap-break-word"
      >
        {text}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
          bg-linear-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 mt-0.5"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-[bounce_1.4s_ease-in-out_infinite]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
        </div>
        <span className="text-xs text-muted-foreground">Thinking...</span>
      </div>
    </div>
  );
}

export function ChatMessages({ messages, isStreaming }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(atBottom);
  }, []);

  if (messages.length === 0) return null;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {messages.map((message, i) => {
          const isLast = i === messages.length - 1;

          if (message.role === "user") {
            return <UserMessage key={message.id} message={message} />;
          }

          return (
            <AssistantMessage
              key={message.id}
              message={message}
              isLast={isLast}
              isStreaming={isStreaming}
            />
          );
        })}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <ThinkingIndicator />
        )}

        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
}
