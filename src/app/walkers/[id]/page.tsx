import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { BookingRequestForm } from "@/components/BookingRequestForm";
import { FavoriteButton } from "@/components/FavoriteButton";

// Flip to true once the favorites table migration has been run against
// the live database.
const FAVORITES_FEATURE_ENABLED = false;

const AVATAR_COLORS = ["bg-pine", "bg-rust", "bg-brass", "bg-sage"];

function avatarColorFor(name: string) {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const [{ data: walker }, { data: profile }, { data: trust }] = await Promise.all([
    supabase.from("walker_profiles").select("hourly_rate_ils, status").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("full_name, city").eq("id", id).maybeSingle(),
    supabase.from("walker_trust_status").select("is_community_verified, badge_area").eq("walker_id", id).maybeSingle(),
  ]);

  if (!walker || !profile || walker.status !== "approved") {
    return { title: "מטייל/ת לא נמצא/ה | PawCircle" };
  }

  const title = `${profile.full_name} · מטייל/ת ב${profile.city} | PawCircle`;
  const description = trust?.is_community_verified
    ? `${walker.hourly_rate_ils} ₪/שעה · מאומת/ת קהילתית ב${trust.badge_area} · הזמנת הליכה עם מטייל/ת עם שם אמיתי, לא רק כוכביות.`
    : `${walker.hourly_rate_ils} ₪/שעה · הזמנת הליכה עם מטייל/ת עם שם אמיתי, לא רק כוכביות.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function WalkerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const [{ data: walker }, { data: profile }, { data: trust }, { data: reviews }] =
    await Promise.all([
      supabase.from("walker_profiles").select("*").eq("id", id).eq("status", "approved").maybeSingle(),
      supabase.from("profiles").select("id, full_name, photo_url, city").eq("id", id).maybeSingle(),
      supabase.from("walker_trust_status").select("*").eq("walker_id", id).maybeSingle(),
      supabase.from("reviews").select("*").eq("walker_id", id).order("created_at", { ascending: false }),
    ]);

  if (!walker || !profile) notFound();

  const reviewerIds = [...new Set((reviews ?? []).map((r) => r.reviewer_id))];
  let reviewersById = new Map<string, { full_name: string }>();
  if (reviewerIds.length > 0) {
    const { data: reviewers } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", reviewerIds);
    reviewersById = new Map((reviewers ?? []).map((r) => [r.id, { full_name: r.full_name }]));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerRole: string | null = null;
  if (user && user.id !== walker.id) {
    const { data: viewerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    viewerRole = viewerProfile?.role ?? null;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/search" className="mb-6 inline-block text-sm text-rust hover:underline">
        ← חזרה לחיפוש
      </Link>

      <div className="mb-6 overflow-hidden rounded-lg border border-line bg-paper-hi">
        <div className="h-2 bg-pine" />
        <div className="p-6">
          <div className="mb-3 flex items-start gap-4">
            {profile.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photo_url}
                alt=""
                className="h-20 w-20 flex-shrink-0 rounded-full object-cover ring-2 ring-brass"
              />
            ) : (
              <div
                className={`flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full ring-2 ring-brass ${avatarColorFor(profile.full_name)}`}
              >
                <span className="font-[var(--font-display)] text-2xl font-bold text-paper-hi">
                  {profile.full_name.charAt(0)}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="flex items-center gap-1.5 font-[var(--font-display)] text-2xl font-bold text-ink">
                  {profile.full_name}
                  {walker.available_now && (
                    <span title="זמין/ה עכשיו" className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-sage" />
                  )}
                </h1>
                <span className="rounded-full bg-brass px-3 py-1 font-[var(--font-mono)] text-sm font-bold text-ink">
                  {walker.hourly_rate_ils} ₪/שעה
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm text-ink/70">{profile.city}</p>
                {walker.available_now && <p className="text-xs font-semibold text-sage">זמין/ה עכשיו</p>}
                {trust && trust.review_count > 0 && (
                  <p className="text-sm font-bold text-brass-hi">
                    ★ {trust.avg_rating} ({trust.review_count} ביקורות)
                  </p>
                )}
              </div>
            </div>
          </div>

          {trust?.is_community_verified ? (
            <p className="mb-3 inline-block rounded bg-brass/20 px-2 py-1 text-xs font-bold text-pine">
              ✓ מאומת קהילתית · {trust.badge_area}
            </p>
          ) : (
            <p className="mb-3 inline-block rounded bg-line px-2 py-1 text-xs font-semibold text-ink/60">
              מטייל/ת חדש/ה ב-PawCircle
            </p>
          )}

          {walker.bio && <p className="mb-4 text-ink/90">{walker.bio}</p>}

          <dl className="mb-1 grid grid-cols-1 gap-x-4 gap-y-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
            {walker.specialties.length > 0 && (
              <div>
                <dt className="font-semibold text-ink/80">התמחויות</dt>
                <dd className="text-ink/70">{walker.specialties.join(" · ")}</dd>
              </div>
            )}
            {walker.service_areas.length > 0 && (
              <div>
                <dt className="font-semibold text-ink/80">אזורי שירות</dt>
                <dd className="text-ink/70">{walker.service_areas.join(" · ")}</dd>
              </div>
            )}
            {walker.dog_size_compatibility.length > 0 && (
              <div>
                <dt className="font-semibold text-ink/80">גדלי כלבים</dt>
                <dd className="text-ink/70">{walker.dog_size_compatibility.join(" · ")}</dd>
              </div>
            )}
            {typeof walker.years_experience === "number" && (
              <div>
                <dt className="font-semibold text-ink/80">שנות ניסיון</dt>
                <dd className="text-ink/70">{walker.years_experience}</dd>
              </div>
            )}
          </dl>

        {FAVORITES_FEATURE_ENABLED && user && user.id !== walker.id && (
          <div className="mt-4">
            <FavoriteButton walkerId={walker.id} />
          </div>
        )}

        <div className="mt-5">
          {user?.id === walker.id ? (
            <p className="text-sm text-ink/60">
              זה הפרופיל הציבורי שלך.{" "}
              <Link href="/profile/edit" className="text-rust underline">
                לעריכה
              </Link>
            </p>
          ) : user && viewerRole === "walker" ? (
            <p className="text-sm text-ink/60">רק בעלי כלבים יכולים לבקש הליכה.</p>
          ) : user ? (
            <BookingRequestForm walkerId={walker.id} hourlyRate={walker.hourly_rate_ils} />
          ) : (
            <Link
              href="/login"
              className="inline-block rounded bg-brass px-4 py-2 font-bold text-ink"
            >
              להתחברות כדי לבקש הליכה
            </Link>
          )}
        </div>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-bold text-pine">ביקורות</h2>
      {!reviews || reviews.length === 0 ? (
        <p className="text-sm text-ink/60">עדיין אין ביקורות.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded border border-line bg-paper-hi p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-ink">
                  {reviewersById.get(r.reviewer_id)?.full_name ?? "משתמש/ת"}
                </span>
                <span className="text-xs text-ink/60">{r.reviewer_neighborhood}</span>
              </div>
              <p className="mb-1 text-sm text-brass-hi">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
              <p className="text-sm text-ink/90">{r.comment}</p>
              {r.recommended_by_name && (
                <p className="mt-1 text-xs text-ink/60">ממליץ/ה: {r.recommended_by_name}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
