import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

/**
 * Seeds one instructor/admin and a few sample courses so the full flow can be
 * tested locally. Idempotent: re-running won't duplicate or reset the admin.
 */
const prisma = new PrismaClient();

const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

const SAMPLE_COURSES = [
  { title: "Introduction to Programming", description: "Fundamentals of coding with hands-on labs." },
  { title: "Data Structures & Algorithms", description: "Core CS building blocks and complexity." },
  { title: "Databases", description: "Relational modelling, SQL, and transactions." },
];

async function main() {
  const email = (process.env.SEED_INSTRUCTOR_EMAIL ?? "admin@lms.local").toLowerCase();
  const password = process.env.SEED_INSTRUCTOR_PASSWORD ?? "Admin!12345";
  const name = process.env.SEED_INSTRUCTOR_NAME ?? "Course Instructor";

  const passwordHash = await hash(password, ARGON2_OPTS);

  const instructor = await prisma.instructor.upsert({
    where: { email },
    update: {}, // don't clobber an existing password on re-seed
    create: { email, name, passwordHash },
  });

  for (const c of SAMPLE_COURSES) {
    const existing = await prisma.course.findFirst({
      where: { title: c.title, instructorId: instructor.id },
    });
    if (!existing) {
      await prisma.course.create({ data: { ...c, instructorId: instructor.id } });
    }
  }

  const courseCount = await prisma.course.count({ where: { instructorId: instructor.id } });

  console.log("\n✅ Seed complete");
  console.log(`   Instructor: ${email}`);
  console.log(`   Password:   ${password}`);
  console.log(`   Courses:    ${courseCount}`);
  console.log("   Sign in at /login with the instructor email above.\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
