import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { BrandLogo } from "@/components/logo";

/** Top bar for authenticated pages. `nav` lets each area add its own links. */
export function AppHeader({
  email,
  role,
  nav,
}: {
  email: string;
  role: string;
  nav?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="Cohort Portal home" className="flex items-center">
            <BrandLogo variant="horizontal" priority className="h-6" />
          </Link>
          <span className="h-5 w-px bg-border" aria-hidden />
          <LogoutButton />
          <span className="hidden text-sm text-muted-foreground md:inline">
            {email} · {role}
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">{nav}</nav>
      </div>
    </header>
  );
}
