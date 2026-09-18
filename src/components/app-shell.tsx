import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { countUnreadAnnouncements } from "@/lib/announcements";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";
import { StudentRail, type StudentNavKey } from "@/components/student-rail";

/**
 * App shell for authenticated student pages: a floating ink icon rail (left,
 * desktop) that collapses to a bottom bar (mobile), plus the top bar (wordmark,
 * search, notifications, avatar). Content renders on the paper canvas.
 */

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export async function AppShell({
  student,
  active,
  children,
}: {
  student: { id: string; username: string; email: string };
  active: StudentNavKey;
  children: React.ReactNode;
}) {
  const unread = await countUnreadAnnouncements(student.id);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <StudentRail active={active} unread={unread} />

      {/* Main column */}
      <div className="md:pl-[84px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-paper/85 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center gap-3 sm:gap-5">
            <Link
              href="/dashboard"
              aria-label="Cohort Portal home"
              className="shrink-0 leading-tight"
            >
              <span className="hidden text-[11px] font-medium text-ink/45 sm:block">Welcome to</span>
              <Logo size="sm" />
            </Link>

            {/* Search (visual for now — global search isn't wired) */}
            <form className="relative hidden flex-1 items-center md:flex" role="search">
              <Search className="pointer-events-none absolute left-4 h-4 w-4 text-ink/40" />
              <input
                type="search"
                placeholder="Search courses, lessons…"
                className="h-11 w-full rounded-full border-brutal border-ink bg-white pl-11 pr-14 text-sm outline-none placeholder:text-ink/40 focus-visible:ring-[3px] focus-visible:ring-ring"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full border-brutal border-ink bg-flame text-white"
              >
                <Search className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </form>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <Link
                href="/announcements"
                aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border-brutal border-ink bg-white text-ink transition-colors hover:bg-paper"
              >
                <Bell className="h-5 w-5" strokeWidth={2.2} />
                {unread > 0 && (
                  <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-flame ring-2 ring-white" />
                )}
              </Link>

              <div className="flex items-center gap-2.5 rounded-full border-brutal border-ink bg-white py-1 pl-1 pr-3">
                <Avatar initials={initials(student.username)} />
                <span className="hidden leading-tight sm:block">
                  <span className="block text-sm font-semibold">{student.username}</span>
                  <span className="block text-[11px] text-ink/45">{student.email}</span>
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-2 sm:px-6 md:pb-10">{children}</main>
      </div>

    </div>
  );
}
