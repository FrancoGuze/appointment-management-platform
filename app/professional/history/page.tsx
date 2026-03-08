"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUtcSlotDateLocal, formatUtcSlotTimeLocal } from "@/src/lib/datetime";

type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";
type HistorySort = "recently_updated" | "date_desc" | "date_asc";

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

function toDateValue(slotDate: string | null): number {
  if (!slotDate) {
    return 0;
  }

  return new Date(`${slotDate}T00:00:00`).getTime();
}

export default function ProfessionalHistoryPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "cancelled" | "no_show"
  >("all");
  const [sortBy, setSortBy] = useState<HistorySort>("recently_updated");
  const [clientQuery, setClientQuery] = useState<string>("");

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

  const historyAppointments = useMemo(() => {
    const withoutScheduled = appointments.filter(
      (appointment) => appointment.status !== "scheduled"
    );

    const byStatus =
      statusFilter === "all"
        ? withoutScheduled
        : withoutScheduled.filter((appointment) => appointment.status === statusFilter);

    const normalizedClientQuery = clientQuery.trim().toLowerCase();
    const byClient = normalizedClientQuery
      ? byStatus.filter((appointment) =>
          appointment.user_id.toLowerCase().includes(normalizedClientQuery)
        )
      : byStatus;

    const sorted = [...byClient];

    if (sortBy === "date_asc") {
      sorted.sort((a, b) => toDateValue(a.slot_date) - toDateValue(b.slot_date));
    } else if (sortBy === "date_desc") {
      sorted.sort((a, b) => toDateValue(b.slot_date) - toDateValue(a.slot_date));
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.updated_at ?? b.created_at).getTime() -
          new Date(a.updated_at ?? a.created_at).getTime()
      );
    }

    return sorted;
  }, [appointments, clientQuery, sortBy, statusFilter]);

  return (
    <section className="rounded-xl border">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold">Appointments history</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Completed, cancelled and no-show appointments.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-b px-4 py-3">
        <label className="text-sm">
          Recently updated / Date
          <select
            className="ml-2 rounded-md border bg-background px-2 py-1"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as HistorySort)}
          >
            <option value="recently_updated">recently_updated</option>
            <option value="date_desc">date_desc</option>
            <option value="date_asc">date_asc</option>
          </select>
        </label>
        <label className="text-sm">
          Status
          <select
            className="ml-2 rounded-md border bg-background px-2 py-1"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "all" | "completed" | "cancelled" | "no_show"
              )
            }
          >
            <option value="all">all</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
            <option value="no_show">no_show</option>
          </select>
        </label>
        <label className="text-sm">
          Client
          <input
            type="text"
            className="ml-2 rounded-md border bg-background px-2 py-1"
            value={clientQuery}
            onChange={(event) => setClientQuery(event.target.value)}
            placeholder="user id"
          />
        </label>
      </div>

      {error ? <p className="px-4 pt-4 text-sm text-red-600">{error}</p> : null}
      {isLoading ? <p className="px-4 py-4">Loading history...</p> : null}

      {!isLoading ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3">Appointment</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {historyAppointments.map((appointment) => (
                <tr key={appointment.id} className="border-t">
                  <td className="px-4 py-3">
                    <p>{appointment.id}</p>
                    <p className="text-xs text-muted-foreground">
                      slot: {appointment.slot_id}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>
                      {formatUtcSlotDateLocal(
                        appointment.slot_date,
                        appointment.start_time
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatUtcSlotTimeLocal(
                        appointment.slot_date,
                        appointment.start_time
                      )}{" "}
                      -{" "}
                      {formatUtcSlotTimeLocal(
                        appointment.slot_date,
                        appointment.end_time
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3">{appointment.user_id}</td>
                  <td className="px-4 py-3">{appointment.status}</td>
                  <td className="px-4 py-3">
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(appointment.created_at))}
                  </td>
                </tr>
              ))}
              {!historyAppointments.length ? (
                <tr>
                  <td className="px-4 py-3" colSpan={5}>
                    No history records match the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
