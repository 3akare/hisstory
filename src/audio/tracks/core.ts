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
