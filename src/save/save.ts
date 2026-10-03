/**
 * Saving: one JSON document in localStorage ("a notepad the browser keeps for
 * this site"). Every read is validated and filled from defaults, a corrupt
 * save is set aside instead of crashing, and if storage is blocked the game
 * keeps running with an in-memory save.
 */
export const SAVE_KEY = 'hisstory.save';
export const CORRUPT_KEY = 'hisstory.save.corrupt';
export const CHAPTER_COUNT = 10;

export interface LevelSnapshot {
  chapter: number;
  data: unknown;
}

export interface SaveData {
  version: 1;
  settings: { music: boolean };
  classic: { best: number };
  story: {
    completed: boolean[];
    highestUnlocked: number;
    checkpoint: number;
    kingPhase: 1 | 2 | 3;
    lives: number;
    score: number;
    nextLifeAt: number;
    resume: LevelSnapshot | null;
    finished: boolean;
    /** Has the player started Story at least once (to show "New Game" vs "Continue"). */
    started: boolean;
  };
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    settings: { music: true },
    classic: { best: 0 },
    story: {
      completed: Array(CHAPTER_COUNT).fill(false),
      highestUnlocked: 1,
      checkpoint: 1,
      kingPhase: 1,
      lives: 3,
      score: 0,
      nextLifeAt: 50,
      resume: null,
      finished: false,
      started: false,
    },
  };
}

const num = (v: unknown, def: number, min: number, max: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : def;
const bool = (v: unknown, def: boolean): boolean => (typeof v === 'boolean' ? v : def);

/** Take anything (old save, hand-edited JSON, garbage) and return a valid SaveData. */
export function validate(raw: unknown): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, any>;
  const st = (r.story ?? {}) as Record<string, any>;
  d.settings.music = bool(r.settings?.music, true);
  d.classic.best = num(r.classic?.best, 0, 0, 1e6);
  if (Array.isArray(st.completed)) d.story.completed = d.story.completed.map((_, i) => st.completed[i] === true);
  d.story.highestUnlocked = num(st.highestUnlocked, 1, 1, CHAPTER_COUNT);
  d.story.checkpoint = num(st.checkpoint, 1, 1, CHAPTER_COUNT);
  d.story.kingPhase = num(st.kingPhase, 1, 1, 3) as 1 | 2 | 3;
  d.story.lives = num(st.lives, 3, 1, 9);
  d.story.score = num(st.score, 0, 0, 1e7);
  d.story.nextLifeAt = num(st.nextLifeAt, 50, 50, 1e7 + 50);
  if (d.story.nextLifeAt <= d.story.score) d.story.nextLifeAt = (Math.floor(d.story.score / 50) + 1) * 50;
  d.story.finished = bool(st.finished, false);
  d.story.started = bool(st.started, false);
  const res = st.resume;
  if (res && typeof res === 'object' && typeof res.chapter === 'number' && res.chapter >= 1 && res.chapter <= CHAPTER_COUNT && 'data' in res) {
    d.story.resume = { chapter: res.chapter, data: res.data };
  }
  // Every completed chapter's successor must be unlocked.
  d.story.completed.forEach((done, i) => {
    if (done) d.story.highestUnlocked = Math.max(d.story.highestUnlocked, Math.min(CHAPTER_COUNT, i + 2));
  });
  return d;
}

/** Minimal storage interface so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class SaveStore {
  data: SaveData;
  /** False when the browser won't let us save (private mode, blocked storage). */
  available: boolean;
  /** Set when a broken save was found and set aside on this load. */
  recovered = false;

  constructor(private storage: KeyValueStore | null = SaveStore.browserStorage()) {
    this.available = !!storage && SaveStore.probe(storage);
    this.data = this.load();
  }

  static browserStorage(): KeyValueStore | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
      return null;
    }
  }

  private static probe(s: KeyValueStore): boolean {
    try {
      s.setItem('hisstory.probe', '1');
      return s.getItem('hisstory.probe') === '1';
    } catch {
      return false;
    }
  }

  private load(): SaveData {
    if (!this.available || !this.storage) return defaultSave();
    let text: string | null = null;
    try {
      text = this.storage.getItem(SAVE_KEY);
    } catch {
      return defaultSave();
    }
    if (!text) return defaultSave();
    try {
      return validate(JSON.parse(text));
    } catch {
      // Corrupt JSON: keep a copy for curiosity, start fresh, never crash.
      try {
        this.storage.setItem(CORRUPT_KEY, text);
      } catch {
        /* ignore */
      }
      this.recovered = true;
      return defaultSave();
    }
  }

  /** Write now. Safe to call often; failures are swallowed (the game keeps going). */
  save(): void {
    if (!this.available || !this.storage) return;
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      /* quota or blocked: keep playing */
    }
  }

  /** Erase all progress (debug "reset save"). Settings are kept. */
  reset(): void {
    const music = this.data.settings.music;
    this.data = defaultSave();
    this.data.settings.music = music;
    this.save();
  }
}
