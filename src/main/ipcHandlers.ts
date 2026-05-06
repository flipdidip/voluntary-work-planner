import { IpcMain, dialog } from "electron";
import { v4 as uuidv4 } from "uuid";
import {
  IPC,
  Volunteer,
  SaveResult,
  ProcessingActivitiesDocument,
  BusinessAuditEntry,
  UserRole,
  GroupMeeting,
  PartnerAppointment,
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
import { PartnerAppointmentService } from "./partnerAppointmentService";

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
    settings.getAppointmentsPath(),
    dataPath,
    cryptoService,
    {
      _version: 1,
      _updatedAt: now,
      appointments: [],
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
    access.cryptoService,
  );
}

function getPartnerAppointmentService(
  settings: SettingsService,
): PartnerAppointmentService | null {
  const access = getValidatedDataFolder(settings);
  if (!access) return null;

  return new PartnerAppointmentService(
    access.dataPath,
    settings.getAppointmentsPath(),
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
  // Settings
  ipcMain.handle(IPC.GET_DATA_PATH, () => settings.getDataFolderPath());

  ipcMain.handle(IPC.GET_SETTINGS, () => settings.get());

  ipcMain.handle(
    IPC.SAVE_SETTINGS,
    (_event, partial: Partial<import("@shared/types").AppSettings>) => {
      settings.set(partial);
      appendBusinessAudit(settings, {
        action: "settings-saved",
        subjectType: "settings",
        details: `Felder aktualisiert: ${Object.keys(partial).join(", ") || "(keine)"}`,
      });
      return { success: true };
    },
  );

  ipcMain.handle(IPC.SET_DATA_PATH, (_event, folderPath: string) => {
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
  ipcMain.handle(IPC.GET_VOLUNTEER_INDEX, () => {
    try {
      const svc = getFileService(settings);
      if (!svc) return null;
      return svc.readIndex();
    } catch {
      return {
        _version: 0,
        _updatedAt: new Date().toISOString(),
        volunteers: [],
      };
    }
  });

  ipcMain.handle(IPC.GET_VOLUNTEER, (_event, id: string) => {
    try {
      const svc = getFileService(settings);
      if (!svc) return null;
      return svc.readVolunteer(id);
    } catch {
      return null;
    }
  });

  ipcMain.handle(
    IPC.SAVE_VOLUNTEER,
    (_event, volunteer: Volunteer): SaveResult => {
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

      if (!volunteer.id) {
        volunteer.id = uuidv4();
        volunteer._version = 0;
        volunteer._createdAt = new Date().toISOString();
        volunteer._updatedAt = new Date().toISOString();
      }

      const result = svc.saveVolunteer(volunteer);
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
      return svc.readVolunteer(id);
    } catch {
      return null;
    }
  });

  ipcMain.handle(IPC.SAVE_PARTNER, (_event, partner: Volunteer): SaveResult => {
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

  // Group meetings (Gruppen Treffen) CRUD
  ipcMain.handle(IPC.GET_GROUP_MEETINGS, () => {
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
    try {
      const svc = getGroupMeetingService(settings);
      if (!svc) {
        return { success: false, error: "Kein Datenordner konfiguriert." };
      }

      const isNew = !meeting._createdAt;
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
    try {
      const svc = getGroupMeetingService(settings);
      if (!svc) return;
      svc.delete(meetingId);
      appendBusinessAudit(settings, {
        action: "group-meeting-deleted",
        subjectType: "group-meeting",
        subjectId: meetingId,
      });
    } catch {
      return;
    }
  });

  // Partner appointments (Termine) CRUD
  ipcMain.handle(IPC.GET_PARTNER_APPOINTMENTS, () => {
    try {
      const svc = getPartnerAppointmentService(settings);
      if (!svc)
        return {
          _version: 0,
          _updatedAt: new Date().toISOString(),
          appointments: [],
        };
      return svc.readAll();
    } catch {
      return {
        _version: 0,
        _updatedAt: new Date().toISOString(),
        appointments: [],
      };
    }
  });

  ipcMain.handle(
    IPC.SAVE_PARTNER_APPOINTMENT,
    (_event, appointment: PartnerAppointment) => {
      try {
        const svc = getPartnerAppointmentService(settings);
        if (!svc) {
          return { success: false, error: "Kein Datenordner konfiguriert." };
        }

        const isNew = !appointment._createdAt;
        if (!appointment.id) {
          appointment.id = uuidv4();
        }

        const saved = svc.save(appointment);
        appendBusinessAudit(settings, {
          action: isNew
            ? "partner-appointment-created"
            : "partner-appointment-updated",
          subjectType: "partner-appointment",
          subjectId: saved.id,
          details: `${saved.title} (${saved.date})`,
        });
        return { success: true, appointment: saved };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle(
    IPC.DELETE_PARTNER_APPOINTMENT,
    (_event, appointmentId: string) => {
      try {
        const svc = getPartnerAppointmentService(settings);
        if (!svc) return;
        svc.delete(appointmentId);
        appendBusinessAudit(settings, {
          action: "partner-appointment-deleted",
          subjectType: "partner-appointment",
          subjectId: appointmentId,
        });
      } catch {
        return;
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
