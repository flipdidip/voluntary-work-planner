import { useState, useEffect } from "react";
import { FolderOpen, Save, Info } from "lucide-react";
import { AppSettings } from "@shared/types";
import "./Settings.css";

export default function Settings(): JSX.Element {
  const [dataPath, setDataPath] = useState("");
  const [interval, setInterval] = useState(60);
  const [saved, setSaved] = useState(false);
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    window.api.getDataPath().then(setDataPath);
    window.api.getAppVersion().then(setAppVersion);
  }, []);

  const handleSelectFolder = async (): Promise<void> => {
    const path = await window.api.selectDataFolder();
    if (path) setDataPath(path);
  };

  const handleSave = async (): Promise<void> => {
    if (dataPath) {
      await window.api.setDataPath(dataPath);
    }
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
