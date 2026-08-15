"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ReportButton({ reportedId, bookingId }: { reportedId: string; bookingId?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setError("צריך להתחבר כדי לשלוח דיווח.");
      return;
    }
    const { error: insertError } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_id: reportedId,
      booking_id: bookingId ?? null,
      reason: reason.trim(),
    });
    setSubmitting(false);
    if (insertError) {
      setError("השליחה נכשלה, נסה שוב.");
      return;
    }
    setSent(true);
  }

  if (sent) return <p className="text-xs font-semibold text-sage">הדיווח נשלח, נבדוק את זה בהקדם. תודה.</p>;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-ink/50 underline hover:text-rust">
        🚩 דיווח על התנהגות
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-line bg-paper p-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="מה קרה?"
        rows={2}
        className="rounded border border-line bg-paper-hi px-2 py-1.5 text-xs"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !reason.trim()}
          className="rounded bg-rust px-3 py-1 text-xs font-bold text-paper-hi disabled:opacity-60"
        >
          {submitting ? "שולח..." : "שליחת דיווח"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-ink/50">
          ביטול
        </button>
      </div>
      {error && <p className="text-xs text-rust">{error}</p>}
    </div>
  );
}
