import { promises as fs } from "fs";
import path from "path";
import {
  PrismaClient,
  LessonType,
  SubmissionMode,
  SubmissionStatus,
  ProgressStatus,
  VideoStatus,
} from "@prisma/client";
import { hash } from "@node-rs/argon2";

/**
 * Demo data for the launch-video captures.
 *
 * Everything here is fictional. No real student names, emails or work — every
 * address is on a `.demo` domain that cannot resolve.
 *
 * SAFETY: this script wipes and rewrites content tables, so it refuses to run
 * against anything that isn't a local database. The project's real
 * DATABASE_URL points at Supabase; running this there would destroy live data.
 */

const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const DEMO = {
  instructor: { email: "megz@cohortportal.demo", name: "Megz", password: "Demo!12345" },
  student: {
    username: "nour.adel",
    email: "nour.adel@student.demo",
    fullName: "Nour Adel",
    password: "Demo!12345",
  },
};

function assertLocalDatabase(url: string | undefined) {
  if (!url) throw new Error("DATABASE_URL is not set — refusing to seed.");
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL is not a parseable URL — refusing to seed.");
  }
  const local = ["localhost", "127.0.0.1", "::1", "host.docker.internal", "db", "postgres"];
  if (!local.includes(host)) {
    throw new Error(
      `Refusing to seed demo data into a non-local database (host: ${host}).\n` +
        `This script DELETES content rows. Point DATABASE_URL at a local Postgres\n` +
        `(see .env.capture.example) and re-run.`,
    );
  }
}

/** A short branded stand-in lecture clip, so the player is never empty. */
async function ensureLectureVideo(storageDir: string, ffmpegPath: string) {
  const key = "demo/lecture.mp4";
  const full = path.resolve(process.cwd(), storageDir, key);
  await fs.mkdir(path.dirname(full), { recursive: true });

  // Prefer a real recording if the user dropped one in.
  const supplied = path.resolve(process.cwd(), "capture/assets/lecture.mp4");
  const hasSupplied = await fs
    .access(supplied)
    .then(() => true)
    .catch(() => false);

  if (hasSupplied) {
    await fs.copyFile(supplied, full);
  } else {
    const { execFileSync } = await import("child_process");
    // Slow ink→lilac gradient drift on the brand canvas. Deliberately abstract:
    // a placeholder should read as a placeholder, not as fake lecture content.
    execFileSync(
      ffmpegPath,
      [
        "-y",
        "-f", "lavfi",
        "-i", "gradients=size=1280x720:speed=0.012:c0=0x151313:c1=0x4B2A80:x0=0:y0=0:x1=1280:y1=720:d=40",
        "-t", "40",
        "-r", "30",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        full,
      ],
      { stdio: "ignore" },
    );
  }
  await fs.writeFile(full + ".meta.json", JSON.stringify({ contentType: "video/mp4" }));
  return { key, hasSupplied };
}

