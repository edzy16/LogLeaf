# Optional Part Interval — Design

## Background

Currently every part requires an `interval_km` ("expected life") at creation. Users sometimes want to log when they last changed a part without committing to a replacement interval — e.g., parts that don't have a clear km-based life, or that they want to track historically without nagging.

## Goal

Make `interval_km` optional on parts. Parts without an interval are tracked passively: they show their last-replacement km on the vehicle detail screen but never appear flagged on the home dashboard.

## Data Model

`parts.interval_km` becomes nullable (currently `REAL NOT NULL`).

SQLite cannot drop NOT NULL in place, so migration v2 rebuilds the table:

1. Create `parts_new` with `interval_km REAL` (nullable).
2. Copy all rows from `parts` into `parts_new`.
3. Drop `parts`, rename `parts_new` to `parts`.
4. Recreate `idx_parts_vehicle`.

TypeScript: `Part.interval_km: number | null`.

## Status Logic (`src/utils/partStatus.ts`)

`PartStatus` gains a new value:

```ts
export type PartStatus = 'ok' | 'due-soon' | 'overdue' | 'tracked';
```

`getPartStatus(part, currentKm)`:
- If `part.interval_km == null` → `'tracked'`.
- Otherwise unchanged.

`getKmRemaining(part, currentKm)`:
- If `part.interval_km == null` → `null`.
- Otherwise unchanged (returns `number`). Return type becomes `number | null`.

## UI

### `src/components/part-status-row.tsx`

When status is `'tracked'`:
- Indicator color: `Colors.dark.textSecondary` (neutral, distinct from green/yellow/red).
- Label: `"Last replaced at {replaced_at_km} km"` in `textSecondary` color.

Other statuses unchanged.

### `src/components/modals/add-part-modal.tsx`

- "Replace every (km)" field becomes optional in both add and edit mode.
- Helper text under the field: `"Leave blank if you just want to track replacements."`
- `isValid` requires only a non-empty name.
- On save: empty/zero/NaN input → `null` for `interval_km`. Otherwise the parsed number.
- Edit mode: prefill the field with `existing.interval_km` if non-null, else empty string. Saving an empty value clears the interval (turns the part into a tracked-only part).

### Home dashboard (`src/app/index.tsx`)

No change needed. The existing filter `getPartStatus(p, vehicle.current_km) !== 'ok'` will pick up `'tracked'` parts and incorrectly flag them. **Update the filter** to also exclude `'tracked'`:

```ts
const flaggedParts = parts.filter(p => {
  const status = getPartStatus(p, vehicle.current_km);
  return status === 'due-soon' || status === 'overdue';
});
```

This makes the intent explicit and future-proof.

## Repository Layer (`src/db/parts.ts`)

`addPart` and `updatePart` accept `intervalKm: number | null`. The values pass through to SQLite as-is (SQLite stores JS `null` as SQL NULL).

## Tests

Extend `__tests__/partStatus.test.ts` with:
- `getPartStatus` returns `'tracked'` when `interval_km` is null (regardless of `currentKm`).
- `getKmRemaining` returns `null` when `interval_km` is null.

## Files Changed

- `src/db/migrations.ts` — add v2 migration
- `src/types/index.ts` — `Part.interval_km` nullable, `PartStatus` adds `'tracked'`
- `src/db/parts.ts` — accept nullable `intervalKm`
- `src/utils/partStatus.ts` — handle null
- `src/components/part-status-row.tsx` — neutral render path
- `src/components/modals/add-part-modal.tsx` — optional field, validation, save logic
- `src/app/index.tsx` — explicit flagged-status filter
- `__tests__/partStatus.test.ts` — new cases

## Out of Scope

- No new screen or list section for "tracked" parts. They render inline with regular parts on the vehicle detail screen.
- No bulk migration of existing parts to remove their intervals — users can edit individually.
