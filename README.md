# Voluntary Work Planner

**Ehrenamtliche Verwaltung** - Verwaltungssoftware fuer gemeinnuetzige Organisationen.

Entwickelt fuer deutsche gemeinnuetzige Vereine, insbesondere Teams in der Sterbebegleitung und Hospizarbeit.

---

<p align="center">
	<img src="build/icons/big_app.ico" alt="Voluntary Work Planner app icon" width="200" />
</p>

## Funktionen

- Ehrenamtsregister mit detaillierten Personen-, Kontakt- und Qualifikationsdaten.
- Kooperationspartner-Verwaltung mit eigener Seite (gleiche Stammdaten, ohne Qualifikationsbereich).
- Such- und sortierbare Kontaktuebersicht fuer Ehrenamtliche mit Aufgaben und einer gemeinsamen Kontaktspalte. Telefon, Mobilnummer und E-Mail werden als Symbole angezeigt; beim Darueberfahren wird der Wert gezeigt, beim Anklicken kopiert. Die Seite ist fuer Kooperationspartner verfuegbar.
- Oeffentlichkeitsarbeits-Uebersicht mit Name, Telefon, Mobilnummer, E-Mail, Aufgaben und Bild-/Ton-Einwilligung, durchsuchbar und nach Einwilligungsstatus sowie Personenkategorie filterbar.
- Vollzugriff-Benutzer koennen Ehrenamtliche und Kooperationspartner einzeln fuer die Oeffentlichkeitsarbeit freigeben. Neue und bestehende Datensaetze sind standardmaessig verborgen, bis sie ausdruecklich freigegeben werden.
- Interne Uebersicht fuer interne Mitarbeitende mit freigegebenen Kontaktdaten sowie allen Qualifikationen und Nachweisen als farbige Statussymbole mit vollstaendigem Text beim Darueberfahren.
- Vollzugriff-Benutzer koennen Ehrenamtliche und Kooperationspartner einzeln fuer interne Mitarbeitende freigeben. Die Freigabe ist standardmaessig deaktiviert.
- Interne Mitarbeitende koennen neue Akte-Eintraege mit Titel, Beschreibung und optionalem Dateianhang zu freigegebenen Datensaetzen hinzufuegen. Bestehende Akte-Eintraege und Akteninhalte bleiben fuer diese Rolle verborgen.
- Kontaktinformationen werden in der internen Uebersicht, der Oeffentlichkeitsarbeit und der Ehrenamtliche-Kontaktuebersicht als Telefon-, Mobil- und E-Mail-Symbole dargestellt. Der jeweilige Wert ist per Hover sichtbar und kann angeklickt in die Zwischenablage kopiert werden; eine Snackbar bestaetigt den Erfolg oder meldet einen Fehler.
- Sortierung der Ehrenamtlichen- und Kooperationspartnerlisten nach Name und Eintrittsdatum.
- Dateibasierte Speicherung in einem frei waehlbaren Ordner (lokal, OneDrive, SharePoint-Sync).
- Verschluesselung ruhender Daten fuer Index, Ehrenamtsakten, Backups und Anhaenge.
- Mehrbenutzer-Freigabeworkflow fuer gemeinsame Ordner (Anfrage -> Freigabe/Ablehnung).
- Rollenbasierte Zugriffskontrolle: Vollzugriff (primary), Kooperationspartner (partner-only), Oeffentlichkeitsarbeit (public-relations) und interne Mitarbeitende (intern-read-only).
- Audit-Protokoll fuer sicherheitsrelevante Schluesselereignisse (Anfrage, Freigabe, Ablehnung, Rotation).
- Vollstaendiges Aktivitaetsprotokoll fuer betriebliche Aktionen (z.B. Ehrenamtliche anlegen/aktualisieren/loeschen, Dateiaktionen, Art.-30-Aenderungen).
- Rotation des Datenschluessels mit automatischer Neuverschluesselung verwalteter Datendateien.
- Erinnerungssystem fuer Geburtstage, Jubilaeen, benutzerdefinierte Termine und Qualifikationsablauf.
- Dashboard-Statistik mit frei waehlbarem Zeitraum (standardmaessig letztes Jahr): Anfragen und Anfrageherkunft, Aufnahmeprozess, Ehrenamt-Uebersicht, Beendigungsgruende und Gruppentreffen-Teilnahme.
- Dashboard-Statistiken lassen sich als Gesamtuebersicht im CSV-Format exportieren. Jede Statistik-Karte kann inklusive Zeitraum als Bild in die Zwischenablage kopiert werden; eine Snackbar bestaetigt den Erfolg oder meldet Fehler.
- Windows-Benachrichtigungen bei faelligen Erinnerungen plus In-App-Erinnerungsoberflaeche.
- Hell-/Dunkel-Modus mit automatischer Uebernahme der Systemeinstellung (konfigurierbar in den Einstellungen).
- Optimistisches Locking zur Reduzierung von Ueberschreibkonflikten bei synchronisierter Mehrbenutzernutzung.
- In-App-Verwaltung des Verzeichnisses von Verarbeitungstaetigkeiten (Art. 30 DSGVO) inkl. Markdown-Export.
- Optional aktivierbare automatische Loeschung archivierter Ehrenamtlicher und Kooperationspartner nach einer einstellbaren Frist (standardmaessig deaktiviert; Frist: 12 Monate), mit einer In-App-Meldung inklusive Namen beim Start.
- Anzeige, wer Gruppentreffen angelegt hat.
- Gruppentreffen koennen mehrere Dokumente wie Protokolle oder Unterlagen als verschluesselte Anhaenge enthalten; Dokumente lassen sich in der Treffen-Bearbeitung oeffnen und entfernen.
- Erstellungs- und Änderungsnachweis für Qualifikationen und Akte-Einträge mit Benutzer und Zeitpunkt; bei älteren Einträgen ohne verfügbare Angaben werden diese als unbekannt angezeigt.

