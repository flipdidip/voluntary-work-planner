// ─────────────────────────────────────────────────
// Shared types between Electron main and React renderer
// ─────────────────────────────────────────────────

export type VolunteerStatus = "active" | "inactive" | "archived";

/**
 * Authorization role assigned to each user in the encrypted data folder.
 * - "primary"      → Full access to all features (volunteers, partners, settings, etc.)
 * - "partner-only" → Restricted view: can see the Kooperationspartner and Termine pages
 *
 * The initial creator of the folder always receives the "primary" role.
 * Every subsequent user is assigned a role at approval time.
 */
export type UserRole = "primary" | "partner-only";

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
  | "hygieneschulung" // Hygiene training - renewal every year, PDF required
  | "kameraueberwachung" // Camera surveillance consent - one-time, PDF required
  | "bildundton"; // Image & sound consent - one-time, PDF required

export type MediaConsentLevel = "red" | "yellow" | "green";

export const MEDIA_CONSENT_OPTIONS: Array<{
  value: MediaConsentLevel;
  label: string;
  description: string;
}> = [
  {
    value: "green",
    label: "Grün",
    description: "Social Media, Homepage und interner Gebrauch erlaubt",
  },
  {
    value: "yellow",
    label: "Gelb",
    description: "Homepage und interner Gebrauch erlaubt, kein Social Media",
  },
  {
    value: "red",
    label: "Rot",
    description: "Keine Veröffentlichung, ausschließlich interner Gebrauch",
  },
];

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
  kameraueberwachung: {
    id: "kameraueberwachung",
    label: "Einverständnis Kameraüberwachung",
    requiresDocument: true,
    renewalMonths: null, // one-time only
  },
  bildundton: {
    id: "bildundton",
    label: "Einverständnis Bild und Ton",
    requiresDocument: true,
    renewalMonths: null, // one-time only
  },
};

export interface RequirementRecord {
  requirementType: RequirementType;
  completedDate?: string; // ISO date (YYYY-MM-DD)
  mediaConsentLevel?: MediaConsentLevel; // only for bildundton; defaults to red for legacy records
  // Document upload (only for requirements that require it)
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  uploadedAt?: string; // ISO timestamp
  // Notes
  notes?: string;
}

export function getMediaConsentLevel(
  record?: RequirementRecord | null,
): MediaConsentLevel {
  if (!record || record.requirementType !== "bildundton") {
    return "red";
  }

  return record.mediaConsentLevel || "red";
}

export function getMediaConsentDescription(level: MediaConsentLevel): string {
  const match = MEDIA_CONSENT_OPTIONS.find((option) => option.value === level);
  return match?.description || MEDIA_CONSENT_OPTIONS[2].description;
}

