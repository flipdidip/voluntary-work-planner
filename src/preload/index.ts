import { contextBridge, ipcRenderer } from "electron";
import {
  IPC,
  Volunteer,
  Reminder,
  AppSettings,
  EncryptionStatus,
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

  approvePendingEnrollments: (): Promise<{
    success: boolean;
    approvedCount: number;
    pendingCount: number;
    error?: string;
  }> => ipcRenderer.invoke(IPC.APPROVE_PENDING_ENROLLMENTS),

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
