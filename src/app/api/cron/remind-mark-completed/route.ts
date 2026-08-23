import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// A walk is eligible for the reminder once its scheduled end time is this
// far in the past — long enough that the walk has clearly already happened,
// short enough that it's still fresh for a review.
const GRACE_PERIOD_MS = 3 * 60 * 60 * 1000;

const RESEND_API_URL = "https://api.resend.com/emails";

function reminderEmailHtml(walkerName: string) {
  return `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#17231C;line-height:1.6;max-width:480px;">
<p>היי,</p>
<p>שמנו לב שההליכה עם ${walkerName} כבר הייתה אמורה להסתיים.</p>
<p>אם היא התקיימה, אפשר לסמן אותה כהושלמה ולכתוב ביקורת קצרה — זה עוזר לכל הקהילה: <a href="https://pawcircle-app.vercel.app/my-bookings">pawcircle-app.vercel.app/my-bookings</a></p>
<p>אם משהו השתבש, פשוט השיבו למייל הזה.</p>
<p>נדב<br/>מייסד PawCircle</p>
</div>`;
}

/** Runs daily via Vercel Cron. Finds accepted bookings whose walk time has
 * passed and reminds the owner (once) to mark it completed so the review/
 * trust-badge loop can actually run. */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const admin = getSupabaseAdminClient();

  const [bookingsResult, remindedResult] = await Promise.all([
    admin.from("bookings").select("id, owner_id, walker_id, requested_time, duration_minutes").eq("status", "accepted"),
    admin.from("booking_completion_reminders").select("booking_id"),
  ]);

  // A failed query must never be treated as "zero rows" — see the
  // nudge-stuck-users incident: that silently turned into "nobody has a
  // profile" and false-emailed every registered user. Abort instead of
  // guessing here too.
  const queryError = bookingsResult.error || remindedResult.error;
  if (queryError) {
    return NextResponse.json({ error: "query failed, aborting", detail: queryError.message }, { status: 500 });
  }

  const bookings = bookingsResult.data ?? [];
  const reminded = remindedResult.data ?? [];
  const remindedIds = new Set(reminded.map((r) => r.booking_id));
  const cutoff = Date.now() - GRACE_PERIOD_MS;

  const targets = bookings.filter((b) => {
    const walkEndMs = new Date(b.requested_time).getTime() + b.duration_minutes * 60 * 1000;
    return walkEndMs < cutoff && !remindedIds.has(b.id);
  });

  if (targets.length === 0) {
    return NextResponse.json({ checked: 0, sent: 0, errors: [] });
  }

  const ownerIds = [...new Set(targets.map((b) => b.owner_id))];
  const walkerIds = [...new Set(targets.map((b) => b.walker_id))];
  const [ownerProfilesResult, walkerProfilesResult] = await Promise.all([
    admin.from("profiles").select("id").in("id", ownerIds),
    admin.from("profiles").select("id, full_name").in("id", walkerIds),
  ]);
  if (ownerProfilesResult.error || walkerProfilesResult.error) {
    return NextResponse.json({ error: "profile lookup failed, aborting" }, { status: 500 });
  }
  const walkerNames = new Map(walkerProfilesResult.data.map((w) => [w.id, w.full_name]));

  const { data: authUsersPage, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) {
    return NextResponse.json({ error: "listUsers failed, aborting" }, { status: 500 });
  }
  const emailById = new Map(authUsersPage.users.map((u) => [u.id, u.email]));

  let sent = 0;
  const errors: string[] = [];

  for (const booking of targets) {
    const ownerEmail = emailById.get(booking.owner_id);
    if (!ownerEmail) continue;

    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PawCircle <noreply@getpawcircle.com>",
        to: [ownerEmail],
        reply_to: "nadavadar1@gmail.com",
        subject: "איך הייתה ההליכה? 🐾",
        html: reminderEmailHtml(walkerNames.get(booking.walker_id) ?? "המטייל/ת"),
      }),
    });

    if (res.ok) {
      await admin.from("booking_completion_reminders").insert({ booking_id: booking.id });
      sent++;
    } else {
      errors.push(`${booking.id}: ${res.status} ${await res.text()}`);
    }
  }

  return NextResponse.json({ checked: targets.length, sent, errors });
}
