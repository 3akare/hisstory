import { Cell, cellKey } from './board';
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

/**
 * ICE (Ch4 Frost Fields): on an ice patch you slide one extra tile before a
 * turn takes effect. The turn isn't lost, just late.
 */
export class IceTwist implements Twist {
  readonly id = 'ice' as const;
  readonly cells: Set<number>;
  private held: World['snake']['queue'] | null = null;

  constructor(ice: readonly Cell[]) {
    this.cells = new Set(ice.map((c) => cellKey(c.x, c.y)));
  }

  isIce(x: number, y: number): boolean {
    return this.cells.has(cellKey(x, y));
  }

  beforeStep(world: World): void {
    const s = world.snake;
    if (this.held) {
      // We slid one tile last step; now the turn happens.
      s.queue = [...this.held, ...s.queue].slice(0, 2);
      this.held = null;
      return;
    }
    const h = s.cells[0];
    if (s.queue.length && this.isIce(h.x, h.y)) {
      this.held = s.queue;
      s.queue = [];
    }
  }

  snapshot(): unknown {
    return { held: this.held };
  }

  restore(data: unknown): void {
    const d = data as { held?: World['snake']['queue'] | null };
    this.held = Array.isArray(d?.held) ? d.held : null;
  }
}

/** FOG (Ch5 sandstorm): purely visual (you see a circle around Pip). Rules are unchanged. */
export class FogTwist implements Twist {
  readonly id = 'fog' as const;
  /** Radius you can see, in cells. */
  readonly radius = 4.5;
}

/**
 * PORTAL FRUIT (Ch5), from Google Snake's portal mode: fruit comes as a
 * matching pair. Eat one and you burst out of its twin, same direction.
 * Then both vanish and a new pair appears.
 */
export class PortalTwist implements Twist {
  readonly id = 'portal' as const;
  fruitKind(world: World): FruitKind {
    return world.fruits.some((f) => f.kind === 'portal') ? 'apple' : 'portal';
  }
}

/** SPEED RAMP (Ch7 Neon Caves): every fruit makes you a little faster, up to a limit. */
export const RAMP_PER_FRUIT = 0.022;
export const RAMP_MIN_SCALE = 0.62;

export class SpeedRampTwist implements Twist {
  readonly id = 'speedRamp' as const;
  stepScale(world: World): number {
    return Math.max(RAMP_MIN_SCALE, 1 - world.eaten * RAMP_PER_FRUIT);
  }
}

/**
 * WALL GAPS (Ch8 Sky Temple): golden gates in the walls open and close.
 * They blink before shutting, and a gate never shuts on any part of Pip.
 */
export const GATE_OPEN_TIME = 4;
export const GATE_CLOSED_TIME = 4;
export const GATE_WARN = 1.2;

export class WallGapsTwist implements Twist {
  readonly id = 'wallGaps' as const;
  readonly cells: Cell[];
  private keys: Set<number>;
  open = true;
  timer = GATE_OPEN_TIME;

  constructor(gates: readonly Cell[]) {
    this.cells = gates.map((c) => ({ ...c }));
    this.keys = new Set(gates.map((c) => cellKey(c.x, c.y)));
  }

  isGate(x: number, y: number): boolean {
    return this.keys.has(cellKey(x, y));
  }

  /** Blinking: about to close. */
  get warning(): boolean {
    return this.open && this.timer <= GATE_WARN;
  }

  update(dt: number, world: World): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    if (this.open) {
      // Never close on Pip: wait until he's clear of every gate.
      if (world.snake.cells.some((c) => this.isGate(c.x, c.y))) {
        this.timer = 0.1;
        return;
      }
      this.open = false;
      this.timer = GATE_CLOSED_TIME;
    } else {
      this.open = true;
      this.timer = GATE_OPEN_TIME;
    }
  }

  blockers(): Blocker[] {
    if (this.open) return [];
    return [{ cause: 'wall', hits: (c) => this.isGate(c.x, c.y) }];
  }

  reserved(x: number, y: number): boolean {
    return this.isGate(x, y);
  }

  snapshot(): unknown {
    return { open: this.open, timer: this.timer };
  }

  restore(data: unknown): void {
    const d = data as { open?: boolean; timer?: number };
    if (typeof d?.open === 'boolean') this.open = d.open;
    if (typeof d?.timer === 'number') this.timer = d.timer;
  }
}

export function createTwists(ids: readonly TwistId[] = [], level: { ice?: Cell[]; gates?: Cell[] } = {}): Twist[] {
  return ids.flatMap((id): Twist[] => {
    switch (id) {
      case 'poison':
        return [new PoisonTwist()];
      case 'ice':
        return [new IceTwist(level.ice ?? [])];
      case 'fog':
        return [new FogTwist()];
      case 'portal':
        return [new PortalTwist()];
      case 'speedRamp':
        return [new SpeedRampTwist()];
      case 'wallGaps':
        return [new WallGapsTwist(level.gates ?? [])];
      default:
        return [];
    }
  });
}
