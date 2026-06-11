/* ============================================================
   Dino Arcade — online multiplayer relay (Phase 4)
   A tiny authoritative-lite WebSocket server: clients join a
   room by code, and the server relays each player's state to the
   others in that room. Stateless beyond room membership.

   Run:   npm install && npm start      (PORT env or 8787)
   Health: GET / returns "ok"
   ============================================================ */
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8787;
const server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); });
const wss = new WebSocketServer({ server });

const rooms = new Map(); // code -> Set<ws>
let nextId = 1;

function broadcast(code, obj, except) {
  const s = JSON.stringify(obj);
  const set = rooms.get(code); if (!set) return;
  set.forEach((c) => { if (c !== except && c.readyState === 1) { try { c.send(s); } catch (e) {} } });
}
function roster(code) {
  const set = rooms.get(code) || new Set();
  return [...set].map((c) => ({ id: c.id, name: c.name }));
}

wss.on('connection', (ws) => {
  ws.id = 'p' + (nextId++);
  ws.room = null;
  ws.name = ws.id;

  ws.on('message', (buf) => {
    let m; try { m = JSON.parse(buf.toString()); } catch (e) { return; }
    if (m.t === 'join') {
      ws.room = (m.room || 'lobby').slice(0, 24);
      ws.name = (m.name || ws.id).slice(0, 16);
      if (!rooms.has(ws.room)) rooms.set(ws.room, new Set());
      rooms.get(ws.room).add(ws);
      ws.send(JSON.stringify({ t: 'welcome', id: ws.id, room: ws.room }));
      broadcast(ws.room, { t: 'roster', players: roster(ws.room) });
    } else if (m.t === 'state' && ws.room) {
      broadcast(ws.room, { t: 'peer', id: ws.id, name: ws.name, x: m.x, y: m.y, c: m.c }, ws);
    }
  });

  ws.on('close', () => {
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room).delete(ws);
      broadcast(ws.room, { t: 'left', id: ws.id });
      broadcast(ws.room, { t: 'roster', players: roster(ws.room) });
      if (rooms.get(ws.room).size === 0) rooms.delete(ws.room);
    }
  });
});

server.listen(PORT, () => console.log('Dino Arcade MP relay listening on :' + PORT));
