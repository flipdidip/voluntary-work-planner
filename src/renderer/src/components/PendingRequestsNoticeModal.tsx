import { BellRing } from "lucide-react";
import "./PendingRequestsNoticeModal.css";

interface PendingRequestsNoticeModalProps {
  pendingCount: number;
  onOpenSettings: () => void;
  onDismiss: () => void;
}

export default function PendingRequestsNoticeModal({
  pendingCount,
  onOpenSettings,
  onDismiss,
}: PendingRequestsNoticeModalProps): JSX.Element {
  return (
    <div className="pending-requests-overlay" role="dialog" aria-modal="true">
      <div className="pending-requests-card">
        <div className="pending-requests-icon">
          <BellRing size={28} />
        </div>

        <h2>Offene Zugriffsanfragen</h2>
        <p className="pending-requests-subtitle">
          Es {pendingCount === 1 ? "gibt" : "gibt"} aktuell
          <strong> {pendingCount} </strong>
          offene Anfrage{pendingCount === 1 ? "" : "n"} für den ausgewählten
          Datenordner.
        </p>

        <p className="pending-requests-subtitle">
          Wenn Sie für Freigaben zuständig sind, können Sie diese in den
          Einstellungen unter "Zugriffsanfragen" bearbeiten.
        </p>

        <div className="pending-requests-actions">
          <button className="btn btn-secondary" onClick={onDismiss}>
            Später
          </button>
          <button className="btn btn-primary" onClick={onOpenSettings}>
            Zu Einstellungen
          </button>
        </div>
      </div>
    </div>
  );
}
