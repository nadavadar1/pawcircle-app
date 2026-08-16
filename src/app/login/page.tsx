"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

// In-app browsers (WhatsApp, Instagram, Facebook/Messenger, TikTok) run in a
// stripped-down WebView that frequently breaks Google's OAuth redirect —
// Google itself blocks or mishandles sign-in from these user agents. The
// email-code flow doesn't depend on that redirect chain, so it's the
// reliable fallback to point people at when one of these is detected.
function useIsInAppBrowser() {
  const [isInApp, setIsInApp] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || "";
    setIsInApp(/FBAN|FBAV|Instagram|WhatsApp|Line\/|MicroMessenger|TikTok/i.test(ua));
  }, []);
  return isInApp;
}

export default function LoginPage() {
  const router = useRouter();
  const isInAppBrowser = useIsInAppBrowser();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setStatus("busy");
    setErrorMsg("");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("idle");
    setStage("code");
  }

  async function signInWithGoogle() {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser navigates away to Google before this resolves.
    // If it resolves with an error, we're still here and need to say so.
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setStatus("busy");
    setErrorMsg("");

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error || !data.user) {
      setStatus("error");
      setErrorMsg(error?.message ?? "הקוד שגוי או פג תוקף");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();

    router.push(profile ? "/search" : "/onboarding");
  }

  if (stage === "code") {
    return (
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="mb-2 text-2xl font-bold text-pine">הזינו את הקוד</h1>
        <p className="mb-6 text-sm text-ink/70">
          שלחנו קוד בן כמה ספרות ל-{email}. הקוד תקף לכמה דקות.
        </p>
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="rounded border border-line bg-paper px-3 py-2 text-center text-2xl tracking-widest"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={status === "busy"}
            className="rounded bg-brass px-4 py-2 font-bold text-ink disabled:opacity-60"
          >
            {status === "busy" ? "מאמת..." : "כניסה"}
          </button>
          {status === "error" && <p className="text-sm text-rust">{errorMsg}</p>}
          <button
            type="button"
            onClick={() => setStage("email")}
            className="text-sm text-ink/60 underline"
          >
            שליחת קוד חדש / שינוי מייל
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold text-pine">התחברות</h1>
      <p className="mb-6 text-sm text-ink/70">
        בלי סיסמה — עם Google בלחיצה אחת, או קוד קצר במייל.
      </p>

      {isInAppBrowser && (
        <p className="mb-4 rounded border border-brass/40 bg-brass/10 px-3 py-2 text-xs text-ink/80">
          נראה שפתחתם את הדף מתוך אפליקציה אחרת (וואטסאפ/אינסטגרם וכו&apos;). התחברות עם Google לא תמיד
          עובדת שם — אם היא נכשלת, השתמשו ב&quot;קוד קצר במייל&quot; למטה, זה תמיד עובד.
        </p>
      )}

      <button
        type="button"
        onClick={signInWithGoogle}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded border border-line bg-paper px-4 py-2 font-bold text-ink hover:border-rust"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"/>
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"/>
        </svg>
        המשך עם Google
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-ink/50">
        <span className="h-px flex-1 bg-line" />
        או
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={sendCode} className="flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded border border-line bg-paper px-3 py-2"
          dir="ltr"
        />
        <button
          type="submit"
          disabled={status === "busy"}
          className="rounded bg-brass px-4 py-2 font-bold text-ink disabled:opacity-60"
        >
          {status === "busy" ? "שולח..." : "שליחת קוד"}
        </button>
        {status === "error" && <p className="text-sm text-rust">{errorMsg}</p>}
      </form>
    </main>
  );
}
