"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { AuthUser } from "@/src/lib/client-auth";

interface UserNavbarProps {
  authUser: AuthUser | null;
  onLogout?: () => Promise<void> | void;
  onOpenAuth?: () => void;
}

function linkClass(currentPath: string, href: string): string {
  const isActive = currentPath === href;
  return [
    "w-full rounded-md border px-3 py-2 text-left text-sm",
    isActive ? "bg-muted" : "hover:bg-muted",
  ].join(" ");
}

export function UserNavbar({ authUser, onLogout, onOpenAuth }: UserNavbarProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  return (
    <header className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {authUser ? `Signed in: ${authUser.email}` : "Guest"}
        </p>

        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-controls="user-nav-drawer"
        >
          <svg className="fill-foreground h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M96 160C96 142.3 110.3 128 128 128L512 128C529.7 128 544 142.3 544 160C544 177.7 529.7 192 512 192L128 192C110.3 192 96 177.7 96 160zM96 320C96 302.3 110.3 288 128 288L512 288C529.7 288 544 302.3 544 320C544 337.7 529.7 352 512 352L128 352C110.3 352 96 337.7 96 320zM544 480C544 497.7 529.7 512 512 512L128 512C110.3 512 96 497.7 96 480C96 462.3 110.3 448 128 448L512 448C529.7 448 544 462.3 544 480z"/></svg>
        </button>
      </div>

      <div
        className={[
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-300",
          isMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden={!isMenuOpen}
      />

      <aside
        id="user-nav-drawer"
        className={[
          "fixed right-0 top-0 z-50 h-full w-80 max-w-[85vw] border-l bg-background p-4 shadow-xl flex flex-col transition-transform duration-300 ease-out",
          isMenuOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        aria-hidden={!isMenuOpen}
      >
        <div className="flex items-center justify-between border-b pb-3">
          <p className="text-sm font-semibold">Navigation</p>
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-sm hover:bg-muted"
            onClick={() => setIsMenuOpen(false)}
          >
            <svg className="fill-foreground h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/></svg>
          </button>
        </div>

        <nav className="mt-4 flex flex-col gap-2">
          <Link
            href="/"
            className={linkClass(pathname, "/")}
            onClick={() => setIsMenuOpen(false)}
          >
            Appointments calendar
          </Link>
          <Link
            href="/history"
            className={linkClass(pathname, "/history")}
            onClick={() => setIsMenuOpen(false)}
          >
            Appointments history
          </Link>
          <Link
            href="/profile"
            className={linkClass(pathname, "/profile")}
            onClick={() => setIsMenuOpen(false)}
          >
            User config
          </Link>
        </nav>

        <div className="mt-auto mb-2 flex flex-col gap-2 border-t pt-4">
          <ThemeToggle />
          {authUser ? (
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
              onClick={() => {
                setIsMenuOpen(false);
                void onLogout?.();
              }}
            >
              Logout
            </button>
          ) : (
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
              onClick={() => {
                setIsMenuOpen(false);
                onOpenAuth?.();
              }}
            >
              Login / Sign up
            </button>
          )}
        </div>
      </aside>
    </header>
  );
}
