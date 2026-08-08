"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { DOG_SIZES } from "@/lib/constants";
import { PhotoUpload } from "@/components/PhotoUpload";

export type Dog = {
  id: string;
  name: string;
  breed: string | null;
  size: string;
  age_years: number | null;
  special_notes: string | null;
  photo_url: string | null;
};

export function DogEditor({
  ownerId,
  dog,
  onSaved,
}: {
  ownerId: string;
  dog: Dog | null;
  onSaved: (dog: Dog) => void;
}) {
  const [name, setName] = useState(dog?.name ?? "");
  const [breed, setBreed] = useState(dog?.breed ?? "");
  const [size, setSize] = useState(dog?.size ?? DOG_SIZES[0]);
  const [age, setAge] = useState<number | "">(dog?.age_years ?? "");
  const [notes, setNotes] = useState(dog?.special_notes ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(dog?.photo_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const payload = {
      owner_id: ownerId,
      name,
      breed: breed || null,
      size,
      age_years: age === "" ? null : age,
      special_notes: notes || null,
      photo_url: photoUrl,
    };

    const query = dog
      ? supabase.from("dogs").update(payload).eq("id", dog.id).select().single()
      : supabase.from("dogs").insert(payload).select().single();

    const { data, error: saveError } = await query;
    setSaving(false);
    if (saveError || !data) {
      setError(saveError?.message ?? "שגיאה בשמירה");
      return;
    }
    onSaved(data as Dog);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded border border-line bg-paper p-3">
      {dog && (
        <PhotoUpload
          bucket="dog-photos"
          pathPrefix={`${ownerId}/${dog.id}`}
          currentUrl={photoUrl}
          onUploaded={setPhotoUrl}
        />
      )}
      <div className="grid grid-cols-2 gap-2">
        <input
          required
          placeholder="שם הכלב"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm"
        />
        <input
          placeholder="גזע (אופציונלי)"
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm"
        />
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm"
        >
          {DOG_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          placeholder="גיל (שנים)"
          value={age}
          onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
          className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm"
        />
      </div>
      <textarea
        placeholder="הערות מיוחדות / רגישויות (אופציונלי)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="rounded border border-line bg-paper-hi px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={saving}
        className="self-start rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink disabled:opacity-60"
      >
        {saving ? "שומר..." : dog ? "שמירת שינויים" : "הוספת כלב"}
      </button>
      {error && <p className="text-xs text-rust">{error}</p>}
    </form>
  );
}
