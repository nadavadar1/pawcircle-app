/** Checkbox-based chip group. No client JS: the checked look is pure CSS
 * (peer-checked), so this works as plain form fields inside a native
 * <form method="get">, e.g. on the search page's server-rendered filters. */
export function ChipMultiSelect({
  label,
  name,
  options,
  selected,
}: {
  label: string;
  name: string;
  options: readonly string[];
  selected: string[];
}) {
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
              defaultChecked={selected.includes(opt)}
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
