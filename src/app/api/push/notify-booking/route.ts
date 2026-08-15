import { NextResponse } from "next/server";
import webpush from "web-push";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:nadavadar1@gmail.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const MESSAGES: Record<string, { title: string; body: string; url: string }> = {
  requested: { title: "בקשת הליכה חדשה", body: "יש לך בקשת הליכה חדשה ב-PawCircle", url: "/dashboard" },
  accepted: { title: "הבקשה שלך אושרה!", body: "בקשת ההליכה שלך אושרה ב-PawCircle", url: "/my-bookings" },
};

// Called by the client right after create_booking_request/set_booking_status
// succeeds. Re-verifies everything server-side against the actual booking
// row rather than trusting the client's event/bookingId at face value, so a
// caller can only ever trigger a notification about their own booking, to
// the correct counterparty.
export async function POST(request: Request) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "push not configured" }, { status: 501 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not authorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const bookingId: string | undefined = body?.bookingId;
  const event: string | undefined = body?.event;
  const message = event ? MESSAGES[event] : undefined;
  if (!bookingId || !message) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("owner_id, walker_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let recipientId: string;
  if (event === "requested") {
    if (user.id !== booking.owner_id) {
      return NextResponse.json({ error: "not authorized" }, { status: 403 });
    }
    recipientId = booking.walker_id;
  } else {
    if (user.id !== booking.walker_id) {
      return NextResponse.json({ error: "not authorized" }, { status: 403 });
    }
    recipientId = booking.owner_id;
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", recipientId);

  const payload = JSON.stringify(message);
  const staleIds: string[] = [];

  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) staleIds.push(sub.id);
      }
    })
  );

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return NextResponse.json({ ok: true, sent: (subs ?? []).length - staleIds.length });
}
