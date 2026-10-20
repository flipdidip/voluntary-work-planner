import { Archive } from "lucide-react";
import type { DeletedArchivedRecord } from "@shared/types";
import "./PendingRequestsNoticeModal.css";
import "./ArchivedRecordsDeletedModal.css";

interface ArchivedRecordsDeletedModalProps {
  records: DeletedArchivedRecord[];
  onDismiss: () => void;
}

export default function ArchivedRecordsDeletedModal({
  records,
  onDismiss,
}: ArchivedRecordsDeletedModalProps): JSX.Element {
  return (
    <div className="pending-requests-overlay" role="dialog" aria-modal="true">
      <div className="pending-requests-card archived-deleted-card">
        <div className="pending-requests-icon">
          <Archive size={28} />
        </div>

        <h2>Archivierte Datensätze gelöscht</h2>
        <p className="pending-requests-subtitle">
          Beim Start wurden automatisch {records.length} archivierte{" "}
          {records.length === 1 ? "Datensatz" : "Datensätze"} gelöscht:
        </p>

        <ul className="archived-deleted-list">
          {records.map((record, index) => (
            <li key={`${record.type}-${record.name}-${index}`}>
              <span>{record.name}</span>
              <span className="archived-deleted-type">
                {record.type === "volunteer"
                  ? "Ehrenamtliche(r)"
                  : "Kooperationspartner"}
              </span>
            </li>
          ))}
        </ul>

        <div className="pending-requests-actions">
          <button className="btn btn-primary" onClick={onDismiss}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
