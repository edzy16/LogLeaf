# Stitch Visual Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Pit Stop's existing screens (Home, Vehicles list, Vehicle detail) and the add-selection wizard to match the Stitch design references — visual only, no new features, no DB changes.

**Architecture:** Theme-token-first refactor. Update `Colors.dark` once; let `ThemedText`/`ThemedView` and component-level styles consume the new tokens. Replace text glyphs with `MaterialIcons` from `@expo/vector-icons`. Introduce one new shared component (`StatusPill`). Each screen/component is restyled independently; flows and data stay untouched.

**Tech Stack:** React Native 0.83, Expo 55, expo-router, TypeScript, `@expo/vector-icons` (new), `react-native-svg` (existing for the bike SVG icon).

**Spec:** `docs/superpowers/specs/2026-05-02-stitch-visual-restyle-design.md`

**Verification commands** (used throughout):
- `bun run lint`
- `npx tsc --noEmit`
- `bun run test`

There is no UI test harness in this project; verification is type-check + lint + existing pure-logic tests + manual visual check against the design references.

---

## File Map

**Modified:**
- `src/constants/theme.ts` — palette additions
- `src/components/part-status-row.tsx` — drop border
- `src/components/vehicle-card.tsx` — drop border, brighter status text
- `src/components/fab.tsx` — swap text "+" for MaterialIcons "add"
- `src/components/add-sheet.tsx` — full restyle (rows on backgroundElevated, icon tiles, Cancel button)
- `src/components/app-tabs.tsx` — uppercase labels, swap home PNG for MaterialIcons
- `src/app/index.tsx` — "All good" gets check-circle icon
- `src/app/vehicles.tsx` — pill Add button, chevron-right on cards
- `src/app/vehicles/[id].tsx` — back arrow icon, parts +Add icon, speed icon, fuel log restyle, PRECISE pill (drop ESTIMATED)
- `package.json` — add `@expo/vector-icons`

**Created:**
- `src/components/status-pill.tsx` — shared pill badge

**Untouched on purpose:**
- `src/components/app-tabs.web.tsx` — uses ThemedView/ThemedText, picks up theme automatically; no structural change needed
- `src/components/modals/*` — out of scope per spec
- `src/components/modal-sheet.tsx` — already matches design (20px radius, drag handle)
- `src/components/global-add-launcher.tsx` — no visual content of its own

---

## Task 1: Install `@expo/vector-icons`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
bun add @expo/vector-icons
```

Expected: package added to `dependencies`. Expo 55 already has it as a transitive dep (it ships with `expo`), but adding it explicitly to `package.json` documents intent and makes imports stable.

- [ ] **Step 2: Verify import resolves**

Run:

```bash
npx tsc --noEmit
```

Then in any TS file (don't commit), temporarily add:

```ts
import { MaterialIcons } from '@expo/vector-icons';
const _check = MaterialIcons;
```

Expected: typecheck passes. Remove the temporary lines.

- [ ] **Step 3: Verify lint and tests still pass**

```bash
bun run lint
bun run test
```

Expected: clean lint, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: add @expo/vector-icons for MaterialIcons usage"
```

(If the lockfile is `package-lock.json` instead, swap accordingly. The repo currently shows `package-lock.json` deleted — let bun regenerate `bun.lockb`.)

---

## Task 2: Extend Theme Palette

**Files:**
- Modify: `src/constants/theme.ts`

- [ ] **Step 1: Update the `dark` palette and type**

Replace the `dark` object in `src/constants/theme.ts:4-14` with:

```ts
const dark = {
  background: "#0A0A0A",
  backgroundElement: "#141414",
  backgroundSelected: "#1E1E1E",
  backgroundElevated: "#251E19",
  primary: "#F3A261",
  primaryText: "#0A0A0A",
  text: "#EEE0D8",
  textSecondary: "#6B7280",
  textMuted: "#A08D80",
  danger: "#EF4444",
  warning: "#F59E0B",
  success: "#22C55E",
} as const;
```

