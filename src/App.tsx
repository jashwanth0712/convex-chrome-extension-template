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
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </form>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto">
        {todos === undefined ? (
          <p className="text-center text-gray-400 mt-12 text-sm">Loading...</p>
        ) : todos.length === 0 ? (
          <p className="text-center text-gray-400 mt-12 text-sm">No todos yet. Add one above!</p>
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
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span
                  className={`flex-1 text-sm ${todo.isCompleted ? "line-through text-gray-400" : "text-gray-800"}`}
                >
                  {todo.text}
                </span>
                <button
                  onClick={() => removeTodo({ id: todo._id })}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-lg leading-none transition-opacity"
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
