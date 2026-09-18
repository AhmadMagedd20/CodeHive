"use client";

import {
  LayoutGrid,
  Compass,
  Megaphone,
  Wallet,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { IconRail, type RailNavItem } from "@/components/icon-rail";

export type StudentNavKey = "dashboard" | "catalog" | "announcements" | "purchases" | "account";

const NAV: { key: StudentNavKey; href: string; icon: LucideIcon; label: string; announce?: boolean }[] =
  [
    { key: "dashboard", href: "/dashboard", icon: LayoutGrid, label: "Dashboard" },
    { key: "catalog", href: "/catalog", icon: Compass, label: "Browse courses" },
    {
      key: "announcements",
      href: "/announcements",
      icon: Megaphone,
      label: "Announcements",
      announce: true,
    },
    { key: "purchases", href: "/purchases", icon: Wallet, label: "Purchases" },
    { key: "account", href: "/account", icon: UserRound, label: "Account" },
  ];

/** Student's left icon rail — the shared dock, with the student sections. */
export function StudentRail({ active, unread }: { active: StudentNavKey; unread: number }) {
  const items: RailNavItem[] = NAV.map((n) => ({
    href: n.href,
    icon: n.icon,
    label: n.label,
    active: active === n.key,
    badge: n.announce ? unread : undefined,
  }));

  return <IconRail items={items} logoHref="/dashboard" logoLabel="Cohort Portal home" />;
}
