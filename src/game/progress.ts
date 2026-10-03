import type { SaveData } from '../save/save';
import { CHAPTERS, ChapterDef } from './chapters';
import { refillLives } from './lives';

/**
 * Story progress rules (pure functions over the save's `story` block):
 * which chapters are open, what clearing one unlocks, and checkpoints.
 * Learner's rules: beating a boss sets the checkpoint; running out of lives
 * sends you back to it with 3 lives; replays share the same save.
 */
type Story = SaveData['story'];

const playable = (chapters: ChapterDef[]) => chapters.filter((c) => c.available);

/** The next playable chapter after `id`, or null at the end of what's built. */
export function nextChapter(id: number, chapters: ChapterDef[] = CHAPTERS): number | null {
  const next = playable(chapters).find((c) => c.id > id);
  return next ? next.id : null;
}

/** The playable chapter just before `id`, or null for the first. */
export function prevChapter(id: number, chapters: ChapterDef[] = CHAPTERS): number | null {
  const prev = playable(chapters)
    .filter((c) => c.id < id)
    .pop();
  return prev ? prev.id : null;
}

/** Open = built, and either the first chapter or its playable predecessor is cleared. */
export function isUnlocked(story: Story, id: number, chapters: ChapterDef[] = CHAPTERS): boolean {
  const c = chapters[id - 1];
  if (!c || !c.available) return false;
  const prev = prevChapter(id, chapters);
  return prev === null || story.completed[prev - 1];
}

/** The chapter to suggest on the map: the first open chapter not yet cleared, else the last open one. */
export function suggestedChapter(story: Story, chapters: ChapterDef[] = CHAPTERS): number {
  const open = playable(chapters).filter((c) => isUnlocked(story, c.id, chapters));
  const fresh = open.find((c) => !story.completed[c.id - 1]);
  return (fresh ?? open[open.length - 1] ?? chapters[0]).id;
}

/** Record a clear. Returns the chapter it unlocked (if any). */
export function completeChapter(story: Story, id: number, chapters: ChapterDef[] = CHAPTERS): number | null {
  story.completed[id - 1] = true;
  story.started = true;
  const next = nextChapter(id, chapters);
  if (next) story.highestUnlocked = Math.max(story.highestUnlocked, next);
  if (chapters[id - 1]?.boss) {
    // Beating a boss means you never have to fight it again after running out of lives.
    story.checkpoint = Math.max(story.checkpoint, next ?? id);
  }
  if (id === chapters.length) story.finished = true;
  return next;
}

/** Out of lives: back to the checkpoint with 3 lives. Unlocked chapters stay unlocked. */
export function outOfLives(story: Story): number {
  refillLives(story);
  story.resume = null;
  return story.checkpoint;
}

/**
 * Called on load. If the checkpoint sits on a boss you've already beaten
 * (because nothing after it had been built when you beat it), move it to the
 * next chapter now that it exists. Old saves keep working as the game grows.
 */
export function normalizeCheckpoint(story: Story, chapters: ChapterDef[] = CHAPTERS): void {
  for (;;) {
    const c = chapters[story.checkpoint - 1];
    if (!c || !c.boss || !story.completed[c.id - 1]) return;
    const next = nextChapter(c.id, chapters);
    if (!next) return;
    story.checkpoint = next;
  }
}
