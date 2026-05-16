"use client";

import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { ArrowRight, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const { login, signup, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);
    try {
      if (isSignup) await signup(email, password);
      else await login(email, password);
    } catch (err: any) {
      const code = err.code || "";
      if (code === "auth/user-not-found") setError("No account with this email");
      else if (code === "auth/wrong-password") setError("Wrong password");
      else if (code === "auth/invalid-credential") setError("Invalid email or password");
      else if (code === "auth/email-already-in-use") setError("Email already in use");
      else if (code === "auth/weak-password") setError("Password must be at least 6 characters");
      else setError(err.message || "Something went wrong");
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);
    try {
      await resetPassword(email);
      setMessage("Reset link sent — check your inbox.");
      setTimeout(() => setShowReset(false), 3000);
    } catch (err: any) {
      setError(err.code === "auth/user-not-found" ? "No account with this email" : err.message || "Something went wrong");
    } finally { setLoading(false); }
  };

  const inputClass = "w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-gray-50/50 placeholder:text-gray-300 transition-all";

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #012318 0%, #022c22 30%, #064e3b 65%, #065f46 100%)" }}
    >
      {/* Court-line SVG pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="court" x="0" y="0" width="480" height="320" patternUnits="userSpaceOnUse">
            <rect x="24" y="24" width="432" height="272" fill="none" stroke="white" strokeWidth="2.5"/>
            <line x1="240" y1="24" x2="240" y2="296" stroke="white" strokeWidth="1.5"/>
            <line x1="24" y1="160" x2="456" y2="160" stroke="white" strokeWidth="1.5"/>
            <rect x="84" y="80" width="312" height="160" fill="none" stroke="white" strokeWidth="1.5"/>
            <line x1="240" y1="80" x2="240" y2="240" stroke="white" strokeWidth="1"/>
            <circle cx="240" cy="160" r="18" fill="none" stroke="white" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#court)"/>
      </svg>

      {/* Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(16,185,129,0.12)_0%,transparent_70%)]" />

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl border border-white/15 bg-white/10 backdrop-blur-md mb-4 shadow-lg">
            <span className="text-4xl">🎾</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">TennisFriendsBCN</h1>
          <p className="text-emerald-400 mt-1.5 text-sm font-medium tracking-wide">Barcelona tennis crew rankings</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-white/10">
          {showReset ? (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Reset password</h2>
              <p className="text-sm text-gray-400 mb-6">Enter your email and we'll send a link.</p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className={inputClass} placeholder="you@example.com" required />
                </div>
                {message && <p className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-xl border border-emerald-100">{message}</p>}
                {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-200">
                  {loading ? "Sending…" : <><span>Send Reset Link</span><ArrowRight className="w-4 h-4" /></>}
                </button>
                <button type="button" onClick={() => { setShowReset(false); setError(""); setMessage(""); }}
                  className="w-full text-sm text-gray-400 hover:text-emerald-600 py-2 transition-colors">
                  ← Back to sign in
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                {isSignup ? "Create account" : "Welcome back"}
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                {isSignup ? "Join the BCN tennis crew." : "Sign in to see the rankings."}
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className={inputClass} placeholder="you@example.com" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className={inputClass} placeholder="••••••••" minLength={6} required />
                  </div>
                </div>
                {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-200 mt-2">
                  {loading ? "Please wait…" : <><span>{isSignup ? "Create Account" : "Sign In"}</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
              {!isSignup && (
                <button onClick={() => setShowReset(true)}
                  className="block text-center w-full mt-4 text-sm text-gray-300 hover:text-emerald-600 transition-colors">
                  Forgot password?
                </button>
              )}
              <div className="mt-5 pt-5 border-t border-gray-100 text-center text-sm text-gray-400">
                {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                <button onClick={() => { setIsSignup(!isSignup); setError(""); }}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                  {isSignup ? "Sign In" : "Sign Up"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
