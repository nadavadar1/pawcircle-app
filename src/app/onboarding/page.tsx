"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CITIES, SPECIALTIES, DOG_SIZES } from "@/lib/constants";
import { Loading } from "@/components/Loading";
import { ChipMultiSelect } from "@/components/ChipMultiSelect";

type Role = "owner" | "walker" | "both";

export default function OnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState<Role>("owner");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState<string>(CITIES[0]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFromGoogle, setPhotoFromGoogle] = useState(false);

  // walker-only fields
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number>(50);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [dogSizes, setDogSizes] = useState<string[]>([...DOG_SIZES]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState<number | "">("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);

      // Google sign-in fills these in on the auth user automatically —
      // prefill the form so returning-via-Google users barely have to type.
      const meta = data.user.user_metadata ?? {};
      const googleName = meta.full_name ?? meta.name;
      const googlePhoto = meta.avatar_url ?? meta.picture;
      if (googleName) setFullName(googleName);
      if (googlePhoto) {
        setPhotoUrl(googlePhoto);
        setPhotoFromGoogle(true);
      }

      setCheckingAuth(false);
    });
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      role,
      full_name: fullName,
      phone,
      city,
      photo_url: photoUrl,
    });

    if (profileError) {
      setError(profileError.message);
      setSubmitting(false);
      return;
    }

    if (role === "walker" || role === "both") {
      const { error: walkerError } = await supabase.from("walker_profiles").insert({
        id: userId,
        bio: bio || null,
        hourly_rate_ils: hourlyRate,
        service_areas: serviceAreas,
        dog_size_compatibility: dogSizes,
        specialties,
        years_experience: yearsExperience === "" ? null : yearsExperience,
      });

      if (walkerError) {
        setError(walkerError.message);
        setSubmitting(false);
        return;
      }
    }

    router.push(role === "owner" ? "/search" : "/dashboard");
  }

  if (checkingAuth) return <Loading />;

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <div className="mb-6 rounded-lg bg-pine px-6 py-6 text-center text-paper-hi">
        <p className="font-[var(--font-mono)] text-xs tracking-wide text-brass-hi" dir="ltr">
          PAWCIRCLE
        </p>
        <h1 className="mt-1 font-[var(--font-display)] text-xl font-black">כמה פרטים ומתחילים</h1>
        <p className="mt-1 text-sm text-paper-hi/80">זה לוקח דקה. תוכלו לערוך הכל אחר כך.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-lg border border-line bg-paper-hi p-6">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-pine">אני...</legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["owner", "בעל/ת כלב"],
                ["walker", "רוצה לטייל"],
                ["both", "שניהם"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={`rounded border px-2 py-2.5 text-sm font-semibold transition-colors ${
                  role === value
                    ? "border-brass bg-brass text-ink"
                    : "border-line bg-paper text-ink/70 hover:border-rust"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {photoUrl && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            {photoFromGoogle && (
              <p className="text-xs text-ink/60">תמונה ושם מולאו מהחשבון שלך ב-Google</p>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm font-semibold">
          שם מלא
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded border border-line bg-paper px-3 py-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          טלפון
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded border border-line bg-paper px-3 py-2 font-normal"
            dir="ltr"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          שכונה / עיר
          <select
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded border border-line bg-paper px-3 py-2 font-normal"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {(role === "walker" || role === "both") && (
          <>
            <hr className="border-line" />
            <p className="text-sm font-semibold text-pine">פרטי מטייל/ת</p>

            <label className="flex flex-col gap-1 text-sm font-semibold">
              קצת עליכם (אופציונלי)
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="rounded border border-line bg-paper px-3 py-2 font-normal"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold">
              תעריף לשעה (₪)
              <input
                required
                type="number"
                min={1}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="rounded border border-line bg-paper px-3 py-2 font-normal"
              />
            </label>

            <ChipMultiSelect label="אזורי שירות (אפשר כמה)" name="service_areas" options={CITIES} selected={serviceAreas} onChange={setServiceAreas} searchable />
            <ChipMultiSelect label="גדלי כלבים שנוח לכם איתם" name="dog_sizes" options={DOG_SIZES} selected={dogSizes} onChange={setDogSizes} />
            <ChipMultiSelect label="התמחויות (אופציונלי)" name="specialties" options={SPECIALTIES} selected={specialties} onChange={setSpecialties} />

            <label className="flex flex-col gap-1 text-sm font-semibold">
              שנות ניסיון (אופציונלי)
              <input
                type="number"
                min={0}
                value={yearsExperience}
                onChange={(e) =>
                  setYearsExperience(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="rounded border border-line bg-paper px-3 py-2 font-normal"
              />
            </label>
          </>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-brass px-4 py-2 font-bold text-ink disabled:opacity-60"
        >
          {submitting ? "שומר..." : "סיום"}
        </button>
        {error && <p className="text-sm text-rust">{error}</p>}
      </form>
    </main>
  );
}
