"use client";

import { useState } from "react";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function WalkPhotoUpload({
  bookingId,
  currentUrl,
  onUploaded,
}: {
  bookingId: string;
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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${userData.user.id}/${bookingId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("walk-photos").upload(path, file, {
      upsert: true,
    });
    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("walk-photos").getPublicUrl(path);

    const { error: rpcError } = await supabase.rpc("set_walk_photo", {
      p_booking_id: bookingId,
      p_photo_url: data.publicUrl,
    });
    setUploading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onUploaded(data.publicUrl);
  }

  return (
    <div className="mt-2">
      {currentUrl ? (
        <div className="relative mb-2 h-32 w-full overflow-hidden rounded">
          <Image src={currentUrl} alt="" fill sizes="100vw" className="object-cover" />
        </div>
      ) : null}
      <label className="inline-block cursor-pointer rounded border border-line px-3 py-1 text-xs font-semibold text-ink/80">
        {uploading ? "מעלה..." : currentUrl ? "החלפת תמונה מהטיול" : "הוספת תמונה מהטיול"}
        <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
      </label>
      {error && <p className="mt-1 text-xs text-rust">{error}</p>}
    </div>
  );
}
