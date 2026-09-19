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

/**
 * Everything the BROWSER needs to push bytes straight to the provider.
 *
 * Deliberately contains no API key: the signature is minted server-side and is
 * scoped to one video id and one expiry. See `createDirectUpload`.
 */
export interface DirectUploadTicket {
  provider: string;
  /** Provider handle for the new (empty) video object. */
  providerAssetId: string;
  /** TUS endpoint the browser uploads to. */
  endpoint: string;
  /** Headers the browser must echo verbatim — the signature covers them. */
  headers: Record<string, string>;
  /** TUS metadata (filetype/title/…). */
  metadata: Record<string, string>;
  /** Unix seconds; the upload must finish before this. */
  expiresAt: number;
}

/**
 * How playback is delivered, so the lesson page can pick the right component.
 * `file` -> <video>, the rest are provider-specific embeds with their own
 * progress-tracking bridge.
 */
export type PlaybackKind = "file" | "bunny" | "youtube";

export interface VideoProvider {
  readonly name: string;
  /**
   * Server-side upload. Real providers should NOT implement this — lecture
   * files are ~2h and must never pass through a serverless function. They
   * throw and expose `createDirectUpload` instead.
   */
  upload(input: UploadVideoInput): Promise<UploadedVideo>;
  /**
   * `file` → a URL for a <video> element. `iframe` → an embed URL for an
   * <iframe>. The lesson page branches on this, not on the provider name.
   */
  readonly playback: PlaybackKind;
  /** A URL to stream (file) or embed (iframe) from. Signed / short-lived. */
  getStreamUrl(asset: VideoAssetRef, opts?: { expiresInSeconds?: number }): Promise<string>;
  getStatus(asset: VideoAssetRef): Promise<VideoStatus>;
  /** Present only on providers that support browser-direct upload. */
  createDirectUpload?(input: {
    filename: string;
    contentType: string;
    title: string;
  }): Promise<DirectUploadTicket>;
}
