---
doc: spec
status: approved
---

# HISSTORY — Technical Spec

## How This Works, In Plain Language
HISSTORY is a single web page with one `<canvas>`, which acts as a drawing surface. Everything you see is painted onto it many times a second by our own TypeScript code. There's no game engine, server or database.

- **The game loop** is the heartbeat. About 60 times a second the browser asks us to draw a frame (`requestAnimationFrame`). Inside it we **update** the game in fixed, equal time steps (so the snake moves at the same speed on a fast laptop and a slow phone), then **draw** the current picture. The snake moves one grid cell per "step". Between steps we slide it smoothly so it doesn't look jerky.
- **Scenes** are the screens from the PRD: Home, Chapter Map, Cutscene, Play, Game Over and so on. Exactly one scene is active, and the loop just calls the active scene's `update` and `draw`. Switching screens means swapping the scene.
- **The game rules** (snake, fruit, collisions, coils, bosses, lives) are plain TypeScript with no drawing code in them. That means they can be tested automatically, and the whole game state can be saved as JSON.
- **The art** is pixel sprites written as small text grids in code, one character per pixel, coloured by a per-biome palette. At start-up each grid is painted once into a small image and reused.
- **The music** is played by our own mini chiptune synth built on the **Web Audio API**. It works like an NES: two square-wave melody voices, a triangle bass and a noise drum, playing original songs stored as note data. A small scheduler queues notes slightly ahead of time so the music never stutters, even when the game is busy.
- **Saving** uses `localStorage`, a small notepad the browser keeps for one website. We write the save after every meaningful event and whenever the tab is hidden or closed, so leaving and coming back loses nothing.
- **Hosting:** the built game is a folder of static files. GitHub Pages serves it at a public link, and it rebuilds automatically on every push.

Why this shape: your learning goals are Canvas, Web Audio and the game loop. With no engine, all three are yours to write and understand. A static site needs no accounts, keys or servers, so there's nothing to break on demo day.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **Open the link.** GitHub Pages serves `index.html` and the bundled JS. `main.ts` waits for the pixel fonts to load, loads the save from `localStorage` (or creates a fresh one), builds the sprite cache, and starts the loop on **HomeScene**.
2. **Home.** HomeScene runs a self-playing snake (a simple "chase the fruit" AI on the same game rules) behind a translucent black overlay. The first click, tap or key press unlocks the `AudioContext` (browsers require this) and the home theme starts, unless the save says music is muted.
3. **Classic.** HomeScene → **PlayScene** in `classic` mode. Each fixed step: read the next buffered direction → move the snake → check walls and body → check fruit. On death → **GameOverScene**, which compares against `save.classic.best` and saves.
4. **Story.** HomeScene → **ChapterMapScene**, which reads `save.story` to show locked, unlocked and completed nodes. Picking a chapter → **CutsceneScene** with that chapter's intro lines from `story/script.ts`.
5. **Normal chapter.** CutsceneScene → PlayScene in `chapter` mode with that chapter's definition (board, twist, meter target, speed, music). Each fruit fills `meter`. A full meter → clear burst → outro CutsceneScene → `progress.ts` unlocks the next chapter → save → map.
6. **Boss chapter.** PlayScene in `boss` mode also creates that chapter's **boss controller** (e.g. `grub.ts`). After every snake step, `coil.ts` checks whether the boss is sealed in. A coil → boss takes damage → it breaks free and repositions. Zero health → defeat → outro (the revenge reveal) → `progress.ts` sets the checkpoint → save.
7. **Losing a life.** A collision → `lives.ts` takes a life → the snake flashes and respawns at the level start with its length and progress kept, paused until a direction is pressed. Zero lives → **OutOfLivesScene** → lives reset to 3 at the checkpoint → save → map.
8. **Leaving mid-level.** On `visibilitychange`/`pagehide` and every few seconds of play, PlayScene writes a **level snapshot** into the save. Next visit: the map offers "Resume Chapter N", which restores the snapshot paused with a 3-2-1 countdown.
9. **The end.** Defeating the King in Ch10 → ending cutscene → **EndingScene** (credits) → Home.

