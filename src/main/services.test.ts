import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  BusinessAuditEntry,
  GroupMeeting,
  ProcessingActivityRecord,
} from "@shared/types";
import { createDefaultProcessingActivitiesDocument } from "@shared/types";

const electronMocks = vi.hoisted(() => ({
  getPath: vi.fn(),
  openPath: vi.fn(),
}));

vi.mock("electron", () => ({
  app: { getPath: electronMocks.getPath },
  shell: { openPath: electronMocks.openPath },
  safeStorage: {},
}));

import { BusinessAuditService } from "./businessAuditService";
import { DataCryptoService } from "./dataCryptoService";
import { GroupMeetingService } from "./groupMeetingService";
import { HauptamtlicheService } from "./hauptamtlicheService";
import { ProcessingActivitiesService } from "./processingActivitiesService";

const temporaryRoot = mkdtempSync(join(tmpdir(), "vwp-service-tests-"));
const electronTempPath = join(temporaryRoot, "electron-temp");

beforeAll(() => {
  electronMocks.getPath.mockReturnValue(electronTempPath);
  electronMocks.openPath.mockResolvedValue("");
});

afterAll(() => {
  rmSync(temporaryRoot, { recursive: true, force: true });
});

function createCryptoService(): DataCryptoService {
  const cryptoService = new DataCryptoService();
  vi.spyOn(cryptoService, "encryptBytesForDataFolder").mockImplementation(
    (_dataPath, payload) => payload,
  );
  vi.spyOn(cryptoService, "decryptBytesForDataFolder").mockImplementation(
    (_dataPath, payload) => payload,
  );
  vi.spyOn(cryptoService, "getStatus").mockReturnValue({
    enabled: false,
    authorized: false,
    hasManifest: false,
    pendingRequestCount: 0,
    currentUser: "",
    keyFingerprint: "",
  });
  return cryptoService;
}

function createProcessingActivity(
  overrides: Partial<ProcessingActivityRecord> = {},
): ProcessingActivityRecord {
  return {
    id: "volunteer-management",
    name: "Volunteer management",
    controllerName: "Organization",
    controllerContact: "contact@example.test",
    dataProtectionContact: "",
    purposes: "Coordinate volunteers",
    categoriesOfSubjects: ["Volunteers"],
    categoriesOfData: ["Contact details"],
    legalBases: [],
    recipients: [],
    processors: [],
    thirdCountryTransfers: "",
    retentionPolicy: "",
    technicalMeasures: [],
    organizationalMeasures: [],
    systems: [],
    notes: "",
    ...overrides,
  };
}

