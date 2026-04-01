import { z } from 'zod';

// ── Presets ──────────────────────────────────────────────────────────

export const PRESET_IDS = ['luxury-dark', 'clean-light', 'warm-natural', 'bold-modern'] as const;

export type PresetId = (typeof PRESET_IDS)[number];

interface Preset {
  id: PresetId;
  name: string;
  description: string;
  dark: boolean;
  font: string;
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
    input: string;
    ring: string;
  };
}

export const PRESETS: Record<PresetId, Preset> = {
  'luxury-dark': {
    id: 'luxury-dark',
    name: 'Luxury Dark',
    description: 'Gold accents on dark — premium feel',
    dark: true,
    font: 'Playfair Display',
    colors: {
      background: '0 0% 5%',
      foreground: '40 20% 96%',
      card: '0 0% 8%',
      cardForeground: '40 20% 96%',
      primary: '43 74% 49%',
      primaryForeground: '0 0% 5%',
      secondary: '0 0% 14%',
      secondaryForeground: '40 20% 96%',
      muted: '0 0% 14%',
      mutedForeground: '0 0% 64%',
      accent: '43 74% 49%',
      accentForeground: '0 0% 5%',
      border: '0 0% 16%',
      input: '0 0% 16%',
      ring: '43 74% 49%',
    },
  },
  'clean-light': {
    id: 'clean-light',
    name: 'Clean Light',
    description: 'Minimal black & white — modern simplicity',
    dark: false,
    font: 'Inter',
    colors: {
      background: '0 0% 100%',
      foreground: '0 0% 4%',
      card: '0 0% 100%',
      cardForeground: '0 0% 4%',
      primary: '0 0% 9%',
      primaryForeground: '0 0% 98%',
      secondary: '0 0% 96%',
      secondaryForeground: '0 0% 9%',
      muted: '0 0% 96%',
      mutedForeground: '0 0% 45%',
      accent: '0 0% 96%',
      accentForeground: '0 0% 9%',
      border: '0 0% 90%',
      input: '0 0% 90%',
      ring: '0 0% 4%',
    },
  },
  'warm-natural': {
    id: 'warm-natural',
    name: 'Warm Natural',
    description: 'Earthy tones — organic & welcoming',
    dark: false,
    font: 'Raleway',
    colors: {
      background: '36 33% 97%',
      foreground: '24 10% 15%',
      card: '36 33% 99%',
      cardForeground: '24 10% 15%',
      primary: '30 35% 40%',
      primaryForeground: '36 33% 97%',
      secondary: '36 20% 92%',
      secondaryForeground: '24 10% 20%',
      muted: '36 20% 92%',
      mutedForeground: '24 10% 45%',
      accent: '30 35% 40%',
      accentForeground: '36 33% 97%',
      border: '30 15% 85%',
      input: '30 15% 85%',
      ring: '30 35% 40%',
    },
  },
  'bold-modern': {
    id: 'bold-modern',
    name: 'Bold Modern',
    description: 'Deep navy with rose accents — edgy & trendy',
    dark: true,
    font: 'Montserrat',
    colors: {
      background: '235 45% 10%',
      foreground: '0 0% 96%',
      card: '235 40% 13%',
      cardForeground: '0 0% 96%',
      primary: '348 83% 58%',
      primaryForeground: '0 0% 100%',
      secondary: '235 30% 18%',
      secondaryForeground: '0 0% 96%',
      muted: '235 30% 18%',
      mutedForeground: '235 15% 60%',
      accent: '348 83% 58%',
      accentForeground: '0 0% 100%',
      border: '235 25% 20%',
      input: '235 25% 20%',
      ring: '348 83% 58%',
    },
  },
};

// ── Schema ───────────────────────────────────────────────────────────

export const salonThemeSchema = z.object({
  preset: z.enum(PRESET_IDS).default('clean-light'),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

export type SalonTheme = z.infer<typeof salonThemeSchema>;

// ── CSS Variable Builder ─────────────────────────────────────────────

export function buildThemeCssVars(theme: SalonTheme): string {
  const preset = PRESETS[theme.preset] ?? PRESETS['clean-light'];
  const colors = { ...preset.colors };

  // If a custom brand color is set, override primary + accent + ring
  if (theme.brandColor) {
    const hsl = hexToHslString(theme.brandColor);
    colors.primary = hsl;
    colors.accent = hsl;
    colors.ring = hsl;
    // Auto-derive foreground: dark text for light brand, light text for dark brand
    const lightness = parseHslLightness(hsl);
    const fg = lightness > 55 ? '0 0% 5%' : '0 0% 98%';
    colors.primaryForeground = fg;
    colors.accentForeground = fg;
  }

  const vars = Object.entries(colors).map(([key, value]) => {
    const cssVar = `--${camelToKebab(key)}`;
    return `${cssVar}: ${value};`;
  });

  vars.push(`font-family: "${preset.font}", sans-serif;`);

  return vars.join('\n');
}

export function getPresetFont(theme: SalonTheme): string {
  const preset = PRESETS[theme.preset] ?? PRESETS['clean-light'];
  return preset.font;
}

export function isPresetDark(theme: SalonTheme): boolean {
  const preset = PRESETS[theme.preset] ?? PRESETS['clean-light'];
  return preset.dark;
}

export function buildGoogleFontsUrl(fontFamily: string): string {
  const encoded = fontFamily.replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700&display=swap`;
}

// ── Color Helpers ────────────────────────────────────────────────────

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function parseHslLightness(hsl: string): number {
  const parts = hsl.match(/[\d.]+/g);
  return parts && parts.length >= 3 ? parseFloat(parts[2]) : 50;
}

export function hslStringToHex(hsl: string): string {
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return '#000000';

  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return `#${v.toString(16).padStart(2, '0').repeat(3)}`;
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function hexToHslString(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(l * 100)}%`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
