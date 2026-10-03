import { noteFreq, Synth, Wave } from './synth';

/**
 * SONGS are written as text, one bar per string, 16 steps (sixteenth notes) per bar:
 *   "C5"  play a note       "-"  hold the previous note       "."  rest
 *   drums: "k" kick, "s" snare, "h" hat, "o" open hat, "c" crash, "t" tom;
 *   combine with "+", e.g. "k+h".
 * Each channel loops over its own list of bars.
 */
export interface Song {
  name: string;
  bpm: number;
  lead?: string[];
  harmony?: string[];
  bass?: string[];
  drums?: string[];
  leadWave?: Exclude<Wave, 'noise' | 'triangle'>;
  harmonyWave?: Exclude<Wave, 'noise' | 'triangle'>;
  /** Per-channel volume (0..1). */
  mix?: Partial<Record<'lead' | 'harmony' | 'bass' | 'drums', number>>;
  /** Jingles play once. */
  once?: boolean;
}

export const STEPS_PER_BAR = 16;

export interface NoteEvent {
  /** Step within the bar (0..15). */
  step: number;
  /** Length in steps (holds included). */
  len: number;
  /** Note name, or drum letters. */
  value: string;
}

/** Turn "C5 - . E5 ..." into note events. Throws on a malformed bar so mistakes are caught by tests. */
export function parseBar(bar: string): NoteEvent[] {
  const tokens = bar.trim().split(/\s+/);
  if (tokens.length !== STEPS_PER_BAR) throw new Error(`Bar must have ${STEPS_PER_BAR} steps, got ${tokens.length}: "${bar}"`);
  const out: NoteEvent[] = [];
  let current: NoteEvent | null = null;
  tokens.forEach((tok, step) => {
    if (tok === '-') {
      if (current) current.len++;
      return;
    }
    current = null;
    if (tok === '.') return;
    current = { step, len: 1, value: tok };
    out.push(current);
  });
  return out;
}

/** Song length in bars: the longest channel. */
export function songBars(song: Song): number {
  return Math.max(1, song.lead?.length ?? 0, song.harmony?.length ?? 0, song.bass?.length ?? 0, song.drums?.length ?? 0);
}

/**
 * The lookahead rule ("a tale of two clocks"): a cheap JS timer wakes up every
 * 25 ms and schedules every step whose start time falls before now + lookahead
 * on the precise audio clock. Returns how many steps are due.
 */
export function stepsDue(nextStepTime: number, now: number, lookahead: number, stepDur: number): number {
  if (nextStepTime >= now + lookahead) return 0;
  return Math.floor((now + lookahead - nextStepTime) / stepDur) + 1;
}

export const LOOKAHEAD = 0.12;
export const TICK_MS = 25;

const DEFAULT_MIX = { lead: 0.11, harmony: 0.06, bass: 0.16, drums: 0.13 };

/** Plays one song on a dedicated gain node (so songs can crossfade). */
export class SongPlayer {
  readonly out: GainNode;
  private parsed: Record<string, NoteEvent[][]> = {};
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private readonly stepDur: number;
  private readonly bars: number;
  finished = false;

  constructor(
    private ctx: AudioContext,
    private synth: Synth,
    readonly song: Song,
    dest: AudioNode,
  ) {
    this.out = ctx.createGain();
    this.out.connect(dest);
    this.stepDur = 60 / song.bpm / 4;
    this.bars = songBars(song);
    for (const ch of ['lead', 'harmony', 'bass', 'drums'] as const) {
      this.parsed[ch] = (song[ch] ?? []).map(parseBar);
    }
  }

  start(at = this.ctx.currentTime + 0.05): void {
    this.nextTime = at;
    this.step = 0;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  stop(fade = 0): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    const t = this.ctx.currentTime;
    if (fade > 0) {
      this.out.gain.cancelScheduledValues(t);
      this.out.gain.setValueAtTime(this.out.gain.value, t);
      this.out.gain.linearRampToValueAtTime(0, t + fade);
      setTimeout(() => this.out.disconnect(), fade * 1000 + 300);
    } else {
      this.out.disconnect();
    }
  }

  private tick(): void {
    const n = stepsDue(this.nextTime, this.ctx.currentTime, LOOKAHEAD, this.stepDur);
    for (let i = 0; i < n; i++) {
      if (this.song.once && this.step >= this.bars * STEPS_PER_BAR) {
        this.finished = true;
        this.stop(0.1);
        return;
      }
      this.scheduleStep(this.step, this.nextTime);
      this.step++;
      if (!this.song.once && this.step >= this.bars * STEPS_PER_BAR) this.step = 0;
      this.nextTime += this.stepDur;
    }
  }

  private scheduleStep(globalStep: number, when: number): void {
    const bar = Math.floor(globalStep / STEPS_PER_BAR);
    const inBar = globalStep % STEPS_PER_BAR;
    const mix = { ...DEFAULT_MIX, ...this.song.mix };
    for (const ch of ['lead', 'harmony', 'bass', 'drums'] as const) {
      const bars = this.parsed[ch];
      if (!bars.length) continue;
      const events = bars[bar % bars.length];
      for (const e of events) {
        if (e.step !== inBar) continue;
        const dur = e.len * this.stepDur * 0.95;
        if (ch === 'drums') {
          for (const d of e.value.split('+')) this.synth.drum(this.out, d, when, mix.drums);
        } else {
          const f = noteFreq(e.value);
          if (!f) continue;
          const wave = ch === 'bass' ? 'triangle' : ch === 'lead' ? (this.song.leadWave ?? 'pulse25') : (this.song.harmonyWave ?? 'pulse12');
          this.synth.tone(this.out, wave, f, when, dur, mix[ch]);
        }
      }
    }
  }
}
