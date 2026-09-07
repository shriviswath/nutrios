"use client";

/** Last-resort boundary for errors thrown outside the app shell (layout, providers). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: "2.5rem 1rem", maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Nutri OS could not start</h1>
        <p style={{ color: "#5f727c", marginTop: 8 }}>
          Your diary is stored in this browser and is not affected by this error.
        </p>
        <pre style={{ marginTop: 12, padding: 12, background: "#f2f5f6", borderRadius: 8, fontSize: 12, overflowX: "auto" }}>
          {error.message}
        </pre>
        <button type="button" onClick={reset} style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, border: "1px solid #d5dce0" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
