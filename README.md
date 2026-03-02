# Voluntary Work Planner

**Ehrenamtliche Verwaltung** — Volunteer management for non-profit organizations (Vereine).

Built for German _gemeinnützige Vereine_, particularly hospice and end-of-life volunteer organizations (_Sterbebegleitung_).

---

## ✨ Features

- 👥 **Volunteer registry** — manage all volunteer data in one place
- 📁 **File-based database** — works with OneDrive / SharePoint sync folders
- 🔔 **Smart reminders** — round birthdays (50, 60, 70...), annual birthdays, custom dates
- 🪟 **Windows taskbar notifications** — OS-level alerts when reminders are due
- 📋 **Activity log** — track hours and activities per volunteer
- 🔒 **Optimistic locking** — safe multi-user access via OneDrive sync
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

| Type                | Description                                           |
| ------------------- | ----------------------------------------------------- |
| **Round birthday**  | Alerts on 50th, 60th, 70th... birthday (configurable) |
| **Annual birthday** | Alert every year on the volunteer's birthday          |
| **Custom date**     | One-time alert on any chosen date                     |

Reminders appear as:

- **Windows taskbar notifications** (OS-level)
- **In-app toast banner**

---

## ⚖️ License

[Apache License 2.0](LICENSE)

---

## 🇩🇪 Rechtlicher Hinweis

Diese Software wird als Open-Source-Projekt ohne Gewährleistung bereitgestellt.  
Sie stellt keine zertifizierte medizinische Software dar.  
Der jeweilige Betreiber ist selbst verantwortlich für die Einhaltung der **DSGVO**
und aller sonstigen gesetzlichen Vorschriften.

---

## 🤝 Contributing

Pull requests welcome! Please open an issue first to discuss major changes.
