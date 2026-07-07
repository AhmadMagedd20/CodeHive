import Link from "next/link";
import { BrandLogo } from "@/components/logo";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "What You Get", href: "#what-you-get" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Log In", href: "/login" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Contact Megz", href: "mailto:thecohortportal@gmail.com" },
      { label: "Help", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-bark-dark px-4 py-14 text-cream sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <BrandLogo variant="horizontal" color="cream" className="h-7" />
            <p className="mt-4 text-sm leading-relaxed text-cream/60">
              A focused cohort space — VOD, solved LeetCode, live lab walk-throughs, and real
              follow-up, run by Megz.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-cream/50">
                  {col.heading}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-cream/80 transition-colors hover:text-cream"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-cream/10 pt-6">
          <p className="text-sm text-cream/50">© 2026 Cohort Portal. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