function createMeeting(overrides: Partial<GroupMeeting> = {}): GroupMeeting {
  return {
    id: "meeting-1",
    title: "Planning",
    date: "2026-10-22",
    participants: [
      { id: "volunteer-1", name: "Ada Lovelace", type: "volunteer" },
    ],
    _createdAt: "2026-10-01T12:00:00.000Z",
    _updatedAt: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("HauptamtlicheService", () => {
  it("creates, updates, filters, and deletes people", () => {
    const dataPath = join(temporaryRoot, "hauptamtliche");
    mkdirSync(dataPath, { recursive: true });
    const filePath = join(dataPath, "hauptamtliche.json");
    const service = new HauptamtlicheService(
      dataPath,
      filePath,
      createCryptoService(),
    );

    expect(service.readAll().people).toEqual([]);

    const created = service.save(" Ada ", " Lovelace ");
    expect(created).toEqual({
      person: {
        id: expect.any(String),
        firstName: "Ada",
        lastName: "Lovelace",
      },
      created: true,
    });
    expect(service.readAll()).toMatchObject({
      _version: 2,
      people: [created.person],
    });

    const updated = service.save("Augusta", "King", created.person.id);
    expect(updated).toMatchObject({
      created: false,
      person: { id: created.person.id, firstName: "Augusta", lastName: "King" },
    });
    expect(service.delete("missing")).toBe(false);
    expect(service.delete(created.person.id)).toBe(true);
    expect(service.readAll().people).toEqual([]);
  });

  it("rejects blank names and unknown update IDs, and filters malformed records", () => {
    const dataPath = join(temporaryRoot, "hauptamtliche-validation");
    mkdirSync(dataPath, { recursive: true });
    const filePath = join(dataPath, "hauptamtliche.json");
    const service = new HauptamtlicheService(
      dataPath,
      filePath,
      createCryptoService(),
    );

    expect(() => service.save(" ", "Lovelace")).toThrow(
      "Bitte Vor- und Nachnamen eingeben.",
    );
    expect(() => service.save("Ada", "Lovelace", "missing")).toThrow(
      "Eintrag nicht gefunden.",
    );

    writeFileSync(
      filePath,
      JSON.stringify({
        people: [
          { id: "valid", firstName: "Ada", lastName: "Lovelace" },
          { id: "invalid", firstName: "Grace" },
        ],
      }),
    );
    expect(service.readAll()).toMatchObject({
      _version: 1,
      people: [{ id: "valid", firstName: "Ada", lastName: "Lovelace" }],
    });
  });
});

describe("ProcessingActivitiesService", () => {
  it("returns defaults when missing, writes normalized data, and exports markdown", () => {
    const dataPath = join(temporaryRoot, "processing-activities");
    mkdirSync(dataPath, { recursive: true });
    const service = new ProcessingActivitiesService(
      dataPath,
      createCryptoService(),
    );

    expect(service.readDocument().activities.map(({ id }) => id)).toEqual(
      createDefaultProcessingActivitiesDocument().activities.map(
        ({ id }) => id,
      ),
    );
    const sourceActivity = createProcessingActivity({
      categoriesOfSubjects: ["Volunteers"],
      lastReviewedAt: "",
    });
    const written = service.writeDocument({
      _version: 4,
      _updatedAt: "ignored",
      activities: [sourceActivity],
    });

    expect(written._version).toBe(5);
    expect(written.activities[0].lastReviewedAt).toBeUndefined();
    expect(written.activities[0].categoriesOfSubjects).not.toBe(
      sourceActivity.categoriesOfSubjects,
    );
    const persisted = service.readDocument();
    expect(persisted._version).toBe(5);
    expect(persisted.activities[0]).toMatchObject({
      id: sourceActivity.id,
      name: sourceActivity.name,
      categoriesOfSubjects: sourceActivity.categoriesOfSubjects,
    });
    expect(persisted.activities[0].lastReviewedAt).toBeUndefined();

    const exportPath = join(dataPath, "activities.md");
    service.exportMarkdown(exportPath);
    const markdown = readFileSync(exportPath, "utf-8");
    expect(markdown).toContain("# Verzeichnis von Verarbeitungstaetigkeiten");
    expect(markdown).toContain("## Volunteer management");
    expect(markdown).toContain("- Volunteers");
    expect(markdown).toContain("- Keine Angabe");
    expect(existsSync(join(dataPath, "processing-activities.json"))).toBe(true);
  });

  it("falls back to defaults for malformed documents and handles empty activity lists", () => {
    const dataPath = join(temporaryRoot, "processing-activities-invalid");
    mkdirSync(dataPath, { recursive: true });
    const service = new ProcessingActivitiesService(
      dataPath,
      createCryptoService(),
    );
    const filePath = join(dataPath, "processing-activities.json");

    writeFileSync(filePath, JSON.stringify({ activities: [] }));
    expect(service.readDocument().activities.map(({ id }) => id)).toEqual(
      createDefaultProcessingActivitiesDocument().activities.map(
        ({ id }) => id,
      ),
    );

    writeFileSync(filePath, "not JSON");
    expect(service.readDocument().activities.map(({ id }) => id)).toEqual(
      createDefaultProcessingActivitiesDocument().activities.map(
        ({ id }) => id,
      ),
    );
  });
});

describe("BusinessAuditService", () => {
  it("appends entries, returns newest entries first, and exports markdown", () => {
    const dataPath = join(temporaryRoot, "business-audit");
    mkdirSync(dataPath, { recursive: true });
    const service = new BusinessAuditService(dataPath, createCryptoService());
    const entry: Omit<BusinessAuditEntry, "timestamp" | "actor"> = {
      action: "volunteer-created",
      subjectType: "volunteer",
      subjectId: "volunteer-1",
      details: "Created record",
    };

    const appended = service.append(entry);
    expect(appended).toMatchObject({
      ...entry,
      timestamp: expect.any(String),
      actor: "unbekannt",
    });
    service.append({ ...entry, subjectId: "volunteer-2", details: undefined });
    const newestEntry = service.getEntries(1)[0];
    expect(newestEntry.subjectId).toBe("volunteer-2");
    expect(newestEntry).not.toHaveProperty("details");
    expect(service.getEntries()).toHaveLength(2);

    const exportPath = join(dataPath, "audit.md");
    service.exportMarkdown(exportPath);
    const markdown = readFileSync(exportPath, "utf-8");
    expect(markdown).toContain("# Aktivitaetsprotokoll");
    expect(markdown).toContain("volunteer:volunteer-1");
    expect(markdown).toContain("Created record");
  });

  it("migrates legacy plaintext audit entries before appending", () => {
    const dataPath = join(temporaryRoot, "business-audit-legacy");
    const cryptoService = createCryptoService();
    const auditFolder = join(dataPath, ".vwp-crypto");
    const auditFile = join(auditFolder, "business-audit.json");
    mkdirSync(auditFolder, { recursive: true });
    const legacyEntries: BusinessAuditEntry[] = [
      {
        timestamp: "2026-01-01T00:00:00.000Z",
        actor: "Legacy user",
        action: "volunteer-created",
        subjectType: "volunteer",
      },
    ];
    writeFileSync(auditFile, JSON.stringify(legacyEntries));
    vi.spyOn(cryptoService, "decryptBytesForDataFolder")
      .mockImplementationOnce(() => {
        throw new Error("NOT_ENCRYPTED");
      })
      .mockImplementation((_path, payload) => payload);

    const service = new BusinessAuditService(dataPath, cryptoService);
    service.append({
      action: "volunteer-updated",
      subjectType: "volunteer",
      subjectId: "volunteer-1",
    });

    expect(service.getEntries()).toHaveLength(2);
    expect(readFileSync(auditFile, "utf-8")).toContain("Legacy user");
  });
});

describe("GroupMeetingService", () => {
  it("normalizes, saves, uploads, opens, and deletes meeting attachments", async () => {
    const dataPath = join(temporaryRoot, "group-meetings");
    const attachmentsPath = join(dataPath, "attachments");
    mkdirSync(dataPath, { recursive: true });
    const service = new GroupMeetingService(
      dataPath,
      join(dataPath, "meetings.json"),
      attachmentsPath,
      createCryptoService(),
    );

    expect(service.readAll().meetings).toEqual([]);
    const saved = service.save(createMeeting());
    expect(saved.date).toBe("2026-10-22T09:00");
    expect(service.readAll()).toMatchObject({
      _version: 2,
      meetings: [{ id: "meeting-1", date: "2026-10-22T09:00" }],
    });
    expect(service.delete("missing")).toBe(false);

    const sourcePath = join(dataPath, "notes.txt");
    writeFileSync(sourcePath, "meeting notes");
    const upload = service.uploadAttachment(
      "meeting-1",
      sourcePath,
      "Coordinator",
    );
    expect(upload.success).toBe(true);
    if (!upload.success) throw new Error(upload.error);
    expect(upload.attachment).toMatchObject({
      fileName: "notes.txt",
      fileSize: Buffer.byteLength("meeting notes"),
      uploadedBy: "Coordinator",
    });

    service.save(
      createMeeting({
        attachments: [upload.attachment],
      }),
    );
    await expect(
      service.openAttachment(
        "meeting-1",
        upload.attachment.id,
        upload.attachment.fileName,
      ),
    ).resolves.toEqual({ success: true });
    expect(electronMocks.openPath).toHaveBeenCalledWith(
      expect.stringContaining("_notes.txt"),
    );
    expect(service.deleteAttachment("meeting-1", upload.attachment.id)).toEqual(
      { success: true },
    );
    expect(service.delete("meeting-1")).toBe(true);
  });

  it("reports missing meetings and source files", () => {
    const dataPath = join(temporaryRoot, "group-meetings-missing");
    mkdirSync(dataPath, { recursive: true });
    const service = new GroupMeetingService(
      dataPath,
      join(dataPath, "meetings.json"),
      join(dataPath, "attachments"),
      createCryptoService(),
    );

    expect(service.uploadAttachment("missing", "missing.txt", "")).toMatchObject(
      { success: false, error: "Das Gruppentreffen wurde nicht gefunden." },
    );
    service.save(createMeeting());
    expect(
      service.uploadAttachment("meeting-1", "missing.txt", ""),
    ).toMatchObject({
      success: false,
      error: "Die Quelldatei wurde nicht gefunden.",
    });
  });
});
