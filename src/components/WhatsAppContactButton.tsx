import { whatsAppLink } from "@/lib/phone";

/** A "message on WhatsApp" button for the moment two strangers' contact info
 * is first revealed to each other — pre-fills a natural opening line so
 * there's an actual next step, not just a phone number sitting there. */
export function WhatsAppContactButton({
  phone,
  viewerName,
  dogName,
  date,
}: {
  phone: string;
  viewerName: string;
  dogName: string;
  date: string;
}) {
  const message = `היי, זו/זה ${viewerName} מ-PawCircle, לגבי ההליכה עם ${dogName} ב-${new Date(date).toLocaleDateString("he-IL")}...`;
  const link = whatsAppLink(phone, message);
  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded border border-sage px-3 py-1.5 text-sm font-bold text-pine hover:bg-sage/10"
    >
      <span aria-hidden="true">📲</span>
      פתיחת וואטסאפ
    </a>
  );
}
