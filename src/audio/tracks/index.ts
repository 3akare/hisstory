import type { Song } from '../sequencer';
import * as core from './core';

/** Every song by name. Scenes ask for music by name. */
export const TRACKS: Record<string, Song> = {};
for (const song of Object.values(core)) {
  if (song && typeof song === 'object' && 'bpm' in song) TRACKS[(song as Song).name] = song as Song;
}

export type TrackName = string;
