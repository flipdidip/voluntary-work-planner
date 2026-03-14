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

export interface FileRecord {
  id: string;
  title: string;
  description: string;
  fileName?: string; // Original name of the uploaded file
  filePath?: string; // Path to the file in the attachments folder
  fileSize?: number; // Size in bytes
  uploadedAt: string; // ISO timestamp
}

// ─────────────────────────────────────────────────
// Requirements / Compliance tracking
// ─────────────────────────────────────────────────

export type RequirementType =
  | "grundkurs" // Basic course - one-time, no document
  | "verhaltenskodex" // Code of conduct - one-time, PDF required
  | "verschwiegenheitsklausel" // Confidentiality agreement - one-time, PDF required
  | "fuehrungszeugnis" // Background check - renewal every 5 years, no upload
  | "hygieneschulung"; // Hygiene training - renewal every year, PDF required

export interface RequirementMetadata {
  id: RequirementType;
  label: string;
  requiresDocument: boolean;
  renewalMonths: number | null; // null = one-time, number = renewal period in months
}

export const REQUIREMENT_DEFINITIONS: Record<
  RequirementType,
  RequirementMetadata
> = {
  grundkurs: {
    id: "grundkurs",
    label: "Grundkurs teilgenommen",
    requiresDocument: false,
    renewalMonths: null, // one-time only
  },
  verhaltenskodex: {
    id: "verhaltenskodex",
    label: "Verhaltenskodex unterschrieben",
    requiresDocument: true,
    renewalMonths: null, // one-time only
  },
  verschwiegenheitsklausel: {
    id: "verschwiegenheitsklausel",
    label: "Verschwiegenheitsklausel unterschrieben",
    requiresDocument: true,
    renewalMonths: null, // one-time only
  },
  fuehrungszeugnis: {
    id: "fuehrungszeugnis",
    label: "Führungszeugnis vorgezeigt",
    requiresDocument: false,
    renewalMonths: 60, // every 5 years
  },
  hygieneschulung: {
    id: "hygieneschulung",
    label: "Hygiene Schulung teilgenommen",
    requiresDocument: true,
    renewalMonths: 12, // every year
  },
};

export interface RequirementRecord {
  requirementType: RequirementType;
  completedDate?: string; // ISO date (YYYY-MM-DD)
  // Document upload (only for requirements that require it)
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  uploadedAt?: string; // ISO timestamp
  // Notes
  notes?: string;
}

// Compact status for index
export type RequirementStatus = "complete" | "expired" | "missing";

export interface RequirementStatusSummary {
  [key: string]: RequirementStatus; // key is RequirementType
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

  // File records (Akte) attached to this volunteer
  fileRecords: FileRecord[];

  // Requirements / compliance tracking
  requirements: RequirementRecord[];
}

// ─────────────────────────────────────────────────
// Search index — stored in index.json
// ─────────────────────────────────────────────────

export interface VolunteerIndexEntry {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  joinedDate?: string;
  status: VolunteerStatus;
  roles: string[];
  _updatedAt: string;
  requirementsStatus: RequirementStatusSummary;
}

export interface VolunteerIndex {
  _version: number;
  _updatedAt: string;
  volunteers: VolunteerIndexEntry[];
}

// ─────────────────────────────────────────────────
// DSGVO processing activities (Art. 30)
// ─────────────────────────────────────────────────

export interface ProcessingActivityRecord {
  id: string;
  name: string;
  controllerName: string;
  controllerContact: string;
  dataProtectionContact: string;
  purposes: string;
  categoriesOfSubjects: string[];
  categoriesOfData: string[];
  legalBases: string[];
  recipients: string[];
  processors: string[];
  thirdCountryTransfers: string;
  retentionPolicy: string;
  technicalMeasures: string[];
  organizationalMeasures: string[];
  systems: string[];
  notes: string;
  lastReviewedAt?: string;
}

