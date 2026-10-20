import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Mail,
  Phone,
  Search,
} from "lucide-react";
import { VolunteerContact } from "@shared/types";
import "./VolunteerContacts.css";

type SortField = "name" | "phone" | "mobile" | "email" | "roles";

export default function VolunteerContacts(): JSX.Element {
  const [contacts, setContacts] = useState<VolunteerContact[]>([]);
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAscending, setSortAscending] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    window.api
      .getVolunteerContacts()
      .then((result) => {
        if (!cancelled) setContacts(result);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(String(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de");
    return contacts
      .filter((contact) => {
        const name = `${contact.firstName} ${contact.lastName}`.toLocaleLowerCase(
          "de",
        );
        const phoneNumbers = `${contact.phone ?? ""} ${contact.mobile ?? ""}`.toLocaleLowerCase(
          "de",
        );
        const email = (contact.email ?? "").toLocaleLowerCase("de");
        const roles = contact.roles.join(" ").toLocaleLowerCase("de");
        return (
          !normalizedQuery ||
          name.includes(normalizedQuery) ||
          phoneNumbers.includes(normalizedQuery) ||
          email.includes(normalizedQuery) ||
          roles.includes(normalizedQuery)
        );
      })
      .sort((left, right) => {
        const leftValue =
          sortField === "name"
            ? `${left.lastName} ${left.firstName}`
            : sortField === "roles"
              ? left.roles.join(", ")
            : (left[sortField] ?? "");
        const rightValue =
          sortField === "name"
            ? `${right.lastName} ${right.firstName}`
            : sortField === "roles"
              ? right.roles.join(", ")
            : (right[sortField] ?? "");
        const comparison = leftValue.localeCompare(rightValue, "de", {
          numeric: sortField === "phone" || sortField === "mobile",
          sensitivity: "base",
        });
        return sortAscending ? comparison : -comparison;
      });
  }, [contacts, query, sortAscending, sortField]);

  const handleSort = (field: SortField): void => {
    if (sortField === field) {
      setSortAscending((ascending) => !ascending);
      return;
    }

    setSortField(field);
    setSortAscending(true);
  };

  const renderSortIcon = (field: SortField): JSX.Element => {
    if (sortField !== field) return <ArrowUpDown size={14} aria-hidden="true" />;
    return sortAscending ? (
      <ArrowUp size={14} aria-hidden="true" />
    ) : (
      <ArrowDown size={14} aria-hidden="true" />
    );
  };

  return (
    <div className="volunteer-contacts-page">
      <div className="page-header-row">
        <div>
          <h1>Ehrenamtliche Kontakte</h1>
          <p className="text-muted">
            Namen, Kontaktdaten und Aufgaben aller Ehrenamtlichen
          </p>
        </div>
      </div>

      <div className="volunteer-contacts-search">
        <Search
          className="volunteer-contacts-search-icon"
          size={18}
          aria-hidden="true"
        />
        <input
          className="input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, Kontaktdaten oder Aufgabe suchen..."
          aria-label="Name, Kontaktdaten oder Aufgabe suchen"
        />
      </div>

      {loading && <p className="text-muted">Lade Kontakte...</p>}
      {error && <p className="volunteer-contacts-error">{error}</p>}

      {!loading && !error && filteredContacts.length === 0 && (
        <p className="text-muted">
          {contacts.length === 0
            ? "Keine Ehrenamtlichen vorhanden."
            : "Keine passenden Kontakte gefunden."}
        </p>
      )}

      {!loading && !error && filteredContacts.length > 0 && (
        <div className="volunteer-contacts-table-wrapper">
          <table className="volunteer-contacts-table">
            <thead>
              <tr>
                {(
                  [
                    ["name", "Name"],
                    ["phone", "Telefon"],
                    ["mobile", "Mobil"],
                    ["email", "E-Mail"],
                    ["roles", "Aufgaben"],
                  ] as const
                ).map(([field, label]) => (
                  <th
                    key={field}
                    aria-sort={
                      sortField === field
                        ? sortAscending
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className="volunteer-contacts-sort-button"
                      onClick={() => handleSort(field)}
                    >
                      {label}
                      {renderSortIcon(field)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact, index) => {
                const name =
                  `${contact.firstName} ${contact.lastName}`.trim() ||
                  "Unbekannt";

                return (
                  <tr key={`${name}-${index}`}>
                    <td>{name}</td>
                    <td>
                      {contact.phone ? (
                        <a
                          className="volunteer-contact-number"
                          href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                        >
                          <Phone size={15} aria-hidden="true" />
                          {contact.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {contact.mobile ? (
                        <a
                          className="volunteer-contact-number"
                          href={`tel:${contact.mobile.replace(/[^\d+]/g, "")}`}
                        >
                          <Phone size={15} aria-hidden="true" />
                          {contact.mobile}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {contact.email ? (
                        <a
                          className="volunteer-contact-number"
                          href={`mailto:${contact.email}`}
                        >
                          <Mail size={15} aria-hidden="true" />
                          {contact.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {contact.roles.length > 0
                        ? contact.roles.join(", ")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
