"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUtcSlotDateLocal, formatUtcSlotTimeLocal } from "@/src/lib/datetime";

type UserRole = "client" | "professional" | "admin";
type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";
type AppointmentSort = "recently_updated" | "date_desc" | "date_asc";

interface UserSummary {
  userId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
}

interface Appointment {
  id: string;
  slot_id: string;
  user_id: string;
  professional_id: string | null;
  user_full_name: string | null;
  professional_full_name: string | null;
  slot_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: AppointmentStatus;
  updated_at: string | null;
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export default function AppointmentsManagmentPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isSaving, setIsSaving] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<
    "all" | "assigned" | "unassigned"
  >("all");
  const [sortBy, setSortBy] = useState<AppointmentSort>("recently_updated");

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError("");

    try {
      const [usersResponse, appointmentsResponse] = await Promise.all([
        fetch("/api/users", { method: "GET" }),
        fetch("/api/appointments", { method: "GET" }),
      ]);
      const usersPayload = (await usersResponse.json()) as ApiResponse<UserSummary[]>;
      const appointmentsPayload =
        (await appointmentsResponse.json()) as ApiResponse<Appointment[]>;

      if (!usersResponse.ok || !usersPayload.ok || !usersPayload.data) {
        throw new Error(usersPayload.error ?? "Could not load users");
      }

      if (
        !appointmentsResponse.ok ||
        !appointmentsPayload.ok ||
        !appointmentsPayload.data
      ) {
        throw new Error(appointmentsPayload.error ?? "Could not load appointments");
      }

      setUsers(usersPayload.data);
      setAppointments(appointmentsPayload.data);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unexpected error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const professionalUsers = users.filter((user) => user.role === "professional");

  const visibleAppointments = useMemo(() => {
    const filtered = appointments.filter((appointment) => {
      const statusMatch =
        statusFilter === "all" ? true : appointment.status === statusFilter;

      const assignmentMatch =
        assignmentFilter === "all"
          ? true
          : assignmentFilter === "assigned"
            ? Boolean(appointment.professional_id)
            : !appointment.professional_id;

      return statusMatch && assignmentMatch;
    });

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
  }, [appointments, assignmentFilter, sortBy, statusFilter]);

  async function onAssignProfessional(
    appointmentId: string,
    professionalId: string | null
  ): Promise<void> {
    setIsSaving(`assign:${appointmentId}`);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, professionalId }),
      });

      const payload = (await response.json()) as ApiResponse<Appointment>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not assign professional");
      }

      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment.id === payload.data?.id
            ? { ...appointment, ...payload.data }
            : appointment
        )
      );
      setSuccess(`Professional assignment updated for ${payload.data.id}`);
    } catch (assignError) {
      const message =
        assignError instanceof Error ? assignError.message : "Unexpected error";
      setError(message);
    } finally {
      setIsSaving("");
    }
  }

  async function onStatusChange(
    appointmentId: string,
    status: AppointmentStatus
  ): Promise<void> {
    setIsSaving(`status:${appointmentId}:${status}`);
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
        throw new Error(payload.error ?? "Could not update status");
      }

      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment.id === payload.data?.id
            ? { ...appointment, ...payload.data }
            : appointment
        )
      );
      setSuccess(`Status updated for ${payload.data.id}`);
    } catch (statusError) {
      const message =
        statusError instanceof Error ? statusError.message : "Unexpected error";
      setError(message);
    } finally {
      setIsSaving("");
    }
  }
  return (
    <section className="rounded-xl border">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <p className="font-semibold">Appointments managment</p>
        <label className="text-sm">
          Status
          <select
            className="ml-2 rounded-md border bg-background px-2 py-1"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | AppointmentStatus)
            }
          >
            <option value="all">all</option>
            <option value="scheduled">scheduled</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
            <option value="no_show">no_show</option>
          </select>
        </label>
        <label className="text-sm">
          Assignment
          <select
            className="ml-2 rounded-md border bg-background px-2 py-1"
            value={assignmentFilter}
            onChange={(event) =>
              setAssignmentFilter(
                event.target.value as "all" | "assigned" | "unassigned"
              )
            }
          >
            <option value="all">all</option>
            <option value="assigned">assigned</option>
            <option value="unassigned">unassigned</option>
          </select>
        </label>
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

      {error ? <p className="px-4 pt-4 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="px-4 pt-4 text-sm text-green-600">{success}</p> : null}
      {isLoading ? <p className="px-4 py-4">Loading appointments...</p> : null}

      {!isLoading ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3">Appointment</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Professional</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleAppointments.map((appointment) => (
                <tr key={appointment.id} className="border-t align-top">
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
                  <td className="px-4 py-3">
                    <p>{appointment.user_full_name ?? "Unnamed client"}</p>
                    <p className="text-xs text-muted-foreground">
                      {appointment.user_id}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>
                      {appointment.professional_id
                        ? appointment.professional_full_name ?? "Unnamed professional"
                        : "Unassigned"}
                    </p>
                    {appointment.professional_id ? (
                      <p className="text-xs text-muted-foreground">
                        {appointment.professional_id}
                      </p>
                    ) : null}
                    <select
                      className="rounded-md border bg-background px-2 py-1"
                      value={appointment.professional_id ?? ""}
                      onChange={(event) =>
                        onAssignProfessional(
                          appointment.id,
                          event.target.value ? event.target.value : null
                        )
                      }
                      disabled={isSaving === `assign:${appointment.id}`}
                    >
                      <option value="">unassigned</option>
                      {professionalUsers.map((professional) => (
                        <option key={professional.userId} value={professional.userId}>
                          {professional.fullName ?? professional.email}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">{appointment.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md border px-2 py-1 hover:bg-muted"
                        onClick={() => void onStatusChange(appointment.id, "scheduled")}
                        disabled={isSaving === `status:${appointment.id}:scheduled`}
                      >
                        scheduled
                      </button>
                      <button
                        type="button"
                        className="rounded-md border px-2 py-1 hover:bg-muted"
                        onClick={() => void onStatusChange(appointment.id, "completed")}
                        disabled={isSaving === `status:${appointment.id}:completed`}
                      >
                        completed
                      </button>
                      <button
                        type="button"
                        className="rounded-md border px-2 py-1 hover:bg-muted"
                        onClick={() => void onStatusChange(appointment.id, "no_show")}
                        disabled={isSaving === `status:${appointment.id}:no_show`}
                      >
                        no_show
                      </button>
                      <button
                        type="button"
                        className="rounded-md border px-2 py-1 hover:bg-muted"
                        onClick={() => void onStatusChange(appointment.id, "cancelled")}
                        disabled={isSaving === `status:${appointment.id}:cancelled`}
                      >
                        cancelled
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visibleAppointments.length ? (
                <tr>
                  <td className="px-4 py-3" colSpan={6}>
                    No appointments match the current filters.
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
