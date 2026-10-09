---
doc: scope
status: approved
---

# HISSTORY

A retro pixel-art Snake game you play in the browser, with a full story mode: chapters, rivals, revenge and boss fights.

## The Unique Kernel
**Snake with a story.** HISSTORY gives Snake what Zuma Revenge gave Zuma: a narrative with a **revenge chain**. Each boss you beat sends someone after you ("that was my brother, I'll make you pay" / "I'm back, and stronger"). Bosses are defeated by **coil to conquer**: you wrap your body around them instead of eating them, so Snake's own core move becomes the boss mechanic.

## Who It's For
**The learner.** It's a game they've wanted to make for a long time: "It's just for me… I just want to get it out there." HISSTORY is the Snake game they've wanted to play and nobody has made. A secondary audience is anyone who grew up on Snake and Zuma Revenge-style story games.

## The Core Loop
Open the game → the home screen plays a subtle snake theme (it can be toggled off) → pick **Classic** (endless snake, chase a high score) or **Story**.
In Story: a cutscene sets up the chapter → play the chapter's snake level with its own twist → face the boss and coil around it → a cutscene reveals who's coming for you next → the next chapter unlocks.
Why you come back: to find out who's next in the revenge chain.

## Inspiration & Identity
- **Zuma Revenge** (PopCap): the story structure, with each new opponent tied to the last one by revenge.
- **Classic Nokia Snake**: the core feel.
- **Look:** retro pixel art, "really good Minecraft style but a bit more beautiful": a chunky grid, a limited palette per biome, glowing fruit, particles and screen shake.
- **Sound:** a subtle, looping snake chiptune on the home screen, with a music on/off toggle that's always available.
- **Story draft:** the hero is Pip, a young garden snake. The Hollow King is draining the Orchard's fruit. The rival chain is Grub the Mole → Mira (Grub's sister: "you buried my brother") → Grub returns stronger → Viper (a rival snake, the King's daughter) → the Hollow King. Ten chapters in four acts, with a twist per chapter (poison fruit, ice, fog/portals, speed, wall gaps). The full script gets fleshed out in the PRD.

## Why This Matters to the Learner
It's an idea they've carried for a long time and want to see exist. They also want to learn **Canvas, Web Audio and game loops** along the way.

## What "Working" Looks Like
Someone opens a link in the browser. They hear the theme on the home screen and toggle it off and back on. They play a round of Classic. Then they start Story, watch a cutscene, play a chapter, and **beat Grub by coiling around him**, and a cutscene reveals that Mira is coming for revenge. That moment is the "oh, that's cool" beat: Snake suddenly has a plot.
The full finish line is all 10 chapters playable through the final Hollow King fight, with progress saved.

## The POC Boundary
The learner chose **not to cut**. The whole game is in scope. It's built in **milestones**, so there's always a complete, submittable version:
1. **Milestone 1 (the submittable floor):** home screen + music toggle, Classic mode, and Story Chapter 1 → Grub boss (coil to conquer) with cutscenes. Later chapters show as locked on a chapter map.
2. **Milestone 2:** Act 1 complete (chapters 1–3), saved progress.
3. **Milestone 3+:** the remaining acts in story order: Act 2 (Mira + Grub returns) → Viper → the Hollow King finale.

## Later
- A possible third "campaign" mode. The learner floated it ("maybe campaign, I don't know"), and it isn't defined yet.

## Explicitly Cut
- **Native or desktop app.** The browser gives judges a live link to click and makes the demo video easy to record.
