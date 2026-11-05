# ClockQuery Desktop

Windows tray app that employees install to track their time. It sits next to the system clock, shows a small timer bar, saves everything to a local SQLite database first, and syncs to the ClockQuery backend in the background.

## Tech stack

- **Electron** + **React 18** + **TypeScript**, built with **electron-vite**
- **better-sqlite3** for the local database (prebuilt binaries, no native rebuild)
- **electron-updater** for automatic updates from GitHub releases
- **electron-builder** (NSIS installer, Windows only)

## Getting started

Prerequisites: Node 20+ and a running backend (see `../backend/README.md`).

```bash
npm install
cp .env.example .env.development   # then edit API_BASE_URL
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Run in development (hot reload) |
| `npm run build` | Build to `out/` |
| `npm run start` | Preview the production build |
| `npm run typecheck` | Type-check main and renderer |
| `npm run dist:win` | Build the full NSIS installer into `release/` |
| `npm run dist:win:fast` | Build an unpacked app directory (faster, for testing) |
| `npm run dist:win:watch` | Rebuild the unpacked app whenever source changes |

## Environment

| Variable | Purpose |
|---|---|
| `API_BASE_URL` | Backend API base URL including the prefix, for example `http://localhost:3000/api/v1` |

Only `.env.production` is bundled in the installer, so a packaged app always reads it. `.env.development` is for running from source. A real OS environment variable set at launch overrides the file. There is no hardcoded fallback: if `API_BASE_URL` is missing, requests fail and the error is logged.

## How it works

| Piece | File | What it does |
|---|---|---|
| Pairing | `src/main/pairing.ts` | Device-code login. The app shows a short code, the user enters it on the web portal's Pair page, no password is typed in the app |
| Tokens | `src/main/token-store.ts`, `jwt.ts` | Stores and refreshes the access/refresh tokens |
| Timer | `src/main/timer-service.ts` | Start, pause, resume, stop. Saves progress every 30 s, pauses after 30 s of lock/sleep and does not count sleep time |
| Local DB | `src/main/local-db.ts` | `time_entries` and `tasks_cache` tables in `wa-track-local.db` (WAL mode) |
| Sync | `src/main/sync-worker.ts` | Every 18 s sends pending entries, plus the one still running, in one batch to `POST /time-entries/sync` |
| Tray and windows | `src/main/main.ts`, `tray-icon.ts` | Tray icon and menu, timer bar, task picker, pairing window |
| Updates | `src/main/updater.ts` | Checks GitHub releases, downloads quietly, asks to restart |
| Renderer | `src/renderer/` | `TimerWidget`, `TaskPicker`, `PairingScreen` (no router; each is its own window) |
| Shared | `src/shared/` | `config.ts` (intervals), `types.ts` |

Timings (heartbeat, sync interval, auto-pause and resume delays) are all in `src/shared/config.ts`.

### Local data

Stored in the OS user data folder (on Windows `%APPDATA%\desktop_app`, named after the package `name`, not the product name):

- `wa-track-local.db` (plus `-wal` and `-shm` files): time entries and the cached task list
- `crash.log`, `pairing.log`, `sync.log`: plain-text logs

If the app closes while a timer is running, the open entry stays in the database and the app offers Resume or Stop on the next launch. The database file name is intentionally unchanged from the old branding so existing users keep their unsynced entries.

## Branding and icons

The app icon is `build/icon.ico` (Windows) and `build/icon.png`, the CQ mark on a transparent background. The tray icon is embedded as base64 in `src/main/tray-icon.ts`; the in-app logo is `src/renderer/assets/clockquery-icon.png`.

## Releasing

1. Bump `version` in `package.json`.
2. Run `npm run dist:win`. The installer is `release/ClockQuery-Setup.exe`.
3. Publish it as a GitHub release; installed apps pick it up through electron-updater.

The `appId` (`com.workagentic.watrack.desktop`) is kept as is on purpose: changing it makes Windows treat the app as a different one and breaks upgrades.

The installer is not code-signed, so Windows SmartScreen shows "Windows protected your PC" on first run. Users click More info, then Run anyway.

## Docs

`docs/sequence-diagrams/` has the draw.io sequence diagrams for the desktop flows.
