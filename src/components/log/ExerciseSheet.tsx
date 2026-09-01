"use client";

import { useState } from "react";
import { Banner, Button, Field, Sheet } from "@/components/ui/primitives";
import { ACTIVITIES, netExerciseKcal } from "@/lib/nutrition/exercise";
import { addExercise } from "@/lib/db/repo";
import { kcal } from "@/lib/utils/format";

export function ExerciseSheet({
  open,
  onClose,
  date,
  weightKg,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  weightKg: number;
}) {
  const [activityId, setActivityId] = useState(ACTIVITIES[0].id);
  const [minutes, setMinutes] = useState("30");
  const activity = ACTIVITIES.find((a) => a.id === activityId)!;
  const estimate = netExerciseKcal(activity.met, Number(minutes) || 0, weightKg);

  return (
    <Sheet open={open} onClose={onClose} title="Log training">
      <div className="space-y-3">
        <Field label="Activity">
          <select className="field" value={activityId} onChange={(e) => setActivityId(e.target.value)}>
            {ACTIVITIES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Minutes">
          <input className="field num" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </Field>

        <div className="rounded-lg border border-line bg-sunken px-3 py-2.5">
          <p className="num text-[24px] font-medium">{kcal(estimate)} kcal</p>
          <p className="text-[12px] text-muted">
            Above resting, at {weightKg.toFixed(1)} kg and {activity.met} METs.
          </p>
        </div>

        <Banner>
          This is not added back to your food target. MET estimates run high for most people, and the adaptive
          maintenance estimate already picks up real training from your weight trend.
        </Banner>

        <Button
          variant="solid"
          className="w-full"
          disabled={!Number(minutes)}
          onClick={async () => {
            await addExercise({
              date,
              activity: activity.name,
              minutes: Number(minutes),
              kcal: estimate,
              source: "estimated",
            });
            onClose();
          }}
        >
          Save session
        </Button>
      </div>
    </Sheet>
  );
}
