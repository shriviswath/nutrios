"use client";

import { dateKey, parseKey, shiftKey } from "@/lib/utils/date";

const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * A week of days with a dot under every logged one. The window ends today, or on the selected day
 * when browsing further back, and never shows the future.
 */
export function DateStrip({
  selected,
  onSelect,
  loggedDates,
}: {
  selected: string;
  onSelect: (date: string) => void;
  loggedDates: Set<string>;
}) {
  const today = dateKey();
  const end = selected > shiftKey(today, -4) ? today : shiftKey(selected, 3);
  const days = Array.from({ length: 7 }, (_, i) => shiftKey(end, i - 6));

  return (
    <nav className="flex items-center gap-1" aria-label="Choose a day">
      <button type="button" className="tap px-1.5 text-muted" onClick={() => onSelect(shiftKey(selected, -7))} aria-label="Previous week">
        ‹
      </button>
      <ol className="grid flex-1 grid-cols-7 gap-1">
        {days.map((d) => {
          const active = d === selected;
          const date = parseKey(d);
          return (
            <li key={d}>
              <button
                type="button"
                onClick={() => onSelect(d)}
                aria-current={active ? "date" : undefined}
                aria-label={d}
                className={`flex w-full flex-col items-center rounded-lg py-1.5 transition-colors ${
                  active ? "bg-ink text-bg" : "text-muted hover:bg-surface"
                }`}
              >
                <span className="text-[11px]">{LETTERS[date.getDay()]}</span>
                <span className={`num text-[15px] ${active ? "" : d === today ? "text-ink font-semibold" : "text-ink"}`}>{date.getDate()}</span>
                <span
                  className="mt-0.5 h-1 w-1 rounded-full"
                  style={{ background: loggedDates.has(d) ? (active ? "var(--color-bg)" : "var(--color-energy)") : "transparent" }}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="tap px-1.5 text-muted disabled:opacity-30"
        onClick={() => onSelect(shiftKey(selected, 7) > today ? today : shiftKey(selected, 7))}
        disabled={selected === today}
        aria-label="Next week"
      >
        ›
      </button>
    </nav>
  );
}
