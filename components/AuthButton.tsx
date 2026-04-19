"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/store/useAuth";
import { useBasket } from "@/store/useBasket";

type Mode = "login" | "signup";

function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const signIn = useAuth((s) => s.signInWithEmail);
  const signUp = useAuth((s) => s.signUpWithEmail);
  const loadFromCloud = useBasket((s) => s.loadFromCloud);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const err =
      mode === "login"
        ? await signIn(email, password)
        : await signUp(email, password);

    setSubmitting(false);

    if (err) {
      setError(err);
    } else {
      if (mode === "login") {
        await loadFromCloud();
      }
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {submitting
              ? "Please wait…"
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button onClick={() => { setMode("signup"); setError(null); }} className="font-medium text-emerald-600 hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(null); }} className="font-medium text-emerald-600 hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export function AuthButton() {
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const initialize = useAuth((s) => s.initialize);
  const signOut = useAuth((s) => s.signOut);
  const loadFromCloud = useBasket((s) => s.loadFromCloud);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    initialize().then(() => {
      loadFromCloud();
    });
  }, [initialize, loadFromCloud]);

  const available = useAuth((s) => s.available);

  if (!available) return null;

  if (loading) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
          {user.email?.[0]?.toUpperCase() ?? "?"}
        </div>
        <button
          onClick={signOut}
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
      >
        Sign in
      </button>
      {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