## Aenderungen in v1.6.0 und im aktuellen Entwicklungszweig

### v1.6.0

- Seite **Ehrenamtliche Kontakte** fuer die Rolle **Nur Kooperationspartner**: Suche nach Name, Kontaktdaten und Aufgaben; Sortierung nach Name, Kontakt und Aufgaben.
- Neue Rolle **Oeffentlichkeitsarbeit** mit einer eigenen, eingeschraenkten Uebersicht der Bild- und Ton-Einwilligungen von Ehrenamtlichen und Kooperationspartnern.
- Die Oeffentlichkeitsarbeits-Uebersicht bietet Namenssuche, Sortierung sowie Ein-/Ausschlussfilter fuer Einwilligungsstufen und Personenkategorien.

### Aktueller Entwicklungszweig (nach v1.7.0)

- Ehrenamtliche und Kooperationspartner koennen nach Name und Eintrittsdatum sortiert werden.
- Gruppentreffen zeigen an, wer den jeweiligen Eintrag erstellt hat.
- Gruppentreffen koennen mit mehreren verschluesselt gespeicherten Dokumenten versehen werden.
- Das Dashboard bietet auswertbare Statistiken fuer einen frei waehlbaren Zeitraum (Voreinstellung: letztes Jahr), inklusive Anfragen, Aufnahmeprozess, Ehrenamtlichen, Beendigungsgruenden und Gruppentreffen-Teilnahme. Der Gesamtbericht kann als CSV exportiert und jede Statistik-Karte samt Zeitraum als Bild in die Zwischenablage kopiert werden.
- Das Geburtstagsfeld loest Aenderungen nur noch aus, wenn sich das Datum tatsaechlich geaendert hat.
- Die automatische Loeschung archivierter Ehrenamtlicher und Kooperationspartner kann in den Einstellungen aktiviert werden und ist standardmaessig deaktiviert. Die einstellbare Frist betraegt standardmaessig zwoelf Monate.
- Nach einer automatischen Loeschung erscheint eine In-App-Meldung im Anwendungsstil, die die Namen der geloeschten Datensaetze auffuehrt.
- Die Ehrenamtliche-Kontaktuebersicht fuer Kooperationspartner bietet Suche und Sortierung nach Name, Kontakt und Aufgaben.
- Die Oeffentlichkeitsarbeits-Uebersicht zeigt Telefon, Mobilnummer, E-Mail und Aufgaben.
- Vollzugriff-Benutzer koennen in den Ehrenamtlichen- und Kooperationspartner-Datensaetzen unter **Freigaben** die Sichtbarkeit fuer Oeffentlichkeitsarbeit einzeln steuern. Die Freigabe ist standardmaessig deaktiviert; alte Datensaetze bleiben verborgen, bis Vollzugriff sie ausdruecklich freigibt. Benutzer mit der Rolle **Oeffentlichkeitsarbeit** sehen nur freigegebene Datensaetze und koennen die Freigabe nicht aendern.
- Neue Rolle **Interne Mitarbeitende (nur Lesezugriff)** mit einer eigenen Uebersicht freigegebener Ehrenamtlicher und Kooperationspartner. Die Uebersicht zeigt Name, Kontakt sowie alle Qualifikationen und Nachweise im Ampelsystem; beim Darueberfahren wird die vollstaendige Bezeichnung und der Status angezeigt.
- Vollzugriff-Benutzer koennen die Sichtbarkeit von Ehrenamtlichen und Kooperationspartnern fuer interne Mitarbeitende einzeln steuern. Die Freigabe ist standardmaessig deaktiviert und unabhaengig von der Oeffentlichkeitsarbeits-Freigabe.
- Interne Mitarbeitende koennen zu freigegebenen Datensaetzen neue Akte-Eintraege mit Titel, Beschreibung und optionaler Datei hinzufuegen. Sie koennen weder bestehende Akte-Eintraege sehen noch Akteninhalte oeffnen oder bearbeiten.
- Kontaktspalten in der Ehrenamtliche-Kontaktuebersicht, der Oeffentlichkeitsarbeit und der internen Uebersicht zeigen Telefon, Mobilnummer und E-Mail als Symbole. Hover zeigt den Kontaktwert; Klick kopiert ihn und zeigt eine Snackbar-Bestaetigung.

