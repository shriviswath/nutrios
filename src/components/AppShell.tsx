"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useProfile } from "@/lib/hooks";

const NAV = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/log", label: "Log", icon: PlusIcon },
  { href: "/insights", label: "Insights", icon: ChartIcon },
  { href: "/progress", label: "Progress", icon: ScaleIcon },
  { href: "/profile", label: "Profile", icon: GearIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useProfile();
  const onboarding = pathname === "/onboarding";

  useEffect(() => {
    if (profile === null && !onboarding) router.replace("/onboarding");
  }, [profile, onboarding, router]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline caching is a bonus, not a requirement */
      });
    }
  }, []);

  if (profile === undefined) {
    return <div className="flex min-h-dvh items-center justify-center text-[13px] text-muted">Opening your diary…</div>;
  }

  if (onboarding) return <main className="mx-auto min-h-dvh w-full max-w-[520px] px-4 pb-16 pt-6">{children}</main>;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col">
      <main className="flex-1 px-4 pb-28 pt-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
        <ul className="mx-auto flex w-full max-w-[520px]">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? "text-ink" : "text-muted"}`}
                >
                  <Icon active={active} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}

type IconProps = { active?: boolean };
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function HomeIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" fill={active ? "currentColor" : "none"} fillOpacity={0.12} />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M4 19h16M6.5 15.5V10M11 15.5V6M15.5 15.5v-4.5M20 15.5V8" />
    </svg>
  );
}
function ScaleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 9.5a3.5 3.5 0 0 1 7 0M12 9.5V13" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M4.6 7.5l1.9 1.1M17.5 15.4l1.9 1.1M19.4 7.5l-1.9 1.1M6.5 15.4l-1.9 1.1" />
    </svg>
  );
}
