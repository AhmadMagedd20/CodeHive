"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Bunny Stream playback.
 *
 * The video is Bunny's own embedded player in an iframe, reached through a
 * token-authenticated URL that expires. Progress tracking is preserved via the
 * player.js protocol, which Bunny supports over postMessage — so completion,
 * dashboard percentages and assignment gating behave exactly as they did with
 * the old <video> element.
 *
 * There is deliberately **no watermark overlay**. That was a considered call:
 * a leaked lecture is acceptable, so the identifying overlay was dropped rather
 * than reimplemented on top of the iframe.
 *
 * Protection now comes from Bunny instead of from us: expiring signed embed
 * links, referrer/domain allowlisting configured on the library, and the
 * player's own download control.
 */

const PLAYERJS_SRC = "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js";

type PlayerJs = {
  on(event: string, cb: (data?: { seconds?: number; duration?: number }) => void): void;
  setCurrentTime(seconds: number): void;
};

declare global {
  interface Window {
    playerjs?: { Player: new (el: HTMLIFrameElement) => PlayerJs };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Load player.js once per page, no matter how many players mount. */
function loadPlayerJs(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.playerjs) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = PLAYERJS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the Bunny player API"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function BunnyPlayer({
  src,
  lessonItemId,
  initialPosition,
  title,
}: {
  /** Token-authenticated embed URL from the provider. */
  src: string;
  lessonItemId: string;
  initialPosition: number;
  title: string;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const maxPercentRef = useRef(0);
  const lastSentRef = useRef(0);
  const positionRef = useRef(0);

  const report = useCallback(
    (completed = false) => {
      if (!positionRef.current && !completed) return;
      navigator.sendBeacon?.(
        "/api/progress",
        new Blob(
          [
            JSON.stringify({
              lessonItemId,
              positionSeconds: positionRef.current,
              watchedPercent: maxPercentRef.current,
              completed,
            }),
          ],
          { type: "application/json" },
        ),
      );
    },
    [lessonItemId],
  );

  useEffect(() => {
    let cancelled = false;
    let detach: (() => void) | undefined;

    loadPlayerJs()
      .then(() => {
        if (cancelled || !frameRef.current || !window.playerjs) return;
        const player = new window.playerjs.Player(frameRef.current);

        player.on("ready", () => {
          // Resume where they left off, same as the old player did.
          if (initialPosition > 2) player.setCurrentTime(initialPosition);
        });

        player.on("timeupdate", (d) => {
          const seconds = d?.seconds ?? 0;
          const duration = d?.duration ?? 0;
          positionRef.current = seconds;
          if (duration > 0) {
            maxPercentRef.current = Math.max(
              maxPercentRef.current,
              Math.min(100, (seconds / duration) * 100),
            );
          }
          // Throttle to ~1 write per 15s of playback.
          if (seconds - lastSentRef.current > 15) {
            lastSentRef.current = seconds;
            report(false);
          }
        });

        player.on("ended", () => report(true));

        const onHide = () => report(false);
        document.addEventListener("visibilitychange", onHide);
        window.addEventListener("pagehide", onHide);
        detach = () => {
          document.removeEventListener("visibilitychange", onHide);
          window.removeEventListener("pagehide", onHide);
        };
      })
      .catch(() => {
        /* The video still plays; only progress tracking is lost. */
      });

    return () => {
      cancelled = true;
      detach?.();
      report(false);
    };
  }, [initialPosition, report]);

  return (
    <div className="overflow-hidden rounded-2xl border-brutal border-ink bg-ink">
      <iframe
        ref={frameRef}
        src={src}
        title={title}
        loading="lazy"
        // strict-origin-when-cross-origin keeps the Referer header intact so
        // Bunny's domain allowlist can actually see where the embed is running.
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        className="block aspect-video w-full border-0"
      />
    </div>
  );
}
