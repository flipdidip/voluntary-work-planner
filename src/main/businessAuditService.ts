import { dirname, join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { BusinessAuditEntry } from "@shared/types";
import { DataCryptoService } from "./dataCryptoService";

const BUSINESS_AUDIT_FILE = join(".vwp-crypto", "business-audit.json");
const MAX_STORED_ENTRIES = 5000;

export class BusinessAuditService {
  private readonly filePath: string;

  constructor(
    private dataPath: string,
    private cryptoService: DataCryptoService,
  ) {
    this.filePath = join(dataPath, BUSINESS_AUDIT_FILE);
  }

  private ensureParentFolder(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
  }

  private readEntries(): BusinessAuditEntry[] {
    if (!existsSync(this.filePath)) return [];

    const payload = readFileSync(this.filePath);
    try {
      const decrypted = this.cryptoService.decryptBytesForDataFolder(
        this.dataPath,
        payload,
      );
      return JSON.parse(decrypted.toString("utf-8")) as BusinessAuditEntry[];
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "NOT_ENCRYPTED") {
        throw error;
      }

      const parsed = JSON.parse(
        payload.toString("utf-8"),
      ) as BusinessAuditEntry[];
      this.writeEntries(parsed);
      return parsed;
    }
  }

  private writeEntries(entries: BusinessAuditEntry[]): void {
    this.ensureParentFolder();
    const plain = Buffer.from(JSON.stringify(entries, null, 2), "utf-8");
    const encrypted = this.cryptoService.encryptBytesForDataFolder(
      this.dataPath,
      plain,
    );
    writeFileSync(this.filePath, encrypted);
  }

  private getActorLabel(): string {
    const status = this.cryptoService.getStatus(this.dataPath);
    if (!status.currentUser) return "unbekannt";
    return `${status.currentUser} (${status.keyFingerprint.slice(0, 12)}...)`;
  }

  append(
    entry: Omit<BusinessAuditEntry, "timestamp" | "actor">,
  ): BusinessAuditEntry {
    const nextEntry: BusinessAuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      actor: this.getActorLabel(),
    };

    const entries = this.readEntries();
    entries.push(nextEntry);

    if (entries.length > MAX_STORED_ENTRIES) {
      entries.splice(0, entries.length - MAX_STORED_ENTRIES);
    }

    this.writeEntries(entries);
    return nextEntry;
  }

  getEntries(limit = 200): BusinessAuditEntry[] {
    return this.readEntries().slice(-limit).reverse();
  }

  exportMarkdown(filePath: string, limit = 1000): void {
    const entries = this.getEntries(limit);
    const content = [
      "# Aktivitaetsprotokoll",
      "",
      `Stand: ${new Date().toLocaleDateString("de-DE")}`,
      `Eintraege: ${entries.length}`,
      "",
      "Dieses Protokoll wurde aus Voluntary Work Planner exportiert.",
      "",
      ...entries.map(
        (entry) =>
          `- ${new Date(entry.timestamp).toLocaleString("de-DE")} | ${entry.action} | ${entry.subjectType}${entry.subjectId ? `:${entry.subjectId}` : ""} | ${entry.actor}${entry.details ? ` | ${entry.details}` : ""}`,
      ),
      "",
    ].join("\n");

    writeFileSync(filePath, content, "utf-8");
  }
}
