# Voluntary Work Planner

**Ehrenamtliche Verwaltung** — Volunteer management for non-profit organizations (Vereine).

Built for German _gemeinnützige Vereine_, particularly hospice and end-of-life volunteer organizations (_Sterbebegleitung_).

---

<p align="center">
	<img src="build/icons/big_app.ico" alt="Voluntary Work Planner app icon" width="200" />
</p>

## ✨ Features

- 👥 **Volunteer registry** — manage all volunteer data in one place
- 📁 **File-based database** — works with OneDrive / SharePoint sync folders
- 🔔 **Smart reminders** — round birthdays (50, 60, 70, 75...), annual birthdays, service anniversaries (5, 10, 15...) and custom dates
- 🪟 **Windows taskbar notifications** — OS-level alerts when reminders are due
- **Optimistic locking** — safe multi-user access via OneDrive sync
- 🔄 **Auto-updates** — via GitHub Releases
- 📦 **Windows installer** — `.exe` and `.msi` via GitHub Actions

---

## 🚀 Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [npm](https://npmjs.com)

### Development

```bash
npm install
npm run dev
```

### Build Windows installer

```bash
# Unsigned build (no code signing certificate needed)
npm run dist:win
```

The installer (`.exe`) and portable version will be in the `release/` folder.

> ⚠️ Windows may show a SmartScreen warning for unsigned builds — this is expected.
> When a code signing certificate is available, use `npm run dist:win:signed` instead.

---

## 📂 Data Storage

The app stores data in a folder you choose — ideal for a **OneDrive / SharePoint synced folder**:

```
YourSharePointFolder/
├── volunteers/
│   ├── <uuid>.json     ← one file per volunteer
│   └── ...
├── index.json          ← fast search index
└── backups/            ← automatic backups before every write
```

### Multi-user safety

Each record has a `_version` field. Before saving, the app checks if the file was changed by another user. If so, a conflict dialog is shown.

---

## 🔔 Reminder System

Reminders can be attached to each volunteer:

| Type                | Description                                                             |
| ------------------- | ----------------------------------------------------------------------- |
| **Round birthday**  | Alerts on 50th, 60th, 70th, 75th, 80th... birthday (configurable)       |
| **Annual birthday** | Alert every year on the volunteer's birthday                            |
| **Anniversary**     | Alerts on service milestones: 5, 10, 15, 20, 25... years (configurable) |
| **Custom date**     | One-time alert on any chosen date                                       |

Reminders appear as:

- **Windows taskbar notifications** (OS-level)
- **In-app toast banner**

---

## ⚖️ License

[Apache License 2.0](LICENSE)

---

## 🔒 DSGVO / GDPR Compliance

This application includes privacy compliance features required for use in Germany:

### Built-in Features

- **Mandatory consent screen** on first launch (Art. 13-14 DSGVO)
- **Privacy policy** (Datenschutzerklärung) in German, version-tracked
- **Consent tracking** with timestamp and version
- **Transparent data handling** - all data stored locally in readable JSON format
- **No external data transmission** - no telemetry, analytics, or third-party connections

### What You Still Need

As the operator of this software, you are responsible for:

1. **Data Processing Records** (Verzeichnis von Verarbeitungstätigkeiten, Art. 30 DSGVO)
2. **Technical-Organizational Measures** (TOM) documentation
3. **Data Processing Agreement** (AVV) if using cloud sync (OneDrive/SharePoint)
4. **Disk encryption** (e.g., BitLocker) for the data folder
5. **Access controls** at the file system level
6. **Responding to data subject rights** requests (Art. 15-20 DSGVO)

### Security Limitations

⚠️ **Important:** This software currently does NOT provide:

- Encryption of stored JSON files
- User authentication or access control
- Audit logs for access tracking

**Recommendation:** Use full-disk encryption and restrict file system permissions to authorized users only.

---

## 🇩🇪 Rechtlicher Hinweis

Diese Software wird als Open-Source-Projekt ohne Gewährleistung bereitgestellt.  
Sie stellt keine zertifizierte medizinische Software dar.  
Der jeweilige Betreiber ist selbst verantwortlich für die Einhaltung der **DSGVO**
und aller sonstigen gesetzlichen Vorschriften.

---

## 🤝 Contributing

Pull requests welcome! Please open an issue first to discuss major changes.
