import type { BiomeId } from '../art/palettes';
import { Cell, Dir } from './board';
import type { BossId } from './bosses/bossKit';
import { GRUB, MIRA_GRUB_MAP, VIPER_MAP } from './bosses/tuning';
import type { TwistId } from './twists';

/** Everything PlayScene needs to set up one level. */
export interface LevelConfig {
  kind: 'classic' | 'chapter' | 'boss';
  title: string;
  biome: BiomeId;
  map?: string[];
  start: Cell;
  startDir: Dir;
  startLength: number;
  fruitCount: number;
  /** Milliseconds per snake step. */
  stepMs: number;
  /** Normal chapters: fruit needed to clear. */
  meterTarget?: number;
  boss?: BossId;
  /** One-line tip shown at the start. */
  hint?: string;
  /** Song name (audio/tracks). */
  music: string;
  /** Chapter twists (game/twists.ts). */
  twists?: TwistId[];
  /** Ice patch cells (Ch4). */
  ice?: Cell[];
  /** Gate cells that open and close (Ch8). */
  gates?: Cell[];
}

export const CLASSIC_LEVEL: LevelConfig = {
  kind: 'classic',
  title: 'CLASSIC',
  biome: 'orchard',
  start: { x: 6, y: 7 },
  startDir: 'R',
  startLength: 4,
  fruitCount: 1,
  stepMs: 135,
  music: 'orchard',
};

export function bossLevel(id: BossId): LevelConfig {
  switch (id) {
    case 'miraGrub':
      return {
        kind: 'boss',
        title: 'MIRA + GRUB',
        biome: 'desert',
        map: MIRA_GRUB_MAP,
        start: { x: 2, y: 9 },
        startDir: 'R',
        startLength: 10,
        fruitCount: 2,
        stepMs: 145,
        boss: 'miraGrub',
        music: 'boss-mira',
        hint: 'CIRCLE EITHER MOLE!\nBOTH BARS MUST FALL',
      };
    case 'viper':
      return {
        kind: 'boss',
        title: 'VIPER',
        biome: 'sky',
        map: VIPER_MAP,
        start: { x: 2, y: 12 },
        startDir: 'R',
        startLength: 10,
        fruitCount: 2,
        stepMs: 145,
        boss: 'viper',
        music: 'boss-viper',
        hint: 'MAKE HER CRASH INTO YOU,\nTHEN CIRCLE HER HEAD!',
      };
    case 'grub':
    default:
      return {
        kind: 'boss',
        title: 'GRUB THE MOLE',
        biome: 'orchard',
        map: GRUB.map,
        start: GRUB.start,
        startDir: 'R',
        startLength: GRUB.startLength,
        fruitCount: 2,
        stepMs: 150,
        boss: 'grub',
        music: 'boss-grub',
        hint: "YOU CAN'T EAT HIM.\nCOIL AROUND HIM!",
      };
  }
}
