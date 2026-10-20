import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { app, shell } from "electron";
import { v4 as uuidv4 } from "uuid";
import {
  GroupMeeting,
  GroupMeetingAttachment,
  GroupMeetingIndex,
} from "@shared/types";
import { normalizeEventDateTime } from "@shared/dateTime";
import { DataCryptoService } from "./dataCryptoService";

const ATTACHMENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Service for persisting group meetings (Gruppen Treffen).
 * Meetings and their attachments are stored encrypted in the data folder.
 */
export class GroupMeetingService {
  constructor(
    private dataPath: string,
    private meetingsFilePath: string,
    private attachmentsPath: string,
    private cryptoService: DataCryptoService,
  ) {}

  readAll(): GroupMeetingIndex {
    const emptyIndex = {
      _version: 1,
      _updatedAt: new Date().toISOString(),
      meetings: [],
    };

    if (!existsSync(this.meetingsFilePath)) {
      return emptyIndex;
    }

    try {
      const raw = readFileSync(this.meetingsFilePath);
      const decrypted = this.cryptoService.decryptBytesForDataFolder(
        this.dataPath,
        raw,
      );
      const parsed = JSON.parse(
        decrypted.toString("utf-8"),
      ) as Partial<GroupMeetingIndex>;
      const meetings: GroupMeeting[] = Array.isArray(parsed.meetings)
        ? parsed.meetings.map((meeting) => ({
            id: typeof meeting?.id === "string" ? meeting.id : "",
            title: typeof meeting?.title === "string" ? meeting.title : "",
            date: normalizeEventDateTime(meeting?.date),
            participants: Array.isArray(meeting?.participants)
              ? meeting.participants.map((participant) => ({
                  id: typeof participant?.id === "string" ? participant.id : "",
                  name:
                    typeof participant?.name === "string"
                      ? participant.name
                      : "",
                  type: (participant?.type === "partner"
                    ? "partner"
                    : "volunteer") as "partner" | "volunteer",
                  attendance:
                    participant?.attendance === "present" ||
                    participant?.attendance === "absent" ||
                    participant?.attendance === "unknown"
                      ? participant.attendance
                      : "unknown",
                }))
              : [],
            notes:
              typeof meeting?.notes === "string" ? meeting.notes : undefined,
            attachments: Array.isArray(meeting?.attachments)
              ? meeting.attachments.filter(
                  (attachment): attachment is GroupMeetingAttachment =>
                    typeof attachment?.id === "string" &&
                    ATTACHMENT_ID_PATTERN.test(attachment.id) &&
                    typeof attachment?.fileName === "string" &&
                    typeof attachment?.fileSize === "number" &&
                    typeof attachment?.uploadedAt === "string",
                )
              : [],
            _createdBy:
              typeof meeting?._createdBy === "string"
                ? meeting._createdBy
                : undefined,
            _createdAt:
              typeof meeting?._createdAt === "string"
                ? meeting._createdAt
                : new Date().toISOString(),
            _updatedAt:
              typeof meeting?._updatedAt === "string"
                ? meeting._updatedAt
                : new Date().toISOString(),
          }))
        : [];

      return {
        _version: typeof parsed._version === "number" ? parsed._version : 1,
        _updatedAt:
          typeof parsed._updatedAt === "string"
            ? parsed._updatedAt
            : new Date().toISOString(),
        meetings,
      };
    } catch {
      return emptyIndex;
    }
  }

  private writeAll(index: GroupMeetingIndex): void {
    index._updatedAt = new Date().toISOString();
    index._version += 1;
    const json = JSON.stringify(index, null, 2);
    const encrypted = this.cryptoService.encryptBytesForDataFolder(
      this.dataPath,
      Buffer.from(json, "utf-8"),
    );
    writeFileSync(this.meetingsFilePath, encrypted);
  }

