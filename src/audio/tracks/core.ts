import type { Song } from '../sequencer';

/**
 * Original HISSTORY compositions. One bar per string, 16 sixteenth-note steps.
 * "-" holds, "." rests. See audio/sequencer.ts for the format.
 */
const REST = '. . . . . . . . . . . . . . . .';

/**
 * THE SNAKE SONG (Home, Ending). D Phrygian dominant, the "snake charmer"
 * scale: D Eb F# G A Bb C. Subtle and hypnotic; the lead breathes in after
 * two bars of drone.
 */
export const THEME: Song = {
  name: 'theme',
  bpm: 100,
  leadWave: 'pulse25',
  harmonyWave: 'pulse12',
  mix: { lead: 0.085, harmony: 0.035, bass: 0.13, drums: 0.07 },
  lead: [
    REST,
    REST,
    'D5 - - Eb5 F#5 - G5 - A5 - - - G5 - F#5 -',
    'Eb5 - F#5 - D5 - - - - - - - . . . .',
    'D5 - - Eb5 F#5 - G5 - A5 - Bb5 - A5 - G5 -',
    'F#5 - G5 - F#5 - Eb5 - D5 - - - . . . .',
    'A5 - - - Bb5 - A5 - G5 - F#5 - G5 - A5 -',
    'F#5 - Eb5 - D5 - Eb5 - F#5 - - - . . . .',
    'C6 - Bb5 - A5 - G5 - F#5 - G5 - A5 - - -',
    'G5 - F#5 - Eb5 - F#5 - D5 - - - - - . .',
  ],
  harmony: ['A3 . D4 . F#4 . D4 . A3 . D4 . F#4 . D4 .', 'A3 . D4 . G4 . D4 . A3 . Eb4 . F#4 . Eb4 .'],
  bass: ['D2 . . D3 A2 . . . D2 . . D3 A2 . Bb2 .', 'D2 . . D3 A2 . . . C3 . . C3 Bb2 . A2 .'],
  drums: ['k . . h . . s . k . h . . . s h'],
};

const C = 'C3 . . C3 G2 . . . C3 . . C3 G2 . E3 .';
const AM = 'A2 . . A2 E2 . . . A2 . . A2 E2 . C3 .';
const F = 'F2 . . F2 C3 . . . F2 . . F2 C3 . A2 .';
const G = 'G2 . . G2 D3 . . . G2 . . G2 D3 . B2 .';
const FG = 'F2 . . F2 C3 . . . G2 . . G2 D3 . B2 .';
const hC = 'E4 G4 C5 G4 E4 G4 C5 G4 E4 G4 C5 G4 E4 G4 C5 G4';
const hAM = 'E4 A4 C5 A4 E4 A4 C5 A4 E4 A4 C5 A4 E4 A4 C5 A4';
const hF = 'F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4';
const hG = 'D4 G4 B4 G4 D4 G4 B4 G4 D4 G4 B4 G4 D4 G4 B4 G4';
const hFG = 'F4 A4 C5 A4 F4 A4 C5 A4 D4 G4 B4 G4 D4 G4 B4 G4';

/** THE ORCHARD (Ch1, Classic). Sunny C major skip. */
export const ORCHARD: Song = {
  name: 'orchard',
  bpm: 128,
  leadWave: 'pulse50',
  harmonyWave: 'pulse12',
  mix: { lead: 0.08, harmony: 0.03, bass: 0.14, drums: 0.08 },
  lead: [
    'C5 - E5 - G5 - E5 - C6 - - - G5 - - -',
    'A5 - G5 - E5 - G5 - D5 - - - . . . .',
    'F5 - A5 - C6 - A5 - G5 - E5 - C5 - - -',
    'D5 - E5 - F5 - D5 - G5 - - - . . . .',
    'E5 - . E5 F5 - G5 - A5 - G5 - E5 - C5 -',
    'D5 - . D5 E5 - F5 - G5 - - - . . . .',
    'C6 - B5 - A5 - G5 - F5 - E5 - D5 - E5 -',
    'C5 - - - G4 - - - C5 - - - . . . .',
  ],
  harmony: [hC, hAM, hF, hG, hC, hG, hFG, hC],
  bass: [C, AM, F, G, C, G, FG, C],
  drums: ['k . h . s . h . k . h k s . h .'],
};

