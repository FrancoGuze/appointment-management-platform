import Link from "next/link";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <header className="rounded-xl border p-4">
        <h1 className="text-3xl font-semibold">Admin panel</h1>
        <nav className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Overview
          </Link>
          <Link
            href="/admin/users-managment"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Users managment
          </Link>
          <Link
            href="/admin/appointments-managment"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Appointments managment
          </Link>
        </nav>
      </header>

      {children}
    </main>
  );
}
