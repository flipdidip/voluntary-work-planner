import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateActivityTime,
  calculateGroupMeetingParticipationStats,
  calculateRequirementExpiryDate,
  calculateRequirementsStatus,
  formatActivityTime,
  getActivityPeriods,
  getMediaConsentLevel,
  getVolunteerMediaConsentLevel,
  isUserRole,
} from "./types";
import type {
  GroupMeeting,
  RequirementRecord,
  Volunteer,
} from "./types";

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

function meeting(participants: GroupMeeting["participants"]): GroupMeeting {
  return {
    id: "meeting-1",
    title: "Meeting",
    date: "2026-01-01T10:00",
    participants,
    _createdAt: "2026-01-01T00:00:00.000Z",
    _updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("shared domain calculations", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("validates supported user roles", () => {
    expect(isUserRole("primary")).toBe(true);
    expect(isUserRole("intern-read-only")).toBe(true);
    expect(isUserRole("admin")).toBe(false);
    expect(isUserRole(null)).toBe(false);
  });

  it("defaults legacy or absent media consent to red", () => {
    const record: RequirementRecord = {
      requirementType: "bildundton",
      mediaConsentLevel: "green",
    };

    expect(getMediaConsentLevel(record)).toBe("green");
    expect(getMediaConsentLevel()).toBe("red");
    expect(getVolunteerMediaConsentLevel([record])).toBe("green");
    expect(getVolunteerMediaConsentLevel([])).toBeNull();
  });

  it("counts meeting attendance and excludes unknown responses from the rate", () => {
    const meetings = [
      meeting([
        { id: "volunteer-1", name: "Ada", type: "volunteer", attendance: "present" },
        { id: "volunteer-1", name: "Ada", type: "volunteer", attendance: "absent" },
        { id: "volunteer-1", name: "Ada", type: "volunteer" },
        { id: "partner-1", name: "Partner", type: "partner", attendance: "present" },
      ]),
    ];

    expect(
      calculateGroupMeetingParticipationStats(
        meetings,
        "volunteer-1",
        "volunteer",
      ),
    ).toEqual({
      invitedCount: 3,
      presentCount: 1,
      absentCount: 1,
      unknownCount: 1,
      attendanceRate: 50,
    });
  });

  it("builds ordered activity periods and totals only active time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-03T00:00:00.000Z"));
    const person = volunteer({
      statusLog: [
        {
          timestamp: "2026-01-02T00:00:00.000Z",
          from: "inactive",
          to: "active",
        },
        {
          timestamp: "2026-01-01T00:00:00.000Z",
          from: null,
          to: "inactive",
        },
      ],
    });

    expect(getActivityPeriods(person)).toEqual([
      {
        start: "2026-01-01T00:00:00.000Z",
        end: "2026-01-02T00:00:00.000Z",
        status: "inactive",
      },
      {
        start: "2026-01-02T00:00:00.000Z",
        end: null,
        status: "active",
      },
    ]);
    expect(calculateActivityTime(person)).toBe(24 * 60 * 60 * 1000);
    expect(formatActivityTime(400 * 24 * 60 * 60 * 1000)).toBe(
      "1 Jahr, 1 Monat, 5 Tage",
    );
  });

  it("marks requirements missing, complete, or expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T12:00:00.000Z"));
    const requirements: RequirementRecord[] = [
      {
        requirementType: "grundkurs",
        completedDate: "2025-01-01",
      },
      {
        requirementType: "verhaltenskodex",
        completedDate: "2025-01-01",
      },
      {
        requirementType: "hygieneschulung",
        completedDate: "2025-01-01",
        filePath: "hygiene.pdf",
      },
      {
        requirementType: "fuehrungszeugnis",
        completedDate: "2024-01-01",
      },
    ];

    const status = calculateRequirementsStatus(volunteer({ requirements }));

    expect(status.grundkurs).toBe("complete");
    expect(status.verhaltenskodex).toBe("missing");
    expect(status.hygieneschulung).toBe("expired");
    expect(status.fuehrungszeugnis).toBe("complete");
    expect(status.bildundton).toBe("missing");
  });

  it("returns expiry dates only for completed renewable requirements", () => {
    const completed = { requirementType: "hygieneschulung" as const, completedDate: "2026-01-15" };

    expect(
      calculateRequirementExpiryDate(completed, "hygieneschulung"),
    ).toEqual(new Date("2027-01-15T00:00:00.000Z"));
    expect(
      calculateRequirementExpiryDate(
        { requirementType: "grundkurs" },
        "grundkurs",
      ),
    ).toBeNull();
    expect(
      calculateRequirementExpiryDate(
        { requirementType: "hygieneschulung" },
        "hygieneschulung",
      ),
    ).toBeNull();
  });
});
