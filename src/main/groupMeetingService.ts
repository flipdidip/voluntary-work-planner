import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { GroupMeeting, GroupMeetingIndex } from "@shared/types";
import { DataCryptoService } from "./dataCryptoService";

/**
 * Service for persisting group meetings (Gruppen Treffen).
 * All meetings are stored in a single encrypted JSON file (meetings.json).
 */
export class GroupMeetingService {
  constructor(
    private dataPath: string,
    private meetingsFilePath: string,
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
            date:
              typeof meeting?.date === "string"
                ? meeting.date
                : new Date().toISOString().slice(0, 10),
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
      return true;
    }
    return false;
  }
}