export interface ProcessingActivitiesDocument {
  _version: number;
  _updatedAt: string;
  activities: ProcessingActivityRecord[];
}

export function createDefaultProcessingActivitiesDocument(): ProcessingActivitiesDocument {
  return {
    _version: 1,
    _updatedAt: new Date().toISOString(),
    activities: [
      {
        id: "volunteer-management",
        name: "Verwaltung von Ehrenamtlichen",
        controllerName: "",
        controllerContact: "",
        dataProtectionContact: "",
        purposes:
          "Verwaltung, Koordination, Kommunikation und Dokumentation ehrenamtlicher Taetigkeiten sowie Nachverfolgung von Qualifikationen und Terminen.",
        categoriesOfSubjects: ["Ehrenamtliche", "Notfallkontakte"],
        categoriesOfData: [
          "Stammdaten (Name, Vorname)",
          "Geburtsdatum",
          "Kontaktdaten (Telefon, Mobiltelefon, E-Mail, Adresse)",
          "Notfallkontakt",
          "Rollen und Einsatzbereiche",
          "Status- und Aktivitaetsverlauf",
          "Notizen und Erinnerungen",
          "Qualifikationen und Nachweise",
          "Dateianhaenge",
        ],
        legalBases: [
          "Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)",
          "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an ordnungsgemaesser Vereinsverwaltung)",
        ],
        recipients: [
          "Interne Koordinatoren",
          "Berechtigte Administratoren des Vereins",
        ],
        processors: [
          "Optional: Microsoft fuer OneDrive/SharePoint-Synchronisation",
        ],
        thirdCountryTransfers:
          "Abhaengig von eingesetztem Cloud-Anbieter, Tenant-Konfiguration und AVV. Bei rein lokaler Nutzung keine Uebermittlung in Drittländer durch die App.",
        retentionPolicy:
          "Nach Austritt oder Ende der ehrenamtlichen Taetigkeit nach den vereinsintern festgelegten Fristen loeschen oder archivieren. Fristen muessen organisatorisch festgelegt werden.",
        technicalMeasures: [
          "Verschluesselung ruhender Daten im Datenordner",
          "Freigabeprozess fuer zusaetzliche Benutzer",
          "Audit-Protokoll fuer Schluesselereignisse",
          "Automatische Backups vor Aenderungen",
          "Keine Telemetrie oder Drittanbieter-Analytics in der App",
        ],
        organizationalMeasures: [
          "Freigabe neuer Benutzer nur durch autorisierte Personen",
          "Regelmaessige Pruefung von Zugriffsrechten und Audit-Protokollen",
          "Dokumentierte Bearbeitung von Betroffenenrechten",
          "Endgeraete-Haertung, z.B. BitLocker und Betriebssystem-Kontoschutz",
        ],
        systems: [
          "Voluntary Work Planner",
          "Lokaler oder synchronisierter Datenordner",
        ],
        notes:
          "Rechtsgrundlagen, Loeschfristen und AVV-Status muessen durch den Betreiber fachlich geprueft und ergaenzt werden.",
        lastReviewedAt: undefined,
      },
      {
        id: "key-access-management",
        name: "Zugriffs- und Schluesselverwaltung fuer gemeinsame Datenordner",
        controllerName: "",
        controllerContact: "",
        dataProtectionContact: "",
        purposes:
          "Steuerung, Freigabe und Nachvollziehbarkeit des Zugriffs auf gemeinsam genutzte verschluesselte Datenordner.",
        categoriesOfSubjects: ["Berechtigte Nutzer der Anwendung"],
        categoriesOfData: [
          "Benutzername",
          "Maschinenname",
          "Schluesselfingerprint",
          "Freigabe- und Ablehnungszeitpunkte",
          "Audit-Eintraege zu Schluesselereignissen",
        ],
        legalBases: [
          "Art. 6 Abs. 1 lit. f DSGVO (IT-Sicherheit und Zugriffskontrolle)",
        ],
        recipients: ["Autorisierte Administratoren des Vereins"],
        processors: [
          "Optional: Microsoft fuer OneDrive/SharePoint-Synchronisation",
        ],
        thirdCountryTransfers:
          "Abhaengig von eingesetztem Cloud-Anbieter. Die Anwendung selbst uebermittelt diese Daten nicht an externe Server.",
        retentionPolicy:
          "Audit- und Freigabedaten nach intern definierter Sicherheits- und Nachweisfrist aufbewahren.",
        technicalMeasures: [
          "Benutzerspezifische Schluesselfreigabe",
          "Audit-Protokoll fuer Zugriffsanfragen, Freigaben, Ablehnungen und Schluesselrotation",
          "Verschluesselte Speicherung im Datenordner",
        ],
        organizationalMeasures: [
          "Freigabeprozess fuer neue Benutzer dokumentieren",
          "Regelmaessige Rezertifizierung von Berechtigungen",
        ],
        systems: ["Voluntary Work Planner", "Gemeinsam genutzter Datenordner"],
        notes:
          "Besonders relevant bei Nutzung von OneDrive- oder SharePoint-Synchronisation.",
        lastReviewedAt: undefined,
      },
    ],
  };
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
  GET_ENCRYPTION_STATUS: "get-encryption-status",
  GET_PENDING_ENROLLMENTS: "get-pending-enrollments",
  GET_ENCRYPTION_AUDIT_LOG: "get-encryption-audit-log",
  GET_BUSINESS_AUDIT_LOG: "get-business-audit-log",
  GET_PROCESSING_ACTIVITIES: "get-processing-activities",
  APPROVE_PENDING_ENROLLMENTS: "approve-pending-enrollments",
  APPROVE_ENROLLMENT: "approve-enrollment",
  REJECT_ENROLLMENT: "reject-enrollment",
  ROTATE_ENCRYPTION_KEY: "rotate-encryption-key",
  SAVE_PROCESSING_ACTIVITIES: "save-processing-activities",
  EXPORT_PROCESSING_ACTIVITIES_MARKDOWN:
    "export-processing-activities-markdown",
  EXPORT_BUSINESS_AUDIT_MARKDOWN: "export-business-audit-markdown",

  // Volunteers
  GET_VOLUNTEER_INDEX: "get-volunteer-index",
  GET_VOLUNTEER: "get-volunteer",
  SAVE_VOLUNTEER: "save-volunteer",
  DELETE_VOLUNTEER: "delete-volunteer",

  // File attachments
  UPLOAD_FILE: "upload-file",
  DELETE_FILE: "delete-file",
  OPEN_FILE: "open-file",
  SELECT_FILE: "select-file",

  // Reminders
  GET_DUE_REMINDERS: "get-due-reminders",
  DISMISS_REMINDER: "dismiss-reminder",
  SIMULATE_REMINDER: "simulate-reminder",
  REMINDER_TRIGGERED: "reminder-triggered", // main → renderer push event

  // App info
  GET_APP_VERSION: "get-app-version",
} as const;

