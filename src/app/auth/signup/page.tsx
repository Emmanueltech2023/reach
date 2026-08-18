"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [referralCode, setReferralCode] = useState(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("ref") || ""
      : ""
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check username is unique
      const checkRes = await fetch("/api/profile/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username }),
      });
      const { taken } = await checkRes.json();

      if (taken) {  
        setError("Username already taken. Please choose another.");
        setLoading(false);
        return;
      }

      // Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Use service role API route to bypass RLS timing issue
        const res = await fetch("/api/profile/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.user.id,
            updates: {
              username: form.username,
              phone: form.phone,
              full_name: form.fullName,
            },
          }),
        });

        if (!res.ok) {
          const resData = await res.json();
          throw new Error(resData.error || "Profile update failed");
        }

        // Claim referral code if present
        if (referralCode.trim() && data.user) {
          fetch("/api/referrals/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              referralCode: referralCode.trim(),
              newUserId: data.user.id,
            }),
          }).catch(() => {}); // non-blocking
        }

        router.push("/auth/role");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0F0F1A] px-6 py-12">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-wider text-[#F5F3ED] mb-1">
            R<span className="text-[#C9A84C]">EACH</span>
          </h1>
          <p className="text-[#A8A6B8] text-sm">Create your account</p>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-8 rounded-full ${
                  s === 1 ? "bg-[#C9A84C]" : "bg-[#3A3A52]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 text-xs rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[#A8A6B8] text-xs mb-1.5 block">
              Full Name
            </label>
            <input
              name="fullName"
              type="text"
              required
              value={form.fullName}
              onChange={handleChange}
              placeholder="e.g. Adewale Okonkwo"
              className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
            />
          </div>

          <div>
            <label className="text-[#A8A6B8] text-xs mb-1.5 block">
              Username
            </label>
            <input
              name="username"
              type="text"
              required
              value={form.username}
              onChange={handleChange}
              placeholder="e.g. adewale_inv"
              className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
            />
          </div>

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
              minLength={8}
              value={form.password}
              onChange={handleChange}
              placeholder="Min. 8 characters"
              className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
            />
          </div>
          
          <div>
            <label className="text-[#A8A6B8] text-xs mb-1.5 block">
              Referral code (optional)
            </label>
            <input
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="e.g. IVST1234"
              className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70] font-mono uppercase tracking-wider"
              maxLength={8}
            />
          </div>

          <div>
            <label className="text-[#A8A6B8] text-xs mb-1.5 block">
              Phone Number
            </label>
            <input
              name="phone"
              type="tel"
              required
              value={form.phone}
              onChange={handleChange}
              placeholder="+234 800 000 0000"
              className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-[#3A3A52]" />
            <span className="text-[#5C5A70] text-xs">or continue with</span>
            <div className="flex-1 h-px bg-[#3A3A52]" />
          </div>

          {/* OAuth */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: `${location.origin}/auth/role` },
                });
              }}
              className="flex-1 flex items-center justify-center gap-2 border border-[#3A3A52] text-[#F5F3ED] text-sm py-3 rounded-lg hover:bg-[#1A1A2E] transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signInWithOAuth({
                  provider: "apple",
                  options: { redirectTo: `${location.origin}/auth/role` },
                });
              }}
              className="flex-1 flex items-center justify-center gap-2 border border-[#3A3A52] text-[#F5F3ED] text-sm py-3 rounded-lg hover:bg-[#1A1A2E] transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.18 1.27-2.16 3.8.03 3.02 2.65 4.03 2.68 4.04l-.07.28zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Apple
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-medium text-sm py-3 rounded-lg transition mt-2 ${
              loading
                ? "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
                : "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
            }`}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>

          <p className="text-center text-[#5C5A70] text-xs">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="text-[#C9A84C] hover:underline"
            >
              Log In
            </button>
          </p>
        </form>
      </div>
    </main>
  );
}