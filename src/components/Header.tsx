"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function Header() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="border-b border-line bg-paper-hi">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link href="/" className="font-[var(--font-display)] text-lg font-bold text-ink">
          Paw<span className="text-rust">Circle</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {email === undefined ? null : email ? (
            <>
              <Link href="/search" className="text-ink/70 hover:text-rust">חיפוש</Link>
              <Link href="/my-bookings" className="text-ink/70 hover:text-rust">ההליכות שלי</Link>
              <Link href="/dashboard" className="text-ink/70 hover:text-rust">לוח בקשות</Link>
              <Link href="/profile/edit" className="text-ink/70 hover:text-rust">הפרופיל שלי</Link>
              <button onClick={signOut} className="text-rust hover:underline">
                התנתקות
              </button>
            </>
          ) : (
            <Link href="/login" className="text-rust hover:underline">
              התחברות
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
