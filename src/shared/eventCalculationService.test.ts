import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateUpcomingEvents,
  getAgeAtDate,
  getNextBirthdayDate,
  getReminderNextDate,
  getYearsOfService,
  isBirthdayToday,
  isJoinedDateAnniversaryToday,
  isReminderDueToday,
} from "./eventCalculationService";
import { DEFAULT_SETTINGS } from "./types";
import type { Reminder, Volunteer, VolunteerIndex } from "./types";

function volunteer(overrides: Partial<Volunteer> = {}): Volunteer {
  return {
    id: "volunteer-1",
    _version: 1,
    _createdAt: "2020-01-01T00:00:00.000Z",
    _updatedAt: "2020-01-01T00:00:00.000Z",
    statusLog: [],
    firstName: "Ada",
    lastName: "Lovelace",
    status: "active",
    roles: [],
    notes: "",
    reminders: [],
    fileRecords: [],
    requirements: [],
    ...overrides,
  };
}

function reminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: "reminder-1",
    type: "custom",
    title: "Follow up",
    message: "",
    dismissed: false,
    ...overrides,
  };
}

function index(status: "active" | "archived" = "active"): VolunteerIndex {
  return {
    _version: 1,
    _updatedAt: "2026-01-01T00:00:00.000Z",
    volunteers: [
      {
        id: "volunteer-1",
        firstName: "Ada",
        lastName: "Lovelace",
        status,
        roles: [],
        _updatedAt: "2026-01-01T00:00:00.000Z",
        requirementsStatus: {},
      },
    ],
  };
}

