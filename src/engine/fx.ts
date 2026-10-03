import type { Renderer } from './renderer';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  gravity: number;
}

interface FloatText {
  text: string;
  x: number;
  y: number;
  life: number;
  max: number;
  color: string;
}

/** Particles, screen shake, flashes and floating text: the "juice". */
export class Fx {
  particles: Particle[] = [];
  floats: FloatText[] = [];
  private shakeMag = 0;
  private shakeTime = 0;
  private flashAlpha = 0;
  private flashColor = '#ffffff';
  /** Lowered automatically on slow devices. */
  budget = 1;

  burst(x: number, y: number, colors: string[], count = 12, speed = 60, opts: { gravity?: number; size?: number; life?: number } = {}): void {
    const n = Math.max(2, Math.round(count * this.budget));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      const life = (opts.life ?? 0.5) * (0.6 + Math.random() * 0.6);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life,
        max: life,
        color: colors[i % colors.length],
        size: opts.size ?? (Math.random() < 0.3 ? 2 : 1),
        gravity: opts.gravity ?? 80,
      });
    }
    if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
  }

  shake(mag: number, time = 0.25): void {
    if (mag >= this.shakeMag || this.shakeTime <= 0) {
      this.shakeMag = mag;
      this.shakeTime = time;
    }
  }

  flash(color = '#ffffff', alpha = 0.6): void {
    this.flashColor = color;
    this.flashAlpha = alpha;
  }

  float(text: string, x: number, y: number, color = '#fff1e8'): void {
    this.floats.push({ text, x, y, life: 0.8, max: 0.8, color });
  }

  clear(): void {
    this.particles = [];
    this.floats = [];
    this.shakeTime = 0;
    this.flashAlpha = 0;
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.vx *= 1 - 2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floats) {
      f.life -= dt;
      f.y -= 14 * dt;
    }
    this.floats = this.floats.filter((f) => f.life > 0);
    if (this.shakeTime > 0) this.shakeTime -= dt;
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.5);
  }

  /** Current camera shake offset in logical pixels. */
  shakeOffset(): { x: number; y: number } {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    const m = this.shakeMag * Math.min(1, this.shakeTime * 4);
    return { x: Math.round((Math.random() * 2 - 1) * m), y: Math.round((Math.random() * 2 - 1) * m) };
  }

  drawParticles(r: Renderer): void {
    for (const p of this.particles) {
      r.rect(Math.round(p.x), Math.round(p.y), p.size, p.size, p.color, Math.min(1, (p.life / p.max) * 1.5));
    }
    for (const f of this.floats) {
      r.text(f.text, Math.round(f.x), Math.round(f.y), { align: 'center', color: f.color, alpha: Math.min(1, (f.life / f.max) * 2) });
    }
  }

  drawFlash(r: Renderer): void {
    if (this.flashAlpha <= 0) return;
    r.applyTransform(false);
    r.rect(0, 0, r.layout.w, r.layout.h, this.flashColor, this.flashAlpha);
    r.applyTransform();
  }
}

/** Simple easing helpers for UI motion. */
export const ease = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
};

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
