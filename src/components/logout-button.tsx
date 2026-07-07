import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Logs out via a POST form (works without client JS). */
export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <Button type="submit" variant="ghost" size="sm">
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </form>
  );
}
