/**
 * Server-only OpenRouter streaming client.
 *
 * Runs inside Convex HTTP actions (V8 runtime) — uses only standard
 * fetch/Streams APIs, no Node built-ins. Never import this module from
 * client code: it reads the API key from the server environment.
 */

/**
 * Free-tier models, in priority order.
 *
 * OpenRouter retires and rate-limits free slugs frequently (the original spec's
 * `meta-llama/llama-3-8b-instruct:free` and later
 * `deepseek/deepseek-v4-flash-0731:free` were both retired), so requests
 * automatically fall through this chain on model-level failures instead of
 * hard-failing. Both candidates are non-reasoning writer models that produce
 * formatting-heavy Markdown directly — verified against the live API.
 */
export const OPENROUTER_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free", // primary: strongest long-form prose
  "nvidia/nemotron-3.5-lightning:free", // fallback: same family, speed-optimized
] as const;

const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";

export const CONTENT_STYLES = [
  "Informational",
  "Case Study",
  "Step-by-Step Guide",
] as const;

export type ContentStyle = (typeof CONTENT_STYLES)[number];

export interface DraftRequest {
  topic: string;
  contentStyle: ContentStyle;
}

/**
 * Style-specific writing directives injected into the system prompt so each
 * article type gets the right structure, depth and voice.
 */
const STYLE_DIRECTIVES: Record<ContentStyle, string> = {
  Informational: `Framework: in-depth informational article.
- Open with a hook that names a surprising fact, stat or common misconception about the topic.
- Structure around 4-6 H2 sections that progressively deepen understanding (what it is → why it matters → how it works → common mistakes → what to do next).
- Use H3 subsections to break dense sections apart, bullet lists for scannable facts, and one comparison table where it clarifies options.`,
  "Case Study": `Framework: narrative case-study article.
- Open with the outcome-first hook: the concrete result or transformation, then promise to show how it happened.
- Structure: The Challenge → The Approach (H3 sub-steps) → The Results (with numbers) → Key Takeaways.
- Use bullet lists for tactics and a short table summarizing before/after metrics. Keep the tone analytical, not promotional.`,
  "Step-by-Step Guide": `Framework: actionable tutorial / how-to article.
- Open with a hook about the payoff the reader gets by the end, plus what they need before starting.
- Structure: numbered H2 steps ("Step 1: ..."), each with a short intro sentence, H3 sub-details, bullet lists for sub-tasks, and a "Common pitfalls" note per step.
- End with a quick-reference checklist the reader can copy.`,
};

/**
 * Builds the optimized message array for the draft generator. The system
 * prompt enforces formatting-heavy, publish-ready Markdown output.
 */
export function buildDraftMessages({ topic, contentStyle }: DraftRequest) {
  const system = [
    "You are SeedText AI, an expert long-form blog writer for niche websites.",
    "You write complete, publish-ready article drafts in clean GitHub-flavored Markdown.",
    "",
    "GLOBAL RULES (always apply):",
    "- Output Markdown ONLY. No preamble like \"Sure, here is...\", no closing chatter, no code fences around the whole article.",
    "- Start with a single `# ` H1 title that is specific and click-worthy (max 60 characters, include the keyword naturally).",
    "- Then a 2-3 sentence introductory hook that earns the scroll.",
    "- Use clear `## ` H2 sections and `### ` H3 subsections. Never skip heading levels.",
    "- Use `- ` bullet points liberally for facts, tips and options; use **bold** for key terms and takeaways.",
    "- Where useful, include one small Markdown table for comparisons or metrics.",
    "- Depth target: roughly 1,100-1,400 words. Every section must deliver substance, not filler.",
    "- Sound like a knowledgeable human: concrete examples, specific numbers, plain language. Zero corporate fluff.",
    "- Close with a `## ` conclusion that summarizes the takeaways and one clear next action for the reader.",
    `- Article framework for this request: ${STYLE_DIRECTIVES[contentStyle]}`,
  ].join("\n");

  const user = `Write the full article draft now.\nNiche target keyword: "${topic}"\nArticle type: ${contentStyle}`;

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

/** Error thrown for any upstream OpenRouter failure. */
export class OpenRouterError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
  }
}

/**
 * POSTs a streaming chat-completion request to OpenRouter and returns the
 * raw upstream `Response` so the caller can pipe `response.body` straight
 * back to the browser chunk-by-chunk (SSE: `data: {...}` lines).
 */
export async function streamDraftFromOpenRouter(
  { topic, contentStyle }: DraftRequest,
): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError(
      "OPENROUTER_API_KEY is not configured on the server. Set it in the project's API keys settings or via `bun convex env set OPENROUTER_API_KEY <key>`.",
      500,
    );
  }

  let lastFailure: OpenRouterError | null = null;

  for (const model of OPENROUTER_MODELS) {
    let response: Response;
    try {
      response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "X-Title": "SeedText",
        },
        body: JSON.stringify({
          model,
          messages: buildDraftMessages({ topic, contentStyle }),
          stream: true,
          temperature: 0.7,
          // Belt-and-braces: keeps any reasoning-capable model from spending
          // the token budget on chain-of-thought instead of the article.
          reasoning: { enabled: false },
          max_tokens: 4096,
        }),
      });
    } catch {
      lastFailure = new OpenRouterError(
        "Could not reach OpenRouter. Check network connectivity and try again.",
        502,
      );
      continue;
    }

    if (response.ok) return response;

    const detail = await response.text().catch(() => "");
    let message = `OpenRouter request failed (${response.status}).`;
    try {
      const parsed = JSON.parse(detail) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      if (detail) message = detail.slice(0, 300);
    }
    if (response.status === 429) {
      message =
        "OpenRouter free-tier rate limit hit. Wait a minute and generate again.";
    }
    lastFailure = new OpenRouterError(message, response.status);

    // Fall through to the next candidate on model-level failures (slug
    // retired => 404, upstream/provider limit => 429, provider trouble => 5xx).
    // Auth (401/403) and bad-request (400) errors fail fast — the next model
    // would hit the same problem.
    const modelLevelFailure =
      response.status === 404 ||
      response.status === 429 ||
      response.status >= 500;
    if (!modelLevelFailure) throw lastFailure;
  }

  throw (
    lastFailure ??
    new OpenRouterError(
      "No free drafting model is currently available. Please try again later.",
      502,
    )
  );
}
