"use client"

import { Settings2 } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  LANGUAGES, TONES, LENGTHS,
  type GenerationParams, type ContentFormat,
  getFormatOptions, DEFAULT_FORMAT_OPTIONS,
} from "@/lib/generation-params"
import { cn } from "@/lib/utils"

interface GenerationSettingsBarProps {
  format: ContentFormat
  params: GenerationParams
  onChange: (params: GenerationParams) => void
}

function Prop({
  label,
  value,
  options,
  onSelect,
  active,
}: {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onSelect: (v: string) => void
  active?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-baseline gap-1 group outline-none">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
            {label}
          </span>
          <span className={cn(
            "text-[11px] font-mono transition-colors",
            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )}>
            {value}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={onSelect}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className="text-xs font-mono">
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Divider() {
  return <span className="text-muted-foreground/20 select-none text-xs">·</span>
}

function FormatSpecificOptions({
  format,
  params,
  onChange,
}: {
  format: ContentFormat
  params: GenerationParams
  onChange: (params: GenerationParams) => void
}) {
  function patchFormat<K extends ContentFormat>(
    key: keyof (typeof DEFAULT_FORMAT_OPTIONS)[K],
    value: unknown
  ) {
    const current = getFormatOptions(params, format)
    onChange({
      ...params,
      formatOptions: {
        ...params.formatOptions,
        [format]: { ...current, [key]: value },
      },
    })
  }

  if (format === "blog") {
    const opts = getFormatOptions(params, "blog")
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-baseline gap-1 group outline-none">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
              blog
            </span>
            <Settings2 className="h-2.5 w-2.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Blog options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 space-y-3">
            {([
              ["includeTakeaways", "Key takeaways"],
              ["includeFaq",       "FAQ section"],
              ["seoFocus",         "SEO focus"],
            ] as [keyof ReturnType<typeof getFormatOptions<"blog">>, string][]).map(([key, lbl]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <Label htmlFor={`blog-${key}`} className="text-xs font-normal cursor-pointer">{lbl}</Label>
                <Switch
                  id={`blog-${key}`}
                  checked={opts[key] as boolean}
                  onCheckedChange={(v) => patchFormat<"blog">(key, v)}
                />
              </div>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (format === "tweet_thread") {
    const opts = getFormatOptions(params, "tweet_thread")
    const countOptions = [
      { value: "5", label: "5 tweets" },
      { value: "7", label: "7 tweets" },
      { value: "10", label: "10 tweets" },
      { value: "15", label: "15 tweets" },
    ] as const
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-baseline gap-1 group outline-none">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
              tweets
            </span>
            <span className="text-[11px] font-mono text-muted-foreground group-hover:text-foreground">
              {opts.tweetCount}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Thread options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={String(opts.tweetCount)}
            onValueChange={(v) => patchFormat<"tweet_thread">("tweetCount", Number(v))}
          >
            {countOptions.map((o) => (
              <DropdownMenuRadioItem key={o.value} value={o.value} className="text-xs font-mono">{o.label}</DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <div className="px-2 py-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="tw-emoji" className="text-xs font-normal cursor-pointer">Emojis</Label>
              <Switch id="tw-emoji" checked={opts.includeEmojis} onCheckedChange={(v) => patchFormat<"tweet_thread">("includeEmojis", v)} />
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (format === "linkedin") {
    const opts = getFormatOptions(params, "linkedin")
    const ctaOptions = [
      { value: "question",  label: "Question CTA" },
      { value: "invite",    label: "Invite CTA" },
      { value: "challenge", label: "Challenge CTA" },
      { value: "none",      label: "No CTA" },
    ] as const
    return (
      <Prop
        label="cta"
        value={opts.ctaStyle}
        options={ctaOptions}
        onSelect={(v) => patchFormat<"linkedin">("ctaStyle", v)}
      />
    )
  }

  if (format === "newsletter") {
    const opts = getFormatOptions(params, "newsletter")
    const subjectOptions = [
      { value: "teaser",    label: "Teaser" },
      { value: "question",  label: "Question" },
      { value: "statement", label: "Statement" },
      { value: "numbered",  label: "Numbered" },
    ] as const
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-baseline gap-1 group outline-none">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
              subject
            </span>
            <span className="text-[11px] font-mono text-muted-foreground group-hover:text-foreground">
              {opts.subjectLineStyle}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Subject style</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={opts.subjectLineStyle} onValueChange={(v) => patchFormat<"newsletter">("subjectLineStyle", v)}>
            {subjectOptions.map((o) => (
              <DropdownMenuRadioItem key={o.value} value={o.value} className="text-xs font-mono">{o.label}</DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <div className="px-2 py-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="nl-quote" className="text-xs font-normal cursor-pointer">Pull quote</Label>
              <Switch id="nl-quote" checked={opts.includeQuote} onCheckedChange={(v) => patchFormat<"newsletter">("includeQuote", v)} />
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (format === "youtube_desc") {
    const opts = getFormatOptions(params, "youtube_desc")
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-baseline gap-1 group outline-none">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
              yt
            </span>
            <Settings2 className="h-2.5 w-2.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">YouTube options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 space-y-3">
            {([
              ["includeChapters",  "Timestamps"],
              ["includeKeywords",  "Keywords"],
            ] as [keyof ReturnType<typeof getFormatOptions<"youtube_desc">>, string][]).map(([key, lbl]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <Label htmlFor={`yt-${key}`} className="text-xs font-normal cursor-pointer">{lbl}</Label>
                <Switch id={`yt-${key}`} checked={opts[key]} onCheckedChange={(v) => patchFormat<"youtube_desc">(key, v)} />
              </div>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (format === "chapters") {
    const opts = getFormatOptions(params, "chapters")
    const countOptions = [
      { value: "auto", label: "Auto" },
      { value: "5",    label: "5 chapters" },
      { value: "7",    label: "7 chapters" },
      { value: "10",   label: "10 chapters" },
    ] as const
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-baseline gap-1 group outline-none">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
              chapters
            </span>
            <Settings2 className="h-2.5 w-2.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Chapter options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={opts.chapterCount}
            onValueChange={(v) => patchFormat<"chapters">("chapterCount", v)}
          >
            {countOptions.map((o) => (
              <DropdownMenuRadioItem key={o.value} value={o.value} className="text-xs font-mono">{o.label}</DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <div className="px-2 py-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="ch-desc" className="text-xs font-normal cursor-pointer">Descriptions</Label>
              <Switch id="ch-desc" checked={opts.includeDescriptions} onCheckedChange={(v) => patchFormat<"chapters">("includeDescriptions", v)} />
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (format === "show_notes") {
    const opts = getFormatOptions(params, "show_notes")
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-baseline gap-1 group outline-none">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
              show notes
            </span>
            <Settings2 className="h-2.5 w-2.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Show Notes options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 space-y-3">
            {([
              ["includeGuestBio",   "Guest bio"],
              ["includeResources",  "Resources mentioned"],
              ["includeTimestamps", "Timestamps"],
            ] as [keyof ReturnType<typeof getFormatOptions<"show_notes">>, string][]).map(([key, lbl]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <Label htmlFor={`sn-${key}`} className="text-xs font-normal cursor-pointer">{lbl}</Label>
                <Switch id={`sn-${key}`} checked={opts[key]} onCheckedChange={(v) => patchFormat<"show_notes">(key, v)} />
              </div>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return null
}

export function GenerationSettingsBar({ format, params, onChange }: GenerationSettingsBarProps) {
  const langDisplay = LANGUAGES.find((l) => l.value === params.language)?.label ?? params.language
  const toneDisplay = TONES.find((t) => t.value === params.tone)?.label.toLowerCase() ?? params.tone
  const lengthDisplay = params.length

  const hasCustomLang = params.language !== "auto"
  const hasCustomTone = params.tone !== "auto"
  const hasCustomLength = params.length !== "standard"

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 px-3 border border-border/50 rounded-md bg-muted/20 mb-4">
      <Prop
        label="lang"
        value={langDisplay}
        options={LANGUAGES}
        onSelect={(v) => onChange({ ...params, language: v as GenerationParams["language"] })}
        active={hasCustomLang}
      />
      <Divider />
      <Prop
        label="tone"
        value={toneDisplay}
        options={TONES}
        onSelect={(v) => onChange({ ...params, tone: v as GenerationParams["tone"] })}
        active={hasCustomTone}
      />
      <Divider />
      <Prop
        label="length"
        value={lengthDisplay}
        options={LENGTHS}
        onSelect={(v) => onChange({ ...params, length: v as GenerationParams["length"] })}
        active={hasCustomLength}
      />

      {format !== "thumbnail" && (
        <>
          <Divider />
          <FormatSpecificOptions format={format} params={params} onChange={onChange} />
        </>
      )}
    </div>
  )
}
