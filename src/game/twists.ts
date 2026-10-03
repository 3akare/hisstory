import type { Blocker } from './collision';
import type { FruitKind } from './fruit';
import type { World } from './world';

/**
 * Chapter twists: small rule changes that make each chapter feel different.
 * Each twist hooks into the level at a few points; the rules stay in one place.
 * (prd.md > Story Script)
 */
export type TwistId = 'poison' | 'ice' | 'fog' | 'portal' | 'speedRamp' | 'wallGaps';

export interface Twist {
  readonly id: TwistId;
  /** Choose what kind the next fruit should be. */
  fruitKind?(world: World): FruitKind;
  /** Just before every snake step. */
  beforeStep?(world: World): void;
  /** Real time (seconds). */
  update?(dt: number, world: World): void;
  /** Multiplier on the step time (below 1 = faster). */
  stepScale?(world: World): number;
  /** Extra things Pip can crash into. */
  blockers?(): Blocker[];
  /** Cells fruit must avoid. */
  reserved?(x: number, y: number): boolean;
  snapshot?(): unknown;
  restore?(data: unknown): void;
}

/** POISON (Ch2 Mushroom Bog): purple fruit shrinks you by 2 and drains the meter by 1. */
export const POISON_CHANCE = 0.4;
export const POISON_SHRINK = 2;

export class PoisonTwist implements Twist {
  readonly id = 'poison' as const;
  fruitKind(world: World): FruitKind {
    // Always keep at least one good apple on the board, and at most one poison.
    const apples = world.fruits.filter((f) => f.kind === 'apple').length;
    const poisons = world.fruits.filter((f) => f.kind === 'poison').length;
    if (apples === 0 || poisons >= 1) return 'apple';
    return world.rng.chance(POISON_CHANCE) ? 'poison' : 'apple';
  }
}

export function createTwists(ids: readonly TwistId[] = []): Twist[] {
  return ids.flatMap((id): Twist[] => {
    switch (id) {
      case 'poison':
        return [new PoisonTwist()];
      default:
        return [];
    }
  });
}
