"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";

/**
 * The landing hero's real preview player.
 *
 * Public marketing asset: plain <video>, no watermark, no download blocking, no
 * session checks — the opposite of the course player by design (see PROJECT.md).
 * Keeps the hero's designed chrome (caption strip, progress bar, replay pill)
 * and just makes it functional.
 *
 * Motion: muted autoplay once it scrolls into view, matching the page's other
 * scroll-reveal behaviour, with a visible unmute control. Under
 * `prefers-reduced-motion` nothing autoplays — it waits for a click.
 */
export function HeroPlayer({ src, poster }: { src: string; poster: string | null }) {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  // Autoplay (muted) when the player scrolls into view; pause when it leaves so
  // an off-screen video isn't burning bandwidth. Disabled for reduced motion.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduce) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void el.play().catch(() => {
            /* autoplay can still be refused — the play button remains */
          });
        } else if (!el.paused) {
          el.pause();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  const toggle = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  }, []);

  const seek = useCallback((clientX: number) => {
    const el = videoRef.current;
    const bar = barRef.current;
    if (!el || !bar || !el.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.currentTime = ratio * el.duration;
  }, []);

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-ink">
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        muted={muted}
        playsInline
        loop
        preload="metadata"
        aria-label="Course preview"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress((el.currentTime / el.duration) * 100);
        }}
        className="h-full w-full cursor-pointer object-cover"
      />

      {/* Play / pause — the same flame affordance the mock used. Hidden while
          playing so it doesn't sit on top of the footage. */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause preview" : "Play preview"}
        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          playing ? "opacity-0 hover:opacity-100 focus-visible:opacity-100" : "opacity-100"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-flame text-white shadow-soft">
          {playing ? (
            <Pause className="h-6 w-6 fill-current" />
          ) : (
            <Play className="ml-0.5 h-6 w-6 fill-current" />
          )}
        </span>
      </button>

      {/* Mute toggle — required because we autoplay muted. */}
      <button
        type="button"
        onClick={() => {
          const el = videoRef.current;
          const next = !muted;
          setMuted(next);
          if (el) el.muted = next;
        }}
        aria-label={muted ? "Unmute preview" : "Mute preview"}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/65"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* Caption strip + real progress bar (was a static 92% fill). */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3">
        <div
          ref={barRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          onClick={(e) => seek(e.clientX)}
          onKeyDown={(e) => {
            const el = videoRef.current;
            if (!el || !el.duration) return;
            if (e.key === "ArrowRight") el.currentTime = Math.min(el.duration, el.currentTime + 5);
            if (e.key === "ArrowLeft") el.currentTime = Math.max(0, el.currentTime - 5);
          }}
          className="pointer-events-auto h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-white/20"
        >
          <div
            className="h-full rounded-full bg-flame transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/70">
          <span>Lecture 6 — the one before the exam</span>
          <button
            type="button"
            onClick={() => {
              const el = videoRef.current;
              if (!el) return;
              el.currentTime = 0;
              void el.play().catch(() => {});
            }}
            className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 font-medium text-white transition-colors hover:bg-white/25"
          >
            <RotateCcw className="h-2.5 w-2.5" /> Rewatch
          </button>
        </div>
      </div>
    </div>
  );
}
