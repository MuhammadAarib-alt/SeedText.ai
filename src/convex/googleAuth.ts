import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Find or create the SeedText user for a Google sign-in.
 *
 * Called from the "google" auth provider's authorize() (see src/convex/auth.ts).
 * Runs with no user identity — it only ever touches the fields Google's
 * verified ID token provides.
 *
 * Matching is by email, so signing in with Google using an email that
 * already has a passwordless account links to the same user.
 */
export const getOrCreateUser = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();

    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      // Backfill profile details Google provides if they're missing.
      const patch: { name?: string; image?: string } = {};
      if (args.name && !existing.name) patch.name = args.name;
      if (args.image && !existing.image) patch.image = args.image;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }
      return existing._id;
    }

    return await ctx.db.insert("users", {
      email,
      name: args.name,
      image: args.image,
      // Google has already verified ownership of this email address.
      emailVerificationTime: Date.now(),
    });
  },
});
