import type { BiomeId } from '../art/palettes';
import { bossLevel, LevelConfig } from './level';

/**
 * The 10 chapters of Story mode, as data. Levels are data, not code.
 * `available: false` chapters show on the map as "coming soon" and are skipped
 * in the unlock chain until they're built (milestones in prd.md > What We're Building).
 */
export interface ChapterDef {
  id: number;
  act: 1 | 2 | 3 | 4;
  name: string;
  biome: BiomeId;
  boss: boolean;
  available: boolean;
  /** Short name of the boss, for the map. */
  bossName?: string;
  level: () => LevelConfig;
}

export const ACT_NAMES = ['', 'ACT I', 'ACT II', 'ACT III', 'ACT IV'];

const W = '....................';

const ORCHARD_MAP = [
  W,
  W,
  W,
  '....##..............',
  '....##..............',
  W,
  W,
  W,
  W,
  W,
  '..............##....',
  '..............##....',
  W,
  W,
  W,
];

function chapterLevel(over: Partial<LevelConfig> & Pick<LevelConfig, 'title' | 'biome' | 'music'>): LevelConfig {
  return {
    kind: 'chapter',
    start: { x: 3, y: 7 },
    startDir: 'R',
    startLength: 4,
    fruitCount: 1,
    stepMs: 140,
    ...over,
  };
}

const comingSoon = (id: number, act: 1 | 2 | 3 | 4, name: string, biome: BiomeId, boss = false, bossName?: string): ChapterDef => ({
  id,
  act,
  name,
  biome,
  boss,
  bossName,
  available: false,
  level: () => chapterLevel({ title: name, biome, music: 'orchard', meterTarget: 10 }),
});

export const CHAPTERS: ChapterDef[] = [
  {
    id: 1,
    act: 1,
    name: 'THE ORCHARD',
    biome: 'orchard',
    boss: false,
    available: true,
    level: () =>
      chapterLevel({
        title: 'CH1 THE ORCHARD',
        biome: 'orchard',
        map: ORCHARD_MAP,
        meterTarget: 10,
        music: 'orchard',
        hint: 'EAT 10 FRUIT TO\nFILL THE METER',
      }),
  },
  comingSoon(2, 1, 'MUSHROOM BOG', 'bog'),
  {
    id: 3,
    act: 1,
    name: 'GRUB THE MOLE',
    biome: 'orchard',
    boss: true,
    bossName: 'GRUB',
    available: true,
    level: () => ({ ...bossLevel('grub'), title: 'CH3 GRUB THE MOLE' }),
  },
  comingSoon(4, 2, 'FROST FIELDS', 'frost'),
  comingSoon(5, 2, 'DESERT RUINS', 'desert'),
  comingSoon(6, 2, 'MIRA + GRUB', 'desert', true, 'MIRA'),
  comingSoon(7, 3, 'NEON CAVES', 'neon'),
  comingSoon(8, 3, 'SKY TEMPLE', 'sky'),
  comingSoon(9, 3, 'VIPER', 'sky', true, 'VIPER'),
  comingSoon(10, 4, 'THE HOLLOW KING', 'hollow', true, 'KING'),
];

export const chapter = (id: number): ChapterDef => CHAPTERS[id - 1];
