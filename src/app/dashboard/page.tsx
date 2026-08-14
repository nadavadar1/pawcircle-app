"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Loading } from "@/components/Loading";
import { BookingStatusBadge, statusBorderClass } from "@/components/BookingStatusBadge";
import { BookingStatusTimeline } from "@/components/BookingStatusTimeline";
import { WalkPhotoUpload } from "@/components/WalkPhotoUpload";

// Flip to true once the walk_photo_url / set_walk_photo / walk-photos
// migration has been run against the live database.
const WALK_PHOTO_FEATURE_ENABLED = true;

type Booking = {
  id: string;
  owner_id: string;
  dog_id: string;
  requested_time: string;
  duration_minutes: number;
  status: string;
  price_ils: number | null;
  owner_message: string | null;
  walk_photo_url: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  requested: "ממתין לתשובה שלך",
  accepted: "אושר",
  declined: "נדחה",
  cancelled: "בוטל ע\"י הבעלים",
  completed: "הושלם",
};

type TrustStatus = {
  badge_area: string | null;
  distinct_reviewers: number;
  is_community_verified: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isWalker, setIsWalker] = useState(false);
  const [availableNow, setAvailableNow] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ownerNames, setOwnerNames] = useState<Map<string, string>>(new Map());
  const [dogNames, setDogNames] = useState<Map<string, string>>(new Map());
  const [contactByBooking, setContactByBooking] = useState<Map<string, string>>(new Map());
  const [errorByBooking, setErrorByBooking] = useState<Map<string, string>>(new Map());
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [trust, setTrust] = useState<TrustStatus | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const { data: walkerProfile } = await supabase
      .from("walker_profiles")
      .select("available_now")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!walkerProfile) {
      setIsWalker(false);
      setReady(true);
      return;
    }
    setIsWalker(true);
    setAvailableNow(walkerProfile.available_now);

    const { data: trustData } = await supabase
      .from("walker_trust_status")
      .select("badge_area, distinct_reviewers, is_community_verified")
      .eq("walker_id", userData.user.id)
      .maybeSingle();
    setTrust(trustData ?? { badge_area: null, distinct_reviewers: 0, is_community_verified: false });

    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("*")
      .eq("walker_id", userData.user.id)
      .order("requested_time", { ascending: false })
      .returns<Booking[]>();

    setBookings(bookingsData ?? []);

    const ownerIds = [...new Set((bookingsData ?? []).map((b) => b.owner_id))];
    const dogIds = [...new Set((bookingsData ?? []).map((b) => b.dog_id))];

    if (ownerIds.length > 0) {
      const { data: owners } = await supabase.from("profiles").select("id, full_name").in("id", ownerIds);
      setOwnerNames(new Map((owners ?? []).map((o) => [o.id, o.full_name])));
    }
    if (dogIds.length > 0) {
      const { data: dogs } = await supabase.from("dogs").select("id, name").in("id", dogIds);
      setDogNames(new Map((dogs ?? []).map((d) => [d.id, d.name])));
    }

    setReady(true);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleAvailable() {
    const supabase = getSupabaseBrowserClient();
    const next = !availableNow;
    setAvailableNow(next);
    setAvailabilityError(null);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase
      .from("walker_profiles")
      .update({ available_now: next })
      .eq("id", userData.user.id);
    if (error) {
      setAvailableNow(!next);
      setAvailabilityError("העדכון נכשל, נסה שוב.");
    }
  }

  async function respond(id: string, status: "accepted" | "declined") {
    setBusyId(id);
    setErrorByBooking((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.rpc("set_booking_status", { p_booking_id: id, p_new_status: status });
    setBusyId(null);
    if (error) {
      setErrorByBooking((prev) => new Map(prev).set(id, "הפעולה נכשלה, נסה שוב."));
      return;
    }
    load();
  }

  async function showContact(id: string) {
    setBusyId(id);
    setErrorByBooking((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("get_contact_info", { p_booking_id: id });
    const row = (data as { owner_phone: string; walker_phone: string }[] | null)?.[0];
    setBusyId(null);
    if (error || !row) {
      setErrorByBooking((prev) => new Map(prev).set(id, "לא הצלחנו להציג את פרטי הקשר, נסה שוב."));
      return;
    }
    setContactByBooking((prev) => new Map(prev).set(id, row.owner_phone));
  }

  if (!ready) return <Loading />;

  if (!isWalker) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold text-pine">לוח הבקשות</h1>
        <p className="text-ink/70">המסך הזה מיועד למטיילים. בעלי כלבים רואים את הבקשות שלהם ב-<a href="/my-bookings" className="text-rust underline">ההליכות שלי</a>.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-pine">לוח הבקשות שלך</h1>
        <label className="flex items-center gap-2 text-sm font-semibold">
          זמין/ה לבקשות חדשות
          <input type="checkbox" checked={availableNow} onChange={toggleAvailable} />
        </label>
      </div>
      {availabilityError && <p className="mb-4 text-sm text-rust">{availabilityError}</p>}

      {trust && (
        <div className="mb-6 rounded-lg border border-line bg-paper-hi p-4">
          {trust.is_community_verified ? (
            <p className="text-sm font-bold text-pine">✓ מאומת/ת קהילתית · {trust.badge_area}</p>
          ) : (
            <>
              <p className="mb-2 text-sm font-semibold text-ink">
                {trust.distinct_reviewers === 0
                  ? "עדיין אין ביקורות. 3 ביקורות מאותה שכונה מזכות בתג מאומת קהילתית ✓"
                  : `עוד ${3 - trust.distinct_reviewers} ${3 - trust.distinct_reviewers === 1 ? "ביקורת" : "ביקורות"} מ${trust.badge_area} עד תג מאומת קהילתית ✓`}
              </p>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full ${i < trust.distinct_reviewers ? "bg-brass" : "bg-line"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {bookings.length === 0 ? (
        <p className="text-ink/70">עדיין אין בקשות הליכה.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((b) => (
            <li className={`rounded border-r-4 border-y border-l border-line bg-paper-hi p-4 ${statusBorderClass(b.status)}`} key={b.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-semibold text-ink">
                  {ownerNames.get(b.owner_id) ?? "בעל/ת כלב"} · {dogNames.get(b.dog_id) ?? "כלב"}
                </span>
                <BookingStatusBadge status={b.status} label={STATUS_LABEL[b.status] ?? b.status} />
              </div>
              <p className="text-sm text-ink/70">
                {new Date(b.requested_time).toLocaleString("he-IL")} · {b.duration_minutes} דקות
                {b.price_ils ? ` · ${b.price_ils} ₪` : ""}
              </p>
              {b.owner_message && <p className="mt-1 text-sm text-ink/60">&rdquo;{b.owner_message}&rdquo;</p>}
              <BookingStatusTimeline status={b.status} />

              <div className="mt-2 flex flex-wrap gap-2">
                {b.status === "requested" && (
                  <>
                    <button
                      onClick={() => respond(b.id, "accepted")}
                      disabled={busyId === b.id}
                      className="rounded bg-brass px-3 py-1 text-sm font-bold text-ink disabled:opacity-60"
                    >
                      אישור
                    </button>
                    <button
                      onClick={() => respond(b.id, "declined")}
                      disabled={busyId === b.id}
                      className="rounded border border-rust px-3 py-1 text-sm text-rust disabled:opacity-60"
                    >
                      דחייה
                    </button>
                  </>
                )}
                {(b.status === "accepted" || b.status === "completed") && (
                  <button
                    onClick={() => showContact(b.id)}
                    disabled={busyId === b.id}
                    className="rounded bg-brass px-3 py-1 text-sm font-bold text-ink disabled:opacity-60"
                  >
                    הצגת פרטי קשר
                  </button>
                )}
                {contactByBooking.has(b.id) && (
                  <p className="w-full text-sm font-[var(--font-mono)] text-pine" dir="ltr">
                    {contactByBooking.get(b.id)}
                  </p>
                )}
                {errorByBooking.has(b.id) && (
                  <p className="w-full text-sm text-rust">{errorByBooking.get(b.id)}</p>
                )}
              </div>

              {WALK_PHOTO_FEATURE_ENABLED && (b.status === "accepted" || b.status === "completed") && (
                <WalkPhotoUpload
                  bookingId={b.id}
                  currentUrl={b.walk_photo_url}
                  onUploaded={(url) =>
                    setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, walk_photo_url: url } : x)))
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
