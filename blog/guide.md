# Using convex in Chrome extensions
chrome extensions are very powerful tools , They help us customize the browser, automate tasks, and build productivity workflows. When combined with Convex, they become even more powerful by adding a real-time backend with minimal setup.

## Why Convex?

let's say we're building a todo list chrome extension. most chrome extensions that need a backend end up requiring a lot of setup , we need to spin up a server, configure a database, handle authentication, set up real-time sync and all of this before we even start working on the actual extension logic.

this is what a traditional setup would look like for a todo list app:

![Traditional Architecture](./images/traditional-architecture.excalidraw)

we're managing a REST API server, a separate auth service for JWT and sessions, a database with migrations and connection pooling, a WebSocket server for real-time updates, and then all the DevOps — Docker, CI/CD, SSL certs, scaling, monitoring. That's a lot of moving pieces for what might just be a simple extension.

now here's the same extension with Convex:

![Convex Architecture](./images/convex-architecture.excalidraw)

the chrome extension opens a single WebSocket connection to Convex, and everything else right from database, real-time subscriptions, serverless functions, auth, scaling is handled for us.

what we actually end up writing is just two files:

- `schema.ts` — to define our tables
- `todos.ts` — our queries and mutations as plain TypeScript functions

that's it. No server to deploy, no database to provision, no WebSocket plumbing to worry about.

### what makes Convex a good fit for chrome extensions specifically?

**real-time sync just works.** we call `useQuery()` in the popup and it subscribes over a WebSocket automatically. If we change data from the Convex dashboard, another extension instance, or even a web app — the popup updates instantly. We don't write any sync logic ourselves.

**no server to manage.** chrome extensions already run in a pretty constrained environment. Adding a backend server on top means dealing with deployment, uptime, CORS and all that. With Convex we skip all of it — our extension talks directly to the Convex cloud.

**TypeScript end-to-end.** our schema, backend functions, and React frontend all share the same type system. When we call `api.todos.add` in the popup, TypeScript already knows the exact argument shape because it's inferred from the mutation we wrote in `convex/todos.ts`.

**instant iteration.** we run `npx convex dev` and our backend functions hot-reload as we save. Pair that with Vite's HMR for the popup UI and we get sub-second feedback on both frontend and backend changes.

**great for side projects.** most chrome extensions start as personal tools or small utilities. Convex's free tier covers this easily — no idle server costs, no database hosting fees.

## Building the Todo List Extension

let's walk through the entire setup step by step. By the end of this we'll have a working chrome extension with a real-time todo list backed by Convex.

here's what our project structure will look like:

```
convex-chrome-extension-template/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── manifest.json
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   └── vite-env.d.ts
└── convex/
    ├── schema.ts
    └── todos.ts
```

### step 1: project setup

first let's create a new directory and initialize the project.

```bash
mkdir convex-chrome-extension-template
cd convex-chrome-extension-template
npm init -y
git init
```

now install the dependencies we need:

```bash
# our core dependencies
npm install convex react react-dom

# dev dependencies for building the extension
npm install -D vite @vitejs/plugin-react @crxjs/vite-plugin tailwindcss @tailwindcss/vite typescript @types/react @types/react-dom @types/chrome npm-run-all
```

a quick overview of what we're using:
- **convex** — our backend, handles database and real-time sync
- **@crxjs/vite-plugin** — lets us build chrome extensions with Vite and gives us HMR during development
- **tailwindcss + @tailwindcss/vite** — Tailwind v4 with zero-config Vite integration
- **npm-run-all** — runs our Convex backend and Vite frontend dev servers in parallel

we also need to add a few scripts to our `package.json`. Open it up and add these:

```json
"type": "module",
"scripts": {
  "dev": "npm-run-all --parallel dev:backend dev:frontend",
  "dev:frontend": "vite",
  "dev:backend": "convex dev",
  "build": "vite build",
  "build:watch": "vite build --watch"
}
```

the `dev` script is the important one — it runs both Convex and Vite in parallel so we get backend hot-reloading and frontend HMR at the same time.

lastly we need a `vite.config.ts` to wire up our plugins:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
  legacy: {
    skipWebSocketTokenCheck: true,
  },
});
```

the `crx()` plugin reads our manifest and handles all the chrome extension build stuff. the `server.cors` and `legacy` settings are needed because Vite 6 introduced stricter security that breaks chrome extension dev mode — these let the extension talk to the Vite dev server.

### step 2: chrome extension manifest

create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Convex Todo",
  "description": "A real-time todo list powered by Convex",
  "version": "0.0.1",
  "action": {
    "default_popup": "index.html",
    "default_title": "Convex Todo"
  },
  "permissions": ["storage"]
}
```

this is a minimal MV3 manifest. We only need a popup — no background service worker, no content scripts. The `action.default_popup` tells Chrome to show `index.html` when the extension icon is clicked.

