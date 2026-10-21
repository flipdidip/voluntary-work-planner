import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Volunteer } from "../shared/types";

const electronMocks = vi.hoisted(() => ({
  getPath: vi.fn(),
  encryptString: vi.fn((value: string) => Buffer.from(value, "utf-8")),
  decryptString: vi.fn((value: Buffer) => value.toString("utf-8")),
}));

vi.mock("electron", () => ({
  app: {
    getPath: electronMocks.getPath,
    getAppPath: () => "",
    isPackaged: true,
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: electronMocks.encryptString,
    decryptString: electronMocks.decryptString,
  },
  shell: {
    openPath: vi.fn(),
  },
}));

import { DataCryptoService } from "./dataCryptoService";
import { VolunteerFileService } from "./volunteerFileService";
import { shell } from "electron";

const temporaryRoot = mkdtempSync(join(tmpdir(), "vwp-crypto-tests-"));
const userDataPath = join(temporaryRoot, "user-data");
const dataPath = join(temporaryRoot, "data");
const cryptoService = new DataCryptoService();

function createDataFolder(path: string): void {
  mkdirSync(path, { recursive: true });
  cryptoService.initializeDataFolder(path);
}

function createVolunteer(): Volunteer {
  return {
    id: "volunteer-1",
    _version: 0,
    _createdAt: "2026-01-01T00:00:00.000Z",
    _updatedAt: "2026-01-01T00:00:00.000Z",
    statusLog: [],
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.test",
    status: "active",
    joinedDate: "2026-01-01",
    roles: ["Mentoring"],
    notes: "Serialized test record",
    reminders: [],
    fileRecords: [],
    requirements: [],
  };
}

function createFileService(path: string): VolunteerFileService {
  const volunteersPath = join(path, "volunteers");
  return new VolunteerFileService(
    path,
    volunteersPath,
    join(path, "index.json"),
    join(path, "backups"),
    join(path, "attachments"),
    cryptoService,
  );
}

beforeAll(() => {
  mkdirSync(userDataPath, { recursive: true });
  electronMocks.getPath.mockReturnValue(userDataPath);
  createDataFolder(dataPath);
});

afterAll(() => {
  rmSync(temporaryRoot, { recursive: true, force: true });
});

