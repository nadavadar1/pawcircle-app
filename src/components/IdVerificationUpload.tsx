"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function IdVerificationUpload({
  userId,
  initialDocumentUrl,
  initialVerified,
}: {
  userId: string;
  initialDocumentUrl: string | null;
  initialVerified: boolean;
}) {
  const [documentUrl, setDocumentUrl] = useState(initialDocumentUrl);
  const [verified] = useState(initialVerified);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("אפשר להעלות תמונה בלבד (למשל צילום תעודת זהות/רישיון נהיגה).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("הקובץ גדול מדי (מקסימום 5MB).");
      return;
    }

    setUploading(true);
    const supabase = getSupabaseBrowserClient();
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("id-documents").upload(path, file, {
      upsert: true,
    });
    if (uploadError) {
      setUploading(false);
      setError("ההעלאה נכשלה, נסה שוב.");
      return;
    }

    const { error: dbError } = await supabase.from("profiles").update({ id_document_url: path }).eq("id", userId);
    setUploading(false);
    if (dbError) {
      setError("ההעלאה נכשלה, נסה שוב.");
      return;
    }
    setDocumentUrl(path);
  }

  return (
    <div className="rounded border border-line bg-paper-hi p-4">
      <p className="text-sm font-semibold text-pine">אימות זהות</p>
      <p className="mt-1 text-xs text-ink/60">
        העלאת צילום תעודה מזהה (ת.ז, רישיון נהיגה או דרכון) לצורך אישור ידני. המסמך פרטי — נגיש רק לצוות
        PawCircle, ולא מוצג לאף משתמש אחר.
      </p>

      {verified ? (
        <p className="mt-3 text-sm font-bold text-pine">✓ זהות מאומתת</p>
      ) : documentUrl ? (
        <p className="mt-3 text-sm text-brass-hi">המסמך הועלה, ממתין לאישור.</p>
      ) : null}

      {!verified && (
        <label className="mt-3 inline-block cursor-pointer text-xs font-semibold text-rust underline">
          {uploading ? "מעלה..." : documentUrl ? "העלאת מסמך חדש" : "העלאת מסמך"}
          <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
      )}
      {error && <p className="mt-2 text-xs text-rust">{error}</p>}
    </div>
  );
}
