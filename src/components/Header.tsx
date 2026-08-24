"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

declare global {
  interface Window {
    goatcounter?: { count: (opts: { path: string; title?: string; event?: boolean }) => void };
  }
}

const ADMIN_EMAIL = "nadavadar1@gmail.com";

export function Header() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [pendingCount, setPendingCount] = useState(0);
  const pathname = usePathname();
  const isFirstPageview = useRef(true);

  // GoatCounter's script only auto-counts the very first (full) page load;
  // client-side route changes need an explicit count() call to be tracked.
  useEffect(() => {
    if (isFirstPageview.current) {
      isFirstPageview.current = false;
      return;
    }
    window.goatcounter?.count({ path: pathname, title: document.title });
  }, [pathname]);

  // Capture a referral code from the URL (?ref=<referrer-user-id>) into
  // localStorage so it survives the login/onboarding redirect chain, then
  // gets attached to the new profile at signup time.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) localStorage.setItem("pawcircle_ref", ref);
  }, []);

  // A marketing link tagged with ?campaign=<name> (e.g. a specific vet's
  // QR code, a specific Facebook group post) fires a distinct GoatCounter
  // event on landing, so it shows up separately from the "unknown" bucket
  // instead of being indistinguishable direct/WhatsApp traffic. Read from
  // the raw URL (not useSearchParams) so this component — mounted in the
  // root layout — doesn't force every page into dynamic rendering.
  useEffect(() => {
    const campaign = new URLSearchParams(window.location.search).get("campaign");
    if (!campaign) return;
    if (sessionStorage.getItem("pawcircle_campaign_sent") === campaign) return;
    sessionStorage.setItem("pawcircle_campaign_sent", campaign);
    window.goatcounter?.count({
      path: `/campaign/${campaign}`,
      title: `קמפיין: ${campaign}`,
      event: true,
    });
  }, []);

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

  useEffect(() => {
    if (!email) {
      setPendingCount(0);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("walker_id", data.user.id)
        .eq("status", "requested");
      setPendingCount(count ?? 0);
    });
  }, [email, pathname]);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="border-b border-line bg-paper-hi">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-3">
        <Link
          href="/"
          dir="ltr"
          className="flex flex-shrink-0 items-center gap-2 font-[var(--font-display)] text-lg font-bold text-ink"
        >
          <Image src="/logo.jpg" alt="" width={32} height={32} className="rounded-md" />
          Paw<span className="text-rust">Circle</span>
        </Link>
        <nav className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
          {email === undefined ? null : email ? (
            <>
              <Link href="/search" className="text-ink/70 hover:text-rust">חיפוש</Link>
              <Link href="/my-bookings" className="text-ink/70 hover:text-rust">ההליכות שלי</Link>
              <Link href="/dashboard" className="flex items-center gap-1 text-ink/70 hover:text-rust">
                לוח בקשות
                {pendingCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rust px-1 text-[10px] font-bold text-paper-hi">
                    {pendingCount}
                  </span>
                )}
              </Link>
              <Link href="/profile/edit" className="text-ink/70 hover:text-rust">הפרופיל שלי</Link>
              {email === ADMIN_EMAIL && (
                <Link href="/admin" className="text-ink/70 hover:text-rust">ניהול</Link>
              )}
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
