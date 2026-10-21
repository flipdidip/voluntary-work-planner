import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@shared/types";

const electronMocks = vi.hoisted(() => ({
  getPath: vi.fn(),
}));

vi.mock("electron", () => ({
  app: { getPath: electronMocks.getPath },
}));

let userDataPath: string;

beforeEach(() => {
  userDataPath = mkdtempSync(join(tmpdir(), "vwp-settings-tests-"));
  electronMocks.getPath.mockReturnValue(userDataPath);
  vi.resetModules();
});

afterEach(() => {
  rmSync(userDataPath, { recursive: true, force: true });
});

async function createSettingsService() {
  const { SettingsService } = await import("./settingsService");
  return SettingsService.getInstance();
}

describe("SettingsService", () => {
  it("loads defaults, persists updates, and returns independent settings snapshots", async () => {
    const service = await createSettingsService();
    expect(service.get()).toEqual(DEFAULT_SETTINGS);
    expect(service.get()).not.toBe(service.get());

    const snapshot = service.get();
    snapshot.language = "en";
    expect(service.get().language).toBe(DEFAULT_SETTINGS.language);

    service.set({ language: "en", dataFolderPath: join(userDataPath, "data") });
    expect(JSON.parse(readFileSync(join(userDataPath, "settings.json"), "utf-8")))
      .toMatchObject({
        language: "en",
        dataFolderPath: join(userDataPath, "data"),
      });
    expect(service.get()).toMatchObject({
      language: "en",
      dataFolderPath: join(userDataPath, "data"),
    });
  });

  it("validates the archived-record retention setting before persisting", async () => {
    const service = await createSettingsService();
    const settingsPath = join(userDataPath, "settings.json");

    expect(() => service.set({ archivedDeletionAfterMonths: 0 })).toThrow(
      "Die Aufbewahrungsdauer muss eine positive ganze Anzahl von Monaten sein.",
    );
    expect(() => service.set({ archivedDeletionAfterMonths: 1.5 })).toThrow(
      "Die Aufbewahrungsdauer muss eine positive ganze Anzahl von Monaten sein.",
    );
    expect(service.get().archivedDeletionAfterMonths).toBe(
      DEFAULT_SETTINGS.archivedDeletionAfterMonths,
    );
    expect(() => readFileSync(settingsPath)).toThrow();

    service.set({ archivedDeletionAfterMonths: 1 });
    expect(service.get().archivedDeletionAfterMonths).toBe(1);
  });

  it("loads legacy retention settings and replaces invalid or malformed files with defaults", async () => {
    const settingsPath = join(userDataPath, "settings.json");
    writeFileSync(
      settingsPath,
      JSON.stringify({
        language: "en",
        inactiveDeletionAfterMonths: 18,
      }),
    );
    const migrated = await createSettingsService();
    expect(migrated.get()).toMatchObject({
      language: "en",
      archivedDeletionAfterMonths: 18,
    });

    writeFileSync(
      settingsPath,
      JSON.stringify({ archivedDeletionAfterMonths: -1 }),
    );
    vi.resetModules();
    const invalidRetention = await createSettingsService();
    expect(invalidRetention.get().archivedDeletionAfterMonths).toBe(
      DEFAULT_SETTINGS.archivedDeletionAfterMonths,
    );

    writeFileSync(settingsPath, "not JSON");
    vi.resetModules();
    const malformed = await createSettingsService();
    expect(malformed.get()).toEqual(DEFAULT_SETTINGS);
  });

  it("derives all data paths from the configured data folder", async () => {
    const service = await createSettingsService();
    const dataPath = join(userDataPath, "shared-data");
    service.set({ dataFolderPath: dataPath });

    expect(service.getDataFolderPath()).toBe(dataPath);
    expect(service.getVolunteersPath()).toBe(join(dataPath, "volunteers"));
    expect(service.getIndexPath()).toBe(join(dataPath, "index.json"));
    expect(service.getBackupsPath()).toBe(join(dataPath, "backups"));
    expect(service.getAttachmentsPath()).toBe(join(dataPath, "attachments"));
    expect(service.getPartnersPath()).toBe(join(dataPath, "partners"));
    expect(service.getPartnerIndexPath()).toBe(
      join(dataPath, "partners-index.json"),
    );
    expect(service.getPartnerBackupsPath()).toBe(
      join(dataPath, "partner-backups"),
    );
    expect(service.getPartnerAttachmentsPath()).toBe(
      join(dataPath, "partner-attachments"),
    );
    expect(service.getMeetingsPath()).toBe(join(dataPath, "meetings.json"));
    expect(service.getGroupMeetingAttachmentsPath()).toBe(
      join(dataPath, "group-meeting-attachments"),
    );
    expect(service.getHauptamtlichePath()).toBe(
      join(dataPath, "hauptamtliche.json"),
    );
  });
});
