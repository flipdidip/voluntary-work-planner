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
    if (!existsSync(this.meetingsFilePath)) {
      return {
        _version: 1,
        _updatedAt: new Date().toISOString(),
        meetings: [],
      };
    }

    try {
      const raw = readFileSync(this.meetingsFilePath);
      const decrypted = this.cryptoService.decryptBytesForDataFolder(
        this.dataPath,
        raw,
      );
      return JSON.parse(decrypted.toString("utf-8")) as GroupMeetingIndex;
    } catch {
      return {
        _version: 1,
        _updatedAt: new Date().toISOString(),
        meetings: [],
      };
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
