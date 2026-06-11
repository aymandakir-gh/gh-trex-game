# 🦖 GH Runner

The GrowthHackers take on the Chrome offline dino game. **Strategy. Iteration. Growth.** Now jump some cacti.

A self-contained static web game — no build step, no dependencies, no binary assets. Open `index.html` and play.

## What's inside

| File | Role |
|---|---|
| `index.html` | Branded GH shell + inlined sprite/audio assets (base64) |
| `engine.js` | Game engine (forked from [wayou/t-rex-runner](https://github.com/wayou/t-rex-runner), BSD-3) |
| `engine.css` | Original engine layout |
| `brand.css` | GH brand layer — dark anthracite + GH orange, Inter, responsive |
| `boot.js` | Recolors the sprite sheet to GH orange at runtime + wires start/game-over overlays |

## How the branding works

The original Chrome sprite sheet is monochrome artwork (`#535353`) on a transparent background. On load, `boot.js` repaints every opaque pixel to GH orange (`#ff6a1a`) while preserving the alpha channel, then starts the engine. Change one constant in `boot.js` to rebrand the whole game.

## Controls

- **Space / ↑** — jump
- **↓** — duck
- **Tap** — jump (touch)

## Run locally

```bash
# any static server, or just open the file
python3 -m http.server 8080
# → http://localhost:8080
```

## Deploy

Static site — host it anywhere. For Vercel: import this repo at [vercel.com/new](https://vercel.com/new) (zero config) or run `vercel deploy` from the project root.

---

Built for the team · [gh.company](https://gh.company) · *Digital Doping For Your Business*

Game engine © The Chromium Authors / @liuwayong (BSD-3-Clause, see `LICENSE`). GH branding layer © GrowthHackers.
