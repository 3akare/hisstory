import { BASE, BIOMES } from '../art/palettes';
import { SPRITES } from '../art/sprites';
import { Scene } from '../engine/scenes';
import { Action, PointerInfo } from '../engine/input';
import { hit, MusicButton, Rect } from '../engine/ui';
import type { App } from '../app';
import { CHAPTERS, ChapterDef } from '../game/chapters';
import { isUnlocked, suggestedChapter } from '../game/progress';
import { HomeScene } from './HomeScene';

/**
 * Story's chapter map: 10 stops along a winding path through 4 acts.
 * Locked chapters show a padlock, cleared ones a tick, bosses a skull,
 * the finale a crown, and a red flag marks your checkpoint.
 */

/** Node positions along the path, as fractions of the map area (landscape). */
const PATH: [number, number][] = [
  [0.05, 0.72],
  [0.15, 0.36],
  [0.25, 0.66],
  [0.37, 0.3],
  [0.47, 0.64],
  [0.57, 0.3],
  [0.69, 0.66],
  [0.78, 0.32],
  [0.87, 0.66],
  [0.96, 0.32],
];

/** Where each act's band starts and ends along the path (fractions). */
const ACT_SPAN: [number, number][] = [
  [0, 0.31],
  [0.31, 0.63],
  [0.63, 0.915],
  [0.915, 1],
];

export class ChapterMapScene extends Scene {
  readonly name = 'map';
  selected: number;
  private t = 0;
  private nodes: { x: number; y: number }[] = [];
  private music = new MusicButton();
  private backRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private playRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  /** Message flashed after pressing a locked chapter. */
  private nope = 0;

  constructor(
    app: App,
    focus?: number,
    private onPlay: (id: number) => void = () => {},
  ) {
    super(app);
    this.selected = focus ?? suggestedChapter(app.save.data.story);
  }

  enter(): void {
    this.app.audio.music('map');
  }

  get story() {
    return this.app.save.data.story;
  }

  private ch(id: number): ChapterDef {
    return CHAPTERS[id - 1];
  }

  private open(id: number): boolean {
    return isUnlocked(this.story, id);
  }

  private select(id: number): void {
    if (id < 1 || id > CHAPTERS.length || id === this.selected) return;
    this.selected = id;
    this.app.audio.sfx('menuMove');
  }

  private play(): void {
    if (!this.open(this.selected)) {
      this.nope = 1.2;
      this.app.audio.sfx('menuBack');
      return;
    }
    this.app.audio.sfx('menuConfirm');
    this.onPlay(this.selected);
  }

  onAction(a: Action, repeat: boolean): void {
    if (a === 'right' || a === 'down') this.select(this.selected + 1);
    else if (a === 'left' || a === 'up') this.select(this.selected - 1);
    else if (a === 'confirm' && !repeat) this.play();
    else if (a === 'back' && !repeat) {
      this.app.audio.sfx('menuBack');
      this.app.scenes.go(new HomeScene(this.app));
    }
  }

  onPointerDown(p: PointerInfo): void {
    if (this.music.hit(p.x, p.y)) return this.app.toggleMusic();
    if (hit(this.backRect, p.x, p.y)) return this.onAction('back', false);
    if (hit(this.playRect, p.x, p.y)) return this.play();
    const i = this.nodes.findIndex((n) => Math.abs(n.x - p.x) <= 9 && Math.abs(n.y - p.y) <= 9);
    if (i < 0) return;
    if (i + 1 === this.selected) this.play();
    else this.select(i + 1);
  }

  update(dt: number): void {
    this.t += dt;
    if (this.nope > 0) this.nope -= dt;
  }

  private layoutNodes(): void {
    const L = this.app.renderer.layout;
    if (L.portrait) {
      // Bottom to top, zig-zagging: you climb towards the throne.
      const top = 22;
      const bottom = L.h - 70;
      this.nodes = PATH.map(([fx, fy]) => ({ x: Math.round(24 + fy * (L.w - 48)), y: Math.round(bottom - fx * (bottom - top)) }));
    } else {
      const top = 34;
      const bottom = L.h - 50;
      this.nodes = PATH.map(([fx, fy]) => ({ x: Math.round(4 + fx * (L.w - 8)), y: Math.round(top + fy * (bottom - top)) }));
    }
  }

