import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CITIES, SPECIALTIES, DOG_SIZES } from "@/lib/constants";
import { ChipMultiSelect } from "@/components/ChipMultiSelect";

type SearchParams = {
  minPrice?: string;
  maxPrice?: string;
  size?: string | string[];
  area?: string | string[];
  specialty?: string | string[];
};

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

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
  review_count: number;
  avg_rating: number | null;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const sizes = toArray(params.size);
  const areas = toArray(params.area);
  const specialties = toArray(params.specialty);

  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from("walker_profiles")
    .select("id, bio, hourly_rate_ils, service_areas, specialties")
    .eq("status", "approved");

  if (params.minPrice) query = query.gte("hourly_rate_ils", Number(params.minPrice));
  if (params.maxPrice) query = query.lte("hourly_rate_ils", Number(params.maxPrice));
  if (sizes.length > 0) query = query.overlaps("dog_size_compatibility", sizes);
  if (areas.length > 0) query = query.overlaps("service_areas", areas);
  if (specialties.length > 0) query = query.overlaps("specialties", specialties);

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
    .sort((a, b) => {
      const verifiedDiff = Number(b.trust?.is_community_verified) - Number(a.trust?.is_community_verified);
      if (verifiedDiff !== 0) return verifiedDiff;
      return (b.trust?.avg_rating ?? 0) - (a.trust?.avg_rating ?? 0);
    });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-pine">חיפוש מטיילים</h1>

      <form method="get" className="mb-8 flex flex-col gap-4 rounded border border-line bg-paper-hi p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            מחיר מ-
            <input type="number" name="minPrice" defaultValue={params.minPrice} className="rounded border border-line bg-paper px-2 py-1.5 font-normal" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            עד
            <input type="number" name="maxPrice" defaultValue={params.maxPrice} className="rounded border border-line bg-paper px-2 py-1.5 font-normal" />
          </label>
        </div>

        <ChipMultiSelect label="גודל כלב (אפשר כמה)" name="size" options={DOG_SIZES} selected={sizes} />
        <ChipMultiSelect label="אזור (אפשר כמה)" name="area" options={CITIES} selected={areas} />
        <ChipMultiSelect label="התמחות (אפשר כמה)" name="specialty" options={SPECIALTIES} selected={specialties} />

        <button type="submit" className="self-start rounded bg-brass px-4 py-1.5 text-sm font-bold text-ink">
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
                className="flex items-center gap-3 rounded border border-line bg-paper-hi p-4 hover:border-rust"
              >
                {profile!.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile!.photo_url} alt="" className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-line" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-[var(--font-display)] text-lg font-bold text-ink">
                      {profile!.full_name}
                    </span>
                    <span className="font-[var(--font-mono)] text-sm text-pine">
                      {walker.hourly_rate_ils} ₪/שעה
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-ink/70">{profile!.city}</p>
                    {trust && trust.review_count > 0 && (
                      <p className="text-sm font-bold text-brass-hi">
                        ★ {trust.avg_rating} ({trust.review_count})
                      </p>
                    )}
                  </div>
                  {trust?.is_community_verified && (
                    <p className="mt-1 text-xs font-bold text-pine">
                      ✓ מאומת קהילתית · {trust.badge_area}
                    </p>
                  )}
                  {walker.specialties.length > 0 && (
                    <p className="mt-1 text-xs text-ink/60">{walker.specialties.join(" · ")}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
