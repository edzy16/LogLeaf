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
    // Note: v1 created these tables with REAL km columns; v3 rebuilds them as INTEGER.
    // Fresh installs run v1 then v3 in sequence, ending up with INTEGER schema.
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

  if (!appliedVersions.has(3)) {
    // Switch km columns to INTEGER affinity. Whole kilometers avoid float-drift
    // in displayed values after arithmetic. Existing fractional data is rounded.
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE vehicles_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          current_km INTEGER NOT NULL DEFAULT 0
        );
        INSERT INTO vehicles_new (id, name, current_km)
          SELECT id, name, CAST(ROUND(current_km) AS INTEGER) FROM vehicles;
        DROP TABLE vehicles;
        ALTER TABLE vehicles_new RENAME TO vehicles;

        CREATE TABLE parts_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          replaced_at_km INTEGER NOT NULL DEFAULT 0,
          interval_km INTEGER
        );
        INSERT INTO parts_new (id, vehicle_id, name, replaced_at_km, interval_km)
          SELECT id, vehicle_id, name,
                 CAST(ROUND(replaced_at_km) AS INTEGER),
                 CASE WHEN interval_km IS NULL THEN NULL ELSE CAST(ROUND(interval_km) AS INTEGER) END
          FROM parts;
        DROP TABLE parts;
        ALTER TABLE parts_new RENAME TO parts;
        CREATE INDEX IF NOT EXISTS idx_parts_vehicle ON parts(vehicle_id);

        CREATE TABLE fuel_logs_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
          odometer_km INTEGER NOT NULL,
          fuel_litres REAL NOT NULL,
          is_full_tank INTEGER NOT NULL DEFAULT 1,
          logged_at INTEGER NOT NULL
        );
        INSERT INTO fuel_logs_new (id, vehicle_id, odometer_km, fuel_litres, is_full_tank, logged_at)
          SELECT id, vehicle_id, CAST(ROUND(odometer_km) AS INTEGER), fuel_litres, is_full_tank, logged_at FROM fuel_logs;
        DROP TABLE fuel_logs;
        ALTER TABLE fuel_logs_new RENAME TO fuel_logs;
        CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON fuel_logs(vehicle_id, odometer_km);
      `);
      await db.runAsync('INSERT INTO migrations (version) VALUES (?)', 3);
    });
  }
}