describe("data encryption and volunteer serialization", () => {
  it("reports encryption status, authorized users, and audit history", () => {
    expect(cryptoService.getStatus("")).toMatchObject({
      enabled: false,
      authorized: false,
      hasManifest: false,
    });
    expect(cryptoService.getStatus(dataPath)).toMatchObject({
      enabled: true,
      authorized: true,
      userRole: "primary",
    });
    expect(cryptoService.getAuthorizedUsers(dataPath)).toEqual([
      expect.objectContaining({
        userName: expect.any(String),
        role: "primary",
      }),
    ]);
    expect(cryptoService.getAuditLog(dataPath, 1)).toEqual([
      expect.objectContaining({ action: "manifest-created" }),
    ]);
    expect(cryptoService.getPendingEnrollmentRequests(dataPath)).toEqual([]);
  });

  it("handles missing manifests and rejects invalid encryption operations", () => {
    const uninitializedPath = join(temporaryRoot, "uninitialized-data");
    mkdirSync(uninitializedPath, { recursive: true });

    expect(cryptoService.getStatus(uninitializedPath)).toMatchObject({
      enabled: false,
      authorized: false,
      hasManifest: false,
    });
    expect(cryptoService.getAuditLog(uninitializedPath)).toEqual([]);
    expect(() => cryptoService.initializeDataFolder("")).toThrow(
      "Kein Datenordner ausgewählt.",
    );
    expect(
      cryptoService.updateAuthorizedUserRole(dataPath, "unknown", "primary"),
    ).toEqual({ updated: false });

    const authorizedUser = cryptoService.getAuthorizedUsers(dataPath)[0];
    expect(
      cryptoService.updateAuthorizedUserRole(
        dataPath,
        authorizedUser.keyFingerprint,
        "primary",
      ),
    ).toEqual({ updated: false });
    expect(() =>
      cryptoService.updateAuthorizedUserRole(
        dataPath,
        authorizedUser.keyFingerprint,
        "partner-only",
      ),
    ).toThrow("Mindestens ein Benutzer mit Vollzugriff muss erhalten bleiben.");
    expect(cryptoService.approveEnrollment(dataPath, "missing")).toEqual({
      approved: false,
      pendingCount: 0,
    });
    expect(cryptoService.rejectEnrollment(dataPath, "missing")).toEqual({
      rejected: false,
      pendingCount: 0,
    });
  });

  it("encrypts and decrypts payloads, and rejects tampering", () => {
    const plaintext = Buffer.from("private volunteer data", "utf-8");
    const encrypted = cryptoService.encryptBytesForDataFolder(
      dataPath,
      plaintext,
    );

    expect(encrypted.subarray(0, 4).toString("ascii")).toBe("VWP1");
    expect(encrypted.includes(plaintext)).toBe(false);
    expect(cryptoService.decryptBytesForDataFolder(dataPath, encrypted)).toEqual(
      plaintext,
    );

    const tampered = Buffer.from(encrypted);
    tampered[tampered.length - 1] ^= 1;
    expect(() =>
      cryptoService.decryptBytesForDataFolder(dataPath, tampered),
    ).toThrow();
  });

  it("distinguishes plaintext legacy files from encrypted payloads", () => {
    expect(() =>
      cryptoService.decryptBytesForDataFolder(
        dataPath,
        Buffer.from('{"legacy":true}', "utf-8"),
      ),
    ).toThrow("NOT_ENCRYPTED");
  });

  it("round-trips volunteer and index JSON through encrypted files", () => {
    const serviceDataPath = join(temporaryRoot, "serialized-data");
    createDataFolder(serviceDataPath);
    const volunteersPath = join(serviceDataPath, "volunteers");
    const indexPath = join(serviceDataPath, "index.json");
    const service = new VolunteerFileService(
      serviceDataPath,
      volunteersPath,
      indexPath,
      join(serviceDataPath, "backups"),
      join(serviceDataPath, "attachments"),
      cryptoService,
    );

    const saveResult = service.saveVolunteer(createVolunteer());
    expect(saveResult.success).toBe(true);
    if (!saveResult.success) {
      throw new Error(saveResult.message);
    }

    const volunteerFile = join(volunteersPath, "volunteer-1.json");
    const rawVolunteerFile = readFileSync(volunteerFile);
    expect(rawVolunteerFile.subarray(0, 4).toString("ascii")).toBe("VWP1");
    expect(rawVolunteerFile.includes(Buffer.from("Ada"))).toBe(false);
    expect(service.readVolunteer("volunteer-1")).toMatchObject({
      ...createVolunteer(),
      _version: 1,
      _updatedAt: expect.any(String),
      statusLog: [
        {
          from: null,
          to: "active",
          timestamp: "2026-01-01",
        },
      ],
    });

    const rawIndexFile = readFileSync(indexPath);
    expect(rawIndexFile.subarray(0, 4).toString("ascii")).toBe("VWP1");
    expect(rawIndexFile.includes(Buffer.from("Ada"))).toBe(false);
    expect(service.readIndex().volunteers).toMatchObject([
      {
        id: "volunteer-1",
        firstName: "Ada",
        lastName: "Lovelace",
        status: "active",
      },
    ]);
  });

  it("enforces optimistic locking and required status-change reasons", () => {
    const serviceDataPath = join(temporaryRoot, "save-validation-data");
    createDataFolder(serviceDataPath);
    const service = createFileService(serviceDataPath);
    const initial = service.saveVolunteer(createVolunteer());
    expect(initial.success).toBe(true);
    if (!initial.success) throw new Error(initial.message);

    const stale = service.saveVolunteer(createVolunteer());
    expect(stale).toMatchObject({
      success: false,
      reason: "version-conflict",
    });

    const changed = { ...initial.volunteer, status: "inactive" as const };
    const missingReason = service.saveVolunteer(changed, undefined, true);
    expect(missingReason).toMatchObject({
      success: false,
      reason: "validation-error",
    });

    const saved = service.saveVolunteer(changed, "  Neue Aufgabe  ", true);
    expect(saved.success).toBe(true);
    if (!saved.success) throw new Error(saved.message);
    expect(saved.volunteer.statusLog.at(-1)).toMatchObject({
      from: "active",
      to: "inactive",
      note: "Neue Aufgabe",
    });
    expect(readdirSync(join(serviceDataPath, "backups"))).toHaveLength(1);
  });

  it("encrypts attachments and opens decrypted temporary copies", () => {
    const serviceDataPath = join(temporaryRoot, "attachment-data");
    createDataFolder(serviceDataPath);
    const service = createFileService(serviceDataPath);
    const sourcePath = join(temporaryRoot, "attachment.txt");
    const content = Buffer.from("private attachment contents");
    writeFileSync(sourcePath, content);

    const upload = service.uploadFile("volunteer-1", sourcePath);
    expect(upload).toMatchObject({
      success: true,
      fileName: "attachment.txt",
      fileSize: content.length,
    });
    if (!upload.success || !upload.filePath) {
      throw new Error(upload.error ?? "Attachment upload failed");
    }

    const storedPath = join(serviceDataPath, "attachments", upload.filePath);
    const encryptedAttachment = readFileSync(storedPath);
    expect(encryptedAttachment.subarray(0, 4).toString("ascii")).toBe("VWP1");
    expect(encryptedAttachment.includes(content)).toBe(false);

    expect(service.openFile(upload.filePath).success).toBe(true);
    expect(shell.openPath).toHaveBeenCalledWith(
      expect.stringContaining("_attachment.txt"),
    );
    expect(
      service.openFile(join("missing", "not-found.txt")),
    ).toMatchObject({ success: false, error: "File does not exist" });
    expect(service.deleteFile(upload.filePath)).toEqual({ success: true });
    expect(existsSync(storedPath)).toBe(false);
    expect(service.uploadFile("volunteer-1", "missing.txt")).toMatchObject({
      success: false,
      error: "Source file does not exist",
    });
  });

  it("upgrades a plaintext legacy attachment when opened", () => {
    const legacyAttachmentDataPath = join(
      temporaryRoot,
      "legacy-attachment-data",
    );
    createDataFolder(legacyAttachmentDataPath);
    const service = createFileService(legacyAttachmentDataPath);
    const relativePath = join("volunteer-1", "legacy.txt");
    const storedPath = join(
      legacyAttachmentDataPath,
      "attachments",
      relativePath,
    );
    const legacyContent = Buffer.from("legacy attachment");
    mkdirSync(join(legacyAttachmentDataPath, "attachments", "volunteer-1"), {
      recursive: true,
    });
    writeFileSync(storedPath, legacyContent);

    expect(service.openFile(relativePath)).toEqual({ success: true });
    const migrated = readFileSync(storedPath);
    expect(migrated.subarray(0, 4).toString("ascii")).toBe("VWP1");
    expect(migrated.includes(legacyContent)).toBe(false);
  });

  it("returns empty data for missing files and soft-deletes saved volunteers", () => {
    const deleteDataPath = join(temporaryRoot, "delete-data");
    createDataFolder(deleteDataPath);
    const service = createFileService(deleteDataPath);

    expect(service.readIndex().volunteers).toEqual([]);
    expect(service.readVolunteer("missing")).toBeNull();
    expect(service.readAllVolunteers()).toEqual([]);

    const saveResult = service.saveVolunteer(createVolunteer());
    expect(saveResult.success).toBe(true);
    expect(service.readAllVolunteers()).toHaveLength(1);

    service.deleteVolunteer("volunteer-1");

    expect(service.readVolunteer("volunteer-1")).toBeNull();
    expect(service.readIndex().volunteers).toEqual([]);
    expect(
      readdirSync(join(deleteDataPath, "volunteers")).some((file) =>
        file.includes(".deleted."),
      ),
    ).toBe(true);
    expect(readdirSync(join(deleteDataPath, "backups"))).toHaveLength(1);
  });

  it("rotates the data-folder key without losing encrypted file contents", () => {
    const rotationDataPath = join(temporaryRoot, "rotation-data");
    createDataFolder(rotationDataPath);
    const service = createFileService(rotationDataPath);
    const saveResult = service.saveVolunteer(createVolunteer());
    expect(saveResult.success).toBe(true);
    const volunteerPath = join(rotationDataPath, "volunteers", "volunteer-1.json");
    const encryptedBefore = readFileSync(volunteerPath);

    const rotation = cryptoService.rotateEncryptionKey(rotationDataPath);

    expect(rotation.rotatedFileCount).toBe(2);
    expect(readFileSync(volunteerPath)).not.toEqual(encryptedBefore);
    expect(service.readVolunteer("volunteer-1")).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
    });
    expect(cryptoService.getAuditLog(rotationDataPath, 1)).toEqual([
      expect.objectContaining({ action: "key-rotated" }),
    ]);
  });

  it("reads and upgrades plaintext legacy volunteer JSON", () => {
    const legacyDataPath = join(temporaryRoot, "legacy-data");
    createDataFolder(legacyDataPath);
    const service = createFileService(legacyDataPath);
    const volunteersPath = join(legacyDataPath, "volunteers");
    const legacyVolunteer = createVolunteer();
    const legacyPath = join(volunteersPath, "volunteer-1.json");
    writeFileSync(legacyPath, JSON.stringify(legacyVolunteer), "utf-8");

    expect(service.readVolunteer("volunteer-1")).toEqual(legacyVolunteer);
    expect(readFileSync(legacyPath).subarray(0, 4).toString("ascii")).toBe(
      "VWP1",
    );
  });
});
