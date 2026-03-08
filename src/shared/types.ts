// ─────────────────────────────────────────────────
// Shared types between Electron main and React renderer
// ─────────────────────────────────────────────────

export type VolunteerStatus = "active" | "inactive" | "archived";

export type ReminderType = "birthday-round" | "birthday-every-year" | "custom";

export interface Reminder {
  id: string;
  type: ReminderType;
  /** For 'custom': ISO date string of when to trigger */
  triggerDate?: string;
  /** For 'birthday-round': which round birthdays to remind (e.g. [50, 60, 70]) */
  roundBirthdayYears?: number[];
  title: string;
  message: string;
  /** Has the user dismissed this reminder instance */
  dismissed: boolean;
  /** ISO date of last dismissal */
  dismissedAt?: string;
  /** ISO date this reminder was last triggered / shown */
  lastTriggeredAt?: string;
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface ContactPerson {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface StatusLogEntry {
  timestamp: string; // ISO timestamp
  from: VolunteerStatus | null; // null for initial status
  to: VolunteerStatus;
  note?: string;
}

export interface Volunteer {
  id: string;
  /** Optimistic locking — increment on every write */
  _version: number;
  _createdAt: string; // ISO timestamp
  _updatedAt: string; // ISO timestamp

  /** Log of status changes for tracking activity time */
  statusLog: StatusLogEntry[];

  // Personal data
  firstName: string;
  lastName: string;
  dateOfBirth?: string; // ISO date (YYYY-MM-DD)
  gender?: "male" | "female" | "diverse" | "unspecified";

  // Contact
  phone?: string;
  mobile?: string;
  email?: string;
  address?: Address;

  // Emergency / next-of-kin
  emergencyContact?: ContactPerson;

  // Volunteer metadata
  status: VolunteerStatus;
  joinedDate?: string; // ISO date
  roles: string[]; // e.g. ['Sterbebegleitung', 'Fahrdienst']
  notes: string;

  // Reminders attached to this volunteer
  reminders: Reminder[];
}

// ─────────────────────────────────────────────────
// Search index — stored in index.json
// ─────────────────────────────────────────────────

export interface VolunteerIndexEntry {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  joinedDate?: string;
  status: VolunteerStatus;
  roles: string[];
  _updatedAt: string;
}

export interface VolunteerIndex {
  _version: number;
  _updatedAt: string;
  volunteers: VolunteerIndexEntry[];
}

// ─────────────────────────────────────────────────
// IPC channel names (type-safe)
// ─────────────────────────────────────────────────

export const IPC = {
  // App settings
  GET_DATA_PATH: "get-data-path",
  SET_DATA_PATH: "set-data-path",
  SELECT_DATA_FOLDER: "select-data-folder",
  GET_SETTINGS: "get-settings",
  SAVE_SETTINGS: "save-settings",

  // Volunteers
  GET_VOLUNTEER_INDEX: "get-volunteer-index",
  GET_VOLUNTEER: "get-volunteer",
  SAVE_VOLUNTEER: "save-volunteer",
  DELETE_VOLUNTEER: "delete-volunteer",

  // Reminders
  GET_DUE_REMINDERS: "get-due-reminders",
  DISMISS_REMINDER: "dismiss-reminder",
  SIMULATE_REMINDER: "simulate-reminder",
  REMINDER_TRIGGERED: "reminder-triggered", // main → renderer push event

  // App info
  GET_APP_VERSION: "get-app-version",
} as const;

// ─────────────────────────────────────────────────
// App settings — stored in electron userData
// ─────────────────────────────────────────────────

export interface AppSettings {
  dataFolderPath: string;
  reminderCheckIntervalMinutes: number;
  language: "de" | "en";
  // Global birthday reminder settings
  enableYearlyBirthdayReminders: boolean;
  enableRoundBirthdayReminders: boolean;
  roundBirthdayYears: number[];
  // DSGVO/GDPR compliance
  privacyConsentGiven: boolean;
  privacyConsentDate?: string; // ISO timestamp
  privacyConsentVersion: string; // e.g. "1.0"
}

export const DEFAULT_SETTINGS: AppSettings = {
  dataFolderPath: "",
  reminderCheckIntervalMinutes: 60,
  language: "de",
  enableYearlyBirthdayReminders: true,
  enableRoundBirthdayReminders: true,
  roundBirthdayYears: [50, 60, 70, 80, 90],
  privacyConsentGiven: false,
  privacyConsentDate: undefined,
  privacyConsentVersion: "1.0",
};

// ─────────────────────────────────────────────────
// Write result (optimistic lock response)
// ─────────────────────────────────────────────────

export type SaveResult =
  | { success: true; volunteer: Volunteer }
  | {
      success: false;
      reason: "version-conflict" | "io-error";
      message: string;
    };

// ─────────────────────────────────────────────────
// Activity time calculation utilities
// ─────────────────────────────────────────────────

export interface ActivityPeriod {
  start: string; // ISO timestamp
  end: string | null; // null if currently active
  status: VolunteerStatus;
}

/**
 * Calculate total activity time (in milliseconds) from status log
 * Only counts time spent in "active" status
 */
export function calculateActivityTime(volunteer: Volunteer): number {
  if (!volunteer.statusLog || volunteer.statusLog.length === 0) {
    return 0;
  }

  const periods = getActivityPeriods(volunteer);
  const activePeriods = periods.filter((p) => p.status === "active");

  let totalMs = 0;
  const now = new Date();

  for (const period of activePeriods) {
    const start = new Date(period.start);
    const end = period.end ? new Date(period.end) : now;
    totalMs += end.getTime() - start.getTime();
  }

  return totalMs;
}

/**
 * Format activity time as a human-readable string
 */
export function formatActivityTime(milliseconds: number): string {
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  const months = Math.floor(remainingDays / 30);
  const remainingDaysAfterMonths = remainingDays % 30;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} Jahr${years !== 1 ? "e" : ""}`);
  if (months > 0) parts.push(`${months} Monat${months !== 1 ? "e" : ""}`);
  if (remainingDaysAfterMonths > 0 || parts.length === 0) {
    parts.push(
      `${remainingDaysAfterMonths} Tag${remainingDaysAfterMonths !== 1 ? "e" : ""}`,
    );
  }

  return parts.join(", ");
}

/**
 * Parse status log into periods for each status
 */
export function getActivityPeriods(volunteer: Volunteer): ActivityPeriod[] {
  if (!volunteer.statusLog || volunteer.statusLog.length === 0) {
    return [];
  }

  const periods: ActivityPeriod[] = [];
  const sortedLog = [...volunteer.statusLog].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  for (let i = 0; i < sortedLog.length; i++) {
    const entry = sortedLog[i];
    const nextEntry = sortedLog[i + 1];

    periods.push({
      start: entry.timestamp,
      end: nextEntry ? nextEntry.timestamp : null,
      status: entry.to,
    });
  }

  return periods;
}
