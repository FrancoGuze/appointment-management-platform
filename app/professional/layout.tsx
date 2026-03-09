import { ProfessionalNavbar } from "@/components/professional/navbar";

export default function ProfessionalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <ProfessionalNavbar />

      {children}
    </main>
  );
}
