import { calcMileage } from '../src/utils/mileage';
import { FuelLog } from '../src/types';

function makeLog(
  id: number,
  odometer_km: number,
  fuel_litres: number,
  is_full_tank: number = 1
): FuelLog {
  return { id, vehicle_id: 1, odometer_km, fuel_litres, is_full_tank, logged_at: 0 };
}

describe('calcMileage', () => {
  it('returns no-logs status when array is empty', () => {
    const result = calcMileage([]);
    expect(result.status).toBe('no-logs');
    expect(result.lifetimeAvg).toBeNull();
    expect(result.last5Avg).toBeNull();
  });

  it('returns need-more status with only one entry', () => {
    const result = calcMileage([makeLog(1, 10000, 5)]);
    expect(result.status).toBe('need-more');
    expect(result.lifetimeAvg).toBeNull();
  });

  describe('precise mode (2+ full-tank entries)', () => {
    it('calculates exact mileage between two full tanks', () => {
      const logs = [makeLog(1, 10000, 5, 1), makeLog(2, 10300, 5, 1)];
      const result = calcMileage(logs);
      expect(result.status).toBe('precise');
      expect(result.lifetimeAvg).toBeCloseTo(60); // 300km / 5L
    });

    it('includes partial fills between full-tank anchors', () => {
      const logs = [
        makeLog(1, 10000, 5, 1),
        makeLog(2, 10100, 3, 0),
        makeLog(3, 10200, 4, 1),
      ];
      const result = calcMileage(logs);
      expect(result.status).toBe('precise');
      expect(result.lifetimeAvg).toBeCloseTo(200 / 7);
    });

    it('uses only full-tank anchors for last5Avg in precise mode', () => {
      const logs = Array.from({ length: 7 }, (_, i) =>
        makeLog(i + 1, 10000 + i * 100, 5, 1)
      );
      const result = calcMileage(logs);
      expect(result.status).toBe('precise');
      expect(result.lifetimeAvg).toBeCloseTo(20);
      expect(result.last5Avg).toBeCloseTo(20);
    });

    it('falls back to estimated mode when only one full-tank entry exists', () => {
      const logs = [
        makeLog(1, 10000, 5, 1),
        makeLog(2, 10300, 5, 0),
      ];
      const result = calcMileage(logs);
      expect(result.status).toBe('estimated');
      expect(result.lifetimeAvg).toBeCloseTo(60);
    });

    it('last5Avg reflects only recent full-tank trips, differs from lifetimeAvg', () => {
      // 8 full-tank entries: first 3 trips poor mileage (40 km on 5L = 8 km/L),
      // last 5 trips good mileage (200 km on 5L = 40 km/L)
      const logs = [
        makeLog(1, 0, 5, 1),     // anchor (fuel ignored)
        makeLog(2, 40, 5, 1),    // trip 1: 40km / 5L = 8
        makeLog(3, 80, 5, 1),    // trip 2: 40km / 5L = 8
        makeLog(4, 120, 5, 1),   // trip 3: 40km / 5L = 8
        makeLog(5, 320, 5, 1),   // trip 4: 200km / 5L = 40
        makeLog(6, 520, 5, 1),   // trip 5: 200km / 5L = 40
        makeLog(7, 720, 5, 1),   // trip 6: 200km / 5L = 40
        makeLog(8, 920, 5, 1),   // trip 7: 200km / 5L = 40
      ];
      const result = calcMileage(logs);
      expect(result.status).toBe('precise');
      // lifetime: 920km / (7 fills × 5L) = 920 / 35 ≈ 26.29
      expect(result.lifetimeAvg).toBeCloseTo(920 / 35, 1);
      // last5: anchors[3..8] → indices 2..7 → kmDriven = 920-80=840, fuel = 5×5=25 → 33.6
      expect(result.last5Avg).toBeCloseTo(840 / 25, 1);
      // Differentiates last5 from lifetime
      expect(result.last5Avg).not.toBeCloseTo(result.lifetimeAvg!, 1);
    });

    it('precise mode handles mixed full and partial fills correctly across many entries', () => {
      // 10 entries with partial fills mixed in. Full tanks at indices 0, 3, 6, 9
      // Between full[0] (0km) and full[9] (900km): kmDriven = 900
      // Fuel after full[0] up to and including full[9]: indices 1..9
      // Index 1 (partial, 2L), 2 (partial, 3L), 3 (full, 5L), 4 (partial, 2L),
      // 5 (partial, 3L), 6 (full, 5L), 7 (partial, 2L), 8 (partial, 3L), 9 (full, 5L)
      // Total fuel = 2+3+5+2+3+5+2+3+5 = 30L. Lifetime = 900/30 = 30
      const logs = [
        makeLog(1, 0, 10, 1),    // full anchor
        makeLog(2, 100, 2, 0),   // partial
        makeLog(3, 200, 3, 0),   // partial
        makeLog(4, 300, 5, 1),   // full
        makeLog(5, 400, 2, 0),
        makeLog(6, 500, 3, 0),
        makeLog(7, 600, 5, 1),   // full
        makeLog(8, 700, 2, 0),
        makeLog(9, 800, 3, 0),
        makeLog(10, 900, 5, 1),  // full
      ];
      const result = calcMileage(logs);
      expect(result.status).toBe('precise');
      expect(result.lifetimeAvg).toBeCloseTo(30, 1);
    });
  });

  describe('estimated mode (fewer than 2 full-tank entries)', () => {
    it('calculates lifetime avg with two non-full entries', () => {
      const logs = [makeLog(1, 10000, 0, 0), makeLog(2, 10300, 5, 0)];
      const result = calcMileage(logs);
      expect(result.status).toBe('estimated');
      expect(result.lifetimeAvg).toBeCloseTo(60);
    });

    it('ignores fuel of first entry in lifetime avg', () => {
      const logs = [makeLog(1, 10000, 999, 0), makeLog(2, 10300, 5, 0)];
      const result = calcMileage(logs);
      expect(result.lifetimeAvg).toBeCloseTo(60);
    });

    it('last5Avg uses most recent 6 entries', () => {
      const logs = Array.from({ length: 8 }, (_, i) =>
        makeLog(i + 1, 10000 + i * 1000, 10, 0)
      );
      const result = calcMileage(logs);
      expect(result.status).toBe('estimated');
      expect(result.lifetimeAvg).toBeCloseTo(100);
      expect(result.last5Avg).toBeCloseTo(100);
    });
  });

  it('sorts entries by odometer before calculating', () => {
    const logs = [makeLog(2, 10300, 5, 1), makeLog(1, 10000, 5, 1)];
    const result = calcMileage(logs);
    expect(result.status).toBe('precise');
    expect(result.lifetimeAvg).toBeCloseTo(60);
  });
});
