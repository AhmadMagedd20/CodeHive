import { prisma } from "../prisma";
import { getModuleLockStates, type ModuleLockState } from "./gating";

/**
 * Effective per-module lock state for a student in a course, honouring the
 * student's per-course access mode (StudentCourseAccess.accessMode).
 *
 * Precedence (a student is on exactly ONE mode per course):
 *   - FULL  → nothing is locked.
 *   - DRIP  → a module is locked UNLESS the instructor has released it
 *             (StudentModuleRelease). Assignment-passing does NOT unlock —
 *             only the instructor does. Independent of Phase 2 gating.
 *   - GATED → the Phase 2 assignment gating (getModuleLockStates), which itself
 *             is a no-op when the course has gatingEnabled = false.
 *   - PER_MODULE → à la carte: a week is locked unless the student bought it
 *             (StudentModuleAccess). Among weeks they DO own, normal gating
 *             applies — but only when the prerequisite week is also owned,
 *             since buying a week outright is an explicit request for it.
 *
 * Returns the SAME Map<moduleId, ModuleLockState> shape as getModuleLockStates,
 * so the outline and lesson-guard consume it unchanged.
 */
export const DRIP_LOCK_REASON = "Not released yet — Megz unlocks this after your live session.";
export const UNOWNED_LOCK_REASON = "You haven't bought this week yet.";

export async function getEffectiveModuleLockStates(
  studentId: string,
  courseId: string,
): Promise<Map<string, ModuleLockState>> {
  const access = await prisma.studentCourseAccess.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
    select: { accessMode: true },
  });

  // No grant, or default/gated → existing gating behaviour.
  if (!access || access.accessMode === "GATED") {
    return getModuleLockStates(studentId, courseId);
  }

  const modules = await prisma.module.findMany({
    where: { courseId },
    orderBy: { orderIndex: "asc" },
    select: { id: true, prerequisiteModuleId: true },
  });
  const states = new Map<string, ModuleLockState>();

  // PER_MODULE — the student bought individual weeks.
  if (access.accessMode === "PER_MODULE") {
    const [owned, gatingStates] = await Promise.all([
      prisma.studentModuleAccess.findMany({
        where: { studentId, module: { courseId } },
        select: { moduleId: true },
      }),
      getModuleLockStates(studentId, courseId),
    ]);
    const ownedSet = new Set(owned.map((o) => o.moduleId));

    for (const m of modules) {
      if (!ownedSet.has(m.id)) {
        states.set(m.id, { moduleId: m.id, locked: true, reason: UNOWNED_LOCK_REASON });
        continue;
      }
      // Owned. Gating between owned weeks behaves exactly as it always has;
      // a prerequisite the student doesn't own can't hold their purchase hostage.
      const prereqOwned = m.prerequisiteModuleId ? ownedSet.has(m.prerequisiteModuleId) : false;
      states.set(
        m.id,
        prereqOwned
          ? (gatingStates.get(m.id) ?? { moduleId: m.id, locked: false, reason: null })
          : { moduleId: m.id, locked: false, reason: null },
      );
    }
    return states;
  }

  if (access.accessMode === "FULL") {
    for (const m of modules) states.set(m.id, { moduleId: m.id, locked: false, reason: null });
    return states;
  }

  // DRIP — locked unless individually released.
  const released = await prisma.studentModuleRelease.findMany({
    where: { studentId, module: { courseId } },
    select: { moduleId: true },
  });
  const releasedSet = new Set(released.map((r) => r.moduleId));
  for (const m of modules) {
    const isReleased = releasedSet.has(m.id);
    states.set(m.id, {
      moduleId: m.id,
      locked: !isReleased,
      reason: isReleased ? null : DRIP_LOCK_REASON,
    });
  }
  return states;
}

/** Convenience: effective lock state for a single module. */
export async function getEffectiveModuleLock(
  studentId: string,
  courseId: string,
  moduleId: string,
): Promise<ModuleLockState> {
  const states = await getEffectiveModuleLockStates(studentId, courseId);
  return states.get(moduleId) ?? { moduleId, locked: false, reason: null };
}

