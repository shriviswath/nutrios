"use client";

import { useMemo, useState } from "react";
import { Banner, Button, Card, Field, SectionTitle, Segmented } from "@/components/ui/primitives";
import { saveProfile, saveWeight } from "@/lib/db/repo";
import { ACTIVITY_LEVELS, type ActivityLevel, type Goal, type Profile, type Sex } from "@/lib/types";
import { computeCalorieTarget, computeMacroTargets, macroPercentages } from "@/lib/nutrition/energy";
import { grams, kcal } from "@/lib/utils/format";
import { dateKey } from "@/lib/utils/date";

interface Draft {
  name: string;
  age: string;
  sex: Sex;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  goal: Goal;
  activityLevel: ActivityLevel;
  rateKgPerWeek: string;
  dietaryPreference: string;
  macroMode: Profile["macroMode"];
  proteinPercent: string;
  carbPercent: string;
  fatPercent: string;
  calorieOverride: string;
  autoAdapt: boolean;
}

function toDraft(profile?: Profile | null, currentWeight?: number): Draft {
  return {
    name: profile?.name ?? "",
    age: profile ? String(profile.age) : "",
    sex: profile?.sex ?? "male",
    heightCm: profile ? String(profile.heightCm) : "",
    weightKg: String(currentWeight ?? profile?.startWeightKg ?? ""),
    targetWeightKg: profile ? String(profile.targetWeightKg) : "",
    goal: profile?.goal ?? "lose",
    activityLevel: profile?.activityLevel ?? "light",
    rateKgPerWeek: profile ? String(profile.rateKgPerWeek) : "0.4",
    dietaryPreference: profile?.dietaryPreference ?? "",
    macroMode: profile?.macroMode ?? "auto",
    proteinPercent: String(profile?.proteinPercent ?? 30),
    carbPercent: String(profile?.carbPercent ?? 45),
    fatPercent: String(profile?.fatPercent ?? 25),
    calorieOverride: profile?.calorieOverride ? String(profile.calorieOverride) : "",
    autoAdapt: profile?.autoAdapt ?? true,
  };
}

