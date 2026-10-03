/**
 * A tiny NES-style synthesiser on the Web Audio API.
 *
 * Web Audio is a graph: sources (oscillators, noise) flow through nodes (gain =
 * volume, filters) into the speakers. Every note here is a short-lived
 * oscillator plus a gain "envelope" (attack → hold → release), scheduled at an
 * exact time on the audio clock, so timing is sample-accurate.
 *
 * Voices, like the NES sound chip:
 *   pulse12 / pulse25 / pulse50  square-ish waves with different "duty cycles"
 *                                (12.5% thin and nasal, 50% hollow and round)
 *   triangle                     soft bass
 *   noise                        drums and hisses
 */
export type Wave = 'pulse12' | 'pulse25' | 'pulse50' | 'triangle' | 'noise';

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" → 440, "C#5" → 554.37, "Eb3" → 155.56. Returns 0 for unknown text. */
export function noteFreq(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return 0;
  let semis = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const octave = Number(m[3]);
  semis += (octave + 1) * 12; // MIDI note number
  return 440 * Math.pow(2, (semis - 69) / 12);
}

/**
 * A pulse wave with a given duty cycle, built from its Fourier series
 * (the sum of sine harmonics that make up that shape).
 */
function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  const n = 64;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  }
  return ctx.createPeriodicWave(real, imag);
}

export class Synth {
  private waves = new Map<string, PeriodicWave>();
  private noiseBuffer: AudioBuffer;

  constructor(private ctx: BaseAudioContext) {
    this.waves.set('pulse12', pulseWave(ctx, 0.125));
    this.waves.set('pulse25', pulseWave(ctx, 0.25));
    this.waves.set('pulse50', pulseWave(ctx, 0.5));
    // One second of white noise, looped for drums.
    const len = ctx.sampleRate;
    this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  /**
   * Play one tone.
   * @param slideTo optional target frequency for pitch slides (sound effects)
   */
  tone(dest: AudioNode, wave: Exclude<Wave, 'noise'>, freq: number, when: number, dur: number, vol: number, slideTo?: number): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    if (wave === 'triangle') osc.type = 'triangle';
    else osc.setPeriodicWave(this.waves.get(wave)!);
    osc.frequency.setValueAtTime(freq, when);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), when + dur);
    const g = ctx.createGain();
    const attack = 0.004;
    const release = Math.min(0.06, dur * 0.4);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    g.gain.setValueAtTime(vol, Math.max(when + attack, when + dur - release));
    g.gain.linearRampToValueAtTime(0, when + dur);
    osc.connect(g).connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    osc.onended = () => g.disconnect();
  }

  /** A burst of filtered noise: kick, snare, hat, or a hiss. */
  noise(dest: AudioNode, when: number, dur: number, vol: number, filterHz: number, type: BiquadFilterType = 'highpass'): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterHz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(when, Math.random() * 0.5);
    src.stop(when + dur + 0.02);
    src.onended = () => g.disconnect();
  }

  /** Drum kit on the noise channel (plus a pitched thump for the kick). */
  drum(dest: AudioNode, kind: string, when: number, vol: number): void {
    switch (kind) {
      case 'k': // kick: a fast falling triangle "thump"
        this.tone(dest, 'triangle', 150, when, 0.12, vol * 1.6, 45);
        this.noise(dest, when, 0.03, vol * 0.4, 800, 'lowpass');
        break;
      case 's': // snare
        this.noise(dest, when, 0.12, vol * 0.9, 1500);
        this.tone(dest, 'triangle', 220, when, 0.05, vol * 0.5, 160);
        break;
      case 'h': // closed hat
        this.noise(dest, when, 0.035, vol * 0.45, 7000);
        break;
      case 'o': // open hat
        this.noise(dest, when, 0.16, vol * 0.4, 6000);
        break;
      case 'c': // crash
        this.noise(dest, when, 0.6, vol * 0.5, 4000);
        break;
      case 't': // low tom
        this.tone(dest, 'triangle', 120, when, 0.15, vol * 1.2, 70);
        break;
    }
  }
}
