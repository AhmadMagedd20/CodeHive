import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { videoProvider } from "@/lib/video";
import type { VideoStatus } from "@prisma/client";

/**
 * The landing hero's preview video — a PUBLIC marketing asset.
 *
 * Deliberately separate from course content: no watermark, no single-session
 * check, no gating, no download blocking. It's meant to be shown off freely to
 * anonymous visitors. It only borrows the VideoProvider for upload/streaming
 * mechanics so swapping hosts later changes nothing here.
 */
export interface HeroVideo {
  src: string;
  poster: string | null;
  status: VideoStatus;
}

/**
 * Resolve the hero video for public rendering. Returns null when nothing has
 * been uploaded yet (or it isn't READY), so the hero shows its static mock
 * instead of a broken player.
 */
export async function getHeroVideo(): Promise<HeroVideo | null> {
  const instructor = await prisma.instructor.findFirst({
    where: { heroVideoAssetId: { not: null } },
    orderBy: { createdAt: "asc" },
    select: {
      heroVideoProvider: true,
      heroVideoAssetId: true,
      heroVideoStorageKey: true,
      heroVideoStatus: true,
      heroPoster: { select: { storageKey: true } },
    },
  });
  if (!instructor?.heroVideoAssetId || instructor.heroVideoStatus !== "READY") return null;

  try {
    const src = await videoProvider.getStreamUrl(
      {
        provider: instructor.heroVideoProvider ?? videoProvider.name,
        providerAssetId: instructor.heroVideoAssetId,
        storageKey: instructor.heroVideoStorageKey,
      },
      // Long-lived by design: this is public marketing, not protected content.
      { expiresInSeconds: 60 * 60 * 24 },
    );
    const poster = instructor.heroPoster
      ? await storage.getUrl(instructor.heroPoster.storageKey, {
          expiresInSeconds: 60 * 60 * 24,
        })
      : null;
    return { src, poster, status: instructor.heroVideoStatus };
  } catch {
    // A missing/unreadable object shouldn't take the landing page down.
    return null;
  }
}
