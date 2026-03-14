import { app } from "electron";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { AppSettings, DEFAULT_SETTINGS } from "@shared/types";

const SETTINGS_FILE = "settings.json";

export class SettingsService {
  private static instance: SettingsService;
  private settings: AppSettings;
  private settingsPath: string;

  private constructor() {
    const userDataPath = app.getPath("userData");
    mkdirSync(userDataPath, { recursive: true });
    this.settingsPath = join(userDataPath, SETTINGS_FILE);
    this.settings = this.load();
  }

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  private load(): AppSettings {
    if (existsSync(this.settingsPath)) {
      try {
        const raw = readFileSync(this.settingsPath, "utf-8");
        return JSON.parse(raw) as AppSettings;
      } catch {
        return { ...DEFAULT_SETTINGS };
      }
    }
    return { ...DEFAULT_SETTINGS };
  }

  get(): AppSettings {
    return { ...this.settings };
  }

  set(partial: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...partial };
    writeFileSync(
      this.settingsPath,
      JSON.stringify(this.settings, null, 2),
      "utf-8",
    );
  }

  getDataFolderPath(): string {
    return this.settings.dataFolderPath;
  }

  getVolunteersPath(): string {
    return join(this.settings.dataFolderPath, "volunteers");
  }

  getIndexPath(): string {
    return join(this.settings.dataFolderPath, "index.json");
  }

  getBackupsPath(): string {
    return join(this.settings.dataFolderPath, "backups");
  }

  getAttachmentsPath(): string {
    return join(this.settings.dataFolderPath, "attachments");
  }
}
