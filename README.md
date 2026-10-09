# HISSTORY

A retro pixel-art Snake game for the browser with a 10-chapter story mode, rival bosses, and **coil to conquer**: you beat bosses by circling around them with your body, not by eating them.

**Play:** https://3akare.github.io/hisstory/ (deployed by GitHub Actions from `main`)

## Modes

- **Classic:** endless Snake. Walls and your own tail end the run, the snake speeds up as it grows, and your best score is saved.
- **Story:** 10 chapters across 4 acts (Orchard → Mushroom Bog → Grub → Frost Fields → Desert Ruins → Mira + Grub → Neon Caves → Sky Temple → Viper → the Hollow King). Each chapter has a twist: poison fruit, ice, twin portal fruit, sandstorm fog, a speed ramp, or opening and closing gates. There are cutscenes between chapters, 3 lives (+1 every 50 points), and a checkpoint after each boss. Progress, including mid-level, is saved in the browser.

## Controls

| | Desktop | Phone |
|---|---|---|
| Steer | WASD or arrow keys | On-screen d-pad |
| Pause | P or Esc | Pause button (top right) |
| Music on/off | M | Speaker button (top right) |
| Advance or skip dialogue | Enter / Space, Esc to skip | Tap, or the SKIP button |

## Run it locally

Requires Node.js 24+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run e2e        # browser tests, desktop and phone sizes (Playwright)
npm run build      # static site in dist/
```

No API keys or environment variables are needed. Everything runs in the browser.

**Debug shortcuts** (for testing and recording): `?debug=1&chapter=N` jumps to chapter N (1–10). `?debug=1&scene=classic` opens Classic. In debug mode, `I` toggles invincibility and `N` clears the current level.

## How it's built

TypeScript, the Canvas 2D API, the Web Audio API and Vite. There's no game engine and no server.

- `src/engine/`: fixed-timestep game loop, canvas renderer, input, scenes, effects
- `src/game/`: the rules (snake, fruit, coil detection, bosses, twists, lives, chapters). Pure TypeScript with unit tests.
- `src/scenes/`: Home, chapter map, cutscenes, play, pause, ending
- `src/audio/`: a small NES-style chiptune synth and sequencer. The music is original, written as note data in `src/audio/tracks/`.
- `src/art/`: pixel sprites and portraits written as text grids
- `src/story/`: all the dialogue
- `src/save/`: the save file in `localStorage`, validated on load

`devpost/app-map.html` is a one-page guide to the code.

## Planning documents

Built with the Devpost Learn skill pack for the *Build With AI: Basics* hackathon. The plan that drove the build is in `devpost/`:

- [`scope.md`](devpost/scope.md): the idea and the proof-of-concept boundary
- [`prd.md`](devpost/prd.md): what the game does, screen by screen
- [`spec.md`](devpost/spec.md): the technical blueprint
- [`checklist.md`](devpost/checklist.md): the build slices, play-test checkpoints and every plan revision
