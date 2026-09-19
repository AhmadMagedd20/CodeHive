import { env } from "../env";
import { localVideo } from "./local";
import { bunnyVideo } from "./bunny";
import { youtubeVideo } from "./youtube";
import type { VideoProvider } from "./types";

export * from "./types";

/**
 * Resolve the active video provider from VIDEO_PROVIDER.
 *
 * `youtube` is production: unlisted videos on the instructor's own channel,
 * pasted in by link. Free, no upload API, no expiring tokens.
 * `bunny` is the paid alternative: browser-direct TUS upload, expiring embeds.
 * `local` stays for development so the app runs with no Bunny credentials —
 * it stores the file on disk and plays it in a plain <video>.
 */
function resolveVideoProvider(): VideoProvider {
  switch (env.VIDEO_PROVIDER) {
    case "youtube":
      return youtubeVideo;
    case "bunny":
      return bunnyVideo;
    case "local":
    default:
      return localVideo;
  }
}

export const videoProvider: VideoProvider = resolveVideoProvider();
