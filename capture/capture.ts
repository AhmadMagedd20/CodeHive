import { promises as fs } from "fs";
import path from "path";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * Launch-video capture pass.
 *
 * Five hero shots, nothing more — the video is 20 seconds, so a big asset
 * library would just be noise. Stills are 2560×1440 (1280×720 CSS at 2× DPR);
 * recordings come out of Playwright as VP8 .webm and are transcoded to
 * 60fps H.264 by `run.ts`.
 *
 * There is deliberately **no cursor** in any shot: Playwright doesn't paint one,
 * and a drawn-on fake pointer reads worse than clean UI in a fast cut. Clicks
 * and scrolls still happen, so state changes are real.
 */

/** Stills: 1280×720 CSS at 2× DPR → true 2560×1440 device pixels. */
const VIEWPORT = { width: 1280, height: 720 };
const SCALE = 2;

/**
 * Recordings: 1920×1080 CSS at 1× DPR.
 *
 * `recordVideo.size` sets the output canvas but does NOT scale the screencast
 * up by `deviceScaleFactor` — asking for 2560×1440 from a 1280×720 CSS viewport
 * padded the frame with backdrop and left the page in the top-left quarter.
 * Recording 1:1 at the delivery resolution is the only way to fill it.
 */
const VIDEO_VIEWPORT = { width: 1920, height: 1080 };
const VIDEO_SCALE = 1;
const VIDEO_SIZE = { ...VIDEO_VIEWPORT };

/**
 * We capture against a production build, and `next start` synthesizes
 * `x-forwarded-proto: http` on a plain connection — which makes the middleware's
 * production http→https redirect fire and the browser fail with
 * ERR_SSL_PROTOCOL_ERROR (there is no TLS listener). Presenting the header the
 * middleware expects from a real proxy is the honest fix: the app's redirect
 * behaviour stays exactly as it ships.
 */
const PROXY_HEADERS = { "x-forwarded-proto": "https" };

export type DemoIds = {
  cs3CourseId: string;
  cs3HeroLessonId: string;
  cs3GatingAssignmentLessonId: string;
  cs3LockedLessonId: string;
  cs1CourseId: string;
  cs1GradedAssignmentLessonId: string;
  cs2CourseId: string;
  gatingSubmissionId: string;
};

export type Shot = { file: string; what: string };

