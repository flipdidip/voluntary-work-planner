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

export interface ActivityEntry {
  id: string;
  date: string; // ISO date
  description: string;
  hoursSpent?: number;
  createdBy?: string;
}

export interface Volunteer {
  id: string;
  /** Optimistic locking — increment on every write */
  _version: number;
  _createdAt: string; // ISO timestamp
  _updatedAt: string; // ISO timestamp

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

  // Activity log
  activityLog: ActivityEntry[];

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
}

export const DEFAULT_SETTINGS: AppSettings = {
  dataFolderPath: "",
  reminderCheckIntervalMinutes: 60,
  language: "de",
  enableYearlyBirthdayReminders: true,
  enableRoundBirthdayReminders: true,
  roundBirthdayYears: [50, 60, 70, 80, 90],
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