export interface EncryptionStatus {
  enabled: boolean;
  authorized: boolean;
  hasManifest: boolean;
  pendingRequestCount: number;
  currentUser: string;
  keyFingerprint: string;
  message?: string;
}

export interface EnrollmentRequestSummary {
  keyFingerprint: string;
  userName: string;
  machineName: string;
  requestedAt: string;
}

export interface EncryptionAuditEntry {
  timestamp: string;
  actor: string;
  action:
    | "manifest-created"
    | "access-requested"
    | "access-approved"
    | "access-rejected"
    | "key-rotated";
  target?: string;
  details?: string;
}

export type BusinessAuditAction =
  | "settings-saved"
  | "volunteer-created"
  | "volunteer-updated"
  | "volunteer-deleted"
  | "file-uploaded"
  | "file-deleted"
  | "file-opened"
  | "processing-activities-saved"
  | "processing-activities-exported";

export type BusinessAuditSubjectType =
  | "settings"
  | "volunteer"
  | "attachment"
  | "processing-activities";

export interface BusinessAuditEntry {
  timestamp: string;
  actor: string;
  action: BusinessAuditAction;
  subjectType: BusinessAuditSubjectType;
  subjectId?: string;
  details?: string;
}

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
  // Anniversary reminder settings - based on joining date (Eintrittsdatum)
  enableJoinedDateAnniversaryReminders: boolean;
  joinedDateAnniversaryYears: number[];
  // Anniversary reminder settings - based on total activity time
  enableActivityTimeAnniversaryReminders: boolean;
  activityTimeAnniversaryYears: number[];
  // Requirement renewal reminders (for qualifications that need renewal)
  enableRequirementRenewalReminders: boolean;
  requirementRenewalDaysWarning: number; // How many days before expiry to show reminder
  // DSGVO/GDPR compliance
  privacyConsentGiven: boolean;
  privacyConsentDate?: string; // ISO timestamp
  privacyConsentVersion: string; // e.g. "1.0"
}

