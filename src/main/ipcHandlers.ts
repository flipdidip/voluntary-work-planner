import { IpcMain, dialog } from "electron";
import { v4 as uuidv4 } from "uuid";
import { IPC, Volunteer, SaveResult } from "@shared/types";
import { SettingsService } from "./settingsService";
import { VolunteerFileService } from "./volunteerFileService";
import { DueReminder, getUpcomingReminders } from "./reminderScheduler";
import { mkdirSync } from "fs";
import { DataCryptoService } from "./dataCryptoService";

function getFileService(
  settings: SettingsService,
): VolunteerFileService | null {
  const dataPath = settings.getDataFolderPath();
  if (!dataPath) return null;

  const cryptoService = DataCryptoService.getInstance();
  const cryptoStatus = cryptoService.getStatus(dataPath);
  if (!cryptoStatus.authorized && cryptoStatus.hasManifest) {
    throw new Error(
      cryptoStatus.message ||
        "Dieser Benutzer hat noch keinen Zugriff auf den verschlüsselten Datenordner.",
    );
  }

  // Ensures the folder is initialized and this user can unwrap the DEK.
  cryptoService.encryptBytesForDataFolder(dataPath, Buffer.from("healthcheck"));

  mkdirSync(settings.getVolunteersPath(), { recursive: true });
  mkdirSync(settings.getBackupsPath(), { recursive: true });
  mkdirSync(settings.getAttachmentsPath(), { recursive: true });

  return new VolunteerFileService(
    dataPath,
    settings.getVolunteersPath(),
    settings.getIndexPath(),
    settings.getBackupsPath(),
    settings.getAttachmentsPath(),
    cryptoService,
  );
}

function bootstrapFolderEncryption(folderPath: string) {
  const cryptoService = DataCryptoService.getInstance();
  try {
    cryptoService.encryptBytesForDataFolder(
      folderPath,
      Buffer.from("bootstrap"),
    );
  } catch {
    // Status call below still returns whether access is pending or authorized.
  }
  return cryptoService.getStatus(folderPath);
}