### step 3: popup HTML entry

create `index.html` at the project root:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Convex Todo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

and create `src/App.css` for Tailwind and popup sizing:

```css
@import "tailwindcss";

body {
  width: 380px;
  min-height: 500px;
  margin: 0;
}
```

the `width` and `min-height` on body are important — chrome extension popups don't have a default size, so without this our popup would collapse to nothing. 380x500 gives us a nice compact window.

also create `src/vite-env.d.ts` so TypeScript knows about Vite's types:

```ts
/// <reference types="vite/client" />
```

### step 4: set up Convex

this is where the backend comes in. Run:

```bash
npx convex dev
```

this will ask us to log in and create a new Convex project. Once done, it generates a `.env.local` file with our `VITE_CONVEX_URL` — that's the URL our extension will use to connect to Convex.

now create `convex/schema.ts` to define our todos table:

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

just two fields — `text` and `isCompleted`. Convex automatically gives us `_id` and `_creationTime` on every document, so we don't need to define those.

next create `convex/todos.ts` with our backend functions:

```ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("todos").order("desc").collect();
  },
});

export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("todos", {
      text: args.text,
      isCompleted: false,
    });
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
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
```

four functions and that's our entire backend:
- `list` — queries all todos, newest first
- `add` — inserts a new todo with `isCompleted: false`
- `toggle` — flips the `isCompleted` field
- `remove` — deletes a todo

notice how `args` are validated with `v.string()` and `v.id("todos")` — Convex validates these at runtime and generates TypeScript types from them automatically.

### step 5: React popup

create `src/main.tsx` — this is where we connect React to Convex:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./App.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
);
```

we create a `ConvexReactClient` with the URL from our `.env.local` and wrap our app in `ConvexProvider`. This gives every component access to Convex queries and mutations.

now create `src/App.tsx` — the actual todo UI:

```tsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function App() {
  const todos = useQuery(api.todos.list);
  const addTodo = useMutation(api.todos.add);
  const toggleTodo = useMutation(api.todos.toggle);
  const removeTodo = useMutation(api.todos.remove);
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    addTodo({ text });
    setInput("");
  };

  const remaining = todos?.filter((t) => !t.isCompleted).length ?? 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-600 px-4 py-3 text-white">
        <h1 className="text-lg font-semibold">Convex Todo</h1>
      </div>

      {/* Add form */}
      <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-b border-gray-200 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md
            hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </form>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto">
        {todos === undefined ? (
          <p className="text-center text-gray-400 mt-12 text-sm">Loading...</p>
        ) : todos.length === 0 ? (
          <p className="text-center text-gray-400 mt-12 text-sm">
            No todos yet. Add one above!
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {todos.map((todo) => (
              <li
                key={todo._id}
                className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  checked={todo.isCompleted}
                  onChange={() => toggleTodo({ id: todo._id })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600
                    focus:ring-indigo-500 cursor-pointer"
                />
                <span
                  className={`flex-1 text-sm ${
                    todo.isCompleted ? "line-through text-gray-400" : "text-gray-800"
                  }`}
                >
                  {todo.text}
                </span>
                <button
                  onClick={() => removeTodo({ id: todo._id })}
                  className="opacity-0 group-hover:opacity-100 text-gray-400
                    hover:text-red-500 text-lg leading-none transition-opacity"
                  aria-label="Delete todo"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      {todos && todos.length > 0 && (
        <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200 bg-white">
          {remaining} item{remaining !== 1 ? "s" : ""} remaining
        </div>
      )}
    </div>
  );
}
```

the key thing to notice here is how little code we need for a fully real-time app. `useQuery(api.todos.list)` sets up a WebSocket subscription — whenever any todo changes in the database, this component re-renders automatically. The mutations (`addTodo`, `toggleTodo`, `removeTodo`) are just function calls, no fetch requests or error handling boilerplate.

we also handle three states — loading (when `todos` is `undefined`), empty list, and populated list. The delete button is hidden by default and only shows on hover using Tailwind's `group-hover`.

### step 6: run it

now we can start everything up:

```bash
npm run dev
```

this runs `convex dev` and `vite` in parallel. Convex watches our backend files and auto-deploys changes, while Vite serves our popup with hot module replacement.

to load the extension in Chrome:
1. go to `chrome://extensions/`
2. enable "Developer mode" (toggle in the top right)
3. click "Load unpacked" and select the `dist/` folder in our project
4. click the extension icon in the toolbar — our todo popup should open

we should see "No todos yet. Add one above!" — add a few todos, toggle them, delete them. Everything syncs to Convex in real-time.

to really see the real-time sync in action, run `npx convex dashboard` in another terminal. Edit a todo directly in the dashboard and watch it update in the extension popup instantly — no refresh needed.

