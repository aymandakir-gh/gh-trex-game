# 🕹️ Dino Arcade

A small, clean web arcade — six games behind one launcher. No build step, no bundler, no dependencies (the 3D kart lazy-loads Three.js from a CDN).

**▶ Play:** https://aymandakir-gh.github.io/gh-trex-game/

**🗺 Plan:** see [ROADMAP.md](ROADMAP.md).

## Games

| Game | Status |
|---|---|
| **Dino Runner** — jump cacti, grab coins, beat your best | ✅ Live |
| **Snake** · **2048** · **Breakout** | ✅ Live |
| **Dino Battle** — local 2-player (hearts · bananas · traps) | ✅ Live |
| **Kart 3D** — single-player Three.js racer (prototype) | ✅ Live |
| **Online** — realtime rooms (beta) | 🟡 Needs the relay server hosted ([`server/`](server/)) |

Shared across the arcade: light/dark themes (🌙 / **T**), procedural sound + mute (🔊 / **M**), and per-game saved high scores.

## Controls

- **Dino** — Space/↑ jump · ↓ duck
- **Snake / 2048** — arrow keys
- **Breakout** — ← → or mouse
- **Battle** — P1 WASD + Space · P2 Arrows + Enter
- **Kart** — W/↑ accelerate · S/↓ brake · A/D steer
- **Online** — arrow keys (set the server URL first)

## Online multiplayer

The browser can't host the realtime server, so the **relay lives in [`server/`](server/)** (Node + `ws`). To enable online play: deploy `server/` (Railway/Render, `npm start`), then paste the resulting **`wss://…`** URL into the **Online** tab. Verified end-to-end locally; see [`server/README.md`](server/README.md).

## Run locally

```bash
python3 -m http.server 8080     # game → http://localhost:8080
cd server && npm install && npm start   # relay → ws://localhost:8787 (optional, for Online)
```

## Deploy

Auto-deploys to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`. Also imports zero-config into Vercel/Netlify (static site only — the relay deploys separately).

---

Dino engine © The Chromium Authors / @liuwayong (BSD-3-Clause, see `LICENSE`). 3D via Three.js.
