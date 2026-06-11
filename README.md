# 🕹️ Dino Arcade

A small, clean web arcade — starting from a Chrome-dino clone and growing into a multi-game launcher. No build step, no bundler, no dependencies.

**▶ Play:** https://aymandakir-gh.github.io/gh-trex-game/

**🗺 Plan:** see [ROADMAP.md](ROADMAP.md) for the full phased plan (launcher + classic games → local 2-player → 3D kart → online multiplayer).

## Games

| Game | Status |
|---|---|
| **Dino Runner** — jump cacti, grab coins, beat your best | ✅ Playable |
| Snake · 2048 · Breakout | 🚧 Phase 1 (launcher) |
| 2-player Dino battle (local) | 🔜 Phase 2 |
| 3D kart racer | 🔜 Phase 3 |
| Online multiplayer | 🔜 Phase 4 |

## Dino Runner features

- Light / dark themes (🌙 button or **D**) + auto night-mode the longer you survive
- Procedural sound effects + mute (🔊 button or **M**)
- High score saved between sessions, with a "new best" celebration
- Difficulty: Easy / Normal / Hard
- Collectible coins
- Fullscreen "zoom-in" when a run starts · **Esc** to exit

## Controls

- **Space / ↑** — jump · **↓** — duck · **tap** — jump (touch)

## Run locally

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

## How it works

The classic Chrome dino sprite sheets are loaded from a CDN (jsDelivr, CORS-enabled) and the game runs on the original engine (forked from [wayou/t-rex-runner](https://github.com/wayou/t-rex-runner), BSD-3). The arcade shell (themes, HUD, sound, scores, coins, fullscreen) is layered on top in `brand.css` + `boot.js`.

## Deploy

Auto-deploys to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`. Also imports zero-config into Vercel/Netlify.

---

Engine © The Chromium Authors / @liuwayong (BSD-3-Clause, see `LICENSE`).
