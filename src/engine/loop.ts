/**
 * The game loop: the heartbeat of HISSTORY.
 *
 * The browser calls `frame` once per screen refresh (requestAnimationFrame).
 * We don't update the game by "however long the last frame took" because that
 * makes the game run differently on fast and slow devices. Instead, real time
 * is poured into an accumulator and drained in fixed, equal slices of
 * `FIXED_DT` seconds. Each slice runs one `update`. Then we draw once.
 *
 * Result: the snake moves at exactly the same speed on a 144 Hz laptop and a
 * 60 Hz phone, and the game rules are deterministic (testable).
 */
export const FIXED_HZ = 120;
export const FIXED_DT = 1 / FIXED_HZ;
/** Never try to catch up more than this much real time (avoids a "spiral of death" after a stall). */
const MAX_FRAME = 0.25;

export interface LoopHooks {
  update(dt: number): void;
  render(): void;
}

export class GameLoop {
  private acc = 0;
  private last = 0;
  private rafId = 0;
  private running = false;
  /** Average frame time in ms, for the debug FPS counter and the particle budget. */
  frameMs = 16.7;

  constructor(private hooks: LoopHooks) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    let delta = (now - this.last) / 1000;
    this.last = now;
    if (delta > MAX_FRAME) delta = MAX_FRAME;
    if (delta < 0) delta = 0;
    this.frameMs = this.frameMs * 0.9 + delta * 1000 * 0.1;

    this.acc += delta;
    while (this.acc >= FIXED_DT) {
      this.hooks.update(FIXED_DT);
      this.acc -= FIXED_DT;
    }
    this.hooks.render();
    this.rafId = requestAnimationFrame(this.frame);
  };
}
