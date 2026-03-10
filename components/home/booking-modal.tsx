"use client";

import { formatUtcSlotDateLocal, formatUtcSlotTimeLocal } from "@/src/lib/datetime";
import type { CalendarSlot } from "@/src/services/slots";

interface BookingModalProps {
  slot: CalendarSlot | null;
  isBooking: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function BookingModal({
  slot,
  isBooking,
  onCancel,
  onConfirm,
}: BookingModalProps) {
  if (!slot) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-4 shadow-lg">
        <h2 className="text-lg font-semibold">Confirm appointment</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatUtcSlotDateLocal(slot.slot_date, slot.start_time)}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatUtcSlotTimeLocal(slot.slot_date, slot.start_time)} -{" "}
          {formatUtcSlotTimeLocal(slot.slot_date, slot.end_time)}
        </p>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
            onClick={onConfirm}
            disabled={isBooking}
          >
            {isBooking ? "Booking..." : "Confirm booking"}
          </button>
        </div>
      </div>
    </div>
  );
}
