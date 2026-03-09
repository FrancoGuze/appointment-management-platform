import { AdminNavbar } from "@/components/admin/navbar";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <AdminNavbar />

      {children}
    </main>
  );
}
