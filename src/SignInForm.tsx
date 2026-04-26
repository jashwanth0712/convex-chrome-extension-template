import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export default function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", flow);
      await signIn("password", formData);
    } catch {
      setError(
        flow === "signUp"
          ? "Could not create account. Try a different email."
          : "Invalid email or password.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-indigo-600 px-4 py-3 text-white">
        <h1 className="text-lg font-semibold">Convex Todo</h1>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 text-center">
            {flow === "signIn" ? "Sign In" : "Create Account"}
          </h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md
              hover:bg-indigo-700 disabled:opacity-40"
          >
            {loading ? "..." : flow === "signIn" ? "Sign In" : "Sign Up"}
          </button>
          <p className="text-xs text-center text-gray-500">
            {flow === "signIn" ? "No account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setFlow(flow === "signIn" ? "signUp" : "signIn");
                setError("");
              }}
              className="text-indigo-600 hover:underline"
            >
              {flow === "signIn" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
