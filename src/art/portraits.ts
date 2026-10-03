import type { SpriteDef } from './sprites';

/**
 * Cutscene portraits: 16×16 grids drawn at 2× (32×32 on screen) for a chunky
 * retro look. Each speaker has a neutral face and an angry/smug one.
 */
export type SpeakerId = 'pip' | 'crow' | 'grub' | 'narrator';
export type Mood = 'neutral' | 'angry';

export interface Portrait {
  name: string;
  /** Name plate colour. */
  color: string;
  /** Which side of the screen they stand on. */
  side: 'left' | 'right';
  neutral: SpriteDef;
  angry: SpriteDef;
  /** Backdrop tint behind the portrait. */
  frame: string;
}

/** Copy a portrait, replacing some rows (for moods). */
const withRows = (base: SpriteDef, rows: Record<number, string>): SpriteDef => ({
  rows: base.rows.map((r, i) => rows[i] ?? r),
});

const PIP: SpriteDef = {
  rows: [
    '................',
    '......gggg......',
    '....ggGGGGgg....',
    '...gGGGGGGGGg...',
    '..gGGhhGGGGGGg..',
    '..gGhWWWKGGGGGg.',
    '.gGGhWWKKGGGGGGg',
    '.gGGGWKKKGGGGGGg',
    '.gGGGGGGGGGGGGGg',
    '.gGGGGGGGGGGGGgg',
    '..gGGYYYYYYYYgRR',
    '..gGYYYYYYYYYg.R',
    '...gGYYYYYYYgg..',
    '....gGGGGGGg....',
    '.....gGGGGg.....',
    '......gggg......',
  ],
};

const CROW: SpriteDef = {
  rows: [
    '................',
    '.....KKKK.......',
    '...KKkkkkKK.....',
    '..KkkkkkkkkK....',
    '..KkkWWkkkkkK...',
    '.KkkkWKkkkkkK...',
    '.KkkkkkkkkkkKOOO',
    '.KkkkkkkkkkKOOOO',
    '..KkkkkkkkkKOO..',
    '..KkkkkkkkkkK...',
    '...KkkkkkkkkkK..',
    '...KkkxkkxkkkkK.',
    '....KkkkkkkkkkK.',
    '.....KKkkkkkKK..',
    '.......KKKKK....',
    '................',
  ],
};

const GRUB: SpriteDef = {
  rows: [
    '................',
    '....nnnnnnnn....',
    '...nNNNNNNNNn...',
    '..nNNNNNNNNNNn..',
    '.nNNWWNNNNWWNNn.',
    '.nNNWKNNNNKWNNn.',
    '.nNNNNNNNNNNNNn.',
    '.nNNNNSSSSNNNNn.',
    '.nNNNSSSSSSNNNn.',
    '.nNNNNSSSSNNNNn.',
    '.nNNNNNKKNNNNNn.',
    '..nNNNNWWNNNNn..',
    '..WnNNNNNNNNnW..',
    '.WWWnnnnnnnnWWW.',
    'WW.W........W.WW',
    '................',
  ],
};

export const PORTRAITS: Record<Exclude<SpeakerId, 'narrator'>, Portrait> = {
  pip: {
    name: 'PIP',
    color: '#5ad13a',
    side: 'left',
    neutral: PIP,
    angry: withRows(PIP, { 4: '..gGGKKGGGGGGg..', 5: '..gGhKWWKGGGGGg.' }),
    frame: '#1c3a1a',
  },
  crow: {
    name: 'CROW',
    color: '#c2c3c7',
    side: 'right',
    neutral: CROW,
    angry: withRows(CROW, { 3: '..KkkKKkkkkK....', 4: '..KkkWWKkkkkK...' }),
    frame: '#1d1d2b',
  },
  grub: {
    name: 'GRUB',
    color: '#b07ad6',
    side: 'right',
    neutral: GRUB,
    angry: withRows(GRUB, { 3: '..nKKNNNNNNKKn..', 4: '.nNNKWNNNNWKNNn.', 10: '.nNNNNKKKKNNNNn.', 11: '..nNNNKWWKNNNn..' }),
    frame: '#2a1f3a',
  },
};
