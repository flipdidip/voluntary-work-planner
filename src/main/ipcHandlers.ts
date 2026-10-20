import { BrowserWindow, clipboard, IpcMain, dialog } from "electron";
import { v4 as uuidv4 } from "uuid";
import {
  IPC,
  Volunteer,
  FileRecord,
  SaveResult,
  ProcessingActivitiesDocument,
  BusinessAuditEntry,
  UserRole,
  GroupMeeting,
  GroupMeetingAttachment,
  VolunteerContact,
  RequirementRecord,
  RecordAuditMetadata,
  PublicRelationsConsentOverview,
  InternReadOnlyOverview,
  HauptamtlicheIndex,
  REQUIREMENT_DEFINITIONS,
  calculateRequirementsStatus,
  createDefaultProcessingActivitiesDocument,
} from "@shared/types";
import { SettingsService } from "./settingsService";
import { VolunteerFileService } from "./volunteerFileService";
import { DueReminder, getUpcomingReminders } from "./reminderScheduler";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { DataCryptoService } from "./dataCryptoService";
import { ProcessingActivitiesService } from "./processingActivitiesService";
import { BusinessAuditService } from "./businessAuditService";
import { GroupMeetingService } from "./groupMeetingService";
import { HauptamtlicheService } from "./hauptamtlicheService";

const RECORD_AUDIT_FIELDS = new Set([
  "_createdBy",
  "_createdAt",
  "_updatedBy",
  "_updatedAt",
]);

function hasRecordContentChanged<T extends RecordAuditMetadata>(
  incoming: T,
  existing: T,
): boolean {
  const getContent = (record: T): string =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(record)
          .filter(([key]) => !RECORD_AUDIT_FIELDS.has(key))
          .sort(([left], [right]) => left.localeCompare(right)),
      ),
    );

  return getContent(incoming) !== getContent(existing);
}

function applyRecordAuditMetadata<T extends RecordAuditMetadata>(
  incomingRecords: T[],
  existingRecords: T[] | undefined,
  getKey: (record: T) => string,
  actor: string,
  timestamp: string,
): T[] {
  const existingByKey = new Map(
    (existingRecords || []).map((record) => [getKey(record), record]),
  );

  return incomingRecords.map((record) => {
    const existing = existingByKey.get(getKey(record));
    if (!existing) {
      return {
        ...record,
        _createdBy: actor || undefined,
        _createdAt: timestamp,
        _updatedBy: undefined,
        _updatedAt: undefined,
      };
    }

    const auditedRecord = {
      ...record,
      _createdBy: existing._createdBy,
      _createdAt: existing._createdAt,
      _updatedBy: existing._updatedBy,
      _updatedAt: existing._updatedAt,
    };

    if (hasRecordContentChanged(record, existing)) {
      auditedRecord._updatedBy = actor || undefined;
      auditedRecord._updatedAt = timestamp;
    }

    return auditedRecord;
  });
}

function getValidatedDataFolder(settings: SettingsService) {
  const dataPath = settings.getDataFolderPath();
  if (!dataPath) return null;

  const cryptoService = DataCryptoService.getInstance();
  const cryptoStatus = cryptoService.getStatus(dataPath);

  if (!cryptoStatus.hasManifest) {
    throw new Error(
      "Der ausgewaehlte Datenordner ist noch nicht initialisiert oder noch nicht vollstaendig synchronisiert. Bitte pruefen Sie die Verbindung in den Einstellungen oder initialisieren Sie nur einen neuen, leeren Ordner.",
    );
  }

  if (!cryptoStatus.authorized) {
    throw new Error(
      cryptoStatus.message ||
        "Dieser Benutzer hat noch keinen Zugriff auf den verschluesselten Datenordner.",
    );
  }

  return { dataPath, cryptoService };
}

function writeEncryptedJsonIfMissing(
  filePath: string,
  dataPath: string,
  cryptoService: DataCryptoService,
  value: unknown,
): void {
  if (existsSync(filePath)) {
    return;
  }

  const plain = Buffer.from(JSON.stringify(value, null, 2), "utf-8");
  const encrypted = cryptoService.encryptBytesForDataFolder(dataPath, plain);
  writeFileSync(filePath, encrypted);
}

function initializeFolderStructure(settings: SettingsService) {
  const dataPath = settings.getDataFolderPath();
  if (!dataPath) {
    return {
      success: false,
      error: "Kein Datenordner konfiguriert.",
    };
  }

  const cryptoService = DataCryptoService.getInstance();
  const currentStatus = cryptoService.getStatus(dataPath);

  if (currentStatus.hasManifest && !currentStatus.authorized) {
    return {
      success: false,
      error:
        currentStatus.message ||
        "Dieser Benutzer hat noch keinen Zugriff auf den verschluesselten Datenordner.",
    };
  }

  const encryptionStatus = cryptoService.initializeDataFolder(dataPath);
  const now = new Date().toISOString();

  mkdirSync(settings.getVolunteersPath(), { recursive: true });
  mkdirSync(settings.getBackupsPath(), { recursive: true });
  mkdirSync(settings.getAttachmentsPath(), { recursive: true });
  mkdirSync(settings.getPartnersPath(), { recursive: true });
  mkdirSync(settings.getPartnerBackupsPath(), { recursive: true });
  mkdirSync(settings.getPartnerAttachmentsPath(), { recursive: true });

  writeEncryptedJsonIfMissing(
    settings.getIndexPath(),
    dataPath,
    cryptoService,
    {
      _version: 0,
      _updatedAt: now,
      volunteers: [],
    },
  );

  writeEncryptedJsonIfMissing(
    settings.getPartnerIndexPath(),
    dataPath,
    cryptoService,
    {
      _version: 0,
      _updatedAt: now,
      volunteers: [],
    },
  );

  writeEncryptedJsonIfMissing(
    settings.getMeetingsPath(),
    dataPath,
    cryptoService,
    {
      _version: 1,
      _updatedAt: now,
      meetings: [],
    },
  );

  writeEncryptedJsonIfMissing(
    settings.getHauptamtlichePath(),
    dataPath,
    cryptoService,
    {
      _version: 1,
      _updatedAt: now,
      people: [],
    },
  );

  writeEncryptedJsonIfMissing(
    join(dataPath, "processing-activities.json"),
    dataPath,
    cryptoService,
    createDefaultProcessingActivitiesDocument(),
  );

  return { success: true, encryptionStatus };
}

