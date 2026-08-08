"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ReviewForm({
  walkerId,
  bookingId,
  onSubmitted,
}: {
  walkerId: string;
  bookingId: string;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [recommendedBy, setRecommendedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { error: rpcError } = await supabase.rpc("submit_review", {
      p_walker_id: walkerId,
      p_rating: rating,
      p_comment: comment,
      p_booking_id: bookingId,
      p_recommended_by_name: recommendedBy || null,
    });

    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onSubmitted();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex w-full flex-col gap-2 rounded border border-line bg-paper p-3">
      <p className="text-sm font-semibold text-pine">איך הייתה ההליכה?</p>
      <div className="flex gap-1 text-xl text-brass-hi" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} כוכבים`}
            className={n <= rating ? "opacity-100" : "opacity-30"}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        required
        placeholder="כמה מילים על ההליכה..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm"
      />
      <input
        placeholder="מי המליץ לך על המטייל/ת? (אופציונלי)"
        value={recommendedBy}
        onChange={(e) => setRecommendedBy(e.target.value)}
        className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink disabled:opacity-60"
      >
        {submitting ? "שולח..." : "שליחת ביקורת"}
      </button>
      {error && <p className="text-xs text-rust">{error}</p>}
    </form>
  );
}
