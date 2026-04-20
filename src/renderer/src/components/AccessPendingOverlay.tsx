import { ShieldAlert } from "lucide-react";
import "./AccessPendingOverlay.css";

interface AccessPendingOverlayProps {
  currentUser: string;
  message?: string;
  onOpenSettings: () => void;
  onRetry: () => void;
  variant?: "access-pending" | "folder-setup";
}

export default function AccessPendingOverlay({
  currentUser,
  message,
  onOpenSettings,
  onRetry,
  variant = "access-pending",
}: AccessPendingOverlayProps): JSX.Element {
  const isFolderSetup = variant === "folder-setup";

  return (
    <div className="access-pending-overlay" role="dialog" aria-modal="true">
      <div className="access-pending-card">
        <div className="access-pending-icon">
          <ShieldAlert size={28} />
        </div>
        <h2>
          {isFolderSetup
            ? "Kein verbundener Datenordner"
            : "Freigabe durch eine andere Person erforderlich"}
        </h2>
        <p className="access-pending-subtitle">
          {isFolderSetup ? (
            <>
              Der ausgewaehlte Ordner ist noch nicht initialisiert oder noch
              nicht vollstaendig mit OneDrive oder SharePoint synchronisiert.
              Bitte pruefen Sie die Verbindung in den Einstellungen.
            </>
          ) : (
            <>
              Ihr Zugriff auf den Datenordner wurde angefragt, aber{" "}
              <strong>
                eine andere Person, die bereits freigegeben ist, muss Ihre
                Anfrage bestaetigen
              </strong>
              . Sie selbst koennen die Freigabe nicht durchfuehren.
            </>
          )}
        </p>

        <div className="access-pending-details">
          <div>
            <strong>Ihr Benutzer:</strong> {currentUser || "unbekannt"}
          </div>
          {message && <div>{message}</div>}
        </div>

        <ol className="access-pending-steps">
          {isFolderSetup ? (
            <>
              <li>
                Oeffnen Sie die Einstellungen und waehlen Sie den gewuenschten
                Datenordner aus.
              </li>
              <li>
                Klicken Sie auf &quot;Verbindung pruefen&quot;, wenn der Ordner
                bereits existieren sollte.
              </li>
              <li>
                Initialisieren Sie den Ordner nur dann neu, wenn es wirklich ein
                neuer, leerer Ordner ist.
              </li>
            </>
          ) : (
            <>
              <li>
                <strong>
                  Kontaktieren Sie eine Person, die bereits Zugriff hat
                </strong>
                , und bitten Sie diese, Ihre Anfrage freizugeben.
              </li>
              <li>
                Die andere Person findet Ihre Anfrage in ihren Einstellungen
                unter &quot;Zugriffsanfragen&quot;.
              </li>
              <li>
                Sobald die Freigabe erteilt wurde, klicken Sie hier auf
                &quot;Erneut pruefen&quot;.
              </li>
            </>
          )}
        </ol>

        <div className="access-pending-actions">
          <button className="btn btn-secondary" onClick={onOpenSettings}>
            Zu Einstellungen
          </button>
          <button className="btn btn-primary" onClick={onRetry}>
            {isFolderSetup ? "Verbindung pruefen" : "Erneut pruefen"}
          </button>
        </div>
      </div>
    </div>
  );
}
