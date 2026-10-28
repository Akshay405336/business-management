import { STAGE_COLOR_PRESETS } from '../constants';

type RgbStyle = {
  backgroundColor: string;
  borderColor?: string;
  borderBottomColor?: string;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const NEUTRAL_STAGE_HEX = STAGE_COLOR_PRESETS[6]; // slate fallback

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function parseHexRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeStageColor(hex).slice(1);
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

/** Blend stage color with white; `colorWeight` ~0.06–0.12 yields pale pastels. */
export function mixStageColorWithWhite(stageColor: string, colorWeight: number): string {
  const { r, g, b } = parseHexRgb(stageColor);
  const weight = Math.min(1, Math.max(0, colorWeight));
  const whiteWeight = 1 - weight;
  return rgbToHex(
    clampByte(r * weight + 255 * whiteWeight),
    clampByte(g * weight + 255 * whiteWeight),
    clampByte(b * weight + 255 * whiteWeight),
  );
}

/** Normalize API/stored hex colors so Select values match preset options. */
export function normalizeStageColor(color: string | null | undefined): string {
  const trimmed = (color ?? '').trim();
  if (HEX_COLOR.test(trimmed)) return trimmed.toLowerCase();
  return NEUTRAL_STAGE_HEX;
}

/** Preset colors plus the current value when it is not in the preset list. */
export function stageColorOptions(current: string): readonly string[] {
  const normalized = normalizeStageColor(current);
  const presets = STAGE_COLOR_PRESETS.map((value) => value.toLowerCase());
  if (presets.includes(normalized)) return STAGE_COLOR_PRESETS;
  return [normalized, ...STAGE_COLOR_PRESETS] as readonly string[];
}

export type StageColorPresentation = {
  accent: string;
  columnBackground: string;
  headerBackground: string;
  border: string;
  optionHoverBackground: string;
  optionSelectedBackground: string;
};

/** Presentation-only palette from saved stage hex (does not mutate stored color). */
export function stageColorPresentation(stageColor: string): StageColorPresentation {
  const accent = normalizeStageColor(stageColor);
  return {
    accent,
    columnBackground: mixStageColorWithWhite(accent, 0.07),
    headerBackground: mixStageColorWithWhite(accent, 0.1),
    border: mixStageColorWithWhite(accent, 0.22),
    optionHoverBackground: mixStageColorWithWhite(accent, 0.06),
    optionSelectedBackground: mixStageColorWithWhite(accent, 0.1),
  };
}

/** Light Kanban column tint derived from the stage's saved hex color. */
export function stageKanbanColumnTheme(stageColor: string): {
  accent: string;
  column: RgbStyle;
  header: RgbStyle;
} {
  const palette = stageColorPresentation(stageColor);
  return {
    accent: palette.accent,
    column: {
      backgroundColor: palette.columnBackground,
      borderColor: palette.border,
    },
    header: {
      backgroundColor: palette.headerBackground,
    },
  };
}

export function stageSelectItemStyle(stageColor: string): Record<string, string> {
  const palette = stageColorPresentation(stageColor);
  return {
    '--stage-option-hover': palette.optionHoverBackground,
    '--stage-option-selected': palette.optionSelectedBackground,
  };
}
