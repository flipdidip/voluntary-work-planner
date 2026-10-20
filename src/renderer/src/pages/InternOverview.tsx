import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import ContactActions from "../components/ContactActions";
import {
  InternReadOnlyOverview,
  InternReadOnlyEntry,
  REQUIREMENT_DEFINITIONS,
} from "@shared/types";
import "./InternOverview.css";

type OverviewEntry = InternReadOnlyEntry & {
  category: "Ehrenamtliche" | "Kooperationspartner";
  key: string;
};

export default function InternOverview(): JSX.Element {
  const [overview, setOverview] = useState<InternReadOnlyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const loadOverview = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await window.api.getInternReadOnlyOverview());
    } catch (loadError) {
      setError(String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const entries = useMemo<OverviewEntry[]>(() => {
    if (!overview) return [];

    const allEntries: OverviewEntry[] = [
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
    ];
    const normalizedQuery = query.trim().toLocaleLowerCase("de");

    return allEntries
      .filter((entry) => {
        if (!normalizedQuery) return true;
        const searchableText = [
          entry.firstName,
          entry.lastName,
          entry.phone,
          entry.mobile,
          entry.email,
          entry.organization,
          ...entry.qualifications.map(
            (qualification) =>
              REQUIREMENT_DEFINITIONS[qualification.requirementType].label,
          ),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("de");
        return searchableText.includes(normalizedQuery);
      })
      .sort((left, right) =>
        `${left.lastName} ${left.firstName}`.localeCompare(
          `${right.lastName} ${right.firstName}`,
          "de",
        ),
      );
  }, [overview, query]);

  return (
    <div className="intern-overview-page">
      <header className="intern-overview-header">
        <div>
          <h1>Interne Übersicht</h1>
          <p>
            Freigegebene Kontaktdaten und Qualifikationen von Ehrenamtlichen
            und Kooperationspartnern. Diese Übersicht ist schreibgeschützt.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="intern-overview-message">Wird geladen...</p>
      ) : error ? (
        <div className="intern-overview-error" role="alert">
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
          <div className="intern-overview-search">
            <Search
              size={16}
              className="intern-overview-search-icon"
              aria-hidden="true"
            />
            <input
              className="input intern-overview-search-input"
              type="search"
              placeholder="Name oder Qualifikation suchen..."
              aria-label="Nach Name oder Qualifikation suchen"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {entries.length === 0 ? (
            <p className="intern-overview-empty">
              Keine freigegebenen Einträge vorhanden.
            </p>
          ) : (
            <div className="intern-overview-table-wrap">
              <table className="intern-overview-table">
                <colgroup>
                  <col className="intern-overview-column-name" />
                  <col className="intern-overview-column-contacts" />
                  <col className="intern-overview-column-qualifications" />
                  <col className="intern-overview-column-category" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Kontakt</th>
                    <th scope="col">Qualifikationen &amp; Nachweise</th>
                    <th scope="col">Kategorie</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.key}>
                      <td>
                        <span className="intern-overview-name">
                          {entry.firstName} {entry.lastName}
                        </span>
                        {entry.organization && (
                          <span className="intern-overview-organization">
                            {entry.organization}
                          </span>
                        )}
                      </td>
                      <td>
                        <ContactActions
                          phone={entry.phone}
                          mobile={entry.mobile}
                          email={entry.email}
                        />
                      </td>
                      <td>
                        <div className="intern-overview-qualifications">
                          {entry.qualifications.map((qualification) => {
                            const definition =
                              REQUIREMENT_DEFINITIONS[
                                qualification.requirementType
                              ];
                            const shortLabel = definition.label
                              .split(" ")[0]
                              .substring(0, 3)
                              .toUpperCase();
                            const statusLabel =
                              qualification.status === "complete"
                                ? "Vollständig"
                                : qualification.status === "expired"
                                  ? "Abgelaufen"
                                  : "Fehlend";

                            return (
                              <span
                                key={qualification.requirementType}
                                className={`requirement-chip requirement-chip--${qualification.status === "missing" ? "missing" : qualification.status}`}
                                title={`${definition.label}: ${statusLabel}`}
                                aria-label={`${definition.label}: ${statusLabel}`}
                              >
                                {shortLabel}
                              </span>
                            );
                          })}
                        </div>
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
