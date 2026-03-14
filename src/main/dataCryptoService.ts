import {
  appendFileSync,
  Dirent,
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
import {
  EncryptionAuditEntry,
  EncryptionStatus,
  EnrollmentRequestSummary,
} from "@shared/types";

const CRYPTO_FOLDER = ".vwp-crypto";
const MANIFEST_FILE = "manifest.json";
const AUDIT_LOG_FILE = "audit.jsonl";
const REQUESTS_FOLDER = "requests";
const USER_KEY_FILE = "user-keypair.json";
const DEV_ENV_FILE = ".env";
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
  publicKeyPem?: string;
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

  private getAuditLogPath(dataPath: string): string {
    return join(this.getCryptoFolderPath(dataPath), AUDIT_LOG_FILE);
  }

  private getLocalUserKeyPath(identitySuffix?: string): string {
    if (!identitySuffix) {
      return join(app.getPath("userData"), USER_KEY_FILE);
    }

    return join(app.getPath("userData"), `user-keypair.${identitySuffix}.json`);
  }

  private getRequestFilePath(dataPath: string, keyFingerprint: string): string {
    return join(this.getRequestsPath(dataPath), `${keyFingerprint}.json`);
  }

  private formatActor(identity: UserIdentity): string {
    return `${identity.userName}@${identity.machineName}`;
  }

  private sanitizeIdentityForFileName(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]+/g, "-");
  }

  private readDevOverrideEnv(): Record<string, string> {
    if (app.isPackaged) {
      return {};
    }

    const envPath = join(app.getAppPath(), DEV_ENV_FILE);
    if (!existsSync(envPath)) {
      return {};
    }

    const values: Record<string, string> = {};
    const lines = readFileSync(envPath, "utf-8").split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      values[key] = value;
    }

    return values;
  }

  private getEffectiveIdentityBase(): {
    userName: string;
    machineName: string;
    keyFileSuffix?: string;
  } {
    const user = userInfo();
    const envOverrides = this.readDevOverrideEnv();

    const overrideUserName =
      process.env.VWP_DEV_OVERRIDE_USER || envOverrides.VWP_DEV_OVERRIDE_USER;
    const overrideMachineName =
      process.env.VWP_DEV_OVERRIDE_MACHINE ||
      envOverrides.VWP_DEV_OVERRIDE_MACHINE;

    const userName = overrideUserName || user.username;
    const machineName =
      overrideMachineName || process.env.COMPUTERNAME || "unknown-machine";

    const isUsingOverride = Boolean(overrideUserName || overrideMachineName);
    return {
      userName,
      machineName,
      keyFileSuffix: isUsingOverride
        ? this.sanitizeIdentityForFileName(`${userName}@${machineName}`)
        : undefined,
    };
  }

  private ensureLocalUserIdentity(): UserIdentity {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "Windows key protection is not available on this system.",
      );
    }

    const { userName, machineName, keyFileSuffix } =
      this.getEffectiveIdentityBase();
    const keyPath = this.getLocalUserKeyPath(keyFileSuffix);

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

  private appendAuditEntry(
    dataPath: string,
    entry: EncryptionAuditEntry,
  ): void {
    this.ensureCryptoFolders(dataPath);
    appendFileSync(
      this.getAuditLogPath(dataPath),
      `${JSON.stringify(entry)}\n`,
      "utf-8",
    );
  }

  private encryptWithDek(dek: Buffer, plain: Buffer): Buffer {
    const iv = randomBytes(IV_SIZE);
    const cipher = createCipheriv("aes-256-gcm", dek, iv);
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([MAGIC, iv, tag, ciphertext]);
  }

  private decryptWithDek(dek: Buffer, payload: Buffer): Buffer {
    if (
      payload.length < MAGIC.length ||
      !payload.subarray(0, MAGIC.length).equals(MAGIC)
    ) {
      throw new Error("NOT_ENCRYPTED");
    }

    if (payload.length < MAGIC.length + IV_SIZE + TAG_SIZE) {
      throw new Error("Encrypted payload is invalid.");
    }

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

  private collectFilesRecursive(rootPath: string): string[] {
    if (!existsSync(rootPath)) return [];

    const entries = readdirSync(rootPath, { withFileTypes: true }) as Dirent[];
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = join(rootPath, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.collectFilesRecursive(fullPath));
        continue;
      }

      if (entry.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private listDatasetFiles(dataPath: string): string[] {
    const files: string[] = [];
    const indexPath = join(dataPath, "index.json");
    if (existsSync(indexPath)) {
      files.push(indexPath);
    }

    for (const folderName of ["volunteers", "backups", "attachments"]) {
      files.push(...this.collectFilesRecursive(join(dataPath, folderName)));
    }

    return files;
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
    this.appendAuditEntry(dataPath, {
      timestamp: new Date().toISOString(),
      actor: this.formatActor(identity),
      action: "access-requested",
      target: identity.keyFingerprint,
      details: "Pending access request created.",
    });
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
          publicKeyPem: identity.publicKeyPem,
        },
      ],
    };

    this.writeManifest(dataPath, manifest);
    this.appendAuditEntry(dataPath, {
      timestamp: new Date().toISOString(),
      actor: this.formatActor(identity),
      action: "manifest-created",
      target: identity.keyFingerprint,
      details: "Encrypted dataset initialized.",
    });
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

    if (!myWrappedDek.publicKeyPem) {
      myWrappedDek.publicKeyPem = identity.publicKeyPem;
      this.writeManifest(dataPath, manifest);
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

  getPendingEnrollmentRequests(dataPath: string): EnrollmentRequestSummary[] {
    if (!dataPath) return [];

    return this.listEnrollmentRequests(dataPath)
      .map((request) => ({
        keyFingerprint: request.keyFingerprint,
        userName: request.userName,
        machineName: request.machineName,
        requestedAt: request.requestedAt,
      }))
      .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt));
  }

  getAuditLog(dataPath: string, limit = 100): EncryptionAuditEntry[] {
    if (!dataPath) return [];

    const auditPath = this.getAuditLogPath(dataPath);
    if (!existsSync(auditPath)) return [];

    return readFileSync(auditPath, "utf-8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as EncryptionAuditEntry)
      .slice(-limit)
      .reverse();
  }

  approveEnrollment(
    dataPath: string,
    keyFingerprint: string,
  ): { approved: boolean; pendingCount: number } {
    const { dek, identity, manifest } = this.getDekForCurrentUser(dataPath);
    const request = this.listEnrollmentRequests(dataPath).find(
      (entry) => entry.keyFingerprint === keyFingerprint,
    );

    if (!request) {
      return {
        approved: false,
        pendingCount: this.listEnrollmentRequests(dataPath).length,
      };
    }

    const alreadyExists = manifest.wrappedDekEntries.some(
      (entry) => entry.keyFingerprint === request.keyFingerprint,
    );

    if (!alreadyExists) {
      manifest.wrappedDekEntries.push({
        keyFingerprint: request.keyFingerprint,
        wrappedDekB64: this.wrapDekForUser(request.publicKeyPem, dek),
        userName: request.userName,
        machineName: request.machineName,
        addedAt: new Date().toISOString(),
        publicKeyPem: request.publicKeyPem,
      });
      this.writeManifest(dataPath, manifest);
      this.appendAuditEntry(dataPath, {
        timestamp: new Date().toISOString(),
        actor: this.formatActor(identity),
        action: "access-approved",
        target: request.keyFingerprint,
        details: `${request.userName}@${request.machineName} approved.`,
      });
    }

    const requestPath = this.getRequestFilePath(
      dataPath,
      request.keyFingerprint,
    );
    if (existsSync(requestPath)) {
      unlinkSync(requestPath);
    }

    return {
      approved: !alreadyExists,
      pendingCount: this.listEnrollmentRequests(dataPath).length,
    };
  }

  approvePendingEnrollments(dataPath: string): {
    approvedCount: number;
    pendingCount: number;
  } {
    const requests = this.listEnrollmentRequests(dataPath);

    let approvedCount = 0;
    for (const request of requests) {
      const result = this.approveEnrollment(dataPath, request.keyFingerprint);
      if (result.approved) {
        approvedCount += 1;
      }
    }

    return {
      approvedCount,
      pendingCount: this.listEnrollmentRequests(dataPath).length,
    };
  }

  rejectEnrollment(
    dataPath: string,
    keyFingerprint: string,
  ): { rejected: boolean; pendingCount: number } {
    const { identity } = this.getDekForCurrentUser(dataPath);
    const request = this.listEnrollmentRequests(dataPath).find(
      (entry) => entry.keyFingerprint === keyFingerprint,
    );

    if (!request) {
      return {
        rejected: false,
        pendingCount: this.listEnrollmentRequests(dataPath).length,
      };
    }

    const requestPath = this.getRequestFilePath(
      dataPath,
      request.keyFingerprint,
    );
    if (existsSync(requestPath)) {
      unlinkSync(requestPath);
    }

    this.appendAuditEntry(dataPath, {
      timestamp: new Date().toISOString(),
      actor: this.formatActor(identity),
      action: "access-rejected",
      target: request.keyFingerprint,
      details: `${request.userName}@${request.machineName} rejected.`,
    });

    return {
      rejected: true,
      pendingCount: this.listEnrollmentRequests(dataPath).length,
    };
  }

  rotateEncryptionKey(dataPath: string): { rotatedFileCount: number } {
    const {
      dek: currentDek,
      identity,
      manifest,
    } = this.getDekForCurrentUser(dataPath);

    const entriesMissingPublicKeys = manifest.wrappedDekEntries.filter(
      (entry) => !entry.publicKeyPem,
    );
    if (entriesMissingPublicKeys.length > 0) {
      const missingUsers = entriesMissingPublicKeys
        .map((entry) => {
          const userLabel =
            entry.userName && entry.machineName
              ? `${entry.userName}@${entry.machineName}`
              : entry.keyFingerprint;
          return `${userLabel} (${entry.keyFingerprint.slice(0, 12)}...)`;
        })
        .join(", ");

      throw new Error(
        `Schlüsselrotation ist noch nicht möglich. Diese freigegebenen Benutzer müssen den Datenordner einmal mit der aktuellen App-Version öffnen, damit ihr öffentlicher Schlüssel im Manifest ergänzt wird: ${missingUsers}`,
      );
    }

    const newDek = randomBytes(32);
    const datasetFiles = this.listDatasetFiles(dataPath);

    for (const filePath of datasetFiles) {
      const payload = readFileSync(filePath);
      let plain: Buffer;
      try {
        plain = this.decryptWithDek(currentDek, payload);
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "NOT_ENCRYPTED") {
          throw error;
        }
        plain = payload;
      }

      writeFileSync(filePath, this.encryptWithDek(newDek, plain));
    }

    manifest.wrappedDekEntries = manifest.wrappedDekEntries.map((entry) => ({
      ...entry,
      wrappedDekB64: this.wrapDekForUser(entry.publicKeyPem!, newDek),
    }));
    this.writeManifest(dataPath, manifest);

    this.appendAuditEntry(dataPath, {
      timestamp: new Date().toISOString(),
      actor: this.formatActor(identity),
      action: "key-rotated",
      details: `${datasetFiles.length} Datei(en) mit neuem DEK verschlüsselt.`,
    });

    return { rotatedFileCount: datasetFiles.length };
  }

  encryptBytesForDataFolder(dataPath: string, plain: Buffer): Buffer {
    const { dek } = this.getDekForCurrentUser(dataPath);
    return this.encryptWithDek(dek, plain);
  }

  decryptBytesForDataFolder(dataPath: string, payload: Buffer): Buffer {
    const { dek } = this.getDekForCurrentUser(dataPath);
    return this.decryptWithDek(dek, payload);
  }
}
