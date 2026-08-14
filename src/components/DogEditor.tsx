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
  onDeleted,
}: {
  ownerId: string;
  dog: Dog | null;
  onSaved: (dog: Dog) => void;
  onDeleted?: (id: string) => void;
}) {
  const [name, setName] = useState(dog?.name ?? "");
  const [breed, setBreed] = useState(dog?.breed ?? "");
  const [size, setSize] = useState(dog?.size ?? DOG_SIZES[0]);
  const [age, setAge] = useState<number | "">(dog?.age_years ?? "");
  const [notes, setNotes] = useState(dog?.special_notes ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(dog?.photo_url ?? null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  async function handleDelete() {
    if (!dog) return;
    setDeleting(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("dog_id", dog.id);

    if (count && count > 0) {
      setDeleting(false);
      setError("אי אפשר למחוק כלב עם היסטוריית הזמנות.");
      return;
    }

    if (!window.confirm(`למחוק את ${dog.name}? הפעולה לא הפיכה.`)) {
      setDeleting(false);
      return;
    }

    const { error: deleteError } = await supabase.from("dogs").delete().eq("id", dog.id);
    setDeleting(false);
    if (deleteError) {
      setError("המחיקה נכשלה, נסה שוב.");
      return;
    }
    onDeleted?.(dog.id);
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
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || deleting}
          className="self-start rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink disabled:opacity-60"
        >
          {saving ? "שומר..." : dog ? "שמירת שינויים" : "הוספת כלב"}
        </button>
        {dog && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="self-start rounded border border-rust px-3 py-1.5 text-sm text-rust disabled:opacity-60"
          >
            {deleting ? "מוחק..." : "מחיקת כלב"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rust">{error}</p>}
    </form>
  );
}