Leave the `Colors`, `Fonts`, `Spacing`, `BottomTabInset`, `MaxContentWidth` exports untouched. The `ThemeColor` type (`keyof typeof dark`) automatically picks up the new keys.

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: clean. (Existing references to `themeColor="text"`, `"primary"`, `"textSecondary"` still work; `text` just rendered slightly softer.)

- [ ] **Step 3: Verify lint and tests**

```bash
bun run lint
bun run test
```

Expected: clean lint, tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/constants/theme.ts
git commit -m "feat(theme): add backgroundElevated/primaryText/textMuted tokens, soften text"
```

---

## Task 3: New Shared `StatusPill` Component

**Files:**
- Create: `src/components/status-pill.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/status-pill.tsx` with:

```tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { ThemedText } from './themed-text';

interface StatusPillProps {
  label: string;
  color: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
}

export function StatusPill({ label, color, icon }: StatusPillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '33' }]}>
      {icon && <MaterialIcons name={icon} size={12} color={color} />}
      <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
```

The `color + '33'` trick gives ~20% alpha background while text stays at full color, matching the design spec.

- [ ] **Step 2: Verify typecheck and lint**

```bash
npx tsc --noEmit
bun run lint
```

Expected: clean. (Component is unused — that's OK; lint should not flag a new exported component.)

- [ ] **Step 3: Commit**

```bash
git add src/components/status-pill.tsx
git commit -m "feat(ui): add StatusPill component for status badges"
```

---

## Task 4: Restyle FAB

**Files:**
- Modify: `src/components/fab.tsx`

- [ ] **Step 1: Replace the text glyph with a MaterialIcons "add"**

Replace the contents of `src/components/fab.tsx` with:

```tsx
import React from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { BottomTabInset, Colors, Spacing } from "@/constants/theme";

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Add"
    >
      <MaterialIcons name="add" size={28} color={Colors.dark.primaryText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: BottomTabInset + Spacing.three,
    right: Spacing.four,
    zIndex: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3.84,
      },
    }),
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
```

Notes:
- Removes the `ThemedText` import (no longer used).
- Icon color uses the new `primaryText` token (black) — was previously hard-coded `#fff`, which had poor contrast on amber.
- Removes the redundant `accessibilityState={{ disabled: false }}` and the `importantForAccessibility` prop on the now-removed text node.

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
bun run lint
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/fab.tsx
git commit -m "style(fab): use MaterialIcons add and primaryText for contrast"
```

---

## Task 5: Restyle `PartStatusRow`

**Files:**
- Modify: `src/components/part-status-row.tsx`

- [ ] **Step 1: Drop the border on the row**

Replace the `styles` object (lines 51-72) with:

```ts
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.three,
    overflow: 'hidden',
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

