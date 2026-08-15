"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type Status = "checking" | "unsupported" | "denied" | "subscribed" | "off";

export function NotificationOptIn() {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC_KEY) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "off");
    })();
  }, []);

  async function enable() {
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setStatus("subscribed");
    } catch {
      setError("ההפעלה נכשלה, נסה שוב.");
    }
  }

  if (status === "checking" || status === "unsupported") return null;

  return (
    <div className="mb-8 rounded border border-line bg-paper-hi p-4">
      <p className="mb-1 text-sm font-semibold text-pine">התראות</p>
      {status === "subscribed" ? (
        <p className="text-xs text-sage">התראות מופעלות ✓ תקבלו עדכון כשמגיעה בקשת הליכה או שהיא מאושרת.</p>
      ) : status === "denied" ? (
        <p className="text-xs text-ink/60">חסמתם התראות בדפדפן. אפשר לאפשר אותן מחדש דרך הגדרות האתר בדפדפן.</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-ink/60">קבלו התראה כשמגיעה בקשת הליכה חדשה או כשהיא מאושרת — גם כשהאתר סגור.</p>
          <button type="button" onClick={enable} className="rounded bg-brass px-3 py-1.5 text-sm font-bold text-ink">
            הפעלת התראות
          </button>
        </>
      )}
      {error && <p className="mt-2 text-xs text-rust">{error}</p>}
    </div>
  );
}
