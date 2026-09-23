import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

/**
 * Daily fair-use limits for draft generation.
 *
 * One row per identity per UTC day. `consume` runs as a single-transaction
 * mutation, so concurrent requests can't race past the cap.
 *
 * Everything is keyed by the auth identity's `subject` and all mutating
 * functions are internal — only server code (the HTTP action) can call
 * them, so clients can never mint quota for another subject.
 *
 * The limit applies to every identity, guests included, because the shared
 * free drafting quota is the resource being protected.
 */
export const DAILY_DRAFT_LIMIT = 10;

/** "YYYY-MM-DD" for the current moment, in UTC. */
function todayUtc(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

type ConsumeResult =
  | { ok: true; remaining: number; limit: number }
  | { ok: false; remaining: 0; limit: number };

/**
 * Consume one draft slot for `subject`. Called by the generate-draft HTTP
 * action right before opening the upstream stream.
 */
export const consume = internalMutation({
  args: { subject: v.string() },
  handler: async (ctx, args): Promise<ConsumeResult> => {
    const day = todayUtc();
    const existing = await ctx.db
      .query("usage")
      .withIndex("by_subject_day", (q) =>
        q.eq("subject", args.subject).eq("day", day),
      )
      .unique();

    if (existing) {
      if (existing.count >= DAILY_DRAFT_LIMIT) {
        return { ok: false, remaining: 0, limit: DAILY_DRAFT_LIMIT };
      }
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
      return {
        ok: true,
        remaining: DAILY_DRAFT_LIMIT - existing.count - 1,
        limit: DAILY_DRAFT_LIMIT,
      };
    }

    await ctx.db.insert("usage", { subject: args.subject, day, count: 1 });
    return { ok: true, remaining: DAILY_DRAFT_LIMIT - 1, limit: DAILY_DRAFT_LIMIT };
  },
});

/**
 * Give a slot back when generation never actually started (the upstream
 * model rejected the request). Only refunds the current UTC day's counter
 * and only within a few minutes of the attempt, so old successes can't be
 * replayed into fresh credits.
 */
export const refund = internalMutation({
  args: { subject: v.string(), withinMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const day = todayUtc();
    const existing = await ctx.db
      .query("usage")
      .withIndex("by_subject_day", (q) =>
        q.eq("subject", args.subject).eq("day", day),
      )
      .unique();
    if (!existing || existing.count <= 0) return;

    const windowMs = args.withinMs ?? 10 * 60 * 1000;
    if (Date.now() - existing._creationTime > windowMs) return;

    await ctx.db.patch(existing._id, { count: existing.count - 1 });
  },
});

/**
 * Today's allowance for the current identity — powers the workspace UI.
 */
export const myUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return { remaining: DAILY_DRAFT_LIMIT, limit: DAILY_DRAFT_LIMIT };
    }

    const existing = await ctx.db
      .query("usage")
      .withIndex("by_subject_day", (q) =>
        q.eq("subject", identity.subject).eq("day", todayUtc()),
      )
      .unique();

    const count = existing?.count ?? 0;
    return {
      remaining: Math.max(0, DAILY_DRAFT_LIMIT - count),
      limit: DAILY_DRAFT_LIMIT,
    };
  },
});
