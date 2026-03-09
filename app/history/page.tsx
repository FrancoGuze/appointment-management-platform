"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toastError } from "@/src/lib/notify";
import { UserNavbar } from "@/components/users/navbar";
import {
  readStoredAuthUser,
  type AuthUser,
  USER_SESSION_STORAGE_KEY,
} from "@/src/lib/client-auth";
import { formatUtcSlotDateLocal, formatUtcSlotTimeLocal } from "@/src/lib/datetime";

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface Appointment {
  id: string;
  slot_id: string;
  user_id: string;
  slot_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export default function HistoryPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadAppointments = useCallback(async (): Promise<void> => {
    if (!authUser) {
      setAppointments([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/appointments", { method: "GET" });
      const payload = (await response.json()) as ApiResponse<Appointment[]>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not fetch appointments");
      }

      setAppointments(payload.data);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unexpected error";
      toastError(message);
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    setAuthUser(readStoredAuthUser());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  async function onLogout(): Promise<void> {
    try {
      await fetch("/api/users/logout", { method: "POST" });
    } catch {
      // Client cleanup still runs even if API call fails.
    }

    setAuthUser(null);
    setAppointments([]);
    window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
  }

  const { upcoming, past, nextUpcomingId } = useMemo(() => {
    const now = Date.now();
    const scheduled = appointments
      .filter((appointment) => appointment.status === "scheduled")
      .map((appointment) => ({
        appointment,
        timestamp: Date.parse(`${appointment.slot_date}T${appointment.start_time}Z`),
      }))
      .filter((item) => Number.isFinite(item.timestamp));

    const upcomingScheduled = scheduled
      .filter((item) => item.timestamp >= now)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item) => item.appointment);

    const nextId = upcomingScheduled[0]?.id ?? null;

    const pastFromScheduled = scheduled
      .filter((item) => item.timestamp < now)
      .map((item) => item.appointment);

    const pastByStatus = appointments.filter((appointment) => appointment.status !== "scheduled");

    const pastCombined = [...pastByStatus, ...pastFromScheduled].sort((a, b) => {
      const aStamp = Date.parse(`${a.slot_date}T${a.start_time}Z`);
      const bStamp = Date.parse(`${b.slot_date}T${b.start_time}Z`);
      return bStamp - aStamp;
    });

    return { upcoming: upcomingScheduled, past: pastCombined, nextUpcomingId: nextId };
  }, [appointments]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold">Appointments history</h1>

      {isHydrated ? (
        <UserNavbar
          authUser={authUser}
          onLogout={onLogout}
          onOpenAuth={() => {
            window.location.href = "/?auth=1&redirect=/history";
          }}
        />
      ) : null}

      {!isHydrated ? <p>Loading session...</p> : null}

      {isHydrated && !authUser ? (
        <section className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">
            Login is required to see your appointments history.
          </p>
          <Link
            href="/?auth=1&redirect=/history"
            className="mt-3 inline-block rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Login / Sign up
          </Link>
        </section>
      ) : null}

      {isLoading ? <p>Loading appointments...</p> : null}

      {isHydrated && authUser && !isLoading ? (
        <>
          <section className="rounded-xl border p-4">
            <h2 className="text-lg font-semibold">Upcoming appointments</h2>
            {!upcoming.length ? (
              <p className="mt-2 text-sm text-muted-foreground">No upcoming appointments.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {upcoming.map((appointment) => (
                  <article
                    key={appointment.id}
                    className={[
                      "rounded-md border p-3",
                      appointment.id === nextUpcomingId ? "border-primary bg-primary/5" : "",
                    ].join(" ")}
                  >
                    <p className="text-sm font-medium">
                      {formatUtcSlotDateLocal(appointment.slot_date, appointment.start_time)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatUtcSlotTimeLocal(appointment.slot_date, appointment.start_time)} -{" "}
                      {formatUtcSlotTimeLocal(appointment.slot_date, appointment.end_time)}
                    </p>
                    <p className="text-xs text-muted-foreground">Status: {appointment.status}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border p-4">
            <h2 className="text-lg font-semibold">Past appointments</h2>
            {!past.length ? (
              <p className="mt-2 text-sm text-muted-foreground">No past appointments.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {past.map((appointment) => (
                  <article key={appointment.id} className="rounded-md border p-3">
                    <p className="text-sm font-medium">
                      {formatUtcSlotDateLocal(appointment.slot_date, appointment.start_time)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatUtcSlotTimeLocal(appointment.slot_date, appointment.start_time)} -{" "}
                      {formatUtcSlotTimeLocal(appointment.slot_date, appointment.end_time)}
                    </p>
                    <p className="text-xs text-muted-foreground">Status: {appointment.status}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

