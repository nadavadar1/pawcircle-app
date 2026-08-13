const STATUS_STYLE: Record<string, { chip: string; border: string }> = {
  requested: { chip: "bg-brass/25 text-pine", border: "border-brass" },
  accepted: { chip: "bg-sage/25 text-pine", border: "border-sage" },
  declined: { chip: "bg-rust/15 text-rust", border: "border-rust" },
  cancelled: { chip: "bg-line text-ink/60", border: "border-line" },
  completed: { chip: "bg-pine/15 text-pine", border: "border-pine" },
};

const DEFAULT_STYLE = { chip: "bg-line text-ink/60", border: "border-line" };

export function statusBorderClass(status: string) {
  return (STATUS_STYLE[status] ?? DEFAULT_STYLE).border;
}

export function BookingStatusBadge({ status, label }: { status: string; label: string }) {
  const style = STATUS_STYLE[status] ?? DEFAULT_STYLE;
  return (
    <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${style.chip}`}>
      {label}
    </span>
  );
}
