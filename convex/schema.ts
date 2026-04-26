import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  todos: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
    userId: v.id("users"),
  }).index("by_userId", ["userId"]),
});
