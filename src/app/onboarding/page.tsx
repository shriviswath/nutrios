"use client";

import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default function OnboardingPage() {
  const router = useRouter();
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-[24px] font-semibold tracking-tight">Set up your diary</h1>
        <p className="text-[14px] text-muted">
          Six numbers now, and the app can estimate what you burn. After a couple of weeks of logging it stops guessing
          and starts measuring — your real maintenance calories come out of your intake and your weight trend, not a
          formula.
        </p>
        <p className="text-[13px] text-muted">
          Everything stays in this browser. No account, no server, nothing uploaded.
        </p>
      </header>
      <ProfileForm submitLabel="Start tracking" onSaved={() => router.replace("/")} />
    </div>
  );
}
