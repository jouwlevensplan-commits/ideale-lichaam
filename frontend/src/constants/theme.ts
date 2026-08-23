/**
 * Kleurenpalet conform `frontend-design-spec-v2.md` §1 (SnapMacro_Kleuren.md). Rustgevende,
 * gezonde, minimalistische esthetiek: de neutrale basis vult ~85% van de interface; macro- en
 * statuskleuren zijn uitsluitend functioneel (nooit decoratief).
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Pagina-achtergrond
    background: '#FAFAF7',
    // Kaart- & containerachtergrond
    backgroundElement: '#FFFFFF',
    // Geselecteerde/actieve staat (bv. ingedrukte kaart)
    backgroundSelected: '#F0EFE9',
    // Lichte rand / scheidingslijn
    border: '#E8E6DF',
    // Sterkere rand / focuslijn
    borderFocus: '#D3D1C7',
    text: '#2C2C2A',
    textSecondary: '#5F5E5A',
    textMuted: '#888780',
  },
  dark: {
    background: '#121210',
    backgroundElement: '#1E1E1B',
    backgroundSelected: '#28281F',
    // Spec geeft geen expliciete dark-mode randen/tekstkleuren; hieronder afgeleid voor
    // voldoende contrast tegen de opgegeven dark-achtergronden (#121210 / #1E1E1B).
    border: '#2E2E28',
    borderFocus: '#42423A',
    text: '#F2F1EC',
    textSecondary: '#B8B6AC',
    textMuted: '#84837C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Macro-kleuren: uitsluitend gebruikt voor ringen, grafieken en labels per macronutriënt. */
export const MacroColors = {
  protein: { color: '#1D9E75', fill: '#E1F5EE' },
  carbs: { color: '#EF9F27', fill: '#FAEEDA' },
  fat: { color: '#378ADD', fill: '#E6F1FB' },
} as const;

/** Status- en accentkleuren: uitsluitend voor feedback en primaire handelingen. */
export const StatusColors = {
  success: '#639922',
  warning: '#BA7517',
  error: '#E24B4A',
  /** Accent / hoofdknop per scherm (kobaltblauw). */
  accent: '#185FA5',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
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

/** Conform spec: alle kaarten/containers/invoervelden gebruiken 16–20px border-radius. */
export const Radius = {
  card: 18,
  input: 16,
  pill: 999,
} as const;

/** Zeer subtiele schaduw conform spec (elevation 2 / shadowOpacity 0.04). */
export const CardShadow = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  android: {
    elevation: 2,
  },
  default: {},
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
