import { describe, expect, it } from "vitest";
import type { VolunteerIndexEntry } from "@shared/types";
import { sortVolunteerEntries } from "./sortVolunteerEntries";

function entry(
  id: string,
  firstName: string,
  lastName: string,
  joinedDate?: string,
): VolunteerIndexEntry {
  return {
    id,
    firstName,
    lastName,
    joinedDate,
    status: "active",
    roles: [],
    _updatedAt: "2026-01-01T00:00:00.000Z",
    requirementsStatus: {},
  };
}

describe("sortVolunteerEntries", () => {
  const entries = [
    entry("1", "Anna", "Müller", "2024-01-01"),
    entry("2", "Berta", "Adler", "2022-01-01"),
    entry("3", "Clara", "Adler", "2022-01-01"),
    entry("4", "Dora", "Ziegler"),
  ];

  it("sorts names by last name then first name without mutating the input", () => {
    const sorted = sortVolunteerEntries(entries, "name-asc");

    expect(sorted.map(({ id }) => id)).toEqual(["2", "3", "1", "4"]);
    expect(sortVolunteerEntries(entries, "name-desc").map(({ id }) => id)).toEqual(
      ["4", "1", "3", "2"],
    );
    expect(entries.map(({ id }) => id)).toEqual(["1", "2", "3", "4"]);
  });

  it("sorts by joined date and places missing dates last", () => {
    expect(sortVolunteerEntries(entries, "joined-asc").map(({ id }) => id)).toEqual(
      ["2", "3", "1", "4"],
    );
    expect(sortVolunteerEntries(entries, "joined-desc").map(({ id }) => id)).toEqual(
      ["1", "2", "3", "4"],
    );
  });
});
