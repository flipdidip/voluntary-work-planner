import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  unlinkSync,
} from "fs";
import { join, basename } from "path";
import { shell } from "electron";
import {
  Volunteer,
  VolunteerIndex,
  VolunteerIndexEntry,
  SaveResult,
} from "@shared/types";

export class VolunteerFileService {
  constructor(
    private volunteersPath: string,
    private indexPath: string,
    private backupsPath: string,
    private attachmentsPath: string,
  ) {
    mkdirSync(this.volunteersPath, { recursive: true });
    mkdirSync(this.backupsPath, { recursive: true });
    mkdirSync(this.attachmentsPath, { recursive: true });
  }

  // ────────────────────────────────────────────
  // Index
  // ────────────────────────────────────────────

  readIndex(): VolunteerIndex {
    if (!existsSync(this.indexPath)) {
      return {
        _version: 0,
        _updatedAt: new Date().toISOString(),
        volunteers: [],
      };
    }
    try {
      const raw = readFileSync(this.indexPath, "utf-8");
      const index = JSON.parse(raw) as VolunteerIndex;

      let changed = false;
      const normalizedVolunteers = index.volunteers.map((entry) => {
        if (entry.joinedDate !== undefined) return entry;
        const volunteer = this.readVolunteer(entry.id);
        if (volunteer?.joinedDate) {
          changed = true;
          return { ...entry, joinedDate: volunteer.joinedDate };
        }
        return entry;
      });

      if (changed) {
        index.volunteers = normalizedVolunteers;
        index._version += 1;
        this.writeIndex(index);
      }

      return index;
    } catch {
      return {
        _version: 0,
        _updatedAt: new Date().toISOString(),
        volunteers: [],
      };
    }
  }

  private writeIndex(index: VolunteerIndex): void {
    index._updatedAt = new Date().toISOString();
    writeFileSync(this.indexPath, JSON.stringify(index, null, 2), "utf-8");
  }

  private updateIndexEntry(volunteer: Volunteer): void {
    const index = this.readIndex();
    const entry: VolunteerIndexEntry = {
      id: volunteer.id,
      firstName: volunteer.firstName,
      lastName: volunteer.lastName,
      dateOfBirth: volunteer.dateOfBirth,
      joinedDate: volunteer.joinedDate,
      status: volunteer.status,
      roles: volunteer.roles,
      _updatedAt: volunteer._updatedAt,
    };
    const existingIdx = index.volunteers.findIndex(
      (v) => v.id === volunteer.id,
    );
    if (existingIdx >= 0) {
      index.volunteers[existingIdx] = entry;
    } else {
      index.volunteers.push(entry);
    }
    index._version++;
    this.writeIndex(index);
  }

  private removeFromIndex(id: string): void {
    const index = this.readIndex();
    index.volunteers = index.volunteers.filter((v) => v.id !== id);
    index._version++;
    this.writeIndex(index);
  }

  // ────────────────────────────────────────────
  // Individual volunteer files
  // ────────────────────────────────────────────

  private volunteerFilePath(id: string): string {
    return join(this.volunteersPath, `${id}.json`);
  }

  readVolunteer(id: string): Volunteer | null {
    const filePath = this.volunteerFilePath(id);
    if (!existsSync(filePath)) return null;
    try {
      const raw = readFileSync(filePath, "utf-8");
      const volunteer = JSON.parse(raw) as Volunteer;

      // Migrate old volunteers without statusLog
      if (!volunteer.statusLog) {
        volunteer.statusLog = [
          {
            timestamp: volunteer._createdAt || new Date().toISOString(),
            from: null,
            to: volunteer.status,
          },
        ];
      }

      // Migrate old volunteers without fileRecords
      if (!volunteer.fileRecords) {
        volunteer.fileRecords = [];
      }

      return volunteer;
    } catch {
      return null;
    }
  }

