import { SQLiteDatabase } from 'expo-sqlite';
import { Part } from '@/types';

export async function getPartsByVehicle(
  db: SQLiteDatabase,
  vehicleId: number
): Promise<Part[]> {
  return db.getAllAsync<Part>(
    'SELECT * FROM parts WHERE vehicle_id = ? ORDER BY name COLLATE NOCASE',
    vehicleId
  );
}

export async function addPart(
  db: SQLiteDatabase,
  vehicleId: number,
  name: string,
  replacedAtKm: number,
  intervalKm: number | null
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO parts (vehicle_id, name, replaced_at_km, interval_km) VALUES (?, ?, ?, ?)',
    vehicleId,
    name,
    replacedAtKm,
    intervalKm
  );
  return result.lastInsertRowId;
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
  await db.runAsync(
    'UPDATE parts SET replaced_at_km = ? WHERE id = ?',
    replacedAtKm,
    partId
  );
}

export async function deletePart(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM parts WHERE id = ?', id);
}
