import { FuelLog } from '@/types';

export interface MileageResult {
  lifetimeAvg: number | null;
  last5Avg: number | null;
  status: 'no-logs' | 'need-more' | 'estimated' | 'precise';
}

// Last 6 entries = 5 trips. 6 anchors yield 5 inter-anchor intervals in precise mode;
// in estimated mode the first of 6 is the odometer anchor and the next 5 contribute fuel.
const TRIPS_WINDOW_SIZE = 6;

export function calcMileage(logs: FuelLog[]): MileageResult {
  const sorted = [...logs].sort((a, b) => a.odometer_km - b.odometer_km);

  if (sorted.length === 0) {
    return { lifetimeAvg: null, last5Avg: null, status: 'no-logs' };
  }
  if (sorted.length === 1) {
    return { lifetimeAvg: null, last5Avg: null, status: 'need-more' };
  }

  // Find full-tank entries — they make precise mode possible
  const fullTankIndices = sorted
    .map((log, i) => (log.is_full_tank ? i : -1))
    .filter(i => i >= 0);

  if (fullTankIndices.length >= 2) {
    const lifetimeAvg = calcPreciseAvg(sorted, fullTankIndices);
    const last5Avg = calcPreciseAvg(sorted, fullTankIndices.slice(-TRIPS_WINDOW_SIZE));
    return { lifetimeAvg, last5Avg, status: 'precise' };
  }

  const lifetimeAvg = calcEstimatedAvg(sorted);
  const last5Avg = calcEstimatedAvg(sorted.slice(-TRIPS_WINDOW_SIZE));
  return { lifetimeAvg, last5Avg, status: 'estimated' };
}

function calcPreciseAvg(sorted: FuelLog[], anchorIndices: number[]): number {
  const firstIdx = anchorIndices[0];
  const lastIdx = anchorIndices[anchorIndices.length - 1];
  const kmDriven = sorted[lastIdx].odometer_km - sorted[firstIdx].odometer_km;
  let totalFuel = 0;
  for (let i = firstIdx + 1; i <= lastIdx; i++) {
    totalFuel += sorted[i].fuel_litres;
  }
  if (totalFuel === 0) return 0;
  return kmDriven / totalFuel;
}

function calcEstimatedAvg(logs: FuelLog[]): number {
  const kmDriven = logs[logs.length - 1].odometer_km - logs[0].odometer_km;
  const totalFuel = logs.slice(1).reduce((sum, l) => sum + l.fuel_litres, 0);
  if (totalFuel === 0) return 0;
  return kmDriven / totalFuel;
}
