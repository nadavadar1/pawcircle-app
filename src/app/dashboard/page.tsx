"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setReady(true);
    });
  }, [router]);

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="mb-2 text-2xl font-bold text-pine">לוח הבקשות שלך</h1>
      <p className="text-ink/70">
        כאן יופיעו בקשות הליכה נכנסות ואפשרות לסמן זמינות. בבנייה.
      </p>
    </main>
  );
}
