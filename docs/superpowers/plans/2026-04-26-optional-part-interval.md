# Optional Part Interval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `parts.interval_km` optional so users can log replacements without committing to a replacement interval.

**Architecture:** Make the column nullable via a v2 migration that rebuilds the parts table. Add a `'tracked'` value to `PartStatus` for parts without an interval. Update the part row UI to render a neutral "Last replaced at X km" label for tracked parts, and tighten the home dashboard filter so tracked parts are never flagged.

**Tech Stack:** Expo, expo-router, expo-sqlite, TypeScript, React Native, Jest (`jest-expo`).

---

## Task 1: Update types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update `Part` and `PartStatus` types**

Replace the `Part` interface and `PartStatus` type in `src/types/index.ts`:

```ts
export interface Part {
  id: number;
  vehicle_id: number;
  name: string;
  replaced_at_km: number;
  interval_km: number | null;
}

export type PartStatus = 'ok' | 'due-soon' | 'overdue' | 'tracked';
```

Leave the `Vehicle` and `FuelLog` interfaces untouched.

- [ ] **Step 2: Verify TypeScript catches all sites that need updating**

Run: `npx tsc --noEmit`

Expected: TypeScript reports errors at sites where `interval_km` or `PartStatus` are now mismatched. Note them — they will be fixed by subsequent tasks. Do not fix them yet.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): make part interval_km nullable, add 'tracked' status"
```

---

## Task 2: Update partStatus utilities and tests

**Files:**
- Modify: `src/utils/partStatus.ts`
- Test: `__tests__/partStatus.test.ts`

- [ ] **Step 1: Add failing tests for the new behavior**

Append the following test blocks to the END of `__tests__/partStatus.test.ts`:

```ts
const trackedPart: Part = {
  id: 2,
  vehicle_id: 1,
  name: 'Air Filter',
  replaced_at_km: 10000,
  interval_km: null,
};

describe('getPartStatus with null interval', () => {
  it("returns 'tracked' regardless of currentKm", () => {
    expect(getPartStatus(trackedPart, 0)).toBe('tracked');
    expect(getPartStatus(trackedPart, 50000)).toBe('tracked');
  });
});

