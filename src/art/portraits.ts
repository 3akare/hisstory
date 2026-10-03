import type { SpriteDef } from './sprites';

/**
 * Cutscene portraits: 16×16 grids drawn at 2× (32×32 on screen) for a chunky
 * retro look. Each speaker has a neutral face and an angry/smug one.
 */
export type SpeakerId = 'pip' | 'crow' | 'grub' | 'toad' | 'mira' | 'viper' | 'narrator';
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

const TOAD: SpriteDef = {
  rows: [
    '................',
    '...WWW....WWW...',
    '..WKKWW..WWKKW..',
    '..WKKWLLLLWKKW..',
    '..LWWLLLLLLWWL..',
    '.LLLLLLLLLLLLLL.',
    '.LLgLLLLLLLLgLL.',
    '.LLLgggggggggLL.',
    '.LLLLLLLLLLLLLL.',
    '..LyyyyyyyyyyL..',
    '..LyyPyyyyPyyL..',
    '...LLyyyyyyLL...',
    '..LL.LLLLLL.LL..',
    '.LL..........LL.',
    '................',
    '................',
  ],
};

const MIRA: SpriteDef = {
  rows: [
    '....MMM.MMM.....',
    '....nMMMMMnnn...',
    '...nNNNNNNNNn...',
    '..nNNNNNNNNNNn..',
    '.nNKWWNNNNWWKNn.',
    '.nNNWKNNNNKWNNn.',
    '.nNNNNNNNNNNNNn.',
    '.nNNNNSSSSNNNNn.',
    '.nNNNSSSSSSNNNn.',
    '.nNNNNSSSSNNNNn.',
    '.nNNNNRRRRNNNNn.',
    '..nNNNNNNNNNNn..',
    '..WnNNNNNNNNnW..',
    '.WWWnnnnnnnnWWW.',
    'WW.W........W.WW',
    '................',
  ],
};

const VIPER: SpriteDef = {
  rows: [
    '....Y.Y.Y.......',
    '....YYYYY.......',
    '...vvvvvvvv.....',
    '..vVVVVVVVVv....',
    '.vVVVVVVVVVVv...',
    '.vVVYKVVVVVVVv..',
    '.vVVYKVVVVVVVVv.',
    '.vVVVVVVVVVVVVVv',
    '..vVVVVVVVVVVVvv',
    '...vVVWWWWWWVv.R',
    '....vVVVVVVVVvRR',
    '.....vvVVVVVv..R',
    '.......vVVVv....',
    '........vVv.....',
    '.........v......',
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
  toad: {
    name: 'OLD TOAD',
    color: '#7ee06a',
    side: 'right',
    neutral: TOAD,
    angry: withRows(TOAD, { 2: '..WKKWW..WWKKW..', 3: '..WKKWLLLLWKKW..', 1: '...KKK....KKK...' }),
    frame: '#24361a',
  },
  viper: {
    name: 'VIPER',
    color: '#2fd6a0',
    side: 'right',
    neutral: VIPER,
    angry: withRows(VIPER, { 4: '.vVKKVVVVVVVv...', 5: '.vVKYKVVVVVVVv..', 6: '.vVVYKVVVVVVVVv.' }),
    frame: '#0e2e28',
  },
  mira: {
    name: 'MIRA',
    color: '#ff4fd8',
    side: 'right',
    neutral: MIRA,
    angry: withRows(MIRA, { 3: '..nKKNNNNNNKKn..', 4: '.nNKKWNNNNWKKNn.', 10: '.nNNNRKKKKRNNNn.' }),
    frame: '#3a1a33',
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
