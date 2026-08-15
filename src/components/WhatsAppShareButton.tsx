export function WhatsAppShareButton({
  text,
  url,
  label = "שיתוף בוואטסאפ",
}: {
  text: string;
  url: string;
  label?: string;
}) {
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  return (
    <a
      href={shareUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded border border-sage px-3 py-1.5 text-sm font-bold text-pine hover:bg-sage/10"
    >
      <span aria-hidden="true">📲</span>
      {label}
    </a>
  );
}
