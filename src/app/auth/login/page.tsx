"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Fetch profile to determine role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role === "admin") {
          router.push("/admin");
        } else if (profile?.role === "builder") {
          router.push("/dashboard/builder");
        } else if (profile?.role === "talent") {
          router.push("/dashboard/talent");
        } else {
          router.push("/dashboard/investor");
        }
      }
    } catch (err: any) {
      console.error("Login exception:", err);
      setError(err?.message || "An unexpected error occurred during login. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0F0F1A] px-6 py-12">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo-icon.png" alt="REACH" className="w-12 h-12 rounded-xl mb-3 shadow-lg shadow-black/50" />
          <h1 className="text-2xl font-bold tracking-wider text-[#F5F3ED] mb-1">
            R<span className="text-[#C9A84C]">EACH</span>
          </h1>
          <p className="text-[#A8A6B8] text-sm">Welcome back</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 text-xs rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[#A8A6B8] text-xs mb-1.5 block">
              Email Address
            </label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
            />
          </div>

          <div>
            <label className="text-[#A8A6B8] text-xs mb-1.5 block">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              placeholder="Your password"
              className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
            />
          </div>

          <button
            type="button"
            onClick={() => router.push("/auth/forgot-password")}
            className="text-[#C9A84C] text-xs text-right hover:underline"
          >
            Forgot password?
          </button>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-medium text-sm py-3 rounded-lg transition ${
              loading
                ? "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
                : "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
            }`}
          >
            {loading ? "Signing in…" : "Log In"}
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const { error: oauthErr } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: `${window.location.origin}/auth/callback` },
                  });
                  if (oauthErr) setError(oauthErr.message);
                } catch (err: any) {
                  setError(err?.message || "Google sign-in failed.");
                } finally {
                  setLoading(false);
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 border border-[#3A3A52] text-[#F5F3ED] text-sm py-3 rounded-lg hover:bg-[#1A1A2E] hover:border-[#C9A84C] transition cursor-pointer disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="text-center text-[#5C5A70] text-xs">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/auth/signup")}
              className="text-[#C9A84C] hover:underline"
            >
              Sign Up
            </button>
          </p>
        </form>
      </div>
    </main>
  );
}