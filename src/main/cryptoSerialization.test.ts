import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
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

beforeAll(() => {
  mkdirSync(userDataPath, { recursive: true });
  electronMocks.getPath.mockReturnValue(userDataPath);
  createDataFolder(dataPath);
});

afterAll(() => {
  rmSync(temporaryRoot, { recursive: true, force: true });
});

describe("data encryption and volunteer serialization", () => {
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

  it("reads and upgrades plaintext legacy volunteer JSON", () => {
    const legacyDataPath = join(temporaryRoot, "legacy-data");
    createDataFolder(legacyDataPath);
    const volunteersPath = join(legacyDataPath, "volunteers");
    const service = new VolunteerFileService(
      legacyDataPath,
      volunteersPath,
      join(legacyDataPath, "index.json"),
      join(legacyDataPath, "backups"),
      join(legacyDataPath, "attachments"),
      cryptoService,
    );
    const legacyVolunteer = createVolunteer();
    const legacyPath = join(volunteersPath, "volunteer-1.json");
    writeFileSync(legacyPath, JSON.stringify(legacyVolunteer), "utf-8");

    expect(service.readVolunteer("volunteer-1")).toEqual(legacyVolunteer);
    expect(readFileSync(legacyPath).subarray(0, 4).toString("ascii")).toBe(
      "VWP1",
    );
  });
});
