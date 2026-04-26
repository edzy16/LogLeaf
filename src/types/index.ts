export interface Vehicle {
  id: number;
  name: string;
  current_km: number;
}

export interface Part {
  id: number;
  vehicle_id: number;
  name: string;
  replaced_at_km: number;
  interval_km: number | null;
}

export interface FuelLog {
  id: number;
  vehicle_id: number;
  odometer_km: number;
  fuel_litres: number;
  is_full_tank: number; // 0 or 1 — SQLite boolean
  logged_at: number;
}

export type PartStatus = 'ok' | 'due-soon' | 'overdue' | 'tracked';
