"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0F0F1A] px-6 py-12">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-wider text-[#F5F3ED] mb-1">
            R<span className="text-[#C9A84C]">EACH</span>
          </h1>
          <p className="text-[#A8A6B8] text-sm">Reset your password</p>
        </div>

        {sent ? (
          <div className="flex flex-col gap-4 text-center">
            <div className="bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-sm rounded-xl px-5 py-4">
              ✓ Reset link sent to <strong>{email}</strong>
              <br />
              <span className="text-xs mt-1 block text-emerald-500">
                Check your inbox and click the link to reset your password.
              </span>
            </div>
            <button
              onClick={() => router.push("/auth/login")}
              className="text-[#C9A84C] text-sm hover:underline"
            >
              Back to login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 text-xs rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-medium text-sm py-3 rounded-lg transition ${
                loading
                  ? "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
                  : "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Sending…
                </span>
              ) : "Send reset link"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="flex items-center justify-center gap-2 text-[#5C5A70] text-sm hover:text-[#A8A6B8] transition"
            >
              <ArrowLeft size={14} />
              Back to login
            </button>
          </form>
        )}
      </div>
    </main>
  );
}