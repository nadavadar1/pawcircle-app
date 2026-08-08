"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
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
        מזינים מייל ומקבלים קוד קצר להקלדה. בלי סיסמה.
      </p>
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
