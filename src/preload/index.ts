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
  ProcessingActivitiesDocument,
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
  ): Promise<{
    success: boolean;
    approved?: boolean;
    pendingCount: number;
    error?: string;
  }> => ipcRenderer.invoke(IPC.APPROVE_ENROLLMENT, keyFingerprint),

  rejectEnrollment: (
    keyFingerprint: string,
  ): Promise<{
    success: boolean;
    rejected?: boolean;
    pendingCount: number;
    error?: string;
  }> => ipcRenderer.invoke(IPC.REJECT_ENROLLMENT, keyFingerprint),

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

  setDataPath: (folderPath: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke(IPC.SET_DATA_PATH, folderPath),

  selectDataFolder: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.SELECT_DATA_FOLDER),

  // Volunteers
  getVolunteerIndex: () => ipcRenderer.invoke(IPC.GET_VOLUNTEER_INDEX),

  getVolunteer: (id: string) => ipcRenderer.invoke(IPC.GET_VOLUNTEER, id),

  saveVolunteer: (volunteer: Volunteer) =>
    ipcRenderer.invoke(IPC.SAVE_VOLUNTEER, volunteer),

  deleteVolunteer: (id: string) => ipcRenderer.invoke(IPC.DELETE_VOLUNTEER, id),

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

  // App
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IPC.GET_APP_VERSION),
};

contextBridge.exposeInMainWorld("api", api);

export type ElectronAPI = typeof api;
