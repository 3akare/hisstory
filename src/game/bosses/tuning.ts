/**
 * Every boss number in one place, so balancing is a one-file job.
 * Times are in seconds. Values per hit are indexed by hits already taken.
 * Source: prd.md > Boss Design and Difficulty.
 */
export const MIN_TELEGRAPH = 0.8;

/** Hidden mercy: per mercy level, bosses act this much slower and warn this much longer. */
export const MERCY_SLOW = 0.1;
export const MERCY_WARN = 0.25;

export const GRUB = {
  health: 3,
  maxPocket: 16,
  /** Dirt shakes this long before he pops up. */
  telegraph: 1.0,
  /** How long he stays up, by hits taken (0, 1, 2). */
  upTime: [4.0, 3.5, 3.0],
  /** Underground pause between appearances, by hits taken. */
  hiddenTime: [1.6, 1.3, 1.0],
  /** First appearance after the fight starts. */
  firstDelay: 2.2,
  /** Squeal + stun after a coil, before he dives. */
  hitStun: 0.8,
  /** After his first hit, burrowing leaves a dirt mound (temporary wall) this long. */
  moundTime: 5.0,
  /** Holes closer than this to Pip's head are never chosen (no surprise pops in your face). */
  minHoleDistFromHead: 3,
  /** Fruit stays at least this far from the boss. */
  fruitDistance: 5,
  /** Boss arena: holes `o`. */
  map: [
    '........................',
    '........................',
    '........................',
    '........................',
    '.....o............o.....',
    '........................',
    '........................',
    '........................',
    '............o...........',
    '........................',
    '........................',
    '........................',
    '........................',
    '....o..............o....',
    '........................',
    '........................',
    '...........o............',
    '........................',
  ],
  start: { x: 5, y: 9 },
  startLength: 6,
};
