import { useState } from "react";
import PrivacyPolicy from "./PrivacyPolicy";
import "./ConsentDialog.css";

interface ConsentDialogProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function ConsentDialog({
  onAccept,
  onDecline,
}: ConsentDialogProps): JSX.Element {
  const [showFullPolicy, setShowFullPolicy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="consent-overlay">
      <div className="consent-dialog">
        <div className="consent-header">
          <h2>Willkommen bei Kleiner Stern</h2>
          <p className="consent-subtitle">Ehrenamtliche Verwaltung</p>
        </div>

        <div className="consent-body">
          {!showFullPolicy ? (
            <>
              <div className="consent-intro">
                <h3>Datenschutz und Einwilligung</h3>
                <p>
                  Bevor Sie diese Anwendung nutzen können, müssen Sie der
                  Verarbeitung personenbezogener Daten gemäß der
                  Datenschutz-Grundverordnung (DSGVO) zustimmen.
                </p>
              </div>

              <div className="consent-highlights">
                <h4>Wichtige Informationen:</h4>
                <ul>
                  <li>
                    ✅ Alle Daten werden{" "}
                    <strong>lokal auf Ihrem Computer</strong> gespeichert
                  </li>
                  <li>
                    ✅ <strong>Keine Übertragung</strong> an externe Server oder
                    Dritte
                  </li>
                  <li>
                    ⚠️ Daten werden{" "}
                    <strong>unverschlüsselt als JSON-Dateien</strong>{" "}
                    gespeichert
                  </li>
                  <li>
                    ⚠️ Bei Cloud-Sync (OneDrive, etc.) gelten zusätzliche
                    Anforderungen
                  </li>
                </ul>
              </div>

              <div className="consent-data-types">
                <h4>Verarbeitete Daten:</h4>
                <p>
                  Name, Geburtsdatum, Kontaktdaten (Telefon, E-Mail, Adresse),
                  Notfallkontakte, Tätigkeiten, Aktivitätsprotokolle, Notizen
                  und Erinnerungen
                </p>
              </div>

              <div className="consent-purpose">
                <h4>Zweck:</h4>
                <p>
                  Verwaltung und Koordination ehrenamtlicher Tätigkeiten,
                  Kontaktaufnahme, Erinnerungen, Dokumentation
                </p>
              </div>

              <div className="consent-rights">
                <h4>Ihre Rechte:</h4>
                <p>
                  Sie haben jederzeit das Recht auf Auskunft, Berichtigung,
                  Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
                  und Widerspruch (Art. 15-21 DSGVO).
                </p>
              </div>

              <button
                className="consent-link-button"
                onClick={() => setShowFullPolicy(true)}
              >
                📄 Vollständige Datenschutzerklärung anzeigen
              </button>

              <div className="consent-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                  />
                  <span>
                    Ich habe die Datenschutzerklärung gelesen und stimme der
                    Verarbeitung meiner Daten zu. Mir ist bewusst, dass ich
                    diese Einwilligung jederzeit widerrufen kann.
                  </span>
                </label>
              </div>
            </>
          ) : (
            <div className="consent-full-policy">
              <PrivacyPolicy />
              <button
                className="consent-back-button"
                onClick={() => setShowFullPolicy(false)}
              >
                ← Zurück zur Zusammenfassung
              </button>
            </div>
          )}
        </div>

        <div className="consent-actions">
          {!showFullPolicy && (
            <>
              <button
                className="consent-button consent-decline"
                onClick={onDecline}
              >
                Ablehnen
              </button>
              <button
                className="consent-button consent-accept"
                onClick={onAccept}
                disabled={!acknowledged}
                title={
                  acknowledged
                    ? ""
                    : "Bitte bestätigen Sie die Datenschutzerklärung"
                }
              >
                Zustimmen und fortfahren
              </button>
            </>
          )}
        </div>

        <p className="consent-note">
          Bei Ablehnung kann die Anwendung nicht verwendet werden.
        </p>
      </div>
    </div>
  );
}
