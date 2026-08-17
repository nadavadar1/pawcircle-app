import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Confirmed or not, a signed-up user with no profiles row after this long is
// treated as abandoned rather than "still mid-flow" — short enough that a
// real reminder still feels timely, long enough not to nag someone who's
// simply still filling out the onboarding form.
const GRACE_PERIOD_MS = 5 * 1000; // TEMP: shortened for live E2E test, reverted right after

const RESEND_API_URL = "https://api.resend.com/emails";

function nudgeEmailHtml() {
  return `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#17231C;line-height:1.6;max-width:480px;">
<p>היי,</p>
<p>שמנו לב שהתחלת תהליך הרשמה ל-PawCircle (האפליקציה להליכות כלבים) אבל לא הספקת לסיים אותו.</p>
<p>אפשר לחזור ולהשלים תוך דקה: <a href="https://pawcircle-app.vercel.app/login">pawcircle-app.vercel.app</a></p>
<p>אם נתקלת בבעיה כלשהי בדרך, פשוט השיבו למייל הזה ונעזור.</p>
<p>נדב<br/>מייסד PawCircle</p>
</div>`;
}

/** Runs daily via Vercel Cron. Finds confirmed-or-not auth accounts with no
 * matching profile past the grace period, emails each one once via Resend,
 * and records the send so the same person is never nudged twice. */
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

  const [{ data: authUsersPage }, { data: allProfiles }, { data: nudged }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("id"),
    admin.from("stuck_user_nudges").select("user_id"),
  ]);

  const profileIds = new Set((allProfiles ?? []).map((p) => p.id));
  const nudgedIds = new Set((nudged ?? []).map((n) => n.user_id));
  const cutoff = Date.now() - GRACE_PERIOD_MS;

  const targets = (authUsersPage?.users ?? []).filter(
    (u) =>
      u.email &&
      !profileIds.has(u.id) &&
      !nudgedIds.has(u.id) &&
      new Date(u.created_at).getTime() < cutoff
  );

  let sent = 0;
  const errors: string[] = [];

  for (const user of targets) {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PawCircle <noreply@getpawcircle.com>",
        to: [user.email],
        reply_to: "nadavadar1@gmail.com",
        subject: "נשאר לך צעד אחד קטן להצטרפות ל-PawCircle 🐾",
        html: nudgeEmailHtml(),
      }),
    });

    if (res.ok) {
      await admin.from("stuck_user_nudges").insert({ user_id: user.id, email: user.email! });
      sent++;
    } else {
      errors.push(`${user.email}: ${res.status} ${await res.text()}`);
    }
  }

  return NextResponse.json({ checked: targets.length, sent, errors });
}