export async function capture(opts: {
  baseURL: string;
  outDir: string;
  rawVideoDir: string;
  ids: DemoIds;
  student: { username: string; password: string };
}): Promise<Shot[]> {
  const { baseURL, outDir, rawVideoDir, ids, student } = opts;
  const shots: Shot[] = [];

  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(rawVideoDir, { recursive: true });

  const browser = await chromium.launch({
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
      "--disable-lcd-text", // grayscale AA composites better over video
    ],
  });

  // A signed-in storage state, reused by every context so we log in once.
  const storageState = await signIn(browser, baseURL, student);

  const newContext = (video: boolean) =>
    browser.newContext({
      storageState,
      viewport: video ? VIDEO_VIEWPORT : VIEWPORT,
      deviceScaleFactor: video ? VIDEO_SCALE : SCALE,
      reducedMotion: "no-preference",
      extraHTTPHeaders: PROXY_HEADERS,
      ...(video ? { recordVideo: { dir: rawVideoDir, size: VIDEO_SIZE } } : {}),
    });

  /** Screenshot helper — always full device resolution, never the dev overlay. */
  const still = async (page: Page, file: string, what: string) => {
    await page.screenshot({ path: path.join(outDir, file), scale: "device" });
    shots.push({ file, what });
  };

  /** Record one take, then rename the webm Playwright produced. */
  const record = async (name: string, what: string, body: (page: Page) => Promise<void>) => {
    const ctx = await newContext(true);
    const page = await ctx.newPage();
    await body(page);
    const video = page.video();
    await ctx.close(); // flushes the file
    if (video) {
      const src = await video.path();
      const dest = path.join(rawVideoDir, `${name}.webm`);
      await fs.rename(src, dest);
      shots.push({ file: `${name}.mp4`, what });
    }
  };

  /* ================================================================== */
  /* 1 — The lesson player, video playing                                */
  /* ================================================================== */

  const lessonUrl = `${baseURL}/courses/${ids.cs3CourseId}/lessons/${ids.cs3HeroLessonId}`;

  {
    const ctx = await newContext(false);
    const page = await ctx.newPage();
    await gotoSettled(page, lessonUrl);
    await startVideo(page);
    await page.waitForTimeout(1200);
    await still(page, "01-lesson-player.png", "Lesson player mid-playback: video, module accordion, course progress.");
    await ctx.close();
  }

  await record("01-lesson-player", "4s — lesson playing, slow reveal of the module accordion.", async (page) => {
    await gotoSettled(page, lessonUrl);
    await startVideo(page);
    await page.waitForTimeout(4200);
  });

  /* ================================================================== */
  /* 2 — The unlock moment (the distinctive one)                         */
  /* ================================================================== */

  const lockedUrl = `${baseURL}/courses/${ids.cs3CourseId}/lessons/${ids.cs3LockedLessonId}`;
  const outlineUrl = `${baseURL}/courses/${ids.cs3CourseId}`;

  {
    const ctx = await newContext(false);
    const page = await ctx.newPage();
    await gotoSettled(page, lockedUrl);
    await still(page, "02a-locked-lesson.png", "Week 2 lesson locked: “pass the assignment in Week 1 to unlock this lecture”.");
    await gotoSettled(page, outlineUrl);
    await showWeekTwo(page);
    await still(page, "02b-locked-outline.png", "Course outline, Week 2 in its locked state (cut against 02c).");
    await exportOutlineElements(page, outDir, shots);
    await ctx.close();
  }

  // Mark the gating problem set passed — the real mechanic, not a mock.
  await passGatingAssignment(ids.gatingSubmissionId);

  {
    const ctx = await newContext(false);
    const page = await ctx.newPage();
    await gotoSettled(page, outlineUrl);
    await showWeekTwo(page);
    await still(page, "02c-unlocked-outline.png", "Identical frame after the assignment is marked passed — Week 2 open.");
    await gotoSettled(page, lockedUrl);
    await still(page, "02d-unlocked-lesson.png", "The previously locked lesson, now playable.");
    await ctx.close();
  }

  // Reset so the recording can show the transition live.
  await resetGatingAssignment(ids.gatingSubmissionId);

  await record("02-unlock-moment", "4s — locked Week 2, assignment marked passed, the week opens.", async (page) => {
    await gotoSettled(page, outlineUrl);
    await showWeekTwo(page);
    await page.waitForTimeout(1500);
    await passGatingAssignment(ids.gatingSubmissionId);
    await page.reload({ waitUntil: "networkidle" });
    await showWeekTwo(page, false);
    await page.waitForTimeout(1800);
  });

  /* ================================================================== */
  /* 3 — Code assignment → real written feedback                         */
  /* ================================================================== */

  const submitUrl = `${baseURL}/courses/${ids.cs3CourseId}/lessons/${ids.cs3GatingAssignmentLessonId}`;
  const gradedUrl = `${baseURL}/courses/${ids.cs1CourseId}/lessons/${ids.cs1GradedAssignmentLessonId}`;

  {
    const ctx = await newContext(false);
    const page = await ctx.newPage();
    await gotoSettled(page, submitUrl);
    await still(page, "03a-assignment-submit.png", "Code assignment: instructions + in-browser editor.");
    await gotoSettled(page, gradedUrl);
    await scrollToFeedback(page);
    await still(page, "03b-assignment-feedback.png", "Graded submission with a full written instructor comment.");
    await ctx.close();
  }

  await record("03-assignment-to-feedback", "4s — code editor, then the graded view with written feedback.", async (page) => {
    await gotoSettled(page, submitUrl);
    await page.waitForTimeout(1500);
    await gotoSettled(page, gradedUrl);
    await page.waitForTimeout(600);
    await smoothScroll(page, 520, 1600);
    await page.waitForTimeout(500);
  });

  /* ================================================================== */
  /* 4 — Progress & momentum (dashboard)                                 */
  /* ================================================================== */

  {
    const ctx = await newContext(false);
    const page = await ctx.newPage();
    await gotoSettled(page, `${baseURL}/dashboard`);
    await still(page, "04-dashboard-progress.png", "Dashboard: course cards with part-filled progress, next lessons, continue panel.");
    await exportElements(page, outDir, shots);
    await ctx.close();
  }

  await record("04-dashboard-filter", "4s — dashboard, category filter pill switches the card grid.", async (page) => {
    await gotoSettled(page, `${baseURL}/dashboard`);
    await page.waitForTimeout(1200);
    const pill = page.getByRole("button", { name: "Data Structures", exact: true });
    if (await pill.count()) await pill.first().click();
    await page.waitForTimeout(1400);
    const all = page.getByRole("button", { name: "All courses", exact: true });
    if (await all.count()) await all.first().click();
    await page.waitForTimeout(1200);
  });

  /* ================================================================== */
  /* 5 — Catalog / course cards                                          */
  /* ================================================================== */

  {
    const ctx = await newContext(false);
    const page = await ctx.newPage();
    await gotoSettled(page, `${baseURL}/catalog`);
    await still(page, "05-catalog.png", "Public catalog: the colored course cards.");
    await ctx.close();
  }

  await record("05-catalog-scroll", "4s — slow scroll down the catalog card grid.", async (page) => {
    await gotoSettled(page, `${baseURL}/catalog`);
    await page.waitForTimeout(900);
    await smoothScroll(page, 620, 2600);
    await page.waitForTimeout(600);
  });

  await browser.close();
  return shots;
}