describe("event calculation helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates the next birthday, including birthdays today", () => {
    const today = new Date(2026, 9, 21, 12);

    expect(getNextBirthdayDate("1990-10-21", today)).toEqual(
      new Date(2026, 9, 21),
    );
    expect(getNextBirthdayDate("1990-10-20", today)).toEqual(
      new Date(2027, 9, 20),
    );
  });

  it("gets future custom and yearly birthday reminders, ignoring dismissed reminders", () => {
    const today = new Date(2026, 9, 21, 12);
    const person = volunteer({ dateOfBirth: "1990-11-01" });

    expect(
      getReminderNextDate(
        reminder({ triggerDate: "2026-10-25" }),
        person,
        today,
      ),
    ).toEqual(new Date(2026, 9, 25));
    expect(
      getReminderNextDate(reminder({ dismissed: true }), person, today),
    ).toBeNull();
    expect(
      getReminderNextDate(
        reminder({ type: "birthday-every-year" }),
        person,
        today,
      ),
    ).toEqual(new Date(2026, 10, 1));
    expect(
      getReminderNextDate(
        reminder({
          type: "birthday-round",
          roundBirthdayYears: [45, 46],
        }),
        volunteer({ dateOfBirth: "1980-11-01" }),
        today,
      ),
    ).toEqual(new Date(2026, 10, 1));
    expect(
      getReminderNextDate(
        reminder({ triggerDate: "2026-10-20" }),
        person,
        today,
      ),
    ).toBeNull();
  });

  it("detects due reminders and birthdays by calendar day", () => {
    const today = new Date(2026, 9, 21, 12);
    const person = volunteer({ dateOfBirth: "1990-10-21" });

    expect(
      isReminderDueToday(
        reminder({ triggerDate: "2026-10-21" }),
        person,
        today,
      ),
    ).toBe(true);
    expect(
      isReminderDueToday(
        reminder({ triggerDate: "2026-10-20" }),
        person,
        today,
      ),
    ).toBe(false);
    expect(isBirthdayToday("1990-10-21", today)).toBe(true);
    expect(isBirthdayToday("1990-10-22", today)).toBe(false);
  });

  it("calculates age and years of service for a supplied date", () => {
    const date = new Date(2026, 9, 21);

    expect(getAgeAtDate("1990-10-21", date)).toBe(36);
    expect(getYearsOfService("2020-10-22", date)).toBe(5);
    expect(isJoinedDateAnniversaryToday("2020-10-21", date)).toBe(true);
    expect(isJoinedDateAnniversaryToday("2020-10-22", date)).toBe(false);
  });

  it("calculates milestone, anniversary, activity, and requirement events", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 12));
    const person = volunteer({
      dateOfBirth: "1976-10-23",
      joinedDate: "2016-10-23",
      statusLog: [
        { timestamp: "2021-10-22", from: null, to: "active" },
      ],
      requirements: [
        { requirementType: "hygieneschulung", completedDate: "2025-10-22" },
      ],
    });
    const activeIndex = index();
    activeIndex.volunteers[0].dateOfBirth = person.dateOfBirth;
    activeIndex.volunteers[0].joinedDate = person.joinedDate;
    const settings = {
      ...DEFAULT_SETTINGS,
      enableYearlyBirthdayReminders: false,
      enableRoundBirthdayReminders: true,
      roundBirthdayYears: [50],
      enableJoinedDateAnniversaryReminders: true,
      joinedDateAnniversaryYears: [10],
      enableActivityTimeAnniversaryReminders: true,
      activityTimeAnniversaryYears: [5, 6],
      enableRequirementRenewalReminders: true,
    };

    const events = await calculateUpcomingEvents(
      activeIndex,
      settings,
      async () => person,
      { daysLimit: 400 },
    );

    expect(events.map(({ kind }) => kind)).toEqual([
      "requirement-renewal",
      "birthday-round",
      "anniversary-joined",
      "anniversary-activity",
    ]);
    expect(events).toMatchObject([
      { kind: "requirement-renewal", date: "2026-10-22" },
      { kind: "birthday-round", label: "50. Geburtstag (Runder Geburtstag!)" },
      { kind: "anniversary-joined", label: "10-jähriges Jubiläum (Eintrittsdatum)" },
      { kind: "anniversary-activity", label: "6-jähriges Jubiläum (Aktivitätszeit)" },
    ]);
  });

  it("includes past events only for the selected month and limits today-only results", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 12));
    const person = volunteer({ dateOfBirth: "1990-10-20" });
    const activeIndex = index();
    activeIndex.volunteers[0].dateOfBirth = person.dateOfBirth;
    const settings = {
      ...DEFAULT_SETTINGS,
      enableYearlyBirthdayReminders: true,
      enableRoundBirthdayReminders: false,
      enableJoinedDateAnniversaryReminders: false,
      enableActivityTimeAnniversaryReminders: false,
      enableRequirementRenewalReminders: false,
    };

    const pastBirthday = await calculateUpcomingEvents(
      activeIndex,
      settings,
      async () => person,
      { includePastInMonth: new Date(2026, 9, 1) },
    );
    expect(pastBirthday).toMatchObject([{ date: "2026-10-20", daysUntil: -1 }]);

    const todayEvents = await calculateUpcomingEvents(
      activeIndex,
      settings,
      async () => person,
      { todayOnly: true },
    );
    expect(todayEvents).toEqual([]);
  });

  it("skips birthday reminders without dates and avoids failing event sources", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 12));
    const person = volunteer({ reminders: [reminder({ type: "custom" })] });
    const settings = {
      ...DEFAULT_SETTINGS,
      enableYearlyBirthdayReminders: false,
      enableRoundBirthdayReminders: false,
      enableActivityTimeAnniversaryReminders: true,
      enableRequirementRenewalReminders: true,
    };

    expect(
      getReminderNextDate(
        reminder({ type: "birthday-round" }),
        volunteer(),
        new Date(2026, 9, 21),
      ),
    ).toBeNull();
    expect(
      getReminderNextDate(
        reminder({ type: "custom" }),
        person,
        new Date(2026, 9, 21),
      ),
    ).toBeNull();
    expect(
      isReminderDueToday(
        reminder({ dismissed: true, triggerDate: "2026-10-21" }),
        person,
        new Date(2026, 9, 21),
      ),
    ).toBe(false);

    const events = await calculateUpcomingEvents(
      index(),
      settings,
      async () => {
        throw new Error("record is unavailable");
      },
    );
    expect(events).toEqual([]);
  });

  it("creates sorted upcoming birthday events, applies limits, and skips archived records", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 12));
    const activeIndex = index();
    activeIndex.volunteers[0].dateOfBirth = "1990-10-23";

    const events = await calculateUpcomingEvents(
      activeIndex,
      {
        ...DEFAULT_SETTINGS,
        enableYearlyBirthdayReminders: true,
        enableRoundBirthdayReminders: false,
        enableJoinedDateAnniversaryReminders: false,
        enableActivityTimeAnniversaryReminders: false,
        enableRequirementRenewalReminders: false,
      },
      undefined,
      { daysLimit: 3 },
    );

    expect(events).toMatchObject([
      {
        volunteerId: "volunteer-1",
        eventType: "birthday",
        kind: "birthday",
        daysUntil: 2,
        date: "2026-10-23",
      },
    ]);

    const archivedEvents = await calculateUpcomingEvents(
      index("archived"),
      {
        ...DEFAULT_SETTINGS,
        enableYearlyBirthdayReminders: true,
        enableRoundBirthdayReminders: false,
        enableJoinedDateAnniversaryReminders: false,
        enableActivityTimeAnniversaryReminders: false,
        enableRequirementRenewalReminders: false,
      },
      undefined,
      { daysLimit: 3 },
    );
    expect(archivedEvents).toEqual([]);
  });

  it("includes upcoming custom reminders and normalizes group meeting dates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 12));
    const person = volunteer({
      reminders: [reminder({ triggerDate: "2026-10-22" })],
    });
    const events = await calculateUpcomingEvents(
      index(),
      {
        ...DEFAULT_SETTINGS,
        enableYearlyBirthdayReminders: false,
        enableRoundBirthdayReminders: false,
        enableJoinedDateAnniversaryReminders: false,
        enableActivityTimeAnniversaryReminders: false,
        enableRequirementRenewalReminders: false,
      },
      async () => person,
      { daysLimit: 3 },
      {
        _version: 1,
        _updatedAt: "2026-01-01T00:00:00.000Z",
        meetings: [
          {
            id: "meeting-1",
            title: "Team meeting",
            date: "2026-10-22",
            participants: [{ id: "volunteer-1", name: "Ada", type: "volunteer" }],
            _createdAt: "2026-01-01T00:00:00.000Z",
            _updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    );

    expect(events.map(({ kind }) => kind)).toEqual(["custom", "group-meeting"]);
    expect(events[1]).toMatchObject({
      meetingId: "meeting-1",
      daysUntil: 1,
      date: "2026-10-22T09:00",
      participants: [{ id: "volunteer-1", type: "volunteer" }],
    });
  });
});
