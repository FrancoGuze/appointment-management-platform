export default function ProfessionalPage() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is reserved for professional charts and summary metrics.
        </p>
      </article>
      <article className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Appointments</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Go to Appointments to process incoming scheduled services.
        </p>
      </article>
      <article className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">History</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Go to History to review completed, cancelled and no-show appointments.
        </p>
      </article>
    </section>
  );
}