const bEm = 'E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .';
const bD = 'D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .';
const bC = 'C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 .';
const bAm = 'A1 . A2 . A1 . A2 . A1 . A2 . A1 . A2 .';
const bB = 'B1 . B2 . B1 . B2 . B1 . B2 . B1 . B2 .';
const sEm = '. G4 . G4 . G4 . G4 . B4 . B4 . G4 . G4';
const sC = '. G4 . G4 . G4 . G4 . C5 . C5 . G4 . G4';
const sD = '. F#4 . F#4 . A4 . A4 . F#4 . F#4 . A4 . A4';
const sAm = '. A4 . A4 . C5 . C5 . A4 . A4 . E4 . E4';
const sB = '. F#4 . F#4 . A4 . A4 . B4 . B4 . D#5 . D#5';
const groove = 'k . h k s . h . k k h . s . h h';

/** GRUB THE MOLE (Ch3). Bouncy, cheeky, playful menace in E minor. */
export const BOSS_GRUB: Song = {
  name: 'boss-grub',
  bpm: 152,
  leadWave: 'pulse25',
  harmonyWave: 'pulse12',
  mix: { lead: 0.085, harmony: 0.035, bass: 0.15, drums: 0.1 },
  lead: [
    'E5 . G5 E5 . B5 . E5 A5 . G5 . F#5 . E5 .',
    'D5 . E5 . B4 - - - . . B4 . D5 . E5 .',
    'E5 . G5 E5 . B5 . E5 C6 . B5 . A5 . G5 .',
    'F#5 . G5 . A5 - - - B5 - - - . . . .',
    'G5 G5 . G5 F#5 . E5 . F#5 F#5 . F#5 E5 . D5 .',
    'E5 . D5 . B4 . D5 . E5 - - - . . . .',
    'C6 . B5 . A5 . G5 . A5 . B5 . C6 . D6 .',
    'B5 - - - G5 - - - E5 - - - D#5 - - -',
  ],
  harmony: [sEm, sEm, sC, sD, sEm, sEm, sAm, sB],
  bass: [bEm, bEm, bC, bD, bEm, bEm, bAm, bB],
  drums: [groove, groove, groove, groove, groove, groove, groove, 'k . s . k . s . s s s s c . . .'],
};

const bgEm = 'E2 . . E2 . . B1 . E2 . . E2 G2 . B1 .';
const bgD = 'D2 . . D2 . . A1 . D2 . . D2 F#2 . A1 .';
const bgC = 'C2 . . C2 . . G1 . C2 . . C2 E2 . G1 .';
const bgAm = 'A1 . . A1 . . E2 . A1 . . A1 C2 . E2 .';

/** MUSHROOM BOG (Ch2). A murky, bouncy swamp shuffle in E minor. */
export const BOG: Song = {
  name: 'bog',
  bpm: 112,
  leadWave: 'pulse12',
  harmonyWave: 'pulse50',
  mix: { lead: 0.085, harmony: 0.03, bass: 0.16, drums: 0.08 },
  lead: [
    'E5 . . G5 . A5 . . B5 - A5 . G5 . E5 .',
    'D5 - - - E5 . . . . . . . . . . .',
    'E5 . . G5 . A5 . . B5 - D6 . B5 . A5 .',
    'G5 - A5 - F#5 - - - E5 - - - . . . .',
    'B5 . A5 . G5 . A5 . B5 . . . E6 - - -',
    'D6 . B5 . A5 . G5 . A5 - - - . . . .',
    'G5 . F#5 . E5 . F#5 . G5 . A5 . B5 - - -',
    'A5 - G5 - F#5 - D5 - E5 - - - - - . .',
  ],
  harmony: ['B3 . . . E4 . . . B3 . . . E4 . . .'],
  bass: [bgEm, bgD, bgEm, bgC, bgEm, bgD, bgAm, bgEm],
  drums: ['k . . h . . s . . k h . s . . h'],
};

const hfD = 'D5 A5 F#5 A5 D5 A5 F#5 A5 D5 A5 F#5 A5 D5 A5 F#5 A5';
const hfE = 'E5 B5 G#5 B5 E5 B5 G#5 B5 E5 B5 G#5 B5 E5 B5 G#5 B5';
const hfA = 'C#5 A5 E5 A5 C#5 A5 E5 A5 C#5 A5 E5 A5 C#5 A5 E5 A5';
const hfBm = 'D5 B5 F#5 B5 D5 B5 F#5 B5 D5 B5 F#5 B5 D5 B5 F#5 B5';
const bfD = 'D3 . . . A2 . . . D3 . . . A2 . . .';
const bfE = 'E3 . . . B2 . . . E3 . . . B2 . . .';
const bfA = 'A2 . . . E3 . . . A2 . . . E3 . . .';
const bfBm = 'B2 . . . F#2 . . . B2 . . . F#2 . . .';

