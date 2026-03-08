import Link from "next/link";

export default function ProfessionalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <header className="rounded-xl border p-4">
        <h1 className="text-3xl font-semibold">Professional panel</h1>
        <nav className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/professional"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Overview
          </Link>
          <Link
            href="/professional/appointments"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Appointments
          </Link>
          <Link
            href="/professional/history"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            History
          </Link>
        </nav>
      </header>

      {children}
    </main>
  );
}
