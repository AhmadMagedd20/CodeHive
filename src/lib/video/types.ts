import type { VideoStatus } from "@prisma/client";

/**
 * Provider-agnostic video hosting. A real service (Cloudflare Stream, Bunny,
 * Mux, …) implements this and is selected via VIDEO_PROVIDER — the player, the
 * upload flow, and progress tracking never change.
 *
 * NOTE (PROJECT.md Phase 2): the only implementation today is `local`, a
 * placeholder that stores the raw file and streams it via a signed URL. It does
 * NOT do adaptive bitrate or chapter markers — both will matter for the ~2h
 * lectures once a real provider is chosen, but are intentionally out of scope
 * now.
 */

export interface UploadVideoInput {
  data: Buffer;
  filename: string;
  contentType: string;
}

export interface UploadedVideo {
  provider: string;
  /** The id/handle the provider uses to reference this asset. */
  providerAssetId: string;
  /** Local provider only: the storage object key. */
  storageKey?: string;
  status: VideoStatus;
  durationSeconds?: number;
}

export interface VideoAssetRef {
  provider?: string | null;
  providerAssetId?: string | null;
  storageKey?: string | null;
}

export interface VideoProvider {
  readonly name: string;
  upload(input: UploadVideoInput): Promise<UploadedVideo>;
  /** A URL the <video> element can stream from (signed / short-lived). */
  getStreamUrl(asset: VideoAssetRef, opts?: { expiresInSeconds?: number }): Promise<string>;
  getStatus(asset: VideoAssetRef): Promise<VideoStatus>;
}
