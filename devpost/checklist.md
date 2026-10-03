---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. You can play a round of Classic Snake**
  Becomes usable: Run `npm run dev`, open the page, and a crisp pixel snake moves around a 20×15 board with WASD or the arrows. It eats glowing fruit, grows, speeds up every 5 fruit, and dies on walls or its own body. Press a key to restart. Particles burst when you eat, the screen shakes on death, and movement is smoothly interpolated.
  Why now: This proves the whole foundation on the first slice: the scaffold, TypeScript 7 + Vite 8 + Vitest tooling (a spec risk), the fixed-timestep loop, the Canvas renderer with whole-number scaling, the input buffer, and the pure game rules. Every later slice lands on this.
  PRD ref: `prd.md > Classic Mode`, `prd.md > Controls`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Stack`, `spec.md > Game Loop (engine/loop.ts)`, `spec.md > Renderer (engine/renderer.ts)`, `spec.md > Input (engine/input.ts)`, `spec.md > Board, Snake and Movement (game/board.ts, game/snake.ts)`, `spec.md > Collisions (game/collision.ts)`, `spec.md > Fruit (game/fruit.ts)`, `spec.md > Effects (engine/fx.ts)`, `spec.md > File Structure`
  Build: Scaffold with Vite + TS (pin TS 5.9 if TS 7 breaks the tooling), set up Vitest, and add `index.html` with a single canvas. Build `engine/loop.ts`, `renderer.ts`, `input.ts`, `fx.ts` and `rng.ts`. Add `art/palettes.ts`, `sprites.ts` and `spriteCache.ts` (snake, fruit, Orchard tiles), and `game/board.ts`, `snake.ts`, `collision.ts` and `fruit.ts`. Add a minimal PlayScene in classic mode.
  Verify (mechanical): `npm test` passes unit tests for snake movement, growth, the reversal block, the 2-turn input buffer, wall and self collision, and fruit never spawning on the snake. `npx tsc --noEmit` is clean. `npm run build` succeeds. A Playwright script loads the dev server, checks the canvas is non-blank, presses keys, and screenshots a moving snake.
  Learner check: Run `npm run dev`, open the localhost link, and play a few rounds. Does the movement feel snappy and smooth, and do the pixels look crisp?
  Commit: `Playable Classic snake on canvas with fixed-timestep loop`

- [x] **2. You can beat Grub by coiling around him**
  Becomes usable: Open `?debug=1&boss=grub` to drop straight into the Grub arena. Dirt shakes at a hole, then Grub pops up. Wrap your body around him (walls count) before he burrows to knock a notch off his health bar, with a flash, shake and hit sound. Touching him costs one of your 3 hearts: you flash and respawn at the start, keeping your length. After 3 coils he's defeated.
  Why now: Coil to conquer is the kernel and the biggest design risk (does the flood-fill coil feel fair and fun?). It comes before menus, music or story, so early feedback can shape every later boss.
  PRD ref: `prd.md > Story: Coil to Conquer (Boss Fights)`, `prd.md > Boss Design and Difficulty`, `prd.md > Story: Lives and Checkpoints (learner's design)`
  Spec ref: `spec.md > Coil Detection (game/coil.ts)`, `spec.md > Bosses (game/bosses/*.ts)`, `spec.md > Lives, Score and Checkpoints (game/lives.ts, game/progress.ts)`, `spec.md > Debug Tools (debug/debug.ts)`
  Build: `game/coil.ts`, `game/lives.ts`, `bosses/bossKit.ts` (telegraph, escalate, mercy), `bosses/tuning.ts` and `bosses/grub.ts`. Add boss mode to PlayScene with a HUD (hearts, score, boss bar), the Grub sprites, the respawn and flash, `debug/debug.ts` (boss jump, invincibility, coil pocket overlay), and the "Coil around him!" hint.
  Verify (mechanical): Unit tests for coil detection: a full ring coils, an open ring doesn't, a wall pin coils, half the board doesn't, and Grub only counts while surfaced. Further tests: Grub's state machine timings with a seeded RNG, escalation, mercy after 2 lives, lives and respawn. A Playwright test loads the debug boss URL, and a scripted coil (debug helper) drops the boss bar.
  Learner check: Open the boss link and fight Grub a few times. Does coiling feel satisfying, and does losing a life feel fair?
  Commit: `Coil to conquer: Grub boss fight with lives and debug tools`

- [x] **3. Home screen with the snake theme, music toggle and mobile controls**
  Becomes usable: The game opens on the HISSTORY title with a self-playing snake under a dark overlay. The first press starts a catchy, snake-charmer-style chiptune, and the speaker toggles it (remembered on reload). Classic is a real flow: Home → play → Game Over with best score and "New best!" → Retry/Home. Sound effects play for eat, hit and menus. On a phone-sized screen, an on-screen d-pad appears under the board.
  Why now: Web Audio is the second technical risk and a learning goal. The home screen is the first thing judges see. Mobile layout has to be settled before story screens are built on it.
  PRD ref: `prd.md > Home Screen`, `prd.md > Screens and Layout`, `prd.md > Classic Mode`, `prd.md > Controls`
  Spec ref: `spec.md > Audio Engine (audio/audioEngine.ts)`, `spec.md > Chiptune Synth + Sequencer (audio/synth.ts, audio/sequencer.ts)`, `spec.md > Soundtrack (audio/tracks/*.ts)`, `spec.md > Sound Effects (audio/sfx.ts)`, `spec.md > Scene Manager (engine/scenes.ts)`, `spec.md > Scenes (scenes/)`, `spec.md > Look and Feel`, `spec.md > Save System (save/save.ts)`
  Build: The audio engine with its buses and gesture unlock, the 4-voice synth, the lookahead sequencer, the `theme` and `orchard` tracks, the jingles and `sfx.ts`. Add the scene manager with fades, `HomeScene` with `attractAI.ts`, `GameOverScene`, the fonts (Fontsource), the canvas-drawn buttons with keyboard and pointer navigation, the portrait layout with the d-pad, and `save/save.ts` (settings and classic best, validated, with a corrupt/unavailable fallback).
  Verify (mechanical): Unit tests for the sequencer's scheduling maths (note times inside the lookahead window), save load/validate/corrupt fallback, and the attract AI never dying for 2,000 steps on a seed. Playwright (desktop and mobile projects): Home renders, Enter starts Classic, a forced death shows Game Over, best score persists across reload, the music toggle state persists, and the d-pad is visible on mobile and steers the snake.
  Learner check: Open the game, listen to the theme, toggle music, play Classic to Game Over and beat your best. Then open dev tools' device mode (or your phone on the same network with `npm run dev -- --host`) and steer with the d-pad.
  Commit: `Home screen, chiptune theme, music toggle, mobile d-pad`

- [x] **4. Story mode: Chapter 1 → Grub, with cutscenes, the map, lives and checkpoints**
  Becomes usable: Story opens the Chapter Map (Ch1 unlocked, the rest locked). Ch1 plays an intro cutscene: pixel portraits, typewriter text and Skip, with the crows stealing fruit. The Orchard level fills a fruit meter of 10, then "Chapter Clear!" and an outro. Grub's chapter unlocks with its own boss song. Beating him plays the revenge beat ("The King will hear of this…") and sets a checkpoint. Out of lives sends you back to the checkpoint with 3 lives. Lives, score and extra lives carry across chapters and replays. **This is Milestone 1, the submittable floor.**
  Why now: It connects the kernel (story + revenge chain + coil) into the real journey. After this slice the game is complete enough to submit.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Story: Chapter Map and Progress`, `prd.md > Story: Normal Chapters`, `prd.md > Cutscenes`, `prd.md > Story Script`, `prd.md > Story: Lives and Checkpoints (learner's design)`
  Spec ref: `spec.md > Chapter Definitions (game/chapters.ts)`, `spec.md > Story Content (story/script.ts, art/portraits.ts)`, `spec.md > Lives, Score and Checkpoints (game/lives.ts, game/progress.ts)`, `spec.md > Scenes (scenes/)`, `spec.md > Data Model`
  Build: `game/chapters.ts` (all 10 defined, with Ch1 and Grub playable and Ch2 slotted for slice 6), `game/progress.ts`, `story/script.ts` (Ch1 + Grub dialogue), `art/portraits.ts` (Pip, crow, Grub), `ChapterMapScene`, `CutsceneScene`, `OutOfLivesScene`, the PlayScene chapter mode with the meter, the `map` and `boss-grub` tracks, and the story save fields.
  Verify (mechanical): Unit tests for progress: unlocks, checkpoint on boss defeat, out-of-lives reset, extra life every 50 (cap 9), and replays that share lives and score. A Playwright run with debug fast-forward goes from Home → Story → cutscene → Ch1 cleared → Grub cleared → map shows ✓✓ and the checkpoint, and the state survives reload.
  Learner check: Start Story from a fresh save (debug "reset save"), play Ch1 and beat Grub, and lose all your lives once on purpose. Does the story land, and does the checkpoint feel fair?
  Commit: `Story mode Milestone 1: map, cutscenes, Ch1 and Grub with checkpoints`

- [x] **5. Save everything, pause and resume, and deploy pipeline**
  Becomes usable: Close the tab mid-level and reopen it: the map offers "Resume Chapter N", which comes back paused with a 3-2-1. Switching tabs auto-pauses. The pause menu works (Resume, Restart, Quit, music). Private-mode or blocked storage shows "progress won't be saved" instead of crashing. `npm run build` produces a deployable site, and a GitHub Actions workflow (tests → build → Pages) is ready.
  Why now: The learner asked to "save game states like mad". Snapshots need every system built so far to be plain data, so it's cheapest to lock in before more bosses arrive. Milestone 1 becomes deployable.
  PRD ref: `prd.md > Story: Chapter Map and Progress`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Data Model`, `spec.md > Save System (save/save.ts)`, `spec.md > Important Failure Modes`, `spec.md > Where It Runs and How Someone Tries It`
  Build: The `LevelSnapshot` capture/restore (snake, fruit, meter, boss state, hazards, RNG seed, mercy), autosave every 3 s plus on pause, visibilitychange and pagehide. Add `PauseScene` with the 3-2-1, the in-memory save fallback, `.github/workflows/deploy.yml`, `playwright.config.ts` for the desktop and mobile projects, and `vite.config.ts` with base `./`.
  Verify (mechanical): Unit tests for the snapshot round-trip (mid-Grub-fight equals itself after JSON), and the save migration/validation with missing fields. Playwright: start Ch1, eat 3 fruit, reload, Resume shows meter 3 and paused; a hidden tab pauses; blocked localStorage (stubbed) still boots. `npm run build && npx vite preview` serves a working game.
  Learner check: Play into the Grub fight, close the tab, reopen it, and resume. Is everything where you left it?
  Commit: `Mid-level save/resume, pause menu, Pages deploy workflow`

- [ ] **6. Act I complete: Mushroom Bog and poison fruit**
  Becomes usable: Ch2 Mushroom Bog sits between the Orchard and Grub, with its own palette, its own track, and purple poison fruit that shrinks you and drains the meter. There's a dying-toad cutscene. Act I is fully playable: Ch1 → Ch2 → Grub.
  Why now: It completes Act I, which was the learner's original cut. It also proves the chapter-twist system on the simplest twist before the harder ones.
  PRD ref: `prd.md > Story Script`, `prd.md > Story: Normal Chapters`
  Spec ref: `spec.md > Chapter Twists (game/twists.ts)`, `spec.md > Fruit (game/fruit.ts)`, `spec.md > Soundtrack (audio/tracks/*.ts)`
  Build: `game/twists.ts` (hook interface), poison fruit, the Bog palette, tiles, animated background and `bog` track, the toad portrait and Ch2 dialogue, and re-order Ch2 into the unlock chain.
  Verify (mechanical): Unit tests: poison shrinks by 2 (minimum 3) and drains the meter by 1, the unlock order is 1 → 2 → 3, and old saves where Ch3 was unlocked after Ch1 migrate without losing progress. Playwright debug run through Ch2.
  Learner check: Play Ch2. Is poison fruit readable at a glance, and does the Bog feel different from the Orchard?
  Commit: `Act I complete: Mushroom Bog with poison fruit`

- [ ] **7. Act II: Frost Fields, Desert Ruins portal fruit, Mira + Grub double boss**
  Becomes usable: Ch4 has Mira's revenge intro and ice that slides you one extra tile. Ch5 has twin portal fruit (eat one and you burst out of the other) inside sandstorm fog. Ch6 is the double boss: Mira roams and denies fruit, Grub returns faster ("I'm back, and stronger!"), there are two health bars, and Viper is glimpsed in the outro. Each part has its own palette and track (`frost`, `desert`, `boss-mira`).
  Why now: Story order. Portal fruit is the learner's own addition and the trickiest movement rule, so it's tested before Acts III and IV reuse the twist system.
  PRD ref: `prd.md > Portal Fruit`, `prd.md > Story Script`, `prd.md > Boss Design and Difficulty`
  Spec ref: `spec.md > Fruit (game/fruit.ts)`, `spec.md > Chapter Twists (game/twists.ts)`, `spec.md > Bosses (game/bosses/*.ts)`, `spec.md > Soundtrack (audio/tracks/*.ts)`
  Build: The ice and fog twists, portal pairs with safe placement, `bosses/miraGrub.ts`, the Mira portrait, Act II dialogue, palettes, tiles and tracks.
  Verify (mechanical): Unit tests: portal teleport direction and body follow-through, a twin is never placed with less than 3 free cells, an ice turn is delayed one step, fog doesn't affect rules, Mira's movement ratio and trail hazard, the Grub-revenge surfacing, and both bars must reach zero. Playwright debug run through Ch4–6.
  Learner check: Play Ch5 and fight Mira + Grub. Do the portals feel like Google Snake's, and is the double boss hectic-but-fair?
  Commit: `Act II: ice, portal fruit, fog, Mira + Grub boss`

- [ ] **8. Act III: Neon Caves, Sky Temple, Viper the rival snake**
  Becomes usable: Ch7 speeds up as you go. Ch8 has wall gaps that open and close. Ch9 is Viper: a rival AI snake that races you for fruit, grows, and lunges after a flashing path warning. She's stunned if she runs into your body, and you coil her head to wound her. She reveals she's the King's daughter. Each part has its own palette and track (`neon`, `sky`, `boss-viper`).
  Why now: Story order. Viper's AI is the most complex boss behaviour short of the finale.
  PRD ref: `prd.md > Story Script`, `prd.md > Boss Design and Difficulty`
  Spec ref: `spec.md > Chapter Twists (game/twists.ts)`, `spec.md > Bosses (game/bosses/*.ts)`, `spec.md > Coil Detection (game/coil.ts)`, `spec.md > Soundtrack (audio/tracks/*.ts)`
  Build: The speed-ramp and wall-gap twists, `bosses/viper.ts` (greedy fruit pathing with avoidance, lunge, stun, head-coil pocket rule, shrink on hit), the Viper portrait, Act III dialogue, palettes, tiles and tracks.
  Verify (mechanical): Unit tests: Viper never moves into walls when there's an alternative, the lunge is telegraphed for at least 0.8 s, the stun on hitting Pip's body, a head coil within `maxPocket` 12, shrinking by 3, and the lunge interval tightening after 2 hits. A wall gap never closes on the snake's head. Playwright debug run through Ch7–9.
  Learner check: Fight Viper a few times. Does she feel like a real rival, and can you see how to cut her off?
  Commit: `Act III: speed ramp, wall gaps, Viper rival boss`

- [ ] **9. Act IV: the Hollow King finale and the ending**
  Becomes usable: Ch10 is a 3-phase fight against the 2×2 Hollow King: crows sweep across flashing lanes, then Grub and Mira return as hazards while the King teleports, then the arena crumbles inward. Each phase is a mini-checkpoint, and the music intensifies each phase. Defeating him leads to the Orchard blooming, the ending cutscene, credits, and back Home.
  Why now: The finale closes the revenge chain. Everything it combines exists by now.
  PRD ref: `prd.md > Story Script`, `prd.md > Boss Design and Difficulty`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Bosses (game/bosses/*.ts)`, `spec.md > Soundtrack (audio/tracks/*.ts)`, `spec.md > Scenes (scenes/)`, `spec.md > Data Model`
  Build: `bosses/hollowKing.ts` (phases, crows, cameo hazards, teleport shadow, crumble down to a minimum size), the phase dialogue, `story.kingPhase` checkpointing, the `boss-king` track with 3 variants, the King portrait, `EndingScene` and credits, and `story.finished`.
  Verify (mechanical): Unit tests: a 2×2 coil with `maxPocket` 30, crow lanes telegraphed, the crumble never shrinks below the minimum or onto the snake, out of lives restarts at the current phase, the phase checkpoint survives save/reload. A Playwright debug run from Ch10 phase 1 to the credits.
  Learner check: Fight the King from phase 1 to the ending. Does it feel like a finale?
  Commit: `Act IV: Hollow King three-phase finale and ending`

## Hands-on Checkpoints

- [x] Early usable behavior explored: after slice 2 (does coil to conquer feel fair and fun? Feedback shapes all later bosses)
- [ ] Milestone 1 explored: after slice 5 (the full submittable game, end to end, including resume)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions
- Added `src/game/world.ts` (one level's rules: board + snake + fruit + score, returning events), and `src/scenes/draw.ts` / `src/scenes/hud.ts` (shared board, snake, HUD and d-pad drawing). The spec's file tree had no single home for the step logic or for drawing shared across scenes. This is an internal structure change only.
- Playwright uses the installed Google Chrome locally (`channel: 'chrome'`) and Playwright's Chromium in CI, and `@types/node` was added for the config. TypeScript 7 works with Vite 8 and Vitest 5, so the 5.9 fallback wasn't needed.
- Debug invincibility also auto-steers away from walls. The e2e test showed that "bosses can't hurt you" alone still lets the snake die on a wall and freeze the fight, which blocks testing and demo recording.
- Boss timers run on the fixed 1/120 s update, not on snake steps. The fixed timestep already makes them deterministic, and seconds map directly onto the PRD's tuning numbers.
- Checkpoint after slice 2: the learner found coiling far too hard ("it requires too much precision"). Changes: the board went from 24×18 to 20×15 so cells are bigger, and scaling now fills the window in quarter steps instead of wasting space. The coil rule became **circling ~300° around the boss** (winding angle), with the old sealed-pocket check kept for wall pins. Grub stays up 7/6/5 s instead of 4/3.5/3, warns for 1.5 s, prefers reachable holes, and panics instead of diving while you're partway round him. The boss snake is slower (150 ms per step), you start the fight at length 10, and a coil progress ring was added. `scope.md`, `prd.md` and `spec.md` are updated to match. The learner confirmed: "it's fine now."
- Added `src/engine/ui.ts` (canvas-drawn menus and the speaker button) and `src/audio/tracks/core.ts` + `index.ts` (songs as note data, looked up by name). The spec named `audio/tracks/*.ts` but no shared menu widget. Home's STORY button opens the Grub fight until slice 4 adds the chapter map. The M key toggles music anywhere, and Escape returns Home until the slice 5 pause menu.
- Added `src/scenes/story.ts` (how Story's screens connect: map → intro → play → outro / out of lives) and `normalizeCheckpoint` in `progress.ts`. In Milestone 1 nothing exists after Grub yet, so his checkpoint stays on Ch3. It moves forward automatically once Act II is built, so saves made now keep working. Unbuilt chapters show as "?" (coming soon) and are skipped in the unlock chain. Portraits are 16×16 drawn at 2× (chunky, quicker to author) instead of 32×32.
- Input is now only blocked while a screen fades *out*, not while the next one fades in (a test showed the map ignoring Enter for a moment). Running out of lives goes straight to one Out of Lives screen; before, the play screen also drew its own box first.
- Added `src/game/snapshot.ts` so mid-level saves are pure functions with their own unit test (a mid-Grub-fight snapshot replays identically after JSON), and `src/scenes/PauseScene.ts`. Escape and P now pause instead of quitting (Quit and Map are in the pause menu), and a pause button sits next to the music button for touch. A resumed game opens on a "WELCOME BACK" pause menu, and Resume runs the 3-2-1.
