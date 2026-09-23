import { useEffect } from "react";

/**
 * Per-route SEO metadata.
 *
 * The SPA head (index.html) carries the full static SEO layer — title,
 * description, OG/Twitter cards, and JSON-LD. This hook re-points title +
 * description + canonical + social tags for each route, and marks private
 * pages (dashboard, auth) noindex so search engines only index the public
 * landing page.
 */
const SITE_URL = "https://seedtext.app";

type RouteMeta = {
  title: string;
  description: string;
  noindex: boolean;
};

const META: Record<string, RouteMeta> = {
  "/": {
    title: "SeedText — Free AI Article Draft Generator for Niche Content",
    description:
      "SeedText turns any niche keyword into a structured, publish-ready Markdown article draft — streamed live in seconds. Informational deep-dives, case studies, and step-by-step guides. Free forever.",
    noindex: false,
  },
  "/auth": {
    title: "Sign in — SeedText AI Article Draft Studio",
    description:
      "Sign in to SeedText with email or continue as guest to start drafting free.",
    noindex: true,
  },
  "/dashboard": {
    title: "Draft Workspace — SeedText AI",
    description: "Your private SeedText drafting workspace.",
    noindex: true,
  },
  "/terms": {
    title: "Terms of Service — SeedText",
    description:
      "The terms that govern your use of SeedText, the free AI article draft studio.",
    noindex: false,
  },
  "/privacy": {
    title: "Privacy Policy — SeedText",
    description:
      "What SeedText collects, what it deliberately doesn't, and how guest mode and accounts differ.",
    noindex: false,
  },
};

const FALLBACK: RouteMeta = {
  title: "Page not found — SeedText",
  description:
    "The page you're looking for doesn't exist. Head back to SeedText to start drafting free.",
  noindex: true,
};

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

export function useSeo() {
  useEffect(() => {
    const pathname = window.location.pathname;
    const meta = META[pathname] ?? FALLBACK;
    const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");

    document.title = meta.title;
    setMeta(
      "name",
      "description",
      meta.description,
    );
    setMeta(
      "name",
      "robots",
      meta.noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    );
    setMeta("property", "og:title", meta.title);
    setMeta("property", "og:description", meta.description);
    setMeta("property", "og:url", `${SITE_URL}${cleanPath}`);
    setMeta("name", "twitter:title", meta.title);
    setMeta("name", "twitter:description", meta.description);
    setCanonical(`${SITE_URL}${cleanPath}`);
  }, []);
}

export default useSeo;
