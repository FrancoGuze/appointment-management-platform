import { supabase } from "@/src/lib/supabase";
import { ServiceError } from "@/src/services/errors";

export type SlotState =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show"
  | "available";

export interface Slot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  state: SlotState;
  created_at: string;
  updated_at: string | null;
}

interface AvailabilityTemplateRow {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

interface AppointmentSlotRow {
  id: string;
  slot_id: string;
}

interface SlotSeed {
  slot_date: string;
  start_time: string;
  end_time: string;
}

interface GenerationOptions {
  daysAhead?: number;
}

interface GenerationContext {
  daysAhead: number;
  candidateSeeds: SlotSeed[];
  existingSlots: Slot[];
  existingByKey: Map<string, Slot>;
  takenSlotIds: Set<string>;
  takenIntervalsByDate: Map<string, Array<{ start_time: string; end_time: string }>>;
}

export interface SlotGenerationSummary {
  mode: "generate" | "regenerate";
  daysAhead: number;
  generatedCandidates: number;
  inserted: number;
  skippedExisting: number;
  skippedCollision: number;
  removedUntakenObsolete: number;
}

export type CalendarSlotAvailability = "available" | "occupied";

export interface CalendarSlot extends Slot {
  availability: CalendarSlotAvailability;
  appointmentId: string | null;
}

const DEFAULT_GENERATION_DAYS = 5;
const MAX_GENERATION_DAYS = 90;

/* ============================================================================
 * SECTION 1: AUXILIARY FUNCTIONS
 * ========================================================================== */

function normalizeDaysAhead(value: number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    const days = Math.floor(value);
    if (days >= 1 && days <= MAX_GENERATION_DAYS) {
      return days;
    }
  }

  const envValue = Number.parseInt(process.env.SLOT_GENERATION_DAYS ?? "", 10);

  if (
    Number.isInteger(envValue) &&
    envValue >= 1 &&
    envValue <= MAX_GENERATION_DAYS
  ) {
    return envValue;
  }

  return DEFAULT_GENERATION_DAYS;
}

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number.parseInt(part, 10));
  return hours * 60 + minutes;
}

function minutesToTime(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function slotKey(slotDate: string, startTime: string, endTime: string): string {
  return `${slotDate}|${startTime}|${endTime}`;
}

/* Overlap rule: A starts before B ends AND B starts before A ends. */
function overlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = parseTimeToMinutes(startA);
  const aEnd = parseTimeToMinutes(endA);
  const bStart = parseTimeToMinutes(startB);
  const bEnd = parseTimeToMinutes(endB);

  return aStart < bEnd && bStart < aEnd;
}

function buildTakenIntervalsByDate(
  existingSlots: Slot[],
  takenSlotIds: Set<string>
): Map<string, Array<{ start_time: string; end_time: string }>> {
  const intervals = new Map<string, Array<{ start_time: string; end_time: string }>>();

  for (const slot of existingSlots) {
    if (!takenSlotIds.has(slot.id)) {
      continue;
    }

    if (!intervals.has(slot.slot_date)) {
      intervals.set(slot.slot_date, []);
    }

    intervals.get(slot.slot_date)?.push({
      start_time: slot.start_time,
      end_time: slot.end_time,
    });
  }

  return intervals;
}

function collidesWithTaken(
  seed: SlotSeed,
  takenIntervalsByDate: Map<string, Array<{ start_time: string; end_time: string }>>
): boolean {
  const intervals = takenIntervalsByDate.get(seed.slot_date) ?? [];
  return intervals.some((interval) =>
    overlaps(seed.start_time, seed.end_time, interval.start_time, interval.end_time)
  );
}

/* ============================================================================
 * SECTION 2: SLOT GENERATION AREA
 * ========================================================================== */

async function getAvailabilityTemplates(): Promise<AvailabilityTemplateRow[]> {
  const { data, error } = await supabase
    .schema("public")
    .from("availability_templates")
    .select("id, weekday, start_time, end_time, slot_duration_minutes");

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return (data ?? []) as AvailabilityTemplateRow[];
}

