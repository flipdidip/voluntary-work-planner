import { useState, useEffect } from "react";
import { FolderOpen, Save, Info, Shield } from "lucide-react";
import {
  AppSettings,
  EncryptionAuditEntry,
  EncryptionStatus,
  EnrollmentRequestSummary,
} from "@shared/types";
import PrivacyPolicy from "../components/PrivacyPolicy";
import "./Settings.css";

const DATA_FOLDER_CHANGED_EVENT = "vwp:data-folder-changed";

export default function Settings(): JSX.Element {
  const [dataPath, setDataPath] = useState("");
  const [interval, setInterval] = useState(60);
  const [saved, setSaved] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const [enableYearlyBirthday, setEnableYearlyBirthday] = useState(true);
  const [enableRoundBirthday, setEnableRoundBirthday] = useState(true);
  const [roundYears, setRoundYears] = useState<number[]>([50, 60, 70, 80, 90]);
  const [enableJoinedDateAnniversary, setEnableJoinedDateAnniversary] =
    useState(true);
  const [joinedDateAnniversaryYears, setJoinedDateAnniversaryYears] = useState<
    number[]
  >([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
  const [enableActivityTimeAnniversary, setEnableActivityTimeAnniversary] =
    useState(true);
  const [activityTimeAnniversaryYears, setActivityTimeAnniversaryYears] =
    useState<number[]>([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [consentDate, setConsentDate] = useState<string | undefined>();
  const [encryptionStatus, setEncryptionStatus] =
    useState<EncryptionStatus | null>(null);
  const [pendingRequests, setPendingRequests] = useState<
    EnrollmentRequestSummary[]
  >([]);
  const [auditEntries, setAuditEntries] = useState<EncryptionAuditEntry[]>([]);
  const [approving, setApproving] = useState(false);
  const [requestActionFingerprint, setRequestActionFingerprint] = useState<
    string | null
  >(null);
  const [rotating, setRotating] = useState(false);

  const refreshEncryptionStatus = async (): Promise<void> => {
    try {
      const [status, requests, audit] = await Promise.all([
        window.api.getEncryptionStatus(),
        window.api.getPendingEnrollments(),
        window.api.getEncryptionAuditLog(),
      ]);
      setEncryptionStatus(status);
      setPendingRequests(requests);
      setAuditEntries(audit);
    } catch {
      setEncryptionStatus(null);
      setPendingRequests([]);
      setAuditEntries([]);
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString("de-DE");
  };

  const shortFingerprint = (fingerprint: string): string => {
    return `${fingerprint.slice(0, 12)}...${fingerprint.slice(-8)}`;
  };

  useEffect(() => {
    window.api.getDataPath().then(setDataPath);
    window.api.getAppVersion().then(setAppVersion);
    refreshEncryptionStatus();
    window.api.getSettings().then((settings) => {
      setInterval(settings.reminderCheckIntervalMinutes);
      setEnableYearlyBirthday(settings.enableYearlyBirthdayReminders);
      setConsentDate(settings.privacyConsentDate);
      setEnableRoundBirthday(settings.enableRoundBirthdayReminders);
      setRoundYears(settings.roundBirthdayYears);
      setEnableJoinedDateAnniversary(
        settings.enableJoinedDateAnniversaryReminders,
      );
      setJoinedDateAnniversaryYears(settings.joinedDateAnniversaryYears);
      setEnableActivityTimeAnniversary(
        settings.enableActivityTimeAnniversaryReminders,
      );
      setActivityTimeAnniversaryYears(settings.activityTimeAnniversaryYears);
    });
  }, []);

  const handleSelectFolder = async (): Promise<void> => {
    const path = await window.api.selectDataFolder();
    if (path) {
      setDataPath(path);
      await refreshEncryptionStatus();
      window.dispatchEvent(new Event(DATA_FOLDER_CHANGED_EVENT));
    }
  };

  const handleApproveEnrollments = async (): Promise<void> => {
    setApproving(true);
    try {
      const result = await window.api.approvePendingEnrollments();
      if (!result.success) {
        alert(result.error || "Freigaben konnten nicht verarbeitet werden.");
      } else if (result.approvedCount > 0) {
        alert(`${result.approvedCount} Zugriffsanfrage(n) wurden freigegeben.`);
      }
      await refreshEncryptionStatus();
    } finally {
      setApproving(false);
    }
  };

  const handleApproveEnrollment = async (
    keyFingerprint: string,
  ): Promise<void> => {
    setRequestActionFingerprint(keyFingerprint);
    try {
      const result = await window.api.approveEnrollment(keyFingerprint);
      if (!result.success) {
        alert(result.error || "Freigabe konnte nicht durchgeführt werden.");
      }
      await refreshEncryptionStatus();
    } finally {
      setRequestActionFingerprint(null);
    }
  };

  const handleRejectEnrollment = async (
    keyFingerprint: string,
  ): Promise<void> => {
    setRequestActionFingerprint(keyFingerprint);
    try {
      const result = await window.api.rejectEnrollment(keyFingerprint);
      if (!result.success) {
        alert(result.error || "Ablehnung konnte nicht durchgeführt werden.");
      }
      await refreshEncryptionStatus();
    } finally {
      setRequestActionFingerprint(null);
    }
  };

  const handleRotateEncryptionKey = async (): Promise<void> => {
    if (
      !window.confirm(
        "Den Datenschlüssel jetzt rotieren? Alle gespeicherten Dateien werden dabei neu verschlüsselt.",
      )
    ) {
      return;
    }

    setRotating(true);
    try {
      const result = await window.api.rotateEncryptionKey();
      if (!result.success) {
        alert(result.error || "Schlüsselrotation ist fehlgeschlagen.");
      } else {
        alert(
          `${result.rotatedFileCount} Datei(en) wurden mit dem neuen Datenschlüssel neu verschlüsselt.`,
        );
      }
      await refreshEncryptionStatus();
    } finally {
      setRotating(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (dataPath) {
      await window.api.setDataPath(dataPath);
      window.dispatchEvent(new Event(DATA_FOLDER_CHANGED_EVENT));
    }
    await window.api.saveSettings({
      reminderCheckIntervalMinutes: interval,
      enableYearlyBirthdayReminders: enableYearlyBirthday,
      enableRoundBirthdayReminders: enableRoundBirthday,
      roundBirthdayYears: roundYears,
      enableJoinedDateAnniversaryReminders: enableJoinedDateAnniversary,
      joinedDateAnniversaryYears: joinedDateAnniversaryYears,
      enableActivityTimeAnniversaryReminders: enableActivityTimeAnniversary,
      activityTimeAnniversaryYears: activityTimeAnniversaryYears,
    });
    await refreshEncryptionStatus();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Einstellungen</h1>
      </div>

      <div className="settings-card card">
        <h2>Datenordner</h2>
        <p className="hint">
          Wähle den OneDrive / SharePoint-synchronisierten Ordner, in dem die
          Daten gespeichert werden.
        </p>
        <div className="folder-row">
          <input
            className="input"
            value={dataPath}
            readOnly
            placeholder="Kein Ordner ausgewählt..."
          />
          <button className="btn btn-secondary" onClick={handleSelectFolder}>
            <FolderOpen size={16} /> Auswählen
          </button>
        </div>

        {dataPath && (
          <div className="path-info">
            <Info size={14} />
            <span>
              Daten werden gespeichert in: <code>{dataPath}</code>
            </span>
          </div>
        )}

        {encryptionStatus && (
          <div className="path-info" style={{ marginTop: "0.6rem" }}>
            <Info size={14} />
            <span>
              <strong>Verschlüsselung:</strong>{" "}
              {encryptionStatus.authorized
                ? "aktiv und freigegeben"
                : "aktiv, Freigabe ausstehend"}
              {encryptionStatus.message ? ` (${encryptionStatus.message})` : ""}
            </span>
          </div>
        )}

        {encryptionStatus && (
          <div className="path-info" style={{ marginTop: "0.5rem" }}>
            <Info size={14} />
            <span>
              Aktueller Benutzer: <code>{encryptionStatus.currentUser}</code>
            </span>
          </div>
        )}

        {encryptionStatus && encryptionStatus.authorized && (
          <div className="path-info" style={{ marginTop: "0.5rem" }}>
            <Info size={14} />
            <span>
              Offene Zugriffsanfragen: {encryptionStatus.pendingRequestCount}
            </span>
            {encryptionStatus.pendingRequestCount > 0 && (
              <button
                className="btn btn-secondary"
                style={{ marginLeft: "1rem" }}
                onClick={handleApproveEnrollments}
                disabled={approving}
              >
                {approving ? "Freigabe läuft..." : "Anfragen freigeben"}
              </button>
            )}
          </div>
        )}

        {encryptionStatus?.authorized && (
          <div className="security-section">
            <div className="security-section-header">
              <h3>Zugriffsanfragen</h3>
              <span className="hint">
                Neue Windows-Benutzer muessen einmalig freigegeben werden.
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <p className="hint">Keine offenen Anfragen.</p>
            ) : (
              <div className="request-list">
                {pendingRequests.map((request) => {
                  const isBusy =
                    requestActionFingerprint === request.keyFingerprint;
                  return (
                    <div key={request.keyFingerprint} className="request-item">
                      <div className="request-meta">
                        <strong>
                          {request.userName}@{request.machineName}
                        </strong>
                        <span className="hint">
                          Angefragt am {formatTimestamp(request.requestedAt)}
                        </span>
                        <span className="hint">
                          Fingerprint:{" "}
                          {shortFingerprint(request.keyFingerprint)}
                        </span>
                      </div>
                      <div className="request-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            handleApproveEnrollment(request.keyFingerprint)
                          }
                          disabled={isBusy}
                        >
                          {isBusy ? "Bitte warten..." : "Freigeben"}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() =>
                            handleRejectEnrollment(request.keyFingerprint)
                          }
                          disabled={isBusy}
                        >
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {encryptionStatus?.authorized && (
          <div className="security-section">
            <div className="security-section-header">
              <h3>Schluesselrotation</h3>
              <span className="hint">
                Erzeugt einen neuen Datenschluessel und verschluesselt alle
                gespeicherten Dateien neu.
              </span>
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleRotateEncryptionKey}
              disabled={rotating}
            >
              {rotating
                ? "Schluessel wird rotiert..."
                : "Datenschluessel rotieren"}
            </button>
          </div>
        )}

        {encryptionStatus && (
          <details className="security-section audit-collapsible">
            <summary className="audit-summary">
              <span className="audit-summary-main">
                <span className="security-section-header">
                  <h3>Audit-Protokoll</h3>
                  <span className="hint">
                    Nachvollziehbarkeit fuer Freigaben und Schluesselereignisse.
                  </span>
                </span>
                <span className="audit-summary-hint" aria-hidden="true">
                  Aufklappen
                </span>
              </span>
            </summary>

            <div className="audit-content">
              {auditEntries.length === 0 ? (
                <p className="hint">Noch keine Protokolleintraege vorhanden.</p>
              ) : (
                <div className="audit-list">
                  {auditEntries.map((entry) => (
                    <div
                      key={`${entry.timestamp}-${entry.action}-${entry.target || ""}`}
                      className="audit-item"
                    >
                      <div className="audit-item-header">
                        <strong>{entry.action}</strong>
                        <span className="hint">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                      <div className="hint">Akteur: {entry.actor}</div>
                      {entry.target && (
                        <div className="hint">
                          Ziel: {shortFingerprint(entry.target)}
                        </div>
                      )}
                      {entry.details && (
                        <div className="hint">{entry.details}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        )}
      </div>

      <div className="settings-card card">
        <h2>Erinnerungen</h2>
        <label>
          Prüfintervall (Minuten)
          <input
            className="input interval-input"
            type="number"
            min={5}
            max={1440}
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value) || 60)}
          />
        </label>
        <p className="hint">
          Wie oft soll die App prüfen, ob Erinnerungen fällig sind? (Standard:
          60 Minuten). Die App prüft auch beim Start.
        </p>

        <div className="birthday-reminders">
          <h3 className="birthday-reminders-title">Geburtstagserinnerungen</h3>
          <p className="hint birthday-reminders-hint">
            Diese Einstellungen gelten für alle Freiwilligen mit hinterlegtem
            Geburtsdatum.
          </p>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={enableYearlyBirthday}
              onChange={(e) => setEnableYearlyBirthday(e.target.checked)}
            />
            <span>Jährliche Geburtstagserinnerungen aktivieren</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={enableRoundBirthday}
              onChange={(e) => setEnableRoundBirthday(e.target.checked)}
            />
            <span>Erinnerungen für runde Geburtstage aktivieren</span>
          </label>
        </div>

        {enableRoundBirthday && (
          <div className="round-years-section">
            <label className="round-years-label">Runde Geburtstage</label>
            <div className="round-years-grid">
              {[30, 40, 50, 60, 70, 75, 80, 85, 90, 95, 100].map((year) => (
                <button
                  key={year}
                  type="button"
                  className={`btn ${roundYears.includes(year) ? "btn-primary" : "btn-secondary"} year-btn`}
                  onClick={() => {
                    setRoundYears((prev) =>
                      prev.includes(year)
                        ? prev.filter((y) => y !== year)
                        : [...prev, year].sort((a, b) => a - b),
                    );
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="birthday-reminders anniversary-reminders">
          <h3 className="birthday-reminders-title">Jubiläumserinnerungen</h3>

          {/* Joined Date Anniversaries */}
          <div className="anniversary-option">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enableJoinedDateAnniversary}
                onChange={(e) =>
                  setEnableJoinedDateAnniversary(e.target.checked)
                }
              />
              <span>Erinnerungen für Eintrittsdatum-Jubiläen aktivieren</span>
            </label>
            <p className="hint birthday-reminders-hint">
              Basierend auf dem Eintrittsdatum (Wie lange registriert).
            </p>
          </div>

          {enableJoinedDateAnniversary && (
            <div className="round-years-section">
              <label className="round-years-label">
                Eintrittsdatum-Jubiläumsjahre
              </label>
              <div className="round-years-grid">
                {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((year) => (
                  <button
                    key={`joined-${year}`}
                    type="button"
                    className={`btn ${joinedDateAnniversaryYears.includes(year) ? "btn-primary" : "btn-secondary"} year-btn`}
                    onClick={() => {
                      setJoinedDateAnniversaryYears((prev) =>
                        prev.includes(year)
                          ? prev.filter((y) => y !== year)
                          : [...prev, year].sort((a, b) => a - b),
                      );
                    }}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Activity Time Anniversaries */}
          <div className="anniversary-option anniversary-option-spaced">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enableActivityTimeAnniversary}
                onChange={(e) =>
                  setEnableActivityTimeAnniversary(e.target.checked)
                }
              />
              <span>Erinnerungen für Aktivitätszeit-Jubiläen aktivieren</span>
            </label>
            <p className="hint birthday-reminders-hint">
              Basierend auf der gesamten Aktivitätszeit (nicht nur
              Registrierungsdatum).
            </p>
          </div>

          {enableActivityTimeAnniversary && (
            <div className="round-years-section">
              <label className="round-years-label">
                Aktivitätszeit-Jubiläumsjahre
              </label>
              <div className="round-years-grid">
                {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((year) => (
                  <button
                    key={`activity-${year}`}
                    type="button"
                    className={`btn ${activityTimeAnniversaryYears.includes(year) ? "btn-primary" : "btn-secondary"} year-btn`}
                    onClick={() => {
                      setActivityTimeAnniversaryYears((prev) =>
                        prev.includes(year)
                          ? prev.filter((y) => y !== year)
                          : [...prev, year].sort((a, b) => a - b),
                      );
                    }}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="settings-card card">
        <h2>Info</h2>
        <div className="info-grid">
          <span>Version</span>
          <span>{appVersion || "—"}</span>
          <span>Lizenz</span>
          <span>Apache 2.0</span>
          <span>Projekt</span>
          <a
            href="https://github.com/flipdidip/voluntary-work-planner"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
        <div className="legal-notice">
          <strong>Rechtlicher Hinweis:</strong> Diese Software wird als
          Open-Source-Projekt ohne Gewährleistung bereitgestellt. Sie stellt
          keine zertifizierte medizinische Software dar. Der jeweilige Betreiber
          ist selbst verantwortlich für die Einhaltung der DSGVO und aller
          sonstigen gesetzlichen Vorschriften.
        </div>
      </div>

      <div className="settings-card card">
        <h2>
          <Shield
            size={20}
            style={{ verticalAlign: "middle", marginRight: "8px" }}
          />
          Datenschutz (DSGVO)
        </h2>
        <p className="hint">
          Informationen zum Datenschutz und zur Verarbeitung personenbezogener
          Daten
        </p>

        <div className="consent-info">
          <p>
            ✅ Die Anwendung verschlüsselt Datensätze, Backups und Anhänge im
            ausgewählten Datenordner. Bei gemeinsam genutzten Ordnern werden
            zusätzliche Benutzer erst nach Freigabe durch einen bereits
            autorisierten Benutzer zugelassen.
          </p>
        </div>

        {consentDate && (
          <div className="consent-info">
            <p>
              ✅ Einwilligung erteilt am:{" "}
              <strong>
                {new Date(consentDate).toLocaleDateString("de-DE")}
              </strong>
            </p>
          </div>
        )}

        <button
          className="btn btn-secondary"
          onClick={() => setShowPrivacyPolicy(!showPrivacyPolicy)}
          style={{ marginTop: "1rem" }}
        >
          {showPrivacyPolicy
            ? "Datenschutzerklärung ausblenden"
            : "Datenschutzerklärung anzeigen"}
        </button>

        {showPrivacyPolicy && (
          <div className="privacy-policy-container">
            <PrivacyPolicy />
          </div>
        )}

        <div className="dsgvo-recommendations">
          <h3>⚠️ Organisatorische Pflichten trotz App-Schutzmaßnahmen:</h3>
          <ul>
            <li>
              Führen Sie ein{" "}
              <strong>Verzeichnis von Verarbeitungstätigkeiten</strong> (Art. 30
              DSGVO)
            </li>
            <li>
              Dokumentieren Sie Ihre{" "}
              <strong>technisch-organisatorischen Maßnahmen</strong> (TOM)
            </li>
            <li>
              Bei Cloud-Speicherung: Schließen Sie einen{" "}
              <strong>Auftragsverarbeitungsvertrag (AVV)</strong> mit dem
              Anbieter
            </li>
            <li>
              Nutzen Sie zusätzlich <strong>Festplattenverschlüsselung</strong>
              (z.B. BitLocker) und schützen Sie OneDrive-/SharePoint-Zugriffe
              organisatorisch
            </li>
            <li>
              Legen Sie fest, <strong>wer neue Benutzer freigeben darf</strong>,
              und prüfen Sie das Audit-Protokoll regelmäßig
            </li>
            <li>
              Berücksichtigen Sie, dass beim Öffnen verschlüsselter Anhänge
              vorübergehend lokale Temp-Dateien entstehen können
            </li>
          </ul>
        </div>
      </div>

      <div className="settings-actions">
        {saved && (
          <span className="success-msg">Einstellungen gespeichert!</span>
        )}
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={15} /> Speichern
        </button>
      </div>
    </div>
  );
}
