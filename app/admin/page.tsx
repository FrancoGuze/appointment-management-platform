export default function AdminPage() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is reserved for admin charts and summary metrics.
        </p>
      </article>
      <article className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Users</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Go to Users management to update user roles.
        </p>
      </article>
      <article className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Appointments</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Go to Appointments management to assign professionals and update statuses.
        </p>
      </article>
    </section>
  );
}
