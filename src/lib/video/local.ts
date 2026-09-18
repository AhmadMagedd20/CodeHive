import { storage, makeStorageKey } from "../storage";
import type { UploadVideoInput, UploadedVideo, VideoAssetRef, VideoProvider } from "./types";

/**
 * Local video provider (placeholder). Stores the uploaded file via the storage
 * layer and serves it through a signed media URL. Ready immediately — no
 * transcoding. Streaming download is blocked at the player/route level, not
 * here.
 */
export const localVideo: VideoProvider = {
  name: "local",
  playback: "file",

  async upload(input: UploadVideoInput): Promise<UploadedVideo> {
    const key = makeStorageKey("videos", input.filename);
    await storage.put(key, input.data, { contentType: input.contentType || "video/mp4" });
    return {
      provider: "local",
      providerAssetId: key,
      storageKey: key,
      status: "READY",
    };
  },

  async getStreamUrl(asset: VideoAssetRef, opts = {}) {
    const key = asset.storageKey ?? asset.providerAssetId;
    if (!key) throw new Error("Video asset has no storage key");
    // Short-lived signed URL; watermarking + no-download handled by the player.
    return storage.getUrl(key, { expiresInSeconds: opts.expiresInSeconds ?? 60 * 60 * 3 });
  },

  async getStatus() {
    return "READY";
  },
};
