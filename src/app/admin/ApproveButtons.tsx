"use client";

import { useState, useTransition } from "react";
import { approveWalker, rejectWalker, approveIdVerification, suspendWalker, resolveSupportMessage } from "./actions";

export function PendingWalkerActions({ walkerId }: { walkerId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  function run(kind: "approve" | "reject") {
    setAction(kind);
    startTransition(async () => {
      setError(null);
      try {
        if (kind === "approve") await approveWalker(walkerId);
        else await rejectWalker(walkerId);
      } catch {
        setError("הפעולה נכשלה, נסה שוב.");
      }
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run("approve")}
          className="rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink disabled:opacity-60"
        >
          {pending && action === "approve" ? "מאשר..." : "אישור מטייל/ת"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run("reject")}
          className="rounded border border-rust px-3 py-1.5 text-sm text-rust disabled:opacity-60"
        >
          {pending && action === "reject" ? "דוחה..." : "דחייה"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-rust">{error}</p>}
    </div>
  );
}

export function ApproveIdVerificationButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await approveIdVerification(userId);
            } catch {
              setError("האישור נכשל, נסה שוב.");
            }
          })
        }
        className="rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink disabled:opacity-60"
      >
        {pending ? "מאשר..." : "אישור זהות"}
      </button>
      {error && <p className="mt-1 text-xs text-rust">{error}</p>}
    </div>
  );
}

export function ResolveSupportMessageButton({ messageId }: { messageId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return <p className="text-xs font-semibold text-sage">טופל ✓</p>;

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await resolveSupportMessage(messageId);
              setDone(true);
            } catch {
              setError("הפעולה נכשלה, נסה שוב.");
            }
          })
        }
        className="rounded border border-line px-3 py-1 text-xs font-semibold text-ink/70 hover:border-rust hover:text-rust disabled:opacity-60"
      >
        {pending ? "מסמן..." : "סמן כטופל"}
      </button>
      {error && <p className="mt-1 text-xs text-rust">{error}</p>}
    </div>
  );
}

export function SuspendWalkerButton({ walkerId }: { walkerId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return <p className="text-xs font-semibold text-rust">המטייל/ת הושעה ✓</p>;

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await suspendWalker(walkerId);
              setDone(true);
            } catch {
              setError("ההשעיה נכשלה, נסה שוב.");
            }
          })
        }
        className="rounded border border-rust px-3 py-1 text-xs font-semibold text-rust disabled:opacity-60"
      >
        {pending ? "משעה..." : "השעיית מטייל/ת"}
      </button>
      {error && <p className="mt-1 text-xs text-rust">{error}</p>}
    </div>
  );
}
