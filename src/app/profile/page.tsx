"use client";

import { useEffect, useRef, useState } from "react";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { Banner, Button, Card, SectionTitle } from "@/components/ui/primitives";
import { useAnalytics, useLatestWeight, useProfile, useSettings } from "@/lib/hooks";
import { downloadBackup, importBackup, wipeEverything } from "@/lib/db/backup";
import { db, reinstallSeedFoods, countFoods } from "@/lib/db/db";
import { isOfflineEnabled, setOfflineEnabled, unregisterEverything } from "@/lib/services/offline";
import { kcal } from "@/lib/utils/format";

export default function ProfilePage() {
  const profile = useProfile();
  const settings = useSettings();
  const latestWeight = useLatestWeight();
  const analytics = useAnalytics();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [foodCount, setFoodCount] = useState<number | null>(null);

  useEffect(() => {
    setOffline(isOfflineEnabled());
    countFoods().then(setFoodCount);
  }, []);

  if (!profile || !settings) return <p className="py-10 text-center text-[13px] text-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight">Profile</h1>
        <p className="text-[13px] text-muted">
          Targets update the moment you change something here.
          {analytics?.estimate.ready ? ` Current maintenance estimate: ${kcal(analytics.estimate.value)} kcal.` : ""}
        </p>
      </header>

      <ProfileForm
        profile={profile}
        currentWeight={latestWeight?.weightKg}
        submitLabel="Save changes"
        onSaved={() => setStatus("Profile saved.")}
      />

      <Card>
        <SectionTitle>Display</SectionTitle>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={settings.showMicros}
            onChange={(e) => db.settings.update("settings", { showMicros: e.target.checked })}
          />
          Show micronutrients in Insights
        </label>
      </Card>

      <Card>
        <SectionTitle>Offline mode</SectionTitle>
        <label className="flex items-start gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={offline}
            onChange={async (e) => {
              setOffline(e.target.checked);
              await setOfflineEnabled(e.target.checked);
              setStatus(e.target.checked ? "Offline cache enabled." : "Offline cache removed.");
            }}
          />
          <span>
            Cache the app itself so it opens without a connection. Your diary already works offline either way — this
            only covers the page and its scripts. Turn it off and reload if the app ever starts behaving strangely
            after an update.
          </span>
        </label>
        <div className="mt-3">
          <Button
            size="sm"
            onClick={async () => {
              await unregisterEverything();
              setStatus("Offline cache and service workers cleared. Reload to fetch a fresh copy.");
            }}
          >
            Clear cached app files
          </Button>
        </div>
      </Card>

      <Card>
        <SectionTitle>Your data</SectionTitle>
        <p className="text-[13px] text-muted">
          Everything lives in this browser's storage. Clearing site data wipes it, so export a backup now and then —
          especially before switching phones.
        </p>
        <div className="mt-3 mb-3 flex items-center gap-3 rounded-lg border border-line bg-sunken px-3 py-2.5">
          <div className="flex-1">
            <p className="text-[13px] font-medium">Food list</p>
            <p className="text-[12px] text-muted">
              {foodCount !== null ? (
                foodCount < 247
                  ? <span className="text-warn">{foodCount} foods on device — this build ships 247. Tap Reinstall to sync.</span>
                  : <span>{foodCount} foods on device.</span>
              ) : "Counting…"}
            </p>
          </div>
          <Button
            size="sm"
            onClick={async () => {
              const n = await reinstallSeedFoods();
              setFoodCount(n);
              setStatus(`Food list reinstalled — ${n} foods available.`);
            }}
          >
            Reinstall
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => downloadBackup()}>Export backup</Button>
          <Button onClick={() => fileRef.current?.click()}>Restore backup</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm("Delete the profile, diary, weights and custom foods on this device? This cannot be undone.")) return;
              await wipeEverything();
              location.href = "/onboarding";
            }}
          >
            Erase everything
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!confirm("Restoring replaces everything currently on this device. Continue?")) return;
            const result = await importBackup(file);
            setStatus(result.message);
            e.target.value = "";
          }}
        />
        {status && (
          <div className="mt-3">
            <Banner tone="ok">{status}</Banner>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>How the numbers work</SectionTitle>
        <ul className="space-y-2 text-[13px] text-muted">
          <li>
            Resting rate uses Mifflin-St Jeor; the activity multiplier is only a starting point and is replaced by a
            measured estimate once you have around two weeks of logs and weigh-ins.
          </li>
          <li>
            Maintenance is derived from energy balance: average intake minus the energy implied by your trend weight
            moving, at 7,700 kcal per kilogram.
          </li>
          <li>
            Target changes are capped at 200 kcal and held for at least a week, so noise in the scale cannot push your
            target around.
          </li>
          <li>
            Training calories are estimated from MET values and are never added back to your food target.
          </li>
        </ul>
      </Card>

      <Banner>
        This app is a calculator and a diary, not medical advice. If you have a health condition, are pregnant, or are
        working with a doctor or dietitian, follow their targets rather than these.
      </Banner>
    </div>
  );
}
