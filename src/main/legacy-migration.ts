import { app } from 'electron';
import { existsSync, renameSync } from 'fs';
import { join } from 'path';

/**
 * userData stays at %APPDATA%\desktop_app, the folder every installed version has used. Moving it
 * to %APPDATA%\ClockQuery (Electron's default for this productName) does not work: Chromium
 * creates that default folder and its Local State file before any of our code runs, so the old
 * folder can never be moved in cleanly, and auth.enc is only decryptable with the Local State key
 * that sits beside it. The result was every user being signed out.
 */
export function setupUserDataDir(): void {
  app.setPath('userData', join(app.getPath('appData'), 'desktop_app'));
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
