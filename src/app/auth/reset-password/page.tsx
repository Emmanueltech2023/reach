"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => router.push("/auth/login"), 2000);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0F0F1A] px-6 py-12">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo-icon.png" alt="REACH" className="w-12 h-12 rounded-xl mb-3 shadow-lg shadow-black/50" />
          <h1 className="text-2xl font-bold tracking-wider text-[#F5F3ED] mb-1">
            R<span className="text-[#C9A84C]">EACH</span>
          </h1>
          <p className="text-[#A8A6B8] text-sm">Set a new password</p>
        </div>

        {done ? (
          <div className="bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-sm rounded-xl px-5 py-4 text-center">
            ✓ Password updated. Redirecting to login…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 text-xs rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
              />
            </div>

            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Confirm Password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
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
                  <Loader2 size={14} className="animate-spin" /> Updating…
                </span>
              ) : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}