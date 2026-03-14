# Voluntary Work Planner

**Ehrenamtliche Verwaltung** - Verwaltungssoftware fuer gemeinnuetzige Organisationen.

Entwickelt fuer deutsche gemeinnuetzige Vereine, insbesondere Teams in der Sterbebegleitung und Hospizarbeit.

---

<p align="center">
	<img src="build/icons/big_app.ico" alt="Voluntary Work Planner app icon" width="200" />
</p>

## Funktionen

- Ehrenamtsregister mit detaillierten Personen-, Kontakt- und Qualifikationsdaten.
- Dateibasierte Speicherung in einem frei waehlbaren Ordner (lokal, OneDrive, SharePoint-Sync).
- Verschluesselung ruhender Daten fuer Index, Ehrenamtsakten, Backups und Anhaenge.
- Mehrbenutzer-Freigabeworkflow fuer gemeinsame Ordner (Anfrage -> Freigabe/Ablehnung).
- Audit-Protokoll fuer sicherheitsrelevante Schluesselereignisse (Anfrage, Freigabe, Ablehnung, Rotation).
- Rotation des Datenschluessels mit automatischer Neuverschluesselung verwalteter Datendateien.
- Erinnerungssystem fuer Geburtstage, Jubilaeen, benutzerdefinierte Termine und Qualifikationsablauf.
- Windows-Benachrichtigungen bei faelligen Erinnerungen plus In-App-Erinnerungsoberflaeche.
- Optimistisches Locking zur Reduzierung von Ueberschreibkonflikten bei synchronisierter Mehrbenutzernutzung.

## DSGVO / GDPR

Die Anwendung beinhaltet:

- Einwilligungsdialog mit Nachverfolgung der Zustimmung.
- Versionierte Datenschutzerklaerung (aktuelle In-App-Version: `1.1`).
- Keine Telemetrie und keine Drittanbieter-Analytics in der App-Logik.
- Verschluesselung ruhender Daten sowie Freigabe-/Audit-Mechanismen fuer gemeinsame Ordner.

Weiterhin durch den Betreiber erforderlich:

1. Verzeichnis von Verarbeitungstaetigkeiten (Art. 30 DSGVO).
2. TOM-Dokumentation und organisatorische Kontrollen.
3. AVV mit dem Cloud-Anbieter bei Nutzung von OneDrive/SharePoint.
4. Endgeraete-Haertung (z.B. BitLocker, Betriebssystem-Kontoschutz).
5. Definierter Freigabeprozess fuer neue Ordnerbenutzer.
6. Fristgerechte Bearbeitung von Betroffenenrechten.

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
├── index.json
├── backups/
├── attachments/
└── .vwp-crypto/
		├── manifest.json
		├── audit.jsonl
		└── requests/
				└── <fingerprint>.json
```

Notes:

- Business data files are encrypted at rest.
- The crypto folder stores key management metadata and enrollment requests.

## Encryption and Multi-User Access

### Security Model

- One dataset data-encryption key (DEK) per selected data folder.
- DEK is wrapped per authorized user using each user's public key.
- Each client stores its private key locally protected by Windows safe storage.

### Shared Folder Workflow

1. First authorized user selects a new folder: crypto manifest is initialized.
2. Additional user selects the same folder: app creates a pending access request.
3. Authorized user approves request in Settings -> request gets a wrapped DEK.
4. Newly approved user can access encrypted records.

### User-Facing Signals

- Unauthorized user with pending request: blocking modal on all pages except Settings.
- Authorized user with pending requests: startup notice modal.
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
