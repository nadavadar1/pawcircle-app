const STEPS = [
  { key: "requested", label: "נשלחה" },
  { key: "accepted", label: "אושרה" },
  { key: "completed", label: "הושלמה" },
] as const;

const STEP_INDEX: Record<string, number> = { requested: 0, accepted: 1, completed: 2 };

export function BookingStatusTimeline({ status }: { status: string }) {
  if (status === "declined" || status === "cancelled") return null;

  const currentIndex = STEP_INDEX[status] ?? 0;

  return (
    <div className="mt-2 flex items-center">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`h-2.5 w-2.5 rounded-full ${i <= currentIndex ? "bg-pine" : "bg-line"}`}
            />
            <span
              className={`mt-1 text-[10px] whitespace-nowrap ${
                i <= currentIndex ? "font-semibold text-pine" : "text-ink/40"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`mx-1 h-0.5 flex-1 ${i < currentIndex ? "bg-pine" : "bg-line"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
