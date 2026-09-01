import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

/*
 * Typefaces are resolved from the device rather than fetched.
 * A local-first app that blocks its first paint on a font CDN is not local-first, and the
 * numeric readouts only need a tabular monospace, which every platform already ships.
 * To use IBM Plex instead, see the note in README.md.
 */

export const metadata: Metadata = {
  title: "Nutri OS",
  description: "Local-first calorie and nutrition tracking with adaptive maintenance estimation.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Nutri OS" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eaedef" },
    { media: "(prefers-color-scheme: dark)", color: "#101619" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
