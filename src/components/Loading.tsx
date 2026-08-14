export function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 py-24">
      <svg className="h-10 w-10 animate-spin text-pine/40" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="17.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="90 20" />
        <circle cx="20" cy="15" r="3.4" fill="currentColor" />
        <circle cx="13.5" cy="19" r="2.6" fill="currentColor" />
        <circle cx="26.5" cy="19" r="2.6" fill="currentColor" />
        <circle cx="20" cy="25.5" r="2.6" fill="currentColor" />
      </svg>
      <p className="font-[var(--font-mono)] text-sm text-ink/50">טוען...</p>
    </main>
  );
}
