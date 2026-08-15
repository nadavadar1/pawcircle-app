"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { WhatsAppShareButton } from "@/components/WhatsAppShareButton";

export function InviteFriends({ userId }: { userId: string }) {
  const [count, setCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const link = `https://pawcircle-app.vercel.app/?ref=${userId}`;

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", userId)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [userId]);

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-8 rounded border border-line bg-paper-hi p-4">
      <p className="mb-1 text-sm font-semibold text-pine">הזמינו חברים ל-PawCircle</p>
      <p className="mb-3 text-xs text-ink/60">
        {count === null ? "" : count > 0 ? `${count} הצטרפו דרך ההמלצה שלכם עד עכשיו ✓` : "שתפו את הקישור האישי שלכם"}
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          dir="ltr"
          className="flex-1 rounded border border-line bg-paper px-2 py-1.5 text-xs text-ink/70"
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          onClick={copyLink}
          className="flex-shrink-0 rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink"
        >
          {copied ? "הועתק ✓" : "העתקה"}
        </button>
      </div>
      <div className="mt-2">
        <WhatsAppShareButton
          text="גיליתי אפליקציה למטיילי כלבים עם שם אמיתי וביקורות מהקהילה — PawCircle:"
          url={link}
        />
      </div>
    </div>
  );
}
