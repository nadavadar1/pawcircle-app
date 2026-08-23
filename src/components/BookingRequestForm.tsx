"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { DOG_SIZES } from "@/lib/constants";

// Flip to true once the walker_blocked_dates table migration has been run
// against the live database.
const AVAILABILITY_FEATURE_ENABLED = true;

// Flip to true once the push_subscriptions table migration AND the VAPID
// env vars are live.
const PUSH_FEATURE_ENABLED = true;

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

  const [selectedDogIds, setSelectedDogIds] = useState<string[]>([]);
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
  const [autoAccepted, setAutoAccepted] = useState(false);

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
        setSelectedDogIds([preselect]);
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
    setSelectedDogIds((prev) => [...prev, data.id]);
  }

  function toggleDog(id: string) {
    setSelectedDogIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedDogIds.length === 0) {
      setError("בחרו לפחות כלב אחד.");
      return;
    }

    if (AVAILABILITY_FEATURE_ENABLED && blockedDates.has(date)) {
      setError("המטייל/ת לא זמין/ה בתאריך שנבחר. בחרו תאריך אחר.");
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const baseTime = new Date(`${date}T${time}`);
    const occurrences = recurring ? weeks : 1;
    const totalRequests = occurrences * selectedDogIds.length;

    let succeeded = 0;
    let firstBookingId: string | null = null;
    let firstBookingStatus: string | null = null;
    for (let i = 0; i < occurrences; i++) {
      const requestedTime = new Date(baseTime.getTime() + i * 7 * 24 * 60 * 60 * 1000).toISOString();
      // Same slot, one request per selected dog — mirrors the recurring
      // loop above exactly, just looping dogs instead of weeks.
      for (const dogId of selectedDogIds) {
        const { data: rpcData, error: rpcError } = await supabase.rpc("create_booking_request", {
          p_walker_id: walkerId,
          p_dog_id: dogId,
          p_requested_time: requestedTime,
          p_duration_minutes: duration,
          p_owner_message: message || null,
        });
        if (rpcError) {
          setSubmitting(false);
          if (succeeded > 0) {
            setError(`נשלחו ${succeeded} מתוך ${totalRequests} בקשות. הבקשה הבאה נכשלה: ${rpcError.message}`);
          } else {
            setError(rpcError.message);
          }
          return;
        }
        // create_booking_request returns a table (booking_id, booking_status)
        // — supabase-js returns set-returning RPCs as an array of rows.
        const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as
          | { booking_id: string; booking_status: string }
          | undefined;
        if (!firstBookingId) {
          firstBookingId = row?.booking_id ?? null;
          firstBookingStatus = row?.booking_status ?? null;
        }
        succeeded++;
      }
    }

    if (PUSH_FEATURE_ENABLED && firstBookingId) {
      fetch("/api/push/notify-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: firstBookingId,
          event: firstBookingStatus === "accepted" ? "auto_accepted" : "requested",
        }),
      }).catch(() => {});
    }

    setSubmitting(false);
    setSentCount(succeeded);
    setAutoAccepted(firstBookingStatus === "accepted");
    setSent(true);
  }

  if (userId === null) return null; // not logged in — parent handles the login CTA
  if (dogs === null) return null; // still loading

  if (sent) {
    return (
      <p className="rounded bg-brass/20 px-3 py-2 text-sm font-semibold text-pine">
        {autoAccepted
          ? (sentCount > 1 ? `${sentCount} הליכות אושרו אוטומטית!` : "ההליכה אושרה אוטומטית!")
          : (sentCount > 1 ? `${sentCount} בקשות נשלחו!` : "הבקשה נשלחה!")}{" "}
        אפשר לעקוב אחריהן ב
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
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold">לאיזה כלב/ים (אפשר כמה)</legend>
          <div className="flex flex-wrap gap-1.5">
            {dogs.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDog(d.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedDogIds.includes(d.id)
                    ? "border-brass bg-brass text-ink"
                    : "border-line bg-paper text-ink/70 hover:border-brass"
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </fieldset>
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
      <label className="flex flex-col gap-1 text-xs font-semibold">
        מיקום מפגש, פרטים נוספים או כל דבר מיוחד (אופציונלי)
        <textarea
          placeholder="למשל: פינת אבן גבירול/ארלוזורוב, יש לי 2 כלבים, צריך 2 טיולים ביום..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm font-normal"
        />
      </label>
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
        {submitting
          ? "שולח..."
          : recurring || selectedDogIds.length > 1
            ? `שליחת ${(recurring ? weeks : 1) * selectedDogIds.length} בקשות`
            : "שליחת בקשה"}
      </button>
      {error && <p className="text-xs text-rust">{error}</p>}
    </form>
  );
}
