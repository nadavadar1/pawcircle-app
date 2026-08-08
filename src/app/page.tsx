export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-[var(--font-mono)] text-xs uppercase tracking-wide text-rust">
        PawCircle · בבנייה
      </p>
      <h1 className="text-4xl font-bold text-pine">
        מטיילים עם שם. לא רק כוכביות.
      </h1>
      <p className="max-w-md text-ink/80">
        האפליקציה בבנייה. בקרוב אפשר יהיה לחפש מטיילים, לבקש הליכה, ולראות
        ביקורות אמיתיות עם שם מלא.
      </p>
    </main>
  );
}
