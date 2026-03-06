"use client";

import { useCallback, useEffect, useState } from "react";

type UserRole = "client" | "professional" | "admin";
type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

interface UserSummary {
  userId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  createdAt: string | null;
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

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
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  return value.slice(0, 5);
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all");

  const loadAdminData = useCallback(async (): Promise<void> => {
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
    void loadAdminData();
  }, [loadAdminData]);

  const professionalUsers = users.filter((user) => user.role === "professional");

  const visibleAppointments = appointments.filter((appointment) => {
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

  async function onRoleChange(userId: string, role: UserRole): Promise<void> {
    setIsSaving(`role:${userId}`);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      const payload = (await response.json()) as ApiResponse<UserSummary>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not update role");
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.userId === payload.data?.userId ? payload.data : user
        )
      );
      setSuccess(`Role updated for ${payload.data.email}`);
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : "Unexpected error";
      setError(message);
    } finally {
      setIsSaving("");
    }
  }

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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold">Admin operations</h1>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-600">{success}</p> : null}

      {isLoading ? <p>Loading admin data...</p> : null}

      {!isLoading ? (
        <section className="overflow-x-auto rounded-xl border">
          <div className="border-b px-4 py-3 font-semibold">User role management</div>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId} className="border-t">
                  <td className="px-4 py-3">{user.fullName ?? "-"}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-md border bg-background px-2 py-1"
                      value={user.role}
                      onChange={(event) =>
                        void onRoleChange(user.userId, event.target.value as UserRole)
                      }
                      disabled={isSaving === `role:${user.userId}`}
                    >
                      <option value="client">client</option>
                      <option value="professional">professional</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {!isLoading ? (
        <section className="rounded-xl border">
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
            <p className="font-semibold">Appointment management</p>
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
          </div>

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
                      <p>{appointment.slot_date ?? "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                      </p>
                    </td>
                    <td className="px-4 py-3">{appointment.user_id}</td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-md border bg-background px-2 py-1"
                        value={appointment.professional_id ?? ""}
                        onChange={(event) =>
                          void onAssignProfessional(
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
        </section>
      ) : null}
    </main>
  );
}
