import type { BiomeId } from '../art/palettes';
import { bossLevel, LevelConfig } from './level';
import { parseMarks } from './board';

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

const BOG_MAP = [
  W,
  W,
  '...###.......###....',
  W,
  W,
  W,
  '.........##.........',
  '.........##.........',
  W,
  W,
  W,
  '...###.......###....',
  W,
  W,
  W,
];

/** `~` is ice: you slide one extra tile before turning. */
const FROST_MAP = [
  W,
  W,
  '..~~~~.......~~~~...',
  '..~~~~.......~~~~...',
  W,
  '......#......#......',
  '.......~~~~~~.......',
  '.......~~~~~~.......',
  '......#......#......',
  W,
  '..~~~~.......~~~~...',
  '..~~~~.......~~~~...',
  W,
  W,
  W,
];

const DESERT_MAP = [
  W,
  '.##..............##.',
  '.#................#.',
  W,
  '.......#....#.......',
  '.......#....#.......',
  W,
  W,
  W,
  '.......#....#.......',
  '.......#....#.......',
  W,
  '.#................#.',
  '.##..............##.',
  W,
];

const NEON_MAP = [
  W,
  W,
  '....#.........#.....',
  '....#.........#.....',
  W,
  W,
  '........####........',
  W,
  W,
  '....#.........#.....',
  '....#.........#.....',
  W,
  W,
  W,
  W,
];

/** `=` is a golden gate: it opens and closes (blinking before it shuts). */
const SKY_MAP = [
  W,
  W,
  W,
  W,
  '..######==######....',
  W,
  W,
  W,
  W,
  W,
  '....######==######..',
  W,
  W,
  W,
  W,
];

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
  {
    id: 2,
    act: 1,
    name: 'MUSHROOM BOG',
    biome: 'bog',
    boss: false,
    available: true,
    level: () =>
      chapterLevel({
        title: 'CH2 MUSHROOM BOG',
        biome: 'bog',
        map: BOG_MAP,
        meterTarget: 12,
        fruitCount: 2,
        stepMs: 135,
        music: 'bog',
        twists: ['poison'],
        start: { x: 2, y: 9 },
        hint: 'PURPLE FRUIT IS POISON!\nIT SHRINKS YOU',
      }),
  },
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
  {
    id: 4,
    act: 2,
    name: 'FROST FIELDS',
    biome: 'frost',
    boss: false,
    available: true,
    level: () =>
      chapterLevel({
        title: 'CH4 FROST FIELDS',
        biome: 'frost',
        map: FROST_MAP,
        ice: parseMarks(FROST_MAP, '~'),
        meterTarget: 14,
        stepMs: 135,
        music: 'frost',
        twists: ['ice'],
        start: { x: 2, y: 13 },
        hint: 'ON ICE YOU SLIDE ONE\nMORE TILE. TURN EARLY!',
      }),
  },
  {
    id: 5,
    act: 2,
    name: 'DESERT RUINS',
    biome: 'desert',
    boss: false,
    available: true,
    level: () =>
      chapterLevel({
        title: 'CH5 DESERT RUINS',
        biome: 'desert',
        map: DESERT_MAP,
        meterTarget: 16,
        fruitCount: 3,
        stepMs: 135,
        music: 'desert',
        twists: ['portal', 'fog'],
        start: { x: 3, y: 7 },
        hint: 'EAT A BLUE TWIN TO POP\nOUT OF THE OTHER ONE!',
      }),
  },
  {
    id: 6,
    act: 2,
    name: 'MIRA + GRUB',
    biome: 'desert',
    boss: true,
    bossName: 'MIRA',
    available: true,
    level: () => ({ ...bossLevel('miraGrub'), title: 'CH6 MIRA + GRUB' }),
  },
  {
    id: 7,
    act: 3,
    name: 'NEON CAVES',
    biome: 'neon',
    boss: false,
    available: true,
    level: () =>
      chapterLevel({
        title: 'CH7 NEON CAVES',
        biome: 'neon',
        map: NEON_MAP,
        meterTarget: 18,
        stepMs: 140,
        music: 'neon',
        twists: ['speedRamp'],
        start: { x: 2, y: 13 },
        hint: 'EVERY FRUIT MAKES YOU\nFASTER. STAY CALM!',
      }),
  },
  {
    id: 8,
    act: 3,
    name: 'SKY TEMPLE',
    biome: 'sky',
    boss: false,
    available: true,
    level: () =>
      chapterLevel({
        title: 'CH8 SKY TEMPLE',
        biome: 'sky',
        map: SKY_MAP,
        gates: parseMarks(SKY_MAP, '='),
        meterTarget: 20,
        stepMs: 135,
        music: 'sky',
        twists: ['wallGaps'],
        start: { x: 2, y: 7 },
        hint: 'GOLD GATES BLINK, THEN\nSHUT. SLIP THROUGH!',
      }),
  },
  {
    id: 9,
    act: 3,
    name: 'VIPER',
    biome: 'sky',
    boss: true,
    bossName: 'VIPER',
    available: true,
    level: () => ({ ...bossLevel('viper'), title: 'CH9 VIPER' }),
  },
  {
    id: 10,
    act: 4,
    name: 'THE HOLLOW KING',
    biome: 'hollow',
    boss: true,
    bossName: 'KING',
    available: true,
    level: () => ({ ...bossLevel('king'), title: 'CH10 THE HOLLOW KING' }),
  },
];

export const chapter = (id: number): ChapterDef => CHAPTERS[id - 1];
