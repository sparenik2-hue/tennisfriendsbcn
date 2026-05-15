"use client";

import { useAuth } from "@/lib/auth";
import { useState } from "react";

export default function LoginPage() {
  const { login, signup, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      const code = err.code || "";
      if (code === "auth/user-not-found") setError("No account found with this email");
      else if (code === "auth/wrong-password") setError("Wrong password");
      else if (code === "auth/invalid-credential") setError("Invalid email or password");
      else if (code === "auth/email-already-in-use") setError("An account with this email already exists");
      else if (code === "auth/weak-password") setError("Password must be at least 6 characters");
      else setError(err.message || "Something went wrong");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await resetPassword(email);
      setMessage("Password reset email sent! Check your inbox.");
      setTimeout(() => setShowReset(false), 3000);
    } catch (err: any) {
      const code = err.code || "";
      if (code === "auth/user-not-found") setError("No account found with this email");
      else setError(err.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎾</div>
          <h1 className="text-3xl font-bold text-gray-800">TennisFriendsBCN</h1>
          <p className="text-gray-500 mt-1">BCN tennis crew rankings</p>
        </div>

        {showReset ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-gray-600">Enter your email and we'll send you a link to reset your password.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="you@example.com"
                required
              />
            </div>

            {message && (
              <p className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-lg">{message}</p>
            )}
            {error && (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              Send Reset Link
            </button>

            <p className="text-center text-sm text-gray-500">
              <button
                onClick={() => { setShowReset(false); setError(""); setMessage(""); }}
                className="text-emerald-600 hover:text-emerald-800 font-medium"
              >
                Back to Sign In
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {isSignup ? "Create Account" : "Sign In"}
            </button>
          </form>
        )}

        {!showReset && (
          <>
            {!isSignup && (
              <p className="text-center mt-3 text-sm">
                <button
                  onClick={() => setShowReset(true)}
                  className="text-gray-400 hover:text-emerald-600"
                >
                  Forgot password?
                </button>
              </p>
            )}

            <p className="text-center mt-4 text-sm text-gray-500">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => { setIsSignup(!isSignup); setError(""); }}
                className="text-emerald-600 hover:text-emerald-800 font-medium"
              >
                {isSignup ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
