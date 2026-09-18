import { redirect } from "next/navigation";

// There's no manual approval step anymore (a confirmed email activates the
// account), so the old pending-registrations queue is gone. Send /admin to the
// students overview.
export default function AdminHome() {
  redirect("/admin/students");
}
