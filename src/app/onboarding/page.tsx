"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CITIES, SPECIALTIES, DOG_SIZES } from "@/lib/constants";
import { Loading } from "@/components/Loading";

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
      setCheckingAuth(false);
    });
  }, [router]);

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

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
      <h1 className="mb-1 text-2xl font-bold text-pine">כמה פרטים ומתחילים</h1>
      <p className="mb-6 text-sm text-ink/70">
        זה לוקח דקה. תוכלו לערוך הכל אחר כך.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <fieldset className="flex gap-4">
          <legend className="mb-2 text-sm font-semibold">אני...</legend>
          {(
            [
              ["owner", "בעל/ת כלב"],
              ["walker", "רוצה לטייל"],
              ["both", "שניהם"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>

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

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">אזורי שירות</legend>
              <select
                multiple
                value={serviceAreas}
                onChange={(e) =>
                  setServiceAreas(Array.from(e.target.selectedOptions, (o) => o.value))
                }
                className="h-40 w-full rounded border border-line bg-paper px-3 py-2 font-normal"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink/60">Ctrl/Cmd+לחיצה לבחירה מרובה</p>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">גדלי כלבים שנוח לכם איתם</legend>
              <div className="flex gap-4">
                {DOG_SIZES.map((size) => (
                  <label key={size} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={dogSizes.includes(size)}
                      onChange={() => toggle(dogSizes, size, setDogSizes)}
                    />
                    {size}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">התמחויות (אופציונלי)</legend>
              <div className="flex flex-col gap-1.5">
                {SPECIALTIES.map((s) => (
                  <label key={s} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={specialties.includes(s)}
                      onChange={() => toggle(specialties, s, setSpecialties)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </fieldset>

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
