import { requestApi } from "@/src/services/api-client";

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  id: string;
  slot_id: string;
  user_id: string;
  professional_id?: string | null;
  user_full_name?: string | null;
  professional_full_name?: string | null;
  slot_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export async function fetchAppointments(): Promise<Appointment[]> {
  return requestApi<Appointment[]>(
    "/api/appointments",
    { method: "GET" },
    "Could not load appointments"
  );
}

export async function createAppointment(slotId: string): Promise<Appointment> {
  return requestApi<Appointment>(
    "/api/appointments",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId }),
    },
    "Could not create appointment"
  );
}
