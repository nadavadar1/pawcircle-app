import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// A request left unanswered this long risks the whole first-impression: a
// stranger's very first signal about whether this walker is reliable is how
// fast they respond to the initial ask.
const GRACE_PERIOD_MS = 18 * 60 * 60 * 1000;

const RESEND_API_URL = "https://api.resend.com/emails";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:nadavadar1@gmail.com";
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

function reminderEmailHtml(ownerName: string) {
  return `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#17231C;line-height:1.6;max-width:480px;">
<p>היי,</p>
<p>יש לך בקשת הליכה מ-${ownerName} שעדיין מחכה לתשובה שלך.</p>
<p>תגובה מהירה עוזרת המון לבניית אמון עם בעלי כלבים חדשים: <a href="https://pawcircle-app.vercel.app/dashboard">pawcircle-app.vercel.app/dashboard</a></p>
<p>נדב<br/>מייסד PawCircle</p>
</div>`;
}

/** Runs daily via Vercel Cron. Finds booking requests that have sat with no
 * walker response past the grace period and nudges the walker once, via
 * push and email, so a slow first response doesn't quietly kill a stranger's
 * trust before it starts. */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  const [bookingsResult, remindedResult] = await Promise.all([
    admin.from("bookings").select("id, owner_id, walker_id, created_at").eq("status", "requested"),
    admin.from("booking_response_reminders").select("booking_id"),
  ]);

  // Same lesson as the other two crons: a failed query is never "zero rows".
  const queryError = bookingsResult.error || remindedResult.error;
  if (queryError) {
    return NextResponse.json({ error: "query failed, aborting", detail: queryError.message }, { status: 500 });
  }

  const bookings = bookingsResult.data ?? [];
  const reminded = remindedResult.data ?? [];
  const remindedIds = new Set(reminded.map((r) => r.booking_id));
  const cutoff = Date.now() - GRACE_PERIOD_MS;

  const targets = bookings.filter(
    (b) => new Date(b.created_at).getTime() < cutoff && !remindedIds.has(b.id)
  );

  if (targets.length === 0) {
    return NextResponse.json({ checked: 0, sent: 0, errors: [] });
  }

  const ownerIds = [...new Set(targets.map((b) => b.owner_id))];
  const walkerIds = [...new Set(targets.map((b) => b.walker_id))];
  const [ownerProfilesResult, walkerIdsCheckResult] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", ownerIds),
    admin.from("profiles").select("id").in("id", walkerIds),
  ]);
  if (ownerProfilesResult.error || walkerIdsCheckResult.error) {
    return NextResponse.json({ error: "profile lookup failed, aborting" }, { status: 500 });
  }
  const ownerNames = new Map(ownerProfilesResult.data.map((o) => [o.id, o.full_name]));

  let emailById = new Map<string, string | undefined>();
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    const { data: authUsersPage, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) {
      return NextResponse.json({ error: "listUsers failed, aborting" }, { status: 500 });
    }
    emailById = new Map(authUsersPage.users.map((u) => [u.id, u.email]));
  }

  let sent = 0;
  const errors: string[] = [];

  for (const booking of targets) {
    let pushed = false;
    let emailed = false;

    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", booking.walker_id);
      const payload = JSON.stringify({
        title: "בקשת הליכה מחכה לתשובה",
        body: "יש לך בקשת הליכה שעדיין לא ענית עליה ב-PawCircle",
        url: "/dashboard",
      });
      const staleIds: string[] = [];
      await Promise.all(
        (subs ?? []).map(async (sub) => {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
            pushed = true;
          } catch (err) {
            const statusCode = (err as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) staleIds.push(sub.id);
          }
        })
      );
      if (staleIds.length > 0) {
        await admin.from("push_subscriptions").delete().in("id", staleIds);
      }
    }

    const walkerEmail = emailById.get(booking.walker_id);
    if (resendApiKey && walkerEmail) {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "PawCircle <noreply@getpawcircle.com>",
          to: [walkerEmail],
          reply_to: "nadavadar1@gmail.com",
          subject: "בקשת הליכה מחכה לתשובה שלך 🐾",
          html: reminderEmailHtml(ownerNames.get(booking.owner_id) ?? "בעל/ת כלב"),
        }),
      });
      if (res.ok) {
        emailed = true;
      } else {
        errors.push(`${booking.id}: email ${res.status} ${await res.text()}`);
      }
    }

    if (pushed || emailed) {
      await admin.from("booking_response_reminders").insert({ booking_id: booking.id });
      sent++;
    }
  }

  return NextResponse.json({ checked: targets.length, sent, errors });
}
