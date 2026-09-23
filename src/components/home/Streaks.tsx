"use client";

import type { Badge, StreakInfo } from "@/lib/streaks";

export function FlameIcon({ lit = true, size = 16 }: { lit?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2.5c.6 3.2 4.8 5.4 4.8 10.2A4.8 4.8 0 0 1 12 21.5a4.8 4.8 0 0 1-4.8-4.8c0-2.2 1.1-3.6 2.3-4.8.3 1.5 1.1 2.5 2.1 2.9-.6-3.4.1-7 .4-12.3Z"
        fill={lit ? "var(--color-energy)" : "none"}
        stroke={lit ? "var(--color-energy)" : "var(--color-muted)"}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Compact header chip: "5 day streak". */
export function StreakChip({ streaks }: { streaks: StreakInfo }) {
  const lit = streaks.current > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] ${lit ? "border-energy/40 text-ink" : "border-line text-muted"}`}
      title={`Longest streak: ${streaks.longest} days`}
    >
      <FlameIcon lit={lit} size={14} />
      <span className="num font-medium">{streaks.current}</span>
      <span>day{streaks.current === 1 ? "" : "s"}</span>
    </span>
  );
}

export function StreakNudge({ streaks }: { streaks: StreakInfo }) {
  if (streaks.loggedToday || streaks.current === 0) return null;
  return (
    <p className="flex items-center gap-2 rounded-lg border-l-2 border-energy bg-surface px-3 py-2 text-[13px]">
      <FlameIcon size={14} />
      Log anything today to keep your {streaks.current}-day streak going.
    </p>
  );
}

export function StreakSummary({ streaks }: { streaks: StreakInfo }) {
  return (
    <dl className="grid grid-cols-3 gap-3 text-center">
      <Stat label="Current streak" value={streaks.current} />
      <Stat label="Longest" value={streaks.longest} />
      <Stat label="On target in a row" value={streaks.onTarget} />
    </dl>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-sunken px-2 py-2.5">
      <dd className="num text-[22px] font-medium leading-none">{value}</dd>
      <dt className="mt-1 text-[11px] text-muted">{label}</dt>
    </div>
  );
}

export function BadgeGrid({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <div>
      <p className="mb-2 text-[12px] text-muted">
        {earned} of {badges.length} earned
      </p>
      <ul className="grid grid-cols-2 gap-2">
        {badges.map((b) => (
          <li
            key={b.id}
            className={`rounded-lg border px-3 py-2.5 ${b.earned ? "border-energy/50 bg-surface" : "border-dashed border-line"}`}
          >
            <p className={`flex items-center gap-1.5 text-[13px] font-medium ${b.earned ? "" : "text-muted"}`}>
              <BadgeIcon earned={b.earned} />
              {b.title}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">{b.description}</p>
            {!b.earned && <p className="num mt-1 text-[11px] text-muted">{b.progress}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BadgeIcon({ earned }: { earned: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="9" r="6" fill={earned ? "var(--color-energy)" : "none"} stroke={earned ? "var(--color-energy)" : "var(--color-muted)"} strokeWidth="1.6" />
      <path d="m8.5 14-1.5 7 5-2.5 5 2.5-1.5-7" fill="none" stroke={earned ? "var(--color-energy)" : "var(--color-muted)"} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