  save(meeting: GroupMeeting): GroupMeeting {
    const index = this.readAll();
    const existingIdx = index.meetings.findIndex((m) => m.id === meeting.id);

    meeting.date = normalizeEventDateTime(meeting.date);
    meeting._updatedAt = new Date().toISOString();
    if (!meeting._createdAt) {
      meeting._createdAt = meeting._updatedAt;
    }

    if (existingIdx >= 0) {
      index.meetings[existingIdx] = meeting;
    } else {
      index.meetings.push(meeting);
    }

    this.writeAll(index);
    return meeting;
  }

  delete(meetingId: string): boolean {
    const index = this.readAll();
    const before = index.meetings.length;
    index.meetings = index.meetings.filter((m) => m.id !== meetingId);
    if (index.meetings.length < before) {
      this.writeAll(index);
      rmSync(this.meetingAttachmentsPath(meetingId), {
        recursive: true,
        force: true,
      });
      return true;
    }
    return false;
  }

  uploadAttachment(
    meetingId: string,
    sourcePath: string,
    uploadedBy: string,
  ):
    | { success: true; attachment: GroupMeetingAttachment }
    | { success: false; error: string } {
    try {
      if (
        !this.readAll().meetings.some((meeting) => meeting.id === meetingId)
      ) {
        return {
          success: false,
          error: "Das Gruppentreffen wurde nicht gefunden.",
        };
      }
      if (!existsSync(sourcePath)) {
        return { success: false, error: "Die Quelldatei wurde nicht gefunden." };
      }

      const source = readFileSync(sourcePath);
      const attachment: GroupMeetingAttachment = {
        id: uuidv4(),
        fileName: basename(sourcePath),
        fileSize: source.byteLength,
        uploadedAt: new Date().toISOString(),
        uploadedBy: uploadedBy || undefined,
      };
      const directory = this.meetingAttachmentsPath(meetingId);
      mkdirSync(directory, { recursive: true });
      const encrypted = this.cryptoService.encryptBytesForDataFolder(
        this.dataPath,
        source,
      );
      writeFileSync(join(directory, `${attachment.id}.enc`), encrypted);
      return { success: true, attachment };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async openAttachment(
    meetingId: string,
    attachmentId: string,
    fileName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const meeting = this.readAll().meetings.find(
        (entry) => entry.id === meetingId,
      );
      if (
        !meeting?.attachments?.some(
          (attachment) => attachment.id === attachmentId,
        )
      ) {
        return { success: false, error: "Das Dokument wurde nicht gefunden." };
      }

      const attachmentPath = this.attachmentPath(meetingId, attachmentId);
      if (!existsSync(attachmentPath)) {
        return { success: false, error: "Die Datei wurde nicht gefunden." };
      }

      const payload = readFileSync(attachmentPath);
      const plain = this.cryptoService.decryptBytesForDataFolder(
        this.dataPath,
        payload,
      );
      const tempRoot = join(app.getPath("temp"), "vwp-decrypted");
      mkdirSync(tempRoot, { recursive: true });
      const tempFile = join(tempRoot, `${uuidv4()}_${basename(fileName)}`);
      writeFileSync(tempFile, plain);
      const openError = await shell.openPath(tempFile);
      return openError
        ? { success: false, error: openError }
        : { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  deleteAttachment(
    meetingId: string,
    attachmentId: string,
  ): { success: boolean; error?: string } {
    try {
      const attachmentPath = this.attachmentPath(meetingId, attachmentId);
      if (existsSync(attachmentPath)) {
        rmSync(attachmentPath);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private meetingAttachmentsPath(meetingId: string): string {
    if (!meetingId || !/^[a-zA-Z0-9_-]+$/.test(meetingId)) {
      throw new Error("Ungültige Gruppentreffen-ID.");
    }
    return join(this.attachmentsPath, meetingId);
  }

  private attachmentPath(meetingId: string, attachmentId: string): string {
    if (!ATTACHMENT_ID_PATTERN.test(attachmentId)) {
      throw new Error("Ungültige Dokument-ID.");
    }
    return join(
      this.meetingAttachmentsPath(meetingId),
      `${attachmentId}.enc`,
    );
  }
}