export function getVolunteerMediaConsentLevel(
  requirements?: RequirementRecord[] | null,
): MediaConsentLevel | null {
  const mediaConsent = requirements?.find(
    (record) => record.requirementType === "bildundton",
  );

  return mediaConsent ? getMediaConsentLevel(mediaConsent) : null;
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

export type DinoIconId =
  | "mint-saurus"
  | "sunny-rex"
  | "sky-bronto"
  | "peach-raptor"
  | "berry-trike"
  | "teal-steggo"
  | "coral-sprout"
  | "lemon-anky"
  | "lavender-diplo"
  | "aqua-chomp"
  | "rose-trike"
  | "jade-plates";

export type DinoIconShape = "longneck" | "trex" | "trike" | "steggo";

export type DinoIconAccent =
  | "spots"
  | "stripes"
  | "cheeks"
  | "heart"
  | "star"
  | "crown";

export interface DinoIconOption {
  id: DinoIconId;
  label: string;
  shape: DinoIconShape;
  accent: DinoIconAccent;
  color: string;
}

export const DINO_ICON_OPTIONS: DinoIconOption[] = [
  {
    id: "mint-saurus",
    label: "Mint-Saurus",
    shape: "longneck",
    accent: "spots",
    color: "#7AD8B0",
  },
  {
    id: "sunny-rex",
    label: "Sunny-Rex",
    shape: "trex",
    accent: "star",
    color: "#F6C453",
  },
  {
    id: "sky-bronto",
    label: "Sky-Bronto",
    shape: "longneck",
    accent: "stripes",
    color: "#7BB8FF",
  },
  {
    id: "peach-raptor",
    label: "Peach-Raptor",
    shape: "trex",
    accent: "cheeks",
    color: "#FFAE8A",
  },
  {
    id: "berry-trike",
    label: "Berry-Trike",
    shape: "trike",
    accent: "heart",
    color: "#D79BFF",
  },
  {
    id: "teal-steggo",
    label: "Teal-Steggo",
    shape: "steggo",
    accent: "stripes",
    color: "#6EDDD6",
  },
  {
    id: "coral-sprout",
    label: "Coral-Sprout",
    shape: "longneck",
    accent: "heart",
    color: "#FF9E9A",
  },
  {
    id: "lemon-anky",
    label: "Lemon-Anky",
    shape: "steggo",
    accent: "star",
    color: "#FFE27A",
  },
  {
    id: "lavender-diplo",
    label: "Lavender-Diplo",
    shape: "longneck",
    accent: "crown",
    color: "#C8B0FF",
  },
  {
    id: "aqua-chomp",
    label: "Aqua-Chomp",
    shape: "trex",
    accent: "spots",
    color: "#72D8F7",
  },
  {
    id: "rose-trike",
    label: "Rose-Trike",
    shape: "trike",
    accent: "cheeks",
    color: "#FF9FC2",
  },
  {
    id: "jade-plates",
    label: "Jade-Plates",
    shape: "steggo",
    accent: "crown",
    color: "#8CD6A0",
  },
];

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
  organization?: string; // Institution / Einrichtung, primarily for partners
  contactPerson?: string; // Ansprechpartner, primarily for partners
  dateOfBirth?: string; // ISO date (YYYY-MM-DD), kept for legacy compatibility
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
  dinoIconId?: DinoIconId;
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
  organization?: string;
  contactPerson?: string;
  dateOfBirth?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  joinedDate?: string;
  dinoIconId?: DinoIconId;
  status: VolunteerStatus;
  roles: string[];
  _updatedAt: string;
  requirementsStatus: RequirementStatusSummary;
  mediaConsentLevel?: MediaConsentLevel | null;
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
// Group meetings (Gruppen Treffen)
// ─────────────────────────────────────────────────

export type GroupMeetingParticipantType = "volunteer" | "partner";
export type GroupMeetingAttendanceStatus = "unknown" | "present" | "absent";

export interface GroupMeetingParticipant {
  id: string; // volunteer or partner ID
  name: string; // display name (cached for index)
  type: GroupMeetingParticipantType;
  attendance?: GroupMeetingAttendanceStatus;
}

export interface GroupMeeting {
  id: string;
  title: string;
  date: string; // ISO date-time (YYYY-MM-DDTHH:mm), legacy YYYY-MM-DD supported
  participants: GroupMeetingParticipant[];
  notes?: string;
  _createdAt: string;
  _updatedAt: string;
}

export interface GroupMeetingIndex {
  _version: number;
  _updatedAt: string;
  meetings: GroupMeeting[];
}

export const GROUP_MEETING_ATTENDANCE_LABELS: Record<
  GroupMeetingAttendanceStatus,
  string
> = {
  unknown: "Offen",
  present: "Anwesend",
  absent: "Nicht anwesend",
};

export interface GroupMeetingParticipationStats {
  invitedCount: number;
  presentCount: number;
  absentCount: number;
  unknownCount: number;
  attendanceRate: number;
}

export function getGroupMeetingAttendanceStatus(
  participant: { attendance?: GroupMeetingAttendanceStatus } | null | undefined,
): GroupMeetingAttendanceStatus {
  return participant?.attendance ?? "unknown";
}

export function calculateGroupMeetingParticipationStats(
  meetings: GroupMeeting[],
  participantId: string,
  participantType: GroupMeetingParticipantType,
): GroupMeetingParticipationStats {
  const safeMeetings = Array.isArray(meetings) ? meetings : [];

  const relevantParticipants = safeMeetings
    .flatMap((meeting) =>
      Array.isArray(meeting?.participants) ? meeting.participants : [],
    )
    .filter((participant) => {
      return (
        participant?.id === participantId &&
        participant?.type === participantType
      );
    });

  const invitedCount = relevantParticipants.length;
  const presentCount = relevantParticipants.filter(
    (participant) => getGroupMeetingAttendanceStatus(participant) === "present",
  ).length;
  const absentCount = relevantParticipants.filter(
    (participant) => getGroupMeetingAttendanceStatus(participant) === "absent",
  ).length;
  const unknownCount = relevantParticipants.filter(
    (participant) => getGroupMeetingAttendanceStatus(participant) === "unknown",
  ).length;
  const ratedCount = presentCount + absentCount;

  return {
    invitedCount,
    presentCount,
    absentCount,
    unknownCount,
    attendanceRate:
      ratedCount > 0 ? Math.round((presentCount / ratedCount) * 100) : 0,
  };
}

// ─────────────────────────────────────────────────
// Partner appointments (Termine)
// ─────────────────────────────────────────────────

export interface PartnerAppointmentParticipant {
  id: string;
  name: string;
  attendance?: GroupMeetingAttendanceStatus;
}

export interface PartnerAppointment {
  id: string;
  title: string;
  date: string; // ISO date-time (YYYY-MM-DDTHH:mm), legacy YYYY-MM-DD supported
  participants: PartnerAppointmentParticipant[];
  notes?: string;
  _createdAt: string;
  _updatedAt: string;
}

export interface PartnerAppointmentIndex {
  _version: number;
  _updatedAt: string;
  appointments: PartnerAppointment[];
}

export function calculatePartnerAppointmentParticipationStats(
  appointments: PartnerAppointment[],
  participantId: string,
): GroupMeetingParticipationStats {
  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  const relevantParticipants = safeAppointments
    .flatMap((appointment) =>
      Array.isArray(appointment?.participants) ? appointment.participants : [],
    )
    .filter((participant) => participant?.id === participantId);

  const invitedCount = relevantParticipants.length;
  const presentCount = relevantParticipants.filter(
    (participant) => getGroupMeetingAttendanceStatus(participant) === "present",
  ).length;
  const absentCount = relevantParticipants.filter(
    (participant) => getGroupMeetingAttendanceStatus(participant) === "absent",
  ).length;
  const unknownCount = relevantParticipants.filter(
    (participant) => getGroupMeetingAttendanceStatus(participant) === "unknown",
  ).length;
  const ratedCount = presentCount + absentCount;

  return {
    invitedCount,
    presentCount,
    absentCount,
    unknownCount,
    attendanceRate:
      ratedCount > 0 ? Math.round((presentCount / ratedCount) * 100) : 0,
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
  INITIALIZE_DATA_FOLDER: "initialize-data-folder",
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
  GET_AUTHORIZED_USERS: "get-authorized-users",
  UPDATE_AUTHORIZED_USER_ROLE: "update-authorized-user-role",
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

  // Partners (Kooperationspartner)
  GET_PARTNER_INDEX: "get-partner-index",
  GET_PARTNER: "get-partner",
  SAVE_PARTNER: "save-partner",
  DELETE_PARTNER: "delete-partner",

  // File attachments
  UPLOAD_FILE: "upload-file",
  DELETE_FILE: "delete-file",
  OPEN_FILE: "open-file",
  SELECT_FILE: "select-file",

  // Group meetings (Gruppen Treffen)
  GET_GROUP_MEETINGS: "get-group-meetings",
  SAVE_GROUP_MEETING: "save-group-meeting",
  DELETE_GROUP_MEETING: "delete-group-meeting",

  // Partner appointments (Termine)
  GET_PARTNER_APPOINTMENTS: "get-partner-appointments",
  SAVE_PARTNER_APPOINTMENT: "save-partner-appointment",
  DELETE_PARTNER_APPOINTMENT: "delete-partner-appointment",

  // Reminders
  GET_DUE_REMINDERS: "get-due-reminders",
  DISMISS_REMINDER: "dismiss-reminder",
  SIMULATE_REMINDER: "simulate-reminder",
  REMINDER_TRIGGERED: "reminder-triggered", // main → renderer push event

  // Utilities
  OPEN_EXTERNAL_URL: "open-external-url",

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
  /** The authorization role of the current user (only set when authorized). */
  userRole?: UserRole;
  message?: string;
}

export interface EnrollmentRequestSummary {
  keyFingerprint: string;
  userName: string;
  machineName: string;
  requestedAt: string;
}

export interface AuthorizedUserSummary {
  keyFingerprint: string;
  userName: string;
  machineName: string;
  addedAt: string;
  role: UserRole;
}

export interface EncryptionAuditEntry {
  timestamp: string;
  actor: string;
  action:
    | "manifest-created"
    | "access-requested"
    | "access-approved"
    | "access-approved-partner-only"
    | "access-rejected"
    | "access-role-changed"
    | "key-rotated";
  target?: string;
  details?: string;
}

export type BusinessAuditAction =
  | "settings-saved"
  | "volunteer-created"
  | "volunteer-updated"
  | "volunteer-deleted"
  | "partner-created"
  | "partner-updated"
  | "partner-deleted"
  | "file-uploaded"
  | "file-deleted"
  | "file-opened"
  | "processing-activities-saved"
  | "processing-activities-exported"
  | "group-meeting-created"
  | "group-meeting-updated"
  | "group-meeting-deleted"
  | "partner-appointment-created"
  | "partner-appointment-updated"
  | "partner-appointment-deleted";

export type BusinessAuditSubjectType =
  | "settings"
  | "volunteer"
  | "partner"
  | "attachment"
  | "processing-activities"
  | "group-meeting"
  | "partner-appointment";

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

export type ThemeMode = "system" | "light" | "dark";

export interface AppSettings {
  dataFolderPath: string;
  reminderCheckIntervalMinutes: number;
  language: "de" | "en";
  themeMode: ThemeMode;
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
  themeMode: "system",
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

    if (def.requiresDocument && !record.filePath) {
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
