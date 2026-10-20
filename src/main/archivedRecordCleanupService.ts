import { subMonths } from "date-fns";
import { BusinessAuditService } from "./businessAuditService";
import { DataCryptoService } from "./dataCryptoService";
import { SettingsService } from "./settingsService";
import { VolunteerFileService } from "./volunteerFileService";
import { DeletedArchivedRecord, Volunteer } from "@shared/types";

interface CleanupResult {
  deletedVolunteers: number;
  deletedPartners: number;
  deletedRecords: DeletedArchivedRecord[];
}

function getArchivedSince(volunteer: Volunteer): Date | null {
  if (
    volunteer.status !== "archived" ||
    !Array.isArray(volunteer.statusLog) ||
    volunteer.statusLog.length === 0
  ) {
    return null;
  }

  const statusEntries = volunteer.statusLog.map((entry) => ({
    entry,
    timestamp: new Date(entry.timestamp).getTime(),
  }));
  if (statusEntries.some(({ timestamp }) => Number.isNaN(timestamp))) {
    return null;
  }

  const latestStatus = statusEntries.reduce((latest, current) =>
    current.timestamp > latest.timestamp ? current : latest,
  );
  if (latestStatus.entry.to !== "archived") return null;

  return new Date(latestStatus.timestamp);
}

export class ArchivedRecordCleanupService {
  constructor(private settings: SettingsService) {}

  run(now = new Date()): CleanupResult {
    const settings = this.settings.get();
    if (!settings.enableArchivedRecordDeletion) {
      return { deletedVolunteers: 0, deletedPartners: 0, deletedRecords: [] };
    }

    const dataPath = this.settings.getDataFolderPath();
    if (!dataPath) {
      return { deletedVolunteers: 0, deletedPartners: 0, deletedRecords: [] };
    }

    const cryptoService = DataCryptoService.getInstance();
    const encryptionStatus = cryptoService.getStatus(dataPath);
    if (
      !encryptionStatus.hasManifest ||
      !encryptionStatus.authorized ||
      encryptionStatus.userRole !== "primary"
    ) {
      return { deletedVolunteers: 0, deletedPartners: 0, deletedRecords: [] };
    }

    const cutoff = subMonths(now, settings.archivedDeletionAfterMonths);
    const auditService = new BusinessAuditService(dataPath, cryptoService);
    const result: CleanupResult = {
      deletedVolunteers: 0,
      deletedPartners: 0,
      deletedRecords: [],
    };

    const collections = [
      {
        fileService: new VolunteerFileService(
          dataPath,
          this.settings.getVolunteersPath(),
          this.settings.getIndexPath(),
          this.settings.getBackupsPath(),
          this.settings.getAttachmentsPath(),
          cryptoService,
        ),
        subjectType: "volunteer" as const,
        action: "volunteer-deleted" as const,
        resultKey: "deletedVolunteers" as const,
      },
      {
        fileService: new VolunteerFileService(
          dataPath,
          this.settings.getPartnersPath(),
          this.settings.getPartnerIndexPath(),
          this.settings.getPartnerBackupsPath(),
          this.settings.getPartnerAttachmentsPath(),
          cryptoService,
        ),
        subjectType: "partner" as const,
        action: "partner-deleted" as const,
        resultKey: "deletedPartners" as const,
      },
    ];

    for (const collection of collections) {
      for (const volunteer of collection.fileService.readAllVolunteers()) {
        const archivedSince = getArchivedSince(volunteer);
        if (!archivedSince || archivedSince > cutoff || archivedSince > now) {
          continue;
        }

        collection.fileService.deleteVolunteer(volunteer.id);
        result[collection.resultKey]++;
        result.deletedRecords.push({
          name: `${volunteer.firstName} ${volunteer.lastName}`.trim(),
          type: collection.subjectType,
        });
        try {
          auditService.append({
            action: collection.action,
            subjectType: collection.subjectType,
            subjectId: volunteer.id,
            details: `${volunteer.firstName} ${volunteer.lastName} (automatisch geloescht; archiviert seit ${archivedSince.toISOString()})`,
          });
        } catch (error) {
          console.error(
            `Could not audit automatic deletion of archived ${collection.subjectType} ${volunteer.id}:`,
            error,
          );
        }
      }
    }

    return result;
  }
}
