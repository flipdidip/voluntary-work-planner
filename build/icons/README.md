Place branding icons for Electron/electron-builder in this folder:

- `app.ico` — used for app executable + NSIS installer/uninstaller icon
- `notification.png` — used for Windows toast notifications

Recommended source pipeline from your logo image:

1. Export a square PNG with transparent background (at least `512x512`).
2. Create `app.ico` containing multiple sizes (`16, 24, 32, 48, 64, 128, 256`).
3. Save a `256x256` (or `128x128`) transparent PNG as `notification.png`.

The project is configured to read these files automatically during development and packaging.
