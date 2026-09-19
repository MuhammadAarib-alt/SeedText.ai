import { useAuthToken } from "@convex-dev/auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoDropdown } from "@/components/LogoDropdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertCircle,
  Check,
  CircleStop,
  Copy,
  Eraser,
  FileText,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCallback, useEffect, useRef, useState } from "react";

/** Convex HTTP actions live on the .convex.site domain (not .convex.cloud). */
const CONVEX_HTTP_URL = (
  import.meta.env.VITE_CONVEX_URL as string | undefined
)?.replace(/\.convex\.cloud$/, ".convex.site");

const CONTENT_STYLES = [
  "Informational",
  "Case Study",
  "Step-by-Step Guide",
] as const;

type ContentStyle = (typeof CONTENT_STYLES)[number];

type Status = "idle" | "streaming" | "done" | "error";

const EXAMPLE_KEYWORDS = [
  "cold plunge recovery",
  "sourdough starter troubleshooting",
  "van life insurance",
  "B2B churn cohorts",
];

export default function Dashboard() {
  const { user } = useAuth();
  const authToken = useAuthToken();

  const [topic, setTopic] = useState("");
  const [contentStyle, setContentStyle] = useState<ContentStyle>("Informational");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  // Abort any in-flight stream when the workspace unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const isStreaming = status === "streaming";
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }, []);

  // Auto-follow the stream unless the reader scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [draft]);

  const generate = async () => {
    const trimmedTopic = topic.trim();
    if (trimmedTopic.length < 2) {
      setError("Give me a niche keyword first — at least 2 characters.");
      return;
    }
    if (!CONVEX_HTTP_URL) {
      setError("Backend URL is not configured (missing VITE_CONVEX_URL).");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("streaming");
    setError(null);
    setDraft("");
    setCopied(false);
    stickToBottomRef.current = true;

    try {
      const response = await fetch(`${CONVEX_HTTP_URL}/api/generate-draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken ?? ""}`,
        },
        body: JSON.stringify({ topic: trimmedTopic, contentStyle }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          data?.error ?? `Generation failed (HTTP ${response.status}).`,
        );
      }

      if (!response.body) throw new Error("The server returned an empty stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) setDraft((prev) => prev + chunk);
      }

      setStatus("done");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      setStatus("error");
    }
  };

  const stop = () => {
    const controller = abortRef.current;
    abortRef.current = null; // detach first so the abort rejection can't race
    controller?.abort();
    // Keep whatever streamed in and drop back to the idle toolbar — the
    // article body stays visible because `draft` is non-empty.
    setStatus("idle");
  };

  const copyDraft = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      toast.success("Draft copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  };

  const clearDraft = () => {
    if (isStreaming) abortRef.current?.abort();
    setDraft("");
    setStatus("idle");
    setError(null);
  };

  return (
    <div className="glass-scene">
      {/* Ambient orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glass-orb left-[-8rem] top-[-6rem] size-[24rem] bg-sky-300/50" />
        <div className="glass-orb right-[-6rem] bottom-[-4rem] size-[22rem] bg-indigo-300/40" />
      </div>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="px-4 pt-4">
        <div className="glass-panel mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-4">
          <div className="flex items-center gap-3">
            <LogoDropdown />
            <div className="hidden sm:block">
              <p className="text-[13px] font-semibold leading-tight text-foreground">
                Draft workspace
              </p>
              <p className="text-xs leading-tight text-muted-foreground">
                {user?.email ?? "signed in"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="glass-chip hidden text-[11px] font-medium text-muted-foreground sm:inline-flex">
              <Sparkles className="size-3 text-primary" />
              SeedText AI
            </span>
            <Button asChild variant="outline" className="rounded-xl border-white/60 bg-white/50">
              <a href="/">
                <FileText className="size-4" />
                Landing
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Workspace ──────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid items-start gap-4 lg:grid-cols-[340px_1fr]">
          {/* ── Left: draft controls ─────────────────────────── */}
          <section className="glass-panel rounded-2xl p-5 lg:sticky lg:top-4">
            <h1 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Wand2 className="size-4 text-primary" />
              Draft controls
            </h1>

            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                // The action button below never unmounts (prevents
                // click-swap races between Stop and Generate), so a submit
                // means "stop" while streaming and "generate" otherwise.
                if (isStreaming) {
                  stop();
                  return;
                }
                void generate();
              }}
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="topic"
                  className="text-xs font-medium text-foreground/80"
                >
                  Niche target keyword
                </label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. cold plunge recovery"
                  className="h-10 rounded-xl border-white/60 bg-white/70 shadow-inner placeholder:text-muted-foreground/60"
                  maxLength={200}
                  disabled={isStreaming}
                />
                <p className="text-[11px] text-muted-foreground">
                  The keyword or phrase your article should rank for.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/80">
                  Content tone / style
                </label>
                <Select
                  value={contentStyle}
                  onValueChange={(v) => setContentStyle(v as ContentStyle)}
                  disabled={isStreaming}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-white/60 bg-white/70 shadow-inner">
                    <SelectValue placeholder="Pick a style" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CONTENT_STYLES.map((style) => (
                      <SelectItem key={style} value={style} className="rounded-lg">
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {contentStyle === "Informational" &&
                    "Deep-dive explainer with hook, H2 depth and a comparison table."}
                  {contentStyle === "Case Study" &&
                    "Results-first narrative: challenge → approach → results → takeaways."}
                  {contentStyle === "Step-by-Step Guide" &&
                    "Numbered H2 steps, pitfalls per step, quick-reference checklist."}
                </p>
              </div>

              <Button
                type="submit"
                variant={isStreaming ? "outline" : "default"}
                className={
                  isStreaming
                    ? "h-11 w-full rounded-xl border-white/60 bg-white/60"
                    : "h-11 w-full rounded-xl text-[15px] shadow-lg shadow-primary/30"
                }
                disabled={!isStreaming && !topic.trim()}
              >
                {isStreaming ? (
                  <>
                    <CircleStop className="size-4 text-destructive" />
                    Stop generating
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4" />
                    Generate Article Draft
                  </>
                )}
              </Button>
            </form>

            {/* Quick-start examples */}
            <div className="mt-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Try one
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {EXAMPLE_KEYWORDS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => setTopic(example)}
                    className="rounded-full border border-white/60 bg-white/55 px-2.5 py-1 text-[11px] text-foreground/80 transition-colors hover:bg-white/85 disabled:opacity-50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Right: streaming output ──────────────────────── */}
          <section className="glass-panel glass-panel-strong flex min-h-[560px] flex-col rounded-2xl lg:min-h-[calc(100vh-8.5rem)]">
            {/* Output toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/50 px-5 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <FileText className="size-4 text-primary" />
                article-draft.md
                {wordCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 rounded-full border border-white/60 bg-white/60 text-[10px] font-medium text-muted-foreground"
                  >
                    {wordCount} words
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isStreaming && (
                  <span className="glass-chip animate-pulse px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <Loader2 className="size-3 animate-spin" />
                    Streaming…
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-white/60 bg-white/55"
                  onClick={clearDraft}
                  disabled={!draft && status === "idle"}
                >
                  <Eraser className="size-3.5" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="rounded-lg shadow-md shadow-primary/25"
                  onClick={() => void copyDraft()}
                  disabled={!draft || isStreaming}
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Streamed markdown */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="relative flex-1 overflow-y-auto px-5 py-4 sm:px-7"
            >
              {error ? (
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">Generation failed</p>
                    <p className="mt-0.5 text-destructive/80">{error}</p>
                  </div>
                </div>
              ) : draft ? (
                <article className="glass-prose max-w-3xl">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {draft}
                  </ReactMarkdown>
                  {isStreaming && <span className="stream-caret" />}
                </article>
              ) : status === "streaming" ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Warming up the model…
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Wand2 className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Your draft will appear here
                    </p>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Enter a niche keyword, pick a style, and hit{" "}
                      <span className="font-medium text-primary">
                        Generate Article Draft
                      </span>
                      . The Markdown streams in live.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
