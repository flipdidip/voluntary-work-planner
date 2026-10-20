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
- Such- und sortierbare Kontaktuebersicht fuer Ehrenamtliche mit Telefonnummern und Aufgaben.
- Oeffentlichkeitsarbeits-Uebersicht zu Bild- und Ton-Einwilligungen, durchsuchbar und nach Einwilligungsstatus sowie Personenkategorie filterbar.
- Sortierung der Ehrenamtlichen- und Kooperationspartnerlisten nach Name und Eintrittsdatum.
- Dateibasierte Speicherung in einem frei waehlbaren Ordner (lokal, OneDrive, SharePoint-Sync).
- Verschluesselung ruhender Daten fuer Index, Ehrenamtsakten, Backups und Anhaenge.
- Mehrbenutzer-Freigabeworkflow fuer gemeinsame Ordner (Anfrage -> Freigabe/Ablehnung).
- Rollenbasierte Zugriffskontrolle: Vollzugriff (primary) oder eingeschraenkt auf Kooperationspartner (partner-only).
- Audit-Protokoll fuer sicherheitsrelevante Schluesselereignisse (Anfrage, Freigabe, Ablehnung, Rotation).
- Vollstaendiges Aktivitaetsprotokoll fuer betriebliche Aktionen (z.B. Ehrenamtliche anlegen/aktualisieren/loeschen, Dateiaktionen, Art.-30-Aenderungen).
- Rotation des Datenschluessels mit automatischer Neuverschluesselung verwalteter Datendateien.
- Erinnerungssystem fuer Geburtstage, Jubilaeen, benutzerdefinierte Termine und Qualifikationsablauf.
- Windows-Benachrichtigungen bei faelligen Erinnerungen plus In-App-Erinnerungsoberflaeche.
- Hell-/Dunkel-Modus mit automatischer Uebernahme der Systemeinstellung (konfigurierbar in den Einstellungen).
- Optimistisches Locking zur Reduzierung von Ueberschreibkonflikten bei synchronisierter Mehrbenutzernutzung.
- In-App-Verwaltung des Verzeichnisses von Verarbeitungstaetigkeiten (Art. 30 DSGVO) inkl. Markdown-Export.
- Automatische Loeschung archivierter Ehrenamtlicher und Kooperationspartner nach einer einstellbaren Frist (Standard: 6 Monate), mit einer In-App-Meldung inklusive Namen beim Start.
- Anzeige, wer Gruppen-Treffen und Kooperationspartner-Termine angelegt hat.

## Aenderungen in v1.6.0 und im aktuellen Entwicklungszweig

### v1.6.0

- Neue Seite **Ehrenamtliche Kontakte** mit Suche nach Name, Telefonnummer und Aufgabe sowie Sortierung nach Name, Telefon, Mobilnummer und Aufgaben. Die Seite ist fuer die Rolle **Nur Kooperationspartner** verfuegbar.
- Neue Rolle **Oeffentlichkeitsarbeit** mit einer eigenen, eingeschraenkten Uebersicht der Bild- und Ton-Einwilligungen von Ehrenamtlichen und Kooperationspartnern.
- Die Oeffentlichkeitsarbeits-Uebersicht bietet Namenssuche, Sortierung sowie Ein-/Ausschlussfilter fuer Einwilligungsstufen und Personenkategorien.

### Aktueller Entwicklungszweig (noch nicht als v1.6.0 veroeffentlicht)

- Ehrenamtliche und Kooperationspartner koennen nach Name und Eintrittsdatum sortiert werden.
- Gruppen-Treffen und Kooperationspartner-Termine zeigen an, wer den jeweiligen Eintrag erstellt hat.
- Das Geburtstagsfeld loest Aenderungen nur noch aus, wenn sich das Datum tatsaechlich geaendert hat.
- Archivierte Ehrenamtliche und Kooperationspartner werden beim App-Start nach einer einstellbaren Frist automatisch geloescht. Die Frist betraegt standardmaessig sechs Monate.
- Nach einer automatischen Loeschung erscheint eine In-App-Meldung im Anwendungsstil, die die Namen der geloeschten Datensaetze auffuehrt.

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
   - **Nur Kooperationspartner (partner-only)** — restricted to the Kooperationspartner pages only.
4. Newly approved user can access encrypted records according to their assigned role.

### User Roles

| Role           | Sidebar Navigation                                                       | Accessible Pages                                                |
| -------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `primary`      | Dashboard, Ereignisse, Ehrenamtliche, Gruppen Treffen, Kooperationspartner, Termine, Einstellungen | Alle Seiten ausser Ehrenamtliche Kontakte und Oeffentlichkeitsarbeit |
| `partner-only` | Ereignisse, Ehrenamtliche Kontakte, Kooperationspartner, Termine, Einstellungen | Ehrenamtliche Kontakte, Kooperationspartner, Termine, Ereignisse und Einstellungen |
| `public-relations` | Oeffentlichkeitsarbeit | Uebersicht der Bild- und Ton-Einwilligungen |

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
