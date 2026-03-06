import type { PieceThemeName } from "./pieceThemes";

export type StylePresetName = "royal" | "vintage" | "midnight";

export type StylePreset = {
  name: StylePresetName;
  label: string;
  description: string;
  pieceTheme: PieceThemeName;
  lightSquare: string;
  darkSquare: string;
  selectedRing: string;
  moveHint: string;
  accent: string;
  panelBackground: string;
  panelBorder: string;
  pageBackground: string;
};

export const STYLE_PRESETS: Record<StylePresetName, StylePreset> = {
  royal: {
    name: "royal",
    label: "Royal Court",
    description: "Bright ivory pieces on a warm tournament board.",
    pieceTheme: "royal",
    lightSquare: "#f5e2c1",
    darkSquare: "#9c6a42",
    selectedRing: "#f3d556",
    moveHint: "rgba(33, 151, 94, 0.68)",
    accent: "#4969d9",
    panelBackground: "rgba(255, 247, 233, 0.94)",
    panelBorder: "rgba(124, 82, 50, 0.18)",
    pageBackground:
      "radial-gradient(circle at top, rgba(248, 235, 216, 0.98), rgba(126, 82, 49, 0.96))",
  },
  vintage: {
    name: "vintage",
    label: "Old Library",
    description: "Carved wooden pieces with a faded parchment board.",
    pieceTheme: "vintage",
    lightSquare: "#ddd0b4",
    darkSquare: "#785740",
    selectedRing: "#ddb667",
    moveHint: "rgba(146, 101, 40, 0.58)",
    accent: "#936945",
    panelBackground: "rgba(241, 231, 213, 0.95)",
    panelBorder: "rgba(105, 78, 54, 0.22)",
    pageBackground:
      "radial-gradient(circle at top, rgba(244, 234, 216, 0.98), rgba(110, 83, 58, 0.96))",
  },
  midnight: {
    name: "midnight",
    label: "Midnight Glass",
    description: "Cool slate squares with luminous high-contrast pieces.",
    pieceTheme: "midnight",
    lightSquare: "#b7c8dc",
    darkSquare: "#46576f",
    selectedRing: "#84dbff",
    moveHint: "rgba(56, 189, 248, 0.54)",
    accent: "#63a4ff",
    panelBackground: "rgba(8, 15, 29, 0.9)",
    panelBorder: "rgba(148, 163, 184, 0.22)",
    pageBackground:
      "radial-gradient(circle at top, rgba(30, 45, 70, 0.98), rgba(5, 8, 16, 1))",
  },
};

export const STYLE_PRESET_OPTIONS = Object.values(STYLE_PRESETS);

