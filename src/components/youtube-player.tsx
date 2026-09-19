"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * YouTube playback for a lesson.
 *
 * The embed URL comes from the provider (`lib/video/youtube.ts`), so this
 * component never needs to know the video id. Progress tracking is preserved
 * through YouTube's IFrame API, which attaches to an existing `<iframe>` when
 * it carries `enablejsapi=1` — so completion, dashboard percentages and
 * assignment gating behave exactly as they did with the old `<video>`.
 *
 * There is no watermark and no expiring link: an unlisted video is viewable by
 * anyone holding the URL. That is a deliberate trade, not an oversight — see
 * the note in `lib/video/youtube.ts`.
 */

const IFRAME_API = "https://www.youtube.com/iframe_api";

/** Only the members we use; the API surface is far larger. */
type YTPlayer = {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLIFrameElement,
        opts: {
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

/** Load the IFrame API once per page, however many players mount. */
function loadIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve, reject) => {
    // YouTube calls this global once the script is ready; chain it so we don't
    // clobber another listener if one already exists.
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = IFRAME_API;
    s.async = true;
    s.onerror = () => reject(new Error("Could not load the YouTube player API"));
    document.head.appendChild(s);
  });
  return apiPromise;
}

export function YouTubePlayer({
  src,
  lessonItemId,
  initialPosition,
  title,
}: {
  /** Embed URL from the provider, already carrying enablejsapi=1. */
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
    let poll: ReturnType<typeof setInterval> | undefined;
    let detach: (() => void) | undefined;

    loadIframeApi()
      .then(() => {
        if (cancelled || !frameRef.current || !window.YT) return;

        const player = new window.YT.Player(frameRef.current, {
          events: {
            onReady: ({ target }) => {
              // Resume where they left off, as the old player did.
              if (initialPosition > 2) target.seekTo(initialPosition, true);
            },
            onStateChange: ({ data, target }) => {
              const S = window.YT!.PlayerState;
              if (data === S.ENDED) {
                positionRef.current = target.getCurrentTime();
                maxPercentRef.current = 100;
                report(true);
                return;
              }
              // The API has no timeupdate event, so sample while playing.
              clearInterval(poll);
              if (data === S.PLAYING) {
                poll = setInterval(() => {
                  const seconds = target.getCurrentTime();
                  const duration = target.getDuration();
                  positionRef.current = seconds;
                  if (duration > 0) {
                    maxPercentRef.current = Math.max(
                      maxPercentRef.current,
                      Math.min(100, (seconds / duration) * 100),
                    );
                  }
                  if (seconds - lastSentRef.current > 15) {
                    lastSentRef.current = seconds;
                    report(false);
                  }
                }, 1000);
              } else if (data === S.PAUSED) {
                report(false);
              }
            },
          },
        });
        void player;

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
      clearInterval(poll);
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
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="block aspect-video w-full border-0"
      />
    </div>
  );
}
