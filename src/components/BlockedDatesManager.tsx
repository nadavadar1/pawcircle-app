"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function BlockedDatesManager({ walkerId }: { walkerId: string }) {
  const [dates, setDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("walker_blocked_dates")
      .select("blocked_date")
      .eq("walker_id", walkerId)
      .order("blocked_date")
      .then(({ data }) => setDates((data ?? []).map((d) => d.blocked_date)));
  }, [walkerId]);

  async function addDate() {
    if (!newDate) return;
    setError(null);
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    const { error: insertError } = await supabase
      .from("walker_blocked_dates")
      .insert({ walker_id: walkerId, blocked_date: newDate });
    setSaving(false);
    if (insertError) {
      setError(dates.includes(newDate) ? "התאריך כבר חסום." : "החסימה נכשלה, נסה שוב.");
      return;
    }
    setDates((prev) => [...prev, newDate].sort());
    setNewDate("");
  }

  async function removeDate(d: string) {
    const supabase = getSupabaseBrowserClient();
    const { error: deleteError } = await supabase
      .from("walker_blocked_dates")
      .delete()
      .eq("walker_id", walkerId)
      .eq("blocked_date", d);
    if (!deleteError) setDates((prev) => prev.filter((x) => x !== d));
  }

  return (
    <div className="mb-8 rounded border border-line bg-paper-hi p-4">
      <p className="mb-1 text-sm font-semibold text-pine">תאריכים חסומים</p>
      <p className="mb-3 text-xs text-ink/60">
        חסמו ימים שבהם אתם לא זמינים (חופשה, עומס וכו&apos;) — בעלי כלבים לא יוכלו לבקש הליכה בתאריכים אלו.
      </p>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className="rounded border border-line bg-paper px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={addDate}
          disabled={saving || !newDate}
          className="flex-shrink-0 rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink disabled:opacity-60"
        >
          {saving ? "חוסם..." : "חסימת תאריך"}
        </button>
      </div>
      {error && <p className="mb-2 text-xs text-rust">{error}</p>}
      {dates.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {dates.map((d) => (
            <li key={d} className="flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-xs text-ink/80">
              {d}
              <button type="button" onClick={() => removeDate(d)} className="text-rust" aria-label="ביטול חסימה">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