  draw(): void {
    const r = this.app.renderer;
    r.begin('#0e0b16');
    this.layoutNodes();

    // Act regions: one band per act (columns in landscape, rows on phones), tinted by biome.
    const L = r.layout;
    for (let act = 1; act <= 4; act++) {
      const [a0, a1] = ACT_SPAN[act - 1];
      const biome = BIOMES[CHAPTERS.find((c) => c.act === act)!.biome];
      const reached = CHAPTERS.some((c) => c.act === act && this.open(c.id));
      let x: number, y: number, w: number, h: number;
      if (L.portrait) {
        const top = 22;
        const bottom = L.h - 70;
        y = Math.round(bottom - a1 * (bottom - top));
        h = Math.round(bottom - a0 * (bottom - top)) - y;
        x = 4;
        w = L.w - 8;
      } else {
        x = Math.round(4 + a0 * (L.w - 8));
        w = Math.round(4 + a1 * (L.w - 8)) - x;
        y = 21;
        h = L.h - 21 - 42;
      }
      r.rect(x, y, w, h, biome.slots['1'], reached ? 0.3 : 0.12);
      r.rect(x, y, 1, h, '#0e0b16');
      const label = ['I', 'II', 'III', 'IV'][act - 1];
      r.text(`ACT ${label}`, x + 3, y + h - 10, { color: biome.accent, size: 8, alpha: reached ? 0.85 : 0.35, shadow: null, font: 'dialog' });
    }

    // Dotted path between stops; lit where you can travel.
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const a = this.nodes[i];
      const b = this.nodes[i + 1];
      const lit = this.open(i + 2) || this.story.completed[i];
      const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4);
      for (let s = 1; s < steps; s++) {
        const x = Math.round(a.x + ((b.x - a.x) * s) / steps);
        const y = Math.round(a.y + ((b.y - a.y) * s) / steps);
        r.rect(x, y, 2, 2, lit ? BASE.Y : '#3b2d4f', lit ? 0.9 : 0.8);
      }
    }

    CHAPTERS.forEach((c, i) => this.drawNode(c, this.nodes[i]));
    this.drawHeader();
    this.drawInfo();
  }

  private drawNode(c: ChapterDef, p: { x: number; y: number }): void {
    const r = this.app.renderer;
    const open = this.open(c.id);
    const done = this.story.completed[c.id - 1];
    const sel = c.id === this.selected;
    const pal = BIOMES[c.biome];
    const size = c.boss ? 15 : 13;
    const x = p.x - Math.floor(size / 2);
    const y = p.y - Math.floor(size / 2);
    r.panel(x, y, size, size, open ? pal.slots['4'] : '#1d1d2b', sel ? BASE.Y : open ? pal.slots['5'] : '#3b2d4f', 1);
    if (!c.available) r.text('?', p.x + 1, p.y - 3, { align: 'center', color: '#5f5770', size: 8, shadow: null });
    else if (!open) r.sprite('lock', SPRITES.lock, p.x - 3, p.y - 3);
    else r.text(String(c.id), p.x + (c.id === 10 ? 0 : 1), p.y - 3, { align: 'center', color: '#fff1e8', size: 8 });
    if (done) r.sprite('check', SPRITES.check, x + size - 4, y - 3);
    if (c.id === CHAPTERS.length) r.sprite('crown', SPRITES.crown, p.x - 3, y - 8);
    else if (c.boss) r.sprite('skull', SPRITES.skull, p.x - 3, y - 9);
    if (c.id === this.story.checkpoint && this.story.checkpoint > 1) r.sprite('flag', SPRITES.flag, x - 7, y - 4);
    if (sel) {
      const bob = Math.round(Math.sin(this.t * 5) * 2);
      r.sprite('pipHead', SPRITES.pipHead, p.x - 4, y - (c.boss ? 20 : 12) + bob);
    }
  }

  private drawHeader(): void {
    const r = this.app.renderer;
    const L = r.layout;
    r.rect(0, 0, L.w, 17, '#0b0b14', 0.85);
    this.backRect = { x: 2, y: 2, w: 42, h: 13 };
    r.panel(2, 2, 42, 13, '#141022', '#83769c', 0.9);
    r.text('BACK', 23, 5, { align: 'center', color: '#c2c3c7' });
    r.sprite('heart', SPRITES.heart, 52, 5);
    r.text(`x${this.story.lives}`, 60, 5);
    r.text(String(this.story.score).padStart(4, '0'), 92, 5, { color: BASE.Y });
    if (!L.portrait) r.text('STORY', L.w / 2 + 30, 5, { align: 'center', color: '#83769c' });
    this.music.place(L.w);
    this.music.draw(r, this.app.musicOn);
  }

  private drawInfo(): void {
    const r = this.app.renderer;
    const L = r.layout;
    const c = this.ch(this.selected);
    const open = this.open(c.id);
    const done = this.story.completed[c.id - 1];
    const h = L.portrait ? 60 : 32;
    const y = L.h - h - 4;
    r.panel(4, y, L.w - 8, h, '#141022', open ? BIOMES[c.biome].accent : '#5f5770');
    r.text(`CH${c.id} ${c.name}`, 10, y + 6, { color: open ? '#fff1e8' : '#83769c' });
    let status: string;
    let color = '#c2c3c7';
    if (!c.available) status = 'COMING SOON';
    else if (!open) status = 'LOCKED: CLEAR THE CHAPTER BEFORE';
    else if (done) {
      status = 'CLEARED. PLAY AGAIN?';
      color = BASE.G;
    } else {
      status = c.boss ? 'BOSS FIGHT!' : 'READY';
      color = c.boss ? BASE.R : BASE.Y;
    }
    if (this.nope > 0) {
      status = !c.available ? 'NOT BUILT YET!' : 'LOCKED!';
      color = BASE.R;
    }
    r.text(status, 10, y + (L.portrait ? 20 : 18), { color, font: 'dialog', size: 8 });
    // PLAY button.
    const bw = 44;
    this.playRect = L.portrait ? { x: L.w - bw - 10, y: y + h - 22, w: bw, h: 16 } : { x: L.w - bw - 10, y: y + 8, w: bw, h: 16 };
    if (open) {
      r.panel(this.playRect.x, this.playRect.y, bw, 16, '#2a2046', BASE.Y);
      r.text('PLAY', this.playRect.x + bw / 2, this.playRect.y + 4, { align: 'center', color: BASE.Y });
    }
  }
}
