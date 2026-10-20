import { parseISO } from "date-fns";
import type { VolunteerIndexEntry } from "@shared/types";

export type VolunteerListSortOption =
  | "name-asc"
  | "name-desc"
  | "joined-desc"
  | "joined-asc";

export function sortVolunteerEntries(
  entries: VolunteerIndexEntry[],
  sortOption: VolunteerListSortOption,
): VolunteerIndexEntry[] {
  const compareNames = (
    a: VolunteerIndexEntry,
    b: VolunteerIndexEntry,
  ): number =>
    a.lastName.localeCompare(b.lastName, "de", { sensitivity: "base" }) ||
    a.firstName.localeCompare(b.firstName, "de", { sensitivity: "base" });

  return [...entries].sort((a, b) => {
    if (sortOption === "name-asc") return compareNames(a, b);
    if (sortOption === "name-desc") return compareNames(b, a);

    const aDate = a.joinedDate ? parseISO(a.joinedDate).getTime() : NaN;
    const bDate = b.joinedDate ? parseISO(b.joinedDate).getTime() : NaN;
    const aHasDate = Number.isFinite(aDate);
    const bHasDate = Number.isFinite(bDate);

    if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
    if (!aHasDate || !bHasDate) return compareNames(a, b);

    const dateComparison = aDate - bDate;
    if (dateComparison !== 0) {
      return sortOption === "joined-asc" ? dateComparison : -dateComparison;
    }
    return compareNames(a, b);
  });
}
