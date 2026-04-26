import { getPartStatus, getKmRemaining } from '../src/utils/partStatus';
import { Part } from '../src/types';

const part: Part = {
  id: 1,
  vehicle_id: 1,
  name: 'Engine Oil',
  replaced_at_km: 10000,
  interval_km: 3000,
};
// due_at_km = 13000, due-soon threshold = 12500

describe('getPartStatus', () => {
  it('returns ok when far from due', () => {
    expect(getPartStatus(part, 12000)).toBe('ok');
  });

  it('returns ok when exactly at 501km before due', () => {
    expect(getPartStatus(part, 12499)).toBe('ok');
  });

  it('returns due-soon when exactly 500km before due', () => {
    expect(getPartStatus(part, 12500)).toBe('due-soon');
  });

  it('returns due-soon when within 500km of due', () => {
    expect(getPartStatus(part, 12800)).toBe('due-soon');
  });

  it('returns overdue when at due_at_km', () => {
    expect(getPartStatus(part, 13000)).toBe('overdue');
  });

  it('returns overdue when past due', () => {
    expect(getPartStatus(part, 14000)).toBe('overdue');
  });
});

describe('getKmRemaining', () => {
  it('returns positive km remaining when not yet due', () => {
    expect(getKmRemaining(part, 12000)).toBe(1000);
  });

  it('returns zero when exactly at due_at_km', () => {
    expect(getKmRemaining(part, 13000)).toBe(0);
  });

  it('returns negative when overdue', () => {
    expect(getKmRemaining(part, 13500)).toBe(-500);
  });
});
