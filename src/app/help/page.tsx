"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Loading } from "@/components/Loading";

export default function HelpPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "sent" | "error">("idle");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);
      setCheckingAuth(false);
    });
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setStatus("busy");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("support_messages").insert({ user_id: userId, message });

    setStatus(error ? "error" : "sent");
  }

  if (checkingAuth) return <Loading />;

  if (status === "sent") {
    return (
      <main className="mx-auto max-w-sm px-6 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold text-pine">תודה 🙏</h1>
        <p className="text-sm text-ink/70">קיבלנו את ההודעה שלכם, נטפל בזה בהקדם.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold text-pine">יש בעיה?</h1>
      <p className="mb-6 text-sm text-ink/70">
        ספרו לנו מה קרה ואנחנו נטפל בזה ישירות — לא צריך לחפש אותנו בוואטסאפ.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="מה קרה?"
          className="rounded border border-line bg-paper px-3 py-2"
        />
        <button
          type="submit"
          disabled={status === "busy"}
          className="rounded bg-brass px-4 py-2 font-bold text-ink disabled:opacity-60"
        >
          {status === "busy" ? "שולח..." : "שליחה"}
        </button>
        {status === "error" && <p className="text-sm text-rust">השליחה נכשלה, נסו שוב.</p>}
      </form>
    </main>
  );
}
