import { contextBridge, ipcRenderer } from "electron";
import {
  IPC,
  Volunteer,
  Reminder,
  AppSettings,
  EncryptionAuditEntry,
  BusinessAuditEntry,
  EncryptionStatus,
  EnrollmentRequestSummary,
  AuthorizedUserSummary,
  ProcessingActivitiesDocument,
  UserRole,
  GroupMeeting,
  GroupMeetingIndex,
  PartnerAppointment,
  PartnerAppointmentIndex,
} from "@shared/types";

// Expose a safe, typed API to the renderer via window.api
const api = {
  // Settings
  getDataPath: (): Promise<string> => ipcRenderer.invoke(IPC.GET_DATA_PATH),

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.GET_SETTINGS),

  saveSettings: (
    partial: Partial<AppSettings>,
  ): Promise<{ success: boolean }> =>
    ipcRenderer.invoke(IPC.SAVE_SETTINGS, partial),

  getEncryptionStatus: (): Promise<EncryptionStatus> =>
    ipcRenderer.invoke(IPC.GET_ENCRYPTION_STATUS),

  getPendingEnrollments: (): Promise<EnrollmentRequestSummary[]> =>
    ipcRenderer.invoke(IPC.GET_PENDING_ENROLLMENTS),

  getEncryptionAuditLog: (): Promise<EncryptionAuditEntry[]> =>
    ipcRenderer.invoke(IPC.GET_ENCRYPTION_AUDIT_LOG),

  getBusinessAuditLog: (): Promise<BusinessAuditEntry[]> =>
    ipcRenderer.invoke(IPC.GET_BUSINESS_AUDIT_LOG),

  getProcessingActivities: (): Promise<ProcessingActivitiesDocument> =>
    ipcRenderer.invoke(IPC.GET_PROCESSING_ACTIVITIES),

  approvePendingEnrollments: (): Promise<{
    success: boolean;
    approvedCount: number;
    pendingCount: number;
    error?: string;
  }> => ipcRenderer.invoke(IPC.APPROVE_PENDING_ENROLLMENTS),

  approveEnrollment: (
    keyFingerprint: string,
    role?: UserRole,
  ): Promise<{
    success: boolean;
    approved?: boolean;
    pendingCount: number;
    error?: string;
  }> => ipcRenderer.invoke(IPC.APPROVE_ENROLLMENT, keyFingerprint, role),

  rejectEnrollment: (
    keyFingerprint: string,
  ): Promise<{
    success: boolean;
    rejected?: boolean;
    pendingCount: number;
    error?: string;
  }> => ipcRenderer.invoke(IPC.REJECT_ENROLLMENT, keyFingerprint),

  getAuthorizedUsers: (): Promise<AuthorizedUserSummary[]> =>
    ipcRenderer.invoke(IPC.GET_AUTHORIZED_USERS),

  updateAuthorizedUserRole: (
    keyFingerprint: string,
    role: UserRole,
  ): Promise<{
    success: boolean;
    updated?: boolean;
    error?: string;
  }> =>
    ipcRenderer.invoke(IPC.UPDATE_AUTHORIZED_USER_ROLE, keyFingerprint, role),

  rotateEncryptionKey: (): Promise<{
    success: boolean;
    rotatedFileCount: number;
    error?: string;
  }> => ipcRenderer.invoke(IPC.ROTATE_ENCRYPTION_KEY),

  saveProcessingActivities: (
    document: ProcessingActivitiesDocument,
  ): Promise<{
    success: boolean;
    document?: ProcessingActivitiesDocument;
    error?: string;
  }> => ipcRenderer.invoke(IPC.SAVE_PROCESSING_ACTIVITIES, document),

  exportProcessingActivitiesMarkdown: (): Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    error?: string;
  }> => ipcRenderer.invoke(IPC.EXPORT_PROCESSING_ACTIVITIES_MARKDOWN),

  exportBusinessAuditMarkdown: (): Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    error?: string;
  }> => ipcRenderer.invoke(IPC.EXPORT_BUSINESS_AUDIT_MARKDOWN),

  setDataPath: (
    folderPath: string,
  ): Promise<{ success: boolean; encryptionStatus?: EncryptionStatus }> =>
    ipcRenderer.invoke(IPC.SET_DATA_PATH, folderPath),

  selectDataFolder: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.SELECT_DATA_FOLDER),

  initializeDataFolder: (): Promise<{
    success: boolean;
    encryptionStatus?: EncryptionStatus;
    error?: string;
  }> => ipcRenderer.invoke(IPC.INITIALIZE_DATA_FOLDER),

  // Volunteers
  getVolunteerIndex: () => ipcRenderer.invoke(IPC.GET_VOLUNTEER_INDEX),

  getVolunteer: (id: string) => ipcRenderer.invoke(IPC.GET_VOLUNTEER, id),

  saveVolunteer: (volunteer: Volunteer) =>
    ipcRenderer.invoke(IPC.SAVE_VOLUNTEER, volunteer),

  deleteVolunteer: (id: string) => ipcRenderer.invoke(IPC.DELETE_VOLUNTEER, id),

  // Partners (Kooperationspartner)
  getPartnerIndex: () => ipcRenderer.invoke(IPC.GET_PARTNER_INDEX),

  getPartner: (id: string) => ipcRenderer.invoke(IPC.GET_PARTNER, id),

  savePartner: (partner: Volunteer) =>
    ipcRenderer.invoke(IPC.SAVE_PARTNER, partner),

  deletePartner: (id: string) => ipcRenderer.invoke(IPC.DELETE_PARTNER, id),

  // Group meetings (Gruppen Treffen)
  getGroupMeetings: (): Promise<GroupMeetingIndex> =>
    ipcRenderer.invoke(IPC.GET_GROUP_MEETINGS),

  saveGroupMeeting: (
    meeting: GroupMeeting,
  ): Promise<{ success: boolean; meeting?: GroupMeeting; error?: string }> =>
    ipcRenderer.invoke(IPC.SAVE_GROUP_MEETING, meeting),

  deleteGroupMeeting: (meetingId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DELETE_GROUP_MEETING, meetingId),

  // Partner appointments (Termine)
  getPartnerAppointments: (): Promise<PartnerAppointmentIndex> =>
    ipcRenderer.invoke(IPC.GET_PARTNER_APPOINTMENTS),

  savePartnerAppointment: (
    appointment: PartnerAppointment,
  ): Promise<{
    success: boolean;
    appointment?: PartnerAppointment;
    error?: string;
  }> => ipcRenderer.invoke(IPC.SAVE_PARTNER_APPOINTMENT, appointment),

  deletePartnerAppointment: (appointmentId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DELETE_PARTNER_APPOINTMENT, appointmentId),

  // File attachments
  selectFile: (): Promise<string | null> => ipcRenderer.invoke(IPC.SELECT_FILE),

  uploadFile: (
    volunteerId: string,
    sourcePath: string,
  ): Promise<{
    success: boolean;
    filePath?: string;
    fileName?: string;
    fileSize?: number;
    error?: string;
  }> => ipcRenderer.invoke(IPC.UPLOAD_FILE, volunteerId, sourcePath),

  deleteFile: (
    filePath: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC.DELETE_FILE, filePath),

  openFile: (filePath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC.OPEN_FILE, filePath),

  // Reminders
  getDueReminders: () => ipcRenderer.invoke(IPC.GET_DUE_REMINDERS),

  dismissReminder: (volunteerId: string, reminderId: string) =>
    ipcRenderer.invoke(IPC.DISMISS_REMINDER, volunteerId, reminderId),

  simulateReminder: (payload: {
    volunteerId: string;
    volunteerName: string;
    reminder: Reminder;
  }) => ipcRenderer.invoke(IPC.SIMULATE_REMINDER, payload),

  onReminderTriggered: (callback: (reminders: unknown[]) => void) => {
    ipcRenderer.on(IPC.REMINDER_TRIGGERED, (_event, reminders) =>
      callback(reminders),
    );
  },

  removeReminderListener: () => {
    ipcRenderer.removeAllListeners(IPC.REMINDER_TRIGGERED);
  },

  // Utilities
  openExternalUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke(IPC.OPEN_EXTERNAL_URL, url),

  // App
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IPC.GET_APP_VERSION),
};

contextBridge.exposeInMainWorld("api", api);

export type ElectronAPI = typeof api;
