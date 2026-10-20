import { useCallback, useEffect, useMemo, useState } from "react";
import { FilePlus2, Search, Upload, X } from "lucide-react";
import ContactActions from "../components/ContactActions";
import Snackbar from "../components/Snackbar";
import {
  InternReadOnlyOverview,
  InternReadOnlyEntry,
  REQUIREMENT_DEFINITIONS,
} from "@shared/types";
import "./InternOverview.css";

type OverviewEntry = InternReadOnlyEntry & {
  category: "Ehrenamtliche" | "Kooperationspartner";
  entityType: "volunteer" | "partner";
  key: string;
};

export default function InternOverview(): JSX.Element {
  const [overview, setOverview] = useState<InternReadOnlyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<OverviewEntry | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        entityType: "volunteer" as const,
        key: `volunteer-${index}`,
      })),
      ...overview.partners.map((entry, index) => ({
        ...entry,
        category: "Kooperationspartner" as const,
        entityType: "partner" as const,
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
            und Kooperationspartnern. Bestehende Akten bleiben verborgen; Sie
            können neue Akte-Einträge hinzufügen.
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
                  <col className="intern-overview-column-akte" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Kontakt</th>
                    <th scope="col">Qualifikationen &amp; Nachweise</th>
                    <th scope="col">Kategorie</th>
                    <th scope="col">Akte</th>
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
                      <td className="intern-overview-category">
                        {entry.category}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary intern-overview-add-file"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <FilePlus2 size={15} /> Hinzufügen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {selectedEntry && (
            <InternAkteForm
              entry={selectedEntry}
              onClose={() => setSelectedEntry(null)}
              onSuccess={() => {
                setSelectedEntry(null);
                setSuccessMessage("Akte-Eintrag erfolgreich erstellt.");
              }}
            />
          )}
        </>
      ) : null}
      {successMessage && (
        <Snackbar
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}
    </div>
  );
}

function InternAkteForm({
  entry,
  onClose,
  onSuccess,
}: {
  entry: OverviewEntry;
  onClose: () => void;
  onSuccess: () => void;
}): JSX.Element {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const result = await window.api.addInternFileRecord(
        entry.entityType,
        entry.id,
        title,
        description,
        selectedFilePath,
      );
      if (!result.success) {
        setError(
          result.error || "Der Akte-Eintrag konnte nicht hinzugefügt werden.",
        );
        return;
      }
      onSuccess();
    } catch (saveError) {
      setError(String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const selectFile = async (): Promise<void> => {
    try {
      setSelectedFilePath((await window.api.selectFile()) || undefined);
    } catch (selectError) {
      setError(String(selectError));
    }
  };

  return (
    <div className="intern-akte-overlay">
      <form className="intern-akte-form card" onSubmit={handleSubmit}>
        <div className="intern-akte-form-header">
          <div>
            <h2>Neuer Akte-Eintrag</h2>
            <p>
              Für {entry.firstName} {entry.lastName} · {entry.category}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Formular schließen"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <label>
          Titel *
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Beschreibung
          <textarea
            className="textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="intern-akte-file-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void selectFile()}
          >
            <Upload size={15} /> Datei auswählen
          </button>
          <span>
            {selectedFilePath?.split(/[\\/]/).pop() || "Datei optional"}
          </span>
        </div>
        {error && (
          <p className="intern-akte-error" role="alert">
            {error}
          </p>
        )}
        <div className="intern-akte-form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !title.trim()}
          >
            {saving ? "Wird hinzugefügt..." : "Akte-Eintrag hinzufügen"}
          </button>
        </div>
      </form>
    </div>
  );
}
