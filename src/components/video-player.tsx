"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play } from "lucide-react";
import { fmtTime, type Chapter } from "@/lib/chapters";

/**
 * Protected lesson video player:
 *  - dynamic watermark overlay (student name + email + live timestamp) that
 *    drifts position so it can't be reliably cropped out,
 *  - download / PiP / context-menu disabled (best-effort in-browser),
 *  - resume from last position,
 *  - tracks real watched % and reports to /api/progress.
 */
export function VideoPlayer({
  src,
  watermark,
  lessonItemId,
  initialPosition,
  chapters = [],
}: {
  src: string;
  watermark: string;
  lessonItemId: string;
  initialPosition: number;
  chapters?: Chapter[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxPercentRef = useRef(0);
  const lastSentRef = useRef(0);
  const [wmPos, setWmPos] = useState({ top: "12%", left: "8%" });
  const [playing, setPlaying] = useState(false);

  const seekTo = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = seconds;
    void v.play().catch(() => {});
  }, []);

  const report = useCallback(
    (completed = false) => {
      const v = videoRef.current;
      if (!v || !v.duration) return;
      const percent = Math.min(100, (v.currentTime / v.duration) * 100);
      maxPercentRef.current = Math.max(maxPercentRef.current, percent);
      navigator.sendBeacon?.(
        "/api/progress",
        new Blob(
          [
            JSON.stringify({
              lessonItemId,
              positionSeconds: v.currentTime,
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

  // Resume from last position once metadata is known.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      if (initialPosition > 0 && initialPosition < v.duration - 2) v.currentTime = initialPosition;
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [initialPosition]);

  // Throttled progress reporting + move the watermark periodically.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      const now = Date.now();
      if (now - lastSentRef.current > 10_000) {
        lastSentRef.current = now;
        report();
      }
    };
    const onEnded = () => report(true);
    const onPause = () => {
      setPlaying(false);
      report();
    };
    const onPlay = () => setPlaying(true);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    v.addEventListener("pause", onPause);
    v.addEventListener("play", onPlay);

    const wm = setInterval(() => {
      setWmPos({
        top: `${8 + Math.random() * 74}%`,
        left: `${5 + Math.random() * 70}%`,
      });
    }, 8000);

    const onUnload = () => report();
    window.addEventListener("beforeunload", onUnload);

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("play", onPlay);
      window.removeEventListener("beforeunload", onUnload);
      clearInterval(wm);
      report();
    };
  }, [report]);

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-card bg-black"
        onContextMenu={(e) => e.preventDefault()}
      >
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          className="aspect-video w-full"
        />
        {/* Big circular flame play affordance while paused. */}
        {!playing && (
          <button
            type="button"
            aria-label="Play"
            onClick={() => void videoRef.current?.play().catch(() => {})}
            className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/20"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-flame text-white shadow-soft">
              <Play className="ml-0.5 h-7 w-7 fill-current" />
            </span>
          </button>
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute select-none whitespace-nowrap text-[11px] font-medium text-white/40 mix-blend-difference transition-all duration-1000"
          style={{ top: wmPos.top, left: wmPos.left }}
        >
          {watermark} · {new Date().toLocaleDateString()}
        </div>
      </div>

      {chapters.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold">Chapters</p>
          <ul className="space-y-1">
            {chapters.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => seekTo(c.seconds)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-black/[0.04]"
                >
                  <span className="rounded-md bg-flame-soft px-2 py-0.5 font-mono text-xs font-semibold text-flame-strong">
                    {fmtTime(c.seconds)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{c.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
