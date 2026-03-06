import { supabase } from "@/src/lib/supabase";
import { ServiceError } from "@/src/services/errors";

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface Appointment {
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

interface SlotAvailability {
  id: string;
  state: AppointmentStatus;
}

interface SlotMeta {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
}

export interface CreateAppointmentInput {
  slotId: string;
  userId: string;
  notes?: string;
}

async function enrichAppointmentsWithSlotData(
  appointments: Appointment[]
): Promise<Appointment[]> {
  if (!appointments.length) {
    return appointments;
  }

  const slotIds = Array.from(new Set(appointments.map((item) => item.slot_id)));

  const { data, error } = await supabase
    .schema("public")
    .from("slots")
    .select("id, slot_date, start_time, end_time")
    .in("id", slotIds);

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  const slotMap = new Map<string, SlotMeta>(
    ((data ?? []) as SlotMeta[]).map((slot) => [slot.id, slot])
  );

  return appointments.map((appointment) => {
    const slot = slotMap.get(appointment.slot_id);
    return {
      ...appointment,
      slot_date: slot?.slot_date ?? null,
      start_time: slot?.start_time ?? null,
      end_time: slot?.end_time ?? null,
    };
  });
}

async function enrichAppointmentWithSlotData(
  appointment: Appointment
): Promise<Appointment> {
  const [enriched] = await enrichAppointmentsWithSlotData([appointment]);
  return enriched;
}

export async function getAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .schema("public")
    .from("appointments")
    .select("id, slot_id, user_id, professional_id, status, notes, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return enrichAppointmentsWithSlotData((data ?? []) as Appointment[]);
}

export async function getAppointmentsByUserId(userId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .schema("public")
    .from("appointments")
    .select("id, slot_id, user_id, professional_id, status, notes, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return enrichAppointmentsWithSlotData((data ?? []) as Appointment[]);
}

export async function getAppointmentsByProfessionalId(
  professionalId: string
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .schema("public")
    .from("appointments")
    .select("id, slot_id, user_id, professional_id, status, notes, created_at")
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return enrichAppointmentsWithSlotData((data ?? []) as Appointment[]);
}

export async function getAppointmentById(appointmentId: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .schema("public")
    .from("appointments")
    .select("id, slot_id, user_id, professional_id, status, notes, created_at")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  const appointment = (data as Appointment | null) ?? null;

  if (!appointment) {
    return null;
  }

  return enrichAppointmentWithSlotData(appointment);
}

async function assertSlotAvailability(slotId: string): Promise<void> {
  const { data: slot, error: slotError } = await supabase
    .schema("public")
    .from("slots")
    .select("id, state")
    .eq("id", slotId)
    .maybeSingle();

  if (slotError) {
    throw new ServiceError(slotError.message, 500);
  }

  const currentSlot = slot as SlotAvailability | null;

  if (!currentSlot) {
    throw new ServiceError("Slot not found", 404);
  }

  if (currentSlot.state !== "scheduled") {
    throw new ServiceError("Slot is not available", 409);
  }

  const { count, error: appointmentCountError } = await supabase
    .schema("public")
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("slot_id", slotId);

  if (appointmentCountError) {
    throw new ServiceError(appointmentCountError.message, 500);
  }

  if ((count ?? 0) > 0) {
    throw new ServiceError("Slot already has an appointment", 409);
  }
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  await assertSlotAvailability(input.slotId);

  const { data, error } = await supabase
    .schema("public")
    .from("appointments")
    .insert({
      slot_id: input.slotId,
      user_id: input.userId,
      professional_id: null,
      status: "scheduled",
      notes: input.notes ?? null,
    })
    .select("id, slot_id, user_id, professional_id, status, notes, created_at")
    .single();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return enrichAppointmentWithSlotData(data as Appointment);
}

export async function cancelAppointment(appointmentId: string): Promise<Appointment> {
  const currentAppointment = await getAppointmentById(appointmentId);

  if (!currentAppointment) {
    throw new ServiceError("Appointment not found", 404);
  }

  if (currentAppointment.status === "cancelled") {
    throw new ServiceError("Appointment already cancelled", 409);
  }

  const { data, error } = await supabase
    .schema("public")
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .select("id, slot_id, user_id, professional_id, status, notes, created_at")
    .single();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return enrichAppointmentWithSlotData(data as Appointment);
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
): Promise<Appointment> {
  const { data, error } = await supabase
    .schema("public")
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .select("id, slot_id, user_id, professional_id, status, notes, created_at")
    .single();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return enrichAppointmentWithSlotData(data as Appointment);
}

export async function assignProfessionalToAppointment(
  appointmentId: string,
  professionalId: string | null
): Promise<Appointment> {
  const { data, error } = await supabase
    .schema("public")
    .from("appointments")
    .update({ professional_id: professionalId })
    .eq("id", appointmentId)
    .select("id, slot_id, user_id, professional_id, status, notes, created_at")
    .single();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return enrichAppointmentWithSlotData(data as Appointment);
}
