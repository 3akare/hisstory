/**
 * Colours. Sprites are drawn with characters; each character maps to a colour.
 * Character colours are shared by every sprite (characters keep their identity
 * colours everywhere), while the digits 1-6 are biome slots that change with
 * the chapter's palette.
 */
export const BASE: Record<string, string> = {
  K: '#0b0b14', // outline / near black
  k: '#1d1d2b',
  W: '#fff1e8', // warm white
  w: '#c2c3c7',
  x: '#83769c', // muted grey-violet
  G: '#5ad13a', // Pip green
  g: '#2a8a2f',
  h: '#a6f06a', // highlight green
  Y: '#ffd94a', // belly yellow / gold
  y: '#c98f2a',
  R: '#ff3b4a', // apple red
  r: '#a8202e',
  O: '#ff9a2e', // orange
  P: '#b45cff', // purple
  p: '#5f2a8a',
  B: '#9a6a3e', // brown
  b: '#5a3622',
  L: '#7ee06a', // leaf
  C: '#4fd8ff', // cyan
  c: '#2a7fa8',
  M: '#ff4fd8', // magenta
  S: '#ffb3a7', // pink (mole nose)
  N: '#3b2d4f', // mole dark fur
  n: '#6e5a86', // mole fur
  V: '#2fd6a0', // viper teal
  v: '#167a63',
  H: '#8b5cf6', // hollow king violet
  E: '#e8e2d0', // bone
};

export interface BiomePalette {
  name: string;
  /** Slot colours: 1 floor, 2 floor alt, 3 floor speckle, 4 wall, 5 wall light, 6 wall dark. */
  slots: Record<'1' | '2' | '3' | '4' | '5' | '6', string>;
  /** Behind the board. */
  backdrop: string;
  /** HUD / panel tint. */
  panel: string;
  /** Accent for UI highlights. */
  accent: string;
}

export const BIOMES = {
  orchard: {
    name: 'The Orchard',
    slots: { '1': '#2f5a2a', '2': '#2a5226', '3': '#41733a', '4': '#6b4a2a', '5': '#8f6538', '6': '#3e2a17' },
    backdrop: '#152414',
    panel: '#10200f',
    accent: '#ffd94a',
  },
  bog: {
    name: 'Mushroom Bog',
    slots: { '1': '#3a2d4a', '2': '#342842', '3': '#4d3d5e', '4': '#4a6b2a', '5': '#7ea83a', '6': '#24361a' },
    backdrop: '#17111f',
    panel: '#130e1a',
    accent: '#b6ff3a',
  },
  frost: {
    name: 'Frost Fields',
    slots: { '1': '#cfe6f2', '2': '#bcd9ea', '3': '#e9f6fc', '4': '#5a7fa8', '5': '#8fb6d9', '6': '#2f4a6b' },
    backdrop: '#1a2a3d',
    panel: '#14202f',
    accent: '#ffffff',
  },
  desert: {
    name: 'Desert Ruins',
    slots: { '1': '#d9a85e', '2': '#cf9c52', '3': '#e8bf7a', '4': '#a0522d', '5': '#c8743f', '6': '#5e2f17' },
    backdrop: '#3a2214',
    panel: '#2a180e',
    accent: '#ffe08a',
  },
  neon: {
    name: 'Neon Caves',
    slots: { '1': '#120f1f', '2': '#17132a', '3': '#2a1f4a', '4': '#ff4fd8', '5': '#ff9af0', '6': '#7a1f6b' },
    backdrop: '#07060d',
    panel: '#0d0a17',
    accent: '#4fd8ff',
  },
  sky: {
    name: 'Sky Temple',
    slots: { '1': '#a9d6f5', '2': '#9ccbee', '3': '#c9e8fb', '4': '#e0b84a', '5': '#ffe08a', '6': '#8a6a1f' },
    backdrop: '#5a8fc4',
    panel: '#2f5a85',
    accent: '#fff1e8',
  },
  hollow: {
    name: 'Hollow Throne',
    slots: { '1': '#1c1426', '2': '#20172c', '3': '#2e2240', '4': '#4b3a6b', '5': '#8b5cf6', '6': '#120c1a' },
    backdrop: '#0a0710',
    panel: '#100b17',
    accent: '#e8e2d0',
  },
} satisfies Record<string, BiomePalette>;

export type BiomeId = keyof typeof BIOMES;

export function colourFor(ch: string, biome: BiomePalette): string | null {
  if (ch === '.' || ch === ' ') return null;
  if (ch in biome.slots) return biome.slots[ch as keyof BiomePalette['slots']];
  return BASE[ch] ?? null;
}
