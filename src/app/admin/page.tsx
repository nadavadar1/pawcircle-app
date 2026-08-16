import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ApproveWalkerButton, ApproveIdVerificationButton } from "./ApproveButtons";

const ADMIN_EMAIL = "nadavadar1@gmail.com";

export const metadata: Metadata = { title: "ניהול | PawCircle" };

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  const admin = getSupabaseAdminClient();

  const [{ data: pendingWalkers }, { data: pendingIdDocs }, { data: reports }, { data: leads }] = await Promise.all([
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
      .from("area_interest")
      .select("email, areas, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const walkerIds = (pendingWalkers ?? []).map((w) => w.id);
  const reportUserIds = [...new Set((reports ?? []).flatMap((r) => [r.reporter_id, r.reported_id]))];
  const nameLookupIds = [...new Set([...walkerIds, ...reportUserIds])];

  let namesById = new Map<string, string>();
  if (nameLookupIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, full_name").in("id", nameLookupIds);
    namesById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  }

  const idDocSignedUrls = new Map<string, string>();
  for (const doc of pendingIdDocs ?? []) {
    if (!doc.id_document_url) continue;
    const { data } = await admin.storage.from("id-documents").createSignedUrl(doc.id_document_url, 600);
    if (data?.signedUrl) idDocSignedUrls.set(doc.id, data.signedUrl);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-pine">ניהול</h1>

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
                <ApproveWalkerButton walkerId={w.id} />
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
                <p className="text-xs text-ink/50">{new Date(r.created_at).toLocaleString("he-IL")}</p>
              </li>
            ))}
          </ul>
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
