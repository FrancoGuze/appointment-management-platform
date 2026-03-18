"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toastError, toastSuccess } from "@/src/lib/notify";
import { getErrorMessage, requireApiData } from "@/src/lib/api-client";
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

export default function AppointmentsManagementPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<string>("");
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const [openProfessionalMenuId, setOpenProfessionalMenuId] = useState<string | null>(null);
  const professionalMenuRef = useRef<HTMLDivElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<
    "all" | "assigned" | "unassigned"
  >("all");
  const [sortBy, setSortBy] = useState<AppointmentSort>("recently_updated");

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const [usersResponse, appointmentsResponse] = await Promise.all([
        fetch("/api/users", { method: "GET" }),
        fetch("/api/appointments", { method: "GET" }),
      ]);
      const usersPayload = (await usersResponse.json()) as ApiResponse<UserSummary[]>;
      const appointmentsPayload =
        (await appointmentsResponse.json()) as ApiResponse<Appointment[]>;
      const usersData = requireApiData(
        usersResponse,
        usersPayload,
        "Could not load users"
      );
      const appointmentsData = requireApiData(
        appointmentsResponse,
        appointmentsPayload,
        "Could not load appointments"
      );

      setUsers(usersData);
      setAppointments(appointmentsData);
    } catch (loadError) {
      const message = getErrorMessage(loadError, "Could not load data");
      toastError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!openActionMenuId && !openProfessionalMenuId) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;

      if (openActionMenuId && actionMenuRef.current) {
        if (!target || !actionMenuRef.current.contains(target)) {
          setOpenActionMenuId(null);
        }
      }

      if (openProfessionalMenuId && professionalMenuRef.current) {
        if (!target || !professionalMenuRef.current.contains(target)) {
          setOpenProfessionalMenuId(null);
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [openActionMenuId, openProfessionalMenuId]);

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

    try {
      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, professionalId }),
      });

      const payload = (await response.json()) as ApiResponse<Appointment>;
      const data = requireApiData(
        response,
        payload,
        "Could not assign professional"
      );

      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment.id === data.id
            ? { ...appointment, ...data }
            : appointment
        )
      );
      toastSuccess(`Professional assignment updated for ${data.id}`);
    } catch (assignError) {
      const message = getErrorMessage(assignError, "Could not assign professional");
      toastError(message);
    } finally {
      setIsSaving("");
    }
  }

  async function onStatusChange(
    appointmentId: string,
    status: AppointmentStatus
  ): Promise<void> {
    setIsSaving(`status:${appointmentId}:${status}`);

    try {
      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, status }),
      });

      const payload = (await response.json()) as ApiResponse<Appointment>;
      const data = requireApiData(response, payload, "Could not update status");

      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment.id === data.id
            ? { ...appointment, ...data }
            : appointment
        )
      );
      toastSuccess(`Status updated for ${data.id}`);
    } catch (statusError) {
      const message = getErrorMessage(statusError, "Could not update status");
      toastError(message);
    } finally {
      setIsSaving("");
    }
  }
  return (
    <section className="rounded-xl border">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <p className="font-semibold">Appointments management</p>
        <label className="text-sm">
          Status
          <select
            className="ml-2 rounded-md border bg-background px-2 py-1"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | AppointmentStatus)
            }
          >
            <option value="all">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No show</option>
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
            <option value="all">All</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </label>
        <label className="text-sm">
          Sort
          <select
            className="ml-2 rounded-md border bg-background px-2 py-1"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as AppointmentSort)}
          >
            <option value="recently_updated">Recently updated</option>
            <option value="date_desc">Date desc</option>
            <option value="date_asc">Date asc</option>
          </select>
        </label>
      </div>

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
                    <div
                      className="relative inline-flex items-start justify-between gap-2 rounded-md border px-2 py-1"
                      ref={
                        openProfessionalMenuId === appointment.id
                          ? professionalMenuRef
                          : null
                      }
                    >
                      <p>
                        {appointment.professional_id
                          ? appointment.professional_full_name ??
                            "Unnamed professional"
                          : "Unassigned"}
                      </p>
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 hover:bg-muted"
                        aria-haspopup="menu"
                        aria-expanded={openProfessionalMenuId === appointment.id}
                        onClick={() => {
                          setOpenActionMenuId(null);
                          setOpenProfessionalMenuId((current) =>
                            current === appointment.id ? null : appointment.id
                          );
                        }}
                      >
                        <svg
                          className="h-4 w-4 fill-foreground"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 640 640"
                          aria-hidden="true"
                        >
                          <path d="M100.4 417.2C104.5 402.6 112.2 389.3 123 378.5L304.2 197.3L338.1 163.4C354.7 180 389.4 214.7 442.1 267.4L476 301.3L442.1 335.2L260.9 516.4C250.2 527.1 236.8 534.9 222.2 539L94.4 574.6C86.1 576.9 77.1 574.6 71 568.4C64.9 562.2 62.6 553.3 64.9 545L100.4 417.2zM156 413.5C151.6 418.2 148.4 423.9 146.7 430.1L122.6 517L209.5 492.9C215.9 491.1 221.7 487.8 226.5 483.2L155.9 413.5zM510 267.4C493.4 250.8 458.7 216.1 406 163.4L372 129.5C398.5 103 413.4 88.1 416.9 84.6C430.4 71 448.8 63.4 468 63.4C487.2 63.4 505.6 71 519.1 84.6L554.8 120.3C568.4 133.9 576 152.3 576 171.4C576 190.5 568.4 209 554.8 222.5C551.3 226 536.4 240.9 509.9 267.4z" />
                        </svg>
                      </button>
                      {openProfessionalMenuId === appointment.id ? (
                        <div
                          className="absolute right-0 top-full z-10 mt-2 w-56 rounded-md border bg-background p-1 shadow-lg"
                          role="menu"
                        >
                          <button
                            type="button"
                            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setOpenProfessionalMenuId(null);
                              void onAssignProfessional(appointment.id, null);
                            }}
                            disabled={isSaving === `assign:${appointment.id}`}
                            role="menuitem"
                          >
                            unassigned
                          </button>
                          {professionalUsers.map((professional) => (
                            <button
                              key={professional.userId}
                              type="button"
                              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                setOpenProfessionalMenuId(null);
                                void onAssignProfessional(
                                  appointment.id,
                                  professional.userId
                                );
                              }}
                              disabled={isSaving === `assign:${appointment.id}`}
                              role="menuitem"
                            >
                              {professional.fullName ?? professional.email}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(appointment.status.charAt(0).toUpperCase() +
                      appointment.status.slice(1)).replace("_", " ")}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="relative inline-block"
                      ref={openActionMenuId === appointment.id ? actionMenuRef : null}
                    >
                      <button
                        type="button"
                        className="rounded-md border px-2 py-1 hover:bg-muted"
                        aria-haspopup="menu"
                        aria-expanded={openActionMenuId === appointment.id}
                        onClick={() =>
                          setOpenActionMenuId((current) =>
                            current === appointment.id ? null : appointment.id
                          )
                        }
                      >
                        <svg
                          className="h-4 w-4 fill-foreground"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 640 640"
                          aria-hidden="true"
                        >
                          <path d="M320 208C289.1 208 264 182.9 264 152C264 121.1 289.1 96 320 96C350.9 96 376 121.1 376 152C376 182.9 350.9 208 320 208zM320 432C350.9 432 376 457.1 376 488C376 518.9 350.9 544 320 544C289.1 544 264 518.9 264 488C264 457.1 289.1 432 320 432zM376 320C376 350.9 350.9 376 320 376C289.1 376 264 350.9 264 320C264 289.1 289.1 264 320 264C350.9 264 376 289.1 376 320z" />
                        </svg>
                      </button>
                      {openActionMenuId === appointment.id ? (
                        <div
                          className="absolute right-0 z-10 mt-2 w-40 rounded-md border bg-background p-1 shadow-lg"
                          role="menu"
                        >
                          <button
                            type="button"
                            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              void onStatusChange(appointment.id, "scheduled");
                            }}
                            disabled={isSaving === `status:${appointment.id}:scheduled`}
                            role="menuitem"
                          >
                            Scheduled
                          </button>
                          <button
                            type="button"
                            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              void onStatusChange(appointment.id, "completed");
                            }}
                            disabled={isSaving === `status:${appointment.id}:completed`}
                            role="menuitem"
                          >
                            Completed
                          </button>
                          <button
                            type="button"
                            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              void onStatusChange(appointment.id, "no_show");
                            }}
                            disabled={isSaving === `status:${appointment.id}:no_show`}
                            role="menuitem"
                          >
                            No show
                          </button>
                          <button
                            type="button"
                            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              void onStatusChange(appointment.id, "cancelled");
                            }}
                            disabled={isSaving === `status:${appointment.id}:cancelled`}
                            role="menuitem"
                          >
                            Cancelled
                          </button>
                        </div>
                      ) : null}
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