## Stack
| Piece | Version (checked 2026-10-03) | Why | Docs |
|---|---|---|---|
| **TypeScript** | 7.0.x | Types catch bugs in a large game state, and it builds on the learner's JS/Java background. *Learner agreed: "I trust you."* | https://www.typescriptlang.org/docs/ |
| **Canvas 2D API** | browser built-in | Learning goal. Draws everything, with image smoothing off for crisp pixels. | https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API |
| **Web Audio API** | browser built-in | Learning goal. Our own chiptune synth and sound effects. | https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API |
| **Vite** | 8.x | Dev server with instant reload, and a one-command static build. | https://vite.dev/guide/ |
| **@fontsource/press-start-2p** | 5.x | Arcade headline/HUD font, bundled locally (no CDN). | https://fontsource.org/fonts/press-start-2p |
| **@fontsource/pixelify-sans** | 5.x | Readable pixel font for dialogue. | https://fontsource.org/fonts/pixelify-sans |
| **Vitest** | 5.x | Unit tests for all game rules (Vite-native). | https://vitest.dev/guide/ |
| **Playwright** | 1.6x | End-to-end smoke tests in a real browser, desktop and mobile size. | https://playwright.dev/docs/intro |

No game engine: this was the agent's recommendation, which the learner accepted. The tradeoff: we hand-write the scene switching, input, tweens and particles an engine would provide, a few hundred lines in total.

**Verify early in the build:** TypeScript 7 is the new native compiler. If `vite` + `vitest` type tooling has any friction with it, pin TypeScript 5.9 instead (no code changes needed). Vite 8's config options for `base` and the build output also need checking against current docs.

## Where It Runs and How Someone Tries It
- **Runtime:** any modern browser (desktop Chrome, Firefox, Safari, Edge; mobile Chrome and Safari). Nothing needs installing to play. No API keys.
- **Develop:** Node 24 (installed: v24.16.0).
  ```bash
  npm install
  npm run dev        # open the printed http://localhost:5173
  npm test           # Vitest unit tests
  npm run e2e        # Playwright smoke tests
  npm run build      # static site in dist/
  ```