/** FROST FIELDS (Ch4). Sparkly D lydian: glassy arpeggios, light steps. */
export const FROST: Song = {
  name: 'frost',
  bpm: 116,
  leadWave: 'pulse12',
  harmonyWave: 'pulse12',
  mix: { lead: 0.085, harmony: 0.025, bass: 0.13, drums: 0.06 },
  lead: [
    'D6 - A5 - F#5 - A5 - G#5 - - - E5 - - -',
    'F#5 - E5 - D5 - E5 - F#5 - - - - - . .',
    'D6 - A5 - F#5 - A5 - B5 - C#6 - D6 - - -',
    'E6 - D6 - C#6 - A5 - B5 - - - . . . .',
    'A5 . A5 . B5 . C#6 . D6 - - - A5 - - -',
    'G#5 . G#5 . A5 . B5 . A5 - - - E5 - - -',
    'F#5 . G#5 . A5 . B5 . C#6 . D6 . E6 - - -',
    'D6 - - - A5 - - - D5 - - - . . . .',
  ],
  harmony: [hfD, hfE, hfD, hfA, hfD, hfE, hfBm, hfD],
  bass: [bfD, bfE, bfD, bfA, bfD, bfE, bfBm, bfD],
  drums: ['k . . . h . . . s . . . h . h .'],
};

const bdAm = 'A2 . A2 E2 . A2 . . A2 . A2 E2 . A2 G#2 .';
const bdE = 'E2 . E2 B1 . E2 . . E2 . E2 B1 . E2 D2 .';
const bdDm = 'D2 . D2 A1 . D2 . . D2 . D2 A1 . D2 C2 .';
const bdFE = 'F2 . F2 C2 . F2 . . E2 . E2 B1 . E2 G#1 .';

/** DESERT RUINS (Ch5). Driving A harmonic minor through the sandstorm. */
export const DESERT: Song = {
  name: 'desert',
  bpm: 124,
  leadWave: 'pulse25',
  harmonyWave: 'pulse50',
  mix: { lead: 0.085, harmony: 0.03, bass: 0.15, drums: 0.09 },
  lead: [
    'A4 . C5 . E5 . F5 E5 . D5 . C5 B4 . A4 .',
    'G#4 - - - B4 - - - A4 - - - . . . .',
    'A4 . C5 . E5 . A5 G#5 . F5 . E5 D5 . C5 .',
    'B4 - C5 - D5 - B4 - E5 - - - . . . .',
    'E5 . E5 . F5 . E5 . D5 . D5 . E5 . D5 .',
    'C5 . C5 . D5 . C5 . B4 - - - G#4 - - -',
    'A4 . B4 . C5 . D5 . E5 . F5 . G#5 . A5 .',
    'E5 - - - G#4 - - - A4 - - - . . . .',
  ],
  harmony: ['E4 . . E4 . . E4 . E4 . . E4 . . E4 .'],
  bass: [bdAm, bdE, bdAm, bdE, bdDm, bdFE, bdAm, bdE],
  drums: ['k . s k . k s . k . s k . k s s'],
};

const bmDm = 'D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .';
const bmBb = 'Bb1 . Bb2 . Bb1 . Bb2 . Bb1 . Bb2 . Bb1 . Bb2 .';
const bmA = 'A1 . A2 . A1 . A2 . A1 . A2 . A1 . A2 .';
const bmGm = 'G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 .';
const smDm = '. F4 . F4 . F4 . F4 . A4 . A4 . F4 . F4';
const smBb = '. F4 . F4 . F4 . F4 . Bb4 . Bb4 . F4 . F4';
const smA = '. E4 . E4 . A4 . A4 . C#5 . C#5 . E5 . E5';
const smGm = '. G4 . G4 . Bb4 . Bb4 . G4 . G4 . D4 . D4';
const mGroove = 'k . h k s . h k k . h k s . s h';

/** MIRA + GRUB (Ch6). Grub's tune turned vengeful: the family theme in D minor. */
export const BOSS_MIRA: Song = {
  name: 'boss-mira',
  bpm: 160,
  leadWave: 'pulse25',
  harmonyWave: 'pulse12',
  mix: { lead: 0.085, harmony: 0.035, bass: 0.15, drums: 0.1 },
  lead: [
    'D5 . F5 D5 . A5 . D5 Bb5 . A5 . G5 . F5 .',
    'E5 . F5 . A4 - - - . . A4 . C5 . D5 .',
    'D5 . F5 D5 . A5 . D5 C6 . Bb5 . A5 . G5 .',
    'F5 . G5 . A5 - - - C#6 - - - . . . .',
    'A5 A5 . A5 G5 . F5 . G5 G5 . G5 F5 . E5 .',
    'F5 . E5 . D5 . E5 . F5 - - - . . . .',
    'Bb5 . A5 . G5 . F5 . G5 . A5 . Bb5 . C6 .',
    'D6 - - - A5 - - - F5 - - - C#5 - - -',
  ],
  harmony: [smDm, smDm, smBb, smA, smDm, smDm, smGm, smA],
  bass: [bmDm, bmDm, bmBb, bmA, bmDm, bmDm, bmGm, bmA],
  drums: [mGroove, mGroove, mGroove, mGroove, mGroove, mGroove, mGroove, 'k k s . k k s . s s s s c . . .'],
};

