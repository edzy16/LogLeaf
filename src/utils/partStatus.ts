import { Part, PartStatus } from '@/types';

export function getPartStatus(part: Part, currentKm: number): PartStatus {
  const dueAt = part.replaced_at_km + part.interval_km;
  if (currentKm >= dueAt) return 'overdue';
  if (currentKm >= dueAt - 500) return 'due-soon';
  return 'ok';
}

export function getKmRemaining(part: Part, currentKm: number): number {
  return part.replaced_at_km + part.interval_km - currentKm;
}
