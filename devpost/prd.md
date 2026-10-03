---
doc: prd
status: approved
---

# HISSTORY — Product Requirements

A retro pixel-art Snake game you play in the browser. It has a Classic mode and a 10-chapter Story mode with a Zuma Revenge-style revenge chain and "coil to conquer" boss fights. It's built first for the learner: "it's just for me."
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

> **How to read this:** items marked **(recommended)** were delegated by the learner ("figure it out") and filled in by the agent from research. Everything else is the learner's own decision. See **Product Decisions**.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. The player opens the link. The **Home screen** loads: the HISSTORY title, a self-playing snake demo moving behind a semi-transparent black overlay, a subtle looping snake theme, and a music toggle.
2. The player picks **Classic** or **Story**.
3. **Classic:** endless snake. Eat fruit, grow and speed up. Hitting a wall or your own body ends the run. A Game Over screen shows the score and the best score, with Retry or Home.
4. **Story:** the **Chapter Map** opens. Only unlocked chapters can be played. Picking one plays its **intro cutscene**.
5. In a normal chapter, the player fills the chapter's **fruit meter**. The chapter's twist (poison fruit, ice and so on) makes this harder. When the meter is full, the chapter is cleared.
6. In a boss chapter, the boss appears in the arena. The player grows by eating fruit, then **coils around the boss** to damage it. When the boss's health hits zero, it's defeated.
7. An **outro cutscene** plays. After a boss, it reveals who's coming for revenge next. The next chapter unlocks, and beating a boss sets a **checkpoint**.
8. Losing a life: the snake flashes and play continues in the same level, with progress in that level kept. Losing all lives sends the player back to the last checkpoint with 3 lives.
9. Beating Chapter 10 (the Hollow King) plays the ending: the Orchard blooms again.

## Screens and Layout

