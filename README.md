# Dino Runner

A clean, light, unbranded take on the Chrome offline dino game. Open `index.html` and play.

Live: https://aymandakir-gh.github.io/gh-trex-game/

## What's inside

| File | Role |
|---|---|
| `index.html` | Minimal light shell; loads the Chrome dino sprite sheets from a CDN |
| `engine.js` | Game engine (forked from [wayou/t-rex-runner](https://github.com/wayou/t-rex-runner), BSD-3) |
| `engine.css` | Original engine layout |
| `brand.css` | Light, minimal theme + an override that neutralizes the engine's fullscreen "arcade mode" so the game stays inside its card |
| `boot.js` | Starts the engine, injects a silent audio clip, wires the start / game-over overlays |

The classic dark Chrome dino is used as-is on a light background — no recolor, no build step, no bundler.

## Controls

- **Space / ↑** — jump
- **↓** — duck
- **Tap** — jump (touch)

## Run locally

```bash
# any static server, or just open index.html directly
python3 -m http.server 8080   # → http://localhost:8080
```

## Deploy

Auto-deploys to GitHub Pages on every push to `main` (see `.github/workflows/deploy.yml`). Also works as a zero-config import on Vercel/Netlify.

---

Game engine © The Chromium Authors / @liuwayong (BSD-3-Clause, see `LICENSE`).
