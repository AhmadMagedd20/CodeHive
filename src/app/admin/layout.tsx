import { requireInstructor } from "@/lib/auth/current-user";
import { AdminRail } from "@/components/admin-rail";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";

function initials(s: string) {
  return s.replace(/@.*/, "").slice(0, 2).toUpperCase();
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const instructor = await requireInstructor();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <AdminRail />

      <div className="md:pl-[84px]">
        <header className="sticky top-0 z-30 bg-paper/85 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="leading-tight">
              <span className="hidden text-[11px] font-medium text-ink/45 sm:block">Welcome to</span>
              <span className="flex items-center gap-2">
                <Logo size="sm" />
                <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Admin
                </span>
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2.5 rounded-full border-brutal border-ink bg-white py-1 pl-1 pr-3">
              <Avatar initials={initials(instructor.name || instructor.email)} />
              <span className="hidden leading-tight sm:block">
                <span className="block text-sm font-semibold">{instructor.name || "Instructor"}</span>
                <span className="block text-[11px] text-ink/45">{instructor.email}</span>
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-2 sm:px-6 md:pb-10">{children}</main>
      </div>
    </div>
  );
}
