# Stitch Visual Restyle — Design

**Date:** 2026-05-02
**Status:** Approved
**Scope:** Visual restyle of existing screens to match the Stitch design references in `assets/stitch_pit_stop_maintenance_tracker/`. No data-model changes, no new flows, no new screens.

## Goal

Bring the Pit Stop UI in line with the Stitch design system (warm-amber, dark, "high-performance precision" aesthetic) **without adding any new feature**. Every change is purely presentational. Same screens, same flows, same data.

## Out of Scope (explicitly omitted)

These appear in the design references but represent capabilities Pit Stop does not have today; we are not adding them:

- **Vehicle photos / hero images** — no `image_uri` field on Vehicle, no image picker.
- **Settings screen / settings icon** — no Settings screen exists.
- **Profile avatar** — no auth or user concept.
- **Branded "Pit Stop" top app bar** — its only purpose in the designs is to host settings + profile. With both omitted, the bar is dropped. Per-screen titles (current pattern) remain.
- **All log/edit modals** (`add-vehicle-modal`, `add-part-modal`, `log-fuel-modal`, `log-replacement-modal`) — not depicted in references. They inherit theme-color updates only.

## Theme Updates (`src/constants/theme.ts`)

Adopt the Stitch palette. Most tokens already match; this adds two and softens body text.

| Token | Current | New | Note |
|---|---|---|---|
| `background` | `#0A0A0A` | `#0A0A0A` | unchanged |
| `backgroundElement` | `#141414` | `#141414` | unchanged |
| `backgroundSelected` | `#1E1E1E` | `#1E1E1E` | unchanged |
| `backgroundElevated` | — | `#251E19` | NEW — wizard option rows |
| `primary` | `#F3A261` | `#F3A261` | unchanged |
| `primaryText` | — | `#0A0A0A` | NEW — black text on amber buttons |
| `text` | `#FFFFFF` | `#EEE0D8` | softer body text |
| `textSecondary` | `#6B7280` | `#6B7280` | unchanged |
| `textMuted` | — | `#A08D80` | NEW — outline / chevron tint |
| `danger` / `warning` / `success` | — | unchanged | — |

`Colors.light` continues to alias `Colors.dark` (existing convention).

## Icons

Install `@expo/vector-icons` and use `MaterialIcons` for all design glyphs.

| Design symbol | Component |
|---|---|
| `chevron_right` | `<MaterialIcons name="chevron-right" />` |
| `arrow_back` | `<MaterialIcons name="arrow-back" />` |
| `speed` | `<MaterialIcons name="speed" />` |
| `add` | `<MaterialIcons name="add" />` |
| `add_circle` | `<MaterialIcons name="add-circle-outline" />` |
| `local_gas_station` | `<MaterialIcons name="local-gas-station" />` |
| `settings_suggest` | `<MaterialIcons name="auto-fix-high" />` (closest match) |
| `check_circle` | `<MaterialIcons name="check-circle" />` |
| Tab: home | `<MaterialIcons name="home" />` (replaces current PNG) |
| Tab: vehicles | keep existing `MotorbikeFill` SVG (Pit Stop is bike-friendly, not car-only) |

## Per-Screen Changes

### Vehicles list (`src/app/vehicles.tsx`)

- Section header keeps "Vehicles" title. The `+ Add` button becomes a **rounded pill** (`borderRadius: 999`) with `primary` background and `primaryText` (black) text, prefixed by an `add` icon.
- Vehicle cards lose the visible border. Rounded `xl` (16px). Card layout: text block (bold name + `textSecondary` km) + trailing `chevron-right` icon in `textMuted`.
- Spacing: `gap: 24` between cards.
- FAB unchanged.

### Home (`src/app/index.tsx`)

- Uses the same restyled `VehicleCard`.
- "All good" empty state: green `check-circle` icon + label.

### Vehicle detail (`src/app/vehicles/[id].tsx`)

