# 🕹️ Dino Arcade — Roadmap (the "ultraplan")

This repo started as a single Chrome-dino clone and is growing into a small **web arcade**: several games behind one launcher, with single-player now and (eventually) multiplayer and a 3D racer.

**Live:** https://aymandakir-gh.github.io/gh-trex-game/

This document is the plan of record. Each phase ships on its own and the site stays playable the whole way. Honest scoping note up front: **online multiplayer and a polished 3D kart are large efforts** — they're real phases here, not quick add-ons, because a static GitHub Pages site can't host the realtime server online play requires.

---

## Phase 0 — Foundation ✅ (done)
Single-player **Dino Runner**, deployed and auto-publishing via GitHub Actions → Pages.
- Light/dark themes + auto night mode
- Procedural sound + mute
- Saved high score + "new best" celebration
- Difficulty (Easy/Normal/Hard)
- Coins layer drawn on the game canvas
- Fullscreen "zoom-in" on start

## Phase 1 — Arcade launcher + classics 🚧 (in progress)
Turn the single game into a **multi-game arcade**.
- **Launcher**: game-switch buttons in the top bar; each game mounts into a shared stage.
- **Shared services**: one HUD (score · best · coins), theme toggle, sound, and **per-game** saved high scores.
- **Better preview**: each game's start screen shows the game clearly, centered, with breathing room (fixes the cramped dino preview), keeping the fullscreen grow.
- **New games** (plain canvas, zero dependencies): **Snake**, **2048**, **Breakout**.
- *Deliverable:* pick a game → see a clean preview → press space → it grows to fullscreen and plays. All games share theme/sound/score UI.

## Phase 2 — Local 2-player Dino battle 🔜
Same-screen couch multiplayer (no server).
- Two dinos on one keyboard (e.g. `W` vs `↑`), **3 hearts** each.
- Collectibles (**bananas** etc.) — first to grab scores.
- **Traps**: pick up + drop behind you to cost the other a heart.
- Last dino standing wins; rounds + score.
- *Why local first:* proves the gameplay (hearts/items/traps) with zero infrastructure, and becomes the blueprint for online play in Phase 4.

## Phase 3 — 3D kart prototype (single-player) 🔜
A simple **Three.js** kart racer — explicitly a prototype, not Mario-Kart-polished.
- One track, drivable kart with acceleration/steer/drift feel.
- Lap timer + a few simple AI racers.
- Item boxes (boost / banana) reusing Phase 2 item ideas.
- *Scope honesty:* getting a genuinely fun, polished 3D racer is the biggest single chunk here.

## Phase 4 — Online multiplayer (backend) 🔜
Real over-the-internet play. **Needs infrastructure the static site can't provide.**
- A small **Node + WebSocket** server (authoritative game state) in a separate service, hosted on **Railway** (or similar).
- Rooms / shareable invite links / lightweight matchmaking; lobby UI on the client.
- Wire up **Dino battle online** first (built on Phase 2), then **kart online** (built on Phase 3).
- *Scope honesty:* netcode (lag handling, reconciliation) is non-trivial; expect this to be the longest phase.

## Phase 5 — Polish & expansion 🔮
Leaderboards, more games, mobile controls, settings, accessibility pass, shareable scores.

---

## Architecture (target)
```
index.html        launcher shell: top bar + game switcher + shared stage
arcade.js         launcher: game registry, switching, shared HUD/theme/sound/storage
games/
  dino.js         Dino Runner (wraps the Chrome-dino engine)
  snake.js        Snake
  g2048.js        2048
  breakout.js     Breakout
  ...             (battle, kart added in later phases)
engine.js         Chrome-dino engine (BSD-3, wayou/t-rex-runner)
engine.css        engine layout
brand.css         arcade theme + HUD + overlays
```
Static games (Phases 1–3) live here on GitHub Pages. The multiplayer server (Phase 4) is a separate service.

## Status board
| Phase | What | Status |
|---|---|---|
| 0 | Dino Runner (single) | ✅ Done |
| 1 | Launcher + Snake / 2048 / Breakout | 🚧 In progress |
| 2 | Local 2-player Dino battle | 🔜 Planned |
| 3 | 3D kart prototype (single) | 🔜 Planned |
| 4 | Online multiplayer (backend) | 🔜 Planned |
| 5 | Polish & expansion | 🔮 Later |
