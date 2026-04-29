import { SQLiteDatabase } from 'expo-sqlite';
import { Vehicle } from '@/types';

export async function getVehicles(db: SQLiteDatabase): Promise<Vehicle[]> {
  return db.getAllAsync<Vehicle>(
    'SELECT * FROM vehicles ORDER BY name COLLATE NOCASE'
  );
}

export async function getVehicleById(
  db: SQLiteDatabase,
  id: number
): Promise<Vehicle | null> {
  return db.getFirstAsync<Vehicle>(
    'SELECT * FROM vehicles WHERE id = ?',
    id
  );
}

export async function addVehicle(
  db: SQLiteDatabase,
  name: string,
  currentKm: number
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO vehicles (name, current_km) VALUES (?, ?)',
    name,
    currentKm
  );
  return result.lastInsertRowId;
}

export async function updateVehicle(
  db: SQLiteDatabase,
  id: number,
  name: string
): Promise<void> {
  await db.runAsync('UPDATE vehicles SET name = ? WHERE id = ?', name, id);
}

/**
 * Manual odometer edit: sets current_km exactly.
 * Callers that just want to bump on a fresh log/replacement should use bumpOdometer.
 */
export async function updateOdometer(
  db: SQLiteDatabase,
  id: number,
  km: number
): Promise<void> {
  await db.runAsync(
    'UPDATE vehicles SET current_km = ? WHERE id = ?',
    km,
    id
  );
}

/**
 * Raise current_km to `km` only if higher. Safe against stale prop values
 * in modals — won't regress a vehicle's odometer.
 */
export async function bumpOdometer(
  db: SQLiteDatabase,
  id: number,
  km: number
): Promise<void> {
  await db.runAsync(
    'UPDATE vehicles SET current_km = MAX(current_km, ?) WHERE id = ?',
    km,
    id
  );
}

export async function deleteVehicle(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM vehicles WHERE id = ?', id);
}
