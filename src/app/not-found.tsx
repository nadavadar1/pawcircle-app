import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הדף לא נמצא | PawCircle",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <svg className="h-14 w-14 text-pine/30" viewBox="0 0 40 40" aria-hidden="true" fill="currentColor">
        <circle cx="20" cy="15" r="4.4" />
        <circle cx="11" cy="19.5" r="3.4" />
        <circle cx="29" cy="19.5" r="3.4" />
        <circle cx="20" cy="27" r="3.4" />
      </svg>
      <h1 className="font-[var(--font-display)] text-2xl font-black text-pine">הדף הזה נעלם לו לטיול</h1>
      <p className="text-sm text-ink/70">
        אולי הקישור שגוי, אולי הפרופיל כבר לא זמין. אפשר לחזור לחיפוש מטיילים.
      </p>
      <Link href="/search" className="rounded bg-brass px-4 py-2 font-bold text-ink">
        חזרה לחיפוש
      </Link>
    </main>
  );
}
