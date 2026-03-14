import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { app, safeStorage } from "electron";
import {
  constants,
  createCipheriv,
  createDecipheriv,
  createHash,
  generateKeyPairSync,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from "crypto";
import { userInfo } from "os";
import { EncryptionStatus } from "@shared/types";

const CRYPTO_FOLDER = ".vwp-crypto";
const MANIFEST_FILE = "manifest.json";
const REQUESTS_FOLDER = "requests";
const USER_KEY_FILE = "user-keypair.json";
const MAGIC = Buffer.from("VWP1", "ascii");
const IV_SIZE = 12;
const TAG_SIZE = 16;

interface StoredUserKeyPair {
  version: 1;
  encryptedPrivateKeyB64: string;
  publicKeyPem: string;
  keyFingerprint: string;
}

interface UserIdentity {
  userName: string;
  machineName: string;
  keyFingerprint: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

interface WrappedDekEntry {
  keyFingerprint: string;
  wrappedDekB64: string;
  userName: string;
  machineName: string;
  addedAt: string;
}

interface CryptoManifest {
  version: 1;
  createdAt: string;
  wrappedDekEntries: WrappedDekEntry[];
}

interface EnrollmentRequest {
  version: 1;
  keyFingerprint: string;
  publicKeyPem: string;
  userName: string;
  machineName: string;
  requestedAt: string;
}

export class DataCryptoService {
  private static instance: DataCryptoService;

  static getInstance(): DataCryptoService {
    if (!DataCryptoService.instance) {
      DataCryptoService.instance = new DataCryptoService();
    }
    return DataCryptoService.instance;
  }

  private getCryptoFolderPath(dataPath: string): string {
    return join(dataPath, CRYPTO_FOLDER);
  }

  private getManifestPath(dataPath: string): string {
    return join(this.getCryptoFolderPath(dataPath), MANIFEST_FILE);
  }

  private getRequestsPath(dataPath: string): string {
    return join(this.getCryptoFolderPath(dataPath), REQUESTS_FOLDER);
  }

  private getLocalUserKeyPath(): string {
    return join(app.getPath("userData"), USER_KEY_FILE);
  }

  private getRequestFilePath(dataPath: string, keyFingerprint: string): string {
    return join(this.getRequestsPath(dataPath), `${keyFingerprint}.json`);
  }

  private ensureLocalUserIdentity(): UserIdentity {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "Windows key protection is not available on this system.",
      );
    }

    const user = userInfo();
    const userName = user.username;
    const machineName = process.env.COMPUTERNAME || "unknown-machine";
    const keyPath = this.getLocalUserKeyPath();

    mkdirSync(app.getPath("userData"), { recursive: true });

    if (existsSync(keyPath)) {
      const stored = JSON.parse(
        readFileSync(keyPath, "utf-8"),
      ) as StoredUserKeyPair;
      const privateKeyPem = safeStorage.decryptString(
        Buffer.from(stored.encryptedPrivateKeyB64, "base64"),
      );

      return {
        userName,
        machineName,
        keyFingerprint: stored.keyFingerprint,
        publicKeyPem: stored.publicKeyPem,
        privateKeyPem,
      };
    }

    const generated = generateKeyPairSync("rsa", {
      modulusLength: 3072,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const keyFingerprint = createHash("sha256")
      .update(generated.publicKey, "utf-8")
      .digest("hex");

    const encryptedPrivateKey = safeStorage.encryptString(generated.privateKey);
    const payload: StoredUserKeyPair = {
      version: 1,
      encryptedPrivateKeyB64: encryptedPrivateKey.toString("base64"),
      publicKeyPem: generated.publicKey,
      keyFingerprint,
    };

    writeFileSync(keyPath, JSON.stringify(payload, null, 2), "utf-8");

    return {
      userName,
      machineName,
      keyFingerprint,
      publicKeyPem: generated.publicKey,
      privateKeyPem: generated.privateKey,
    };
  }

  private ensureCryptoFolders(dataPath: string): void {
    mkdirSync(this.getCryptoFolderPath(dataPath), { recursive: true });
    mkdirSync(this.getRequestsPath(dataPath), { recursive: true });
  }

  private readManifest(dataPath: string): CryptoManifest {
    const manifestPath = this.getManifestPath(dataPath);
    const raw = readFileSync(manifestPath, "utf-8");
    return JSON.parse(raw) as CryptoManifest;
  }

  private writeManifest(dataPath: string, manifest: CryptoManifest): void {
    writeFileSync(
      this.getManifestPath(dataPath),
      JSON.stringify(manifest, null, 2),
      "utf-8",
    );
  }

  private wrapDekForUser(publicKeyPem: string, dek: Buffer): string {
    const wrapped = publicEncrypt(
      {
        key: publicKeyPem,
        oaepHash: "sha256",
        padding: constants.RSA_PKCS1_OAEP_PADDING,
      },
      dek,
    );
    return wrapped.toString("base64");
  }

  private unwrapDekForUser(
    privateKeyPem: string,
    wrappedDekB64: string,
  ): Buffer {
    return privateDecrypt(
      {
        key: privateKeyPem,
        oaepHash: "sha256",
        padding: constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(wrappedDekB64, "base64"),
    );
  }

  private listEnrollmentRequests(dataPath: string): EnrollmentRequest[] {
    const requestsPath = this.getRequestsPath(dataPath);
    if (!existsSync(requestsPath)) return [];

    const files = readdirSync(requestsPath).filter((f) => f.endsWith(".json"));
    const requests: EnrollmentRequest[] = [];

    for (const file of files) {
      try {
        const raw = readFileSync(join(requestsPath, file), "utf-8");
        requests.push(JSON.parse(raw) as EnrollmentRequest);
      } catch {
        continue;
      }
    }

    return requests;
  }

  private createEnrollmentRequest(
    dataPath: string,
    identity: UserIdentity,
  ): void {
    const requestPath = this.getRequestFilePath(
      dataPath,
      identity.keyFingerprint,
    );
    if (existsSync(requestPath)) return;

    const request: EnrollmentRequest = {
      version: 1,
      keyFingerprint: identity.keyFingerprint,
      publicKeyPem: identity.publicKeyPem,
      userName: identity.userName,
      machineName: identity.machineName,
      requestedAt: new Date().toISOString(),
    };

    writeFileSync(requestPath, JSON.stringify(request, null, 2), "utf-8");
  }

  private initializeManifest(
    dataPath: string,
    identity: UserIdentity,
  ): CryptoManifest {
    const dek = randomBytes(32);
    const manifest: CryptoManifest = {
      version: 1,
      createdAt: new Date().toISOString(),
      wrappedDekEntries: [
        {
          keyFingerprint: identity.keyFingerprint,
          wrappedDekB64: this.wrapDekForUser(identity.publicKeyPem, dek),
          userName: identity.userName,
          machineName: identity.machineName,
          addedAt: new Date().toISOString(),
        },
      ],
    };

    this.writeManifest(dataPath, manifest);
    return manifest;
  }

  private getDekForCurrentUser(dataPath: string): {
    dek: Buffer;
    identity: UserIdentity;
    manifest: CryptoManifest;
  } {
    const identity = this.ensureLocalUserIdentity();
    this.ensureCryptoFolders(dataPath);

    const manifestPath = this.getManifestPath(dataPath);
    const manifest = existsSync(manifestPath)
      ? this.readManifest(dataPath)
      : this.initializeManifest(dataPath, identity);

    const myWrappedDek = manifest.wrappedDekEntries.find(
      (entry) => entry.keyFingerprint === identity.keyFingerprint,
    );

    if (!myWrappedDek) {
      this.createEnrollmentRequest(dataPath, identity);
      throw new Error(
        "Dieser Benutzer ist noch nicht für den verschlüsselten Datenordner freigegeben.",
      );
    }

    const dek = this.unwrapDekForUser(
      identity.privateKeyPem,
      myWrappedDek.wrappedDekB64,
    );

    return { dek, identity, manifest };
  }

  getStatus(dataPath: string): EncryptionStatus {
    if (!dataPath) {
      return {
        enabled: false,
        authorized: false,
        hasManifest: false,
        pendingRequestCount: 0,
        currentUser: "",
        keyFingerprint: "",
        message: "Kein Datenordner ausgewählt.",
      };
    }

    const identity = this.ensureLocalUserIdentity();
    this.ensureCryptoFolders(dataPath);

    const manifestPath = this.getManifestPath(dataPath);
    const hasManifest = existsSync(manifestPath);
    const pendingRequestCount = this.listEnrollmentRequests(dataPath).length;

    if (!hasManifest) {
      return {
        enabled: true,
        authorized: true,
        hasManifest: false,
        pendingRequestCount,
        currentUser: `${identity.userName}@${identity.machineName}`,
        keyFingerprint: identity.keyFingerprint,
        message: "Ordner wird beim ersten Zugriff verschlüsselt initialisiert.",
      };
    }

    const manifest = this.readManifest(dataPath);
    const authorized = manifest.wrappedDekEntries.some(
      (entry) => entry.keyFingerprint === identity.keyFingerprint,
    );

    return {
      enabled: true,
      authorized,
      hasManifest,
      pendingRequestCount,
      currentUser: `${identity.userName}@${identity.machineName}`,
      keyFingerprint: identity.keyFingerprint,
      message: authorized
        ? "Verschlüsselung ist aktiv und dieser Benutzer ist freigegeben."
        : "Freigabe ausstehend. Es wurde eine Zugriffsanfrage für diesen Benutzer erstellt.",
    };
  }

  approvePendingEnrollments(dataPath: string): {
    approvedCount: number;
    pendingCount: number;
  } {
    const { dek, manifest } = this.getDekForCurrentUser(dataPath);
    const requests = this.listEnrollmentRequests(dataPath);

    let approvedCount = 0;
    for (const request of requests) {
      const alreadyExists = manifest.wrappedDekEntries.some(
        (entry) => entry.keyFingerprint === request.keyFingerprint,
      );
      if (alreadyExists) {
        const requestPath = this.getRequestFilePath(
          dataPath,
          request.keyFingerprint,
        );
        if (existsSync(requestPath)) {
          unlinkSync(requestPath);
        }
        continue;
      }

      manifest.wrappedDekEntries.push({
        keyFingerprint: request.keyFingerprint,
        wrappedDekB64: this.wrapDekForUser(request.publicKeyPem, dek),
        userName: request.userName,
        machineName: request.machineName,
        addedAt: new Date().toISOString(),
      });

      const requestPath = this.getRequestFilePath(
        dataPath,
        request.keyFingerprint,
      );
      if (existsSync(requestPath)) {
        unlinkSync(requestPath);
      }

      approvedCount += 1;
    }

    this.writeManifest(dataPath, manifest);

    return {
      approvedCount,
      pendingCount: this.listEnrollmentRequests(dataPath).length,
    };
  }

  encryptBytesForDataFolder(dataPath: string, plain: Buffer): Buffer {
    const { dek } = this.getDekForCurrentUser(dataPath);
    const iv = randomBytes(IV_SIZE);
    const cipher = createCipheriv("aes-256-gcm", dek, iv);
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([MAGIC, iv, tag, ciphertext]);
  }

  decryptBytesForDataFolder(dataPath: string, payload: Buffer): Buffer {
    if (
      payload.length < MAGIC.length ||
      !payload.subarray(0, MAGIC.length).equals(MAGIC)
    ) {
      throw new Error("NOT_ENCRYPTED");
    }

    if (payload.length < MAGIC.length + IV_SIZE + TAG_SIZE) {
      throw new Error("Encrypted payload is invalid.");
    }

    const { dek } = this.getDekForCurrentUser(dataPath);
    const ivStart = MAGIC.length;
    const tagStart = ivStart + IV_SIZE;
    const dataStart = tagStart + TAG_SIZE;

    const iv = payload.subarray(ivStart, tagStart);
    const tag = payload.subarray(tagStart, dataStart);
    const ciphertext = payload.subarray(dataStart);

    const decipher = createDecipheriv("aes-256-gcm", dek, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}