/* ==================================================================== */
/* Helpers                                                              */
/* ==================================================================== */

async function signIn(browser: Browser, baseURL: string, student: { username: string; password: string }) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    extraHTTPHeaders: PROXY_HEADERS,
  });
  const page = await ctx.newPage();
  await page.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="identifier"]', student.username);
  await page.fill('input[name="password"]', student.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20_000 }),
    page.click('button[type="submit"]'),
  ]);
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

/** Navigate and let fonts + framer's in-view reveals settle before capture. */
async function gotoSettled(page: Page, url: string) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
}

async function startVideo(page: Page) {
  const video = page.locator("video").first();
  if (!(await video.count())) return;
  await video.evaluate((el: HTMLVideoElement) => {
    el.muted = true;
    el.currentTime = 12; // a few seconds in, so it never reads as "not started"
    return el.play().catch(() => {});
  });
  await page.waitForTimeout(400);
}

/**
 * Eased programmatic scroll — smoother and more repeatable than wheel events.
 *
 * Passed as a source STRING rather than a function on purpose: tsx compiles with
 * esbuild's `keepNames`, which wraps named inner functions in a `__name()`
 * helper. That helper doesn't exist in the page, so a function-form
 * `page.evaluate` containing named consts dies with "__name is not defined".
 */
async function smoothScroll(page: Page, distance: number, durationMs: number) {
  await page.evaluate(`new Promise((resolve) => {
    var start = window.scrollY;
    var t0 = performance.now();
    var distance = ${distance};
    var durationMs = ${durationMs};
    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    function step(now) {
      var t = Math.min(1, (now - t0) / durationMs);
      window.scrollTo(0, start + distance * ease(t));
      if (t < 1) requestAnimationFrame(step); else resolve();
    }
    requestAnimationFrame(step);
  })`);
}

/**
 * Put Week 2 in frame on the course outline.
 *
 * Without this the locked and unlocked stills came out byte-identical: Week 2
 * sits below the fold, so the one thing the shot exists to show wasn't in the
 * frame at all. Both states must be framed identically for the cut to work.
 */
