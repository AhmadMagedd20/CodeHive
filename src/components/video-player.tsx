"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
}: {
  src: string;
  watermark: string;
  lessonItemId: string;
  initialPosition: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxPercentRef = useRef(0);
  const lastSentRef = useRef(0);
  const [wmPos, setWmPos] = useState({ top: "12%", left: "8%" });

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
    const onPause = () => report();
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    v.addEventListener("pause", onPause);

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
      window.removeEventListener("beforeunload", onUnload);
      clearInterval(wm);
      report();
    };
  }, [report]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-black" onContextMenu={(e) => e.preventDefault()}>
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        className="aspect-video w-full"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute select-none whitespace-nowrap text-[11px] font-medium text-white/40 mix-blend-difference transition-all duration-1000"
        style={{ top: wmPos.top, left: wmPos.left }}
      >
        {watermark} · {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
