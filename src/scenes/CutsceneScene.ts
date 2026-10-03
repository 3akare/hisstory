import { BIOMES, BiomeId } from '../art/palettes';
import { PORTRAITS } from '../art/portraits';
import { Scene } from '../engine/scenes';
import { Action, PointerInfo } from '../engine/input';
import { hit, MusicButton, Rect } from '../engine/ui';
import { parseBoard } from '../game/board';
import type { App } from '../app';
import type { Line } from '../story/script';
import { drawBoard } from './draw';

const CHARS_PER_SEC = 42;
const TEXT_SIZE = 10;

/**
 * Story dialogue: a pixel portrait, a name plate and typewriter text.
 * First press finishes the line, the next press advances. SKIP jumps ahead.
 */
export class CutsceneScene extends Scene {
  readonly name = 'cutscene';
  index = 0;
  private shown = 0;
  private t = 0;
  private lineT = 0;
  private skipRect: Rect = { x: 0, y: 0, w: 34, h: 12 };
  private music = new MusicButton();
  done = false;
  private board = parseBoard();

  constructor(
    app: App,
    readonly lines: Line[],
    readonly biome: BiomeId,
    private onDone: () => void,
    private track: string | null = null,
  ) {
    super(app);
  }

  enter(): void {
    if (this.track) this.app.audio.music(this.track);
  }

  get line(): Line | undefined {
    return this.lines[this.index];
  }

  get typing(): boolean {
    return !!this.line && this.shown < this.line.text.length;
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.onDone();
  }

  advance(): void {
    if (this.done) return;
    if (this.typing) {
      this.shown = this.line!.text.length;
      return;
    }
    this.app.audio.sfx('menuMove');
    this.index++;
    this.shown = 0;
    this.lineT = 0;
    if (this.index >= this.lines.length) this.finish();
  }

  skip(): void {
    this.app.audio.sfx('menuBack');
    this.finish();
  }

  onAction(a: Action, repeat: boolean): void {
    if (repeat) return;
    if (a === 'confirm' || a === 'right' || a === 'down') this.advance();
    else if (a === 'back') this.skip();
  }

  onPointerDown(p: PointerInfo): void {
    if (this.music.hit(p.x, p.y)) return this.app.toggleMusic();
    if (hit(this.skipRect, p.x, p.y)) return this.skip();
    this.advance();
  }

  update(dt: number): void {
    this.t += dt;
    this.lineT += dt;
    if (!this.line) return;
    if (this.typing) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.line.text.length, this.shown + dt * CHARS_PER_SEC);
      const now = Math.floor(this.shown);
      if (now !== before && now % 3 === 0 && this.line.text[now] !== ' ') this.app.audio.sfx('blip');
    }
  }

  /** Word-wrap to a pixel width using the dialogue font. */
  private wrap(text: string, width: number): string[] {
    const r = this.app.renderer;
    const words = text.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (r.measure(next, TEXT_SIZE, 'dialog') > width && cur) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  draw(): void {
    const r = this.app.renderer;
    const L = r.layout;
    r.begin(BIOMES[this.biome].backdrop);
    drawBoard(r, this.board, this.biome, this.t);
    r.rect(0, 0, L.w, L.h, '#06060c', 0.55);

    const line = this.line;
    if (!line) return;
    const boxH = L.portrait ? 74 : 50;
    const box = { x: 6, y: L.h - boxH - 6, w: L.w - 12, h: boxH };
    const portrait = line.who === 'narrator' ? null : PORTRAITS[line.who];

    // Portrait in a frame, standing on top of the dialogue box. It hops in on a new line.
    if (portrait) {
      const hop = Math.max(0, 4 - this.lineT * 30);
      const px = portrait.side === 'left' ? box.x + 4 : box.x + box.w - 40;
      const py = box.y - 40 + Math.round(hop);
      r.panel(px, py, 40, 40, portrait.frame, portrait.color);
      const sprite = line.mood === 'angry' ? portrait.angry : portrait.neutral;
      // Little "talking" bob while text types.
      const talk = this.typing && Math.floor(this.t * 8) % 2 === 0 ? 1 : 0;
      r.sprite(`portrait-${line.who}-${line.mood ?? 'neutral'}`, sprite, px + 4, py + 4 - talk, this.biome, { scale: 2 });
      const nameX = portrait.side === 'left' ? px + 44 : px - 4;
      r.text(portrait.name, nameX, box.y - 11, { align: portrait.side === 'left' ? 'left' : 'right', color: portrait.color });
    }

    r.panel(box.x, box.y, box.w, box.h, '#141022', line.who === 'narrator' ? '#83769c' : (portrait?.color ?? '#fff1e8'));
    const textW = box.w - 16;
    const wrapped = this.wrap(line.text, textW);
    let remaining = Math.floor(this.shown);
    wrapped.forEach((l, i) => {
      if (remaining <= 0) return;
      const part = l.slice(0, remaining);
      remaining -= l.length + 1;
      r.text(part, box.x + 8, box.y + 7 + i * 12, {
        font: 'dialog',
        size: TEXT_SIZE,
        color: line.who === 'narrator' ? '#c2c3c7' : '#fff1e8',
      });
    });

    if (!this.typing && Math.floor(this.t * 3) % 2 === 0) {
      r.text(this.index === this.lines.length - 1 ? '>>' : 'v', box.x + box.w - 12, box.y + box.h - 11, { color: '#ffd94a' });
    }

    // SKIP (left of the music button) and progress dots.
    this.music.place(L.w);
    this.skipRect = { x: L.w - 15 - 40, y: 2, w: 36, h: 12 };
    r.panel(this.skipRect.x, this.skipRect.y, this.skipRect.w, this.skipRect.h, '#141022', '#83769c', 0.8);
    r.text('SKIP', this.skipRect.x + 18, this.skipRect.y + 3, { align: 'center', color: '#c2c3c7' });
    this.music.draw(r, this.app.musicOn);
    for (let i = 0; i < this.lines.length; i++) {
      r.rect(6 + i * 5, 6, 3, 3, i <= this.index ? '#ffd94a' : '#3b2d4f');
    }
  }
}