export const PRIVACY_POLICY_VERSION = "1.1";

export const DEFAULT_SETTINGS: AppSettings = {
  dataFolderPath: "",
  reminderCheckIntervalMinutes: 60,
  language: "de",
  enableYearlyBirthdayReminders: true,
  enableRoundBirthdayReminders: true,
  roundBirthdayYears: [50, 60, 70, 75, 80, 85, 90, 95, 100],
  enableJoinedDateAnniversaryReminders: true,
  joinedDateAnniversaryYears: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
  enableActivityTimeAnniversaryReminders: true,
  activityTimeAnniversaryYears: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
  enableRequirementRenewalReminders: true,
  requirementRenewalDaysWarning: 30,
  privacyConsentGiven: false,
  privacyConsentDate: undefined,
  privacyConsentVersion: PRIVACY_POLICY_VERSION,
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

// ─────────────────────────────────────────────────
// Requirements status calculation
// ─────────────────────────────────────────────────

/**
 * Calculate the status of each requirement for a volunteer
 * Returns a summary of complete/expired/missing for each requirement type
 */
export function calculateRequirementsStatus(
  volunteer: Volunteer,
): RequirementStatusSummary {
  const summary: RequirementStatusSummary = {};
  const requirements = volunteer.requirements || [];
  const now = new Date();

  // Check each requirement type
  for (const type of Object.keys(
    REQUIREMENT_DEFINITIONS,
  ) as RequirementType[]) {
    const def = REQUIREMENT_DEFINITIONS[type];
    const record = requirements.find((r) => r.requirementType === type);

    if (!record || !record.completedDate) {
      summary[type] = "missing";
      continue;
    }

    // Check if expired (for renewable requirements)
    if (def.renewalMonths !== null) {
      const completedDate = new Date(record.completedDate);
      const expiryDate = new Date(completedDate);
      expiryDate.setMonth(expiryDate.getMonth() + def.renewalMonths);

      if (expiryDate < now) {
        summary[type] = "expired";
      } else {
        summary[type] = "complete";
      }
    } else {
      // One-time requirement
      summary[type] = "complete";
    }
  }

  return summary;
}

/**
 * Calculate the expiration date for a requirement record
 * Returns null if the requirement is one-time or has no completion date
 */
export function calculateRequirementExpiryDate(
  record: RequirementRecord,
  requirementType: RequirementType,
): Date | null {
  const def = REQUIREMENT_DEFINITIONS[requirementType];

  // One-time requirements don't expire
  if (def.renewalMonths === null) {
    return null;
  }

  // No completion date means no expiry
  if (!record.completedDate) {
    return null;
  }

  const completedDate = new Date(record.completedDate);
  const expiryDate = new Date(completedDate);
  expiryDate.setMonth(expiryDate.getMonth() + def.renewalMonths);

  return expiryDate;
}
