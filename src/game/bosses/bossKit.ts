import type { Rng } from '../../engine/rng';
import type { Board, Cell } from '../board';
import type { Blocker } from '../collision';
import { MERCY_SLOW, MERCY_WARN, MIN_TELEGRAPH } from './tuning';

export type BossId = 'grub' | 'miraGrub' | 'viper' | 'king';

/** What a boss tells the scene, so it can play sounds and effects. */
export type BossEvent =
  | { type: 'telegraph'; at: Cell; who?: string }
  | { type: 'surface'; at: Cell; who?: string }
  | { type: 'burrow'; at: Cell; who?: string }
  | { type: 'coiled'; at: Cell; pocket: Cell[]; who?: string; health: number }
  | { type: 'defeated'; at: Cell; who?: string }
  /** One of two bosses is down (double fights). */
  | { type: 'knockout'; at: Cell; who: string }
  /** A boss ran into something and is dazed (your chance!). */
  | { type: 'stun'; at: Cell; who?: string }
  /** A boss took a fruit off the board. */
  | { type: 'steal'; at: Cell; who?: string }
  | { type: 'hazard'; at: Cell; kind: string }
  | { type: 'line'; text: string; who?: string };

/** Everything a boss may look at during an update. Read-only by convention. */
export interface BossWorld {
  board: Board;
  snake: readonly Cell[];
  head: Cell;
  rng: Rng;
  mercy: number;
  /** Where the fruit is (bosses that chase or steal it). */
  fruits?: readonly Cell[];
}

export interface BossBar {
  label: string;
  health: number;
  max: number;
  color: string;
}

export interface BossController {
  readonly id: BossId;
  /** Health bars to show in the HUD (one per boss in double fights). */
  bars(): BossBar[];
  defeated(): boolean;
  /** Real-time behaviour (timers, telegraphs). */
  update(dt: number, w: BossWorld): BossEvent[];
  /** After every snake step: coil checks etc. */
  afterStep(w: BossWorld): BossEvent[];
  /** Things Pip can crash into right now. */
  blockers(): Blocker[];
  /** Cells fruit must not spawn on. */
  reserved(x: number, y: number): boolean;
  /** Where the boss is, to keep fruit away (null when hidden). */
  focus(): Cell | null;
  /** Plain-data state, for saving mid-fight. */
  snapshot(): unknown;
  restore(data: unknown): void;
}

/** Telegraph length with mercy applied, never below the 0.8 s minimum. */
export function warnTime(base: number, mercy: number): number {
  return Math.max(MIN_TELEGRAPH, base * (1 + MERCY_WARN * mercy));
}

/** A boss action duration that should get LONGER with mercy (e.g. time the boss stays vulnerable). */
export function easedLonger(base: number, mercy: number): number {
  return base * (1 + MERCY_SLOW * mercy);
}

/** A boss action that should get SLOWER with mercy, e.g. seconds between moves. */
export function easedSlower(base: number, mercy: number): number {
  return base * (1 + MERCY_SLOW * mercy);
}

/** Pick by hits taken, clamped to the last entry (escalation). */
export const byHits = <T>(arr: readonly T[], hits: number): T => arr[Math.min(hits, arr.length - 1)];
