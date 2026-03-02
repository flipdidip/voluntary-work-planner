import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Notification,
  nativeImage,
} from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { registerVolunteerHandlers } from "./ipcHandlers";
import { SettingsService } from "./settingsService";
import { ReminderScheduler } from "./reminderScheduler";
import type { DueReminder } from "./reminderScheduler";

let mainWindow: BrowserWindow | null = null;
let reminderScheduler: ReminderScheduler | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: "Voluntary Work Planner",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow!.show();
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("de.ehrenamt.voluntaryworkplanner");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  const settings = SettingsService.getInstance();

  // Register all IPC handlers
  registerVolunteerHandlers(ipcMain, settings);

  // Start reminder scheduler — checks every N minutes
  reminderScheduler = new ReminderScheduler(
    settings,
    (reminders: DueReminder[]) => {
      // Push to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reminder-triggered", reminders);
      }

      // Also show OS notification (taskbar)
      reminders.forEach((r) => {
        if (Notification.isSupported()) {
          const notification = new Notification({
            title: r.reminder.title,
            body: r.reminder.message,
            icon: nativeImage.createEmpty(),
            urgency: "normal",
          });
          notification.show();
        }
      });
    },
  );
  reminderScheduler.start();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  reminderScheduler?.stop();
  if (process.platform !== "darwin") app.quit();
});
