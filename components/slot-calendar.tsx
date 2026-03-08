"use client";

import { useMemo, useState } from "react";
import type { CalendarSlot } from "@/src/services/slots";
import {
  formatUtcSlotTimeLocal,
  toLocalDateKeyFromUtcSlot,
} from "@/src/lib/datetime";

interface SlotCalendarProps {
  slots: CalendarSlot[];
  isBooking: boolean;
  activeSlotId: string | null;
  onBookSlot: (slotId: string) => Promise<void>;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function weekdayHeaders(): string[] {
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const baseSunday = new Date("2026-01-04T00:00:00");
  return Array.from({ length: 7 }, (_, dayOffset) =>
    formatter.format(new Date(baseSunday.getTime() + dayOffset * 24 * 60 * 60 * 1000))
  );
}

function formatSelectedDate(dateKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

export function SlotCalendar({
  slots,
  isBooking,
  activeSlotId,
  onBookSlot,
}: SlotCalendarProps) {
  const slotsByDate = useMemo(() => {
    return slots.reduce<Record<string, CalendarSlot[]>>((acc, slot) => {
      const localDateKey = toLocalDateKeyFromUtcSlot(slot.slot_date, slot.start_time);

      if (!acc[localDateKey]) {
        acc[localDateKey] = [];
      }
      acc[localDateKey].push(slot);
      return acc;
    }, {});
  }, [slots]);

  const availableDateKeys = useMemo(
    () => Object.keys(slotsByDate).sort((a, b) => a.localeCompare(b)),
    [slotsByDate]
  );

  const defaultSelectedDate = availableDateKeys[0] ?? null;
  const [selectedDateOverride, setSelectedDateOverride] = useState<string | null>(
    defaultSelectedDate
  );
  const selectedDate = useMemo(() => {
    if (selectedDateOverride && availableDateKeys.includes(selectedDateOverride)) {
      return selectedDateOverride;
    }

    return availableDateKeys[0] ?? null;
  }, [availableDateKeys, selectedDateOverride]);

  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const initialDate = defaultSelectedDate
      ? parseDateKey(defaultSelectedDate)
      : new Date();
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });

  if (!availableDateKeys.length) {
    return <p>No slots available.</p>;
  }

  const currentMonthStart = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1
  );
  const currentMonthEnd = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0
  );

  const firstGridDate = new Date(currentMonthStart);
  firstGridDate.setDate(currentMonthStart.getDate() - currentMonthStart.getDay());

  const dayCells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + index);
    const dateKey = toDateKey(date);
    const dateSlots = slotsByDate[dateKey] ?? [];
    const availableCount = dateSlots.filter(
      (slot) => slot.availability === "available"
    ).length;
    const occupiedCount = dateSlots.length - availableCount;

    return {
      date,
      dateKey,
      inCurrentMonth:
        date >= currentMonthStart &&
        date <= currentMonthEnd,
      hasSlots: dateSlots.length > 0,
      availableCount,
      occupiedCount,
    };
  });

  const selectedSlots = selectedDate ? slotsByDate[selectedDate] ?? [] : [];

  function onPrevMonth(): void {
    setVisibleMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() - 1, 1)
    );
  }

  function onNextMonth(): void {
    setVisibleMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() + 1, 1)
    );
  }

  function onSelectDate(dateKey: string): void {
    setSelectedDateOverride(dateKey);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <article className="rounded-xl border p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-sm hover:bg-muted"
            onClick={onPrevMonth}
          >
            Prev
          </button>
          <h2 className="text-lg font-semibold">{monthLabel(visibleMonth)}</h2>
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-sm hover:bg-muted"
            onClick={onNextMonth}
          >
            Next
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
          {weekdayHeaders().map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {dayCells.map((cell) => {
            const isSelected = selectedDate === cell.dateKey;
            const baseClass = cell.inCurrentMonth ? "" : "opacity-40";

            return (
              <button
                key={cell.dateKey}
                type="button"
                disabled={!cell.hasSlots}
                onClick={() => onSelectDate(cell.dateKey)}
                className={[
                  "min-h-[4.5rem] rounded-md border p-2 text-left text-xs",
                  "disabled:cursor-not-allowed disabled:opacity-35",
                  isSelected ? "border-primary bg-primary/10" : "hover:bg-muted",
                  baseClass,
                ].join(" ")}
              >
                <p className="text-sm font-medium">{cell.date.getDate()}</p>
                {cell.hasSlots ? (
                  <p className="mt-1 text-[11px]">
                    A:{cell.availableCount} O:{cell.occupiedCount}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </article>

      <article className="rounded-xl border p-4">
        <h3 className="mb-3 text-lg font-semibold">
          {selectedDate ? formatSelectedDate(selectedDate) : "Choose a date"}
        </h3>

        {!selectedSlots.length ? <p>No slots for this date.</p> : null}

        {selectedSlots.length ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {selectedSlots.map((slot) => {
              const isCurrentBooking = isBooking && activeSlotId === slot.id;
              const isOccupied = slot.availability === "occupied";

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => void onBookSlot(slot.id)}
                  disabled={isBooking || isOccupied}
                  className={[
                    "rounded-md border px-3 py-2 text-left text-sm",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    isOccupied ? "border-slate-300 bg-slate-100 text-slate-500" : "hover:bg-muted",
                  ].join(" ")}
                >
                  <p className="font-medium">
                    {formatUtcSlotTimeLocal(slot.slot_date, slot.start_time)} -{" "}
                    {formatUtcSlotTimeLocal(slot.slot_date, slot.end_time)}
                  </p>
                  <p className="text-xs">
                    {isCurrentBooking
                      ? "Booking..."
                      : isOccupied
                        ? "Occupied"
                        : "Available"}
                  </p>
                </button>
              );
            })}
          </div>
        ) : null}
      </article>
    </section>
  );
}
