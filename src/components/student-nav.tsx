import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { countUnreadAnnouncements } from "@/lib/announcements";

/**
 * Student top-nav links with a live unread-announcements badge. Async server
 * component — used as the `nav` slot of <AppHeader> on student pages.
 */
export async function StudentNav({
  studentId,
  active,
}: {
  studentId: string;
  active?: "dashboard" | "announcements" | "account";
}) {
  const unread = await countUnreadAnnouncements(studentId);
  const cls = (key: string) => (key === active ? "text-foreground" : "hover:text-foreground");
  return (
    <>
      <Link href="/dashboard" className={cls("dashboard")}>
        Dashboard
      </Link>
      <Link
        href="/announcements"
        className={`inline-flex items-center gap-1.5 ${cls("announcements")}`}
      >
        Announcements
        {unread > 0 && (
          <Badge variant="danger" className="h-5 min-w-5 justify-center px-1 py-0 text-[11px]">
            {unread}
          </Badge>
        )}
      </Link>
      <Link href="/account" className={cls("account")}>
        Account
      </Link>
    </>
  );
}
