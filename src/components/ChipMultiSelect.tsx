"use client";

import { useState } from "react";

/** Checkbox-based chip group with two modes:
 * - Uncontrolled (no onChange): plain form fields with defaultChecked, for
 *   native <form method="get"> submission (e.g. the search page filters).
 * - Controlled (onChange provided): checked + onChange, for pages that read
 *   the selection in JS and save it themselves (e.g. profile edit).
 *
 * With `searchable`, the full option wall is hidden by default — only
 * already-selected chips show, plus whatever matches as you type. A checked
 * option must never disappear just because the query changed: in controlled
 * mode `selected` is always live and correct; in uncontrolled mode nothing
 * re-renders on a native click, so we separately track which boxes were
 * clicked (`localTouched`) purely to decide visibility — it never drives the
 * actual checked state, which stays native via defaultChecked. */
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
  const [localTouched, setLocalTouched] = useState<Set<string>>(() => new Set(selected));

  function toggle(value: string) {
    if (!onChange) return;
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  function trackNativeToggle(value: string, checked: boolean) {
    setLocalTouched((prev) => {
      const next = new Set(prev);
      if (checked) next.add(value);
      else next.delete(value);
      return next;
    });
  }

  const effectiveSelected = controlled ? selected : Array.from(localTouched);
  const visible = searchable
    ? options.filter((opt) => effectiveSelected.includes(opt) || (query.length > 0 && opt.includes(query)))
    : options;

  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold">{label}</legend>
      {searchable && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="הקלידו לחיפוש..."
          className="mb-2 w-full rounded border border-line bg-paper px-2 py-1 text-xs"
        />
      )}
      {searchable && visible.length === 0 && (
        <p className="text-xs text-ink/40">
          {query.length > 0
            ? `אין התאמה ל"${query}" — נסו לפי שם עיר או שכונה, למשל "תל אביב"`
            : "התחילו להקליד כדי לראות אפשרויות"}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {visible.map((opt) => (
          <label key={opt} className="cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={opt}
              checked={controlled ? selected.includes(opt) : undefined}
              defaultChecked={controlled ? undefined : selected.includes(opt)}
              onChange={
                controlled
                  ? () => toggle(opt)
                  : (e) => trackNativeToggle(opt, e.target.checked)
              }
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
