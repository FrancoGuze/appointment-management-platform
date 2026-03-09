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
  isAuthenticated: boolean;
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
  isAuthenticated,
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

  const todayDateKey = toDateKey(new Date());

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
    <section className="grid gap-4 lg:grid-cols-[2fr_3fr] lg:gap-6">
      <article className="rounded-2xl border bg-card/70 p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <button
            type="button"
            className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted sm:px-3 sm:py-2 sm:text-sm"
            onClick={onPrevMonth}
          >
            {"<"}
          </button>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
              Select a day
            </p>
            <h2 className="text-base font-semibold sm:text-lg">{monthLabel(visibleMonth)}</h2>
          </div>
          <button
            type="button"
            className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted sm:px-3 sm:py-2 sm:text-sm"
            onClick={onNextMonth}
          >
            {">"}
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground sm:gap-2 sm:text-[11px]">
          {weekdayHeaders().map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
          {dayCells.map((cell) => {
            const isSelected = selectedDate === cell.dateKey;
            const isToday = cell.dateKey === todayDateKey;
            const totalCount = cell.availableCount + cell.occupiedCount;
            const baseClass = cell.inCurrentMonth ? "" : "opacity-35";
            const selectedClass = isSelected
              ? "border-primary bg-primary/10 ring-2 ring-primary/20"
              : "hover:bg-muted/60";
            const todayClass = isToday ? "ring-1 ring-accent/60" : "";
            const availabilityClass = cell.hasSlots
              ? cell.occupiedCount === totalCount
                ? "border-red-900"
                : cell.occupiedCount > totalCount / 2 &&
                    cell.occupiedCount < totalCount
                  ? "border-rose-300/70"
                  : cell.occupiedCount < totalCount / 2
                    ? "border-emerald-300/70"
                    : "border-orange-300/70"
              : "";

            return (
              <button
                key={cell.dateKey}
                type="button"
                disabled={!cell.hasSlots}
                onClick={() => onSelectDate(cell.dateKey)}
                className={[
                  "aspect-square flex items-center justify-center rounded-lg border p-1.5 text-left text-[11px] transition sm:rounded-xl sm:p-2 sm:text-xs",
                  "disabled:cursor-not-allowed disabled:opacity-35",
                  selectedClass,
                  todayClass,
                  availabilityClass,
                  baseClass,
                ].join(" ")}
              >
                <p className="text-xs font-semibold sm:text-sm">{cell.date.getDate()}</p>

              </button>
            );
          })}
        </div>
      </article>

      <article className="rounded-2xl border bg-card/70 p-3 shadow-sm sm:p-4">
        <h3 className="mb-1 text-base font-semibold sm:text-lg">
          {selectedDate ? formatSelectedDate(selectedDate) : "Choose a date"}
        </h3>
        <p className="mb-3 text-xs text-muted-foreground sm:text-sm">
          {selectedSlots.filter((slot) => slot.availability === "available").length} available
          {" · "}
          {selectedSlots.filter((slot) => slot.availability === "occupied").length} occupied
        </p>

        {!isAuthenticated ? (
          <p className="mb-3 text-sm text-muted-foreground">
            You must log in to make an appointment.
          </p>
        ) : null}
        {!selectedSlots.length ? <p>No slots for this date.</p> : null}

        {selectedSlots.length ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {selectedSlots.map((slot) => {
              const isCurrentBooking = isBooking && activeSlotId === slot.id;
              const isOccupied = slot.availability === "occupied";
              const slotStatusLabel = isCurrentBooking
                ? "Booking..."
                : isOccupied
                  ? "Occupied"
                  : "Available";

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => void onBookSlot(slot.id)}
                  disabled={isBooking || isOccupied}
                  className={[
                    "rounded-xl border px-3 py-2.5 text-left text-sm transition sm:py-3",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    isOccupied
                      ? "border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                      : "border-border hover:bg-muted/60",
                  ].join(" ")}
                >
                  <p className="text-sm font-medium">
                    {formatUtcSlotTimeLocal(slot.slot_date, slot.start_time)} -{" "}
                    {formatUtcSlotTimeLocal(slot.slot_date, slot.end_time)}
                  </p>
                  <p
                    className={[
                      "mt-1 inline-flex rounded px-2 py-0.5 text-[11px] sm:text-xs",
                      isOccupied
                        ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
                    ].join(" ")}
                  >
                    {slotStatusLabel}
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
