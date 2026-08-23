"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ReviewForm } from "@/components/ReviewForm";
import { Loading } from "@/components/Loading";
import { BookingStatusBadge, statusBorderClass } from "@/components/BookingStatusBadge";
import { BookingStatusTimeline } from "@/components/BookingStatusTimeline";
import { ReportButton } from "@/components/ReportButton";

// Flip to true once the reports table migration has been run against the
// live database.
const REPORT_FEATURE_ENABLED = true;

type Booking = {
  id: string;
  walker_id: string;
  dog_id: string;
  requested_time: string;
  duration_minutes: number;
  status: string;
  price_ils: number | null;
  owner_message: string | null;
  walk_photo_url: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  requested: "ממתין לאישור",
  accepted: "אושר",
  declined: "נדחה",
  cancelled: "בוטל",
  completed: "הושלם",
};

export default function MyBookingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [walkerNames, setWalkerNames] = useState<Map<string, string>>(new Map());
  const [dogNames, setDogNames] = useState<Map<string, string>>(new Map());
  const [contactByBooking, setContactByBooking] = useState<Map<string, string>>(new Map());
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [errorByBooking, setErrorByBooking] = useState<Map<string, string>>(new Map());
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("*")
      .eq("owner_id", userData.user.id)
      .order("requested_time", { ascending: false })
      .returns<Booking[]>();

    setBookings(bookingsData ?? []);

    const walkerIds = [...new Set((bookingsData ?? []).map((b) => b.walker_id))];
    const dogIds = [...new Set((bookingsData ?? []).map((b) => b.dog_id))];

    if (walkerIds.length > 0) {
      const { data: walkers } = await supabase.from("profiles").select("id, full_name").in("id", walkerIds);
      setWalkerNames(new Map((walkers ?? []).map((w) => [w.id, w.full_name])));
    }
    if (dogIds.length > 0) {
      const { data: dogs } = await supabase.from("dogs").select("id, name").in("id", dogIds);
      setDogNames(new Map((dogs ?? []).map((d) => [d.id, d.name])));
    }

    const { data: myReviews } = await supabase
      .from("reviews")
      .select("booking_id")
      .eq("reviewer_id", userData.user.id);
    setReviewedBookingIds(new Set((myReviews ?? []).map((r) => r.booking_id).filter(Boolean)));

    setReady(true);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  function clearBookingError(id: string) {
    setErrorByBooking((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  async function cancelBooking(id: string) {
    setBusyId(id);
    clearBookingError(id);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.rpc("set_booking_status", { p_booking_id: id, p_new_status: "cancelled" });
    setBusyId(null);
    if (error) {
      setErrorByBooking((prev) => new Map(prev).set(id, "הביטול נכשל, נסה שוב."));
      return;
    }
    load();
  }

  async function markCompleted(id: string) {
    setBusyId(id);
    clearBookingError(id);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.rpc("set_booking_status", { p_booking_id: id, p_new_status: "completed" });
    setBusyId(null);
    if (error) {
      setErrorByBooking((prev) => new Map(prev).set(id, "הפעולה נכשלה, נסה שוב."));
      return;
    }
    load();
  }

  async function showContact(id: string) {
    setBusyId(id);
    clearBookingError(id);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("get_contact_info", { p_booking_id: id });
    const row = (data as { owner_phone: string; walker_phone: string }[] | null)?.[0];
    setBusyId(null);
    if (error || !row) {
      setErrorByBooking((prev) => new Map(prev).set(id, "לא הצלחנו להציג את פרטי הקשר, נסה שוב."));
      return;
    }
    setContactByBooking((prev) => new Map(prev).set(id, row.walker_phone));
  }

  if (!ready) return <Loading />;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-pine">ההליכות שלי</h1>

      {bookings.length === 0 ? (
        <p className="text-ink/70">עדיין אין בקשות. אפשר להתחיל מ<a href="/search" className="text-rust underline">חיפוש מטיילים</a>.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((b) => (
            <li className={`rounded border-r-4 border-y border-l border-line bg-paper-hi p-4 ${statusBorderClass(b.status)}`} key={b.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-semibold text-ink">
                  {walkerNames.get(b.walker_id) ?? "מטייל/ת"} · {dogNames.get(b.dog_id) ?? "כלב"}
                </span>
                <BookingStatusBadge status={b.status} label={STATUS_LABEL[b.status] ?? b.status} />
              </div>
              <p className="text-sm text-ink/70">
                {new Date(b.requested_time).toLocaleString("he-IL")} · {b.duration_minutes} דקות
                {b.price_ils ? ` · ${b.price_ils} ₪` : ""}
              </p>
              {b.owner_message && <p className="mt-1 text-sm text-ink/60">&rdquo;{b.owner_message}&rdquo;</p>}
              <BookingStatusTimeline status={b.status} />

              {b.status === "accepted" &&
                new Date(b.requested_time).getTime() + b.duration_minutes * 60 * 1000 < Date.now() && (
                  <p className="mt-2 rounded bg-brass/20 px-3 py-2 text-sm font-semibold text-pine">
                    ההליכה כבר הייתה אמורה להסתיים — התקיימה? סמנו כהושלם ותוכלו לכתוב ביקורת 🐾
                  </p>
                )}

              {b.walk_photo_url && (
                <div className="relative mt-2 h-40 w-full overflow-hidden rounded">
                  <Image src={b.walk_photo_url} alt="" fill sizes="100vw" className="object-cover" />
                </div>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {b.status === "requested" && (
                  <button
                    onClick={() => cancelBooking(b.id)}
                    disabled={busyId === b.id}
                    className="rounded border border-rust px-3 py-1 text-sm text-rust disabled:opacity-60"
                  >
                    ביטול בקשה
                  </button>
                )}
                {b.status === "accepted" && (
                  <>
                    <button
                      onClick={() => showContact(b.id)}
                      disabled={busyId === b.id}
                      className="rounded bg-brass px-3 py-1 text-sm font-bold text-ink disabled:opacity-60"
                    >
                      הצגת פרטי קשר
                    </button>
                    <button
                      onClick={() => markCompleted(b.id)}
                      disabled={busyId === b.id}
                      className="rounded border border-line px-3 py-1 text-sm text-ink"
                    >
                      סימון כהושלם
                    </button>
                  </>
                )}
                {b.status === "completed" && (
                  <Link
                    href={`/walkers/${b.walker_id}?dog=${b.dog_id}`}
                    className="rounded bg-brass px-3 py-1 text-sm font-bold text-ink"
                  >
                    הזמן שוב
                  </Link>
                )}
                {contactByBooking.has(b.id) && (
                  <div className="w-full">
                    <p className="text-sm font-[var(--font-mono)] text-pine" dir="ltr">
                      {contactByBooking.get(b.id)}
                    </p>
                    <p className="mt-1 text-xs text-ink/50">
                      התשלום ישירות בין הצדדים (בד&quot;כ מזומן או ביט בתום ההליכה) — לא דרך האפליקציה.
                    </p>
                  </div>
                )}
                {errorByBooking.has(b.id) && (
                  <p className="w-full text-sm text-rust">{errorByBooking.get(b.id)}</p>
                )}
              </div>

              {b.status === "completed" && (
                reviewedBookingIds.has(b.id) ? (
                  <p className="mt-2 text-sm text-sage">תודה על הביקורת! ✓</p>
                ) : (
                  <ReviewForm
                    walkerId={b.walker_id}
                    bookingId={b.id}
                    onSubmitted={() => setReviewedBookingIds((prev) => new Set(prev).add(b.id))}
                  />
                )
              )}

              {REPORT_FEATURE_ENABLED && (
                <div className="mt-2">
                  <ReportButton reportedId={b.walker_id} bookingId={b.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
