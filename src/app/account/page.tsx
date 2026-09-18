import { requireStudent } from "@/lib/auth/current-user";
import { AppShell } from "@/components/app-shell";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const student = await requireStudent();

  return (
    <AppShell student={student} active="account">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 font-display text-subsection">Account settings</h1>

        <div className="mb-6 rounded-card border-brutal border-ink bg-white p-6">
          <p className="font-display text-lg font-extrabold tracking-display">Profile</p>
          <p className="mb-4 text-sm text-ink/55">Your account details.</p>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink/55">Username</dt>
              <dd className="font-semibold">{student.username}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink/55">Email</dt>
              <dd className="font-semibold">{student.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink/55">University</dt>
              <dd className="font-semibold">{student.university}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink/55">Status</dt>
              <dd>
                <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-ink">
                  {student.state.replace(/_/g, " ")}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-card border-brutal border-ink bg-white p-6">
          <p className="font-display text-lg font-extrabold tracking-display">Change password</p>
          <p className="mb-4 text-sm text-ink/55">Update the password you use to sign in.</p>
          <ChangePasswordForm />
        </div>
      </div>
    </AppShell>
  );
}
