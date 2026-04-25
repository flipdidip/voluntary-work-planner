const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export const DEFAULT_EVENT_TIME = "09:00";

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeEventDateTime(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (DATE_ONLY_PATTERN.test(trimmed)) {
      return `${trimmed}T${DEFAULT_EVENT_TIME}`;
    }
    if (DATE_TIME_PATTERN.test(trimmed)) {
      return trimmed;
    }
  }

  return `${getTodayDateString()}T${DEFAULT_EVENT_TIME}`;
}

export function getDatePart(value: string): string {
  return normalizeEventDateTime(value).slice(0, 10);
}

export function getTimePart(value: string): string {
  const match = normalizeEventDateTime(value).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : DEFAULT_EVENT_TIME;
}

export function combineDateAndTime(date: string, time: string): string {
  const safeDate = DATE_ONLY_PATTERN.test(date) ? date : getTodayDateString();
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : DEFAULT_EVENT_TIME;
  return `${safeDate}T${safeTime}`;
}
