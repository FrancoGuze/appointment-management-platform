export function utcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTimezoneOffsetMinutes(timezoneValue: string | undefined): number {
  if (!timezoneValue) {
    return 0;
  }

  const trimmed = timezoneValue.trim();
  const normalized = trimmed.replace(/^UTC/i, "");
  const match = normalized.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = Number.parseInt(match[3] ?? "0", 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }

  return sign * (hours * 60 + minutes);
}

export function appTimezoneOffsetMinutes(): number {
  return parseTimezoneOffsetMinutes(process.env.TIMEZONE);
}

export function addUtcDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function startOfUtcDay(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

export function dateKeyFromDateInTimezone(date: Date, offsetMinutes: number): string {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateKey(date);
}

export function weekdayFromDateKey(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

export function toUtcSlotFromLocal(
  localDateKey: string,
  localTime: string,
  offsetMinutes: number
): { slotDateUtc: string; slotTimeUtc: string } {
  const [yearRaw, monthRaw, dayRaw] = localDateKey
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  const [hourRaw, minuteRaw] = localTime
    .split(":")
    .map((value) => Number.parseInt(value, 10));

  const utcMillis =
    Date.UTC(yearRaw, (monthRaw ?? 1) - 1, dayRaw ?? 1, hourRaw ?? 0, minuteRaw ?? 0, 0) -
    offsetMinutes * 60_000;
  const utcDate = new Date(utcMillis);
  const slotDateUtc = utcDateKey(utcDate);
  const hh = String(utcDate.getUTCHours()).padStart(2, "0");
  const mm = String(utcDate.getUTCMinutes()).padStart(2, "0");
  const slotTimeUtc = `${hh}:${mm}:00`;

  return { slotDateUtc, slotTimeUtc };
}

export function toLocalDateKeyFromUtcSlot(
  slotDate: string,
  startTime: string
): string {
  const date = new Date(`${slotDate}T${startTime}Z`);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatUtcSlotDateLocal(
  slotDate: string | null,
  startTime: string | null,
  locale: string = "en-US"
): string {
  if (!slotDate || !startTime) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${slotDate}T${startTime}Z`));
}

export function formatUtcSlotTimeLocal(
  slotDate: string | null,
  time: string | null,
  locale: string = "en-US"
): string {
  if (!slotDate || !time) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(`${slotDate}T${time}Z`));
}
