"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function FavoriteButton({ walkerId }: { walkerId: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const { data: row } = await supabase
        .from("favorites")
        .select("id")
        .eq("owner_id", data.user.id)
        .eq("walker_id", walkerId)
        .maybeSingle();
      setFavorited(!!row);
    });
  }, [walkerId]);

  async function toggle() {
    if (!userId) return;
    setBusy(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();

    if (favorited) {
      const { error: delError } = await supabase
        .from("favorites")
        .delete()
        .eq("owner_id", userId)
        .eq("walker_id", walkerId);
      setBusy(false);
      if (delError) {
        setError("הפעולה נכשלה, נסה שוב.");
        return;
      }
      setFavorited(false);
    } else {
      const { error: insError } = await supabase
        .from("favorites")
        .insert({ owner_id: userId, walker_id: walkerId });
      setBusy(false);
      if (insError) {
        setError("הפעולה נכשלה, נסה שוב.");
        return;
      }
      setFavorited(true);
    }
  }

  if (!userId) return null;

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        title={favorited ? "הסרה מהמועדפים" : "הוספה למועדפים"}
        className={`flex items-center gap-1 rounded border px-2.5 py-1 text-sm font-semibold transition-colors disabled:opacity-60 ${
          favorited ? "border-rust bg-rust/10 text-rust" : "border-line text-ink/60 hover:border-rust"
        }`}
      >
        <span aria-hidden="true">{favorited ? "♥" : "♡"}</span>
        {favorited ? "במועדפים" : "הוספה למועדפים"}
      </button>
      {error && <p className="mt-1 text-xs text-rust">{error}</p>}
    </div>
  );
}
