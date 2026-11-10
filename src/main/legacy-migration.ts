import { app } from 'electron';
import { cpSync, existsSync, renameSync } from 'fs';
import { join } from 'path';

const LEGACY_USER_DATA_DIR = 'desktop_app';
const USER_DATA_DIR = 'ClockQuery';

/**
 * Points userData at %APPDATA%\ClockQuery and, on the first launch after the rebrand, moves the
 * old %APPDATA%\desktop_app folder across so existing users keep their pairing and unsynced entries.
 * Must run before app.whenReady(): nothing has opened files in userData yet.
 */
export function setupUserDataDir(): void {
  const appData = app.getPath('appData');
  const target = join(appData, USER_DATA_DIR);
  const legacy = join(appData, LEGACY_USER_DATA_DIR);

  if (!existsSync(target) && existsSync(legacy)) {
    try {
      renameSync(legacy, target);
    } catch {
      // Rename fails if another process still holds a file open; copying keeps the user's data either way.
      try {
        cpSync(legacy, target, { recursive: true });
      } catch {
        // Starting fresh is better than not starting; the legacy folder is left untouched for recovery.
      }
    }
  }

  app.setPath('userData', target);
}

/** Renames the pre-rebrand SQLite file (and its WAL side files) so unsynced entries carry over. */
export function migrateLegacyDbFiles(dir: string, legacyName: string, newName: string): void {
  const newPath = join(dir, newName);
  if (existsSync(newPath)) return;
  for (const suffix of ['', '-wal', '-shm']) {
    const from = join(dir, legacyName + suffix);
    if (existsSync(from)) {
      try {
        renameSync(from, join(dir, newName + suffix));
      } catch {
        // If the main file cannot move, opening the new name creates an empty DB; the legacy file stays on disk.
      }
    }
  }
}
