import type { Mood, SpeakerId } from '../art/portraits';

/**
 * All the dialogue. Each chapter has an intro (before you play) and an outro
 * (after you clear it). Written from the beats in prd.md > Story Script.
 */
export interface Line {
  who: SpeakerId;
  text: string;
  mood?: Mood;
}

export interface ChapterScript {
  intro: Line[];
  outro: Line[];
}

export const SCRIPT: Record<number, ChapterScript> = {
  1: {
    intro: [
      { who: 'narrator', text: 'THE ORCHARD. The sweetest fruit in the land, and home to a small green snake named Pip.' },
      { who: 'pip', text: 'Ahh, apple season. Nothing could possibly ruin today.' },
      { who: 'crow', text: 'CAW! By order of the HOLLOW KING, every fruit in this orchard belongs to the throne!', mood: 'angry' },
      { who: 'pip', text: '...Who is the Hollow King?' },
      { who: 'crow', text: 'Someone you never want to meet, worm. CAW CAW!' },
      { who: 'narrator', text: 'The crows are stripping the trees bare. Grab what fruit is left before it is all gone!' },
    ],
    outro: [
      { who: 'pip', text: 'Got the last of them! And the crows flew off... east.' },
      { who: 'narrator', text: 'Deep under the soil, something heard Pip coming.' },
      { who: 'grub', text: 'Snfff... snfff... SNAKE. I smell SNAKE in the King’s orchard.', mood: 'angry' },
    ],
  },
  3: {
    intro: [
      { who: 'grub', text: 'GRUB THE MOLE! Royal Digger to the Hollow King! You are in MY tunnels, worm.' },
      { who: 'pip', text: 'I’m a snake.' },
      { who: 'grub', text: 'Worm, snake, noodle. All the same to me. LUNCH!', mood: 'angry' },
      { who: 'narrator', text: 'You can’t eat Grub. Watch for shaking dirt, then circle around him before he digs away!' },
    ],
    outro: [
      { who: 'grub', text: 'Ow! OW! Okay, okay! You win, noodle!', mood: 'angry' },
      { who: 'grub', text: 'But the King will hear about this. And so will my SISTER.' },
      { who: 'pip', text: '...Sister?' },
      { who: 'narrator', text: 'Grub dives deep and is gone. Far to the east, someone is sharpening her claws.' },
    ],
  },
};
