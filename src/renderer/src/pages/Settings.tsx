import { useState, useEffect } from "react";
import { FolderOpen, Save, Info, Shield } from "lucide-react";
import { AppSettings } from "@shared/types";
import PrivacyPolicy from "../components/PrivacyPolicy";
import "./Settings.css";

export default function Settings(): JSX.Element {
  const [dataPath, setDataPath] = useState("");
  const [interval, setInterval] = useState(60);
  const [saved, setSaved] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const [enableYearlyBirthday, setEnableYearlyBirthday] = useState(true);
  const [enableRoundBirthday, setEnableRoundBirthday] = useState(true);
  const [roundYears, setRoundYears] = useState<number[]>([50, 60, 70, 80, 90]);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [consentDate, setConsentDate] = useState<string | undefined>();

  useEffect(() => {
    window.api.getDataPath().then(setDataPath);
    window.api.getAppVersion().then(setAppVersion);
    window.api.getSettings().then((settings) => {
      setInterval(settings.reminderCheckIntervalMinutes);
      setEnableYearlyBirthday(settings.enableYearlyBirthdayReminders);
      setConsentDate(settings.privacyConsentDate);
      setEnableRoundBirthday(settings.enableRoundBirthdayReminders);
      setRoundYears(
        settings.roundBirthdayYears || [50, 60, 70, 75, 80, 85, 90, 95, 100],
      );
    });
  }, []);

  const handleSelectFolder = async (): Promise<void> => {
    const path = await window.api.selectDataFolder();
    if (path) setDataPath(path);
  };

  const handleSave = async (): Promise<void> => {
    if (dataPath) {
      await window.api.setDataPath(dataPath);
    }
    await window.api.saveSettings({
      reminderCheckIntervalMinutes: interval,
      enableYearlyBirthdayReminders: enableYearlyBirthday,
      enableRoundBirthdayReminders: enableRoundBirthday,
      roundBirthdayYears: roundYears,
    });
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
          <h3>⚠️ Zusätzliche Empfehlungen für DSGVO-Konformität:</h3>
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
              Nutzen Sie <strong>Festplattenverschlüsselung</strong> (z.B.
              BitLocker)
            </li>
            <li>
              Beschränken Sie Dateisystem-Zugriffe auf autorisierte Personen
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
