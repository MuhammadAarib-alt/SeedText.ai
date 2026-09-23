/**
 * Streaming draft-generation endpoint (the "route handler").
 *
 * Pipeline:
 *   browser → POST /api/generate-draft (auth token header)
 *   → auth check → OpenRouter SSE stream → decoded text chunks → browser
 *
 * The API key never leaves the server; the browser only ever sees article text.
 */
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { OpenRouterError, CONTENT_STYLES, streamDraftFromOpenRouter } from "./lib/openrouter";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/** Preflight handler so the browser may send the Authorization header. */
export const generateDraftPreflight = httpAction(async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
});

export const generateDraft = httpAction(async (ctx, request) => {
    // ── 1. Authenticate ────────────────────────────────────────────────
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return new Response(
        JSON.stringify({ error: "You must be signed in to generate drafts." }),
        {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // ── 2. Parse + validate the payload ────────────────────────────────
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Request body must be valid JSON." }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const parsed = payload as { topic?: unknown; contentStyle?: unknown };
    if (
      typeof parsed?.topic !== "string" ||
      typeof parsed?.contentStyle !== "string"
    ) {
      return new Response(
        JSON.stringify({
          error: "Expected a JSON body of { topic, contentStyle }.",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const topic = parsed.topic.trim();
    const contentStyle = parsed.contentStyle;

    if (topic.length < 2 || topic.length > 200) {
      return new Response(
        JSON.stringify({
          error: "Topic must be between 2 and 200 characters.",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    if (!CONTENT_STYLES.includes(contentStyle as (typeof CONTENT_STYLES)[number])) {
      return new Response(
        JSON.stringify({ error: `Unknown content style "${contentStyle}".` }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // ── 2b. Daily fair-use limit ────────────────────────────────────────
    // Consume a slot atomically before touching the upstream API. The
    // subject is the identity's stable auth id, so guests and signed-in
    // users are both counted.
    const subject = identity.subject;
    const allowance = await ctx.runMutation(internal.usage.consume, {
      subject,
    });
    if (!allowance.ok) {
      return new Response(
        JSON.stringify({
          error:
            "You've reached today's draft limit — 10 per day while SeedText is in early access. Your allowance resets at midnight UTC. Thanks for helping us keep drafting free for everyone!",
          code: "daily_limit_reached",
          remaining: 0,
        }),
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
            "Retry-After": "3600",
          },
        },
      );
    }

    // ── 3. Start the OpenRouter stream (server-side key stays secret) ──
    let upstream: Response;
    try {
      upstream = await streamDraftFromOpenRouter({
        topic,
        contentStyle: contentStyle as (typeof CONTENT_STYLES)[number],
      });
    } catch (error) {
      // The stream never opened — the consumed slot wasn't used, give it back.
      void ctx
        .runMutation(internal.usage.refund, { subject, withinMs: 10 * 60 * 1000 })
        .catch(() => {});
      const message =
        error instanceof OpenRouterError
          ? error.message
          : "Failed to start generation. Please try again.";
      const status = error instanceof OpenRouterError ? error.status : 500;
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!upstream.body) {
      return new Response(
        JSON.stringify({ error: "OpenRouter returned an empty stream." }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // ── 4. Pipe SSE chunks to the client as plain text deltas ─────────
    //
    // NOTE: deliberately avoids `upstream.body.pipeThrough(new
    // TextDecoderStream()).getReader()` — that chaining pattern never yields
    // data under Convex's V8 runtime (verified empirically), producing an
    // empty 200 response. An explicit reader + TextDecoder + start() pump
    // works correctly.
    const upstreamReader = upstream.body.getReader();
    const decoder = new TextDecoder();
    // Convex's V8 runtime requires ReadableStream chunks to be Uint8Array —
    // enqueueing strings fails with "serde_v8 error: expected buffer, got
    // string" and silently kills the stream.
    const encoder = new TextEncoder();
    let sseCarry = ""; // partial SSE line carried across network chunks

    const textStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for (;;) {
            const { done, value } = await upstreamReader.read();
            if (done) break;

            // OpenRouter uses the OpenAI SSE protocol: lines like
            // `data: {"choices":[{"delta":{"content":"..."}}]}`.
            // Frames can split a line in half, so keep a carry buffer.
            const text = sseCarry + decoder.decode(value, { stream: true });
            const lines = text.split("\n");
            sseCarry = lines.pop() ?? "";

            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (!data || data === "[DONE]") continue;
              try {
                const parsedData = JSON.parse(data) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const delta = parsedData.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(encoder.encode(delta));
              } catch {
                // Ignore keep-alive comments / malformed frames.
              }
            }
          }
        } catch {
          // Upstream aborted or errored mid-stream: end the client stream.
        } finally {
          void upstreamReader.cancel().catch(() => {});
          controller.close();
        }
      },
      cancel() {
        void upstreamReader.cancel().catch(() => {});
      },
    });

    return new Response(textStream, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
});
