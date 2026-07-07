import { prisma } from "../prisma";

/**
 * Sequential gating. A module is LOCKED for a student when ALL of:
 *   - the course has gatingEnabled,
 *   - the module has a prerequisite module,
 *   - the prerequisite module contains at least one gating assignment,
 *   - the student has NO passed submission for one of those gating assignments,
 *   - and no per-student StudentModuleUnlock override exists.
 *
 * The ONLY gate is passing the gating assignment — watch-% is never required
 * (PROJECT.md Phase 2 decision).
 */

export interface ModuleLockState {
  moduleId: string;
  locked: boolean;
  /** User-facing explanation of exactly what unlocks it. */
  reason: string | null;
}

export async function getModuleLockStates(
  studentId: string,
  courseId: string,
): Promise<Map<string, ModuleLockState>> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          prerequisite: {
            include: {
              items: {
                where: { type: "ASSIGNMENT" },
                include: { assignment: { select: { id: true, isGating: true } } },
              },
            },
          },
        },
      },
    },
  });

  const states = new Map<string, ModuleLockState>();
  if (!course) return states;

  // Gating off for the whole course -> everything open.
  if (!course.gatingEnabled) {
    for (const m of course.modules) states.set(m.id, { moduleId: m.id, locked: false, reason: null });
    return states;
  }

  const [overrides, passed] = await Promise.all([
    prisma.studentModuleUnlock.findMany({ where: { studentId }, select: { moduleId: true } }),
    prisma.submission.findMany({
      where: { studentId, passed: true },
      select: { assignmentId: true },
    }),
  ]);
  const overrideSet = new Set(overrides.map((o) => o.moduleId));
  const passedSet = new Set(passed.map((p) => p.assignmentId));

  for (const m of course.modules) {
    if (!m.prerequisite || overrideSet.has(m.id)) {
      states.set(m.id, { moduleId: m.id, locked: false, reason: null });
      continue;
    }
    const gatingAssignments = m.prerequisite.items
      .map((i) => i.assignment)
      .filter((a): a is NonNullable<typeof a> => !!a && a.isGating);

    const unmet = gatingAssignments.some((a) => !passedSet.has(a.id));
    if (gatingAssignments.length === 0 || !unmet) {
      states.set(m.id, { moduleId: m.id, locked: false, reason: null });
    } else {
      states.set(m.id, {
        moduleId: m.id,
        locked: true,
        reason: `Pass the assignment in “${m.prerequisite.title}” to unlock this lecture.`,
      });
    }
  }
  return states;
}

/** Convenience: lock state for a single module. */
export async function isModuleLocked(
  studentId: string,
  courseId: string,
  moduleId: string,
): Promise<ModuleLockState> {
  const states = await getModuleLockStates(studentId, courseId);
  return states.get(moduleId) ?? { moduleId, locked: false, reason: null };
}
