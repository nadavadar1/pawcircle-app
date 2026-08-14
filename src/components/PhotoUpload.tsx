"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function PhotoUpload({
  bucket,
  pathPrefix,
  currentUrl,
  onUploaded,
}: {
  bucket: "profile-photos" | "dog-photos";
  pathPrefix: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("אפשר להעלות תמונה בלבד.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("התמונה גדולה מדי (מקסימום 5MB).");
      return;
    }

    setUploading(true);
    const supabase = getSupabaseBrowserClient();
    const ext = file.name.split(".").pop();
    const path = `${pathPrefix}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
    });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setUploading(false);
    onUploaded(data.publicUrl);
  }

  return (
    <div className="flex items-center gap-3">
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
      ) : (
        <div className="h-16 w-16 rounded-full bg-line" />
      )}
      <label className="cursor-pointer text-xs font-semibold text-rust underline">
        {uploading ? "מעלה..." : "החלפת תמונה"}
        <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
      </label>
      {error && <p className="text-xs text-rust">{error}</p>}
    </div>
  );
}
