import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Feather,
  FileText,
  Gauge,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

const FEATURES = [
  {
    icon: Zap,
    title: "Instant, streamed drafts",
    body: "Watch the article write itself. Markdown streams in token-by-token, so you can start editing before the draft is even done.",
  },
  {
    icon: ListChecks,
    title: "Structured, not slop",
    body: "Every draft ships with a click-worthy H1, scannable H2/H3 sections, bullet points, and a takeaway-driven conclusion.",
  },
  {
    icon: BookOpen,
    title: "Three article frameworks",
    body: "Informational deep-dives, results-first case studies, and numbered step-by-step guides — each with its own optimized outline.",
  },
  {
    icon: Feather,
    title: "Niche-tuned voice",
    body: "Give it any keyword, from 'cold brew at altitude' to 'B2B churn cohorts', and get copy that sounds like a human specialist.",
  },
  {
    icon: Gauge,
    title: "Zero-cost pipeline",
    body: "Runs on SeedText AI's free drafting engine. No credits, no subscriptions, no per-word bills — ever.",
  },
  {
    icon: ShieldCheck,
    title: "Key stays server-side",
    body: "Generation runs behind an authenticated API route. Your API keys never touch the browser or the bundle.",
  },
];

const STEPS = [
  {
    title: "Describe your niche",
    body: "Type any target keyword — a product, a problem, a long-tail phrase — and pick the article framework that fits your content plan.",
  },
  {
    title: "Generate & watch it write",
    body: "One click starts the stream. The draft builds in real time: hook, sections, bullets, table, conclusion.",
  },
  {
    title: "Copy & polish",
    body: "Grab the full Markdown with one tap and drop it into your CMS. Publish-ready structure, your final voice.",
  },
];

export default function Landing() {
  return (
    <div className="glass-scene overflow-x-clip">
      {/* Ambient orbs behind the glass */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="glass-orb left-[-10rem] top-[-6rem] size-[28rem] bg-sky-300/50" />
        <div className="glass-orb right-[-8rem] top-[8rem] size-[24rem] bg-indigo-300/50" />
        <div className="glass-orb bottom-[6rem] left-[20%] size-[22rem] bg-cyan-200/50" />
      </div>

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="glass-panel mx-auto flex h-14 max-w-5xl items-center justify-between rounded-2xl px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="size-8" />
            <span className="text-[15px] font-bold tracking-tight text-foreground">
            SeedText
          </span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
            <a href="#features" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-white/50 hover:text-foreground">
              Features
            </a>
            <a href="#how" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-white/50 hover:text-foreground">
              How it works
            </a>
            <a href="#pricing" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-white/50 hover:text-foreground">
              Pricing
            </a>
          </nav>
          <Button asChild className="rounded-xl">
            <Link to="/dashboard">
              Open workspace
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="glass-chip text-xs font-medium text-foreground/80">
            <Sparkles className="size-3.5 text-primary" />
            Powered by SeedText AI · free forever
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-6xl"
        >
          Type a keyword.
          <br />
          <span className="bg-gradient-to-r from-primary via-sky-500 to-cyan-500 bg-clip-text text-transparent">
            Watch the draft write itself.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          SeedText turns any niche keyword into a structured, publish-ready
          Markdown article — streamed live to your workspace in seconds, for
          exactly $0.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button asChild size="lg" className="h-11 rounded-xl px-7 text-[15px] shadow-lg shadow-primary/25">
            <Link to="/dashboard">
              <Wand2 className="size-4" />
              Start drafting free
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 rounded-xl border-white/60 bg-white/50 px-7 text-[15px] backdrop-blur">
            <a href="#how">
              See how it works
              <ChevronRight className="size-4" />
            </a>
          </Button>
        </motion.div>

        {/* ── Live demo mock ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="relative mx-auto mt-14 max-w-4xl"
        >
          <div className="grid gap-4 text-left md:grid-cols-[280px_1fr]">
            {/* Mock form */}
            <div className="glass-panel rounded-2xl p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Wand2 className="size-3.5 text-primary" />
                Draft controls
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1.5 text-xs font-medium text-foreground/70">Niche target keyword</div>
                  <div className="rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-sm text-foreground shadow-inner">
                    cold plunge recovery
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-xs font-medium text-foreground/70">Content tone / style</div>
                  <div className="flex items-center justify-between rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-sm text-foreground shadow-inner">
                    Informational
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30">
                  Generate Article Draft
                </div>
              </div>
            </div>

            {/* Mock stream */}
            <div className="glass-panel glass-panel-strong rounded-2xl p-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-wider">
                  <FileText className="size-3.5 text-primary" />
                  article-draft.md
                </span>
                <span className="glass-chip px-2 py-0.5 text-[10px] font-semibold text-primary">
                  streaming
                </span>
              </div>
              <div className="glass-prose mt-4 max-h-64 overflow-hidden text-[13px]">
                <h1 className="mt-0">Cold Plunge Recovery: What the Science Actually Says</h1>
                <p>
                  Cold plunges went from locker-room ritual to wellness obsession…
                </p>
                <h2 className="text-[15px]">Why athletes swear by the freeze</h2>
                <ul className="text-[13px]">
                  <li>Reduced perceived muscle soreness within 24h</li>
                  <li>Sharpe<span className="stream-caret">ned focus and adherence to training plans</span></li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" className="relative mx-auto max-w-5xl scroll-mt-24 px-4 py-16">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center">
          <span className="glass-chip text-xs font-medium text-foreground/80">
            <Sparkles className="size-3.5 text-primary" />
            Why SeedText
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A draft engine built for niche publishers
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Everything you need to go from keyword to first draft — nothing you
            don't.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              {...fadeUp}
              transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
              className="glass-panel rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section id="how" className="relative mx-auto max-w-5xl scroll-mt-24 px-4 py-16">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center">
          <span className="glass-chip text-xs font-medium text-foreground/80">
            <Zap className="size-3.5 text-primary" />
            The workflow
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Keyword to draft in three moves
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              {...fadeUp}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="glass-panel relative rounded-2xl p-6"
            >
              <span className="text-4xl font-extrabold text-primary/25">
                0{i + 1}
              </span>
              <h3 className="mt-2 font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section id="pricing" className="relative mx-auto max-w-5xl scroll-mt-24 px-4 py-16">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="glass-panel mx-auto max-w-2xl rounded-3xl p-8 text-center sm:p-10"
        >
          <span className="glass-chip text-xs font-medium text-foreground/80">
            <Gauge className="size-3.5 text-primary" />
            Pricing
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
            Free. Really.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            SeedText runs entirely on its own free drafting engine. No card,
            no credits, no tier gates.
          </p>
          <div className="mt-6 flex items-baseline justify-center gap-2">
            <span className="text-5xl font-extrabold tracking-tight text-foreground">$0</span>
            <span className="text-muted-foreground">/ month, unlimited drafts*</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            *Within SeedText's free-tier fair-use limits.
          </p>
          <Button asChild size="lg" className="mt-7 h-11 rounded-xl px-8 text-[15px] shadow-lg shadow-primary/25">
            <Link to="/dashboard">
              <Wand2 className="size-4" />
              Open the workspace
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="relative border-t border-white/50 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="size-6" />
            <span className="font-semibold text-foreground">SeedText</span>
            <span>— niche drafts, streamed live.</span>
          </div>
          <span>Built with SeedText AI · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
