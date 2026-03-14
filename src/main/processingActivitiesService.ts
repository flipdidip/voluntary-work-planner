import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  ProcessingActivitiesDocument,
  ProcessingActivityRecord,
  createDefaultProcessingActivitiesDocument,
} from "@shared/types";
import { DataCryptoService } from "./dataCryptoService";

const PROCESSING_ACTIVITIES_FILE = "processing-activities.json";

export class ProcessingActivitiesService {
  private readonly filePath: string;

  constructor(
    private dataPath: string,
    private cryptoService: DataCryptoService,
  ) {
    this.filePath = join(dataPath, PROCESSING_ACTIVITIES_FILE);
  }

  private readJsonFile<T>(filePath: string): T {
    const payload = readFileSync(filePath);
    try {
      const decrypted = this.cryptoService.decryptBytesForDataFolder(
        this.dataPath,
        payload,
      );
      return JSON.parse(decrypted.toString("utf-8")) as T;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "NOT_ENCRYPTED") {
        throw error;
      }

      const parsed = JSON.parse(payload.toString("utf-8")) as T;
      this.writeJsonFile(filePath, parsed);
      return parsed;
    }
  }

  private writeJsonFile(filePath: string, data: unknown): void {
    const plain = Buffer.from(JSON.stringify(data, null, 2), "utf-8");
    const encrypted = this.cryptoService.encryptBytesForDataFolder(
      this.dataPath,
      plain,
    );
    writeFileSync(filePath, encrypted);
  }

  private normalizeRecord(
    record: ProcessingActivityRecord,
  ): ProcessingActivityRecord {
    return {
      ...record,
      categoriesOfSubjects: [...record.categoriesOfSubjects],
      categoriesOfData: [...record.categoriesOfData],
      legalBases: [...record.legalBases],
      recipients: [...record.recipients],
      processors: [...record.processors],
      technicalMeasures: [...record.technicalMeasures],
      organizationalMeasures: [...record.organizationalMeasures],
      systems: [...record.systems],
      lastReviewedAt: record.lastReviewedAt || undefined,
    };
  }

  readDocument(): ProcessingActivitiesDocument {
    if (!existsSync(this.filePath)) {
      const created = createDefaultProcessingActivitiesDocument();
      this.writeJsonFile(this.filePath, created);
      return created;
    }

    try {
      const parsed = this.readJsonFile<ProcessingActivitiesDocument>(
        this.filePath,
      );
      if (!parsed.activities || parsed.activities.length === 0) {
        const created = createDefaultProcessingActivitiesDocument();
        this.writeJsonFile(this.filePath, created);
        return created;
      }
      return {
        _version: parsed._version || 1,
        _updatedAt: parsed._updatedAt || new Date().toISOString(),
        activities: parsed.activities.map((activity) =>
          this.normalizeRecord(activity),
        ),
      };
    } catch {
      return createDefaultProcessingActivitiesDocument();
    }
  }

  writeDocument(
    document: ProcessingActivitiesDocument,
  ): ProcessingActivitiesDocument {
    const normalized: ProcessingActivitiesDocument = {
      _version: (document._version || 0) + 1,
      _updatedAt: new Date().toISOString(),
      activities: document.activities.map((activity) =>
        this.normalizeRecord(activity),
      ),
    };
    this.writeJsonFile(this.filePath, normalized);
    return normalized;
  }

  private renderList(items: string[]): string {
    if (items.length === 0) {
      return "- Keine Angabe";
    }

    return items.map((item) => `- ${item}`).join("\n");
  }

  private renderActivity(activity: ProcessingActivityRecord): string {
    return [
      `## ${activity.name}`,
      "",
      `- Verantwortlicher: ${activity.controllerName || "Noch nicht gepflegt"}`,
      `- Kontakt: ${activity.controllerContact || "Noch nicht gepflegt"}`,
      `- Datenschutzkontakt: ${activity.dataProtectionContact || "Noch nicht gepflegt"}`,
      `- Letzte Pruefung: ${activity.lastReviewedAt || "Noch nicht gepflegt"}`,
      "",
      "### Zwecke",
      "",
      activity.purposes || "Noch nicht gepflegt",
      "",
      "### Kategorien betroffener Personen",
      "",
      this.renderList(activity.categoriesOfSubjects),
      "",
      "### Kategorien personenbezogener Daten",
      "",
      this.renderList(activity.categoriesOfData),
      "",
      "### Rechtsgrundlagen",
      "",
      this.renderList(activity.legalBases),
      "",
      "### Empfaenger",
      "",
      this.renderList(activity.recipients),
      "",
      "### Auftragsverarbeiter",
      "",
      this.renderList(activity.processors),
      "",
      "### Drittlandtransfer",
      "",
      activity.thirdCountryTransfers || "Noch nicht gepflegt",
      "",
      "### Speicherfristen und Loeschkonzept",
      "",
      activity.retentionPolicy || "Noch nicht gepflegt",
      "",
      "### Technische Massnahmen",
      "",
      this.renderList(activity.technicalMeasures),
      "",
      "### Organisatorische Massnahmen",
      "",
      this.renderList(activity.organizationalMeasures),
      "",
      "### Systeme und Speicherorte",
      "",
      this.renderList(activity.systems),
      "",
      "### Notizen",
      "",
      activity.notes || "Keine",
      "",
    ].join("\n");
  }

  exportMarkdown(filePath: string): void {
    const document = this.readDocument();
    const content = [
      "# Verzeichnis von Verarbeitungstaetigkeiten",
      "",
      `Stand: ${new Date(document._updatedAt).toLocaleDateString("de-DE")}`,
      `Version: ${document._version}`,
      "",
      "Dieses Dokument wurde aus Voluntary Work Planner exportiert und muss vom Betreiber fachlich geprueft werden.",
      "",
      ...document.activities.map((activity) => this.renderActivity(activity)),
    ].join("\n");

    writeFileSync(filePath, content, "utf-8");
  }
}
