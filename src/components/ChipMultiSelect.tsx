"use client";

import { useState } from "react";

/** Checkbox-based chip group with two modes:
 * - Uncontrolled (no onChange): plain form fields with defaultChecked, for
 *   native <form method="get"> submission (e.g. the search page filters).
 * - Controlled (onChange provided): checked + onChange, for pages that read
 *   the selection in JS and save it themselves (e.g. profile edit).
 *
 * With `searchable`, options are filtered by a text box — but non-matching
 * ones are hidden (display:none), never unmounted, so a checked-but-filtered
 * -out option still submits with the form instead of silently dropping. */
export function ChipMultiSelect({
  label,
  name,
  options,
  selected,
  onChange,
  searchable,
}: {
  label: string;
  name: string;
  options: readonly string[];
  selected: string[];
  onChange?: (next: string[]) => void;
  searchable?: boolean;
}) {
  const controlled = !!onChange;
  const [query, setQuery] = useState("");

  function toggle(value: string) {
    if (!onChange) return;
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold">{label}</legend>
      {searchable && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש..."
          className="mb-2 w-full rounded border border-line bg-paper px-2 py-1 text-xs"
        />
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const matches = !query || opt.includes(query);
          return (
            <label key={opt} className={"cursor-pointer" + (matches ? "" : " hidden")}>
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
          );
        })}
      </div>
    </fieldset>
  );
}
