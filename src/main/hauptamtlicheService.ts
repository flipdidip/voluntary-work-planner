import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { v4 as uuidv4 } from "uuid";
import { Hauptamtliche, HauptamtlicheIndex } from "@shared/types";
import { DataCryptoService } from "./dataCryptoService";

export class HauptamtlicheService {
  constructor(
    private dataPath: string,
    private filePath: string,
    private cryptoService: DataCryptoService,
  ) {}

  readAll(): HauptamtlicheIndex {
    if (!existsSync(this.filePath)) {
      return {
        _version: 1,
        _updatedAt: new Date().toISOString(),
        people: [],
      };
    }

    const raw = readFileSync(this.filePath);
    const decrypted = this.cryptoService.decryptBytesForDataFolder(
      this.dataPath,
      raw,
    );
    const parsed = JSON.parse(
      decrypted.toString("utf-8"),
    ) as Partial<HauptamtlicheIndex>;

    return {
      _version: typeof parsed._version === "number" ? parsed._version : 1,
      _updatedAt:
        typeof parsed._updatedAt === "string"
          ? parsed._updatedAt
          : new Date().toISOString(),
      people: Array.isArray(parsed.people)
        ? parsed.people.filter(
            (person): person is Hauptamtliche =>
              typeof person?.id === "string" &&
              typeof person?.firstName === "string" &&
              typeof person?.lastName === "string",
          )
        : [],
    };
  }

  private writeAll(index: HauptamtlicheIndex): void {
    index._version += 1;
    index._updatedAt = new Date().toISOString();
    const encrypted = this.cryptoService.encryptBytesForDataFolder(
      this.dataPath,
      Buffer.from(JSON.stringify(index, null, 2), "utf-8"),
    );
    writeFileSync(this.filePath, encrypted);
  }

  save(
    firstName: string,
    lastName: string,
    id?: string,
  ): { person: Hauptamtliche; created: boolean } {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    if (!normalizedFirstName || !normalizedLastName) {
      throw new Error("Bitte Vor- und Nachnamen eingeben.");
    }

    const index = this.readAll();
    const existingIndex = id
      ? index.people.findIndex((person) => person.id === id)
      : -1;
    if (id && existingIndex === -1) {
      throw new Error("Eintrag nicht gefunden.");
    }

    const person: Hauptamtliche = {
      id: id || uuidv4(),
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
    };
    if (existingIndex >= 0) {
      index.people[existingIndex] = person;
    } else {
      index.people.push(person);
    }
    this.writeAll(index);
    return { person, created: existingIndex < 0 };
  }

  delete(id: string): boolean {
    const index = this.readAll();
    const remainingPeople = index.people.filter((person) => person.id !== id);
    if (remainingPeople.length === index.people.length) return false;

    index.people = remainingPeople;
    this.writeAll(index);
    return true;
  }
}
