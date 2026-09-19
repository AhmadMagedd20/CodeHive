import type { VideoStatus } from "@prisma/client";
import { env } from "../env";
import type { UploadVideoInput, UploadedVideo, VideoAssetRef, VideoProvider } from "./types";

/**
 * YouTube video provider — free hosting for lecture video.
 *
 * There is no upload API here on purpose. The instructor uploads to their own
 * YouTube channel as **Unlisted**, then pastes the link into the lesson; we
 * store only the 11-character video id. That makes this the simplest possible
 * provider: no API keys, no transcoding to poll, no bandwidth bill.
 *
 * === The trade, stated plainly =============================================
 * An unlisted video is readable by ANYONE who has the link, forever. There is
 * no token, no expiry, and no way to revoke access short of deleting the video.
 * Chosen deliberately (instructor's decision, 2026-09-19): a shared lecture is
 * treated as marketing rather than loss.
 *
 * If that ever stops being true, `bunny.ts` implements the same interface with
 * expiring signed embeds — switching is a VIDEO_PROVIDER change plus re-hosting
 * the videos.
 * ==========================================================================
 */

/** `youtube-nocookie` still plays fine and sets no tracking cookie until play. */
const EMBED_HOST = "https://www.youtube-nocookie.com/embed";

const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Pull the video id out of whatever the instructor pasted — a full watch URL,
 * a share link, an embed URL, a Shorts link, or the bare id.
 * Returns null if there's nothing that looks like an id.
 */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (ID.test(s)) return s;

  let url: URL;
  try {
    url = new URL(s.startsWith("http") ? s : `https://${s}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  // youtu.be/<id>
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return ID.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    // /watch?v=<id>
    const v = url.searchParams.get("v");
    if (v && ID.test(v)) return v;
    // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
    const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
  }
  return null;
}

/**
 * Build the embed URL for a YouTube id.
 *
 * Exported so the public free-lesson page uses exactly these rules rather than
 * assembling its own iframe src — the embed host and the privacy/branding
 * parameters should have one definition, not two that drift.
 *
 * `jsApi` is opt-in because it only exists to let `youtube-player.tsx` attach
 * the IFrame API for progress tracking. A public page with no account has no
 * progress to record, so it has no reason to ask for the extra surface.
 */
export function youtubeEmbedUrl(id: string, { jsApi = false } = {}): string {
  const p = new URLSearchParams({
    // Keep end-screen suggestions to this channel rather than the whole of
    // YouTube, so a lesson doesn't end by recommending someone else's course.
    rel: "0",
    modestbranding: "1",
    // iOS plays inline instead of hijacking the screen with its own player.
    playsinline: "1",
  });
  if (jsApi) {
    p.set("enablejsapi", "1");
    p.set("origin", env.APP_URL);
  }
  return `${EMBED_HOST}/${id}?${p.toString()}`;
}

export const youtubeVideo: VideoProvider = {
  name: "youtube",
  playback: "youtube",

  async upload(_input: UploadVideoInput): Promise<UploadedVideo> {
    throw new Error(
      "YouTube videos aren't uploaded through the app. Upload to your channel as Unlisted, " +
        "then paste the link into the lesson.",
    );
  },

  async getStreamUrl(asset: VideoAssetRef) {
    const id = asset.providerAssetId;
    if (!id) throw new Error("YouTube video asset has no providerAssetId");
    // jsApi: lesson playback tracks progress through the IFrame API.
    return youtubeEmbedUrl(id, { jsApi: true });
  },

  /** Nothing to transcode or wait for — a pasted id is immediately playable. */
  async getStatus(_asset: VideoAssetRef): Promise<VideoStatus> {
    return "READY";
  },
};