/* Builds candidate slots from templates for each day in the target range. */
function buildSlotSeeds(
  templates: AvailabilityTemplateRow[],
  daysAhead: number
): SlotSeed[] {
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const templatesByWeekday = new Map<number, AvailabilityTemplateRow[]>();

  for (const template of templates) {
    if (!templatesByWeekday.has(template.weekday)) {
      templatesByWeekday.set(template.weekday, []);
    }
    templatesByWeekday.get(template.weekday)?.push(template);
  }

  const generated: SlotSeed[] = [];

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const currentDateUtc = new Date(todayUtc);
    currentDateUtc.setUTCDate(todayUtc.getUTCDate() + offset);
    const currentDateKey = currentDateUtc.toISOString().slice(0, 10);
    const weekday = currentDateUtc.getUTCDay();
    const dayTemplates = templatesByWeekday.get(weekday) ?? [];

    for (const template of dayTemplates) {
      if (template.slot_duration_minutes <= 0) {
        continue;
      }

      const dayStartMinutes = parseTimeToMinutes(template.start_time);
      const dayEndMinutes = parseTimeToMinutes(template.end_time);

      for (
        let cursor = dayStartMinutes;
        cursor + template.slot_duration_minutes <= dayEndMinutes;
        cursor += template.slot_duration_minutes
      ) {
        generated.push({
          slot_date: currentDateKey,
          start_time: minutesToTime(cursor),
          end_time: minutesToTime(cursor + template.slot_duration_minutes),
        });
      }
    }
  }

  const deduplicated = new Map<string, SlotSeed>();

  for (const seed of generated) {
    deduplicated.set(slotKey(seed.slot_date, seed.start_time, seed.end_time), seed);
  }

  return Array.from(deduplicated.values());
}

async function getExistingSlotsInRange(daysAhead: number): Promise<Slot[]> {
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const fromDate = todayUtc.toISOString().slice(0, 10);
  const toDateUtc = new Date(todayUtc);
  toDateUtc.setUTCDate(todayUtc.getUTCDate() + daysAhead - 1);
  const toDate = toDateUtc.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .schema("public")
    .from("slots")
    .select("id, slot_date, start_time, end_time, state, created_at, updated_at")
    .gte("slot_date", fromDate)
    .lte("slot_date", toDate);

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return (data ?? []) as Slot[];
}

async function getTakenSlotIds(slotIds: string[]): Promise<Set<string>> {
  if (!slotIds.length) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .schema("public")
    .from("appointments")
    .select("id, slot_id")
    .in("slot_id", slotIds);

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  const appointments = (data ?? []) as AppointmentSlotRow[];
  return new Set(appointments.map((appointment) => appointment.slot_id));
}

async function insertSlots(slotSeeds: SlotSeed[]): Promise<number> {
  if (!slotSeeds.length) {
    return 0;
  }

  const { error } = await supabase
    .schema("public")
    .from("slots")
    .insert(
      slotSeeds.map((seed) => ({
        slot_date: seed.slot_date,
        start_time: seed.start_time,
        end_time: seed.end_time,
        state: "available",
        updated_at: new Date().toISOString(),
      }))
    );

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return slotSeeds.length;
}

async function buildGenerationContext(
  options?: GenerationOptions
): Promise<GenerationContext> {
  const daysAhead = normalizeDaysAhead(options?.daysAhead);
  const templates = await getAvailabilityTemplates();
  const candidateSeeds = buildSlotSeeds(templates, daysAhead);
  const existingSlots = await getExistingSlotsInRange(daysAhead);

  const existingByKey = new Map<string, Slot>();
  for (const slot of existingSlots) {
    existingByKey.set(slotKey(slot.slot_date, slot.start_time, slot.end_time), slot);
  }

  const existingSlotIds = existingSlots.map((slot) => slot.id);
  const takenSlotIds = await getTakenSlotIds(existingSlotIds);
  const takenIntervalsByDate = buildTakenIntervalsByDate(existingSlots, takenSlotIds);

  return {
    daysAhead,
    candidateSeeds,
    existingSlots,
    existingByKey,
    takenSlotIds,
    takenIntervalsByDate,
  };
}

