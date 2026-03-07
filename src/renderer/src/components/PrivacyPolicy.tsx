import "./PrivacyPolicy.css";

interface PrivacyPolicyProps {
  compact?: boolean;
}

export default function PrivacyPolicy({
  compact = false,
}: PrivacyPolicyProps): JSX.Element {
  if (compact) {
    return (
      <div className="privacy-policy-compact">
        <h3>Datenschutz-Kurzinfo</h3>
        <p>
          Diese Anwendung speichert personenbezogene Daten von Ehrenamtlichen
          lokal auf Ihrem Computer. Es werden keine Daten an externe Server
          übertragen.
        </p>
      </div>
    );
  }

  return (
    <div className="privacy-policy">
      <h2>Datenschutzerklärung</h2>
      <p className="privacy-version">Version 1.0 – Stand: März 2025</p>

      <section>
        <h3>1. Verantwortliche Stelle</h3>
        <p>
          Der Verantwortliche für die Datenverarbeitung ist die Organisation
          bzw. der Verein, der diese Software einsetzt. Die Software selbst
          überträgt keine Daten an Dritte.
        </p>
      </section>

      <section>
        <h3>2. Erhobene Daten</h3>
        <p>
          Die Anwendung verarbeitet folgende personenbezogene Daten der
          Ehrenamtlichen:
        </p>
        <ul>
          <li>Name, Vorname</li>
          <li>Geburtsdatum</li>
          <li>Kontaktdaten (Telefon, Mobiltelefon, E-Mail, Adresse)</li>
          <li>Notfallkontakte</li>
          <li>Tätigkeiten und Rollen im Verein</li>
          <li>Aktivitätsprotokolle</li>
          <li>Notizen und Erinnerungen</li>
        </ul>
      </section>

      <section>
        <h3>3. Zweck der Datenverarbeitung</h3>
        <p>Die Daten werden ausschließlich verarbeitet für:</p>
        <ul>
          <li>Verwaltung und Koordination ehrenamtlicher Tätigkeiten</li>
          <li>Kontaktaufnahme im Rahmen der ehrenamtlichen Arbeit</li>
          <li>Erinnerungen an wichtige Termine (z.B. Geburtstage)</li>
          <li>Dokumentation der geleisteten Arbeit</li>
        </ul>
        <p>
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO
          (Einwilligung) bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          an ordnungsgemäßer Vereinsverwaltung)
        </p>
      </section>

      <section>
        <h3>4. Datenspeicherung</h3>
        <p>
          Alle Daten werden <strong>lokal</strong> auf Ihrem Computer
          gespeichert. Sie wählen selbst den Speicherort.
        </p>
        <p className="privacy-warning">
          ⚠️ <strong>Wichtig:</strong> Wenn Sie einen
          Cloud-Synchronisationsordner (z.B. OneDrive, SharePoint) wählen, wird
          die Datenverarbeitung auf externe Server von Microsoft ausgelagert. In
          diesem Fall benötigen Sie einen Auftragsverarbeitungsvertrag (AVV) mit
          Microsoft und müssen dies in Ihrer Datenschutzerklärung dokumentieren.
        </p>
        <p>
          Die Daten werden im <strong>JSON-Format ohne Verschlüsselung</strong>{" "}
          gespeichert. Stellen Sie sicher, dass nur berechtigte Personen Zugriff
          auf den Speicherort haben.
        </p>
      </section>

      <section>
        <h3>5. Keine externe Datenübertragung</h3>
        <p>
          Diese Software sendet <strong>keine Daten</strong> an externe Server,
          Analyse-Dienste oder den Hersteller. Es erfolgt kein Tracking, keine
          Telemetrie, keine Verbindung zu externen Diensten.
        </p>
      </section>

      <section>
        <h3>6. Rechte der betroffenen Personen</h3>
        <p>Jede ehrenamtliche Person hat folgende Rechte gemäß DSGVO:</p>
        <ul>
          <li>
            <strong>Auskunftsrecht (Art. 15 DSGVO):</strong> Recht auf Kopie der
            gespeicherten Daten
          </li>
          <li>
            <strong>Berichtigung (Art. 16 DSGVO):</strong> Recht auf Korrektur
            falscher Daten
          </li>
          <li>
            <strong>Löschung (Art. 17 DSGVO):</strong> Recht auf Löschung der
            Daten
          </li>
          <li>
            <strong>Einschränkung (Art. 18 DSGVO):</strong> Recht auf
            Einschränkung der Verarbeitung
          </li>
          <li>
            <strong>Datenübertragbarkeit (Art. 20 DSGVO):</strong> Recht auf
            Erhalt der Daten in strukturiertem Format
          </li>
          <li>
            <strong>Widerspruch (Art. 21 DSGVO):</strong> Recht, der
            Verarbeitung zu widersprechen
          </li>
        </ul>
        <p>
          <strong>Umsetzung:</strong> Die gespeicherten JSON-Dateien können
          jederzeit eingesehen, exportiert, bearbeitet oder gelöscht werden.
          Kontaktieren Sie dafür den Administrator Ihrer Organisation.
        </p>
      </section>

      <section>
        <h3>7. Speicherdauer</h3>
        <p>
          Die Daten werden so lange gespeichert, wie dies für die ehrenamtliche
          Tätigkeit erforderlich ist. Nach Beendigung der Tätigkeit sollten die
          Daten gemäß den Aufbewahrungsfristen Ihrer Organisation gelöscht oder
          archiviert werden.
        </p>
      </section>

      <section>
        <h3>8. Sicherheitsmaßnahmen</h3>
        <p className="privacy-warning">
          ⚠️ <strong>Hinweis:</strong> Diese Software bietet derzeit:
        </p>
        <ul>
          <li>✅ Automatische Backups vor jeder Änderung</li>
          <li>✅ Versionskontrolle zur Vermeidung von Konflikten</li>
          <li>
            ❌ <strong>KEINE Verschlüsselung der gespeicherten Daten</strong>
          </li>
          <li>
            ❌ <strong>KEINE Zugriffskontrolle oder Authentifizierung</strong>
          </li>
          <li>
            ❌{" "}
            <strong>KEINE Audit-Logs zur Nachverfolgung von Zugriffen</strong>
          </li>
        </ul>
        <p>
          <strong>Empfehlung:</strong> Speichern Sie die Daten auf einem
          Laufwerk mit aktivierter Festplattenverschlüsselung (z.B. BitLocker)
          und beschränken Sie die Dateisystem-Berechtigungen auf autorisierte
          Benutzer.
        </p>
      </section>

      <section>
        <h3>9. Verantwortung der Organisation</h3>
        <p>Als Betreiber dieser Software sind Sie verpflichtet:</p>
        <ul>
          <li>
            Ein Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO) zu
            führen
          </li>
          <li>
            Die Ehrenamtlichen über die Datenverarbeitung zu informieren (Art.
            13 DSGVO)
          </li>
          <li>Technisch-organisatorische Maßnahmen (TOM) zu dokumentieren</li>
          <li>
            Bei Cloud-Speicherung einen AVV mit dem Cloud-Anbieter abzuschließen
          </li>
          <li>
            Anfragen zu Betroffenenrechten innerhalb von 30 Tagen zu beantworten
          </li>
        </ul>
      </section>

      <section>
        <h3>10. Änderungen der Datenschutzerklärung</h3>
        <p>
          Diese Datenschutzerklärung kann bei Updates der Software angepasst
          werden. Sie werden bei wesentlichen Änderungen erneut um Ihre
          Zustimmung gebeten.
        </p>
      </section>

      <section>
        <h3>11. Aufsichtsbehörde</h3>
        <p>
          Bei Beschwerden können Sie sich an die zuständige
          Datenschutz-Aufsichtsbehörde Ihres Bundeslandes wenden.
        </p>
      </section>

      <footer className="privacy-footer">
        <p>
          <strong>Open Source Software</strong>
          <br />
          Diese Software ist unter Apache License 2.0 lizenziert und wird ohne
          Gewährleistung bereitgestellt. Der Quellcode ist öffentlich einsehbar
          auf GitHub.
        </p>
      </footer>
    </div>
  );
}
