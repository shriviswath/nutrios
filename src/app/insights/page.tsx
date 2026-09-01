"use client";

import { useState } from "react";
import { Chart } from "@/components/ui/Chart";
import { MicroPanel } from "@/components/insights/MicroPanel";
import { Banner, Button, Card, SectionTitle, Segmented } from "@/components/ui/primitives";
import { useAnalytics, useDay, useSettings } from "@/lib/hooks";
import { applyAdaptedTarget } from "@/lib/db/repo";
import { formatRate } from "@/lib/nutrition/adaptive";
import { dateKey } from "@/lib/utils/date";
import { grams, kcal, kg, signed } from "@/lib/utils/format";

type Range = "7" | "30" | "90";

export default function InsightsPage() {
  const [range, setRange] = useState<Range>("30");
  const analytics = useAnalytics();
  const settings = useSettings();
  const today = useDay(dateKey());

  if (!analytics || !settings) return <p className="py-10 text-center text-[13px] text-muted">Crunching your data…</p>;

  const days = Number(range);
  const intake = analytics.intake.slice(-days);
  const trend = analytics.trend.slice(-days);
  const { estimate, recommendation, report, profile } = analytics;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight">Insights</h1>
        <p className="text-[13px] text-muted">What your data says, and how confident it is.</p>
      </header>

      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: "7", label: "7 days" },
          { value: "30", label: "30 days" },
          { value: "90", label: "90 days" },
        ]}
      />

      <Card>
        <SectionTitle>Estimated maintenance</SectionTitle>
        <p className="num text-[30px] font-medium leading-none">
          {kcal(estimate.value)}
          <span className="text-[14px] text-muted"> ± {estimate.margin} kcal/day</span>
        </p>
        <p className="mt-1 text-[12px] text-muted">
          {estimate.source === "formula"
            ? "From the Mifflin-St Jeor formula and your activity level"
            : `From ${estimate.loggedDays} logged days and ${estimate.weighIns} weigh-ins · confidence ${Math.round(estimate.confidence * 100)}%`}
        </p>
        <p className="mt-2 text-[13px] text-ink/80">{estimate.explanation}</p>
      </Card>

      <Card>
        <SectionTitle>Calorie target</SectionTitle>
        <div className="flex items-baseline justify-between">
          <p className="num text-[24px] font-medium">{kcal(settings.calorieTarget)} kcal</p>
          {recommendation.action === "hold" && <span className="text-[13px] text-ok">On track</span>}
        </div>
        <p className="mt-2 text-[13px] text-ink/80">{recommendation.reasoning}</p>
        {(recommendation.action === "increase" || recommendation.action === "decrease") && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="solid"
              size="sm"
              onClick={() => applyAdaptedTarget(recommendation.suggestedTarget, profile, analytics.currentWeight)}
            >
              Move target to {recommendation.suggestedTarget} kcal
            </Button>
            <span className="self-center text-[12px] text-muted">{signed(recommendation.deltaKcal)} kcal/day</span>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Calories logged</SectionTitle>
        <Chart
          series={[
            { points: intake.map((d) => ({ date: d.date, value: d.entries ? d.kcal : undefined })), color: "var(--color-energy)", kind: "bar" },
            { points: movingAverage(intake.map((d) => ({ date: d.date, value: d.entries ? d.kcal : undefined })), 7), color: "var(--color-ink)" },
          ]}
          referenceLine={settings.calorieTarget}
          referenceLabel="target"
          yMin={0}
        />
        <p className="text-[12px] text-muted">Bars are daily intake, the line is the 7-day average. Days with no log are left blank rather than counted as zero.</p>
      </Card>

      <Card>
        <SectionTitle>Weight trend</SectionTitle>
        <Chart
          series={[
            { points: trend.map((p) => ({ date: p.date, value: p.weight })), color: "var(--color-muted)", kind: "dots" },
            { points: trend.map((p) => ({ date: p.date, value: p.trend })), color: "var(--color-carb)" },
          ]}
          referenceLine={profile.targetWeightKg}
          referenceLabel="goal"
        />
        <dl className="grid grid-cols-3 gap-2 text-[13px]">
          <Stat label="Trend now" value={`${kg(analytics.currentWeight)} kg`} />
          <Stat label="Rate" value={analytics.slope !== undefined ? formatRate(analytics.slope) : "—"} />
          <Stat label="To goal" value={analytics.weeksToTarget !== undefined ? `${analytics.weeksToTarget} wk` : "—"} />
        </dl>
      </Card>

      <Card>
        <SectionTitle>Macros</SectionTitle>
        <Chart
          series={[
            { points: movingAverage(intake.map((d) => ({ date: d.date, value: d.entries ? d.protein : undefined })), 7), color: "var(--color-protein)" },
            { points: movingAverage(intake.map((d) => ({ date: d.date, value: d.entries ? d.carbs : undefined })), 7), color: "var(--color-carb)" },
            { points: movingAverage(intake.map((d) => ({ date: d.date, value: d.entries ? d.fat : undefined })), 7), color: "var(--color-fat)" },
          ]}
          yMin={0}
        />
        <div className="flex gap-4 text-[12px] text-muted">
          <Legend color="var(--color-protein)" label="Protein" />
          <Legend color="var(--color-carb)" label="Carbs" />
          <Legend color="var(--color-fat)" label="Fat" />
        </div>
      </Card>

      <Card>
        <SectionTitle>This week</SectionTitle>
        <p className="text-[13px] text-ink/80">{report.headline}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
          <Stat label="Average intake" value={`${kcal(report.meanKcal)} kcal`} />
          <Stat label="Target" value={`${kcal(report.targetKcal)} kcal`} />
          <Stat label="Protein" value={`${grams(report.meanProtein)} g`} />
          <Stat label="Fibre" value={`${grams(report.meanFiber)} g`} />
          <Stat label="Days logged" value={`${report.loggedDays} / 7`} />
          <Stat label="Within 10% of target" value={`${report.adherence}%`} />
          <Stat label="Weight change" value={report.weightChange !== undefined ? `${signed(report.weightChange, 2)} kg` : "—"} />
          <Stat label="Maintenance" value={report.estimatedTdee ? `${kcal(report.estimatedTdee)} kcal` : "not yet"} />
        </dl>
      </Card>

      {settings.showMicros && (
        <Card>
          <SectionTitle>Micronutrients today</SectionTitle>
          {today ? <MicroPanel logs={today.logs} totals={today.micros} sex={profile.sex} /> : null}
        </Card>
      )}

      <Banner>
        Every number here is an estimate built on food labels, portion guesses and a scale. Use the direction it points
        in, not the third decimal place.
      </Banner>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-0.5 w-4" style={{ background: color }} />
      {label}
    </span>
  );
}

/** Centred-trailing moving average that ignores missing days instead of dragging the line to zero. */
function movingAverage(points: { date: string; value?: number }[], window: number) {
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1).filter((s) => s.value !== undefined);
    if (slice.length < Math.min(3, window)) return { date: p.date, value: undefined };
    return { date: p.date, value: Math.round(slice.reduce((a, s) => a + (s.value ?? 0), 0) / slice.length) };
  });
}