function getFileService(
  settings: SettingsService,
): VolunteerFileService | null {
  const access = getValidatedDataFolder(settings);
  if (!access) return null;

  const { dataPath, cryptoService } = access;

  mkdirSync(settings.getVolunteersPath(), { recursive: true });
  mkdirSync(settings.getBackupsPath(), { recursive: true });
  mkdirSync(settings.getAttachmentsPath(), { recursive: true });

  return new VolunteerFileService(
    dataPath,
    settings.getVolunteersPath(),
    settings.getIndexPath(),
    settings.getBackupsPath(),
    settings.getAttachmentsPath(),
    cryptoService,
  );
}

function getPartnerFileService(
  settings: SettingsService,
): VolunteerFileService | null {
  const access = getValidatedDataFolder(settings);
  if (!access) return null;

  const { dataPath, cryptoService } = access;

  mkdirSync(settings.getPartnersPath(), { recursive: true });
  mkdirSync(settings.getPartnerBackupsPath(), { recursive: true });
  mkdirSync(settings.getPartnerAttachmentsPath(), { recursive: true });

  return new VolunteerFileService(
    dataPath,
    settings.getPartnersPath(),
    settings.getPartnerIndexPath(),
    settings.getPartnerBackupsPath(),
    settings.getPartnerAttachmentsPath(),
    cryptoService,
  );
}

function getProcessingActivitiesService(
  settings: SettingsService,
): ProcessingActivitiesService | null {
  const access = getValidatedDataFolder(settings);
  if (!access) return null;

  return new ProcessingActivitiesService(access.dataPath, access.cryptoService);
}

function getBusinessAuditService(
  settings: SettingsService,
): BusinessAuditService | null {
  const access = getValidatedDataFolder(settings);
  if (!access) return null;

  return new BusinessAuditService(access.dataPath, access.cryptoService);
}

function getGroupMeetingService(
  settings: SettingsService,
): GroupMeetingService | null {
  const access = getValidatedDataFolder(settings);
  if (!access) return null;

  return new GroupMeetingService(
    access.dataPath,
    settings.getMeetingsPath(),
    settings.getGroupMeetingAttachmentsPath(),
    access.cryptoService,
  );
}

function getHauptamtlicheService(
  settings: SettingsService,
): HauptamtlicheService | null {
  const access = getValidatedDataFolder(settings);
  if (!access) return null;

  return new HauptamtlicheService(
    access.dataPath,
    settings.getHauptamtlichePath(),
    access.cryptoService,
  );
}

function appendBusinessAudit(
  settings: SettingsService,
  entry: Omit<BusinessAuditEntry, "timestamp" | "actor">,
): void {
  try {
    const service = getBusinessAuditService(settings);
    if (!service) return;
    service.append(entry);
  } catch {
    // Audit logging is best-effort and must not block the main operation.
  }
}