function computeInsertableSeeds(
  context: GenerationContext
): { seedsToInsert: SlotSeed[]; skippedExisting: number; skippedCollision: number } {
  let skippedExisting = 0;
  let skippedCollision = 0;
  const seedsToInsert: SlotSeed[] = [];

  for (const seed of context.candidateSeeds) {
    const key = slotKey(seed.slot_date, seed.start_time, seed.end_time);

    if (context.existingByKey.has(key)) {
      skippedExisting += 1;
      continue;
    }

    if (collidesWithTaken(seed, context.takenIntervalsByDate)) {
      skippedCollision += 1;
      continue;
    }

    seedsToInsert.push(seed);
  }

  return { seedsToInsert, skippedExisting, skippedCollision };
}

export async function generateSlotsFromTemplates(
  options?: GenerationOptions
): Promise<SlotGenerationSummary> {
  const context = await buildGenerationContext(options);
  const { seedsToInsert, skippedExisting, skippedCollision } =
    computeInsertableSeeds(context);
  const inserted = await insertSlots(seedsToInsert);

  return {
    mode: "generate",
    daysAhead: context.daysAhead,
    generatedCandidates: context.candidateSeeds.length,
    inserted,
    skippedExisting,
    skippedCollision,
    removedUntakenObsolete: 0,
  };
}

/* ============================================================================
 * SECTION 3: SLOT RE-GENERATION AREA
 * ========================================================================== */

async function deleteSlots(slotIds: string[]): Promise<number> {
  if (!slotIds.length) {
    return 0;
  }

  const { error } = await supabase
    .schema("public")
    .from("slots")
    .delete()
    .in("id", slotIds);

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return slotIds.length;
}

export async function regenerateSlotsFromTemplates(
  options?: GenerationOptions
): Promise<SlotGenerationSummary> {
  const context = await buildGenerationContext(options);
  const { seedsToInsert, skippedExisting, skippedCollision } =
    computeInsertableSeeds(context);

  const candidateKeySet = new Set(
    context.candidateSeeds.map((seed) =>
      slotKey(seed.slot_date, seed.start_time, seed.end_time)
    )
  );

  const obsoleteUntakenSlotIds = context.existingSlots
    .filter((slot) => {
      const key = slotKey(slot.slot_date, slot.start_time, slot.end_time);
      return !context.takenSlotIds.has(slot.id) && !candidateKeySet.has(key);
    })
    .map((slot) => slot.id);

  const removedUntakenObsolete = await deleteSlots(obsoleteUntakenSlotIds);
  const inserted = await insertSlots(seedsToInsert);

  return {
    mode: "regenerate",
    daysAhead: context.daysAhead,
    generatedCandidates: context.candidateSeeds.length,
    inserted,
    skippedExisting,
    skippedCollision,
    removedUntakenObsolete,
  };
}

export async function getCalendarSlots(): Promise<CalendarSlot[]> {
  const utcTodayDateKey = new Date().toISOString().slice(0, 10);

  const { data: slotData, error: slotError } = await supabase
    .schema("public")
    .from("slots")
    .select("id, slot_date, start_time, end_time, state, created_at, updated_at")
    .gte("slot_date", utcTodayDateKey)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (slotError) {
    throw new ServiceError(slotError.message, 500);
  }

  const slots = (slotData ?? []) as Slot[];

  if (!slots.length) {
    return [];
  }

  const slotIds = slots.map((slot) => slot.id);

  const { data: appointmentData, error: appointmentError } = await supabase
    .schema("public")
    .from("appointments")
    .select("id, slot_id")
    .in("slot_id", slotIds);

  if (appointmentError) {
    throw new ServiceError(appointmentError.message, 500);
  }

  const appointments = (appointmentData ?? []) as AppointmentSlotRow[];
  const appointmentBySlotId = new Map<string, string>();

  for (const appointment of appointments) {
    if (!appointmentBySlotId.has(appointment.slot_id)) {
      appointmentBySlotId.set(appointment.slot_id, appointment.id);
    }
  }

  return slots.map((slot) => {
    const appointmentId = appointmentBySlotId.get(slot.id) ?? null;
    const hasAppointment = Boolean(appointmentId);

    return {
      ...slot,
      appointmentId,
      availability:
        (slot.state === "scheduled" || slot.state === "available") && !hasAppointment
          ? "available"
          : "occupied",
    };
  });
}
