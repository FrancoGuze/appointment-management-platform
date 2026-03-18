"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toastError, toastSuccess } from "@/src/lib/notify";
import { getErrorMessage, requireApiData } from "@/src/lib/api-client";
import { formatUtcSlotDateLocal, formatUtcSlotTimeLocal } from "@/src/lib/datetime";

type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";
type AppointmentSort = "recently_updated" | "date_desc" | "date_asc";

interface Appointment {
  id: string;
  slot_id: string;
  user_id: string;
  professional_id: string | null;
  slot_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export default function ProfessionalAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<string>("");
  const [sortBy, setSortBy] = useState<AppointmentSort>("recently_updated");
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    appointmentId: string;
    status: "completed" | "cancelled";
    prompt: string;
    confirmLabel: string;
    cancelLabel: string;
  } | null>(null);

  const loadAppointments = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/appointments", { method: "GET" });
      const payload = (await response.json()) as ApiResponse<Appointment[]>;
      const data = requireApiData(
        response,
        payload,
        "Could not load appointments"
      );
      setAppointments(data);
    } catch (loadError) {
      const message = getErrorMessage(loadError, "Could not load appointments");
      toastError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const incomingAppointments = useMemo(() => {
    const filtered = appointments.filter(
      (appointment) => appointment.status === "scheduled"
    );
    const sorted = [...filtered];

    if (sortBy === "date_asc") {
      sorted.sort((a, b) =>
        `${a.slot_date ?? ""} ${a.start_time ?? ""}`.localeCompare(
          `${b.slot_date ?? ""} ${b.start_time ?? ""}`
        )
      );
    } else if (sortBy === "date_desc") {
      sorted.sort((a, b) =>
        `${b.slot_date ?? ""} ${b.start_time ?? ""}`.localeCompare(
          `${a.slot_date ?? ""} ${a.start_time ?? ""}`
        )
      );
    } else {
      sorted.sort((a, b) => {
        const aUpdated = a.updated_at ?? a.slot_date ?? "";
        const bUpdated = b.updated_at ?? b.slot_date ?? "";
        return bUpdated.localeCompare(aUpdated);
      });
    }

    return sorted;
  }, [appointments, sortBy]);

  async function updateStatus(
    appointmentId: string,
    status: "completed" | "cancelled" | "no_show"
  ): Promise<void> {
    setIsSaving(appointmentId);

    try {
      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, status }),
      });
      const payload = (await response.json()) as ApiResponse<Appointment>;
      const data = requireApiData(
        response,
        payload,
        "Could not update appointment"
      );

      setAppointments((current) =>
        current.map((item) => (item.id === data.id ? data : item))
      );
      toastSuccess(`Appointment ${data.id} updated to ${data.status}`);
    } catch (updateError) {
      const message = getErrorMessage(updateError, "Could not update appointment");
      toastError(message);
    } finally {
      setIsSaving("");
    }
  }

  function requestStatusChange(
    appointmentId: string,
    status: "completed" | "cancelled",
    prompt: string,
    confirmLabel: string,
    cancelLabel: string
  ): void {
    setPendingStatusChange({
      appointmentId,
      status,
      prompt,
      confirmLabel,
      cancelLabel,
    });
  }

  return (
    <section className="rounded-xl border p-4">
      <h2 className="text-xl font-semibold">Incoming appointments</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Only scheduled appointments are shown here.
      </p>
      <div className="mt-3">
        <label className="text-sm">
          Sort
          <select
            className="ml-2 rounded-md border bg-background px-2 py-1"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as AppointmentSort)}
          >
            <option value="recently_updated">recently_updated</option>
            <option value="date_desc">date_desc</option>
            <option value="date_asc">date_asc</option>
          </select>
        </label>
      </div>

      {isLoading ? <p className="mt-4">Loading appointments...</p> : null}

      {!isLoading && incomingAppointments.length === 0 ? (
        <p className="mt-4">No incoming appointments.</p>
      ) : null}

      {!isLoading && incomingAppointments.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {incomingAppointments.map((appointment) => (
            <article key={appointment.id} className="rounded-lg border p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Appointment: {appointment.id}
                </p>
                <p className="text-sm font-medium text-blue-700">scheduled</p>
              </div>
              <div className="mb-3 text-sm">
                <p>Client: {appointment.user_id}</p>
                <p>
                  Date/time:{" "}
                  {formatUtcSlotDateLocal(appointment.slot_date, appointment.start_time)}{" "}
                  {formatUtcSlotTimeLocal(
                    appointment.slot_date,
                    appointment.start_time
                  )}{" "}
                  -{" "}
                  {formatUtcSlotTimeLocal(appointment.slot_date, appointment.end_time)}
                </p>
                <p>Slot: {appointment.slot_id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
                  disabled={isSaving === appointment.id}
                  onClick={() =>
                    requestStatusChange(
                      appointment.id,
                      "completed",
                      "Have you already completed this appointment?",
                      "Yes, I completed it",
                      "No yet"
                    )
                  }
                >
                  Mark completed
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
                  disabled={isSaving === appointment.id}
                  onClick={() =>
                    requestStatusChange(
                      appointment.id,
                      "cancelled",
                      "Are you sure you are going to cancel this appointment?",
                      "Yes, I am sure",
                      "No, cancel"
                    )
                  }
                >
                  Cancel
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {pendingStatusChange ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPendingStatusChange(null)}
            aria-hidden="true"
          />
          <div
            className="relative z-10 w-[90%] max-w-xs rounded-lg border bg-background p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-status-title"
          >
            <h3 id="confirm-status-title" className="text-lg font-semibold">
              Confirm status change
            </h3>
            <p className="mt-4 text-sm text-muted-foreground">
              {pendingStatusChange.prompt}
            </p>
            <div className="mt-6 flex w-full gap-2">
              <button
                type="button"
                className={[
                  "flex-[2] rounded-md px-3 py-2 text-sm",
                  pendingStatusChange.status === "completed"
                    ? "bg-emerald-950 text-emerald-50 hover:bg-emerald-900"
                    : "bg-red-950 text-red-50 hover:bg-red-900",
                ].join(" ")}
                onClick={() => {
                  const action = pendingStatusChange;
                  setPendingStatusChange(null);
                  void updateStatus(action.appointmentId, action.status);
                }}
              >
                {pendingStatusChange.confirmLabel}
              </button>
              <button
                type="button"
                className="flex-1 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setPendingStatusChange(null)}
              >
                {pendingStatusChange.cancelLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

