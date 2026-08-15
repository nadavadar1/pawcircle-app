import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper-hi">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-ink/50">
        <span>© {new Date().getFullYear()} PawCircle</span>
        <nav className="flex gap-4">
          <Link href="/safety" className="hover:text-rust">בטיחות ואמון</Link>
          <Link href="/terms" className="hover:text-rust">תנאי שימוש</Link>
          <Link href="/privacy" className="hover:text-rust">מדיניות פרטיות</Link>
          <a href="mailto:nadavadar1@gmail.com" className="hover:text-rust">צור קשר</a>
        </nav>
      </div>
    </footer>
  );
}
