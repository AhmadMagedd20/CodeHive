import { PlayCircle, FileText, BookOpen, ListChecks, ClipboardList, type LucideIcon } from "lucide-react";
import type { LessonType } from "@prisma/client";

export const LESSON_TYPE_META: Record<LessonType, { label: string; Icon: LucideIcon }> = {
  VIDEO: { label: "Video", Icon: PlayCircle },
  DOCUMENT: { label: "Document", Icon: FileText },
  RICH_TEXT: { label: "Reading", Icon: BookOpen },
  QUIZ: { label: "Quiz", Icon: ListChecks },
  ASSIGNMENT: { label: "Assignment", Icon: ClipboardList },
};

export const LESSON_TYPE_ORDER: LessonType[] = [
  "VIDEO",
  "DOCUMENT",
  "RICH_TEXT",
  "QUIZ",
  "ASSIGNMENT",
];
