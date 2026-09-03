import type { ColorKey } from './enums';

export interface ProgramPalette {
  /** dot, lane, timeline bar */
  solid: string;
  /** chip / card background */
  bg: string;
  /** chip text */
  text: string;
  /** session pill border, muted lane (준비 단계) */
  border: string;
  label: string;
}

export const PALETTE: Record<ColorKey, ProgramPalette> = {
  rose: { solid: '#e26b82', bg: '#fbe7ea', text: '#a12c42', border: '#f1b8c3', label: '로즈' },
  amber: { solid: '#e2a53a', bg: '#fbefd6', text: '#8a5a09', border: '#f0d6a0', label: '앰버' },
  green: { solid: '#4faa72', bg: '#e2f2e7', text: '#1f6b3e', border: '#b6dcc3', label: '그린' },
  blue: { solid: '#5b8ae0', bg: '#e3ecfb', text: '#24509a', border: '#b7c9ef', label: '블루' },
  violet: { solid: '#9b7bd6', bg: '#ede6fa', text: '#5b3c9e', border: '#d3c4f0', label: '바이올렛' },
  teal: { solid: '#3fa8a0', bg: '#dff3f1', text: '#196b62', border: '#a9dcd7', label: '틸' },
};

/** Tint colors for category tags. Stored per category as a key so the palette can evolve. */
export const TAG_COLOR_KEYS = ['indigo', 'stone', 'amber', 'green', 'teal', 'rose', 'violet', 'blue'] as const;
export type TagColorKey = (typeof TAG_COLOR_KEYS)[number];

export const TAG_PALETTE: Record<TagColorKey, { bg: string; text: string }> = {
  indigo: { bg: '#eceefc', text: '#3a47ad' },
  stone: { bg: '#f0eeea', text: '#6b6963' },
  amber: { bg: '#fbefd6', text: '#8a5a09' },
  green: { bg: '#e2f2e7', text: '#1f6b3e' },
  teal: { bg: '#dff3f1', text: '#196b62' },
  rose: { bg: '#fbe7ea', text: '#a12c42' },
  violet: { bg: '#ede6fa', text: '#5b3c9e' },
  blue: { bg: '#e3ecfb', text: '#24509a' },
};

export function tagStyle(color: string | null | undefined): { background: string; color: string } {
  const p = TAG_PALETTE[(color ?? 'stone') as TagColorKey] ?? TAG_PALETTE.stone;
  return { background: p.bg, color: p.text };
}
