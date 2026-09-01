"use client";

import { useState } from "react";
import { Chart } from "@/components/ui/Chart";
import { Banner, Button, Card, EmptyState, SectionTitle } from "@/components/ui/primitives";
import { useAnalytics, useWeights } from "@/lib/hooks";
import { deleteWeight, saveWeight } from "@/lib/db/repo";
import { formatRate } from "@/lib/nutrition/adaptive";
import { dateKey, formatDay } from "@/lib/utils/date";
import { kg, signed } from "@/lib/utils/format";

export default function ProgressPage() {
  const analytics = useAnalytics();
  const weights = useWeights();
  const [value, setValue] = useState("");
  const [date, setDate] = useState(dateKey());

  if (!analytics) return <p className="py-10 text-center text-[13px] text-muted">Loading…</p>;

  const { profile, trend, slope, currentWeight } = analytics;
  const start = profile.startWeightKg;
  const goal = profile.targetWeightKg;
  const total = goal - start;
  const done = currentWeight - start;
  const progress = total !== 0 ? Math.max(0, Math.min(100, (done / total) * 100)) : 0;
  const latest = weights[weights.length - 1];

  const submit = async () => {
    const w = Number(value);
    if (!w || w < 20 || w > 400) return;
    await saveWeight(date, Number(w.toFixed(2)));
    setValue("");
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight">Progress</h1>
        <p className="text-[13px] text-muted">Weigh in most mornings. The trend line is what matters, not any one reading.</p>
      </header>

      <Card>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[13px] font-medium text-muted" htmlFor="weight">
              Weight (kg)
            </label>
            <input
              id="weight"
              className="field num"
              inputMode="decimal"
              placeholder={latest ? String(latest.weightKg) : "78.4"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="w-36">
            <label className="mb-1 block text-[13px] font-medium text-muted" htmlFor="weight-date">
              Date
            </label>
            <input
              id="weight-date"
              type="date"
              className="field num"
              max={dateKey()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button variant="solid" onClick={submit} disabled={!Number(value)}>
            Save
          </Button>
        </div>
      </Card>

      <Card>
        <dl className="grid grid-cols-2 gap-3 text-[13px]">
          <Stat label="Trend weight" value={`${kg(currentWeight)} kg`} big />
          <Stat label="Last reading" value={latest ? `${kg(latest.weightKg)} kg` : "—"} big />
          <Stat label="Weekly rate" value={slope !== undefined ? formatRate(slope) : "needs more data"} />
          <Stat label="Goal" value={`${kg(goal)} kg`} />
          <Stat label="Change so far" value={`${signed(done, 1)} kg`} />
          <Stat
            label="Estimated arrival"
            value={analytics.weeksToTarget !== undefined ? `${analytics.weeksToTarget} weeks` : "—"}
          />
        </dl>
        <div className="mt-3">
          <div className="bar">
            <span style={{ width: `${progress}%`, background: "var(--color-carb)" }} />
          </div>
          <p className="mt-1 text-[12px] text-muted">
            {Math.round(progress)}% of the way from {kg(start)} kg to {kg(goal)} kg
          </p>
        </div>
      </Card>

      <Card>
        <SectionTitle>Trend</SectionTitle>
        {trend.length < 2 ? (
          <EmptyState title="Not enough weigh-ins">Two readings are enough to draw a line; a fortnight is enough to trust it.</EmptyState>
        ) : (
          <Chart
            series={[
              { points: trend.map((p) => ({ date: p.date, value: p.weight })), color: "var(--color-muted)", kind: "dots" },
              { points: trend.map((p) => ({ date: p.date, value: p.trend })), color: "var(--color-carb)" },
            ]}
            referenceLine={goal}
            referenceLabel="goal"
            height={160}
          />
        )}
      </Card>

      {slope !== undefined && Math.abs(slope) > 1.2 && (
        <Banner tone="warn" title="That is a fast rate">
          Sustained changes above about 1 kg per week are usually water or under-eating rather than fat. If this is
          deliberate, it is worth doing under medical supervision.
        </Banner>
      )}

      <Card>
        <SectionTitle>History</SectionTitle>
        {weights.length === 0 ? (
          <p className="text-[13px] text-muted">No weigh-ins yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {[...weights].reverse().slice(0, 30).map((w) => (
              <li key={w.id} className="flex items-center justify-between py-2 text-[14px]">
                <span className="text-muted">{formatDay(w.date)}</span>
                <span className="flex items-center gap-3">
                  <span className="num">{kg(w.weightKg)} kg</span>
                  <button className="tap text-[12px] text-muted" onClick={() => w.id && deleteWeight(w.id)}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className={`num ${big ? "text-[22px] font-medium" : ""}`}>{value}</dd>
    </div>
  );
}