- **Home:** the HISSTORY title at the top centre. Buttons below it: **Story** and **Classic**. A speaker icon for music in a corner. The background is a self-playing snake demo (an AI snake eating fruit on a biome-styled board) under a semi-transparent black overlay.
- **Chapter Map:** 10 chapter nodes on a path, grouped into 4 acts and styled by biome. Each node is locked (padlock, dimmed), unlocked, or completed (✓). Boss nodes are marked with a skull, and the final node with a crown. A checkpoint flag marks the current checkpoint. There's a back button to Home.
- **Cutscene:** the dialogue screen. A pixel portrait of the speaker sits on the left or right, with a name plate, and a dialogue box along the bottom whose text types out letter by letter. There's a **Skip** button in the corner. **(recommended)**
- **Gameplay (Classic, chapters, bosses):** the playfield takes up most of the screen. The HUD across the top shows lives (hearts), score, and either the fruit meter (chapters) or the boss health bar (bosses). There's a pause button and the music toggle. **On mobile**, an on-screen arrow pad sits below the playfield.
- **Pause:** Resume, Restart level, Quit to Map/Home, and the music toggle. **(recommended)**
- **Game Over (Classic):** the score, the best score (with a "New best!" callout when it's beaten), Retry and Home.
- **Out of Lives (Story):** "Out of lives", then "Back to checkpoint: Chapter N" with 3 lives. Continue goes there.
- **Ending:** the final cutscene, credits, and a return to Home.

## Look and Feel
Source: `scope.md > Inspiration & Identity`.

- **Style:** chunky pixel grid, "really good Minecraft style but a bit more beautiful." Polish comes from **glow on fruit, particles when you eat, screen shake on hits and boss damage**, and a short white flash when a life is lost.
- **Palette:** a limited palette per biome **(recommended, PICO-8-style restraint)**:
  - Orchard: leaf greens and warm apple reds
  - Mushroom Bog: murky purples and toxic lime
  - Frost Fields: icy blues and white
  - Desert Ruins: sand ambers and terracotta
  - Neon Caves: black with magenta and cyan
  - Sky Temple: gold and pale sky blue
  - Hollow King's realm: near-black with violet and bone white
- **Pip (the hero):** bright green with a yellow belly. Rivals each get their own signature colour.
- **Fonts (recommended):** a chunky arcade pixel font (Press Start 2P–style) for the title, buttons and HUD, and a more readable pixel font for dialogue text, since long lines in an all-caps 8-bit font are tiring to read.
- **Sound:** a subtle, looping snake chiptune on Home and the map. Short retro sound effects for eating, hits, losing a life and boss damage **(recommended)**.
- **Avoid:** generic flat web-app UI. Rounded modern cards, gradients and stock icons break the retro feel.

## Features and Behavior

### Home Screen
Source: `scope.md > The Core Loop`.
- [ ] Loading the game shows the title, the Story and Classic buttons, and the self-playing demo behind a dark translucent overlay.
- [ ] The theme loops quietly. Browsers block sound until the player interacts, so music starts on the first click, tap or key press. **(recommended)**
- [ ] The music toggle mutes or unmutes immediately, its icon shows the current state, and the choice is remembered on the next visit.

### Controls
- [ ] **Desktop:** WASD steers. Arrow keys work too **(recommended)**. P or Esc pauses **(recommended)**.
- [ ] **Mobile:** an on-screen arrow pad (up/down/left/right) steers. The learner chose buttons over swiping. Cutscenes advance with a tap.
- [ ] Pressing the direction directly opposite the current one is ignored, so you can't reverse into your own neck.
- [ ] Two quick presses within one move both register in order, so tight turns don't get lost. **(recommended)**
- [ ] Switching tabs or minimising automatically pauses the game. **(recommended)**

### Classic Mode
- [ ] The snake starts small in the centre. One fruit is on the board at a time and never spawns on the snake.
- [ ] Eating a fruit grows the snake by one segment and adds 1 point.
- [ ] Hitting a wall or your own body ends the run, Nokia-style. **(recommended)** One life, no extra lives.
- [ ] Speed increases a little every 5 fruit, up to a maximum. **(recommended)**
- [ ] The best score is saved, and Game Over shows "New best!" when it's beaten.

### Story: Chapter Map and Progress
- [ ] On first play, only Chapter 1 is unlocked. Everything else shows a padlock.
- [ ] Clearing a chapter unlocks the next one and marks the current one ✓.
- [ ] Completed chapters can be replayed **on the same save**. Replays use and affect the current lives and score: dying in an old chapter costs a real life, losing the last one sends you to the checkpoint, and points earned count toward extra lives. (Learner decision in `4-spec`.)
- [ ] Progress is saved constantly. Leaving mid-level and coming back resumes that level paused, exactly where it was. (Learner: "save game states like mad.")
- [ ] Unlocked chapters, the current checkpoint, the lives count and the score are saved, so closing and reopening the game brings the player back to the map in the same state.

### Story: Lives and Checkpoints (learner's design)
- [ ] A Story run starts with **3 lives**, shown as hearts.
- [ ] Every **50 points** gives an extra life. Lives are capped at 9 so the HUD stays readable. **(recommended)**
- [ ] Losing a life: the snake flashes for about 2 seconds and the player **continues in the same level with their progress (fruit meter or boss damage) kept**.
  - *Respawn detail* **(recommended, please confirm)**: if the snake stayed exactly where it crashed, it would just crash again. So it reappears at the level's start position with its length and progress kept, paused until the player presses a direction.
- [ ] Losing the last life → the Out of Lives screen → back to the **last checkpoint** with 3 lives. Before any boss has been beaten, the checkpoint is Chapter 1.
- [ ] **Beating a boss sets the checkpoint** to the chapter after that boss, so a player never has to re-fight a beaten boss. This is the learner's anti-rage-quit rule.

### Story: Normal Chapters
- [ ] Each chapter has a **fruit meter** **(recommended, modelled on Zuma Revenge's "Zuma" meter)**. Each fruit fills one notch. When the meter is full, a "Chapter Clear!" burst plays, followed by the outro cutscene.
- [ ] Meter targets rise gently through the game, from about 10 fruit in Ch1 to about 20 by Ch8. **(recommended)**
- [ ] No timer: the snake's growing length is the pressure. **(recommended)**
- [ ] Walls and your own body cost a life, as in Classic.
- [ ] Each chapter's twist (see **Story Script**) is visible and explained by a one-line tip on the first try.

### Story: Coil to Conquer (Boss Fights)
Source: `scope.md > The Unique Kernel`.
- [ ] Bosses **cannot be eaten**. Touching a boss costs a life.
- [ ] Fruit keeps spawning in boss arenas so the player can grow long enough to coil.
- [ ] A **coil** happens when the boss is completely sealed in, so it has no open path out. The seal can be made from the snake's body alone, or from the body **plus the arena walls**. Pinning a boss against a wall counts, which keeps coiling learnable. **(recommended definition)**
- [ ] A successful coil: the boss flashes, screen shake, a hit sound, and the boss health bar drops one notch. The boss then breaks free (the snake isn't harmed) and changes position.
- [ ] Bosses have several health notches: Grub 3, Mira 3 + Grub 3, Viper 4, Hollow King 3 per phase × 3 phases. **(recommended)** Full behaviours are in **Boss Design and Difficulty**.
- [ ] A boss at zero health plays a defeat animation, then the outro cutscene with the revenge reveal.
- [ ] A hint on the first boss attempt: "You can't eat him. Coil around him!"

### Portal Fruit
Inspired by the portal mode in Google's Snake game, which the learner played and wanted ("when you eat one fruit, you somehow teleport out of the other fruit"). It's the main twist of **Ch5 Desert Ruins**.
- [ ] Fruit appears as a **matching pair**, the same colour with a swirling ring, so the pair is obviously linked.
- [ ] Eating one fruit teleports the snake's head out of the twin's position, still moving in the same direction. The body follows through the portal segment by segment.
- [ ] The snake grows by one and the fruit meter fills one notch, as with normal fruit.
- [ ] **Both fruit then vanish and a new pair appears** in fresh positions.
- [ ] A twin never spawns where the snake would come out facing a wall or its own body within 3 tiles **(recommended)**, so a portal never kills you instantly.

### Boss Design and Difficulty
The learner's brief: bosses should be hard enough to respect but never so hard that people rage quit. The target feeling is *"I can probably beat this if I just lock him in."* **(All recommended. The learner delegated this.)**

**Rules every boss follows**
- [ ] **Everything is telegraphed.** Every attack or reposition is announced at least 0.8 seconds ahead: shaking dirt, a flashing row, a shadow on the ground. A player never loses a life to something they couldn't see coming.
- [ ] **Learnable patterns with a little randomness.** Each boss has a small set of moves in a recognisable rhythm. Positions vary, so the fight doesn't become pure memorisation.
- [ ] **Escalation inside the fight.** After each successful coil the boss gets slightly faster or adds one move, so the last notch feels like a climax.
- [ ] **Each boss teaches one new skill, and the finale combines them.** Grub teaches *timing*, Mira + Grub teach *splitting attention*, Viper teaches *cutting off a moving target*, and the King tests all three.
- [ ] **Coil reward:** the boss breaks free and repositions after each coil, so hits can't be chained cheaply. A coil is always a clear, satisfying beat: flash, shake, sound, health drops.
- [ ] **Enough fruit to fight:** 1–2 fruit are always on the board, spawning away from the boss. The snake enters each boss fight long enough to coil after a few fruit.
- [ ] **Hidden mercy (anti-rage-quit):** after losing 2 lives in the same boss fight, the boss quietly slows about 10% and its warnings last longer. This can stack once more. The player is never told.
- [ ] **Target fight length:** about 1.5–3 minutes per boss, about 5 minutes for the Hollow King.

**Grub the Mole: Ch3, 3 health ("timing")**
- [ ] The arena has 6 visible holes. Dirt shakes at a hole for 1 second, then Grub pops up there.
- [ ] He stays up about 4 seconds (3.5 s after 1 hit, 3 s after 2 hits), then burrows. A coil that seals before he burrows lands a hit.
- [ ] After his first hit, burrowing leaves a dirt mound for 5 seconds, which acts as a temporary wall.
- [ ] Touching Grub costs a life.

**Mira + Grub returns: Ch6, Mira 3 + Grub 3 ("split attention")**
- [ ] **Mira** walks the surface, moving 1 tile for every 2 of the snake's moves, and heads toward fruit to deny it. She leaves a crumbling tunnel trail that becomes a hazard for 3 seconds.
- [ ] **Grub** pops from holes as in Ch3 but shorter, about 3 seconds up: "I'm back, and stronger!"
- [ ] When the snake coils Mira, Grub surfaces near the snake in revenge (telegraphed). When one is defeated, the other gets slightly faster but is now alone.
- [ ] Both health bars must reach zero.

**Viper: Ch9, 4 health ("cut off a moving target")**
- [ ] Viper is a rival AI snake that races Pip for fruit. Each fruit she eats grows her by one, and her body is a wall to Pip.
- [ ] **A coil traps her head** in a sealed loop (body plus walls count). She's stunned, loses one health and shrinks by 3 segments.
- [ ] **Cutting her off:** if Viper's head hits Pip's body, she's stunned for 2 seconds. That's the opening to coil her.
- [ ] Every ~10 seconds she does a **lunge**: her path flashes for 1 second, then she dashes 3 tiles straight. After 2 hits, she lunges every ~7 seconds.

**The Hollow King: Ch10, 3 phases × 3 health ("everything you've learned")**
- [ ] The King is large (2×2 tiles), so coiling him needs a longer snake. Fruit is plentiful in this fight.
- [ ] **Phase 1, Crows:** the King drifts slowly. Crows swoop across whole rows or columns, and each lane flashes red for 1 second first.
- [ ] **Phase 2, Old foes:** Grub and Mira return as burrowing hazards (they don't need to be beaten). The King teleports between 4 spots every ~8 seconds, with his shadow appearing first.
- [ ] **Phase 3, The Hollowing:** the arena's outer ring crumbles inward every ~20 seconds (down to a minimum size), the King moves faster, and the crows return at a lower rate.
- [ ] A short dialogue line plays between phases. **Each phase is a mini-checkpoint:** running out of lives restarts at the current phase with 3 lives, not phase 1. The longest fight should be the least punishing to retry.

**Difficulty curve for normal chapters**
- [ ] Meter targets: Ch1 10 → Ch2 12 → Ch4 14 → Ch5 16 → Ch7 18 → Ch8 20.
- [ ] Starting speed rises a notch per act. Ch7's twist adds speed within the level on top of that.

### Cutscenes
- [ ] An intro cutscene plays before every chapter and an outro after every clear. **(recommended)**
- [ ] Text types out letter by letter. The first click, tap or Space finishes the line instantly, and the next press advances. **(recommended)**
- [ ] **Skip** jumps straight to gameplay (or the map). Replayed chapters still show Skip.

### Story Script (outline; full dialogue gets written during the build)
Source: `scope.md > Inspiration & Identity`. Hero: **Pip**, a young garden snake. Villain: the **Hollow King**, who is draining the Orchard's fruit. **(Chapter goals and boss behaviours recommended.)**

| # | Act | Chapter | Twist / goal | Story beat |
|---|---|---|---|---|
| 1 | I | The Orchard | Tutorial: meter of 10 | The King's crows steal the Orchard's fruit. Pip sets out. |
| 2 | I | Mushroom Bog | Poison fruit (purple) shrinks you and drains the meter | A dying toad warns Pip about the King's diggers. |
| 3 | I | **BOSS: Grub the Mole** | Pops out of random holes for a few seconds, then burrows. Coil him while he's up. | Grub, defeated: "The King will hear of this…" |
| 4 | II | Frost Fields | Ice patches: you slide one extra tile before a turn takes effect | **Mira the Mole:** "You buried my brother. I'll bury you." |
| 5 | II | Desert Ruins | **Twin portal fruit**: eat one and you burst out of its twin (see **Portal Fruit**); sandstorm fog limits vision | Mira's tunnels are seen in the sand. |
| 6 | II | **BOSS: Mira + Grub returns** | Mira moves on the surface; Grub burrows. Two health bars, both must fall. | Grub: "I'm back, and stronger!" Then Viper watches from the shadows. |
| 7 | III | Neon Caves | Speed rises steadily through the level | Viper taunts Pip over the echo. |
| 8 | III | Sky Temple | Gaps in the walls open and close | **Viper** appears: a rival snake. |
| 9 | III | **BOSS: Viper** | A rival AI snake races you for fruit. If it eats, it grows; coil it to wound it. Touching its body costs a life. | Viper reveals she is the **King's daughter**. "My father will finish you." |
| 10 | IV | **FINAL: The Hollow King** | 3 phases: (1) the King summons crow hazards, (2) Grub and Mira cameo as burrowing hazards, (3) the arena shrinks. Coil the King in each phase. | The King falls. The Orchard blooms again. Ending. |

## States and Boundaries
- **First visit:** music is off until the first interaction. Story has only Ch1 unlocked. Classic's best score is 0.
- **Returning visit:** the music setting, best score and Story progress (unlocked chapters, checkpoint, lives, score) are restored.
- **Paused:** the game freezes, and resuming does not cause an instant death (a short "3-2-1" before play resumes **(recommended)**).
- **Life lost:** flash and respawn, as above.
- **Out of lives (Story):** back to the checkpoint with 3 lives. Unlocked chapters stay unlocked.
- **Game over (Classic):** score, best score, Retry/Home.
- **Snake fills the board (Classic, rare):** it counts as a win with a "Perfect!" screen. **(recommended)**
- **Screen resize or phone rotation:** the playfield rescales to fit and the game pauses. **(recommended)**
- **Nothing saved / storage cleared:** the game behaves like a first visit.

## Product Decisions
**Learner's decisions**
- **Kernel = the story and the revenge chain, with coil to conquer as the boss mechanic.** Keep both: "I don't understand why we have to choose."
- **No cut.** The full 10-chapter game is in scope, built in milestones (from `scope.md > The POC Boundary`).
- **The Home background is a gameplay demo under a translucent black overlay.** "Something fun that is somewhat related to the game."
- **WASD controls, and on-screen buttons on mobile, not swipe.** "I don't think I'll be a major fan of swiping."
- **3 lives, +1 life every 50 points.**
- **Losing a life resumes in the same level.** The player flashes and carries on from where they stopped.
- **Boss = checkpoint, restarting with 3 lives.** This is there to prevent rage quitting.
- **Portal fruit (from Google Snake's portal mode).** Added after the learner played it: "if we can add that somewhere, that would be nice." It lives in Ch5 (agent's placement).

**Delegated to the agent ("figure it out"), based on research. The learner can overrule any of these:**
- **Chapter goal = a fruit meter, no timer.** It's modelled on Zuma Revenge, where reaching a point goal ends the level, and a full meter reads clearly in a video. A timer would fight the snake's own pressure from its growing length. ([Zuma's Revenge, Wikipedia](https://en.wikipedia.org/wiki/Zuma%27s_Revenge!))
- **Classic: walls kill, speed rises.** Fixed walls are Nokia Snake's identity and are easier to read than wrap-around edges. Rising speed builds tension. ([Snake game variations](https://playsnake.co/blog/snake-game-variations/))
- **The coil definition and boss health notches.** Encircling with the body appears to be **novel**: searches found no snake game that uses it as a boss mechanic, which supports the Innovation criterion.
- **Cutscenes as portrait + typewriter dialogue + Skip.** This is the standard pixel-RPG convention. Skip protects replays and impatient players.
- **Respawn at the level start, keeping length and progress.** This avoids an instant second death after a wall crash.
- **Two fonts (arcade headline + readable dialogue font) and per-biome palettes.** ([pixel fonts overview](https://speckyboy.com/free-pixel-fonts/))

## What We're Building
The full game, in milestone order (from `scope.md > The POC Boundary`). Each milestone is complete and submittable:
1. **Milestone 1 (the submittable floor):** Home (demo background, music toggle), Controls (desktop + mobile), Classic mode with saved best score, Chapter Map, Ch1 The Orchard, and a playable Grub boss fight with coil to conquer and its cutscenes. To keep the revenge chain intact, Grub is reachable straight after Ch1 in this milestone, and Ch2 is slotted in during Milestone 2. Lives and checkpoints are included. Ch4–10 are locked.
2. **Milestone 2:** Act I complete (Ch2 Mushroom Bog added), full saved progress, Pause, Out of Lives flow.
3. **Milestone 3:** Act II (Ch4–6, the Mira + Grub double boss).
4. **Milestone 4:** Act III (Ch7–9, the Viper boss).
5. **Milestone 5:** Act IV (Ch10, the Hollow King's 3 phases) and the Ending.

## Deferred From the POC
- **Accounts, cloud saves and online leaderboards.** Progress and the best score stay in this browser only. Nothing in the kernel needs a server.
- **Sharing scores.**
- **Difficulty settings.** There's one tuned difficulty for now.

## Possible Later Enhancements
- A **"campaign" mode**, which the learner floated but hasn't defined yet.
- A **Portal toggle for Classic**, so portal fruit can be played endlessly too.
- Remapping controls and an optional swipe mode for players who like it.
- More boss phases, alternate endings, or unlockable snake skins.

## Non-Goals
- **A native or desktop app.** A browser link lets judges play instantly and makes the demo easy to record (`scope.md > Explicitly Cut`).
- **Licensed or copied music and art.** Everything is original, so there are no copyright problems.
- **Multiplayer.**

## Open Questions
- ~~Respawn position after losing a life~~: resolved. The learner approved the recommended level-start respawn, keeping length and progress.
- **Milestone 1 chapter order:** Ch1 → Grub (with Ch2 added later), or Ch1 → Ch2 → Grub straight away. This can wait until `5-build` sizing.
- **Full dialogue lines:** written during the build per chapter, starting from the beats above. They don't block `4-spec`.
