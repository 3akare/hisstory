/**
 * Every boss number in one place, so balancing is a one-file job.
 * Times are in seconds. Values per hit are indexed by hits already taken.
 * Source: prd.md > Boss Design and Difficulty, eased after the first play-test
 * ("too hard to coil").
 */
export const MIN_TELEGRAPH = 0.8;

/** Hidden mercy: per mercy level, bosses act this much slower and warn this much longer. */
export const MERCY_SLOW = 0.1;
export const MERCY_WARN = 0.25;

/**
 * "Trapped" grace: while Pip is partly wrapped around a boss (2+ sides), the
 * boss keeps panicking instead of escaping, up to this many extra seconds.
 * You're never robbed of a coil you're halfway through.
 */
export const TRAPPED_BONUS_MAX = 4;

export const GRUB = {
  health: 3,
  /** A loop around him counts if the space inside is at most this many cells (loose loops are fine). */
  maxPocket: 24,
  /** Dirt shakes this long before he pops up. */
  telegraph: 1.5,
  /** How long he stays up, by hits taken (0, 1, 2). */
  upTime: [7.0, 6.0, 5.0],
  /** Underground pause between appearances, by hits taken. */
  hiddenTime: [1.5, 1.2, 1.0],
  /** First appearance after the fight starts. */
  firstDelay: 2.0,
  /** Squeal + stun after a coil, before he dives. */
  hitStun: 0.8,
  /** After his first hit, burrowing leaves a dirt mound (temporary wall) this long. */
  moundTime: 5.0,
  /** Holes closer than this to Pip's head are never chosen (no surprise pops in your face). */
  minHoleDistFromHead: 3,
  /** Holes within this distance are preferred, so he's reachable in time. */
  preferHoleDist: 11,
  /** Fruit stays at least this far from the boss. */
  fruitDistance: 4,
  /** Boss arena (20×15): holes `o`. The bottom hole sits on the wall, so you can pin him there. */
  map: [
    '....................',
    '....................',
    '....................',
    '....o.........o.....',
    '....................',
    '....................',
    '....................',
    '.........o..........',
    '....................',
    '....................',
    '....................',
    '...o..........o.....',
    '....................',
    '....................',
    '.........o..........',
  ],
  start: { x: 3, y: 7 },
  /** Long enough to wrap him straight away. */
  startLength: 10,
};

/** Ch6: Mira walks the surface; Grub comes back quicker ("I'm back, and stronger!"). */
export const MIRA = {
  health: 3,
  maxPocket: 24,
  /** Seconds per tile she walks (about one tile for every two of Pip's steps). */
  stepTime: 0.34,
  /** Once Grub is down she hurries. */
  stepTimeAlone: 0.27,
  /** Her crumbling tunnel trail stays dangerous this long. */
  trailTime: 2.0,
  hitStun: 0.9,
  /** Underground after a coil, then she re-emerges somewhere else. */
  hiddenTime: 1.2,
  /** Dirt shakes where she'll come back up. */
  emergeWarn: 1.0,
  /** She re-emerges at least this far from Pip's head. */
  emergeMinDist: 7,
  start: { x: 15, y: 3 },
};

export const GRUB_RETURNS = {
  upTime: [5.0, 4.5, 4.0],
  hiddenTime: [1.4, 1.2, 1.0],
  firstDelay: 3.5,
  /** Once Mira is down he pops up more often. */
  paceAlone: 0.75,
};

/** Ch6 arena (desert ruins): holes `o`, broken pillars `#`. */
export const MIRA_GRUB_MAP = [
  '....................',
  '....................',
  '...o..........o.....',
  '....................',
  '......#......#......',
  '....................',
  '....................',
  '.........o..........',
  '....................',
  '....................',
  '......#......#......',
  '....................',
  '...o..........o.....',
  '....................',
  '....................',
];
