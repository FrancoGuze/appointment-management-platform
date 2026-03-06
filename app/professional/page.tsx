"use client";

import { useCallback, useEffect, useState } from "react";

type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

interface Appointment {
  id: string;
  slot_id: string;
  user_id: string;
  professional_id: string | null;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

function statusBadgeClass(status: AppointmentStatus): string {
  if (status === "completed") return "text-green-700";
  if (status === "cancelled") return "text-red-700";
  if (status === "no_show") return "text-amber-700";
  return "text-blue-700";
}

export default function ProfessionalPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const loadAppointments = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/appointments", { method: "GET" });
      const payload = (await response.json()) as ApiResponse<Appointment[]>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not load appointments");
      }

      setAppointments(payload.data);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unexpected error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  async function updateStatus(
    appointmentId: string,
    status: AppointmentStatus
  ): Promise<void> {
    setIsSaving(appointmentId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, status }),
      });
      const payload = (await response.json()) as ApiResponse<Appointment>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not update appointment");
      }

      setAppointments((current) =>
        current.map((item) => (item.id === payload.data?.id ? payload.data : item))
      );
      setSuccess(`Appointment ${payload.data.id} updated to ${payload.data.status}`);
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : "Unexpected error";
      setError(message);
    } finally {
      setIsSaving("");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold">Professional appointments</h1>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-600">{success}</p> : null}

      {isLoading ? <p>Loading appointments...</p> : null}

      {!isLoading && appointments.length === 0 ? (
        <p>No assigned appointments found.</p>
      ) : null}

      {!isLoading && appointments.length > 0 ? (
        <section className="flex flex-col gap-3">
          {appointments.map((appointment) => (
            <article key={appointment.id} className="rounded-xl border p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Appointment: {appointment.id}
                </p>
                <p className={`text-sm font-medium ${statusBadgeClass(appointment.status)}`}>
                  {appointment.status}
                </p>
              </div>
              <div className="mb-3 text-sm">
                <p>User ID: {appointment.user_id}</p>
                <p>Slot ID: {appointment.slot_id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
                  disabled={isSaving === appointment.id}
                  onClick={() => void updateStatus(appointment.id, "completed")}
                >
                  Mark completed
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
                  disabled={isSaving === appointment.id}
                  onClick={() => void updateStatus(appointment.id, "no_show")}
                >
                  Mark no-show
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
                  disabled={isSaving === appointment.id}
                  onClick={() => void updateStatus(appointment.id, "cancelled")}
                >
                  Cancel
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