async function showWeekTwo(page: Page, animated = true) {
  const week2 = page.getByText("Week 2 — Trees & Traversals", { exact: false }).first();
  if (!(await week2.count())) return;
  if (animated) {
    const y = await week2.evaluate((el) => el.getBoundingClientRect().top + window.scrollY - 220);
    await smoothScroll(page, Math.max(0, y - (await page.evaluate("window.scrollY") as number)), 1100);
  } else {
    await week2.scrollIntoViewIfNeeded();
    await page.evaluate("window.scrollBy(0, -160)");
  }
  await page.waitForTimeout(450);
}

async function scrollToFeedback(page: Page) {
  const fb = page.getByText("This is the version I wanted to see", { exact: false }).first();
  if (await fb.count()) await fb.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
}

/**
 * Transparent-background PNGs of individual UI pieces. These composite far
 * better as floating overlays than a cropped screenshot does, because the
 * card's rounded corners come out actually transparent.
 */
async function exportElements(page: Page, outDir: string, shots: Shot[]) {
  // Strip the page's own canvas so `omitBackground` can do its job — the
  // element's own fill still paints.
  await page.addStyleTag({
    content: "html,body{background:transparent !important}",
  });

  await exportTargets(page, outDir, shots, [
    { selector: "article:has(h3)", file: "el-course-card.png", what: "Single course card, transparent background." },
    // The card's own track — the course-outline bar isn't a <ProgressBar>, so
    // `[role=progressbar]` doesn't exist on either page.
    { selector: "article:has(h3) .h-2", file: "el-progress-bar.png", what: "Course-card progress bar, part filled, transparent background." },
    { selector: "article:has(h3) span.inline-flex:has(svg)", file: "el-lessons-left-chip.png", what: "“N lessons left” chip with the flame icon — the closest thing the product has to a momentum badge." },
    { selector: "aside .bg-ink, .bg-ink.rounded-card", file: "el-continue-panel.png", what: "Dark “continue where you left off” panel, transparent background." },
  ]);
}

/** Pieces that only exist on the course outline (progress bar, lock badge). */
async function exportOutlineElements(page: Page, outDir: string, shots: Shot[]) {
  await page.addStyleTag({ content: "html,body{background:transparent !important}" });
  await exportTargets(page, outDir, shots, [
    { selector: '[role="progressbar"]', file: "el-progress-bar.png", what: "Course progress bar, transparent background." },
    { selector: ":is(.bg-lilac,.bg-lilac-soft):has(svg)", file: "el-locked-badge.png", what: "Locked-module badge, transparent background." },
  ]);
}

async function exportTargets(
  page: Page,
  outDir: string,
  shots: Shot[],
  targets: { selector: string; file: string; what: string }[],
) {
  for (const t of targets) {
    const el = page.locator(t.selector).first();
    if (!(await el.count())) continue;
    try {
      await el.screenshot({ path: path.join(outDir, t.file), omitBackground: true, scale: "device" });
      shots.push({ file: t.file, what: t.what });
    } catch {
      /* element not visible in this state — skip rather than fail the run */
    }
  }
}

/* --- gating state, flipped through the real model --------------------- */

async function withPrisma<T>(fn: (p: PrismaClient) => Promise<T>) {
  const p = new PrismaClient();
  try {
    return await fn(p);
  } finally {
    await p.$disconnect();
  }
}

export async function passGatingAssignment(submissionId: string) {
  await withPrisma((p) =>
    p.submission.update({
      where: { id: submissionId },
      data: {
        status: "GRADED",
        passed: true,
        score: 88,
        gradedAt: new Date(),
        releasedAt: new Date(),
        feedback:
          "Floyd's cycle detection, correctly justified in the comments — that's exactly the " +
          "reasoning I was looking for. Week 2 is open.",
      },
    }),
  );
}

export async function resetGatingAssignment(submissionId: string) {
  await withPrisma((p) =>
    p.submission.update({
      where: { id: submissionId },
      data: { status: "SUBMITTED", passed: null, score: null, gradedAt: null, releasedAt: null, feedback: null },
    }),
  );
}
