import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  PendingWalkerActions,
  ApproveIdVerificationButton,
  SuspendWalkerButton,
  ResolveSupportMessageButton,
} from "./ApproveButtons";

const ADMIN_EMAIL = "nadavadar1@gmail.com";

export const metadata: Metadata = { title: "ניהול | PawCircle" };
// Every stat here (pending walkers, stuck users, reports...) must reflect the
// current moment, never a cached snapshot — an admin checking this page
// mid-signup-wave needs live numbers.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  const admin = getSupabaseAdminClient();

  const [
    { data: pendingWalkers },
    { data: pendingIdDocs },
    { data: reports },
    { data: supportMessages },
    { data: leads },
    { count: approvedWalkersCount },
    { count: ownersCount },
    { count: bookingsCount },
    { count: completedBookingsCount },
    { count: reviewsCount },
  ] = await Promise.all([
    admin
      .from("walker_profiles")
      .select("id, bio, hourly_rate_ils, service_areas, created_at")
      .eq("status", "pending_review")
      .order("created_at", { ascending: true }),
    admin
      .from("profiles")
      .select("id, full_name, id_document_url")
      .not("id_document_url", "is", null)
      .eq("id_verified", false),
    admin
      .from("reports")
      .select("id, reporter_id, reported_id, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("support_messages")
      .select("id, user_id, message, created_at")
      .eq("resolved", false)
      .order("created_at", { ascending: false }),
    admin
      .from("area_interest")
      .select("email, areas, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    admin.from("walker_profiles").select("id", { count: "exact", head: true }).eq("status", "approved"),
    admin.from("profiles").select("id", { count: "exact", head: true }).in("role", ["owner", "both"]),
    admin.from("bookings").select("id", { count: "exact", head: true }),
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed"),
    admin.from("reviews").select("id", { count: "exact", head: true }),
  ]);

  const walkerIds = (pendingWalkers ?? []).map((w) => w.id);
  const reportUserIds = [...new Set((reports ?? []).flatMap((r) => [r.reporter_id, r.reported_id]))];
  const supportUserIds = [...new Set((supportMessages ?? []).map((m) => m.user_id))];
  const nameLookupIds = [...new Set([...walkerIds, ...reportUserIds, ...supportUserIds])];

  let namesById = new Map<string, string>();
  if (nameLookupIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, full_name").in("id", nameLookupIds);
    namesById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  }

  let approvedWalkerIds = new Set<string>();
  if (reportUserIds.length > 0) {
    const { data: walkerStatuses } = await admin
      .from("walker_profiles")
      .select("id, status")
      .in("id", reportUserIds)
      .eq("status", "approved");
    approvedWalkerIds = new Set((walkerStatuses ?? []).map((w) => w.id));
  }

  const idDocSignedUrls = new Map<string, string>();
  for (const doc of pendingIdDocs ?? []) {
    if (!doc.id_document_url) continue;
    const { data } = await admin.storage.from("id-documents").createSignedUrl(doc.id_document_url, 600);
    if (data?.signedUrl) idDocSignedUrls.set(doc.id, data.signedUrl);
  }

  // Confirmed auth accounts with no matching profiles row: people who
  // verified their email/Google sign-in but never made it through
  // onboarding — e.g. the emailRedirectTo bug that stranded users before
  // the /onboarding safety-net redirect existed.
  const [{ data: authUsersPage }, { data: allProfiles }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("id"),
  ]);
  const profileIdSet = new Set((allProfiles ?? []).map((p) => p.id));
  const stuckUsers = (authUsersPage?.users ?? [])
    .filter((u) => u.email_confirmed_at && !profileIdSet.has(u.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-pine">ניהול</h1>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "מטיילים מאושרים", value: approvedWalkersCount ?? 0 },
          { label: "בעלי כלבים", value: ownersCount ?? 0 },
          { label: "בקשות הליכה", value: bookingsCount ?? 0 },
          { label: "הליכות שהושלמו", value: completedBookingsCount ?? 0 },
          { label: "ביקורות", value: reviewsCount ?? 0 },
        ].map((s) => (
          <div key={s.label} className="rounded border border-line bg-paper-hi p-3 text-center">
            <p className="font-[var(--font-mono)] text-2xl font-bold text-pine">{s.value}</p>
            <p className="text-xs text-ink/60">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-pine">
          מטיילים ממתינים לאישור {pendingWalkers && pendingWalkers.length > 0 && `(${pendingWalkers.length})`}
        </h2>
        {!pendingWalkers || pendingWalkers.length === 0 ? (
          <p className="text-sm text-ink/60">אין בקשות ממתינות.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendingWalkers.map((w) => (
              <li key={w.id} className="rounded border border-line bg-paper-hi p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{namesById.get(w.id) ?? "—"}</span>
                  <span className="font-[var(--font-mono)] text-sm text-pine">{w.hourly_rate_ils} ₪/שעה</span>
                </div>
                {w.bio && <p className="mb-1 text-sm text-ink/70">{w.bio}</p>}
                <p className="mb-2 text-xs text-ink/60">{(w.service_areas ?? []).join(" · ")}</p>
                <PendingWalkerActions walkerId={w.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-pine">
          אימות זהות ממתין {pendingIdDocs && pendingIdDocs.length > 0 && `(${pendingIdDocs.length})`}
        </h2>
        {!pendingIdDocs || pendingIdDocs.length === 0 ? (
          <p className="text-sm text-ink/60">אין מסמכים ממתינים.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendingIdDocs.map((d) => (
              <li key={d.id} className="rounded border border-line bg-paper-hi p-4">
                <p className="mb-2 font-semibold text-ink">{d.full_name}</p>
                {idDocSignedUrls.has(d.id) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={idDocSignedUrls.get(d.id)}
                    alt=""
                    className="mb-2 max-h-64 rounded border border-line object-contain"
                  />
                )}
                <ApproveIdVerificationButton userId={d.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-pine">דיווחים אחרונים</h2>
        {!reports || reports.length === 0 ? (
          <p className="text-sm text-ink/60">אין דיווחים.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded border border-rust/30 bg-rust/5 p-4">
                <p className="mb-1 text-sm">
                  <span className="font-semibold text-ink">{namesById.get(r.reporter_id) ?? "—"}</span>
                  {" דיווח/ה על "}
                  <span className="font-semibold text-ink">{namesById.get(r.reported_id) ?? "—"}</span>
                </p>
                <p className="mb-1 text-sm text-ink/80">{r.reason}</p>
                <p className="mb-2 text-xs text-ink/50">{new Date(r.created_at).toLocaleString("he-IL")}</p>
                {approvedWalkerIds.has(r.reported_id) && <SuspendWalkerButton walkerId={r.reported_id} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-pine">
          פניות תמיכה {supportMessages && supportMessages.length > 0 && `(${supportMessages.length})`}
        </h2>
        {!supportMessages || supportMessages.length === 0 ? (
          <p className="text-sm text-ink/60">אין פניות פתוחות.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {supportMessages.map((m) => (
              <li key={m.id} className="rounded border border-rust/30 bg-rust/5 p-4">
                <p className="mb-1 text-sm font-semibold text-ink">{namesById.get(m.user_id) ?? "—"}</p>
                <p className="mb-2 whitespace-pre-wrap text-sm text-ink/80">{m.message}</p>
                <p className="mb-2 text-xs text-ink/50">{new Date(m.created_at).toLocaleString("he-IL")}</p>
                <ResolveSupportMessageButton messageId={m.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-pine">
          משתמשים תקועים {stuckUsers.length > 0 && `(${stuckUsers.length})`}
        </h2>
        {stuckUsers.length === 0 ? (
          <p className="text-sm text-ink/60">אין משתמשים תקועים כרגע — כולם עם חשבון מאומת השלימו רישום פרופיל.</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-ink/60">
              אימתו מייל/Google אבל אף פעם לא השלימו את הפרופיל. שווה לפנות אליהם ישירות.
            </p>
            <ul className="flex flex-col gap-2">
              {stuckUsers.map((u) => (
                <li key={u.id} className="rounded border border-rust/30 bg-rust/5 p-3 text-sm">
                  <span className="font-semibold text-ink" dir="ltr">{u.email}</span>
                  <span className="mr-2 text-xs text-ink/40">
                    נרשמ/ה {new Date(u.created_at).toLocaleDateString("he-IL")}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-pine">לידים מ&quot;נודיע לכם&quot;</h2>
        {!leads || leads.length === 0 ? (
          <p className="text-sm text-ink/60">אין לידים עדיין.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {leads.map((l, i) => (
              <li key={i} className="rounded border border-line bg-paper-hi p-3 text-sm">
                <span className="font-semibold text-ink" dir="ltr">{l.email}</span>
                {" · "}
                <span className="text-ink/70">{(l.areas ?? []).join(", ") || "ללא סינון אזור"}</span>
                <span className="mr-2 text-xs text-ink/40">{new Date(l.created_at).toLocaleDateString("he-IL")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
