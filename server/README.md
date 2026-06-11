# Dino Arcade — multiplayer relay

Realtime WebSocket relay for the arcade's online rooms. The static game (GitHub Pages) **cannot** host this — it needs to run as its own always-on service.

## Run locally
```bash
cd server
npm install
npm start          # ws://localhost:8787
```
Then open the arcade, go to the **Online** tab, set the server URL to `ws://localhost:8787`, pick a room code, and connect from two browsers.

## Deploy (Railway / Render / Fly)
1. Create a new service from this `server/` folder (Node 18+).
2. Start command: `npm start` (it reads `PORT` from the environment).
3. You'll get a public URL like `your-app.up.railway.app` — use **`wss://your-app.up.railway.app`** as the server URL in the Online tab.

> The deployed game is served over HTTPS, so the multiplayer URL **must be `wss://`** (not `ws://`).

## Protocol
- Client → `{t:'join', room, name}` then `{t:'state', x, y, c}` (~12/s)
- Server → `{t:'welcome', id, room}`, `{t:'roster', players}`, `{t:'peer', id, name, x, y, c}`, `{t:'left', id}`