// ---------------------------------------------------------------------------
// Per-item locks. Layers the "paid extra" gate on top of the module lock.
//
// For an in-person DRIP student, the two gates are INDEPENDENT axes:
//   - lecture items (isExtra = false) → free, gated by attendance (module drip)
//   - extra items   (isExtra = true)  → paid, gated by `extrasUnlocked`, and
//     NOT attendance-gated (paying unlocks ALL extras).
// For FULL / GATED students, `isExtra` is ignored — items follow the module.
// ---------------------------------------------------------------------------

export const EXTRA_LOCK_REASON = "Labs, LeetCode & extras — unlock with a one-time payment.";

export type ItemLockKind = "drip" | "gated" | "extra" | "unowned" | null;

export interface ItemLockState {
  itemId: string;
  locked: boolean;
  reason: string | null;
  kind: ItemLockKind;
}

export async function getCourseItemLocks(
  studentId: string,
  courseId: string,
): Promise<Map<string, ItemLockState>> {
  const [access, modules, moduleLocks] = await Promise.all([
    prisma.studentCourseAccess.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      select: { accessMode: true, extrasUnlocked: true },
    }),
    prisma.module.findMany({
      where: { courseId },
      orderBy: { orderIndex: "asc" },
      select: { id: true, items: { select: { id: true, isExtra: true } } },
    }),
    getEffectiveModuleLockStates(studentId, courseId),
  ]);

  const out = new Map<string, ItemLockState>();
  const isDrip = access?.accessMode === "DRIP";
  const paid = access?.extrasUnlocked ?? false;

  for (const m of modules) {
    const mLock = moduleLocks.get(m.id);
    for (const it of m.items) {
      if (isDrip && it.isExtra) {
        out.set(it.id, {
          itemId: it.id,
          locked: !paid,
          reason: paid ? null : EXTRA_LOCK_REASON,
          kind: paid ? null : "extra",
        });
      } else if (mLock?.locked) {
        out.set(it.id, {
          itemId: it.id,
          locked: true,
          reason: mLock.reason,
          kind:
            mLock.reason === UNOWNED_LOCK_REASON ? "unowned" : isDrip ? "drip" : "gated",
        });
      } else {
        out.set(it.id, { itemId: it.id, locked: false, reason: null, kind: null });
      }
    }
  }
  return out;
}

/** Convenience: lock state for a single lesson item. */
export async function getItemLock(
  studentId: string,
  courseId: string,
  itemId: string,
): Promise<ItemLockState> {
  const locks = await getCourseItemLocks(studentId, courseId);
  return locks.get(itemId) ?? { itemId, locked: false, reason: null, kind: null };
}

// ---------------------------------------------------------------------------
// Ownership (Phase 5) — what a student has actually bought in a course.
// ---------------------------------------------------------------------------

export interface CourseOwnership {
  /** Has any grant for this course (so it lists on their dashboard). */
  enrolled: boolean;
  /** Owns the whole course — every week, including ones added later. */
  wholeCourse: boolean;
  /** Weeks owned individually. Only meaningful when `wholeCourse` is false. */
  ownedModuleIds: Set<string>;
}

/**
 * Resolve what a student owns in a course. A whole-course buyer (or any
 * manually-granted / in-person student) reports `wholeCourse` — their access
 * mode keeps driving drip/gating as before. Only PER_MODULE students are
 * resolved week-by-week.
 */
export async function getCourseOwnership(
  studentId: string,
  courseId: string,
): Promise<CourseOwnership> {
  const access = await prisma.studentCourseAccess.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
    select: { accessMode: true },
  });
  if (!access) return { enrolled: false, wholeCourse: false, ownedModuleIds: new Set() };
  if (access.accessMode !== "PER_MODULE") {
    return { enrolled: true, wholeCourse: true, ownedModuleIds: new Set() };
  }
  const owned = await prisma.studentModuleAccess.findMany({
    where: { studentId, module: { courseId } },
    select: { moduleId: true },
  });
  return {
    enrolled: true,
    wholeCourse: false,
    ownedModuleIds: new Set(owned.map((o) => o.moduleId)),
  };
}

/** Whether an in-person DRIP student can still buy this course's extras. */
export function canUnlockExtras(
  isInPerson: boolean,
  access: { accessMode: string; extrasUnlocked: boolean } | null,
): boolean {
  return isInPerson && access?.accessMode === "DRIP" && !access.extrasUnlocked;
}
