import { IpcMain, dialog } from "electron";
import { v4 as uuidv4 } from "uuid";
import { IPC, Volunteer, SaveResult } from "@shared/types";
import { SettingsService } from "./settingsService";
import { VolunteerFileService } from "./volunteerFileService";
import { mkdirSync } from "fs";

function getFileService(
  settings: SettingsService,
): VolunteerFileService | null {
  const dataPath = settings.getDataFolderPath();
  if (!dataPath) return null;
  mkdirSync(settings.getVolunteersPath(), { recursive: true });
  mkdirSync(settings.getBackupsPath(), { recursive: true });
  return new VolunteerFileService(
    settings.getVolunteersPath(),
    settings.getIndexPath(),
    settings.getBackupsPath(),
  );
}

export function registerVolunteerHandlers(
  ipcMain: IpcMain,
  settings: SettingsService,
): void {
  // ── Settings ──────────────────────────────────────────
  ipcMain.handle(IPC.GET_DATA_PATH, () => settings.getDataFolderPath());

  ipcMain.handle(IPC.SET_DATA_PATH, (_event, folderPath: string) => {
    settings.set({ dataFolderPath: folderPath });
    mkdirSync(settings.getVolunteersPath(), { recursive: true });
    mkdirSync(settings.getBackupsPath(), { recursive: true });
    return { success: true };
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
    return folderPath;
  });

  // ── Volunteer CRUD ────────────────────────────────────
  ipcMain.handle(IPC.GET_VOLUNTEER_INDEX, () => {
    const svc = getFileService(settings);
    if (!svc) return null;
    return svc.readIndex();
  });

  ipcMain.handle(IPC.GET_VOLUNTEER, (_event, id: string) => {
    const svc = getFileService(settings);
    if (!svc) return null;
    return svc.readVolunteer(id);
  });

  ipcMain.handle(
    IPC.SAVE_VOLUNTEER,
    (_event, volunteer: Volunteer): SaveResult => {
      const svc = getFileService(settings);
      if (!svc) {
        return {
          success: false,
          reason: "io-error",
          message: "Kein Datenordner konfiguriert.",
        };
      }

      // New volunteer — assign ID and timestamps
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
    const svc = getFileService(settings);
    if (!svc) return;
    svc.deleteVolunteer(id);
  });

  // ── Reminders ─────────────────────────────────────────
  ipcMain.handle(IPC.GET_DUE_REMINDERS, () => {
    // Scheduler pushes these proactively, but renderer can also pull
    return [];
  });

  ipcMain.handle(
    IPC.DISMISS_REMINDER,
    (_event, volunteerId: string, reminderId: string) => {
      const svc = getFileService(settings);
      if (!svc) return;
      const volunteer = svc.readVolunteer(volunteerId);
      if (!volunteer) return;
      const reminder = volunteer.reminders.find((r) => r.id === reminderId);
      if (!reminder) return;
      reminder.dismissed = true;
      reminder.dismissedAt = new Date().toISOString();
      svc.saveVolunteer(volunteer);
    },
  );

  // ── App Info ──────────────────────────────────────────
  ipcMain.handle(IPC.GET_APP_VERSION, () => {
    const { app } = require("electron") as typeof import("electron");
    return app.getVersion();
  });
}