  saveVolunteer(incoming: Volunteer): SaveResult {
    const filePath = this.volunteerFilePath(incoming.id);

    // Optimistic locking — if file exists, check version
    let existing: Volunteer | null = null;
    if (existsSync(filePath)) {
      existing = this.readVolunteer(incoming.id);
      if (existing && existing._version !== incoming._version) {
        return {
          success: false,
          reason: "version-conflict",
          message: `Version conflict: file has version ${existing._version}, you have ${incoming._version}. Please reload and retry.`,
        };
      }
      // Backup before overwrite
      this.createBackup(incoming.id);
    }

    try {
      const toWrite: Volunteer = {
        ...incoming,
        _version: incoming._version + 1,
        _updatedAt: new Date().toISOString(),
      };

      // Initialize statusLog if it doesn't exist
      if (!toWrite.statusLog) {
        toWrite.statusLog = [];
      }

      // Log status change if status has changed
      if (existing && existing.status !== toWrite.status) {
        toWrite.statusLog.push({
          timestamp: new Date().toISOString(),
          from: existing.status,
          to: toWrite.status,
        });
      } else if (!existing && toWrite.statusLog.length === 0) {
        // Initial status log entry for new volunteers
        toWrite.statusLog.push({
          timestamp: toWrite._createdAt || new Date().toISOString(),
          from: null,
          to: toWrite.status,
        });
      }

      writeFileSync(filePath, JSON.stringify(toWrite, null, 2), "utf-8");
      this.updateIndexEntry(toWrite);
      return { success: true, volunteer: toWrite };
    } catch (err) {
      return {
        success: false,
        reason: "io-error",
        message: String(err),
      };
    }
  }

  deleteVolunteer(id: string): void {
    const filePath = this.volunteerFilePath(id);
    if (existsSync(filePath)) {
      this.createBackup(id);
      // Soft-delete: rename to .deleted rather than hard remove
      const deletedPath = filePath.replace(
        ".json",
        `.deleted.${Date.now()}.json`,
      );
      const { renameSync } = require("fs") as typeof import("fs");
      renameSync(filePath, deletedPath);
    }
    this.removeFromIndex(id);
  }

  // ────────────────────────────────────────────
  // Backups
  // ────────────────────────────────────────────

  private createBackup(id: string): void {
    const source = this.volunteerFilePath(id);
    if (!existsSync(source)) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = join(this.backupsPath, `${id}_${timestamp}.json`);
    try {
      copyFileSync(source, dest);
    } catch {
      // non-fatal
    }
  }

  // ────────────────────────────────────────────
  // File Attachments
  // ────────────────────────────────────────────

  /**
   * Upload a file to the attachments folder
   * Returns the relative path to the file within attachments folder
   */
  uploadFile(
    volunteerId: string,
    sourcePath: string,
  ): {
    success: boolean;
    filePath?: string;
    fileName?: string;
    error?: string;
  } {
    try {
      if (!existsSync(sourcePath)) {
        return { success: false, error: "Source file does not exist" };
      }

      // Create a subdirectory for this volunteer
      const volunteerAttachmentsPath = join(this.attachmentsPath, volunteerId);
      mkdirSync(volunteerAttachmentsPath, { recursive: true });

      // Use original filename with timestamp to avoid conflicts
      const originalName = basename(sourcePath);
      const timestamp = Date.now();
      const fileName = `${timestamp}_${originalName}`;
      const destPath = join(volunteerAttachmentsPath, fileName);

      // Copy the file
      copyFileSync(sourcePath, destPath);

      // Return relative path from attachments root
      const relativePath = join(volunteerId, fileName);
      return { success: true, filePath: relativePath, fileName: originalName };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Delete a file from the attachments folder
   */
  deleteFile(filePath: string): { success: boolean; error?: string } {
    try {
      const fullPath = join(this.attachmentsPath, filePath);
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Open a file with the system's default application
   */
  openFile(filePath: string): { success: boolean; error?: string } {
    try {
      const fullPath = join(this.attachmentsPath, filePath);
      if (!existsSync(fullPath)) {
        return { success: false, error: "File does not exist" };
      }
      shell.openPath(fullPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
