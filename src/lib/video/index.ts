import { env } from "../env";
import { localVideo } from "./local";
import { bunnyVideo } from "./bunny";
import type { VideoProvider } from "./types";

export * from "./types";

/**
 * Resolve the active video provider from VIDEO_PROVIDER.
 *
 * `bunny` is production: browser-direct TUS upload, iframe playback.
 * `local` stays for development so the app runs with no Bunny credentials —
 * it stores the file on disk and plays it in a plain <video>.
 */
function resolveVideoProvider(): VideoProvider {
  switch (env.VIDEO_PROVIDER) {
    case "bunny":
      return bunnyVideo;
    case "local":
    default:
      return localVideo;
  }
}

export const videoProvider: VideoProvider = resolveVideoProvider();
