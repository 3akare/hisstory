import type { BiomeId } from '../art/palettes';
import { Cell, Dir } from './board';
import type { BossId } from './bosses/bossKit';
import { GRUB } from './bosses/tuning';

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