Net change: removed `borderWidth: 1` and `borderColor: Colors.dark.backgroundSelected` from `row`. Everything else is identical.

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
bun run lint
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/part-status-row.tsx
git commit -m "style(part-row): drop card border per Stitch design"
```

---

## Task 6: Restyle `VehicleCard` (Home)

**Files:**
- Modify: `src/components/vehicle-card.tsx`

- [ ] **Step 1: Update card chrome and badge**

Replace the `styles` object (lines 56-92) with:

```ts
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
  badgeAlert: {
    backgroundColor: Colors.dark.danger + '33',
  },
  badgeOk: {
    backgroundColor: Colors.dark.success + '33',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  parts: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
```

Changes vs. previous:
- Removed `borderWidth` / `borderColor` from `card`.
- `badge` now `borderRadius: 999` (full pill) and slightly larger horizontal padding.
- `badgeText` gains `fontWeight: '500'`.

- [ ] **Step 2: Brighten the badge text to use status color**

In the JSX (around lines 28-34), update the badge text to use the matching status color:

```tsx
<View
  style={[
    styles.badge,
    flaggedParts.length > 0 ? styles.badgeAlert : styles.badgeOk,
  ]}>
  <ThemedText
    type="small"
    style={[
      styles.badgeText,
      { color: flaggedParts.length > 0 ? Colors.dark.danger : Colors.dark.success },
    ]}>
    {flaggedParts.length > 0
      ? `${flaggedParts.length} part${flaggedParts.length > 1 ? 's' : ''} due`
      : 'All good'}
  </ThemedText>
</View>
```

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit
bun run lint
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/vehicle-card.tsx
git commit -m "style(vehicle-card): borderless card, pill badge, colored badge text"
```

---

## Task 7: Restyle Home Screen "All Good" State

**Files:**
- Modify: `src/app/index.tsx`

- [ ] **Step 1: Add MaterialIcons import**

Add at the top of `src/app/index.tsx` next to existing imports:

```tsx
import { MaterialIcons } from '@expo/vector-icons';
```

- [ ] **Step 2: Replace the "All good" check glyph with the icon**

Find the block at lines 77-82 (the `!hasFlags && data.length > 0` branch) and replace with:

```tsx
{!hasFlags && data.length > 0 && (
  <View style={styles.allGood}>
    <MaterialIcons
      name="check-circle"
      size={20}
      color={Colors.dark.success}
    />
    <ThemedText type="default">All parts are up to date</ThemedText>
  </View>
)}
```

Then remove the now-unused `allGoodIcon` style from the StyleSheet (lines 146-149).

The remaining `allGood` style is still correct (flexDirection row + gap).

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit
bun run lint
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/index.tsx
git commit -m "style(home): use check-circle icon for all-good empty state"
```

---

## Task 8: Restyle Vehicles List Screen

**Files:**
- Modify: `src/app/vehicles.tsx`

- [ ] **Step 1: Update imports**

At the top of `src/app/vehicles.tsx`, add:

```tsx
import { MaterialIcons } from '@expo/vector-icons';
```

- [ ] **Step 2: Replace the "+ Add" button JSX**

Find the `<TouchableOpacity style={styles.addButton}…>` block (around lines 75-79). Replace with:

```tsx
<TouchableOpacity
  style={styles.addButton}
  onPress={() => setAddModalOpen(true)}>
  <MaterialIcons name="add" size={16} color={Colors.dark.primaryText} />
  <ThemedText style={styles.addButtonText}>Add</ThemedText>
</TouchableOpacity>
```

- [ ] **Step 3: Replace the vehicle card JSX**

Find the `vehicles.map(vehicle => (…))` block (around lines 91-104) and replace with:

```tsx
{vehicles.map(vehicle => (
  <Pressable
    key={vehicle.id}
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    onPress={() => router.push(`/vehicles/${vehicle.id}`)}
    onLongPress={() => handleLongPress(vehicle)}>
    <View style={styles.cardContent}>
      <ThemedText type="default" style={styles.vehicleName}>
        {vehicle.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {vehicle.current_km.toLocaleString()} km
      </ThemedText>
    </View>
    <MaterialIcons
      name="chevron-right"
      size={24}
      color={Colors.dark.textMuted}
    />
  </Pressable>
))}
```

- [ ] **Step 4: Update styles**

Replace the `styles` object (lines 130-178) with:

```ts
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  addButtonText: {
    color: Colors.dark.primaryText,
    fontWeight: '600',
    fontSize: 13,
  },
  emptyState: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  cardContent: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  vehicleName: {
    fontWeight: '700',
  },
});
```

Changes:
- `addButton`: now flex-row + gap, `borderRadius: 999` (pill), removed background uses primary directly.
- `addButtonText`: uses `primaryText` token (was hardcoded `#fff`), explicit 13px size.
- `card`: now flex-row container, no border, no internal `gap` (handled by `cardContent`).
- New `cardContent` wrapper holds the text stack.
- `vehicleName` weight bumped to 700 to match design `title-bold`.

- [ ] **Step 5: Typecheck, lint, tests**

```bash
npx tsc --noEmit
bun run lint
bun run test
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/vehicles.tsx
git commit -m "style(vehicles): pill add button, chevron-right card, drop border"
```

---

## Task 9: Restyle Vehicle Detail Screen

**Files:**
- Modify: `src/app/vehicles/[id].tsx`

- [ ] **Step 1: Update imports**

At the top of `src/app/vehicles/[id].tsx`, add:

```tsx
import { MaterialIcons } from "@expo/vector-icons";
import { StatusPill } from "@/components/status-pill";
```

