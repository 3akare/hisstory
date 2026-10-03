/**
 * Lives and score for Story mode (the learner's rules):
 * start with 3, +1 life every 50 points (capped at 9), lose one per crash.
 * Plain data so it lives in the save file.
 */
export const START_LIVES = 3;
export const MAX_LIVES = 9;
export const POINTS_PER_LIFE = 50;
export const COIL_POINTS = 5;

export interface LivesState {
  lives: number;
  score: number;
  nextLifeAt: number;
}

export function freshLives(): LivesState {
  return { lives: START_LIVES, score: 0, nextLifeAt: POINTS_PER_LIFE };
}

/** Add points; returns how many extra lives were earned. */
export function addPoints(s: LivesState, n: number): number {
  s.score += n;
  let earned = 0;
  while (s.score >= s.nextLifeAt) {
    s.nextLifeAt += POINTS_PER_LIFE;
    if (s.lives < MAX_LIVES) {
      s.lives++;
      earned++;
    }
  }
  return earned;
}

/** Take a life. 'out' means that was the last one. */
export function loseLife(s: LivesState): 'respawn' | 'out' {
  s.lives = Math.max(0, s.lives - 1);
  return s.lives > 0 ? 'respawn' : 'out';
}

/** Back to the checkpoint: 3 lives again; score is kept (it's your running total). */
export function refillLives(s: LivesState): void {
  s.lives = START_LIVES;
}

/** Hidden mercy: after 2 lives lost in one boss fight the boss eases off, stacking once more at 4. */
export function mercyLevel(livesLostThisFight: number): number {
  return Math.min(2, Math.floor(livesLostThisFight / 2));
}
