"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthUser } from "@/src/lib/client-auth";

interface UserNavbarProps {
  authUser: AuthUser | null;
  onLogout?: () => Promise<void> | void;
  onOpenAuth?: () => void;
}

function linkClass(currentPath: string, href: string): string {
  const isActive = currentPath === href;
  return [
    "rounded-md border px-3 py-2 text-sm",
    isActive ? "bg-muted" : "hover:bg-muted",
  ].join(" ");
}

export function UserNavbar({ authUser, onLogout, onOpenAuth }: UserNavbarProps) {
  const pathname = usePathname();

  return (
    <header className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2">
          <Link href="/" className={linkClass(pathname, "/")}>
            Appointments calendar
          </Link>
          <Link
            href="/history"
            className={linkClass(pathname, "/history")}
          >
            Appointments history
          </Link>
          <Link href="/profile" className={linkClass(pathname, "/profile")}>
            User config
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {authUser ? `Signed in: ${authUser.email}` : "Guest"}
          </p>
          {authUser ? (
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
              onClick={() => void onLogout?.()}
            >
              Logout
            </button>
          ) : (
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
              onClick={onOpenAuth}
            >
              Login / Sign up
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
