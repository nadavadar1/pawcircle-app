"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { DOG_SIZES } from "@/lib/constants";

// Flip to true once the walker_blocked_dates table migration has been run
// against the live database.
const AVAILABILITY_FEATURE_ENABLED = false;

type Dog = { id: string; name: string; size: string };

export function BookingRequestForm({
  walkerId,
  hourlyRate,
}: {
  walkerId: string;
  hourlyRate: number;
}) {
  const searchParams = useSearchParams();
  const rebookDogId = searchParams.get("dog");

  const [userId, setUserId] = useState<string | null>(null);
  const [dogs, setDogs] = useState<Dog[] | null>(null);

  const [dogName, setDogName] = useState("");
  const [dogSize, setDogSize] = useState<string>(DOG_SIZES[0]);
  const [addingDog, setAddingDog] = useState(false);

  const [dogId, setDogId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(30);
  const [message, setMessage] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [weeks, setWeeks] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sentCount, setSentCount] = useState(1);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const { data: dogsData } = await supabase
        .from("dogs")
        .select("id, name, size")
        .eq("owner_id", data.user.id);
      setDogs(dogsData ?? []);
      if (dogsData && dogsData.length > 0) {
        const preselect = rebookDogId && dogsData.some((d) => d.id === rebookDogId) ? rebookDogId : dogsData[0].id;
        setDogId(preselect);
      }
    });
  }, [rebookDogId]);

  useEffect(() => {
    if (!AVAILABILITY_FEATURE_ENABLED) return;
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("walker_blocked_dates")
      .select("blocked_date")
      .eq("walker_id", walkerId)
      .then(({ data }) => setBlockedDates(new Set((data ?? []).map((d) => d.blocked_date))));
  }, [walkerId]);

  async function handleAddDog(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setAddingDog(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data, error: insertError } = await supabase
      .from("dogs")
      .insert({ owner_id: userId, name: dogName, size: dogSize })
      .select("id, name, size")
      .single();
    setAddingDog(false);
    if (insertError || !data) {
      setError(insertError?.message ?? "שגיאה בהוספת הכלב");
      return;
    }
    setDogs((prev) => [...(prev ?? []), data]);
    setDogId(data.id);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (AVAILABILITY_FEATURE_ENABLED && blockedDates.has(date)) {
      setError("המטייל/ת לא זמין/ה בתאריך שנבחר. בחרו תאריך אחר.");
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const baseTime = new Date(`${date}T${time}`);
    const occurrences = recurring ? weeks : 1;

    let succeeded = 0;
    for (let i = 0; i < occurrences; i++) {
      const requestedTime = new Date(baseTime.getTime() + i * 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: rpcError } = await supabase.rpc("create_booking_request", {
        p_walker_id: walkerId,
        p_dog_id: dogId,
        p_requested_time: requestedTime,
        p_duration_minutes: duration,
        p_owner_message: message || null,
      });
      if (rpcError) {
        setSubmitting(false);
        if (succeeded > 0) {
          setError(`נשלחו ${succeeded} מתוך ${occurrences} בקשות. הבקשה הבאה נכשלה: ${rpcError.message}`);
        } else {
          setError(rpcError.message);
        }
        return;
      }
      succeeded++;
    }

    setSubmitting(false);
    setSentCount(succeeded);
    setSent(true);
  }

  if (userId === null) return null; // not logged in — parent handles the login CTA
  if (dogs === null) return null; // still loading

  if (sent) {
    return (
      <p className="rounded bg-brass/20 px-3 py-2 text-sm font-semibold text-pine">
        {sentCount > 1 ? `${sentCount} בקשות נשלחו!` : "הבקשה נשלחה!"} אפשר לעקוב אחריהן ב
        <a href="/my-bookings" className="underline">
          ההליכות שלי
        </a>
        .
      </p>
    );
  }

  if (dogs.length === 0) {
    return (
      <form onSubmit={handleAddDog} className="flex flex-col gap-2 rounded border border-line bg-paper p-3">
        <p className="text-sm font-semibold text-pine">קודם צריך להוסיף כלב</p>
        <input
          required
          placeholder="שם הכלב"
          value={dogName}
          onChange={(e) => setDogName(e.target.value)}
          className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm"
        />
        <select
          value={dogSize}
          onChange={(e) => setDogSize(e.target.value)}
          className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm"
        >
          {DOG_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={addingDog}
          className="rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink disabled:opacity-60"
        >
          {addingDog ? "מוסיף..." : "הוספת כלב"}
        </button>
        {error && <p className="text-xs text-rust">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded border border-line bg-paper p-3">
      <p className="text-sm font-semibold text-pine">בקשת הליכה</p>
      {dogs.length > 1 && (
        <select value={dogId} onChange={(e) => setDogId(e.target.value)} className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm">
          {dogs.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 rounded border border-line bg-paper-hi px-2 py-1.5 text-sm" />
        <input required type="time" value={time} onChange={(e) => setTime(e.target.value)} className="flex-1 rounded border border-line bg-paper-hi px-2 py-1.5 text-sm" />
      </div>
      {AVAILABILITY_FEATURE_ENABLED && date && blockedDates.has(date) && (
        <p className="text-xs text-rust">המטייל/ת לא זמין/ה בתאריך זה.</p>
      )}
      <label className="flex items-center gap-2 text-sm">
        משך:
        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm">
          <option value={30}>30 דקות</option>
          <option value={60}>60 דקות</option>
          <option value={90}>90 דקות</option>
        </select>
        <span className="text-ink/60">
          (≈{Math.round((hourlyRate * duration) / 60)} ₪)
        </span>
      </label>
      <textarea
        placeholder="הודעה קצרה למטייל/ת (אופציונלי)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
        הליכה קבועה (כל שבוע, באותו יום ושעה)
      </label>
      {recurring && (
        <label className="flex items-center gap-2 text-sm">
          למשך:
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm">
            {[2, 3, 4, 6, 8].map((w) => (
              <option key={w} value={w}>{w} שבועות</option>
            ))}
          </select>
        </label>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink disabled:opacity-60"
      >
        {submitting ? "שולח..." : recurring ? `שליחת ${weeks} בקשות` : "שליחת בקשה"}
      </button>
      {error && <p className="text-xs text-rust">{error}</p>}
    </form>
  );
}