describe('getKmRemaining with null interval', () => {
  it('returns null when interval_km is null', () => {
    expect(getKmRemaining(trackedPart, 12000)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/partStatus.test.ts`

Expected: TypeScript/runtime failure — the existing implementation does not handle `null`, and `getKmRemaining`'s return type is `number`, not `number | null`.

- [ ] **Step 3: Update the implementation to handle null intervals**

Replace the entire contents of `src/utils/partStatus.ts` with:

```ts
import { Part, PartStatus } from '@/types';

export function getPartStatus(part: Part, currentKm: number): PartStatus {
  if (part.interval_km == null) return 'tracked';
  const dueAt = part.replaced_at_km + part.interval_km;
  if (currentKm >= dueAt) return 'overdue';
  if (currentKm >= dueAt - 500) return 'due-soon';
  return 'ok';
}

export function getKmRemaining(
  part: Part,
  currentKm: number
): number | null {
  if (part.interval_km == null) return null;
  return part.replaced_at_km + part.interval_km - currentKm;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/partStatus.test.ts`

Expected: all tests pass (existing 9 + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/utils/partStatus.ts __tests__/partStatus.test.ts
git commit -m "feat(parts): handle null interval_km in status utilities"
```

---

## Task 3: Migration v2 — make `parts.interval_km` nullable

**Files:**
- Modify: `src/db/migrations.ts`

- [ ] **Step 1: Add the v2 migration**

Replace the entire contents of `src/db/migrations.ts` with:

```ts
import { SQLiteDatabase } from 'expo-sqlite';

export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  // Foreign keys are per-connection in SQLite, so this must run on every open.
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY);'
  );

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM migrations'
  );
  const appliedVersions = new Set(applied.map(r => r.version));

  if (!appliedVersions.has(1)) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS vehicles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          current_km REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS parts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          replaced_at_km REAL NOT NULL DEFAULT 0,
          interval_km REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS fuel_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
          odometer_km REAL NOT NULL,
          fuel_litres REAL NOT NULL,
          is_full_tank INTEGER NOT NULL DEFAULT 1,
          logged_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_parts_vehicle ON parts(vehicle_id);
        CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON fuel_logs(vehicle_id, odometer_km);
      `);
      await db.runAsync('INSERT INTO migrations (version) VALUES (?)', 1);
    });
  }

  if (!appliedVersions.has(2)) {
    // SQLite cannot drop NOT NULL in place. Rebuild the table.
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE parts_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          replaced_at_km REAL NOT NULL DEFAULT 0,
          interval_km REAL
        );

        INSERT INTO parts_new (id, vehicle_id, name, replaced_at_km, interval_km)
          SELECT id, vehicle_id, name, replaced_at_km, interval_km FROM parts;

        DROP TABLE parts;
        ALTER TABLE parts_new RENAME TO parts;

        CREATE INDEX IF NOT EXISTS idx_parts_vehicle ON parts(vehicle_id);
      `);
      await db.runAsync('INSERT INTO migrations (version) VALUES (?)', 2);
    });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no new errors from migrations.ts. Pre-existing errors from Task 1 (in modal/screen/db files) may still be present — that is fine.

- [ ] **Step 3: Commit**

```bash
git add src/db/migrations.ts
git commit -m "feat(db): v2 migration making parts.interval_km nullable"
```

---

## Task 4: Update parts repository to accept nullable interval

**Files:**
- Modify: `src/db/parts.ts`

- [ ] **Step 1: Update `addPart` and `updatePart` signatures**

Replace the entire contents of `src/db/parts.ts` with:

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: errors reduced — only the modal and home screen should still have errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/parts.ts
git commit -m "feat(db): accept nullable intervalKm in addPart/updatePart"
```

---

## Task 5: Render tracked parts in the part row

**Files:**
- Modify: `src/components/part-status-row.tsx`

- [ ] **Step 1: Add a `'tracked'` color and a label branch**

Replace the entire contents of `src/components/part-status-row.tsx` with:

```tsx
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { Part, PartStatus } from '@/types';
import { getKmRemaining, getPartStatus } from '@/utils/partStatus';
import { ThemedText } from './themed-text';

const STATUS_COLORS: Record<PartStatus, string> = {
  ok: Colors.dark.success,
  'due-soon': Colors.dark.warning,
  overdue: Colors.dark.danger,
  tracked: Colors.dark.textSecondary,
};

interface PartStatusRowProps {
  part: Part;
  currentKm: number;
  onPress: (part: Part) => void;
}

export function PartStatusRow({ part, currentKm, onPress }: PartStatusRowProps) {
  const status = getPartStatus(part, currentKm);
  const color = STATUS_COLORS[status];

  let label: string;
  if (status === 'tracked') {
    label = `Last replaced at ${Math.round(part.replaced_at_km)} km`;
  } else {
    const kmRemaining = getKmRemaining(part, currentKm) ?? 0;
    label =
      status === 'overdue'
        ? `${Math.abs(Math.round(kmRemaining))} km overdue`
        : `${Math.round(kmRemaining)} km remaining`;
  }

  return (
    <Pressable
      onPress={() => onPress(part)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <View style={styles.content}>
        <ThemedText type="default">{part.name}</ThemedText>
        <ThemedText type="small" style={{ color }}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.three,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.backgroundSelected,
  },
  pressed: {
    opacity: 0.7,
  },
  indicator: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/part-status-row.tsx
git commit -m "feat(ui): render tracked parts with neutral last-replaced label"
```

---

## Task 6: Make the interval field optional in the add/edit modal

**Files:**
- Modify: `src/components/modals/add-part-modal.tsx`

- [ ] **Step 1: Update the modal to support optional interval**

Replace the entire contents of `src/components/modals/add-part-modal.tsx` with:

```tsx
import { ModalSheet } from "@/components/modal-sheet";
import { ThemedText } from "@/components/themed-text";
import { Colors, Spacing } from "@/constants/theme";
import { addPart, updatePart } from "@/db/parts";
import { Part } from "@/types";
import { useSQLiteContext } from "expo-sqlite";
import React, { useEffect, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface AddPartModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  vehicleId: number;
  currentKm: number;
  /** Pass to edit an existing part */
  existing?: Part;
}

export function AddPartModal({
  visible,
  onClose,
  onSaved,
  vehicleId,
  currentKm,
  existing,
}: AddPartModalProps) {
  const db = useSQLiteContext();
  const [name, setName] = useState("");
  const [replacedAtStr, setReplacedAtStr] = useState("");
  const [intervalStr, setIntervalStr] = useState("");

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setReplacedAtStr(String(existing.replaced_at_km));
      setIntervalStr(
        existing.interval_km == null ? "" : String(existing.interval_km)
      );
    } else {
      setName("");
      setReplacedAtStr(String(currentKm));
      setIntervalStr("");
    }
  }, [existing, visible, currentKm]);

  const isEdit = !!existing;
  const isValid = !!name.trim();

  function parseInterval(): number | null {
    const trimmed = intervalStr.trim();
    if (!trimmed) return null;
    const parsed = parseFloat(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }

  async function handleSave() {
    if (!isValid) return;
    const replacedAt = parseFloat(replacedAtStr) || 0;
    const interval = parseInterval();

    try {
      if (isEdit) {
        if (!existing) return;
        await updatePart(db, existing.id, name.trim(), interval);
      } else {
        await addPart(db, vehicleId, name.trim(), replacedAt, interval);
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save part:", error);
      // User can retry without modal closing
    }
  }

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.title}>
        {isEdit ? "Edit Part" : "Add Part"}
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Part name
        </ThemedText>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Engine Oil"
          placeholderTextColor={Colors.dark.textSecondary}
          autoFocus
        />
      </View>

      {!isEdit && (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Replaced at (km)
          </ThemedText>
          <TextInput
            style={styles.input}
            value={replacedAtStr}
            onChangeText={setReplacedAtStr}
            keyboardType="numeric"
            placeholderTextColor={Colors.dark.textSecondary}
          />
        </View>
      )}

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Replace every (km)
        </ThemedText>
        <TextInput
          style={styles.input}
          value={intervalStr}
          onChangeText={setIntervalStr}
          placeholder="e.g. 3000"
          placeholderTextColor={Colors.dark.textSecondary}
          keyboardType="numeric"
        />
        <ThemedText type="small" themeColor="textSecondary">
          Leave blank if you just want to track replacements.
        </ThemedText>
      </View>

      <TouchableOpacity
        style={[styles.button, !isValid && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!isValid}
      >
        <ThemedText type="default" style={styles.buttonText}>
          {isEdit ? "Save Changes" : "Add Part"}
        </ThemedText>
      </TouchableOpacity>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.four,
  },
  field: {
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  input: {
    backgroundColor: Colors.dark.backgroundSelected,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    color: Colors.dark.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.dark.primary,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: "center",
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/add-part-modal.tsx
git commit -m "feat(ui): make replace-every interval optional in add/edit modal"
```

---

## Task 7: Tighten the home dashboard filter

**Files:**
- Modify: `src/app/index.tsx`

- [ ] **Step 1: Filter explicitly by flagged statuses**

In `src/app/index.tsx`, change the `loadData` body. Find this block:

```ts
const flaggedParts = parts.filter(
  p => getPartStatus(p, vehicle.current_km) !== 'ok'
);
```

Replace it with:

```ts
const flaggedParts = parts.filter(p => {
  const status = getPartStatus(p, vehicle.current_km);
  return status === 'due-soon' || status === 'overdue';
});
```

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit`

Expected: 0 errors across the project.

- [ ] **Step 3: Run all tests**

Run: `bun run test`

Expected: all tests pass (existing suite + the 2 new partStatus cases from Task 2).

- [ ] **Step 4: Lint**

Run: `bun run lint`

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/index.tsx
git commit -m "feat(home): only flag due-soon and overdue parts"
```

---

## Task 8: Manual verification

**Files:** none (manual smoke test)

- [ ] **Step 1: Start the app**

Run: `bun run start`

- [ ] **Step 2: Verify add-part flow with interval**

In the running app:
1. Open a vehicle (or create one).
2. Add a part with a name and a non-zero "Replace every (km)".
3. Confirm the part appears with a colored indicator (green/yellow/red) and a "X km remaining" or "X km overdue" label.

- [ ] **Step 3: Verify add-part flow without interval**

1. Add another part, leaving "Replace every (km)" blank.
2. Confirm the part saves successfully.
3. Confirm the part appears with a neutral grey indicator and label `Last replaced at <km> km`.

- [ ] **Step 4: Verify edit-part can clear an interval**

1. Long-press an existing part with an interval to edit it.
2. Clear the "Replace every (km)" field and save.
3. Confirm the part now renders as tracked (neutral indicator, "Last replaced at" label).

- [ ] **Step 5: Verify home dashboard ignores tracked parts**

1. Navigate to Home (Maintenance) tab.
2. Confirm tracked parts are not listed under any vehicle's flagged section.
3. If no due-soon/overdue parts exist, confirm the "All parts are up to date" empty state shows.

- [ ] **Step 6: Stop the dev server**

Stop `bun run start` (Ctrl+C in the terminal where it runs).

No commit — this task is verification only.
