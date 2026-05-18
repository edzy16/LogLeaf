import { SQLiteDatabase } from 'expo-sqlite';
import { Part, PartReplacementLog } from '@/types';

export async function getPartsByVehicle(
  db: SQLiteDatabase,
  vehicleId: number
): Promise<Part[]> {
  return db.getAllAsync<Part>(
    'SELECT * FROM parts WHERE vehicle_id = ? ORDER BY name COLLATE NOCASE',
    vehicleId
  );
}

export async function getPartById(
  db: SQLiteDatabase,
  id: number
): Promise<Part | null> {
  return db.getFirstAsync<Part>('SELECT * FROM parts WHERE id = ?', id);
}

export async function getReplacementLogsByPart(
  db: SQLiteDatabase,
  partId: number
): Promise<PartReplacementLog[]> {
  return db.getAllAsync<PartReplacementLog>(
    `SELECT * FROM part_replacement_logs
     WHERE part_id = ?
     ORDER BY replaced_at_km DESC, id DESC`,
    partId
  );
}

export async function addPart(
  db: SQLiteDatabase,
  vehicleId: number,
  name: string,
  replacedAtKm: number,
  intervalKm: number | null
): Promise<number> {
  let partId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      'INSERT INTO parts (vehicle_id, name, replaced_at_km, interval_km) VALUES (?, ?, ?, ?)',
      vehicleId,
      name,
      replacedAtKm,
      intervalKm
    );
    partId = result.lastInsertRowId;
    await db.runAsync(
      'INSERT INTO part_replacement_logs (part_id, replaced_at_km, logged_at) VALUES (?, ?, ?)',
      partId,
      replacedAtKm,
      Date.now()
    );
  });
  return partId;
}

export async function updatePart(
  db: SQLiteDatabase,
  id: number,
  name: string,
  intervalKm: number | null
): Promise<void> {
  await db.runAsync(
    'UPDATE parts SET name = ?, interval_km = ? WHERE id = ?',
    name,
    intervalKm,
    id
  );
}

export async function logReplacement(
  db: SQLiteDatabase,
  partId: number,
  replacedAtKm: number
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO part_replacement_logs (part_id, replaced_at_km, logged_at) VALUES (?, ?, ?)',
      partId,
      replacedAtKm,
      Date.now()
    );
    await syncPartLatestReplacement(db, partId);
  });
}

export async function updateReplacementLog(
  db: SQLiteDatabase,
  logId: number,
  partId: number,
  replacedAtKm: number
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE part_replacement_logs SET replaced_at_km = ? WHERE id = ? AND part_id = ?',
      replacedAtKm,
      logId,
      partId
    );
    await syncPartLatestReplacement(db, partId);
  });
}

export async function deleteReplacementLog(
  db: SQLiteDatabase,
  logId: number,
  partId: number
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM part_replacement_logs WHERE id = ? AND part_id = ?',
      logId,
      partId
    );
    await syncPartLatestReplacement(db, partId);
  });
}

async function syncPartLatestReplacement(
  db: SQLiteDatabase,
  partId: number
): Promise<void> {
  const latest = await db.getFirstAsync<{ replaced_at_km: number }>(
    `SELECT replaced_at_km FROM part_replacement_logs
     WHERE part_id = ?
     ORDER BY replaced_at_km DESC, id DESC
     LIMIT 1`,
    partId
  );
  await db.runAsync(
    'UPDATE parts SET replaced_at_km = ? WHERE id = ?',
    latest?.replaced_at_km ?? 0,
    partId
  );
}

export async function deletePart(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM parts WHERE id = ?', id);
}