- **Debug mode:** open with `?debug=1` to jump to any chapter or boss phase, toggle invincibility, and show coil-detection overlays. This is essential for testing late bosses and for recording a clean demo. It's hidden from normal players.
- **Deployment (learner: no hosting preference; agent's choice):** **GitHub Pages via GitHub Actions**. `.github/workflows/deploy.yml` runs tests, then the build, then deploys `dist/` on every push to `main`. In the repo, go to Settings → Pages → Source: GitHub Actions. Vite `base` is set to `'./'` so it works under `https://<user>.github.io/hisstory/`. Guide: https://vite.dev/guide/static-deploy#github-pages
- **Demo recording (`6-ship`):** record from the live URL with `?debug=1` available to jump to a boss. Desktop browser at 1280×720 or larger, music on.

## Look and Feel
From `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`, applied to Canvas:

- **Pixel grid:** art is authored at **8×8 px per tile**, and the board is a fixed **20×15 cells** in every level, so levels play the same on every device (changed from 24×18 after play-testing; see the checklist's Revisions). The canvas is scaled up by a **whole-number factor** (`imageSmoothingEnabled = false`, CSS `image-rendering: pixelated`) so pixels stay sharp squares. Leftover space is filled with the biome's darkest colour.
- **Layout:** in landscape, the board is centred with the HUD bar above it. In portrait (phones), the board is at the top, the HUD above it, and the **on-screen d-pad** in the lower third.
- **Palettes:** one 8–12 colour palette per biome, as listed in the PRD (Orchard greens and reds through to the King's violet and bone). It's stored in `art/palettes.ts`, and sprites reference palette slots, not hex codes, so the same sprite re-skins per biome.
- **Polish ("beautiful Minecraft"):**
  - fruit glow (a soft additive radial gradient under the sprite, pulsing)
  - particles when you eat something or land a coil
  - screen shake on hits
  - a white flash when you lose a life
  - smooth interpolation as the snake moves between cells
  - a gentle animated background tile per biome (swaying grass, drifting snow, sand, neon flicker)
- **Type:** Press Start 2P for the title, buttons and HUD, at whole-pixel sizes (8 or 16). Pixelify Sans for dialogue. Canvas drawing waits on `document.fonts.load()` so the text never flashes in the wrong font.
- **Copy tone:** short, punchy, a little cheeky ("You can't eat him. Coil around him!").
- **Avoid:** DOM-styled modern UI. All menus are drawn on the canvas in the pixel style.

## Components

### Engine

#### Game Loop (`engine/loop.ts`)
Uses `requestAnimationFrame` with a **fixed-timestep accumulator**: the simulation runs at a fixed 120 updates per second, and drawing happens once per frame with an `alpha` (0–1) value used to smooth movement between cells. The frame delta is capped at 250 ms so a hidden tab doesn't cause a "spiral of death" of catch-up updates. The loop also pauses on `visibilitychange`.
The snake's own movement runs on a separate **step timer** (cells per second), configured per mode and chapter, so speed changes don't touch the loop.
PRD ref: `prd.md > Controls`, `prd.md > Classic Mode`.

#### Scene Manager (`engine/scenes.ts`)
Holds a stack of scenes with `enter/exit/update/draw/handleInput`. Pause is pushed on top of Play, and transitions fade through black.
PRD ref: `prd.md > Screens and Layout`.

#### Renderer (`engine/renderer.ts`)
Handles the canvas setup, the whole-number scaling, the landscape/portrait layout, the camera shake offset, and helpers for drawing sprites, text and the 9-slice pixel panels used for dialogue boxes and buttons.

#### Input (`engine/input.ts`)
- Keyboard: WASD plus the arrow keys, Enter/Space to confirm, P/Esc to pause.
- Touch/pointer: the on-screen d-pad, plus taps on canvas buttons via hit-testing.
- **Direction buffer:** a queue of up to 2 turns per step, so quick double turns both register. Turns that reverse direction, or repeat the current one, are dropped.
- Menus can be navigated by keyboard (arrows + Enter) and by pointer.

PRD ref: `prd.md > Controls`.

#### Effects (`engine/fx.ts`)
Particles, screen shake, flashes, simple tweens and easing.

#### Seeded RNG (`engine/rng.ts`)
A small deterministic random number generator. Bosses and fruit spawning use it, so tests can replay exact fights.

### Audio

#### Audio Engine (`audio/audioEngine.ts`)
- One `AudioContext`, unlocked on the first user gesture.
- A master gain feeding two buses: **music** and **sfx**. The music toggle mutes the music bus, and the choice is saved to `settings.music`.
- Short crossfades when the track changes between scenes.

PRD ref: `prd.md > Home Screen`.

#### Chiptune Synth + Sequencer (`audio/synth.ts`, `audio/sequencer.ts`)
- **Four NES-style voices:**
  - pulse 1 (lead) and pulse 2 (harmony): square waves with a selectable duty cycle via `PeriodicWave`
  - triangle (bass)
  - noise (drums): a looped noise buffer through a filter
- Each note is an oscillator plus a short volume envelope.
- **Lookahead scheduler:** every 25 ms it schedules any notes due in the next 100 ms against `AudioContext.currentTime`, so the music keeps time even when the game thread hiccups. Ref: https://web.dev/articles/audio-scheduling
- Songs loop seamlessly, and a song can switch to a more intense variant (for boss phases).

#### Soundtrack (`audio/tracks/*.ts`)
Original compositions stored as compact note-pattern data: tempo, patterns per voice, and the order patterns play in. The learner wants it catchy, matched to each scene, with **every boss getting its own song**.

| Track | Where | Character |
|---|---|---|
| `theme` | Home, Ending | Subtle and hypnotic, a snake-charmer-flavoured riff (harmonic-minor scale) over soft bass. This is "the snake song". |
| `map` | Chapter Map | Light, adventurous march. |
| `orchard`, `bog`, `frost`, `desert`, `neon`, `sky` | Normal chapters (one per biome) | Each fits its biome. Upbeat but not tiring on loop. |
| `boss-grub` | Ch3 | Bouncy, cheeky, playful menace. |
| `boss-mira` | Ch6 | Driving, vengeful, built on the Grub motif in a minor key ("the family theme"). |
| `boss-viper` | Ch9 | Fast and sleek, a rival duel with call-and-response between Pip's and Viper's motifs. |
| `boss-king` (3 variants) | Ch10 | Grand and dark. Each phase adds layers and tempo. Phase 3 brings back the theme riff, triumphant. |
| Jingles | Clear, coil hit, life lost, game over, new best | 1–3 seconds each. |

Built per milestone (see **What Was Simplified and Why**). Risk: composition quality. Every track gets a listening check during the build, and any weak track is rewritten. **Fallback:** the audio engine can also play a CC0-licensed audio file in place of a synth track, so a track can be swapped without code changes elsewhere.

#### Sound Effects (`audio/sfx.ts`)
Synthesised one-shots: eat, poison, portal, hit wall, life lost, coil hit, boss telegraph, menu move/confirm, typewriter blip.

### Game Rules (pure TypeScript, no drawing)

#### Board, Snake and Movement (`game/board.ts`, `game/snake.ts`)
- The board is 20×15 cells plus per-level walls and obstacles.
- The snake is an ordered list of cells, head first. A step moves the head by the current direction. Growing means not removing the tail that step.
- The step speed comes from the mode, the chapter, and Classic's +speed every 5 fruit.

PRD ref: `prd.md > Classic Mode`, `prd.md > Story: Normal Chapters`.

#### Collisions (`game/collision.ts`)
- Walls, obstacles, the snake's own body (except the tail cell that's about to move), boss cells, Viper's body, and active hazards.
- Classic → death. Story → lose a life.

#### Fruit (`game/fruit.ts`)
- **Normal fruit:** never spawns on the snake, walls or hazards.
- **Poison fruit (Ch2):** shrinks the snake by 2 (minimum length 3) and drains the meter by 1.
- **Portal pair (Ch5):** eating one moves the head out of the twin's cell, in the same direction. The body follows the normal step logic, because the cells it moves through are a list, not a path. A twin is only placed where the 3 cells ahead in every direction are free, then the pair respawns. Implements `prd.md > Portal Fruit`.
- In boss arenas, 1–2 fruit are always present, spawning at least 5 cells from the boss.

#### Chapter Twists (`game/twists.ts`)
- Ice slide (Ch4)
- fog radius (Ch5): drawn as a dark overlay with a circle cut out around the head
- speed ramp (Ch7)
- opening and closing wall gaps (Ch8)

Each twist is a small module with hooks into the step and the draw. PRD ref: `prd.md > Story Script`.

#### Coil Detection (`game/coil.ts`)
This is the kernel, so it's specified exactly. After every snake step in a boss fight, a coil counts if **either** of these is true:
1. **Circling (the main, forgiving rule):** walk Pip's body from tail to head and add up how far it sweeps around the boss's centre (the winding angle). **300° or more** (most of a lap) is a coil, at any distance, gaps and all. This changed after play-testing: the learner found sealing every cell needed "too much precision".
2. **Sealed in (wall pins):** Pip's body plus walls trap the boss in a pocket of at most `maxPocket` cells (flood fill from the boss, 4-directional). This keeps "pin him against the wall" working.

While Pip is a third of the way round (120°+), the boss panics instead of escaping, for up to 4 extra seconds (`TRAPPED_BONUS_MAX`). A 12-dot **progress ring** around the boss lights up as you circle. Both checks run in well under 1 ms.
PRD ref: `prd.md > Story: Coil to Conquer (Boss Fights)`.

#### Lives, Score and Checkpoints (`game/lives.ts`, `game/progress.ts`)
- Fruit gives 1 point. Every 50 points gives +1 life (cap 9). A boss coil gives 5 points.
- Losing a life → flash, then respawn at the level start with length and meter/boss damage kept, paused.
- Zero lives → back to the checkpoint chapter with 3 lives.
- Beating a boss sets the checkpoint to the next chapter. Hollow King phases are mini-checkpoints.
- **Replays share the save** (learner decision): replaying a completed chapter uses and changes the real lives and score.

PRD ref: `prd.md > Story: Lives and Checkpoints (learner's design)`, `prd.md > Story: Chapter Map and Progress`.

#### Bosses (`game/bosses/*.ts`)
Each boss is a small **state machine**, a set of named modes it switches between, for example `hidden → telegraph → surfaced → burrowing`. The modes use timers in steps, so behaviour is the same at any frame rate. Shared helpers:
- `telegraph()`: warning visuals plus a minimum 0.8 s warning
- `escalate(hitsTaken)`: tunes timings as the boss takes damage
- `mercy`: after 2 lives lost in the same fight, timings ×1.1 and warnings ×1.25, stacking once more

Bosses: `grub.ts`, `miraGrub.ts`, `viper.ts` (rival AI: greedy path to the nearest fruit with collision avoidance, plus the lunge), `hollowKing.ts` (3 phases with crows, cameo hazards, a crumbling arena). All numbers come from `prd.md > Boss Design and Difficulty` and live in one tuning table, `game/bosses/tuning.ts`, for easy balancing.

#### Chapter Definitions (`game/chapters.ts`)
Data for the 10 chapters: id, act, name, biome, board layout (walls and holes as a string map), twist, meter target, base speed, music track, and boss controller (if any). The levels are data, not code.

### Scenes (`scenes/`)
| Scene | Implements |
|---|---|
| `HomeScene` | `prd.md > Home Screen`: attract-mode AI snake, overlay, title, Story/Classic buttons, music toggle |
| `ChapterMapScene` | `prd.md > Story: Chapter Map and Progress`: nodes, locks, ✓, skull/crown, checkpoint flag, "Resume" banner |
| `CutsceneScene` | `prd.md > Cutscenes`: portraits, name plate, typewriter text, advance/complete, Skip |
| `PlayScene` | Classic, chapter and boss modes, plus the HUD (hearts, score, meter or boss bar, pause, music) and the mobile d-pad |
| `PauseScene` | Resume, Restart level, Quit, music toggle, then a 3-2-1 on resume |
| `GameOverScene` | Classic score, best score, "New best!" |
| `OutOfLivesScene` | Back to checkpoint with 3 lives |
| `EndingScene` | Ending cutscene and credits |

### Story Content (`story/script.ts`, `art/portraits.ts`)
Intro and outro dialogue per chapter, as data: `{ speaker, portrait, mood, text }[]`. It's written from the beats in `prd.md > Story Script`. Portraits are 32×32 pixel sprites for Pip, the Toad, Grub, Mira, Viper, the Hollow King and a crow, each with 2 moods (neutral and angry/smug).

### Save System (`save/save.ts`)
See **Data Model**. All reads and writes go through this module.

### Debug Tools (`debug/debug.ts`)
Loaded only with `?debug=1`: a chapter/phase jump, invincibility, a coil pocket overlay, a speed slider, and an FPS counter.

## Data Model
All data lives in the browser. One JSON document is stored in `localStorage` under the key `hisstory.save`.

```ts
interface SaveData {
  version: 1;                        // for future migrations
  settings: { music: boolean };      // music toggle
  classic: { best: number };
  story: {
    completed: boolean[];            // length 10
    highestUnlocked: number;         // 1..10
    checkpoint: number;              // chapter to return to on out-of-lives
    kingPhase: 1 | 2 | 3;            // Ch10 mini-checkpoint
    lives: number;                   // 0..9
    score: number;
    nextLifeAt: number;              // next 50-point threshold
    resume: LevelSnapshot | null;    // mid-level state, if any
    finished: boolean;               // has seen the ending
  };
}

interface LevelSnapshot {            // plain data, no functions
  chapter: number;
  snake: { cells: [number, number][]; dir: 'U'|'D'|'L'|'R' };
  fruit: FruitState[];
  meter: number;
  boss: BossState | null;            // each boss's state machine is plain data
  hazards: HazardState[];
  rngSeed: number;
  mercyLevel: number;
  livesLostThisFight: number;
}
```

| Data | Where it lives | Updated when | Leave and come back |
|---|---|---|---|
| Music on/off | `settings.music` | on toggle | restored |
| Classic best | `classic.best` | at Game Over if beaten | restored |
| Unlocks, checkpoint, lives, score | `story.*` | on every fruit, life lost/gained, clear, boss defeat | restored exactly |
| Mid-level state | `story.resume` | every 3 s of play, on pause, on `visibilitychange`/`pagehide` | the map offers Resume, which opens paused with a 3-2-1; cleared on clear or quit |
| Classic run in progress | not saved | — | Classic restarts (arcade convention; the best score is kept) |

**Robustness:**
- Every read is validated, and missing fields are filled from defaults.
- If the JSON is corrupt, it's copied to `hisstory.save.corrupt` and a fresh save starts. The game never crashes on load.
- If `localStorage` is unavailable (private mode, blocked), the game runs with an in-memory save and a small "progress won't be saved" note on the map.
- Writes are wrapped in try/catch.

## File Structure
```
hisstory/
├── index.html                  # one <canvas>, viewport meta, no other UI
├── package.json                # scripts: dev, build, preview, test, e2e
├── vite.config.ts              # base './', test config
├── tsconfig.json
├── playwright.config.ts        # desktop + mobile (Pixel/iPhone) projects
├── README.md                   # pitch, live link, controls, how to run
├── .github/workflows/
│   └── deploy.yml              # test → build → deploy to GitHub Pages
├── src/
│   ├── main.ts                 # boot: fonts, save, sprite cache, loop → HomeScene
│   ├── engine/
│   │   ├── loop.ts             # fixed-timestep game loop
│   │   ├── scenes.ts           # scene stack + fades
│   │   ├── renderer.ts         # canvas, scaling, layout, sprite/text/panel draw
│   │   ├── input.ts            # keyboard, pointer, d-pad, direction buffer
│   │   ├── fx.ts               # particles, shake, flash, tweens
│   │   └── rng.ts              # seeded random
│   ├── audio/
│   │   ├── audioEngine.ts      # context, buses, unlock, crossfade
│   │   ├── synth.ts            # pulse/triangle/noise voices
│   │   ├── sequencer.ts        # lookahead scheduler, song player
│   │   ├── sfx.ts              # sound effects
│   │   └── tracks/             # one file per song (note data)
│   ├── art/
│   │   ├── palettes.ts         # per-biome palettes
│   │   ├── sprites.ts          # text-grid sprites: snake, fruit, tiles, bosses, UI
│   │   ├── portraits.ts        # 32×32 cutscene portraits
│   │   └── spriteCache.ts      # grid → offscreen canvas, per palette
│   ├── game/                   # pure rules, unit-tested
│   │   ├── board.ts
│   │   ├── snake.ts
│   │   ├── collision.ts
│   │   ├── fruit.ts            # normal, poison, portal pairs
│   │   ├── twists.ts           # ice, fog, speed ramp, wall gaps
│   │   ├── coil.ts             # coil detection (flood fill)
│   │   ├── lives.ts
│   │   ├── progress.ts         # unlocks, checkpoints, replay rules
│   │   ├── chapters.ts         # the 10 chapter definitions
│   │   ├── attractAI.ts        # home-screen demo snake
│   │   └── bosses/
│   │       ├── bossKit.ts      # telegraph, escalate, mercy
│   │       ├── tuning.ts       # all boss numbers in one place
│   │       ├── grub.ts
│   │       ├── miraGrub.ts
│   │       ├── viper.ts
│   │       └── hollowKing.ts
│   ├── scenes/
│   │   ├── HomeScene.ts
│   │   ├── ChapterMapScene.ts
│   │   ├── CutsceneScene.ts
│   │   ├── PlayScene.ts        # + HUD + d-pad
│   │   ├── PauseScene.ts
│   │   ├── GameOverScene.ts
│   │   ├── OutOfLivesScene.ts
│   │   └── EndingScene.ts
│   ├── story/
│   │   └── script.ts           # all dialogue
│   ├── save/
│   │   └── save.ts             # load/validate/migrate/write
│   └── debug/
│       └── debug.ts            # ?debug=1 tools
├── tests/
│   ├── unit/                   # Vitest: snake, input buffer, collision, fruit/portal,
│   │                           #   coil, lives/progress, save, each boss state machine
│   └── e2e/                    # Playwright: boot, menus, Classic run, save survives
│                               #   reload, mobile d-pad, debug boss jump
└── devpost/                    # planning docs (learner-profile.md is git-ignored)
```

## External Services and Dependencies
- **GitHub Pages + GitHub Actions:** free for public repos, no keys. It uses the official `actions/upload-pages-artifact` and `actions/deploy-pages` actions. Docs: https://docs.github.com/en/pages and https://vite.dev/guide/static-deploy#github-pages
- **No runtime APIs.** Fonts are bundled with the build via Fontsource, so the game works offline after loading.
- npm packages only at build time (above). There are no paid services and no rate limits.

## Important Failure Modes
- **Audio blocked until a gesture (autoplay policy)** → the Home screen shows a subtle "press any key ♪" until the first interaction, then the music fades in. The game never errors.
- **Save unavailable or corrupt** → fall back to a fresh or in-memory save as described in **Data Model**. The game always boots.
- **Slow device / frame drops** → the fixed timestep keeps the gameplay speed correct, and the particle count is reduced if frames take over 20 ms.
- **Tab hidden mid-play** → auto-pause and save. Returning shows Pause, so you never come back dead.
- **Unfair instant death** (portal exits, respawn, resume) → every placement goes through a "safe cell" check (3 free cells ahead), and every return to play pauses until input or a 3-2-1 countdown.

## What Was Simplified and Why
- **Fixed 20×15 board everywhere** instead of boards that fit each device. Levels play identically everywhere, and balancing only happens once. The fuller version would need per-aspect level layouts.
- **Code-drawn sprites and code-composed music** instead of commissioned art and audio. Everything is original, licence-free and tiny, and it serves the learning goals. The fuller version would need an artist and a composer.
- **localStorage only** instead of accounts and cloud saves. Nothing in the kernel needs a server (`prd.md > Deferred From the POC`).
- **Classic runs aren't resumable**, which matches arcade convention. Story is fully resumable.
- **Built in PRD milestones** (`prd.md > What We're Building`). Each milestone brings its own music tracks, so Milestone 1 ships the theme, map, orchard and boss-grub tracks plus jingles, and every milestone is a playable, deployable game.

Nothing in the kernel is faked: story, revenge chain and coil to conquer are all real.

## Decisions and Open Issues
**Learner decisions**
- **TS + plain Canvas 2D + Vite, no engine:** the agent's recommendation, accepted ("I trust you"), for the learning goals of Canvas, Web Audio and the game loop. The tradeoff is hand-built scene, input and tween code.
- **Music matches each scene, catchy, and every boss gets its own song.** The learner was unsure about generated music, so the agent chose original synth compositions *with a CC0 audio-file fallback per track* if any track isn't good enough.
- **Hosting: no preference** → agent chose GitHub Pages (free, same repo, auto-deploy).
- **Save everything constantly, including mid-level, and replays share the save** (lives and score carry across replays).
- **Quality bar: "no mistakes, end to end."** That means unit tests on all rules, Playwright smoke tests on desktop and mobile, a debug mode for reaching every boss, and the CI deploy blocked if tests fail.

**Agent-derived implementation details**
- A fixed-timestep loop at 120 Hz with interpolated rendering.
- Coil = winding angle ≥ 300° around the boss, or a sealed pocket at or under `maxPocket` cells.
- Seeded RNG, bosses as state machines, all tuning in one file.
- All UI drawn on the canvas (no DOM menus).

**Learning focus (one useful unknown)**
The learner didn't name a specific uncertainty, but their stated goal is Canvas, Web Audio and the game loop. During `5-build`, the slices that build `engine/loop.ts`, `engine/renderer.ts` and `audio/sequencer.ts` will each come with a short plain-language walkthrough. Evidence it worked: the learner can say why the snake moves at the same speed on any device (the fixed timestep), and why the music doesn't stutter (lookahead scheduling).

**Open / verify during the build**
- TypeScript 7 compatibility with the Vite/Vitest tooling (fallback: pin TS 5.9).
- Balance numbers (meter targets, boss timings, `maxPocket`) get tuned by play-testing. They're all in `tuning.ts` and `chapters.ts`.
- Track quality gets a listening check per track (fallback: CC0 file).
- Carried from `prd.md > Open Questions`: Milestone 1 chapter order, and the full dialogue gets written per chapter during the build.
