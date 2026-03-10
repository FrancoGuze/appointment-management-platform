"use client";

import { formatUtcSlotDateLocal, formatUtcSlotTimeLocal } from "@/src/lib/datetime";
import type { Appointment } from "@/src/services/appointments-client";

interface NextAppointmentCardProps {
  appointment: Appointment;
  isLoading: boolean;
}

export function NextAppointmentCard({
  appointment,
  isLoading,
}: NextAppointmentCardProps) {
  return (
    <section className="rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Your next appointment</h2>
      {isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="mt-2 text-sm">
          <p>
            {formatUtcSlotDateLocal(appointment.slot_date, appointment.start_time)}
          </p>
          <p className="text-muted-foreground">
            {formatUtcSlotTimeLocal(appointment.slot_date, appointment.start_time)} -{" "}
            {formatUtcSlotTimeLocal(appointment.slot_date, appointment.end_time)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Appointment id: {appointment.id}
          </p>
        </div>
      )}
    </section>
  );
}
