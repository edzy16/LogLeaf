import { FuelLog } from "@/types";
import { calcMileage, MileageResult } from "@/utils/mileage";
import { SQLiteDatabase } from "expo-sqlite";

export async function getFuelLogsByVehicle(
  db: SQLiteDatabase,
  vehicleId: number,
): Promise<FuelLog[]> {
  return db.getAllAsync<FuelLog>(
    "SELECT * FROM fuel_logs WHERE vehicle_id = ? ORDER BY odometer_km ASC",
    vehicleId,
  );
}

export async function getMaxFuelLogOdometer(
  db: SQLiteDatabase,
  vehicleId: number,
): Promise<number | null> {
  const row = await db.getFirstAsync<{ max_km: number | null }>(
    "SELECT MAX(odometer_km) AS max_km FROM fuel_logs WHERE vehicle_id = ?",
    vehicleId,
  );
  return row?.max_km ?? null;
}

export async function addFuelLog(
  db: SQLiteDatabase,
  vehicleId: number,
  odometerKm: number,
  fuelLitres: number,
  isFullTank: boolean,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "INSERT INTO fuel_logs (vehicle_id, odometer_km, fuel_litres, is_full_tank, logged_at) VALUES (?, ?, ?, ?, ?)",
      vehicleId,
      odometerKm,
      fuelLitres,
      isFullTank ? 1 : 0,
      Date.now(),
    );
    // Bump vehicle odometer to latest reading if higher
    await db.runAsync(
      "UPDATE vehicles SET current_km = MAX(current_km, ?) WHERE id = ?",
      odometerKm,
      vehicleId,
    );
  });
}

export async function deleteFuelLog(
  db: SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync("DELETE FROM fuel_logs WHERE id = ?", id);
}

export async function getMileageForVehicle(
  db: SQLiteDatabase,
  vehicleId: number,
): Promise<MileageResult> {
  const logs = await getFuelLogsByVehicle(db, vehicleId);
  return calcMileage(logs);
}
