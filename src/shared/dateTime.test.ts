import { afterEach, describe, expect, it, vi } from "vitest";
import {
  combineDateAndTime,
  DEFAULT_EVENT_TIME,
  getDatePart,
  getTimePart,
  normalizeEventDateTime,
} from "./dateTime";

describe("event date/time helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("normalizes date-only input to the default event time", () => {
    expect(normalizeEventDateTime(" 2026-10-21 ")).toBe("2026-10-21T09:00");
  });

  it("preserves a date-time value and extracts its parts", () => {
    const value = "2026-10-21T14:35:00.000Z";

    expect(normalizeEventDateTime(value)).toBe(value);
    expect(getDatePart(value)).toBe("2026-10-21");
    expect(getTimePart(value)).toBe("14:35");
  });

  it("uses today's date and the default time for unsupported input", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T12:00:00.000Z"));

    expect(normalizeEventDateTime(null)).toBe(`2026-10-21T${DEFAULT_EVENT_TIME}`);
    expect(getTimePart("not-a-date")).toBe(DEFAULT_EVENT_TIME);
  });

  it("combines valid date and time and falls back for invalid parts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T12:00:00.000Z"));

    expect(combineDateAndTime("2026-04-03", "17:45")).toBe(
      "2026-04-03T17:45",
    );
    expect(combineDateAndTime("invalid", "bad")).toBe(
      `2026-10-21T${DEFAULT_EVENT_TIME}`,
    );
  });
});
