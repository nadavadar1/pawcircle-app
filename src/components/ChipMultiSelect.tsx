/** Checkbox-based chip group with two modes:
 * - Uncontrolled (no onChange): plain form fields with defaultChecked, for
 *   native <form method="get"> submission (e.g. the search page filters).
 * - Controlled (onChange provided): checked + onChange, for pages that read
 *   the selection in JS and save it themselves (e.g. profile edit). */
export function ChipMultiSelect({
  label,
  name,
  options,
  selected,
  onChange,
}: {
  label: string;
  name: string;
  options: readonly string[];
  selected: string[];
  onChange?: (next: string[]) => void;
}) {
  const controlled = !!onChange;

  function toggle(value: string) {
    if (!onChange) return;
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <label key={opt} className="cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={opt}
              checked={controlled ? selected.includes(opt) : undefined}
              defaultChecked={controlled ? undefined : selected.includes(opt)}
              onChange={controlled ? () => toggle(opt) : undefined}
              className="peer sr-only"
            />
            <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink/70 transition-colors peer-checked:border-brass peer-checked:bg-brass peer-checked:text-ink hover:border-brass">
              {opt}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
