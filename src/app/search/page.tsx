import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CITIES, SPECIALTIES, DOG_SIZES } from "@/lib/constants";

type SearchParams = {
  minPrice?: string;
  maxPrice?: string;
  size?: string;
  area?: string;
  specialty?: string;
};

type WalkerRow = {
  id: string;
  bio: string | null;
  hourly_rate_ils: number;
  service_areas: string[];
  specialties: string[];
};

type ProfileRow = {
  id: string;
  full_name: string;
  photo_url: string | null;
  city: string;
};

type TrustRow = {
  walker_id: string;
  badge_area: string | null;
  is_community_verified: boolean;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from("walker_profiles")
    .select("id, bio, hourly_rate_ils, service_areas, specialties")
    .eq("status", "approved");

  if (params.minPrice) query = query.gte("hourly_rate_ils", Number(params.minPrice));
  if (params.maxPrice) query = query.lte("hourly_rate_ils", Number(params.maxPrice));
  if (params.size) query = query.contains("dog_size_compatibility", [params.size]);
  if (params.area) query = query.contains("service_areas", [params.area]);
  if (params.specialty) query = query.contains("specialties", [params.specialty]);

  const { data: walkers } = await query.returns<WalkerRow[]>();
  const ids = (walkers ?? []).map((w) => w.id);

  let profilesById = new Map<string, ProfileRow>();
  let trustById = new Map<string, TrustRow>();

  if (ids.length > 0) {
    const [{ data: profiles }, { data: trust }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, photo_url, city").in("id", ids).returns<ProfileRow[]>(),
      supabase.from("walker_trust_status").select("*").in("walker_id", ids).returns<TrustRow[]>(),
    ]);
    profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
    trustById = new Map((trust ?? []).map((t) => [t.walker_id, t]));
  }

  const results = (walkers ?? [])
    .map((w) => ({
      walker: w,
      profile: profilesById.get(w.id),
      trust: trustById.get(w.id),
    }))
    .filter((r) => r.profile)
    .sort((a, b) => Number(b.trust?.is_community_verified) - Number(a.trust?.is_community_verified));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-pine">חיפוש מטיילים</h1>

      <form method="get" className="mb-8 grid grid-cols-2 gap-3 rounded border border-line bg-paper-hi p-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-semibold">
          מחיר מ-
          <input type="number" name="minPrice" defaultValue={params.minPrice} className="rounded border border-line bg-paper px-2 py-1.5 font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          עד
          <input type="number" name="maxPrice" defaultValue={params.maxPrice} className="rounded border border-line bg-paper px-2 py-1.5 font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          גודל כלב
          <select name="size" defaultValue={params.size ?? ""} className="rounded border border-line bg-paper px-2 py-1.5 font-normal">
            <option value="">הכל</option>
            {DOG_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          אזור
          <select name="area" defaultValue={params.area ?? ""} className="rounded border border-line bg-paper px-2 py-1.5 font-normal">
            <option value="">הכל</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-xs font-semibold sm:col-span-3">
          התמחות
          <select name="specialty" defaultValue={params.specialty ?? ""} className="rounded border border-line bg-paper px-2 py-1.5 font-normal">
            <option value="">הכל</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="self-end rounded bg-brass px-4 py-1.5 font-bold text-ink">
          סינון
        </button>
      </form>

      {results.length === 0 ? (
        <p className="text-ink/70">אין עדיין מטיילים שתואמים את החיפוש. נסו להרחיב את הסינון.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {results.map(({ walker, profile, trust }) => (
            <li key={walker.id}>
              <Link
                href={`/walkers/${walker.id}`}
                className="block rounded border border-line bg-paper-hi p-4 hover:border-rust"
              >
                <div className="flex items-center justify-between">
                  <span className="font-[var(--font-display)] text-lg font-bold text-ink">
                    {profile!.full_name}
                  </span>
                  <span className="font-[var(--font-mono)] text-sm text-pine">
                    {walker.hourly_rate_ils} ₪/שעה
                  </span>
                </div>
                <p className="text-sm text-ink/70">{profile!.city}</p>
                {trust?.is_community_verified && (
                  <p className="mt-1 text-xs font-bold text-brass-hi">
                    ✓ מאומת קהילתית · {trust.badge_area}
                  </p>
                )}
                {walker.specialties.length > 0 && (
                  <p className="mt-1 text-xs text-ink/60">{walker.specialties.join(" · ")}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
