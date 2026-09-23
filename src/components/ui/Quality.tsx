"use client";

import { GRADE_COLOR, GRADE_LABEL, type Grade, type Quality } from "@/lib/nutrition/quality";

/** Small coloured dot. The label is for screen readers; colour is never the only signal in a pill. */
export function QualityDot({ grade, className = "" }: { grade: Grade; className?: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${className}`}
      style={{ background: GRADE_COLOR[grade] }}
      role="img"
      aria-label={GRADE_LABEL[grade]}
      title={GRADE_LABEL[grade]}
    />
  );
}

export function QualityPill({ quality }: { quality: Quality }) {
  const color = GRADE_COLOR[quality.grade];
  return (
    <div className="rounded-lg border border-line bg-sunken px-3 py-2">
      <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color }}>
        <QualityDot grade={quality.grade} />
        {GRADE_LABEL[quality.grade]}
      </p>
      {quality.reasons.length > 0 && <p className="mt-0.5 text-[12px] text-muted">{quality.reasons.join(" · ")}</p>}
    </div>
  );
}

/** Stacked bar of the day's calories by grade. */
export function QualityBar({ share }: { share: Record<Grade, number> }) {
  const total = share.green + share.amber + share.red;
  if (total <= 0) return null;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-sunken" role="img" aria-label={`Green ${pct(share.green)}, amber ${pct(share.amber)}, red ${pct(share.red)} of calories`}>
        {(["green", "amber", "red"] as Grade[]).map((g) => (
          <span key={g} style={{ width: pct(share[g]), background: GRADE_COLOR[g] }} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[12px] text-muted">
        {(["green", "amber", "red"] as Grade[]).map((g) => (
          <span key={g} className="flex items-center gap-1.5">
            <QualityDot grade={g} />
            {GRADE_LABEL[g]} <span className="num text-ink">{pct(share[g])}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
