import type { CalendarSlot } from "@/src/services/slots";
import { requestApi } from "@/src/services/api-client";

export async function fetchSlots(): Promise<CalendarSlot[]> {
  return requestApi<CalendarSlot[]>(
    "/api/slots",
    { method: "GET" },
    "Could not load slots"
  );
}
