import { createHash } from "crypto";
import type { VideoStatus } from "@prisma/client";
import { env } from "../env";
import type {
  DirectUploadTicket,
  UploadVideoInput,
  UploadedVideo,
  VideoAssetRef,
  VideoProvider,
} from "./types";

/**
 * Bunny Stream video provider.
 *
 * Playback is Bunny's own embedded player in an iframe, reached through a
 * token-authenticated URL. Progress tracking still works: Bunny supports the
 * player.js protocol over postMessage (see `components/bunny-player.tsx`).
 *
 * === Upload architecture — READ BEFORE REFACTORING =========================
 * Lecture files are ~2 hours. Their bytes MUST NOT pass through this server.
 * A serverless function has a 10–60s wall clock and a hard memory ceiling; a
 * multi-GB upload through an API route fails on both. So `upload()` throws on
 * purpose, and the real path is `createDirectUpload()`:
 *
 *   1. server  — create the (empty) video object, mint a scoped TUS signature
 *   2. browser — upload bytes straight to Bunny over TUS (resumable)
 *   3. server  — record the GUID, then poll getStatus for transcoding
 *
 * Every function call stays in the milliseconds. Do not "simplify" this back
 * into an API route that accepts the file.
 * ==========================================================================
 */

const API_BASE = "https://video.bunnycdn.com";
const TUS_ENDPOINT = "https://video.bunnycdn.com/tusupload";
const PLAYER_BASE = "https://player.mediadelivery.net/embed";

/** Bunny gives uploads at least an hour so a long transfer can't outlive its signature. */
const UPLOAD_TTL_SECONDS = 6 * 60 * 60;

function config() {
  const libraryId = env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = env.BUNNY_STREAM_API_KEY;
  if (!libraryId || !apiKey) {
    throw new Error(
      "VIDEO_PROVIDER=bunny requires BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY.",
    );
  }
  return { libraryId, apiKey, tokenKey: env.BUNNY_STREAM_TOKEN_KEY };
}

const sha256Hex = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Bunny's numeric `status`, mapped onto our enum.
 * 0 Created · 1 Uploaded · 2 Processing · 3 Transcoding · 4 Finished
 * 5 Error · 6 UploadFailed · 7 JitSegmenting · 8 JitPlaylistsCreated
 *
 * Verified against the API reference — a widely-repeated blog claim that
 * "3 = Finished" is wrong and would leave every lesson stuck in processing.
 */
function mapStatus(code: number): VideoStatus {
  switch (code) {
    case 4:
    case 8:
      return "READY";
    case 5:
    case 6:
      return "ERROR";
    case 0:
      return "PENDING";
    default:
      return "PROCESSING";
  }
}

async function bunnyFetch(path: string, init: RequestInit = {}) {
  const { apiKey } = config();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { AccessKey: apiKey, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
}

export const bunnyVideo: VideoProvider = {
  name: "bunny",
  playback: "bunny",

  async upload(_input: UploadVideoInput): Promise<UploadedVideo> {
    throw new Error(
      "Bunny uploads go browser-direct over TUS, never through the server. " +
        "Use createDirectUpload() — see the note in lib/video/bunny.ts.",
    );
  },

  async createDirectUpload({ filename, contentType, title }): Promise<DirectUploadTicket> {
    const { libraryId, apiKey } = config();

    // 1. Create the empty video object so we have a GUID to sign against.
    const res = await bunnyFetch(`/library/${libraryId}/videos`, {
      method: "POST",
      body: JSON.stringify({ title: title || filename }),
    });
    if (!res.ok) {
      throw new Error(`Bunny createVideo failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    }
    const { guid } = (await res.json()) as { guid?: string };
    if (!guid) throw new Error("Bunny createVideo returned no guid");

    // 2. Mint a signature scoped to this video and expiry. SHA256 over
    //    libraryId + apiKey + expire + videoId — the API key itself never
    //    leaves the server, only this hash does.
    const expiresAt = Math.floor(Date.now() / 1000) + UPLOAD_TTL_SECONDS;
    const signature = sha256Hex(`${libraryId}${apiKey}${expiresAt}${guid}`);

    return {
      provider: "bunny",
      providerAssetId: guid,
      endpoint: TUS_ENDPOINT,
      headers: {
        AuthorizationSignature: signature,
        AuthorizationExpire: String(expiresAt),
        LibraryId: String(libraryId),
        VideoId: guid,
      },
      metadata: { filetype: contentType || "video/mp4", title: title || filename },
      expiresAt,
    };
  },

  async getStreamUrl(asset: VideoAssetRef, opts = {}) {
    const { libraryId, tokenKey } = config();
    const guid = asset.providerAssetId;
    if (!guid) throw new Error("Bunny video asset has no providerAssetId");

    const base = `${PLAYER_BASE}/${libraryId}/${guid}`;
    if (!tokenKey) return base; // token auth not enabled on the library

    // Embed token: SHA256 hex of tokenKey + videoId + expiry, passed alongside
    // the same expiry. A copied link dies when it expires.
    const expires = Math.floor(Date.now() / 1000) + (opts.expiresInSeconds ?? 3 * 60 * 60);
    const token = sha256Hex(`${tokenKey}${guid}${expires}`);
    return `${base}?token=${token}&expires=${expires}`;
  },

  async getStatus(asset: VideoAssetRef): Promise<VideoStatus> {
    const { libraryId } = config();
    const guid = asset.providerAssetId;
    if (!guid) return "PENDING";
    const res = await bunnyFetch(`/library/${libraryId}/videos/${guid}`);
    if (res.status === 404) return "ERROR";
    if (!res.ok) return "PROCESSING"; // transient API error — don't mark failed
    const body = (await res.json()) as { status?: number };
    return mapStatus(body.status ?? 0);
  },
};

/** Encoding progress 0–100, for the admin status pill. Bunny-specific. */
export async function bunnyEncodeProgress(guid: string): Promise<number | null> {
  const { libraryId } = config();
  const res = await bunnyFetch(`/library/${libraryId}/videos/${guid}`);
  if (!res.ok) return null;
  const body = (await res.json()) as { encodeProgress?: number };
  return typeof body.encodeProgress === "number" ? body.encodeProgress : null;
}
