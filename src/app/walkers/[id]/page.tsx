import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { BookingRequestForm } from "@/components/BookingRequestForm";

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

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/search" className="mb-6 inline-block text-sm text-rust hover:underline">
        ← חזרה לחיפוש
      </Link>

      <div className="mb-6 rounded border border-line bg-paper-hi p-6">
        <div className="mb-2 flex items-start gap-4">
          {profile.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo_url} alt="" className="h-16 w-16 flex-shrink-0 rounded-full object-cover" />
          ) : (
            <div className="h-16 w-16 flex-shrink-0 rounded-full bg-line" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-[var(--font-display)] text-2xl font-bold text-ink">
                {profile.full_name}
              </h1>
              <span className="font-[var(--font-mono)] text-lg text-pine">
                {walker.hourly_rate_ils} ₪/שעה
              </span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-ink/70">{profile.city}</p>
              {trust && trust.review_count > 0 && (
                <p className="text-sm font-bold text-brass-hi">
                  ★ {trust.avg_rating} ({trust.review_count} ביקורות)
                </p>
              )}
            </div>
          </div>
        </div>

        {trust?.is_community_verified && (
          <p className="mb-3 inline-block rounded bg-brass/20 px-2 py-1 text-xs font-bold text-pine">
            ✓ מאומת קהילתית · {trust.badge_area}
          </p>
        )}

        {walker.bio && <p className="mb-3 text-ink/90">{walker.bio}</p>}

        {walker.specialties.length > 0 && (
          <p className="mb-1 text-sm text-ink/70">
            <span className="font-semibold">התמחויות: </span>
            {walker.specialties.join(" · ")}
          </p>
        )}
        {walker.service_areas.length > 0 && (
          <p className="mb-1 text-sm text-ink/70">
            <span className="font-semibold">אזורי שירות: </span>
            {walker.service_areas.join(" · ")}
          </p>
        )}
        {walker.dog_size_compatibility.length > 0 && (
          <p className="mb-1 text-sm text-ink/70">
            <span className="font-semibold">גדלי כלבים: </span>
            {walker.dog_size_compatibility.join(" · ")}
          </p>
        )}
        {typeof walker.years_experience === "number" && (
          <p className="text-sm text-ink/70">
            <span className="font-semibold">שנות ניסיון: </span>
            {walker.years_experience}
          </p>
        )}

        <div className="mt-5">
          {user?.id === walker.id ? (
            <p className="text-sm text-ink/60">
              זה הפרופיל הציבורי שלך.{" "}
              <Link href="/profile/edit" className="text-rust underline">
                לעריכה
              </Link>
            </p>
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
