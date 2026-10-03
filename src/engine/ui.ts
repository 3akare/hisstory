import { SPRITES } from '../art/sprites';
import type { Renderer } from './renderer';

/**
 * Canvas-drawn menus: keyboard (up/down + Enter) and pointer (click/tap) both work.
 * Everything is drawn in the pixel style, so no DOM UI breaks the retro look.
 */
export interface MenuItem {
  label: string;
  onPress: () => void;
  /** Small text under the label (e.g. "CHAPTER 3"). */
  note?: string;
  disabled?: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const hit = (r: Rect, x: number, y: number): boolean => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;

export class Menu {
  index = 0;
  rects: Rect[] = [];

  constructor(
    public items: MenuItem[],
    private onMove: () => void = () => {},
  ) {
    this.index = Math.max(0, items.findIndex((i) => !i.disabled));
  }

  /** Stack the buttons vertically, centred on cx. */
  layout(cx: number, top: number, w: number, h: number, gap: number): void {
    this.rects = this.items.map((_, i) => ({ x: Math.round(cx - w / 2), y: Math.round(top + i * (h + gap)), w, h }));
  }

  move(d: number): void {
    const n = this.items.length;
    let i = this.index;
    for (let k = 0; k < n; k++) {
      i = (i + d + n) % n;
      if (!this.items[i].disabled) break;
    }
    if (i !== this.index) {
      this.index = i;
      this.onMove();
    }
  }

  confirm(): void {
    const item = this.items[this.index];
    if (item && !item.disabled) item.onPress();
  }

  /** Pointer press: focus and activate the button under it. Returns true if one was hit. */
  press(x: number, y: number): boolean {
    const i = this.rects.findIndex((r) => hit(r, x, y));
    if (i < 0 || this.items[i].disabled) return false;
    this.index = i;
    this.items[i].onPress();
    return true;
  }

  /** Pointer hover (mouse): move focus without activating. */
  hover(x: number, y: number): void {
    const i = this.rects.findIndex((r) => hit(r, x, y));
    if (i >= 0 && i !== this.index && !this.items[i].disabled) {
      this.index = i;
      this.onMove();
    }
  }

  draw(r: Renderer, t: number, accent = '#ffd94a'): void {
    this.items.forEach((item, i) => {
      const rc = this.rects[i];
      const focused = i === this.index;
      const lift = focused ? -1 : 0;
      r.panel(rc.x, rc.y + lift, rc.w, rc.h, focused ? '#2a2046' : '#141022', focused ? accent : '#83769c');
      const color = item.disabled ? '#5f5770' : focused ? accent : '#fff1e8';
      const ty = rc.y + lift + (item.note ? Math.round(rc.h / 2) - 8 : Math.round(rc.h / 2) - 4);
      r.text(item.label, rc.x + rc.w / 2, ty, { align: 'center', color });
      if (item.note) r.text(item.note, rc.x + rc.w / 2, ty + 10, { align: 'center', color: '#c2c3c7', font: 'dialog', size: 8 });
      if (focused) {
        const bob = Math.floor(t * 4) % 2;
        r.text('>', rc.x + 6 + bob, ty, { color: accent });
      }
    });
  }
}

/** The little speaker button in the top-right corner. */
export class MusicButton {
  rect: Rect = { x: 0, y: 0, w: 13, h: 12 };

  place(screenW: number): void {
    this.rect = { x: screenW - 15, y: 2, w: 13, h: 12 };
  }

  draw(r: Renderer, on: boolean): void {
    const { x, y } = this.rect;
    r.rect(x, y, 13, 12, '#0b0b14', 0.5);
    r.sprite(on ? 'speakerOn' : 'speakerOff', on ? SPRITES.speakerOn : SPRITES.speakerOff, x + 2, y + 2);
  }

  hit(x: number, y: number): boolean {
    // A generous touch target.
    return hit({ x: this.rect.x - 4, y: this.rect.y - 2, w: this.rect.w + 6, h: this.rect.h + 6 }, x, y);
  }
}
