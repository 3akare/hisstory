import { Song, SongPlayer } from './sequencer';
import { playSfx, SfxName } from './sfx';
import { Synth } from './synth';
import { TRACKS } from './tracks';

/**
 * The sound system. One AudioContext, a master volume, and two "buses":
 *   music → the songs (muted by the music toggle)
 *   sfx   → sound effects and jingles (always on)
 *
 * Browsers won't play sound until the player interacts, so the context is
 * created/resumed on the first key press or tap (`unlock`). Until then we just
 * remember which song we'd like playing.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private synth: Synth | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private player: SongPlayer | null = null;
  private jinglePlayer: SongPlayer | null = null;
  /** The song the current scene wants, even before audio is unlocked. */
  wanted: string | null = null;
  musicOn: boolean;

  constructor(musicOn: boolean) {
    this.musicOn = musicOn;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend().catch(() => {});
      else this.ctx.resume().catch(() => {});
    });
  }

  get unlocked(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  get current(): string | null {
    return this.player?.song.name ?? null;
  }

  /** Call from a user gesture. Safe to call many times. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
      } catch {
        return;
      }
      this.synth = new Synth(this.ctx);
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      // A gentle compressor keeps the mix from clipping when lots happens at once.
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicOn ? 1 : 0;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
    }
    if (this.ctx.state !== 'running') {
      this.ctx
        .resume()
        .then(() => this.startWanted())
        .catch(() => {});
    } else {
      this.startWanted();
    }
  }

  private startWanted(): void {
    if (this.wanted && this.current !== this.wanted) this.switchTo(this.wanted);
  }

  /** Ask for a song. Crossfades if something else is playing. */
  music(name: string | null): void {
    this.wanted = name;
    if (!this.unlocked) return;
    if (name === this.current) return;
    this.switchTo(name);
  }

  private switchTo(name: string | null): void {
    if (!this.ctx || !this.synth || !this.musicBus) return;
    const old = this.player;
    this.player = null;
    old?.stop(0.35);
    if (!name) return;
    const song = TRACKS[name];
    if (!song) return;
    const p = new SongPlayer(this.ctx, this.synth, song, this.musicBus);
    const t = this.ctx.currentTime;
    p.out.gain.setValueAtTime(0, t);
    p.out.gain.linearRampToValueAtTime(1, t + 0.4);
    p.start(t + 0.05);
    this.player = p;
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
    this.musicBus.gain.linearRampToValueAtTime(on ? 1 : 0, t + 0.2);
  }

  sfx(name: SfxName): void {
    if (!this.unlocked || !this.synth || !this.sfxBus) return;
    playSfx(this.synth, this.sfxBus, name, this.ctx!.currentTime + 0.005);
  }

  /** A short tune on the sfx bus. The music dips underneath it. */
  jingle(name: string): void {
    if (!this.unlocked || !this.ctx || !this.synth || !this.sfxBus) return;
    const song: Song | undefined = TRACKS[name];
    if (!song) return;
    this.jinglePlayer?.stop(0.05);
    const p = new SongPlayer(this.ctx, this.synth, song, this.sfxBus);
    p.start();
    this.jinglePlayer = p;
    this.duck(song);
  }

  private duck(song: Song): void {
    if (!this.player || !this.ctx) return;
    const len = (60 / song.bpm / 4) * 16 * Math.max(1, song.lead?.length ?? 1);
    const g = this.player.out.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0.25, t + 0.05);
    g.setValueAtTime(0.25, t + len);
    g.linearRampToValueAtTime(1, t + len + 0.5);
  }
}
