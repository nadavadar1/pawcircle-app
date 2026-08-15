"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AreaInterestForm({ areas, filtersUsed }: { areas: string[]; filtersUsed: string }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: insertError } = await supabase.from("area_interest").insert({
      email,
      areas,
      filters_used: filtersUsed || null,
    });
    setSubmitting(false);
    if (insertError) {
      setError("משהו השתבש, נסו שוב.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="rounded bg-brass/20 px-3 py-2 text-sm font-semibold text-pine">
        תודה! נודיע לכם ברגע שיהיה מטייל/ת מתאימ/ה.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded border border-line bg-paper-hi p-4">
      <p className="text-sm font-semibold text-pine">עדיין אין מטיילים שתואמים? נודיע לכם</p>
      <p className="text-xs text-ink/60">נשלח לכם מייל ברגע שמטייל/ת מתאימ/ה מצטרפ/ת לאזור שלכם.</p>
      <div className="flex gap-2">
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          dir="ltr"
          className="flex-1 rounded border border-line bg-paper px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex-shrink-0 rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink disabled:opacity-60"
        >
          {submitting ? "שולח..." : "עדכנו אותי"}
        </button>
      </div>
      {error && <p className="text-xs text-rust">{error}</p>}
    </form>
  );
}
