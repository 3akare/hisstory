import type { Synth } from './synth';

/** Synthesised sound effects: no audio files, all made from the same chiptune voices. */
export type SfxName =
  | 'eat'
  | 'poison'
  | 'portal'
  | 'crash'
  | 'lifeLost'
  | 'coilHit'
  | 'telegraph'
  | 'surface'
  | 'bossDefeat'
  | 'menuMove'
  | 'menuConfirm'
  | 'menuBack'
  | 'blip'
  | 'oneUp'
  | 'pause';

export function playSfx(s: Synth, out: AudioNode, name: SfxName, t: number): void {
  switch (name) {
    case 'eat':
      s.tone(out, 'pulse25', 880, t, 0.05, 0.09, 1320);
      s.tone(out, 'pulse25', 1320, t + 0.045, 0.05, 0.07, 1760);
      break;
    case 'poison':
      s.tone(out, 'pulse12', 600, t, 0.18, 0.08, 180);
      break;
    case 'portal':
      s.tone(out, 'pulse12', 300, t, 0.16, 0.06, 1400);
      s.noise(out, t, 0.18, 0.05, 3000, 'bandpass');
      break;
    case 'crash':
      s.noise(out, t, 0.3, 0.22, 400, 'lowpass');
      s.tone(out, 'triangle', 180, t, 0.25, 0.25, 40);
      break;
    case 'lifeLost':
      [523, 440, 349, 262].forEach((f, i) => s.tone(out, 'pulse50', f, t + 0.09 * i, 0.09, 0.08));
      break;
    case 'coilHit':
      s.noise(out, t, 0.18, 0.15, 2000);
      [659, 784, 988, 1319].forEach((f, i) => s.tone(out, 'pulse25', f, t + 0.05 * i, 0.07, 0.09));
      break;
    case 'telegraph':
      s.noise(out, t, 0.5, 0.08, 300, 'lowpass');
      s.tone(out, 'triangle', 70, t, 0.4, 0.12, 55);
      break;
    case 'surface':
      s.tone(out, 'pulse12', 200, t, 0.1, 0.07, 500);
      s.noise(out, t, 0.12, 0.08, 1200, 'lowpass');
      break;
    case 'bossDefeat':
      s.noise(out, t, 0.8, 0.2, 600, 'lowpass');
      [392, 330, 262, 196, 131].forEach((f, i) => s.tone(out, 'pulse50', f, t + 0.08 * i, 0.1, 0.09));
      break;
    case 'menuMove':
      s.tone(out, 'pulse12', 660, t, 0.03, 0.06);
      break;
    case 'menuConfirm':
      s.tone(out, 'pulse25', 784, t, 0.05, 0.08);
      s.tone(out, 'pulse25', 1175, t + 0.05, 0.08, 0.08);
      break;
    case 'menuBack':
      s.tone(out, 'pulse25', 784, t, 0.05, 0.07);
      s.tone(out, 'pulse25', 523, t + 0.05, 0.08, 0.07);
      break;
    case 'blip':
      s.tone(out, 'pulse12', 1200 + Math.random() * 200, t, 0.02, 0.03);
      break;
    case 'oneUp':
      [784, 988, 1175, 1568].forEach((f, i) => s.tone(out, 'pulse50', f, t + 0.06 * i, 0.07, 0.08));
      break;
    case 'pause':
      s.tone(out, 'pulse25', 988, t, 0.05, 0.07);
      s.tone(out, 'pulse25', 740, t + 0.06, 0.06, 0.07);
      break;
  }
}