## DSGVO / GDPR

Die Anwendung beinhaltet:

- Einwilligungsdialog mit Nachverfolgung der Zustimmung.
- Versionierte Datenschutzerklaerung (aktuelle In-App-Version: `1.1`).
- Keine Telemetrie und keine Drittanbieter-Analytics in der App-Logik.
- Verschluesselung ruhender Daten sowie Freigabe-/Audit-Mechanismen fuer gemeinsame Ordner.
- Einstellungen -> Verzeichnis von Verarbeitungstaetigkeiten (Art. 30) mit Vorlagen, Bearbeitung und Markdown-Export.
- Einstellungen -> Aktivitaetsprotokoll mit In-App-Ansicht und Markdown-Export.

Weiterhin durch den Betreiber erforderlich:

1. Verzeichnis von Verarbeitungstaetigkeiten (Art. 30 DSGVO) fachlich pruefen, vervollstaendigen und aktuell halten.
2. TOM-Dokumentation und organisatorische Kontrollen.
3. AVV mit dem Cloud-Anbieter bei Nutzung von OneDrive/SharePoint.
4. Endgeraete-Haertung (z.B. BitLocker, Betriebssystem-Kontoschutz).
5. Definierter Freigabeprozess fuer neue Ordnerbenutzer.
6. Fristgerechte Bearbeitung von Betroffenenrechten.

### DSGVO-Eintraege in den Einstellungen

In den Einstellungen stehen jetzt folgende DSGVO-relevanten Bereiche zur Verfuegung:

- Datenschutz (DSGVO): Datenschutzerklaerung und organisatorische Hinweise.
- Verzeichnis von Verarbeitungstaetigkeiten: Pflege von Art.-30-Eintraegen, Versionierung, Export als Markdown.
- Aktivitaetsprotokoll: Nachvollziehbare Historie operativer Aktionen (inkl. Export als Markdown).
- Audit-Protokoll: Schluessel- und Freigabeereignisse fuer verschluesselte Datenordner.

Wichtiger Betriebshinweis:

- Beim Oeffnen verschluesselter Anhaenge koennen temporaer entschluesselte Dateien im lokalen Temp-Ordner entstehen.

## Legal Notice

