# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server
bun run start

# Platform-specific
bun run android
bun run ios
bun run web

# Run tests
bun run test
# Single test file
npx jest __tests__/mileage.test.ts

# Lint
bun run lint

# Type-check
npx tsc --noEmit
```

## Architecture

**LogLeaf** is a vehicle maintenance tracker — multi-vehicle, local-only (no backend), built with Expo + expo-router + expo-sqlite. Source lives entirely under `src/`, with path alias `@/` mapping to `src/`.

### Routing (`src/app/`)
- `_layout.tsx` — root layout. Wraps everything in `SQLiteProvider` (runs migrations on init), `ThemeProvider`, `AnimatedSplashOverlay`, `AppTabs`. Renders `FAB` and `AddSheet` at the root so they overlay all screens.
- `index.tsx` — Home dashboard: shows vehicles with overdue/due-soon parts, "all good" empty state otherwise.
- `vehicles.tsx` — Vehicle list: tap to drill into detail, long-press to edit/delete.
- `vehicles/[id].tsx` — Vehicle detail: parts (with status indicators), odometer (with inline edit + fuel log list), mileage (lifetime/last-5 with precise/estimated badge).

### Data Layer (`src/db/`)
- `migrations.ts` — runs on every DB open via `SQLiteProvider onInit`. Sets `PRAGMA foreign_keys = ON` (per-connection) every time, then applies versioned migrations inside a transaction. v1 is the full schema.
- `vehicles.ts`, `parts.ts`, `fuelLogs.ts` — plain async functions taking `db: SQLiteDatabase` as first arg. Repositories, not classes. Used in screens via `useSQLiteContext()`.

### Pure logic (`src/utils/`)
- `partStatus.ts` — `getPartStatus(part, currentKm)` returns `'ok' | 'due-soon' | 'overdue' | 'tracked'`. Due-soon threshold is fixed at 500 km. `'tracked'` is returned when `interval_km` is null (the user is logging replacements without a defined interval).
- `mileage.ts` — `calcMileage(logs)` returns `{ lifetimeAvg, last5Avg, status }`. Two modes: **precise** (when ≥2 full-tank entries exist, math is exact between them) and **estimated** (fallback, treats first entry as anchor with fuel ignored). Status enum: `'no-logs' | 'need-more' | 'estimated' | 'precise'`.

Both are unit-tested in `__tests__/`. Pure data → data; no React, no I/O.

### State management
No external state library. Each screen calls its own DB queries inside `useFocusEffect`, refetching on navigation return. Modals receive `onSaved` callbacks to trigger parent re-fetch.

### Theming (`src/constants/theme.ts`)
Dark-only. `Colors.dark` carries the full palette (`background`, `backgroundElement`, `backgroundSelected`, `primary` #208AEF, `text`, `textSecondary`, `danger`, `warning`, `success`). `Colors.light` is aliased to dark for backward compatibility with components that index by scheme. `useTheme()` always returns `Colors.dark`.

### Modals
All modals use the shared `ModalSheet` component (bottom sheet w/ backdrop + drag handle). Modals: `add-vehicle-modal`, `add-part-modal`, `log-replacement-modal`, `log-fuel-modal`. The fuel modal has a "Filled to full" Switch that drives the `is_full_tank` flag — defaults ON. The wizard-style `AddSheet` (opened by the FAB) chains: vehicle pick → action pick → log modal.

### Platform splits
Files with `.web.tsx` or `.web.ts` suffixes override their native counterparts on web (`app-tabs`, `animated-icon`, `use-color-scheme`).

### TypeScript paths
`@/*` → `src/*`, `@/assets/*` → `assets/*` (configured in `tsconfig.json`). Jest resolves `@/` via `jest-expo`'s `moduleNameMapper`.
