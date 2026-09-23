import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Saved article drafts (history) — one row per generated article.
    articles: defineTable({
      userId: v.id("users"),
      topic: v.string(), // the niche keyword used for generation
      contentStyle: v.string(), // Informational | Case Study | Step-by-Step Guide
      content: v.string(), // full markdown draft
      wordCount: v.number(),
    }).index("by_user", ["userId"]),

    // Daily fair-use counters — one row per identity per UTC day.
    // Keyed by auth subject (stable per sign-in method) rather than the
    // users-table id, so the HTTP action can use it without a join.
    usage: defineTable({
      subject: v.string(), // auth identity subject
      day: v.string(), // "YYYY-MM-DD" in UTC
      count: v.number(),
    }).index("by_subject_day", ["subject", "day"]),

    // add other tables here

    // tableName: defineTable({
    //   ...
    //   // table fields
    // }).index("by_field", ["field"])
  },
  {
    schemaValidation: false,
  },
);

export default schema;