Diese Software wird als Open-Source-Projekt ohne Gewaehrleistung bereitgestellt.
Sie stellt keine zertifizierte medizinische Software dar.
Der jeweilige Betreiber ist selbst verantwortlich fuer die Einhaltung der DSGVO
und aller sonstigen gesetzlichen Vorschriften.

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [npm](https://npmjs.com)

### Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Build Windows installer

```bash
# Unsigned build (no code signing certificate needed)
npm run dist:win
```

The installer and portable package are generated in `release/`.

> Windows SmartScreen warnings are expected for unsigned builds.
> Use `npm run dist:win:signed` when a code-signing cert is available.

## Data Folder Structure

The app stores all operational data inside your selected data folder:

```text
YourSharedFolder/
├── volunteers/
│   ├── <uuid>.json
│   └── ...
├── partners/
│   ├── <uuid>.json
│   └── ...
├── index.json
├── partners-index.json
├── processing-activities.json
├── backups/
├── partner-backups/
├── attachments/
├── partner-attachments/
└── .vwp-crypto/
		├── manifest.json
		├── audit.jsonl
		├── business-audit.json
		└── requests/
				└── <fingerprint>.json
```

Notes:

- Business data files are encrypted at rest.
- The crypto folder stores key management metadata, enrollment requests and audit files.

## Encryption and Multi-User Access

### Security Model

- One dataset data-encryption key (DEK) per selected data folder.
- DEK is wrapped per authorized user using each user's public key.
- Each client stores its private key locally protected by Windows safe storage.

### Shared Folder Workflow

1. First authorized user selects a new folder: crypto manifest is initialized. This user automatically receives the **primary** role (full access).
2. Additional user selects the same folder: app creates a pending access request.
3. Authorized user approves request in Settings and selects a role:
   - **Vollzugriff (primary)** — full access to all features.
   - **Nur Kooperationspartner (partner-only)** — access to Kooperationspartner and the Ehrenamtliche contact overview.
   - **Oeffentlichkeitsarbeit (public-relations)** — access only to the separate public-relations overview and records shared for it.
   - **Interne Mitarbeitende (intern-read-only)** — access only to the internal overview of explicitly shared records; may add new Akte entries but cannot view existing Akte contents.
4. Newly approved user can access encrypted records according to their assigned role.

### User Roles

| Role                 | Sidebar Navigation | Accessible Pages |
| -------------------- | ------------------ | ---------------- |
| `primary`            | Dashboard, Ereignisse, Ehrenamtliche, Gruppen Treffen, Kooperationspartner, Einstellungen | Alle Verwaltungsseiten ausser Ehrenamtliche Kontakte, Oeffentlichkeitsarbeit und Interne Uebersicht |
| `partner-only`       | Ehrenamtliche Kontakte, Kooperationspartner, Einstellungen | Ehrenamtliche Kontakte (Aufgaben und Kontaktsymbole fuer Telefon, Mobil und E-Mail), Kooperationspartner und Einstellungen |
| `public-relations`   | Oeffentlichkeitsarbeit, Einstellungen | Freigegebene Ehrenamtliche und Kooperationspartner mit Kontakt, Aufgaben sowie Bild- und Ton-Einwilligung; Darstellung und gemeinsamer Datenordner |
| `intern-read-only`   | Interne Uebersicht, Einstellungen | Freigegebene Ehrenamtliche und Kooperationspartner mit Kontakt sowie Qualifikationen und Nachweisen. Neue Akte-Eintraege duerfen hinzugefuegt werden; bestehende Akten bleiben verborgen. Darstellung und gemeinsamer Datenordner. |

- The initial creator of a data folder always receives the `primary` role.
- Every subsequent user is assigned a role by the approver at approval time.
- Legacy manifest entries without an explicit role are treated as `primary`.

### User-Facing Signals

- Unauthorized user with pending request: blocking modal on all pages except Settings.
- Authorized user with pending requests: startup notice modal.
- Primary user after automatic deletion of archived records: in-app notice listing deleted names.
- Settings nav item shows a badge with pending request count.

### Key Rotation

- Available in Settings for authorized users.
- Re-encrypts managed dataset files (index, volunteers, backups, attachments) with a new DEK.
- Writes a key-rotation audit entry.

## Reminders

Reminders supported:

- Annual birthdays
- Round birthdays (configurable years)
- Joined-date anniversaries (configurable years)
- Activity-time anniversaries (configurable years)
- Requirement renewal reminders
- Custom reminders

Delivery:

- Windows notifications
- In-app reminders/toasts and event views

## Dev Testing: Override Effective User Identity

For local testing of enrollment/approval flows on one machine, use `.env` in repo root:

```env
VWP_DEV_OVERRIDE_USER=alice
VWP_DEV_OVERRIDE_MACHINE=dev-laptop-1
```

Behavior:

- Active only in development mode.
- Lets you simulate different effective users.
- Each override identity uses a separate local keypair file.

## License

[Apache License 2.0](LICENSE)

## Contributing

Pull requests are welcome. Please open an issue first for major changes.
