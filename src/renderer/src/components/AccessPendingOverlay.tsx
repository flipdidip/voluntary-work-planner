import { ShieldAlert } from "lucide-react";
import "./AccessPendingOverlay.css";

interface AccessPendingOverlayProps {
  currentUser: string;
  message?: string;
  onOpenSettings: () => void;
  onRetry: () => void;
}

export default function AccessPendingOverlay({
  currentUser,
  message,
  onOpenSettings,
  onRetry,
}: AccessPendingOverlayProps): JSX.Element {
  return (
    <div className="access-pending-overlay" role="dialog" aria-modal="true">
      <div className="access-pending-card">
        <div className="access-pending-icon">
          <ShieldAlert size={28} />
        </div>
        <h2>Zugriff wartet auf Freigabe</h2>
        <p className="access-pending-subtitle">
          Dieser Benutzer ist fuer den aktuell gewaehlten Datenordner noch nicht
          freigegeben.
        </p>

        <div className="access-pending-details">
          <div>
            <strong>Benutzer:</strong> {currentUser || "unbekannt"}
          </div>
          {message && <div>{message}</div>}
        </div>

        <ol className="access-pending-steps">
          <li>
            Ein bereits freigegebener Benutzer muss die Anfrage bestaetigen.
          </li>
          <li>
            Die Freigabe erfolgt in den Einstellungen unter "Zugriffsanfragen".
          </li>
          <li>Danach hier auf "Erneut pruefen" klicken.</li>
        </ol>

        <div className="access-pending-actions">
          <button className="btn btn-secondary" onClick={onOpenSettings}>
            Zu Einstellungen
          </button>
          <button className="btn btn-primary" onClick={onRetry}>
            Erneut pruefen
          </button>
        </div>
      </div>
    </div>
  );
}