export function registerVolunteerHandlers(
  ipcMain: IpcMain,
  settings: SettingsService,
  onRemindersTriggered?: (reminders: DueReminder[]) => void,
): void {
  const isInternReadOnlyUser = (): boolean => {
    const dataPath = settings.getDataFolderPath();
    return Boolean(
      dataPath &&
        DataCryptoService.getInstance().getStatus(dataPath).userRole ===
          "intern-read-only",
    );
  };
  const assertNotInternReadOnlyUser = (): void => {
    if (isInternReadOnlyUser()) {
      throw new Error("Interne Mitarbeitende haben ausschließlich Lesezugriff.");
    }
  };
  const isPrimaryUser = (): boolean => {
    const dataPath = settings.getDataFolderPath();
    return Boolean(
      dataPath &&
        DataCryptoService.getInstance().getStatus(dataPath).userRole ===
          "primary",
    );
  };

  // Settings
  ipcMain.handle(IPC.GET_DATA_PATH, () => settings.getDataFolderPath());

  ipcMain.handle(IPC.GET_SETTINGS, () => settings.get());

  ipcMain.handle(
    IPC.SAVE_SETTINGS,
    (_event, partial: Partial<import("@shared/types").AppSettings>) => {
      if (
        isInternReadOnlyUser() &&
        Object.keys(partial).some(
          (key) =>
            ![
              "privacyConsentGiven",
              "privacyConsentDate",
              "privacyConsentVersion",
              "themeMode",
            ].some((allowedKey) => allowedKey === key),
        )
      ) {
        assertNotInternReadOnlyUser();
      }
      settings.set(partial);
      appendBusinessAudit(settings, {
        action: "settings-saved",
        subjectType: "settings",
        details: `Felder aktualisiert: ${Object.keys(partial).join(", ") || "(keine)"}`,
      });
      return { success: true };
    },
  );

  ipcMain.handle(
    IPC.COPY_WINDOW_RECT_TO_CLIPBOARD,
    async (event, rect: { x: number; y: number; width: number; height: number }) => {
      const values = [rect?.x, rect?.y, rect?.width, rect?.height];
      if (
        values.some((value) => !Number.isFinite(value)) ||
        rect.x < 0 ||
        rect.y < 0 ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.width > 5000 ||
        rect.height > 5000
      ) {
        throw new Error("Ungültiger Bildausschnitt.");
      }

      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window || window.isDestroyed()) {
        throw new Error("Das App-Fenster ist nicht verfügbar.");
      }

      const image = await window.webContents.capturePage(rect);
      if (image.isEmpty()) {
        throw new Error("Der Bildausschnitt konnte nicht erstellt werden.");
      }
      clipboard.writeImage(image);
    },
  );

  ipcMain.handle(IPC.SET_DATA_PATH, (_event, folderPath: string) => {
    assertNotInternReadOnlyUser();
    settings.set({ dataFolderPath: folderPath });
    return {
      success: true,
      encryptionStatus: DataCryptoService.getInstance().getStatus(folderPath),
    };
  });

  ipcMain.handle(IPC.SELECT_DATA_FOLDER, async (event) => {
    const win = require("electron").BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      title: "Datenordner auswählen (OneDrive / SharePoint Sync)",
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const folderPath = result.filePaths[0];
    settings.set({ dataFolderPath: folderPath });
    return folderPath;
  });

  ipcMain.handle(IPC.INITIALIZE_DATA_FOLDER, () => {
    assertNotInternReadOnlyUser();
    return initializeFolderStructure(settings);
  });

  ipcMain.handle(IPC.GET_ENCRYPTION_STATUS, () => {
    return DataCryptoService.getInstance().getStatus(
      settings.getDataFolderPath(),
    );
  });

  ipcMain.handle(IPC.GET_PENDING_ENROLLMENTS, () => {
    return DataCryptoService.getInstance().getPendingEnrollmentRequests(
      settings.getDataFolderPath(),
    );
  });

  ipcMain.handle(IPC.GET_ENCRYPTION_AUDIT_LOG, () => {
    return DataCryptoService.getInstance().getAuditLog(
      settings.getDataFolderPath(),
      100,
    );
  });

  ipcMain.handle(IPC.GET_BUSINESS_AUDIT_LOG, () => {
    try {
      const service = getBusinessAuditService(settings);
      if (!service) return [];
      return service.getEntries(300);
    } catch {
      return [];
    }
  });

  ipcMain.handle(IPC.GET_PROCESSING_ACTIVITIES, () => {
    try {
      const service = getProcessingActivitiesService(settings);
      if (!service) {
        return null;
      }
      return service.readDocument();
    } catch {
      return null;
    }
  });

  ipcMain.handle(IPC.APPROVE_PENDING_ENROLLMENTS, () => {
    const dataPath = settings.getDataFolderPath();
    if (!dataPath) {
      return {
        success: false,
        approvedCount: 0,
        pendingCount: 0,
        error: "No data folder configured",
      };
    }

    try {
      const result =
        DataCryptoService.getInstance().approvePendingEnrollments(dataPath);
      return {
        success: true,
        approvedCount: result.approvedCount,
        pendingCount: result.pendingCount,
      };
    } catch (error) {
      return {
        success: false,
        approvedCount: 0,
        pendingCount: 0,
        error: String(error),
      };
    }
  });

  ipcMain.handle(
    IPC.APPROVE_ENROLLMENT,
    (_event, keyFingerprint: string, role?: UserRole) => {
      const dataPath = settings.getDataFolderPath();
      if (!dataPath) {
        return {
          success: false,
          pendingCount: 0,
          error: "No data folder configured",
        };
      }

      try {
        const result = DataCryptoService.getInstance().approveEnrollment(
          dataPath,
          keyFingerprint,
          role || "primary",
        );
        return {
          success: true,
          approved: result.approved,
          pendingCount: result.pendingCount,
        };
      } catch (error) {
        return {
          success: false,
          pendingCount: 0,
          error: String(error),
        };
      }
    },
  );

  ipcMain.handle(IPC.REJECT_ENROLLMENT, (_event, keyFingerprint: string) => {
    const dataPath = settings.getDataFolderPath();
    if (!dataPath) {
      return {
        success: false,
        pendingCount: 0,
        error: "No data folder configured",
      };
    }

    try {
      const result = DataCryptoService.getInstance().rejectEnrollment(
        dataPath,
        keyFingerprint,
      );
      return {
        success: true,
        rejected: result.rejected,
        pendingCount: result.pendingCount,
      };
    } catch (error) {
      return {
        success: false,
        pendingCount: 0,
        error: String(error),
      };
    }
  });

  ipcMain.handle(IPC.GET_AUTHORIZED_USERS, () => {
    const dataPath = settings.getDataFolderPath();
    if (!dataPath) {
      return [];
    }

    try {
      return DataCryptoService.getInstance().getAuthorizedUsers(dataPath);
    } catch {
      return [];
    }
  });

  ipcMain.handle(
    IPC.UPDATE_AUTHORIZED_USER_ROLE,
    (_event, keyFingerprint: string, role: UserRole) => {
      const dataPath = settings.getDataFolderPath();
      if (!dataPath) {
        return {
          success: false,
          error: "No data folder configured",
        };
      }

      try {
        const result = DataCryptoService.getInstance().updateAuthorizedUserRole(
          dataPath,
          keyFingerprint,
          role,
        );
        return {
          success: true,
          updated: result.updated,
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    },
  );

  ipcMain.handle(IPC.ROTATE_ENCRYPTION_KEY, () => {
    const dataPath = settings.getDataFolderPath();
    if (!dataPath) {
      return {
        success: false,
        rotatedFileCount: 0,
        error: "No data folder configured",
      };
    }

    try {
      const result =
        DataCryptoService.getInstance().rotateEncryptionKey(dataPath);
      return {
        success: true,
        rotatedFileCount: result.rotatedFileCount,
      };
    } catch (error) {
      return {
        success: false,
        rotatedFileCount: 0,
        error: String(error),
      };
    }
  });

  ipcMain.handle(
    IPC.SAVE_PROCESSING_ACTIVITIES,
    (_event, document: ProcessingActivitiesDocument) => {
      assertNotInternReadOnlyUser();
      try {
        const service = getProcessingActivitiesService(settings);
        if (!service) {
          return { success: false, error: "Kein Datenordner konfiguriert." };
        }

        return {
          success: true,
          document: (() => {
            const written = service.writeDocument(document);
            appendBusinessAudit(settings, {
              action: "processing-activities-saved",
              subjectType: "processing-activities",
              details: `${written.activities.length} Taetigkeit(en) gespeichert`,
            });
            return written;
          })(),
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle(IPC.EXPORT_PROCESSING_ACTIVITIES_MARKDOWN, async (event) => {
    assertNotInternReadOnlyUser();
    try {
      const service = getProcessingActivitiesService(settings);
      if (!service) {
        return { success: false, error: "Kein Datenordner konfiguriert." };
      }

      const { BrowserWindow } =
        require("electron") as typeof import("electron");
      const win = BrowserWindow.fromWebContents(event.sender);
      const defaultName = `verzeichnis-verarbeitungstaetigkeiten-${new Date()
        .toISOString()
        .slice(0, 10)}.md`;
      const result = await dialog.showSaveDialog(win!, {
        title: "Verzeichnis von Verarbeitungstaetigkeiten exportieren",
        defaultPath: defaultName,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: true, canceled: true };
      }

      service.exportMarkdown(result.filePath);
      appendBusinessAudit(settings, {
        action: "processing-activities-exported",
        subjectType: "processing-activities",
        details: `Exportiert nach ${result.filePath}`,
      });
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(IPC.EXPORT_BUSINESS_AUDIT_MARKDOWN, async (event) => {
    assertNotInternReadOnlyUser();
    try {
      const service = getBusinessAuditService(settings);
      if (!service) {
        return { success: false, error: "Kein Datenordner konfiguriert." };
      }

      const { BrowserWindow } =
        require("electron") as typeof import("electron");
      const win = BrowserWindow.fromWebContents(event.sender);
      const defaultName = `aktivitaetsprotokoll-${new Date()
        .toISOString()
        .slice(0, 10)}.md`;
      const result = await dialog.showSaveDialog(win!, {
        title: "Aktivitaetsprotokoll exportieren",
        defaultPath: defaultName,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: true, canceled: true };
      }

      service.exportMarkdown(result.filePath);
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Volunteer CRUD
  ipcMain.handle(
    IPC.GET_PUBLIC_RELATIONS_CONSENT_OVERVIEW,
    (): PublicRelationsConsentOverview => {
      const dataPath = settings.getDataFolderPath();
      if (!dataPath) {
        throw new Error("Kein Datenordner konfiguriert.");
      }

      const status = DataCryptoService.getInstance().getStatus(dataPath);
      if (!status.authorized || status.userRole !== "public-relations") {
        throw new Error(
          "Diese Übersicht ist nur für Öffentlichkeitsarbeit verfügbar.",
        );
      }

      const volunteerService = getFileService(settings);
      const partnerService = getPartnerFileService(settings);
      if (!volunteerService || !partnerService) {
        throw new Error("Kein Datenordner konfiguriert.");
      }

      const toConsentEntries = (
        entries: ReturnType<typeof volunteerService.readIndex>["volunteers"],
      ) =>
        entries.map(
          ({
            firstName,
            lastName,
            organization,
            phone,
            mobile,
            email,
            roles,
            mediaConsentLevel,
            requirementsStatus,
          }) => ({
            firstName,
            lastName,
            organization,
            phone,
            mobile,
            email,
            roles: roles ?? [],
            mediaConsentLevel: mediaConsentLevel ?? null,
            consentDocumentStatus:
              requirementsStatus?.bildundton ?? "missing",
          }),
        );

      return {
        volunteers: toConsentEntries(
          volunteerService
            .readIndex()
            .volunteers.filter(
              (entry) => entry.publicRelationsVisible === true,
            ),
        ),
        partners: toConsentEntries(
          partnerService
            .readIndex()
            .volunteers.filter(
              (entry) => entry.publicRelationsVisible === true,
            ),
        ),
      };
    },
  );

  ipcMain.handle(
    IPC.GET_INTERN_READ_ONLY_OVERVIEW,
    (): InternReadOnlyOverview => {
      const dataPath = settings.getDataFolderPath();
      if (!dataPath) {
        throw new Error("Kein Datenordner konfiguriert.");
      }

      const status = DataCryptoService.getInstance().getStatus(dataPath);
      if (!status.authorized || status.userRole !== "intern-read-only") {
        throw new Error(
          "Diese Übersicht ist nur für interne Mitarbeitende verfügbar.",
        );
      }

      const volunteerService = getFileService(settings);
      const partnerService = getPartnerFileService(settings);
      if (!volunteerService || !partnerService) {
        throw new Error("Kein Datenordner konfiguriert.");
      }

      const toInternEntries = (
        entries: Volunteer[],
      ): InternReadOnlyOverview["volunteers"] =>
        entries
          .filter((entry) => entry.internVisible === true)
          .map((entry) => {
            const requirementsStatus = calculateRequirementsStatus(entry);
            return {
              id: entry.id,
              firstName: entry.firstName,
              lastName: entry.lastName,
              organization: entry.organization,
              phone: entry.phone,
              mobile: entry.mobile,
              email: entry.email,
              qualifications: (
                Object.keys(REQUIREMENT_DEFINITIONS) as Array<
                  keyof typeof REQUIREMENT_DEFINITIONS
                >
              ).map((requirementType) => ({
                requirementType,
                status: requirementsStatus[requirementType],
              })),
            };
          });

      return {
        volunteers: toInternEntries(volunteerService.readAllVolunteers()),
        partners: toInternEntries(partnerService.readAllVolunteers()),
      };
    },
  );

  ipcMain.handle(
    IPC.ADD_INTERN_FILE_RECORD,
    (
      _event,
      entityType: "volunteer" | "partner",
      entityId: string,
      title: string,
      description: string,
      sourcePath?: string,
    ): { success: boolean; error?: string } => {
      const dataPath = settings.getDataFolderPath();
      if (!dataPath) {
        return { success: false, error: "Kein Datenordner konfiguriert." };
      }

      const status = DataCryptoService.getInstance().getStatus(dataPath);
      if (!status.authorized || status.userRole !== "intern-read-only") {
        return {
          success: false,
          error: "Nur interne Mitarbeitende dürfen Akte-Einträge hinzufügen.",
        };
      }

      if (
        !["volunteer", "partner"].includes(entityType) ||
        typeof entityId !== "string" ||
        !entityId.trim() ||
        typeof title !== "string" ||
        !title.trim() ||
        typeof description !== "string"
      ) {
        return { success: false, error: "Ungültige Angaben für den Akte-Eintrag." };
      }

      const service =
        entityType === "volunteer"
          ? getFileService(settings)
          : getPartnerFileService(settings);
      if (!service) {
        return { success: false, error: "Kein Datenordner konfiguriert." };
      }

      const sharedEntry = service
        .readIndex()
        .volunteers.find(
          (entry) => entry.id === entityId && entry.internVisible === true,
        );
      const record = sharedEntry
        ? service.readVolunteer(sharedEntry.id)
        : null;
      if (!record || record.internVisible !== true) {
        return {
          success: false,
          error: "Der freigegebene Datensatz wurde nicht gefunden.",
        };
      }

      let upload: ReturnType<typeof service.uploadFile> | undefined;
      if (sourcePath) {
        upload = service.uploadFile(entityId, sourcePath);
        if (!upload.success) {
          return {
            success: false,
            error: upload.error || "Die Datei konnte nicht hochgeladen werden.",
          };
        }
      }

      const createdAt = new Date().toISOString();
      const fileRecord: FileRecord = {
        id: uuidv4(),
        title: title.trim(),
        description: description.trim(),
        fileName: upload?.fileName,
        filePath: upload?.filePath,
        fileSize: upload?.fileSize,
        uploadedAt: createdAt,
        _createdBy: status.currentUser || undefined,
        _createdAt: createdAt,
      };
      record.fileRecords = [...(record.fileRecords || []), fileRecord];

      const saveResult = service.saveVolunteer(record);
      if (!saveResult.success) {
        if (upload?.filePath) service.deleteFile(upload.filePath);
        return { success: false, error: saveResult.message };
      }

      appendBusinessAudit(settings, {
        action: "file-record-added",
        subjectType: entityType,
        subjectId: entityId,
        details: `Akte-Eintrag hinzugefügt: ${fileRecord.title}`,
      });
      return { success: true };
    },
  );

  ipcMain.handle(IPC.GET_VOLUNTEER_INDEX, () => {
    try {
      const svc = getFileService(settings);
      if (!svc) return null;
      const dataPath = settings.getDataFolderPath();
      if (
        dataPath &&
        ["partner-only", "public-relations", "intern-read-only"].includes(
          DataCryptoService.getInstance().getStatus(dataPath).userRole || "",
        )
      ) {
        return {
          _version: 0,
          _updatedAt: new Date().toISOString(),
          volunteers: [],
        };
      }
      return svc.readIndex();
    } catch {
      return {
        _version: 0,
        _updatedAt: new Date().toISOString(),
        volunteers: [],
      };
    }
  });

  ipcMain.handle(
    IPC.GET_VOLUNTEER_CONTACTS,
    (): VolunteerContact[] => {
      const dataPath = settings.getDataFolderPath();
      if (!dataPath) {
        throw new Error("Kein Datenordner konfiguriert.");
      }

      const cryptoService = DataCryptoService.getInstance();
      const status = cryptoService.getStatus(dataPath);
      if (!status.authorized || status.userRole !== "partner-only") {
        throw new Error(
          "Diese Kontaktliste ist nur für Kooperationspartner verfügbar.",
        );
      }

      const svc = getFileService(settings);
      if (!svc) {
        throw new Error("Kein Datenordner konfiguriert.");
      }

      return svc.readIndex().volunteers.map((volunteer) => ({
        firstName: volunteer.firstName,
        lastName: volunteer.lastName,
        phone: volunteer.phone,
        mobile: volunteer.mobile,
        email: volunteer.email,
        roles: volunteer.roles ?? [],
      }));
    },
  );

  ipcMain.handle(IPC.GET_VOLUNTEER, (_event, id: string) => {
    try {
      const svc = getFileService(settings);
      if (!svc) return null;
      const dataPath = settings.getDataFolderPath();
      if (
        dataPath &&
        ["partner-only", "public-relations", "intern-read-only"].includes(
          DataCryptoService.getInstance().getStatus(dataPath).userRole || "",
        )
      ) {
        return null;
      }
      return svc.readVolunteer(id);
    } catch {
      return null;
    }
  });

  ipcMain.handle(
    IPC.SAVE_VOLUNTEER,
    (
      _event,
      volunteer: Volunteer,
      statusChangeReason?: string,
    ): SaveResult => {
      if (isInternReadOnlyUser()) {
        return {
          success: false,
          reason: "io-error",
          message: "Interne Mitarbeitende haben ausschließlich Lesezugriff.",
        };
      }
      let svc: VolunteerFileService | null = null;
      try {
        svc = getFileService(settings);
      } catch (error) {
        return {
          success: false,
          reason: "io-error",
          message: String(error),
        };
      }

      if (!svc) {
        return {
          success: false,
          reason: "io-error",
          message: "Kein Datenordner konfiguriert.",
        };
      }

      const existingBefore = volunteer.id
        ? svc.readVolunteer(volunteer.id)
        : null;
      const dataPath = settings.getDataFolderPath();
      const status = dataPath
        ? DataCryptoService.getInstance().getStatus(dataPath)
        : null;
      const timestamp = new Date().toISOString();
      const actor = status?.currentUser || "";
      volunteer.fileRecords = applyRecordAuditMetadata(
        volunteer.fileRecords || [],
        existingBefore?.fileRecords,
        (record: FileRecord) => record.id,
        actor,
        timestamp,
      );
      volunteer.requirements = applyRecordAuditMetadata(
        volunteer.requirements || [],
        existingBefore?.requirements,
        (record: RequirementRecord) => record.requirementType,
        actor,
        timestamp,
      );
      if (!status?.authorized || status.userRole !== "primary") {
        volunteer.publicRelationsVisible =
          existingBefore?.publicRelationsVisible === true;
        volunteer.internVisible = existingBefore?.internVisible === true;
      }

      if (!volunteer.id) {
        volunteer.id = uuidv4();
        volunteer._version = 0;
        volunteer._createdAt = new Date().toISOString();
        volunteer._updatedAt = new Date().toISOString();
      }

      const result = svc.saveVolunteer(volunteer, statusChangeReason, true);
      if (result.success) {
        appendBusinessAudit(settings, {
          action: existingBefore ? "volunteer-updated" : "volunteer-created",
          subjectType: "volunteer",
          subjectId: result.volunteer.id,
          details: `${result.volunteer.firstName} ${result.volunteer.lastName}`,
        });
      }

      return result;
    },
  );

  ipcMain.handle(IPC.DELETE_VOLUNTEER, (_event, id: string) => {
    assertNotInternReadOnlyUser();
    try {
      const svc = getFileService(settings);
      if (!svc) return;
      const existing = svc.readVolunteer(id);
      svc.deleteVolunteer(id);
      appendBusinessAudit(settings, {
        action: "volunteer-deleted",
        subjectType: "volunteer",
        subjectId: id,
        details: existing
          ? `${existing.firstName} ${existing.lastName}`
          : "Datensatz geloescht",
      });
    } catch {
      return;
    }
  });

  // Partner (Kooperationspartner) CRUD
  ipcMain.handle(IPC.GET_PARTNER_INDEX, () => {
    try {
      const svc = getPartnerFileService(settings);
      if (!svc) return null;
      const dataPath = settings.getDataFolderPath();
      if (
        dataPath &&
        ["public-relations", "intern-read-only"].includes(
          DataCryptoService.getInstance().getStatus(dataPath).userRole || "",
        )
      ) {
        return {
          _version: 0,
          _updatedAt: new Date().toISOString(),
          volunteers: [],
        };
      }
      return svc.readIndex();
    } catch {
      return {
        _version: 0,
        _updatedAt: new Date().toISOString(),
        volunteers: [],
      };
    }
  });

  ipcMain.handle(IPC.GET_PARTNER, (_event, id: string) => {
    try {
      const svc = getPartnerFileService(settings);
      if (!svc) return null;
      const dataPath = settings.getDataFolderPath();
      if (
        dataPath &&
        ["public-relations", "intern-read-only"].includes(
          DataCryptoService.getInstance().getStatus(dataPath).userRole || "",
        )
      ) {
        return null;
      }
      return svc.readVolunteer(id);
    } catch {
      return null;
    }
  });

  ipcMain.handle(IPC.SAVE_PARTNER, (_event, partner: Volunteer): SaveResult => {
    if (isInternReadOnlyUser()) {
      return {
        success: false,
        reason: "io-error",
        message: "Interne Mitarbeitende haben ausschließlich Lesezugriff.",
      };
    }
    let svc: VolunteerFileService | null = null;
    try {
      svc = getPartnerFileService(settings);
    } catch (error) {
      return {
        success: false,
        reason: "io-error",
        message: String(error),
      };
    }

    if (!svc) {
      return {
        success: false,
        reason: "io-error",
        message: "Kein Datenordner konfiguriert.",
      };
    }

    const existingBefore = partner.id ? svc.readVolunteer(partner.id) : null;
    const dataPath = settings.getDataFolderPath();
    const status = dataPath
      ? DataCryptoService.getInstance().getStatus(dataPath)
      : null;
    const timestamp = new Date().toISOString();
    const actor = status?.currentUser || "";
    partner.fileRecords = applyRecordAuditMetadata(
      partner.fileRecords || [],
      existingBefore?.fileRecords,
      (record: FileRecord) => record.id,
      actor,
      timestamp,
    );
    partner.requirements = applyRecordAuditMetadata(
      partner.requirements || [],
      existingBefore?.requirements,
      (record: RequirementRecord) => record.requirementType,
      actor,
      timestamp,
    );
    if (!status?.authorized || status.userRole !== "primary") {
      partner.publicRelationsVisible =
        existingBefore?.publicRelationsVisible === true;
      partner.internVisible = existingBefore?.internVisible === true;
    }

    if (!partner.id) {
      partner.id = uuidv4();
      partner._version = 0;
      partner._createdAt = new Date().toISOString();
      partner._updatedAt = new Date().toISOString();
    }

    const result = svc.saveVolunteer(partner);
    if (result.success) {
      appendBusinessAudit(settings, {
        action: existingBefore ? "partner-updated" : "partner-created",
        subjectType: "partner",
        subjectId: result.volunteer.id,
        details: `${result.volunteer.firstName} ${result.volunteer.lastName}`,
      });
    }

    return result;
  });

  ipcMain.handle(IPC.DELETE_PARTNER, (_event, id: string) => {
    assertNotInternReadOnlyUser();
    try {
      const svc = getPartnerFileService(settings);
      if (!svc) return;
      const existing = svc.readVolunteer(id);
      svc.deleteVolunteer(id);
      appendBusinessAudit(settings, {
        action: "partner-deleted",
        subjectType: "partner",
        subjectId: id,
        details: existing
          ? `${existing.firstName} ${existing.lastName}`
          : "Datensatz geloescht",
      });
    } catch {
      return;
    }
  });

  ipcMain.handle(IPC.GET_HAUPTAMTLICHE, (): HauptamtlicheIndex => {
    if (!isPrimaryUser()) {
      throw new Error("Diese Funktion ist nur im Vollzugriff verfügbar.");
    }
    const service = getHauptamtlicheService(settings);
    if (!service) throw new Error("Kein Datenordner konfiguriert.");
    return service.readAll();
  });

  ipcMain.handle(
    IPC.SAVE_HAUPTAMTLICHE,
    (_event, firstName: string, lastName: string, id?: string) => {
      if (!isPrimaryUser()) {
        return {
          success: false,
          error: "Diese Funktion ist nur im Vollzugriff verfügbar.",
        };
      }
      try {
        const service = getHauptamtlicheService(settings);
        if (!service) {
          return { success: false, error: "Kein Datenordner konfiguriert." };
        }
        const result = service.save(firstName, lastName, id);
        appendBusinessAudit(settings, {
          action: result.created
            ? "hauptamtliche-created"
            : "hauptamtliche-updated",
          subjectType: "hauptamtliche",
          subjectId: result.person.id,
          details: `${result.person.firstName} ${result.person.lastName}`,
        });
        return { success: true, ...result };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle(IPC.DELETE_HAUPTAMTLICHE, (_event, id: string) => {
    if (!isPrimaryUser()) {
      return {
        success: false,
        error: "Diese Funktion ist nur im Vollzugriff verfügbar.",
      };
    }
    try {
      const service = getHauptamtlicheService(settings);
      if (!service) {
        return { success: false, error: "Kein Datenordner konfiguriert." };
      }
      const person = service.readAll().people.find((entry) => entry.id === id);
      if (!person || !service.delete(id)) {
        return { success: false, error: "Eintrag nicht gefunden." };
      }
      appendBusinessAudit(settings, {
        action: "hauptamtliche-deleted",
        subjectType: "hauptamtliche",
        subjectId: id,
        details: `${person.firstName} ${person.lastName}`,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Group meetings (Gruppen Treffen) CRUD
  ipcMain.handle(IPC.GET_GROUP_MEETINGS, () => {
    if (isInternReadOnlyUser()) {
      return {
        _version: 0,
        _updatedAt: new Date().toISOString(),
        meetings: [],
      };
    }
    try {
      const svc = getGroupMeetingService(settings);
      if (!svc)
        return {
          _version: 0,
          _updatedAt: new Date().toISOString(),
          meetings: [],
        };
      return svc.readAll();
    } catch {
      return {
        _version: 0,
        _updatedAt: new Date().toISOString(),
        meetings: [],
      };
    }
  });

  ipcMain.handle(IPC.SAVE_GROUP_MEETING, (_event, meeting: GroupMeeting) => {
    assertNotInternReadOnlyUser();
    try {
      const svc = getGroupMeetingService(settings);
      if (!svc) {
        return { success: false, error: "Kein Datenordner konfiguriert." };
      }

      const existing = svc
        .readAll()
        .meetings.find((entry) => entry.id === meeting.id);
      const isNew = !existing;
      meeting._createdBy = existing
        ? existing._createdBy
        : DataCryptoService.getInstance()
            .getStatus(settings.getDataFolderPath() || "").currentUser;
      if (!meeting.id) {
        meeting.id = uuidv4();
      }

      const saved = svc.save(meeting);
      appendBusinessAudit(settings, {
        action: isNew ? "group-meeting-created" : "group-meeting-updated",
        subjectType: "group-meeting",
        subjectId: saved.id,
        details: `${saved.title} (${saved.date})`,
      });
      return { success: true, meeting: saved };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(IPC.DELETE_GROUP_MEETING, (_event, meetingId: string) => {
    assertNotInternReadOnlyUser();
    try {
      const svc = getGroupMeetingService(settings);
      if (!svc) return;
      if (!svc.delete(meetingId)) return;
      appendBusinessAudit(settings, {
        action: "group-meeting-deleted",
        subjectType: "group-meeting",
        subjectId: meetingId,
      });
    } catch {
      return;
    }
  });

  ipcMain.handle(
    IPC.UPLOAD_GROUP_MEETING_ATTACHMENT,
    (
      _event,
      meetingId: string,
      sourcePath: string,
    ):
      | { success: true; attachment: GroupMeetingAttachment }
      | { success: false; error: string } => {
      assertNotInternReadOnlyUser();
      try {
        const svc = getGroupMeetingService(settings);
        if (!svc) {
          return { success: false, error: "Kein Datenordner konfiguriert." };
        }
        const uploadedBy = DataCryptoService.getInstance()
          .getStatus(settings.getDataFolderPath() || "")
          .currentUser;
        const result = svc.uploadAttachment(
          meetingId,
          sourcePath,
          uploadedBy,
        );
        if (result.success) {
          appendBusinessAudit(settings, {
            action: "file-uploaded",
            subjectType: "group-meeting",
            subjectId: meetingId,
            details: `${result.attachment.fileName} -> Gruppentreffen`,
          });
        }
        return result;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle(
    IPC.OPEN_GROUP_MEETING_ATTACHMENT,
    async (_event, meetingId: string, attachmentId: string, fileName: string) => {
      assertNotInternReadOnlyUser();
      try {
        const svc = getGroupMeetingService(settings);
        if (!svc) {
          return { success: false, error: "Kein Datenordner konfiguriert." };
        }
        const result = await svc.openAttachment(
          meetingId,
          attachmentId,
          fileName,
        );
        if (result.success) {
          appendBusinessAudit(settings, {
            action: "file-opened",
            subjectType: "group-meeting",
            subjectId: meetingId,
            details: fileName,
          });
        }
        return result;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle(
    IPC.DELETE_GROUP_MEETING_ATTACHMENT,
    (_event, meetingId: string, attachmentId: string, fileName: string) => {
      assertNotInternReadOnlyUser();
      try {
        const svc = getGroupMeetingService(settings);
        if (!svc) {
          return { success: false, error: "Kein Datenordner konfiguriert." };
        }
        const result = svc.deleteAttachment(meetingId, attachmentId);
        if (result.success) {
          appendBusinessAudit(settings, {
            action: "file-deleted",
            subjectType: "group-meeting",
            subjectId: meetingId,
            details: fileName,
          });
        }
        return result;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  );

  // File attachments
  ipcMain.handle(IPC.SELECT_FILE, async (event) => {
    const win = require("electron").BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      title: "Datei auswählen",
      properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    IPC.UPLOAD_FILE,
    async (_event, volunteerId: string, sourcePath: string) => {
      assertNotInternReadOnlyUser();
      try {
        const svc = getFileService(settings);
        if (!svc) {
          return { success: false, error: "No data folder configured" };
        }
        const result = svc.uploadFile(volunteerId, sourcePath);
        if (result.success) {
          appendBusinessAudit(settings, {
            action: "file-uploaded",
            subjectType: "attachment",
            subjectId: volunteerId,
            details: `${result.fileName || "Datei"} -> ${result.filePath || ""}`,
          });
        }
        return result;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle(IPC.DELETE_FILE, (_event, filePath: string) => {
    assertNotInternReadOnlyUser();
    try {
      const svc = getFileService(settings);
      if (!svc) {
        return { success: false, error: "No data folder configured" };
      }
      const result = svc.deleteFile(filePath);
      if (result.success) {
        appendBusinessAudit(settings, {
          action: "file-deleted",
          subjectType: "attachment",
          subjectId: filePath,
          details: filePath,
        });
      }
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(IPC.OPEN_FILE, (_event, filePath: string) => {
    assertNotInternReadOnlyUser();
    try {
      const svc = getFileService(settings);
      if (!svc) {
        return { success: false, error: "No data folder configured" };
      }
      const result = svc.openFile(filePath);
      if (result.success) {
        appendBusinessAudit(settings, {
          action: "file-opened",
          subjectType: "attachment",
          subjectId: filePath,
          details: filePath,
        });
      }
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Reminders
  ipcMain.handle(IPC.GET_DUE_REMINDERS, () => {
    if (isInternReadOnlyUser()) return [];
    try {
      const svc = getFileService(settings);
      if (!svc) return [];

      const index = svc.readIndex();
      const volunteers: Volunteer[] = [];

      for (const entry of index.volunteers) {
        if (entry.status === "archived") continue;
        const volunteer = svc.readVolunteer(entry.id);
        if (!volunteer) continue;
        volunteers.push(volunteer);
      }

      return getUpcomingReminders(volunteers, settings.get(), 30);
    } catch {
      return [];
    }
  });

  ipcMain.handle(
    IPC.DISMISS_REMINDER,
    (_event, volunteerId: string, reminderId: string) => {
      assertNotInternReadOnlyUser();
      try {
        const svc = getFileService(settings);
        if (!svc) return;
        const volunteer = svc.readVolunteer(volunteerId);
        if (!volunteer) return;
        const reminder = volunteer.reminders.find((r) => r.id === reminderId);
        if (!reminder) return;
        reminder.dismissed = true;
        reminder.dismissedAt = new Date().toISOString();
        svc.saveVolunteer(volunteer);
      } catch {
        return;
      }
    },
  );

  ipcMain.handle(IPC.SIMULATE_REMINDER, (event, payload: DueReminder) => {
    if (onRemindersTriggered) {
      onRemindersTriggered([payload]);
    } else {
      event.sender.send(IPC.REMINDER_TRIGGERED, [payload]);
    }
    return { success: true };
  });

  // Utilities
  ipcMain.handle(IPC.OPEN_EXTERNAL_URL, async (_event, url: string) => {
    const { shell } = require("electron") as typeof import("electron");
    await shell.openExternal(url);
  });

  // App info
  ipcMain.handle(IPC.GET_APP_VERSION, () => {
    const { app } = require("electron") as typeof import("electron");
    return app.getVersion();
  });
}
