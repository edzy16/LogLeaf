import { SQLiteDatabase } from 'expo-sqlite';

export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  // Foreign keys are per-connection in SQLite, so this must run on every open.
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY);'
  );

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM migrations'
  );
  const appliedVersions = new Set(applied.map(r => r.version));

  if (!appliedVersions.has(1)) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS vehicles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          current_km REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS parts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          replaced_at_km REAL NOT NULL DEFAULT 0,
          interval_km REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS fuel_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
          odometer_km REAL NOT NULL,
          fuel_litres REAL NOT NULL,
          is_full_tank INTEGER NOT NULL DEFAULT 1,
          logged_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_parts_vehicle ON parts(vehicle_id);
        CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON fuel_logs(vehicle_id, odometer_km);
      `);
      await db.runAsync('INSERT INTO migrations (version) VALUES (?)', 1);
    });
  }

  if (!appliedVersions.has(2)) {
    // SQLite cannot drop NOT NULL in place. Rebuild the table.
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE parts_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          replaced_at_km REAL NOT NULL DEFAULT 0,
          interval_km REAL
        );

        INSERT INTO parts_new (id, vehicle_id, name, replaced_at_km, interval_km)
          SELECT id, vehicle_id, name, replaced_at_km, interval_km FROM parts;

        DROP TABLE parts;
        ALTER TABLE parts_new RENAME TO parts;

        CREATE INDEX IF NOT EXISTS idx_parts_vehicle ON parts(vehicle_id);
      `);
      await db.runAsync('INSERT INTO migrations (version) VALUES (?)', 2);
    });
  }
}
