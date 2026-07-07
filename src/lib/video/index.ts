import { env } from "../env";
import { localVideo } from "./local";
import type { VideoProvider } from "./types";

export * from "./types";

/**
 * Resolve the active video provider from VIDEO_PROVIDER. Only "local" exists
 * today (placeholder — see PROJECT.md Phase 2). Add real providers here.
 */
function resolveVideoProvider(): VideoProvider {
  switch (env.VIDEO_PROVIDER) {
    case "local":
    default:
      return localVideo;
  }
}

export const videoProvider: VideoProvider = resolveVideoProvider();
