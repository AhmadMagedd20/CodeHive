"use client";

import { usePathname } from "next/navigation";
import {
  Users,
  ClipboardList,
  CalendarCheck,
  LayoutGrid,
  Megaphone,
  Wallet,
  SquarePen,
  TrendingUp,
  ScrollText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { IconRail, type RailNavItem } from "@/components/icon-rail";

const NAV: { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/admin/students", icon: Users, label: "Students" },
  { href: "/admin/roster", icon: ClipboardList, label: "Roster" },
  { href: "/admin/attendance", icon: CalendarCheck, label: "Attendance" },
  { href: "/admin/courses", icon: LayoutGrid, label: "Courses" },
  { href: "/admin/announcements", icon: Megaphone, label: "Announcements" },
  { href: "/admin/payments", icon: Wallet, label: "Payments" },
  { href: "/admin/grading", icon: SquarePen, label: "Grading" },
  { href: "/admin/progress", icon: TrendingUp, label: "Progress" },
  { href: "/admin/audit", icon: ScrollText, label: "Audit log" },
  { href: "/admin/settings", icon: Settings, label: "Site settings" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Admin's left icon rail — the shared dock, with the admin sections. */
export function AdminRail() {
  const pathname = usePathname();
  const items: RailNavItem[] = NAV.map((n) => ({ ...n, active: isActive(pathname, n.href) }));

  return (
    <IconRail
      items={items}
      logoHref="/admin/students"
      logoLabel="Cohort Portal admin"
      mobileScrollable
      logoutInMobile
    />
  );
}
