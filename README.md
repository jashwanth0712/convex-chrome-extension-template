# Using Convex in Chrome Extensions

Chrome extensions are constrained environments. Adding a backend means dealing with deployment, CORS, WebSocket plumbing, auth — all before writing any actual extension logic.

Convex cuts all of that. The extension opens one WebSocket to Convex and gets a real-time database, serverless functions, and auth out of the box.

| Concern            | Traditional Stack                       | Convex                            |
| ------------------ | --------------------------------------- | --------------------------------- |
| **API layer**      | REST server (Express, FastAPI, etc.)    | Serverless functions in `convex/` |
| **Auth**           | Separate JWT / session service          | Built-in (`@convex-dev/auth`)     |
| **Database**       | Provision, migrate, connection pool     | Managed: define schema, done      |
| **Real-time**      | WebSocket server + pub/sub wiring       | Automatic via `useQuery()`        |
| **DevOps**         | Docker, CI/CD, SSL, scaling, monitoring | None (handled by Convex cloud)    |
| **What you write** | Many services across many files         | `schema.ts` + `todos.ts`          |

![Convex Todo demo](blog/video/demo.gif)

## Setup

```bash
mkdir convex-chrome-extension-template && cd convex-chrome-extension-template
npm init -y
npm install convex react react-dom
npm install -D vite @vitejs/plugin-react @crxjs/vite-plugin tailwindcss @tailwindcss/vite typescript @types/react @types/react-dom @types/chrome npm-run-all
```

`package.json` scripts:

```json
"type": "module",
"scripts": {
  "dev": "npm-run-all --parallel dev:backend dev:frontend",
  "dev:frontend": "vite",
  "dev:backend": "convex dev",
  "build": "vite build"
}
```

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  server: { cors: { origin: [/chrome-extension:\/\//] } },
  legacy: { skipWebSocketTokenCheck: true },
});
```

The `server.cors` and `legacy` settings are needed because Vite 6 introduced stricter security that breaks Chrome extension dev mode.

`manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Convex Todo",
  "version": "0.0.1",
  "action": { "default_popup": "index.html" },
  "permissions": ["storage"]
}
```

## Backend (2 files)

Run `npx convex dev` once to log in and create a project. It drops a `.env.local` with `VITE_CONVEX_URL`.

**`convex/schema.ts`**

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  todos: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
  }),
});
```

**`convex/todos.ts`**

```ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => ctx.db.query("todos").order("desc").collect(),
});

export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("todos", { text: args.text, isCompleted: false });
  },
});

export const toggle = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) throw new Error("Todo not found");
    await ctx.db.patch(args.id, { isCompleted: !todo.isCompleted });
  },
});

export const remove = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => ctx.db.delete(args.id),
});
```

That's the entire backend.

## Frontend

`src/main.tsx` — wire up Convex:

```tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>
);
```

`src/App.tsx` — the whole data layer is three lines:

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function App() {
  const todos = useQuery(api.todos.list);        // live subscription
  const addTodo = useMutation(api.todos.add);
  const toggleTodo = useMutation(api.todos.toggle);
  const removeTodo = useMutation(api.todos.remove);

  // ... render todos
}
```

`useQuery` subscribes over a WebSocket. Any change to the database from this popup, another extension instance, or the Convex dashboard re-renders the component instantly. No polling, no manual fetch, no sync logic.

## Run

```bash
npm run dev
```

Load the extension in Chrome: `chrome://extensions/` → Enable Developer mode → Load unpacked → select `dist/`.

![Convex Todo demo](blog/video/demo.gif)

## Takeaway

A Chrome extension popup is just a web page. Convex works in it with zero adapters. Two backend files, three hook calls in the frontend and the extension has a real-time, type-safe, serverless backend.
