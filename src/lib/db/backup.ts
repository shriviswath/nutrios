import { db } from "@/lib/db/db";
import { dateKey } from "@/lib/utils/date";

/**
 * Local-first means the data lives on one device, so a backup file is the only safety net.
 * The export is plain JSON: readable, diffable, and importable into anything else.
 */

export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: "nutri-os";
  version: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

const TABLES = ["profile", "settings", "foods", "logs", "weights", "exercises", "recipes", "savedMeals", "usage", "snapshots"] as const;

export async function exportBackup(): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {};
  for (const name of TABLES) {
    tables[name] = await db.table(name).toArray();
  }
  return { app: "nutri-os", version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables };
}

export async function downloadBackup(): Promise<void> {
  const data = await exportBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nutri-backup-${dateKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  ok: boolean;
  message: string;
  counts?: Record<string, number>;
}

/** Replaces everything. The caller is expected to have warned the user first. */
export async function importBackup(file: File): Promise<ImportResult> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { ok: false, message: "That file is not valid JSON." };
  }
  if (parsed.app !== "nutri-os" || !parsed.tables) {
    return { ok: false, message: "That file was not exported from this app." };
  }
  if (parsed.version > BACKUP_VERSION) {
    return { ok: false, message: `The backup was made by a newer version (v${parsed.version}). Update the app first.` };
  }

  const counts: Record<string, number> = {};
  await db.transaction("rw", TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) {
      const rows = parsed.tables[name];
      if (!Array.isArray(rows)) continue;
      await db.table(name).clear();
      await db.table(name).bulkPut(rows);
      counts[name] = rows.length;
    }
  });

  return { ok: true, message: "Backup restored.", counts };
}

export async function wipeEverything(): Promise<void> {
  await db.transaction("rw", TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) await db.table(name).clear();
  });
}
