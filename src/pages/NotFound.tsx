import { motion } from "framer-motion";
import { ArrowLeft, Compass, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { useSeo } from "@/hooks/use-seo";

/** Branded "Lost in the field" 404 page. */
export default function NotFound() {
  useSeo();

  return (
    <div className="glass-scene relative flex min-h-screen flex-col overflow-hidden">
      {/* Ambient orbs behind the glass */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="glass-orb left-[-8rem] top-[-6rem] size-[24rem] bg-sky-300/50" />
        <div className="glass-orb right-[-6rem] bottom-[-4rem] size-[22rem] bg-indigo-300/40" />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-panel glass-panel-strong w-full max-w-lg rounded-3xl p-8 text-center sm:p-10"
        >
          <div className="mx-auto flex items-center justify-center gap-3">
            <img src={logo} alt="" className="size-14" />
            <div className="text-left">
              <p className="text-4xl font-extrabold tracking-tight text-foreground">
                404
              </p>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Page not found
              </p>
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
            This page never made it to print
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            The page you're looking for doesn't exist or was moved. Head back
            and start drafting instead — it takes one keyword.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 rounded-xl px-6 text-[15px] shadow-lg shadow-primary/25">
              <Link to="/">
                <ArrowLeft className="size-4" />
                Back to home
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 rounded-xl border-white/60 bg-white/50 px-6 text-[15px] backdrop-blur">
              <Link to="/dashboard">
                <Sparkles className="size-4" />
                Open workspace
              </Link>
            </Button>
          </div>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Compass className="size-3.5" />
            Tip: the draft workspace lives at
            <Link
              to="/dashboard"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              /dashboard
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
