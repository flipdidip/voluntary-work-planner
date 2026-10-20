import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  getMediaConsentDescription,
  MediaConsentLevel,
  PublicRelationsConsentOverview,
} from "@shared/types";
import "./PublicRelations.css";

const CONSENT_LABELS: Record<MediaConsentLevel, string> = {
  green: "Grün",
  yellow: "Gelb",
  red: "Rot",
};

type FilterMode = "off" | "include" | "exclude";
type ConsentFilter = MediaConsentLevel | "none";
type CategoryFilter = "Ehrenamtliche" | "Kooperationspartner";

export default function PublicRelations(): JSX.Element {
  const [overview, setOverview] =
    useState<PublicRelationsConsentOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<"name" | "category">("name");
  const [sortAscending, setSortAscending] = useState(true);
  const [query, setQuery] = useState("");
  const [consentFilters, setConsentFilters] = useState<
    Record<ConsentFilter, FilterMode>
  >({ green: "off", yellow: "off", red: "off", none: "off" });
  const [categoryFilters, setCategoryFilters] = useState<
    Record<CategoryFilter, FilterMode>
  >({ Ehrenamtliche: "off", Kooperationspartner: "off" });

  const loadOverview = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await window.api.getPublicRelationsConsentOverview());
    } catch (loadError) {
      setError(String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const cycleFilter = <T extends string>(
    value: T,
    setFilters: React.Dispatch<React.SetStateAction<Record<T, FilterMode>>>,
  ): void => {
    setFilters((current) => ({
      ...current,
      [value]:
        current[value] === "off"
          ? "include"
          : current[value] === "include"
            ? "exclude"
            : "off",
    }));
  };

  const filterClass = (mode: FilterMode): string =>
    mode === "include" ? "active" : mode === "exclude" ? "exclude" : "";

  const entries = overview
    ? [
        ...overview.volunteers.map((entry, index) => ({
          ...entry,
          category: "Ehrenamtliche" as const,
          key: `volunteer-${index}`,
        })),
        ...overview.partners.map((entry, index) => ({
          ...entry,
          category: "Kooperationspartner" as const,
          key: `partner-${index}`,
        })),
      ]
        .filter((entry) => {
          const normalizedQuery = query.trim().toLocaleLowerCase("de");
          const fullName = `${entry.firstName} ${entry.lastName}`.toLocaleLowerCase(
            "de",
          );
          const reverseName = `${entry.lastName} ${entry.firstName}`.toLocaleLowerCase(
            "de",
          );
          const matchesName =
            !normalizedQuery ||
            fullName.includes(normalizedQuery) ||
            reverseName.includes(normalizedQuery);

          const consent = entry.mediaConsentLevel ?? "none";
          const consentModes = Object.values(consentFilters);
          const hasConsentInclusions = consentModes.includes("include");
          const consentMode = consentFilters[consent];
          const matchesConsent =
            (!hasConsentInclusions || consentMode === "include") &&
            consentMode !== "exclude";

          const categoryModes = Object.values(categoryFilters);
          const hasCategoryInclusions = categoryModes.includes("include");
          const categoryMode = categoryFilters[entry.category];
          const matchesCategory =
            (!hasCategoryInclusions || categoryMode === "include") &&
            categoryMode !== "exclude";

          return matchesName && matchesConsent && matchesCategory;
        })
        .sort((left, right) => {
          const comparison =
            sortField === "name"
              ? `${left.lastName} ${left.firstName}`.localeCompare(
                  `${right.lastName} ${right.firstName}`,
                  "de",
                )
              : left.category.localeCompare(right.category, "de");
          return sortAscending ? comparison : -comparison;
        })
    : [];

  const consentFilterOptions: Array<[ConsentFilter, string, string]> = [
    ["green", "🟢", getMediaConsentDescription("green")],
    ["yellow", "🟡", getMediaConsentDescription("yellow")],
    ["red", "🔴", getMediaConsentDescription("red")],
    ["none", "⚪", "Keine Medienfreigabe erfasst"],
  ];

  return (
    <div className="public-relations-page">
      <header className="public-relations-header">
        <div>
          <h1>Öffentlichkeitsarbeit</h1>
          <p>
            Übersicht der Ehrenamtlichen und Kooperationspartner mit ihrem
            Einverständnis zu Bild und Ton.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="public-relations-message">Wird geladen...</p>
      ) : error ? (
        <div className="public-relations-error" role="alert">
          <p>Die Übersicht konnte nicht geladen werden: {error}</p>
          <button
            className="btn btn-secondary"
            onClick={() => void loadOverview()}
          >
            Erneut versuchen
          </button>
        </div>
      ) : overview ? (
        <>
          <div className="public-relations-search">
            <Search
              size={16}
              className="public-relations-search-icon"
              aria-hidden="true"
            />
            <input
              className="input public-relations-search-input"
              type="search"
              placeholder="Name suchen..."
              aria-label="Nach Namen suchen"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="public-relations-filters">
            <div className="public-relations-filter-group">
              <span className="public-relations-filter-label">
                Einverständnis:
              </span>
              <div className="public-relations-filter-chips">
                {consentFilterOptions.map(([status, icon, description]) => (
                  <button
                    key={status}
                    type="button"
                    className={`public-relations-filter-chip ${filterClass(consentFilters[status])}`}
                    onClick={() => cycleFilter(status, setConsentFilters)}
                    title={description}
                    aria-pressed={consentFilters[status] !== "off"}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="public-relations-filter-group">
              <span className="public-relations-filter-label">Kategorie:</span>
              <div className="public-relations-filter-chips">
                {(
                  ["Ehrenamtliche", "Kooperationspartner"] as CategoryFilter[]
                ).map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`public-relations-filter-chip ${filterClass(categoryFilters[category])}`}
                    onClick={() => cycleFilter(category, setCategoryFilters)}
                    title={category}
                    aria-pressed={categoryFilters[category] !== "off"}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {entries.length === 0 ? (
            <p className="public-relations-empty">
              Keine Einträge vorhanden.
            </p>
          ) : (
            <div className="public-relations-table-wrap">
              <table className="public-relations-table">
                <colgroup>
                  <col className="public-relations-column-name" />
                  <col className="public-relations-column-consent" />
                  <col className="public-relations-column-category" />
                </colgroup>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      aria-sort={
                        sortField === "name"
                          ? sortAscending
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className="public-relations-sort-button"
                        onClick={() => {
                          if (sortField === "name") {
                            setSortAscending((ascending) => !ascending);
                          } else {
                            setSortField("name");
                            setSortAscending(true);
                          }
                        }}
                      >
                        Name
                        {sortField === "name" && (
                          <span aria-hidden="true">
                            {sortAscending ? "↑" : "↓"}
                          </span>
                        )}
                      </button>
                    </th>
                    <th scope="col">Einverständnis Bild und Ton</th>
                    <th
                      scope="col"
                      aria-sort={
                        sortField === "category"
                          ? sortAscending
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className="public-relations-sort-button"
                        onClick={() => {
                          if (sortField === "category") {
                            setSortAscending((ascending) => !ascending);
                          } else {
                            setSortField("category");
                            setSortAscending(true);
                          }
                        }}
                      >
                        Kategorie
                        {sortField === "category" && (
                          <span aria-hidden="true">
                            {sortAscending ? "↑" : "↓"}
                          </span>
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.key}>
                      <td>
                        <span className="public-relations-name">
                          {entry.firstName} {entry.lastName}
                        </span>
                        {entry.organization && (
                          <span className="public-relations-organization">
                            {entry.organization}
                          </span>
                        )}
                      </td>
                      <td>
                        {entry.mediaConsentLevel ? (
                          <span
                            className={`public-relations-consent-icon public-relations-consent-icon--${entry.mediaConsentLevel}`}
                            title={`Foto & Video: ${getMediaConsentDescription(entry.mediaConsentLevel)}${
                              entry.consentDocumentStatus !== "complete"
                                ? " · Unterschriebenes Dokument fehlt noch"
                                : ""
                            }`}
                            aria-label={`Einverständnis Bild und Ton: ${CONSENT_LABELS[entry.mediaConsentLevel]}${
                              entry.consentDocumentStatus !== "complete"
                                ? ", unterschriebenes Dokument fehlt noch"
                                : ""
                            }`}
                          >
                            {entry.mediaConsentLevel === "green"
                              ? "🟢"
                              : entry.mediaConsentLevel === "yellow"
                                ? "🟡"
                                : "🔴"}
                          </span>
                        ) : (
                          <span
                            className="public-relations-consent-icon public-relations-consent-icon--missing"
                            title="Keine Medienfreigabe erfasst"
                            aria-label="Keine Medienfreigabe erfasst"
                          >
                            ⚪
                          </span>
                        )}
                      </td>
                      <td>{entry.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