- [ ] **Step 2: Update the back button + title block**

Replace the existing back-button block (around lines 208-218) with:

```tsx
<SafeAreaView edges={["top"]}>
  <TouchableOpacity
    onPress={() => router.back()}
    style={styles.backButton}
  >
    <MaterialIcons name="arrow-back" size={16} color={Colors.dark.primary} />
    <ThemedText themeColor="primary">Back</ThemedText>
  </TouchableOpacity>
  <ThemedText type="subtitle" style={styles.vehicleName}>
    {vehicle.name}
  </ThemedText>
</SafeAreaView>
```

The not-found branch (around line 88-94) keeps the simple text "← Back" (it's a fallback rarely seen).

- [ ] **Step 3: Update the Parts section header `+ Add` button**

Replace the `<TouchableOpacity onPress={() => setAddPartOpen(true)}>` button (around lines 226-228) with:

```tsx
<TouchableOpacity
  onPress={() => setAddPartOpen(true)}
  style={styles.iconLink}>
  <MaterialIcons name="add" size={18} color={Colors.dark.primary} />
  <ThemedText themeColor="primary">Add</ThemedText>
</TouchableOpacity>
```

- [ ] **Step 4: Restyle the Odometer row**

Replace the `editingOdometer ? (…) : (…)` block (around lines 257-286) with:

```tsx
{editingOdometer ? (
  <View style={styles.odometerEdit}>
    <TextInput
      style={styles.odometerInput}
      value={odometerInput}
      onChangeText={setOdometerInput}
      keyboardType="numeric"
      autoFocus
      selectTextOnFocus
    />
    <TouchableOpacity
      style={styles.saveButton}
      onPress={handleOdometerSave}
    >
      <ThemedText style={styles.saveButtonText}>Save</ThemedText>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setEditingOdometer(false)}>
      <ThemedText themeColor="textSecondary">Cancel</ThemedText>
    </TouchableOpacity>
  </View>
) : (
  <View style={styles.odometerRow}>
    <View style={styles.odometerLeft}>
      <MaterialIcons name="speed" size={20} color={Colors.dark.primary} />
      <ThemedText type="default" style={styles.odometerValue}>
        {vehicle.current_km.toLocaleString()} km
      </ThemedText>
    </View>
    <TouchableOpacity onPress={() => setEditingOdometer(true)}>
      <ThemedText themeColor="primary">Update</ThemedText>
    </TouchableOpacity>
  </View>
)}
```

- [ ] **Step 5: Restyle the Fuel log section**

Replace the `<View style={styles.fuelHeader}>…</View>` and the fuel rows block (around lines 288-320) with:

```tsx
<View style={styles.fuelHeader}>
  <ThemedText type="default" style={styles.sectionTitle}>
    Fuel log
  </ThemedText>
  <TouchableOpacity
    onPress={() => setLogFuelOpen(true)}
    style={styles.iconLink}>
    <MaterialIcons name="add-circle-outline" size={18} color={Colors.dark.primary} />
    <ThemedText themeColor="primary">Add fill-up</ThemedText>
  </TouchableOpacity>
</View>

{fuelLogs.length === 0 && (
  <ThemedText type="small" themeColor="textSecondary">
    No fuel entries yet.
  </ThemedText>
)}
{[...fuelLogs].reverse().map((log) => (
  <TouchableOpacity
    key={log.id}
    onLongPress={() => handleFuelLogLongPress(log)}
    style={styles.fuelRow}
  >
    <View style={styles.fuelRowLeft}>
      <ThemedText type="default" style={styles.fuelKm}>
        {log.odometer_km.toLocaleString()} km
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {new Date(log.logged_at).toLocaleDateString()}
      </ThemedText>
    </View>
    <ThemedText style={styles.fuelLitres}>
      {log.fuel_litres} L{log.is_full_tank ? "" : " (partial)"}
    </ThemedText>
  </TouchableOpacity>
))}
```

Notes:
- Fuel log gets its own visible section header (was previously a small caption attached to the odometer block).
- Each row is now a card on `backgroundElement` with km + date stacked left, litres in amber on the right. Long-press to delete still works.
- `(partial)` suffix is preserved when not a full tank.

- [ ] **Step 6: Restyle the Mileage section (drop ESTIMATED pill)**

Replace the `mileageBadge` helper (lines 189-198) and the JSX usage so estimated state shows no pill. Update the helper:

```tsx
const mileageBadge = () => {
  if (!mileage) return null;
  if (mileage.status === "precise") {
    return { label: "Precise", icon: "check-circle" as const, color: Colors.dark.success };
  }
  return null;
};
```

Then in the JSX (around lines 325-334), replace the badge rendering with:

```tsx
<View style={styles.mileageHeader}>
  <ThemedText type="default" style={styles.sectionTitle}>
    Mileage
  </ThemedText>
  {mileageBadge() && (
    <StatusPill
      label={mileageBadge()!.label}
      icon={mileageBadge()!.icon}
      color={mileageBadge()!.color}
    />
  )}
</View>
```

When `mileage.status === 'estimated'`, no pill renders (per spec). When `'no-logs'` or `'need-more'`, the existing fallback copy still renders.

- [ ] **Step 7: Update the styles object**

Append/replace the relevant styles in the `StyleSheet.create({…})` block (lines 414-515):

Replace `backButton` and `vehicleName`:

```ts
backButton: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingTop: Spacing.four,
  paddingBottom: Spacing.two,
},
vehicleName: {
  marginBottom: Spacing.two,
},
```

Add (or replace) these:

```ts
iconLink: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
},
odometerRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: Colors.dark.backgroundElement,
  borderRadius: Spacing.two,
  padding: Spacing.three,
},
odometerLeft: {
  flexDirection: "row",
  alignItems: "center",
  gap: Spacing.two,
},
odometerValue: {
  fontWeight: "700",
},
fuelHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
fuelRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: Colors.dark.backgroundElement,
  borderRadius: Spacing.two,
  padding: Spacing.three,
},
fuelRowLeft: {
  gap: Spacing.half,
},
fuelKm: {
  fontWeight: "700",
},
fuelLitres: {
  color: Colors.dark.primary,
  fontWeight: "700",
},
```

Remove the now-obsolete `smallLink` style (no longer referenced). Drop the `borderBottom` props from the old `fuelRow`. Drop the `marginTop: Spacing.two` from `fuelHeader`. Keep `mileageHeader`, `mileageCards`, `mileageCard`, `notFound`, `section`, `sectionHeader`, `sectionTitle`, `odometerEdit`, `odometerInput`, `saveButton`, `saveButtonText` as-is (still referenced).

- [ ] **Step 8: Typecheck, lint, tests**

```bash
npx tsc --noEmit
bun run lint
bun run test
```

Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add src/app/vehicles/[id].tsx
git commit -m "style(vehicle-detail): icons, fuel log section, PRECISE pill"
```

---

## Task 10: Restyle Add-Selection Wizard

**Files:**
- Modify: `src/components/add-sheet.tsx`

- [ ] **Step 1: Replace the file contents**

Replace `src/components/add-sheet.tsx` with:

```tsx
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { Colors, Spacing } from '@/constants/theme';
import { Vehicle, Part } from '@/types';
import { getVehicles } from '@/db/vehicles';
import { getPartsByVehicle } from '@/db/parts';
import { ModalSheet } from './modal-sheet';
import { LogReplacementModal } from './modals/log-replacement-modal';
import { LogFuelModal } from './modals/log-fuel-modal';
import { ThemedText } from './themed-text';

type AddAction = 'replacement' | 'fuel' | null;

interface AddSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddSheet({ visible, onClose, onSaved }: AddSheetProps) {
  const db = useSQLiteContext();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [action, setAction] = useState<AddAction>(null);

  useEffect(() => {
    if (visible) {
      getVehicles(db).then(setVehicles);
      setSelectedVehicle(null);
      setParts([]);
      setSelectedPart(null);
      setAction(null);
    }
  }, [visible, db]);

  async function handleVehicleSelect(vehicle: Vehicle) {
    setSelectedVehicle(vehicle);
    const p = await getPartsByVehicle(db, vehicle.id);
    setParts(p);
  }

  function handleActionSelect(a: AddAction) {
    if (!selectedVehicle) return;
    setAction(a);
  }

  function handleSaved() {
    onSaved();
    onClose();
    setAction(null);
  }

  if (!selectedVehicle) {
    return (
      <ModalSheet visible={visible} onClose={onClose}>
        <ThemedText type="subtitle" style={styles.titleCenter}>
          Select Vehicle
        </ThemedText>
        {vehicles.length === 0 && (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No vehicles yet. Add one from the Vehicles tab.
          </ThemedText>
        )}
        <View style={styles.rowList}>
          {vehicles.map(v => (
            <TouchableOpacity
              key={v.id}
              style={styles.simpleRow}
              onPress={() => handleVehicleSelect(v)}>
              <View style={styles.simpleRowContent}>
                <ThemedText type="default" style={styles.rowTitle}>{v.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {v.current_km.toLocaleString()} km
                </ThemedText>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ModalSheet>
    );
  }

  return (
    <>
      <ModalSheet visible={visible && action === null} onClose={onClose}>
        <ThemedText type="subtitle" style={styles.titleCenter}>
          {selectedVehicle.name}
        </ThemedText>
        <ThemedText style={styles.stepCaption} themeColor="textSecondary">
          CHOOSE ACTION
        </ThemedText>
        <View style={styles.rowList}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => handleActionSelect('replacement')}>
            <View style={styles.iconTile}>
              <MaterialIcons name="auto-fix-high" size={24} color={Colors.dark.primary} />
            </View>
            <View style={styles.actionRowContent}>
              <ThemedText type="default" style={styles.rowTitle}>Log Part Replacement</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Reset maintenance interval
              </ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => handleActionSelect('fuel')}>
            <View style={styles.iconTile}>
              <MaterialIcons name="local-gas-station" size={24} color={Colors.dark.primary} />
            </View>
            <View style={styles.actionRowContent}>
              <ThemedText type="default" style={styles.rowTitle}>Log Fuel Fill-up</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Track mileage and cost
              </ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </TouchableOpacity>
      </ModalSheet>

      {action === 'replacement' && (
        <ModalSheet visible onClose={() => setAction(null)}>
          <ThemedText type="subtitle" style={styles.titleCenter}>
            Select Part
          </ThemedText>
          {parts.length === 0 && (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No parts for this vehicle yet.
            </ThemedText>
          )}
          <View style={styles.rowList}>
            {parts.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.simpleRow}
                onPress={() => setSelectedPart(p)}>
                <ThemedText type="default" style={styles.rowTitle}>{p.name}</ThemedText>
                <MaterialIcons name="chevron-right" size={20} color={Colors.dark.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
          <LogReplacementModal
            visible={selectedPart !== null}
            onClose={() => setSelectedPart(null)}
            onSaved={handleSaved}
            part={selectedPart}
            vehicleId={selectedVehicle.id}
            currentKm={selectedVehicle.current_km}
          />
        </ModalSheet>
      )}

      <LogFuelModal
        visible={action === 'fuel'}
        onClose={() => setAction(null)}
        onSaved={handleSaved}
        vehicleId={selectedVehicle.id}
        currentKm={selectedVehicle.current_km}
      />
    </>
  );
}

const styles = StyleSheet.create({
  titleCenter: {
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  stepCaption: {
    textAlign: 'center',
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.four,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  rowList: {
    gap: Spacing.two,
  },
  simpleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundElevated,
  },
  simpleRowContent: {
    flex: 1,
    gap: Spacing.half,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundElevated,
  },
  actionRowContent: {
    flex: 1,
    gap: Spacing.half,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: Spacing.two,
    backgroundColor: Colors.dark.backgroundSelected,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: {
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  cancelText: {
    color: Colors.dark.primaryText,
    fontWeight: '700',
    fontSize: 16,
  },
});
```

- [ ] **Step 2: Typecheck, lint, tests**

```bash
npx tsc --noEmit
bun run lint
bun run test
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/add-sheet.tsx
git commit -m "style(add-sheet): wizard restyle with icon tiles and Cancel button"
```

---

## Task 11: Restyle Bottom Tabs (Native)

**Files:**
- Modify: `src/components/app-tabs.tsx`

- [ ] **Step 1: Update imports and tab options**

Replace the contents of `src/components/app-tabs.tsx` with:

```tsx
import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import MotorbikeFill from "@/assets/icons/bike";
import { Colors } from "@/constants/theme";

export default function AppTabs() {
  const colors = Colors.dark;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.backgroundElement,
          borderTopColor: colors.backgroundSelected,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="home" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="vehicles"
        options={{
          title: "Vehicles",
          tabBarIcon: ({ color }) => <MotorbikeFill color={color} size={20} />,
        }}
      />

      <Tabs.Screen
        name="vehicles/[id]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
```

Changes:
- Adds `tabBarLabelStyle` for uppercase tracked labels.
- Replaces the home PNG with `MaterialIcons name="home"`.
- Removes `Image` import (no longer used).
- `MotorbikeFill` SVG stays for the Vehicles tab.

- [ ] **Step 2: Typecheck, lint, tests**

```bash
npx tsc --noEmit
bun run lint
bun run test
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/app-tabs.tsx
git commit -m "style(tabs): uppercase labels, MaterialIcons home glyph"
```

---

## Task 12: Final Verification

**Files:** none modified

- [ ] **Step 1: Run the full check suite**

```bash
bun run lint
npx tsc --noEmit
bun run test
```

Expected: all clean.

- [ ] **Step 2: Manual smoke test**

Start the dev server and walk through:

```bash
bun run start
```

On a device or emulator:

1. **Home tab:** confirm "All parts are up to date" shows the green check icon (when no flagged parts), or the restyled `VehicleCard`s with pill badges (when parts are due).
2. **Vehicles tab:** confirm pill `+ Add` button (amber, black text), borderless cards with chevron-right.
3. Tap a vehicle: confirm back arrow icon, title, restyled Parts/Odometer/Fuel log/Mileage sections. Mileage badge shows `✓ PRECISE` only when `precise`; nothing when `estimated`.
4. Tap the FAB: vehicle picker → action picker (icon tiles + Cancel button) → flows still work end to end.
5. Edit odometer inline (still works).
6. Long-press a part / fuel log entry — context menus still work.
7. Add/edit/delete a vehicle — modals still work (their colors will have shifted slightly with the theme update).

Compare each screen visually against:
- `assets/stitch_pit_stop_maintenance_tracker/vehicles_list/screen.png`
- `assets/stitch_pit_stop_maintenance_tracker/vehicle_detail/screen.png`
- `assets/stitch_pit_stop_maintenance_tracker/add_selection_modal/screen.png`

Note any deviations and fix them in a follow-up commit if found.

- [ ] **Step 3: No further commit unless fixes were needed**

If smoke test passes, this task has no commit. If fixes were applied, commit them with:

```bash
git commit -am "fix(ui): smoke-test follow-ups"
```

---

## Self-Review Notes

- **Spec coverage:** every section in the spec maps to a task — theme (T2), icons install (T1), StatusPill (T3), FAB (T4), PartStatusRow (T5), VehicleCard/Home (T6/T7), Vehicles list (T8), Vehicle detail (T9), Add-sheet wizard (T10), Tabs (T11), out-of-scope items handled by being absent (no Task for app-tabs.web, no Task for top app bar, no Task for ESTIMATED pill since T9 explicitly drops it).
- **Type consistency:** `mileageBadge()` returns `{ label; icon: 'check-circle'; color }` in T9 and is consumed via `StatusPill` defined in T3 with `label / color / icon` props — matches.
- **Placeholder scan:** every code step contains the actual code; no "TBD"/"add appropriate handling"/etc.
- **Sequence:** Task 1 (install) precedes any task that imports `MaterialIcons`. Task 2 (theme) precedes any task that uses `primaryText`/`textMuted`/`backgroundElevated`. Task 3 (StatusPill) precedes Task 9 which uses it.
