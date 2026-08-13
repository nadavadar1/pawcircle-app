"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CITIES, SPECIALTIES, DOG_SIZES } from "@/lib/constants";
import { ChipMultiSelect } from "@/components/ChipMultiSelect";
import { PhotoUpload } from "@/components/PhotoUpload";
import { DogEditor, type Dog } from "@/components/DogEditor";
import { Loading } from "@/components/Loading";

type MyProfile = {
  id: string;
  role: string;
  full_name: string;
  phone: string;
  photo_url: string | null;
  city: string;
};

type WalkerProfile = {
  bio: string | null;
  hourly_rate_ils: number;
  service_areas: string[];
  dog_size_compatibility: string[];
  specialties: string[];
  years_experience: number | null;
  available_now: boolean;
};

export default function ProfileEditPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [walker, setWalker] = useState<WalkerProfile | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState<string>(CITIES[0]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [bio, setBio] = useState("");
  const [rate, setRate] = useState(50);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [dogSizes, setDogSizes] = useState<string[]>([...DOG_SIZES]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [experience, setExperience] = useState<number | "">("");
  const [availableNow, setAvailableNow] = useState(true);
  const [savingWalker, setSavingWalker] = useState(false);
  const [walkerSaved, setWalkerSaved] = useState(false);
  const [walkerError, setWalkerError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const { data: profileRows } = await supabase.rpc("get_my_profile");
    const me = (profileRows as MyProfile[] | null)?.[0];
    if (!me) {
      router.replace("/onboarding");
      return;
    }
    setProfile(me);
    setFullName(me.full_name);
    setPhone(me.phone);
    setCity(me.city);
    setPhotoUrl(me.photo_url);

    if (me.role === "walker" || me.role === "both") {
      const { data: w } = await supabase
        .from("walker_profiles")
        .select("bio, hourly_rate_ils, service_areas, dog_size_compatibility, specialties, years_experience, available_now")
        .eq("id", me.id)
        .maybeSingle();
      if (w) {
        setWalker(w);
        setBio(w.bio ?? "");
        setRate(w.hourly_rate_ils);
        setServiceAreas(w.service_areas);
        setDogSizes(w.dog_size_compatibility);
        setSpecialties(w.specialties);
        setExperience(w.years_experience ?? "");
        setAvailableNow(w.available_now);
      }
    }

    if (me.role === "owner" || me.role === "both") {
      const { data: dogsData } = await supabase
        .from("dogs")
        .select("id, name, breed, size, age_years, special_notes, photo_url")
        .eq("owner_id", me.id);
      setDogs((dogsData as Dog[]) ?? []);
    }

    setReady(true);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    setProfileSaved(false);
    setProfileError(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, city, photo_url: photoUrl })
      .eq("id", profile.id);
    setSavingProfile(false);
    if (error) {
      setProfileError("השמירה נכשלה, נסה שוב.");
      return;
    }
    setProfileSaved(true);
  }

  async function saveWalker(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSavingWalker(true);
    setWalkerSaved(false);
    setWalkerError(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("walker_profiles")
      .update({
        bio: bio || null,
        hourly_rate_ils: rate,
        service_areas: serviceAreas,
        dog_size_compatibility: dogSizes,
        specialties,
        years_experience: experience === "" ? null : experience,
        available_now: availableNow,
      })
      .eq("id", profile.id);
    setSavingWalker(false);
    if (error) {
      setWalkerError("השמירה נכשלה, נסה שוב.");
      return;
    }
    setWalkerSaved(true);
  }

  async function addOwnerRole() {
    if (!profile) return;
    setUpgrading(true);
    setUpgradeError(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("profiles").update({ role: "both" }).eq("id", profile.id);
    setUpgrading(false);
    if (error) {
      setUpgradeError("הוספת ההרשאה נכשלה, נסה שוב.");
      return;
    }
    setProfile({ ...profile, role: "both" });
  }

  async function addWalkerRole() {
    if (!profile) return;
    setUpgrading(true);
    setUpgradeError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: roleError } = await supabase.from("profiles").update({ role: "both" }).eq("id", profile.id);
    if (roleError) {
      setUpgrading(false);
      setUpgradeError("ההרשמה נכשלה, נסה שוב.");
      return;
    }
    const { data: w, error: walkerInsertError } = await supabase
      .from("walker_profiles")
      .insert({
        id: profile.id,
        hourly_rate_ils: 50,
        service_areas: [],
        dog_size_compatibility: [...DOG_SIZES],
        specialties: [],
      })
      .select("bio, hourly_rate_ils, service_areas, dog_size_compatibility, specialties, years_experience, available_now")
      .single();
    setUpgrading(false);
    if (walkerInsertError || !w) {
      setUpgradeError("ההרשמה נכשלה, נסה שוב.");
      return;
    }
    setProfile({ ...profile, role: "both" });
    setWalker(w);
    setRate(w.hourly_rate_ils);
    setServiceAreas(w.service_areas);
    setDogSizes(w.dog_size_compatibility);
    setSpecialties(w.specialties);
    setAvailableNow(w.available_now);
  }

  if (!ready || !profile) return <Loading />;

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-pine">עריכת פרופיל</h1>

      <form onSubmit={saveProfile} className="mb-8 flex flex-col gap-3 rounded border border-line bg-paper-hi p-4">
        <p className="text-sm font-semibold text-pine">פרטים אישיים</p>
        <PhotoUpload bucket="profile-photos" pathPrefix={profile.id} currentUrl={photoUrl} onUploaded={setPhotoUrl} />
        <label className="flex flex-col gap-1 text-xs font-semibold">
          שם מלא
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="rounded border border-line bg-paper px-2 py-1.5 font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          טלפון
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required dir="ltr" className="rounded border border-line bg-paper px-2 py-1.5 font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          שכונה / עיר
          <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded border border-line bg-paper px-2 py-1.5 font-normal">
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={savingProfile} className="self-start rounded bg-brass px-4 py-1.5 text-sm font-bold text-ink disabled:opacity-60">
          {savingProfile ? "שומר..." : "שמירה"}
        </button>
        {profileSaved && <p className="text-xs text-sage">נשמר ✓</p>}
        {profileError && <p className="text-xs text-rust">{profileError}</p>}
      </form>

      {profile.role === "walker" && (
        <div className="mb-8 rounded border border-line bg-paper-hi p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink/80">יש לך גם כלב? אפשר להוסיף כלבים ולבקש הליכות.</p>
            <button
              onClick={addOwnerRole}
              disabled={upgrading}
              className="flex-shrink-0 rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink disabled:opacity-60"
            >
              {upgrading ? "מוסיף..." : "הוספת כלבים לחשבון"}
            </button>
          </div>
          {upgradeError && <p className="mt-2 text-xs text-rust">{upgradeError}</p>}
        </div>
      )}

      {profile.role === "owner" && (
        <div className="mb-8 rounded border border-line bg-paper-hi p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink/80">רוצה גם לטייל כלבים ולהרוויח? אפשר להירשם גם כמטייל/ת.</p>
            <button
              onClick={addWalkerRole}
              disabled={upgrading}
              className="flex-shrink-0 rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink disabled:opacity-60"
            >
              {upgrading ? "מוסיף..." : "הרשמה כמטייל/ת"}
            </button>
          </div>
          {upgradeError && <p className="mt-2 text-xs text-rust">{upgradeError}</p>}
        </div>
      )}

      {walker && (
        <form onSubmit={saveWalker} className="mb-8 flex flex-col gap-3 rounded border border-line bg-paper-hi p-4">
          <p className="text-sm font-semibold text-pine">פרטי מטייל/ת</p>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            קצת עליכם
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="rounded border border-line bg-paper px-2 py-1.5 font-normal" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            תעריף לשעה (₪)
            <input type="number" min={1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="rounded border border-line bg-paper px-2 py-1.5 font-normal" />
          </label>
          <ChipMultiSelect label="אזורי שירות" name="service_areas" options={CITIES} selected={serviceAreas} onChange={setServiceAreas} searchable />
          <ChipMultiSelect label="גדלי כלבים" name="dog_sizes" options={DOG_SIZES} selected={dogSizes} onChange={setDogSizes} />
          <ChipMultiSelect label="התמחויות" name="specialties" options={SPECIALTIES} selected={specialties} onChange={setSpecialties} />
          <label className="flex flex-col gap-1 text-xs font-semibold">
            שנות ניסיון
            <input type="number" min={0} value={experience} onChange={(e) => setExperience(e.target.value === "" ? "" : Number(e.target.value))} className="rounded border border-line bg-paper px-2 py-1.5 font-normal" />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={availableNow} onChange={(e) => setAvailableNow(e.target.checked)} />
            זמין/ה לבקשות חדשות
          </label>
          <button type="submit" disabled={savingWalker} className="self-start rounded bg-brass px-4 py-1.5 text-sm font-bold text-ink disabled:opacity-60">
            {savingWalker ? "שומר..." : "שמירה"}
          </button>
          {walkerSaved && <p className="text-xs text-sage">נשמר ✓</p>}
          {walkerError && <p className="text-xs text-rust">{walkerError}</p>}
        </form>
      )}

      {(profile.role === "owner" || profile.role === "both") && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-pine">הכלבים שלי</p>
          {dogs.map((d) => (
            <DogEditor
              key={d.id}
              ownerId={profile.id}
              dog={d}
              onSaved={(updated) => setDogs((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
            />
          ))}
          <DogEditor
            ownerId={profile.id}
            dog={null}
            onSaved={(created) => setDogs((prev) => [...prev, created])}
          />
        </div>
      )}
    </main>
  );
}
