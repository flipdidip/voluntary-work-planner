import { useEffect, useState } from "react";
import {
  Copy,
  FileText,
  FolderOpen,
  Info,
  Plus,
  Save,
  Shield,
  Trash2,
} from "lucide-react";
import {
  BusinessAuditEntry,
  EncryptionAuditEntry,
  EncryptionStatus,
  EnrollmentRequestSummary,
  ProcessingActivitiesDocument,
  ProcessingActivityRecord,
  createDefaultProcessingActivitiesDocument,
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
  const [businessAuditEntries, setBusinessAuditEntries] = useState<
    BusinessAuditEntry[]
  >([]);
  const [approving, setApproving] = useState(false);
  const [requestActionFingerprint, setRequestActionFingerprint] = useState<
    string | null
  >(null);
  const [rotating, setRotating] = useState(false);
  const [processingDocument, setProcessingDocument] =
    useState<ProcessingActivitiesDocument | null>(null);
  const [selectedProcessingActivityId, setSelectedProcessingActivityId] =
    useState("");
  const [exportingProcessingActivities, setExportingProcessingActivities] =
    useState(false);
  const [exportingBusinessAudit, setExportingBusinessAudit] = useState(false);

  const refreshEncryptionStatus = async (): Promise<void> => {
    const [statusResult, requestsResult, auditResult, businessAuditResult] =
      await Promise.allSettled([
        window.api.getEncryptionStatus(),
        window.api.getPendingEnrollments(),
        window.api.getEncryptionAuditLog(),
        window.api.getBusinessAuditLog(),
      ]);

    if (statusResult.status === "fulfilled") {
      setEncryptionStatus(statusResult.value);
    } else {
      setEncryptionStatus(null);
    }

    if (requestsResult.status === "fulfilled") {
      setPendingRequests(requestsResult.value);
    } else {
      setPendingRequests([]);
    }

    if (auditResult.status === "fulfilled") {
      setAuditEntries(auditResult.value);
    } else {
      setAuditEntries([]);
    }

    if (businessAuditResult.status === "fulfilled") {
      setBusinessAuditEntries(businessAuditResult.value);
    } else {
      setBusinessAuditEntries([]);
    }
  };

  const handleExportBusinessAudit = async (): Promise<void> => {
    if (!dataPath) {
      alert("Bitte zuerst einen Datenordner auswaehlen.");
      return;
    }

    setExportingBusinessAudit(true);
    try {
      const result = await window.api.exportBusinessAuditMarkdown();
      if (!result.success) {
        alert(result.error || "Export fehlgeschlagen.");
        return;
      }

      if (!result.canceled && result.filePath) {
        alert(`Export gespeichert: ${result.filePath}`);
      }
    } finally {
      setExportingBusinessAudit(false);
    }
  };

  const loadProcessingActivities = async (): Promise<void> => {
    try {
      const document = await window.api.getProcessingActivities();
      const nextDocument =
        document || createDefaultProcessingActivitiesDocument();
      setProcessingDocument(nextDocument);
      setSelectedProcessingActivityId(nextDocument.activities[0]?.id || "");
    } catch {
      const fallback = createDefaultProcessingActivitiesDocument();
      setProcessingDocument(fallback);
      setSelectedProcessingActivityId(fallback.activities[0]?.id || "");
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString("de-DE");
  };

  const shortFingerprint = (fingerprint: string): string => {
    return `${fingerprint.slice(0, 12)}...${fingerprint.slice(-8)}`;
  };

  const multilineToList = (value: string): string[] =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const listToMultiline = (items: string[]): string => items.join("\n");

  useEffect(() => {
    window.api.getDataPath().then(setDataPath);
    window.api.getAppVersion().then(setAppVersion);
    refreshEncryptionStatus();
    loadProcessingActivities();
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

  useEffect(() => {
    if (!processingDocument) return;
    const selectedExists = processingDocument.activities.some(
      (activity) => activity.id === selectedProcessingActivityId,
    );
    if (!selectedExists) {
      setSelectedProcessingActivityId(
        processingDocument.activities[0]?.id || "",
      );
    }
  }, [processingDocument, selectedProcessingActivityId]);

  const activeProcessingActivity = processingDocument?.activities.find(
    (activity) => activity.id === selectedProcessingActivityId,
  );

  const updateProcessingActivity = (
    activityId: string,
    updater: (activity: ProcessingActivityRecord) => ProcessingActivityRecord,
  ): void => {
    setProcessingDocument((current) => {
      if (!current) return current;

      return {
        ...current,
        activities: current.activities.map((activity) =>
          activity.id === activityId ? updater(activity) : activity,
        ),
      };
    });
  };

  const handleSelectFolder = async (): Promise<void> => {
    const path = await window.api.selectDataFolder();
    if (path) {
      setDataPath(path);
      await refreshEncryptionStatus();
      await loadProcessingActivities();
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

  const handleAddProcessingActivity = (): void => {
    const newActivity: ProcessingActivityRecord = {
      id: `activity-${Date.now()}`,
      name: "Neue Verarbeitungstaetigkeit",
      controllerName: "",
      controllerContact: "",
      dataProtectionContact: "",
      purposes: "",
      categoriesOfSubjects: [],
      categoriesOfData: [],
      legalBases: [],
      recipients: [],
      processors: [],
      thirdCountryTransfers: "",
      retentionPolicy: "",
      technicalMeasures: [],
      organizationalMeasures: [],
      systems: [],
      notes: "",
      lastReviewedAt: undefined,
    };

    setProcessingDocument((current) => {
      const base = current || createDefaultProcessingActivitiesDocument();
      return {
        ...base,
        activities: [...base.activities, newActivity],
      };
    });
    setSelectedProcessingActivityId(newActivity.id);
  };

  const handleDuplicateProcessingActivity = (): void => {
    if (!activeProcessingActivity) return;

    const duplicate: ProcessingActivityRecord = {
      ...activeProcessingActivity,
      id: `activity-${Date.now()}`,
      name: `${activeProcessingActivity.name} (Kopie)`,
    };

    setProcessingDocument((current) => {
      if (!current) return current;
      return {
        ...current,
        activities: [...current.activities, duplicate],
      };
    });
    setSelectedProcessingActivityId(duplicate.id);
  };

  const handleDeleteProcessingActivity = (): void => {
    if (!processingDocument || !activeProcessingActivity) return;

    if (processingDocument.activities.length <= 1) {
      alert(
        "Mindestens eine Verarbeitungstaetigkeit sollte vorhanden bleiben.",
      );
      return;
    }

    const remaining = processingDocument.activities.filter(
      (activity) => activity.id !== activeProcessingActivity.id,
    );
    setProcessingDocument({
      ...processingDocument,
      activities: remaining,
    });
    setSelectedProcessingActivityId(remaining[0]?.id || "");
  };

  const persistProcessingActivities = async (): Promise<boolean> => {
    if (!dataPath || !processingDocument) {
      return true;
    }

    const result =
      await window.api.saveProcessingActivities(processingDocument);
    if (!result.success || !result.document) {
      alert(
        result.error ||
          "Das Verzeichnis von Verarbeitungstaetigkeiten konnte nicht gespeichert werden.",
      );
      return false;
    }

    setProcessingDocument(result.document);
    return true;
  };

  const handleExportProcessingActivities = async (): Promise<void> => {
    if (!dataPath) {
      alert("Bitte zuerst einen Datenordner auswaehlen.");
      return;
    }

    const savedSuccessfully = await persistProcessingActivities();
    if (!savedSuccessfully) return;

    setExportingProcessingActivities(true);
    try {
      const result = await window.api.exportProcessingActivitiesMarkdown();
      if (!result.success) {
        alert(result.error || "Export fehlgeschlagen.");
        return;
      }

      if (!result.canceled && result.filePath) {
        alert(`Export gespeichert: ${result.filePath}`);
      }
    } finally {
      setExportingProcessingActivities(false);
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

    const savedSuccessfully = await persistProcessingActivities();
    if (!savedSuccessfully) return;

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
        <div className="processing-header">
          <div>
            <h2>Aktivitaetsprotokoll</h2>
            <p className="hint processing-header-hint">
              Vollstaendiges Protokoll fuer betriebliche Aktionen wie Anlegen,
              Aktualisieren und Loeschen von Ehrenamtlichen sowie Datei- und
              Art.30-Aktivitaeten.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={handleExportBusinessAudit}
            disabled={!dataPath || exportingBusinessAudit}
          >
            <FileText size={16} />
            {exportingBusinessAudit
              ? "Export laeuft..."
              : "Aktivitaetslog exportieren"}
          </button>
        </div>

        <details className="security-section audit-collapsible">
          <summary className="audit-summary">
            <span className="audit-summary-main">
              <span className="security-section-header">
                <h3>Aktivitaetseintraege</h3>
                <span className="hint">
                  Nachvollziehbarkeit fuer operative Datenaenderungen.
                </span>
              </span>
              <span className="audit-summary-hint" aria-hidden="true">
                Aufklappen
              </span>
            </span>
          </summary>

          <div className="audit-content">
            {businessAuditEntries.length === 0 ? (
              <p className="hint">Noch keine Aktivitaetseintraege vorhanden.</p>
            ) : (
              <div className="audit-list">
                {businessAuditEntries.map((entry) => (
                  <div
                    key={`${entry.timestamp}-${entry.action}-${entry.subjectId || ""}`}
                    className="audit-item"
                  >
                    <div className="audit-item-header">
                      <strong>{entry.action}</strong>
                      <span className="hint">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    <div className="hint">Akteur: {entry.actor}</div>
                    <div className="hint">
                      Objekt: {entry.subjectType}
                      {entry.subjectId ? ` (${entry.subjectId})` : ""}
                    </div>
                    {entry.details && (
                      <div className="hint">{entry.details}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
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
              Nutzen Sie zusätzlich <strong>Festplattenverschlüsselung</strong>{" "}
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

      <div className="settings-card card">
        <div className="processing-header">
          <div>
            <h2>
              <FileText
                size={20}
                style={{ verticalAlign: "middle", marginRight: "8px" }}
              />
              Verzeichnis von Verarbeitungstaetigkeiten
            </h2>
            <p className="hint processing-header-hint">
              Art. 30 DSGVO: Pflegen Sie hier Ihre Verarbeitungstaetigkeiten und
              exportieren Sie das Verzeichnis als Markdown für interne
              Dokumentation oder weitere Abstimmung.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={handleExportProcessingActivities}
            disabled={!dataPath || exportingProcessingActivities}
          >
            <FileText size={16} />
            {exportingProcessingActivities
              ? "Export laeuft..."
              : "Markdown exportieren"}
          </button>
        </div>

        {!dataPath ? (
          <div className="processing-empty-state">
            Bitte zuerst einen Datenordner auswaehlen. Das Verzeichnis wird
            verschluesselt im Datenordner gespeichert.
          </div>
        ) : (
          <>
            <div className="processing-toolbar">
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleAddProcessingActivity}
              >
                <Plus size={16} /> Neue Taetigkeit
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleDuplicateProcessingActivity}
                disabled={!activeProcessingActivity}
              >
                <Copy size={16} /> Duplizieren
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={handleDeleteProcessingActivity}
                disabled={!activeProcessingActivity}
              >
                <Trash2 size={16} /> Loeschen
              </button>
            </div>

            <div className="processing-meta-grid">
              <div>
                <span className="hint">Version</span>
                <strong>{processingDocument?._version || 1}</strong>
              </div>
              <div>
                <span className="hint">Letzte Aktualisierung</span>
                <strong>
                  {processingDocument?._updatedAt
                    ? formatTimestamp(processingDocument._updatedAt)
                    : "Noch nicht gespeichert"}
                </strong>
              </div>
            </div>

            <div className="processing-layout">
              <div className="processing-sidebar">
                {(processingDocument?.activities || []).map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    className={`processing-nav-item ${activity.id === selectedProcessingActivityId ? "active" : ""}`}
                    onClick={() => setSelectedProcessingActivityId(activity.id)}
                  >
                    <strong>{activity.name || "Unbenannte Taetigkeit"}</strong>
                    <span className="hint">
                      {activity.legalBases[0] || "Rechtsgrundlage ergaenzen"}
                    </span>
                  </button>
                ))}
              </div>

              {activeProcessingActivity ? (
                <div className="processing-editor">
                  <div className="processing-form-grid">
                    <label>
                      Name der Verarbeitungstaetigkeit
                      <input
                        className="input"
                        value={activeProcessingActivity.name}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              name: e.target.value,
                            }),
                          )
                        }
                      />
                    </label>

                    <label>
                      Verantwortlicher
                      <input
                        className="input"
                        value={activeProcessingActivity.controllerName}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              controllerName: e.target.value,
                            }),
                          )
                        }
                      />
                    </label>

                    <label>
                      Kontakt Verantwortlicher
                      <textarea
                        className="textarea"
                        value={activeProcessingActivity.controllerContact}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              controllerContact: e.target.value,
                            }),
                          )
                        }
                      />
                    </label>

                    <label>
                      Datenschutzkontakt
                      <textarea
                        className="textarea"
                        value={activeProcessingActivity.dataProtectionContact}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              dataProtectionContact: e.target.value,
                            }),
                          )
                        }
                      />
                    </label>

                    <label className="processing-field-full">
                      Zwecke der Verarbeitung
                      <textarea
                        className="textarea"
                        value={activeProcessingActivity.purposes}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              purposes: e.target.value,
                            }),
                          )
                        }
                      />
                    </label>

                    <label>
                      Kategorien betroffener Personen
                      <textarea
                        className="textarea"
                        value={listToMultiline(
                          activeProcessingActivity.categoriesOfSubjects,
                        )}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              categoriesOfSubjects: multilineToList(
                                e.target.value,
                              ),
                            }),
                          )
                        }
                      />
                    </label>

                    <label>
                      Kategorien personenbezogener Daten
                      <textarea
                        className="textarea"
                        value={listToMultiline(
                          activeProcessingActivity.categoriesOfData,
                        )}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              categoriesOfData: multilineToList(e.target.value),
                            }),
                          )
                        }
                      />
                    </label>

                    <label>
                      Rechtsgrundlagen
                      <textarea
                        className="textarea"
                        value={listToMultiline(
                          activeProcessingActivity.legalBases,
                        )}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              legalBases: multilineToList(e.target.value),
                            }),
                          )
                        }
                      />
                    </label>

                    <label>
                      Empfaenger
                      <textarea
                        className="textarea"
                        value={listToMultiline(
                          activeProcessingActivity.recipients,
                        )}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              recipients: multilineToList(e.target.value),
                            }),
                          )
                        }
                      />
                    </label>

                    <label>
                      Auftragsverarbeiter
                      <textarea
                        className="textarea"
                        value={listToMultiline(
                          activeProcessingActivity.processors,
                        )}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              processors: multilineToList(e.target.value),
                            }),
                          )
                        }
                      />
                    </label>

                    <label>
                      Systeme und Speicherorte
                      <textarea
                        className="textarea"
                        value={listToMultiline(
                          activeProcessingActivity.systems,
                        )}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              systems: multilineToList(e.target.value),
                            }),
                          )
                        }
                      />
                    </label>

                    <label className="processing-field-full">
                      Drittlandtransfer
                      <textarea
                        className="textarea"
                        value={activeProcessingActivity.thirdCountryTransfers}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              thirdCountryTransfers: e.target.value,
                            }),
                          )
                        }
                      />
                    </label>

                    <label className="processing-field-full">
                      Speicherfristen und Loeschkonzept
                      <textarea
                        className="textarea"
                        value={activeProcessingActivity.retentionPolicy}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              retentionPolicy: e.target.value,
                            }),
                          )
                        }
                      />
                    </label>

                    <label>
                      Technische Massnahmen
                      <textarea
                        className="textarea"
                        value={listToMultiline(
                          activeProcessingActivity.technicalMeasures,
                        )}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              technicalMeasures: multilineToList(
                                e.target.value,
                              ),
                            }),
                          )
                        }
                      />
                    </label>

                    <label>
                      Organisatorische Massnahmen
                      <textarea
                        className="textarea"
                        value={listToMultiline(
                          activeProcessingActivity.organizationalMeasures,
                        )}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              organizationalMeasures: multilineToList(
                                e.target.value,
                              ),
                            }),
                          )
                        }
                      />
                    </label>

                    <label>
                      Letzte Pruefung
                      <input
                        className="input"
                        type="date"
                        value={activeProcessingActivity.lastReviewedAt || ""}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              lastReviewedAt: e.target.value || undefined,
                            }),
                          )
                        }
                      />
                    </label>

                    <label className="processing-field-full">
                      Notizen
                      <textarea
                        className="textarea"
                        value={activeProcessingActivity.notes}
                        onChange={(e) =>
                          updateProcessingActivity(
                            activeProcessingActivity.id,
                            (activity) => ({
                              ...activity,
                              notes: e.target.value,
                            }),
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="processing-empty-state">
                  Keine Verarbeitungstaetigkeit ausgewaehlt.
                </div>
              )}
            </div>
          </>
        )}
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
