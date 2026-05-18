import "@/global.css";
import { Platform } from "react-native";

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

export const Colors = {
  light: dark,
  dark,
} as const;

export type ThemeColor = keyof typeof dark;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
