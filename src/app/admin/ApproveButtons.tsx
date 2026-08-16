"use client";

import { useState, useTransition } from "react";
import { approveWalker, approveIdVerification } from "./actions";

export function ApproveWalkerButton({ walkerId }: { walkerId: string }) {
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
              await approveWalker(walkerId);
            } catch {
              setError("האישור נכשל, נסה שוב.");
            }
          })
        }
        className="rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink disabled:opacity-60"
      >
        {pending ? "מאשר..." : "אישור מטייל/ת"}
      </button>
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