export async function seedDemo({
  storageDir = "./storage",
  ffmpegPath,
}: {
  storageDir?: string;
  ffmpegPath: string;
}) {
  assertLocalDatabase(process.env.DATABASE_URL);
  const prisma = new PrismaClient();

  const video = await ensureLectureVideo(storageDir, ffmpegPath);

  // --- clean slate ---------------------------------------------------------
  // Order matters: children before parents where there's no cascade.
  await prisma.$transaction([
    prisma.lessonProgress.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.studentActivity.deleteMany(),
    prisma.studentStreak.deleteMany(),
    prisma.studentCourseAccess.deleteMany(),
    prisma.session.deleteMany(),
    prisma.course.deleteMany(),
    prisma.student.deleteMany(),
    prisma.instructor.deleteMany(),
  ]);

  const instructor = await prisma.instructor.create({
    data: {
      email: DEMO.instructor.email,
      name: DEMO.instructor.name,
      passwordHash: await hash(DEMO.instructor.password, ARGON2_OPTS),
    },
  });

  const student = await prisma.student.create({
    data: {
      username: DEMO.student.username,
      email: DEMO.student.email,
      fullName: DEMO.student.fullName,
      university: "GUC",
      state: "ACTIVE",
      emailVerifiedAt: new Date(),
      passwordHash: await hash(DEMO.student.password, ARGON2_OPTS),
      instructorId: instructor.id,
      lastLearningActivityAt: new Date(),
    },
  });

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  const mkVideo = (title: string, order: number, durationSeconds: number) => ({
    type: LessonType.VIDEO,
    title,
    orderIndex: order,
    isPublished: true,
    video: {
      create: {
        provider: "local",
        storageKey: video.key,
        status: VideoStatus.READY,
        durationSeconds,
        originalFilename: "lecture.mp4",
      },
    },
  });

  /* ------------------------------------------------------------------ */
  /* Course 1 — CS3. Carries the gating/unlock story.                    */
  /* ------------------------------------------------------------------ */

  const cs3 = await prisma.course.create({
    data: {
      title: "Data Structures & Algorithms — CS3",
      description:
        "The course most people cram and then forget. We build the intuition first — why a structure exists — then the code, then the complexity. Weekly problem sets, marked by hand.",
      category: "Data Structures",
      university: "GUC",
      gatingEnabled: true,
      isPurchasable: true,
      priceCents: 200000,
      instructorId: instructor.id,
    },
  });

  const cs3w1 = await prisma.module.create({
    data: {
      courseId: cs3.id,
      title: "Week 1 — Complexity & Big-O",
      description: "Reading the cost of your own code before you run it.",
      orderIndex: 0,
      isPublished: true,
      items: {
        create: [
          mkVideo("Why O(n log n) beats O(n²) in practice", 0, 764),
          {
            type: LessonType.RICH_TEXT,
            title: "Cheat sheet — the complexities you'll actually be asked for",
            orderIndex: 1,
            isPublished: true,
            body:
              "## Read this before the problem set\n\n" +
              "You will not be asked to derive the Master Theorem. You will be asked, over and " +
              "over, to look at ten lines of code and say what they cost.\n\n" +
              "| Operation | Array | Linked list | Hash map | BST (balanced) |\n" +
              "| --- | --- | --- | --- | --- |\n" +
              "| Access by index | O(1) | O(n) | — | — |\n" +
              "| Search by value | O(n) | O(n) | O(1) avg | O(log n) |\n" +
              "| Insert at front | O(n) | O(1) | O(1) avg | O(log n) |\n" +
              "| Delete by value | O(n) | O(n) | O(1) avg | O(log n) |\n\n" +
              "### The three that trip people up\n\n" +
              "1. **Hash map lookup is O(1) *average*, not worst case.** Once the load factor " +
              "climbs and everything collides into one bucket, you are walking a list again.\n" +
              "2. **A nested loop is not automatically O(n²).** If the inner loop halves each " +
              "time, you are at O(n log n) — count the work, not the indentation.\n" +
              "3. **Sorting first is often free.** If you are about to do n lookups in an " +
              "unsorted array, sorting once (O(n log n)) then binary searching (O(log n) each) " +
              "beats n linear scans as soon as n gets interesting.",
          },
          {
            type: LessonType.ASSIGNMENT,
            title: "Problem set 1 — find the duplicate, then make it fast",
            orderIndex: 2,
            isPublished: true,
            assignment: {
              create: {
                isGating: true,
                submissionMode: SubmissionMode.CODE,
                codeLanguage: "java",
                dueAt: new Date(Date.now() + 4 * 864e5),
                instructions:
                  "Given an array of n+1 integers where every value is in the range 1..n, return " +
                  "any value that appears more than once.\n\n" +
                  "Submit **two** solutions in one file:\n\n" +
                  "1. `findDuplicateNaive` — the obvious one. Write it first, and write down its " +
                  "complexity in a comment.\n" +
                  "2. `findDuplicate` — O(n) time, O(1) extra space. You may not modify the input " +
                  "array and you may not allocate a second one.\n\n" +
                  "Marks are for the reasoning in your comments as much as for the code. If the " +
                  "second one beats you, submit the first with an honest note about where you got " +
                  "stuck — that is worth more than a copied answer.",
              },
            },
          },
        ],
      },
    },
    include: { items: { orderBy: { orderIndex: "asc" } } },
  });

  // Week 2 is gated behind Week 1's problem set — this is the unlock shot.
  const cs3w2 = await prisma.module.create({
    data: {
      courseId: cs3.id,
      title: "Week 2 — Trees & Traversals",
      description: "Where the recursion finally starts paying rent.",
      orderIndex: 1,
      isPublished: true,
      prerequisiteModuleId: cs3w1.id,
      items: {
        create: [
          mkVideo("Binary search trees, drawn by hand before any code", 0, 908),
          mkVideo("In-order, pre-order, post-order — when each one matters", 1, 622),
          {
            type: LessonType.ASSIGNMENT,
            title: "Problem set 2 — implement a BST, including deletion",
            orderIndex: 2,
            isPublished: true,
            assignment: {
              create: {
                isGating: true,
                submissionMode: SubmissionMode.CODE,
                codeLanguage: "java",
                instructions: "Insert, search, in-order traversal, and the delete case everyone skips.",
              },
            },
          },
        ],
      },
    },
    include: { items: { orderBy: { orderIndex: "asc" } } },
  });

  await prisma.module.create({
    data: {
      courseId: cs3.id,
      title: "Week 3 — Hashing",
      description: "Collisions, load factor, and why your code suddenly got slow.",
      orderIndex: 2,
      isPublished: true,
      prerequisiteModuleId: cs3w2.id,
      items: { create: [mkVideo("Hash maps: what actually happens on collision", 0, 731)] },
    },
  });

  /* ------------------------------------------------------------------ */
  /* Course 2 — CS1. Carries the graded-feedback story.                  */
  /* ------------------------------------------------------------------ */

  const cs1 = await prisma.course.create({
    data: {
      title: "Introduction to Programming — CS1",
      description:
        "For the people who have never written a line and the people who have written a lot of lines that didn't work. Same starting point, no judgement.",
      category: "Programming",
      university: "GUC",
      gatingEnabled: false,
      isPurchasable: true,
      priceCents: 150000,
      instructorId: instructor.id,
    },
  });

  const cs1w1 = await prisma.module.create({
    data: {
      courseId: cs1.id,
      title: "Week 1 — Variables, types & control flow",
      orderIndex: 0,
      isPublished: true,
      items: {
        create: [
          mkVideo("Your first program, line by line, nothing skipped", 0, 542),
          {
            type: LessonType.ASSIGNMENT,
            title: "Lab 1 — FizzBuzz, and then make it readable",
            orderIndex: 1,
            isPublished: true,
            assignment: {
              create: {
                isGating: false,
                submissionMode: SubmissionMode.CODE,
                codeLanguage: "python",
                instructions:
                  "Print 1 to 100. Multiples of 3 print `Fizz`, multiples of 5 print `Buzz`, " +
                  "multiples of both print `FizzBuzz`.\n\n" +
                  "Then do it again, but write it so someone reading it in six months understands " +
                  "it immediately. Submit both versions.",
              },
            },
          },
        ],
      },
    },
    include: { items: { orderBy: { orderIndex: "asc" } } },
  });

  await prisma.module.create({
    data: {
      courseId: cs1.id,
      title: "Week 2 — Functions & scope",
      orderIndex: 1,
      isPublished: true,
      items: { create: [mkVideo("Functions: the first real tool you get", 0, 611)] },
    },
  });

  /* ------------------------------------------------------------------ */
  /* Course 3 — CS2, for a third card on the dashboard/catalog.          */
  /* ------------------------------------------------------------------ */

  const cs2 = await prisma.course.create({
    data: {
      title: "Object-Oriented Programming — CS2",
      description:
        "Classes, inheritance, and the moment it stops feeling like ceremony and starts feeling like a tool.",
      category: "OOP",
      university: "GIU",
      gatingEnabled: false,
      isPurchasable: true,
      priceCents: 180000,
      salePriceCents: 144000,
      discountPercent: 20,
      instructorId: instructor.id,
    },
  });

  const cs2w1 = await prisma.module.create({
    data: {
      courseId: cs2.id,
      title: "Week 1 — Classes & objects",
      orderIndex: 0,
      isPublished: true,
      items: {
        create: [
          mkVideo("What a class actually is, without the car analogy", 0, 688),
          mkVideo("Constructors, fields, and the `this` that confuses everyone", 1, 594),
        ],
      },
    },
    include: { items: { orderBy: { orderIndex: "asc" } } },
  });

  await prisma.module.create({
    data: {
      courseId: cs2.id,
      title: "Week 2 — Inheritance & polymorphism",
      orderIndex: 1,
      isPublished: true,
      items: { create: [mkVideo("Inheritance, and when to not use it", 0, 705)] },
    },
  });

  /* ------------------------------------------------------------------ */
  /* Enrolment, progress, submissions                                    */
  /* ------------------------------------------------------------------ */

  for (const c of [cs3, cs1, cs2]) {
    await prisma.studentCourseAccess.create({
      data: { studentId: student.id, courseId: c.id, accessMode: "GATED" },
    });
  }

  const done = (id: string, daysAgo: number) =>
    prisma.lessonProgress.create({
      data: {
        studentId: student.id,
        lessonItemId: id,
        status: ProgressStatus.COMPLETED,
        watchedPercent: 100,
        lastPositionSeconds: 0,
        completedAt: new Date(Date.now() - daysAgo * 864e5),
      },
    });

  // CS3 — week 1 watched and read; the problem set is in, not yet marked.
  await done(cs3w1.items[0].id, 3);
  await done(cs3w1.items[1].id, 2);
  // CS1 — week 1 done.
  await done(cs1w1.items[0].id, 6);
  // CS2 — one of two watched, so the card shows a part-filled bar.
  await done(cs2w1.items[0].id, 1);
  // Mid-lesson on the CS3 hero video, so the player has a resume point.
  await prisma.lessonProgress.update({
    where: { studentId_lessonItemId: { studentId: student.id, lessonItemId: cs3w1.items[0].id } },
    data: { lastPositionSeconds: 176, watchedPercent: 100 },
  });

  const cs3Assignment = await prisma.assignment.findFirstOrThrow({
    where: { lessonItemId: cs3w1.items[2].id },
  });
  const cs1Assignment = await prisma.assignment.findFirstOrThrow({
    where: { lessonItemId: cs1w1.items[1].id },
  });

  // The gating submission — SUBMITTED, unmarked. Week 2 stays locked until the
  // capture script marks it passed, which is the "unlock" shot.
  const gatingSubmission = await prisma.submission.create({
    data: {
      assignmentId: cs3Assignment.id,
      studentId: student.id,
      attemptNo: 1,
      mode: SubmissionMode.CODE,
      codeLanguage: "java",
      status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date(Date.now() - 1 * 864e5),
      codeContent: [
        "// Problem set 1 — duplicate detection",
        "",
        "public class Duplicates {",
        "",
        "    // O(n^2) time, O(1) space. Fine for n = 100, dies at n = 100000.",
        "    static int findDuplicateNaive(int[] a) {",
        "        for (int i = 0; i < a.length; i++)",
        "            for (int j = i + 1; j < a.length; j++)",
        "                if (a[i] == a[j]) return a[i];",
        "        return -1;",
        "    }",
        "",
        "    // Floyd's cycle detection: treat a[i] as a pointer to index a[i].",
        "    // Because values are 1..n in an array of n+1, a cycle must exist,",
        "    // and its entry point is the duplicate. O(n) time, O(1) space.",
        "    static int findDuplicate(int[] a) {",
        "        int slow = a[0], fast = a[0];",
        "        do {",
        "            slow = a[slow];",
        "            fast = a[a[fast]];",
        "        } while (slow != fast);",
        "",
        "        slow = a[0];",
        "        while (slow != fast) {",
        "            slow = a[slow];",
        "            fast = a[fast];",
        "        }",
        "        return slow;",
        "    }",
        "}",
      ].join("\n"),
    },
  });

  // The already-marked one, with feedback that reads like a person wrote it.
  await prisma.submission.create({
    data: {
      assignmentId: cs1Assignment.id,
      studentId: student.id,
      attemptNo: 2,
      mode: SubmissionMode.CODE,
      codeLanguage: "python",
      status: SubmissionStatus.GRADED,
      passed: true,
      score: 92,
      submittedAt: new Date(Date.now() - 5 * 864e5),
      gradedAt: new Date(Date.now() - 4 * 864e5),
      releasedAt: new Date(Date.now() - 4 * 864e5),
      gradedById: instructor.id,
      codeContent: [
        "def fizzbuzz(n: int) -> str:",
        '    """Return the FizzBuzz label for a single number."""',
        '    if n % 15 == 0:',
        '        return "FizzBuzz"',
        '    if n % 3 == 0:',
        '        return "Fizz"',
        '    if n % 5 == 0:',
        '        return "Buzz"',
        "    return str(n)",
        "",
        "",
        "for i in range(1, 101):",
        "    print(fizzbuzz(i))",
      ].join("\n"),
      feedback:
        "This is the version I wanted to see — well done for going back and doing it again.\n\n" +
        "The thing you got right, and it's the whole point of the lab: you pulled the decision " +
        "out into `fizzbuzz(n)` and left the loop doing one job. Your first attempt had the " +
        "printing and the deciding tangled together in the loop body, and you couldn't test it " +
        "without running the whole thing. Now you can call `fizzbuzz(15)` on its own and see it " +
        "return \"FizzBuzz\". That's not a style preference, it's the difference between code you " +
        "can debug and code you can only stare at.\n\n" +
        "Two notes for next time. Checking `n % 15` first is correct, but say why in a comment — " +
        "you're relying on 15 being the LCM of 3 and 5, and a reader who doesn't spot that will " +
        "assume the order is arbitrary and reorder it. Second, the type hints are good, keep " +
        "doing that.\n\n" +
        "92. The 8 is for the missing comment, nothing else. See you in Week 2.",
    },
  });

  // Streak model exists but nothing renders it yet (see PROJECT.md §5l) —
  // seeded anyway so the data is there the day a streak UI lands.
  await prisma.studentStreak.create({
    data: {
      studentId: student.id,
      currentStreak: 12,
      longestStreak: 21,
      lastActiveDate: new Date(new Date().toISOString().slice(0, 10)),
    },
  });
  for (let d = 0; d < 12; d++) {
    const day = new Date(Date.now() - d * 864e5);
    await prisma.studentActivity.create({
      data: { studentId: student.id, date: new Date(day.toISOString().slice(0, 10)) },
    });
  }

  await prisma.$disconnect();

  return {
    placeholderVideo: !video.hasSupplied,
    student: DEMO.student,
    instructor: DEMO.instructor,
    ids: {
      cs3CourseId: cs3.id,
      cs3HeroLessonId: cs3w1.items[0].id,
      cs3GatingAssignmentLessonId: cs3w1.items[2].id,
      cs3LockedLessonId: cs3w2.items[0].id,
      cs1CourseId: cs1.id,
      cs1GradedAssignmentLessonId: cs1w1.items[1].id,
      cs2CourseId: cs2.id,
      gatingSubmissionId: gatingSubmission.id,
    },
  };
}