- Back row: `arrow-back` icon + "Back" label, both in `primary`. Title (`subtitle` style) on the line below.
- **Parts section:** header gains amber `+ Add` link with `add` icon. Each `PartStatusRow` keeps its 4px left status indicator bar but loses the surrounding border. Subtitle text uses `textSecondary`.
- **Odometer section:** collapsed to a single compact row card — `speed` icon (amber) + km value, with amber "Update" link on the right. Editing state keeps current inline TextInput layout.
- **Fuel log section:** header gains amber `+ Add fill-up` link with `add-circle-outline` icon. Each row card: km + date stacked left, litres in amber on right. No bottom border between rows; rely on `gap`.
- **Mileage section:** title with inline pill badge — green pill `✓ PRECISE` (`StatusPill`, success color, 20% alpha bg, 100% text). Per agreement, the `~ ESTIMATED` pill is dropped — when `mileage.status === 'estimated'`, no pill is shown (only the existing fallback copy). 2-col card grid for lifetime / last-5 stays as-is, restyled.

### Add-selection wizard (`src/components/add-sheet.tsx`)

- **Vehicle picker step:** title + tappable rows. Each row uses `backgroundElevated` (#251E19), rounded, no dividers. Show vehicle name + km caption.
- **Action picker step:** vehicle name as centered title, two large rows on `backgroundElevated`, each with leading icon tile (`auto-fix-high` or `local-gas-station` on a `backgroundSelected` square), title + caption, trailing chevron. Below the rows, a full-width **Cancel** button: `primary` bg, `primaryText`, rounded.
- **Replacement-part picker step:** matches vehicle picker styling (rows on `backgroundElevated`, no dividers).

### Bottom tabs (`src/components/app-tabs.tsx` + `app-tabs.web.tsx`)

- Labels uppercase, `letterSpacing: 1.5`, 12px medium.
- Active tint = `primary`, inactive = `textSecondary` (already correct).
- Border-top color stays `backgroundSelected`.
- Home tab swaps PNG for `MaterialIcons "home"`. Vehicles tab keeps `MotorbikeFill` SVG.

### `VehicleCard` (`src/components/vehicle-card.tsx`)

- Drop the border. Pill badge keeps the alpha-tint pattern but uses softer corners (already pill-ish via radius). Status text rendered at full status color rather than via the badge token.

### `PartStatusRow` (`src/components/part-status-row.tsx`)

- Remove `borderWidth` and `borderColor` from the row. `overflow: hidden` stays so the 4px indicator bar clips cleanly. Logic unchanged.

### New: `StatusPill` (`src/components/status-pill.tsx`)

```tsx
interface StatusPillProps { label: string; color: string; icon?: string }
```

Pill with `borderRadius: 999`, `paddingHorizontal: 12`, `paddingVertical: 2`, background = `color + '33'` (≈20% alpha), text in `color`, uppercase `letterSpacing: 1.5`, optional leading `MaterialIcons` glyph. Used by the Mileage `PRECISE` badge (and any future status pill).

### `FAB` (`src/components/fab.tsx`)

- Confirm 56×56, amber background, black icon, fixed position above tab bar.
- Press feedback: `scale: 0.96`, `opacity: 0.8`.

### `themed-text.tsx`

Minor: bumping `text` color to `#EEE0D8` happens automatically via theme. No structural change.

## Files Touched

- `src/constants/theme.ts`
- `src/app/index.tsx`
- `src/app/vehicles.tsx`
- `src/app/vehicles/[id].tsx`
- `src/components/vehicle-card.tsx`
- `src/components/part-status-row.tsx`
- `src/components/add-sheet.tsx`
- `src/components/app-tabs.tsx`
- `src/components/app-tabs.web.tsx`
- `src/components/fab.tsx`
- `src/components/status-pill.tsx` *(new)*
- `package.json` *(+ `@expo/vector-icons`)*

## Things I Am NOT Doing

- No DB migrations / schema changes.
- No `expo-image-picker`, no vehicle/hero photos.
- No Settings screen, no profile.
- No top app bar (header).
- No restyle of `add-vehicle-modal`, `add-part-modal`, `log-fuel-modal`, `log-replacement-modal` beyond what they get from theme colors.
- No `~ ESTIMATED` mileage pill (per user direction; only `PRECISE` shows).

## Acceptance

- App compiles, type-checks, lints clean.
- Tests still pass (`__tests__/mileage.test.ts`, `__tests__/partStatus.test.ts`).
- Each updated screen visually matches its respective design reference, modulo the explicitly-omitted features.
- No regressions to existing flows: add/edit/delete vehicle, add/edit/delete part, log replacement, log fuel, edit odometer, navigate between tabs and detail screens.
