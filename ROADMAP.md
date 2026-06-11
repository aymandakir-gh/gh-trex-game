# 🕹️ Dino Arcade — Roadmap (the "ultraplan")

A small **web arcade**: several games behind one launcher — single-player, local multiplayer, a 3D racer, and the netcode for online play.

**Live:** https://aymandakir-gh.github.io/gh-trex-game/

Honest scoping note: **online multiplayer needs a hosted server** — a static GitHub Pages site can't run it. Phases 0–3 are live; Phase 4's server + client are written and verified locally, and just need a host to go live.

---

## Phase 0 — Foundation ✅ (done)
Single-player **Dino Runner** with themes, sound, saved high score, difficulty, coins, fullscreen zoom.

## Phase 1 — Arcade launcher + classics ✅ (done)
- **Launcher** with top-bar game switcher; shared HUD (score · best · coins), theme, sound, per-game saved bests.
- Cleaner centered previews (fixed the cramped dino preview).
- **Snake**, **2048**, **Breakout** — plain canvas, zero dependencies, theme-aware.

## Phase 2 — Local 2-player Dino battle ✅ (done)
Same-screen couch multiplayer (no server). Two dinos, **3 hearts** each, grab **bananas** for traps, drop traps to cost the other a heart, last dino standing wins.
- P1: `WASD` + `Space` drop · P2: `Arrows` + `Enter` drop

## Phase 3 — 3D kart prototype (single-player) ✅ (prototype shipped)
A drivable **Three.js** kart on an oval track with a chase camera, lap timer, best-lap saving, and one AI rival. Three.js is lazy-loaded only when you open the tab. (A prototype, not Mario-Kart-polished — see Phase 5.)

## Phase 4 — Online multiplayer (backend) 🟡 (code complete + verified locally; needs hosting)
Real over-the-internet rooms. The **Node + WebSocket relay** (`server/`) and the **Online** client (lobby + realtime peer rendering) are written and tested end-to-end locally (two browsers seeing each other in a room).
- **To go live:** deploy `server/` to Railway/Render (Node 18, `npm start`), then put the `wss://…` URL into the Online tab. See [`server/README.md`](server/README.md).
- **Next:** layer the Dino-battle (Phase 2) and kart (Phase 3) gameplay over this transport for full online play.

## Phase 5 — Polish & expansion 🔮
Leaderboards, more games, mobile/touch controls, richer 3D track + drift, online battle/kart, accessibility pass, shareable scores.

---

## Architecture
```
index.html   launcher shell: top bar + game switcher + game views
arcade.js    launcher: game registry, switching, shared HUD/theme/sound/storage
engine.js    Chrome-dino engine (BSD-3, wayou/t-rex-runner)  ·  engine.css
dino.js      Dino Runner module        games.js   Snake · 2048 · Breakout
battle.js    local 2-player battle      kart.js    3D kart (Three.js, CDN)
online.js    online client (beta)       brand.css  arcade theme + HUD + overlays
server/      Node + ws relay (deploy separately for online play)
```
Static games (Phases 0–3) run on GitHub Pages; the multiplayer server (Phase 4) is a separate service.

## Status board
| Phase | What | Status |
|---|---|---|
| 0 | Dino Runner (single) | ✅ Live |
| 1 | Launcher + Snake / 2048 / Breakout | ✅ Live |
| 2 | Local 2-player Dino battle | ✅ Live |
| 3 | 3D kart prototype (single) | ✅ Live |
| 4 | Online multiplayer (relay + client) | 🟡 Code done & tested locally — needs hosting |
| 5 | Polish & expansion | 🔮 Later |
