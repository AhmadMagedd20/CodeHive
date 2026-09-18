"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches failures in the root layout itself, where the
 * normal `error.tsx` can't render because the layout it lives inside is the
 * thing that broke.
 *
 * It must ship its own <html>/<body>, and it cannot rely on the app's fonts or
 * design tokens loading — so the brand palette is inlined literally rather
 * than via Tailwind classes.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7F7F5",
          color: "#151313",
          fontFamily: "Inter Tight, Helvetica, Arial, sans-serif",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
            background: "#FFFFFF",
            border: "2px solid #151313",
            borderRadius: 24,
            padding: 40,
          }}
        >
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>
            Cohort Portal is temporarily unavailable
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(21,19,19,0.6)", marginTop: 12 }}>
            Something failed at the very top of the app. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 28,
              cursor: "pointer",
              background: "#FF5734",
              color: "#FFFFFF",
              border: "2px solid #151313",
              borderRadius: 999,
              padding: "12px 28px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Reload
          </button>
          {error.digest && (
            <p style={{ marginTop: 24, fontSize: 11, color: "rgba(21,19,19,0.4)" }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