export function ProfileForm({
  profile,
  currentWeight,
  submitLabel,
  onSaved,
}: {
  profile?: Profile | null;
  currentWeight?: number;
  submitLabel: string;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(profile, currentWeight));
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const built = useMemo(() => buildProfile(draft, profile), [draft, profile]);
  const preview = useMemo(() => {
    if (!built) return null;
    const weight = Number(draft.weightKg);
    const target = computeCalorieTarget(built, weight);
    const calories = built.calorieOverride ?? target.calorieTarget;
    const macros = computeMacroTargets(built, calories, weight);
    return { target, calories, macros, percents: macroPercentages(macros, calories) };
  }, [built, draft.weightKg]);

  const submit = async () => {
    if (!built) return setError("Fill in name, age, height, weight and goal weight.");
    setError(null);
    await saveProfile(built, Number(draft.weightKg));
    if (!profile) await saveWeight(dateKey(), Number(draft.weightKg));
    onSaved();
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>About you</SectionTitle>
        <div className="space-y-3">
          <Field label="Name">
            <input className="field" value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="What should the app call you?" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <input className="field num" inputMode="numeric" value={draft.age} onChange={(e) => set("age", e.target.value)} />
            </Field>
            <Field label="Sex" hint="Used by the BMR formula">
              <Segmented
                value={draft.sex}
                onChange={(v) => set("sex", v)}
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                ]}
              />
            </Field>
            <Field label="Height (cm)">
              <input className="field num" inputMode="decimal" value={draft.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
            </Field>
            <Field label="Weight (kg)">
              <input className="field num" inputMode="decimal" value={draft.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Goal</SectionTitle>
        <div className="space-y-3">
          <Segmented
            value={draft.goal}
            onChange={(v) => set("goal", v)}
            options={[
              { value: "lose", label: "Lose" },
              { value: "maintain", label: "Maintain" },
              { value: "gain", label: "Gain" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Goal weight (kg)">
              <input className="field num" inputMode="decimal" value={draft.targetWeightKg} onChange={(e) => set("targetWeightKg", e.target.value)} />
            </Field>
            <Field label="Rate (kg per week)" hint="0.3–0.5 suits most people">
              <input
                className="field num"
                inputMode="decimal"
                value={draft.rateKgPerWeek}
                onChange={(e) => set("rateKgPerWeek", e.target.value)}
                disabled={draft.goal === "maintain"}
              />
            </Field>
          </div>
          <Field label="Activity level" hint="A starting point only — the app measures your real expenditure later">
            <select className="field" value={draft.activityLevel} onChange={(e) => set("activityLevel", e.target.value as ActivityLevel)}>
              {Object.entries(ACTIVITY_LEVELS).map(([key, v]) => (
                <option key={key} value={key}>
                  {v.label} — {v.hint}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dietary preference" hint="Optional. Only used to label foods.">
            <input className="field" value={draft.dietaryPreference} onChange={(e) => set("dietaryPreference", e.target.value)} placeholder="Vegetarian, eggetarian, no beef…" />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionTitle>Macros</SectionTitle>
        <Segmented
          value={draft.macroMode}
          onChange={(v) => set("macroMode", v)}
          options={[
            { value: "auto", label: "Automatic" },
            { value: "percent", label: "By percentage" },
          ]}
        />
        {draft.macroMode === "percent" && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Field label="Protein %">
              <input className="field num" inputMode="numeric" value={draft.proteinPercent} onChange={(e) => set("proteinPercent", e.target.value)} />
            </Field>
            <Field label="Carbs %">
              <input className="field num" inputMode="numeric" value={draft.carbPercent} onChange={(e) => set("carbPercent", e.target.value)} />
            </Field>
            <Field label="Fat %">
              <input className="field num" inputMode="numeric" value={draft.fatPercent} onChange={(e) => set("fatPercent", e.target.value)} />
            </Field>
          </div>
        )}
        {draft.macroMode === "percent" &&
          Number(draft.proteinPercent) + Number(draft.carbPercent) + Number(draft.fatPercent) !== 100 && (
            <p className="mt-2 text-[12px] text-warn">
              Those add up to {Number(draft.proteinPercent) + Number(draft.carbPercent) + Number(draft.fatPercent)}%. They
              need to make 100.
            </p>
          )}
        <div className="mt-3">
          <Field label="Calorie override" hint="Leave blank to let the app set it">
            <input className="field num" inputMode="numeric" value={draft.calorieOverride} onChange={(e) => set("calorieOverride", e.target.value)} placeholder="—" />
          </Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={draft.autoAdapt} onChange={(e) => set("autoAdapt", e.target.checked)} />
          Suggest target changes once there is enough data
        </label>
      </Card>

      {preview && (
        <Card>
          <SectionTitle>What this works out to</SectionTitle>
          <dl className="grid grid-cols-2 gap-3 text-[13px]">
            <Stat label="Resting metabolic rate" value={`${kcal(preview.target.bmr)} kcal`} />
            <Stat label="Maintenance estimate" value={`${kcal(preview.target.maintenance)} kcal`} />
            <Stat label="Daily target" value={`${kcal(preview.calories)} kcal`} />
            <Stat label="Protein" value={`${grams(preview.macros.protein)} g · ${preview.percents.protein}%`} />
            <Stat label="Carbohydrate" value={`${grams(preview.macros.carbs)} g · ${preview.percents.carbs}%`} />
            <Stat label="Fat" value={`${grams(preview.macros.fat)} g · ${preview.percents.fat}%`} />
          </dl>
          {preview.target.findings.map((f, i) => (
            <div key={i} className="mt-3">
              <Banner tone="warn" title={f.level === "block" ? "Target adjusted" : "Worth knowing"}>
                {f.message}
              </Banner>
            </div>
          ))}
        </Card>
      )}

      {error && <Banner tone="warn">{error}</Banner>}

      <Button variant="solid" className="w-full" onClick={submit}>
        {submitLabel}
      </Button>
    </div>
  );
}

function buildProfile(draft: Draft, existing?: Profile | null): Profile | null {
  const age = Number(draft.age);
  const height = Number(draft.heightCm);
  const weight = Number(draft.weightKg);
  const target = Number(draft.targetWeightKg);
  if (!draft.name.trim() || !age || !height || !weight) return null;
  if (age < 13 || age > 100 || height < 100 || height > 250 || weight < 25 || weight > 400) return null;

  return {
    id: "me",
    name: draft.name.trim(),
    age,
    sex: draft.sex,
    heightCm: height,
    startWeightKg: existing?.startWeightKg ?? weight,
    targetWeightKg: target || weight,
    goal: draft.goal,
    activityLevel: draft.activityLevel,
    rateKgPerWeek: draft.goal === "maintain" ? 0 : Math.abs(Number(draft.rateKgPerWeek) || 0),
    units: "metric",
    dietaryPreference: draft.dietaryPreference.trim() || undefined,
    macroMode: draft.macroMode,
    proteinPercent: Number(draft.proteinPercent),
    carbPercent: Number(draft.carbPercent),
    fatPercent: Number(draft.fatPercent),
    calorieOverride: draft.calorieOverride ? Number(draft.calorieOverride) : null,
    autoAdapt: draft.autoAdapt,
    createdAt: existing?.createdAt ?? Date.now(),
    onboardedAt: existing?.onboardedAt ?? Date.now(),
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}
