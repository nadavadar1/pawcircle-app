"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <main className="mx-auto max-w-sm px-6 py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold text-pine">בדקו את המייל</h1>
        <p className="text-ink/80">
          שלחנו קישור התחברות ל-{email}. לוחצים על הקישור ונכנסים ישר לחשבון.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold text-pine">התחברות</h1>
      <p className="mb-6 text-sm text-ink/70">
        מזינים מייל ומקבלים קישור התחברות. בלי סיסמה.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded border border-line bg-paper px-3 py-2"
          dir="ltr"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded bg-brass px-4 py-2 font-bold text-ink disabled:opacity-60"
        >
          {status === "sending" ? "שולח..." : "שליחת קישור התחברות"}
        </button>
        {status === "error" && (
          <p className="text-sm text-rust">משהו השתבש, נסו שוב.</p>
        )}
      </form>
    </main>
  );
}
