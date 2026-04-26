import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("todos")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.insert("todos", {
      text: args.text,
      isCompleted: false,
      userId,
    });
  },
});

export const toggle = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const todo = await ctx.db.get(args.id);
    if (!todo) throw new Error("Todo not found");
    if (todo.userId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(args.id, { isCompleted: !todo.isCompleted });
  },
});

export const remove = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const todo = await ctx.db.get(args.id);
    if (!todo) throw new Error("Todo not found");
    if (todo.userId !== userId) throw new Error("Not authorized");
    await ctx.db.delete(args.id);
  },
});