export function registerVolunteerHandlers(
  ipcMain: IpcMain,
  settings: SettingsService,
  onRemindersTriggered?: (reminders: DueReminder[]) => void,
): void {
  // Settings
  ipcMain.handle(IPC.GET_DATA_PATH, () => settings.getDataFolderPath());

  ipcMain.handle(IPC.GET_SETTINGS, () => settings.get());

  ipcMain.handle(
    IPC.SAVE_SETTINGS,
    (_event, partial: Partial<import("@shared/types").AppSettings>) => {
      settings.set(partial);
      return { success: true };
    },
  );

  ipcMain.handle(IPC.SET_DATA_PATH, (_event, folderPath: string) => {
    settings.set({ dataFolderPath: folderPath });
    mkdirSync(settings.getVolunteersPath(), { recursive: true });
    mkdirSync(settings.getBackupsPath(), { recursive: true });
    mkdirSync(settings.getAttachmentsPath(), { recursive: true });

    const status = bootstrapFolderEncryption(folderPath);
    return { success: true, encryptionStatus: status };
  });

  ipcMain.handle(IPC.SELECT_DATA_FOLDER, async (event) => {
    const win = require("electron").BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      title: "Datenordner auswählen (OneDrive / SharePoint Sync)",
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const folderPath = result.filePaths[0];
    settings.set({ dataFolderPath: folderPath });
    mkdirSync(settings.getVolunteersPath(), { recursive: true });
    mkdirSync(settings.getBackupsPath(), { recursive: true });
    mkdirSync(settings.getAttachmentsPath(), { recursive: true });

    bootstrapFolderEncryption(folderPath);
    return folderPath;
  });

  ipcMain.handle(IPC.GET_ENCRYPTION_STATUS, () => {
    return DataCryptoService.getInstance().getStatus(
      settings.getDataFolderPath(),
    );
  });

  ipcMain.handle(IPC.GET_PENDING_ENROLLMENTS, () => {
    return DataCryptoService.getInstance().getPendingEnrollmentRequests(
      settings.getDataFolderPath(),
    );
  });

  ipcMain.handle(IPC.GET_ENCRYPTION_AUDIT_LOG, () => {
    return DataCryptoService.getInstance().getAuditLog(
      settings.getDataFolderPath(),
      100,
    );
  });

  ipcMain.handle(IPC.APPROVE_PENDING_ENROLLMENTS, () => {
    const dataPath = settings.getDataFolderPath();
    if (!dataPath) {
      return {
        success: false,
        approvedCount: 0,
        pendingCount: 0,
        error: "No data folder configured",
      };
    }

    try {
      const result =
        DataCryptoService.getInstance().approvePendingEnrollments(dataPath);
      return {
        success: true,
        approvedCount: result.approvedCount,
        pendingCount: result.pendingCount,
      };
    } catch (error) {
      return {
        success: false,
        approvedCount: 0,
        pendingCount: 0,
        error: String(error),
      };
    }
  });

  ipcMain.handle(IPC.APPROVE_ENROLLMENT, (_event, keyFingerprint: string) => {
    const dataPath = settings.getDataFolderPath();
    if (!dataPath) {
      return {
        success: false,
        pendingCount: 0,
        error: "No data folder configured",
      };
    }

    try {
      const result = DataCryptoService.getInstance().approveEnrollment(
        dataPath,
        keyFingerprint,
      );
      return {
        success: true,
        approved: result.approved,
        pendingCount: result.pendingCount,
      };
    } catch (error) {
      return {
        success: false,
        pendingCount: 0,
        error: String(error),
      };
    }
  });

  ipcMain.handle(IPC.REJECT_ENROLLMENT, (_event, keyFingerprint: string) => {
    const dataPath = settings.getDataFolderPath();
    if (!dataPath) {
      return {
        success: false,
        pendingCount: 0,
        error: "No data folder configured",
      };
    }

    try {
      const result = DataCryptoService.getInstance().rejectEnrollment(
        dataPath,
        keyFingerprint,
      );
      return {
        success: true,
        rejected: result.rejected,
        pendingCount: result.pendingCount,
      };
    } catch (error) {
      return {
        success: false,
        pendingCount: 0,
        error: String(error),
      };
    }
  });

  ipcMain.handle(IPC.ROTATE_ENCRYPTION_KEY, () => {
    const dataPath = settings.getDataFolderPath();
    if (!dataPath) {
      return {
        success: false,
        rotatedFileCount: 0,
        error: "No data folder configured",
      };
    }

    try {
      const result =
        DataCryptoService.getInstance().rotateEncryptionKey(dataPath);
      return {
        success: true,
        rotatedFileCount: result.rotatedFileCount,
      };
    } catch (error) {
      return {
        success: false,
        rotatedFileCount: 0,
        error: String(error),
      };
    }
  });

  // Volunteer CRUD
  ipcMain.handle(IPC.GET_VOLUNTEER_INDEX, () => {
    try {
      const svc = getFileService(settings);
      if (!svc) return null;
      return svc.readIndex();
    } catch {
      return {
        _version: 0,
        _updatedAt: new Date().toISOString(),
        volunteers: [],
      };
    }
  });

  ipcMain.handle(IPC.GET_VOLUNTEER, (_event, id: string) => {
    try {
      const svc = getFileService(settings);
      if (!svc) return null;
      return svc.readVolunteer(id);
    } catch {
      return null;
    }
  });

  ipcMain.handle(
    IPC.SAVE_VOLUNTEER,
    (_event, volunteer: Volunteer): SaveResult => {
      let svc: VolunteerFileService | null = null;
      try {
        svc = getFileService(settings);
      } catch (error) {
        return {
          success: false,
          reason: "io-error",
          message: String(error),
        };
      }

      if (!svc) {
        return {
          success: false,
          reason: "io-error",
          message: "Kein Datenordner konfiguriert.",
        };
      }

      if (!volunteer.id) {
        volunteer.id = uuidv4();
        volunteer._version = 0;
        volunteer._createdAt = new Date().toISOString();
        volunteer._updatedAt = new Date().toISOString();
      }

      return svc.saveVolunteer(volunteer);
    },
  );

  ipcMain.handle(IPC.DELETE_VOLUNTEER, (_event, id: string) => {
    try {
      const svc = getFileService(settings);
      if (!svc) return;
      svc.deleteVolunteer(id);
    } catch {
      return;
    }
  });

  // File attachments
  ipcMain.handle(IPC.SELECT_FILE, async (event) => {
    const win = require("electron").BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      title: "Datei auswählen",
      properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    IPC.UPLOAD_FILE,
    async (_event, volunteerId: string, sourcePath: string) => {
      try {
        const svc = getFileService(settings);
        if (!svc) {
          return { success: false, error: "No data folder configured" };
        }
        return svc.uploadFile(volunteerId, sourcePath);
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle(IPC.DELETE_FILE, (_event, filePath: string) => {
    try {
      const svc = getFileService(settings);
      if (!svc) {
        return { success: false, error: "No data folder configured" };
      }
      return svc.deleteFile(filePath);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(IPC.OPEN_FILE, (_event, filePath: string) => {
    try {
      const svc = getFileService(settings);
      if (!svc) {
        return { success: false, error: "No data folder configured" };
      }
      return svc.openFile(filePath);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Reminders
  ipcMain.handle(IPC.GET_DUE_REMINDERS, () => {
    try {
      const svc = getFileService(settings);
      if (!svc) return [];

      const index = svc.readIndex();
      const volunteers: Volunteer[] = [];

      for (const entry of index.volunteers) {
        if (entry.status === "archived") continue;
        const volunteer = svc.readVolunteer(entry.id);
        if (!volunteer) continue;
        volunteers.push(volunteer);
      }

      return getUpcomingReminders(volunteers, settings.get(), 30);
    } catch {
      return [];
    }
  });

  ipcMain.handle(
    IPC.DISMISS_REMINDER,
    (_event, volunteerId: string, reminderId: string) => {
      try {
        const svc = getFileService(settings);
        if (!svc) return;
        const volunteer = svc.readVolunteer(volunteerId);
        if (!volunteer) return;
        const reminder = volunteer.reminders.find((r) => r.id === reminderId);
        if (!reminder) return;
        reminder.dismissed = true;
        reminder.dismissedAt = new Date().toISOString();
        svc.saveVolunteer(volunteer);
      } catch {
        return;
      }
    },
  );

  ipcMain.handle(IPC.SIMULATE_REMINDER, (event, payload: DueReminder) => {
    if (onRemindersTriggered) {
      onRemindersTriggered([payload]);
    } else {
      event.sender.send(IPC.REMINDER_TRIGGERED, [payload]);
    }
    return { success: true };
  });

  // App info
  ipcMain.handle(IPC.GET_APP_VERSION, () => {
    const { app } = require("electron") as typeof import("electron");
    return app.getVersion();
  });
}
