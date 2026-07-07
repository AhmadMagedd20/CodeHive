import Link from "next/link";
import { requireInstructor } from "@/lib/auth/current-user";
import { AppHeader } from "@/components/app-header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const instructor = await requireInstructor();
  return (
    <div className="min-h-screen">
      <AppHeader
        email={instructor.email}
        role="Instructor"
        nav={
          <>
            <Link href="/admin" className="hover:text-foreground">
              Pending
            </Link>
            <Link href="/admin/students" className="hover:text-foreground">
              Students
            </Link>
            <Link href="/admin/courses" className="hover:text-foreground">
              Courses
            </Link>
            <Link href="/admin/announcements" className="hover:text-foreground">
              Announcements
            </Link>
            <Link href="/admin/grading" className="hover:text-foreground">
              Grading
            </Link>
            <Link href="/admin/progress" className="hover:text-foreground">
              Progress
            </Link>
            <Link href="/admin/audit" className="hover:text-foreground">
              Audit log
            </Link>
          </>
        }
      />
      <main className="container py-8">{children}</main>
    </div>
  );
}
