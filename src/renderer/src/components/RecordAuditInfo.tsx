import { format, isValid, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { RecordAuditMetadata } from "@shared/types";

function formatAuditDate(value?: string): string {
  if (!value) return "unbekannt";
  const date = parseISO(value);
  return isValid(date)
    ? format(date, "dd.MM.yyyy HH:mm", { locale: de })
    : "unbekannt";
}

function formatCreated(record: RecordAuditMetadata): string {
  if (!record._createdBy && !record._createdAt) {
    return "Erstellt: unbekannt (Altbestand)";
  }

  return `Erstellt: ${record._createdBy || "unbekannt"} · ${formatAuditDate(record._createdAt)}`;
}

export default function RecordAuditInfo({
  record,
}: {
  record: RecordAuditMetadata;
}): JSX.Element {
  const hasEditMetadata = Boolean(record._updatedBy || record._updatedAt);
  const lastTouchedBy = record._updatedBy || record._createdBy;

  return (
    <details
      className="record-audit-info"
      style={{
        marginTop: "0.25rem",
      }}
    >
      <summary
        style={{
          color: "var(--color-text-muted)",
          cursor: "pointer",
          fontSize: "0.75rem",
        }}
      >
        Verlauf{lastTouchedBy ? ` (zuletzt: ${lastTouchedBy})` : ""}
      </summary>
      <div
        style={{
          color: "var(--color-text-muted)",
          display: "flex",
          flexWrap: "wrap",
          gap: "0 1rem",
          fontSize: "0.75rem",
          lineHeight: 1.5,
          marginTop: "0.25rem",
          paddingLeft: "1rem",
        }}
      >
        <div style={{ whiteSpace: "nowrap" }}>{formatCreated(record)}</div>
        {hasEditMetadata && (
          <div style={{ whiteSpace: "nowrap" }}>
            Bearbeitet: {record._updatedBy || "unbekannt"} ·{" "}
            {formatAuditDate(record._updatedAt)}
          </div>
        )}
      </div>
    </details>
  );
}
