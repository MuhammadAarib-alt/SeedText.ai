import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const LIST_LIMIT = 50;

/**
 * Seed Vault — per-user article history.
 *
 * Every function is scoped to the authenticated user via getAuthUserId, and
 * `save` additionally rejects anonymous (guest) accounts, so a guest can
 * never write into history. The guest gate in the UI (hiding the button) is
 * UX only; this is the real enforcement.
 */

/** Metadata for the vault list — small payloads, no full article bodies. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("articles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(LIST_LIMIT);

    return rows.map((row) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      topic: row.topic,
      contentStyle: row.contentStyle,
      wordCount: row.wordCount,
      preview: row.content.slice(0, 140),
    }));
  },
});

/** Full article body, only if it belongs to the caller. */
export const get = query({
  args: { id: v.id("articles") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const article = await ctx.db.get(id);
    if (!article || article.userId !== userId) return null;
    return article;
  },
});

/** Archive a finished draft. Signed-in (non-guest) users only. */
export const save = mutation({
  args: {
    topic: v.string(),
    contentStyle: v.string(),
    content: v.string(),
    wordCount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Sign in to save drafts to your vault.");
    }
    const user = await ctx.db.get(userId);
    if (!user || user.isAnonymous) {
      throw new Error("History is available for signed-in users only.");
    }

    return await ctx.db.insert("articles", { userId, ...args });
  },
});

/** Delete one of your archived drafts. */
export const remove = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");

    const article = await ctx.db.get(id);
    if (!article) return;
    if (article.userId !== userId) throw new Error("That draft isn't yours.");

    await ctx.db.delete(id);
  },
});