/** THE MAP. A light, adventurous march in G. */
export const MAP: Song = {
  name: 'map',
  bpm: 118,
  leadWave: 'pulse25',
  harmonyWave: 'pulse12',
  mix: { lead: 0.075, harmony: 0.03, bass: 0.13, drums: 0.07 },
  lead: [
    'G4 - B4 - D5 - B4 - G4 - D5 - G5 - - -',
    'F#5 - E5 - D5 - C5 - B4 - A4 - B4 - - -',
    'C5 - E5 - G5 - E5 - A4 - C5 - E5 - - -',
    'D5 - C5 - B4 - A4 - G4 - - - . . . .',
  ],
  harmony: [
    'D4 . G4 . D4 . G4 . D4 . G4 . D4 . G4 .',
    'D4 . F#4 . A4 . F#4 . D4 . F#4 . A4 . F#4 .',
    'E4 . G4 . C5 . G4 . E4 . A4 . C5 . A4 .',
    'F#4 . A4 . D5 . A4 . G4 . B4 . D5 . . .',
  ],
  bass: [
    'G2 . D3 . G2 . D3 . G2 . D3 . G2 . D3 .',
    'D2 . A2 . D2 . A2 . D2 . A2 . D2 . A2 .',
    'C3 . G2 . C3 . G2 . A2 . E3 . A2 . E3 .',
    'D2 . A2 . D2 . A2 . G2 . D3 . G2 . . .',
  ],
  drums: ['k . h . s . h . k . k . s . h h'],
};

// ---- jingles (play once, over the music) ----------------------------------------

export const JINGLE_CLEAR: Song = {
  name: 'jingle-clear',
  bpm: 140,
  once: true,
  leadWave: 'pulse50',
  mix: { lead: 0.1, bass: 0.15 },
  lead: ['C5 E5 G5 C6 - - E6 - - - - - . . . .'],
  bass: ['C3 . . . . . G2 . C3 - - - . . . .'],
};

export const JINGLE_COIL: Song = {
  name: 'jingle-coil',
  bpm: 180,
  once: true,
  leadWave: 'pulse25',
  mix: { lead: 0.1 },
  lead: ['E5 G5 B5 E6 - - . . . . . . . . . .'],
};

export const JINGLE_LIFE_LOST: Song = {
  name: 'jingle-life-lost',
  bpm: 150,
  once: true,
  leadWave: 'pulse50',
  mix: { lead: 0.1 },
  lead: ['G4 - F#4 - F4 - E4 - - - . . . . . .'],
};

export const JINGLE_GAME_OVER: Song = {
  name: 'jingle-game-over',
  bpm: 110,
  once: true,
  leadWave: 'pulse50',
  mix: { lead: 0.1, bass: 0.15 },
  lead: ['E5 - D5 - C5 - B4 - A4 - - - - - - -'],
  bass: ['A2 - - - - - - - E2 - - - A1 - - -'],
};

export const JINGLE_NEW_BEST: Song = {
  name: 'jingle-new-best',
  bpm: 160,
  once: true,
  leadWave: 'pulse25',
  mix: { lead: 0.1 },
  lead: ['C5 E5 G5 E5 C6 - G5 - C6 - - - . . . .'],
};

export const JINGLE_VICTORY: Song = {
  name: 'jingle-victory',
  bpm: 132,
  once: true,
  leadWave: 'pulse25',
  harmonyWave: 'pulse12',
  mix: { lead: 0.1, harmony: 0.05, bass: 0.15, drums: 0.1 },
  lead: ['G5 - G5 - G5 - C6 - - - - - B5 - C6 -', 'D6 - - - E6 - - - - - - - . . . .'],
  harmony: ['E5 - E5 - E5 - G5 - - - - - G5 - G5 -', 'B5 - - - C6 - - - - - - - . . . .'],
  bass: ['C3 . G2 . C3 . G2 . F2 . C3 . F2 . C3 .', 'G2 . D3 . G2 . D3 . C3 - - - . . . .'],
  drums: ['k . h . s . h . k . h . s . s s', 'c . . . . . . . k . . . . . . .'],
};
