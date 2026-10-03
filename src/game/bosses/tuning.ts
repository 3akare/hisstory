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

/** Ch9: Viper, a rival snake. Teaches CUTTING OFF a moving target. */
export const VIPER = {
  health: 4,
  /** Sealed-pocket limit around her head (the circling rule works too). */
  maxPocket: 12,
  /** Seconds per tile (Pip is ~0.145). */
  stepTime: 0.17,
  /** While Pip is partway round her she gets flustered and slows right down. */
  panicSlow: 2.4,
  startLength: 6,
  /** Top right, heading left with open space ahead (not facing a pillar). */
  start: { x: 15, y: 1 },
  /** Seconds between lunges, by hits taken. */
  lungeEvery: [10, 10, 7, 7],
  lungeWarn: 1.0,
  lungeLength: 3,
  lungeStepTime: 0.06,
  /** Stunned after running into Pip's body: that's your chance. */
  stunTime: 2.2,
  hitTime: 0.8,
  goneTime: 0.6,
  arriveWarn: 1.0,
  /** She comes back at least this far from Pip's head. */
  arriveMinDist: 8,
  shrinkOnHit: 3,
};

/** Ch9 arena (sky temple peak): a few golden pillars to cut her off against. */
export const VIPER_MAP = [
  '....................',
  '....................',
  '....................',
  '....#..........#....',
  '....................',
  '....................',
  '.........##.........',
  '.........##.........',
  '....................',
  '....................',
  '....#..........#....',
  '....................',
  '....................',
  '....................',
  '....................',
];

/** Ch10: the Hollow King. 3 phases × 3 coils. Tests everything you've learned. */
export const KING = {
  healthPerPhase: 3,
  /** He's 2×2, so the sealed pocket can be a little bigger. */
  maxPocket: 30,
  /** Seconds per tile he drifts, by phase (1, 2, 3). */
  driftTime: [1.2, 1.2, 0.8],
  /** Crow sweeps: seconds between, by phase (none in phase 2). */
  crowEvery: [3.5, 0, 5.5],
  crowWarn: 1.0,
  crowFly: 0.6,
  /** Phase 2: he teleports between spots this often (his shadow appears first). */
  teleportEvery: 8,
  teleportWarn: 1.0,
  /** Phase 2: old foes pop out of the holes as hazards. */
  cameoEvery: 2.6,
  cameoWarn: 1.0,
  cameoUp: 2.0,
  /** Phase 3: the outer ring crumbles inward this often, down to `maxRings` rings. */
  crumbleEvery: 20,
  crumbleWarn: 1.5,
  maxRings: 2,
  /** After a coil he vanishes and reappears elsewhere. */
  hitTime: 0.8,
  goneTime: 0.6,
  reappearWarn: 1.0,
  reappearMinDist: 7,
  /** Short pause between phases while he speaks. */
  phaseBreak: 2.5,
};

/** Where the King can stand (top-left of his 2×2 body). */
export const KING_SPOTS = [
  { x: 5, y: 4 },
  { x: 13, y: 4 },
  { x: 5, y: 9 },
  { x: 13, y: 9 },
  { x: 9, y: 6 },
];

/** Ch10 arena: the Hollow Throne. Holes `o` for the phase-2 cameos. */
export const KING_MAP = [
  '....................',
  '....................',
  '...o............o...',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '...o............o...',
  '....................',
  '....................',
];
