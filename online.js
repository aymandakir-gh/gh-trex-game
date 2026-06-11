/* ============================================================
   Dino Arcade — Phase 4 client: Online rooms (beta)
   Connects to the WebSocket relay (see server/). Players join a
   room and see each other move in real time. This is the netcode
   foundation; full battle/kart-online build on this protocol.
   ============================================================ */
(function () {
  'use strict';
  var ARC = window.ARC, view = 'view-online';
  var W = 660, H = 430, cv, ctx, raf, ws, myId = null, me, peers = {}, sendT = 0, last, keyH, keyU, held = {};

  function role(r) { return document.querySelector('#' + view + ' [data-role="' + r + '"]'); }
  function palette() { var s = getComputedStyle(document.body); function v(n, d) { return (s.getPropertyValue(n) || d).trim(); } return { bg: v('--card', '#fff'), text: v('--text', '#1f2227'), muted: v('--muted', '#8a8f98'), line: v('--line', '#e4e5e9') }; }
  function status(t) { var s = role('status'); if (s) s.textContent = t; }
  var COLORS = ['#ff6a1a', '#2f86eb', '#18a957', '#e0457b', '#9b59b6', '#f5b301'];

  function connect() {
    var url = role('url').value.trim(); var room = (role('room').value.trim() || 'lobby'); var name = (role('name').value.trim() || 'guest');
    if (!url) { status('Enter the server URL (ws://localhost:8787 for local, or wss://… once deployed).'); return; }
    ARC.set('arc_mp_url', url); ARC.set('arc_mp_name', name);
    try { ws = new WebSocket(url); } catch (e) { status('Bad URL.'); return; }
    status('Connecting…');
    ws.onopen = function () { status('Connected. Room: ' + room); ws.send(JSON.stringify({ t: 'join', room: room, name: name })); role('lobby').classList.add('hidden'); me = { x: W / 2 + (Math.random() * 80 - 40), y: H / 2, c: COLORS[(Math.random() * COLORS.length) | 0], name: name }; };
    ws.onmessage = function (ev) {
      var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'welcome') { myId = m.id; }
      else if (m.t === 'peer') { peers[m.id] = { x: m.x, y: m.y, c: m.c || '#888', name: m.name, last: performance.now() }; }
      else if (m.t === 'left') { delete peers[m.id]; }
      else if (m.t === 'roster') { status('Room ' + (role('room').value || '') + ' · ' + m.players.length + ' player(s)'); }
    };
    ws.onclose = function () { status('Disconnected.'); role('lobby').classList.remove('hidden'); ws = null; };
    ws.onerror = function () { status('Connection error — is the server running / URL correct?'); };
  }

  function step(dt) {
    if (!me) return;
    var sp = 200 * dt, dx = 0, dy = 0;
    if (held['arrowup'] || held['w']) dy -= 1; if (held['arrowdown'] || held['s']) dy += 1;
    if (held['arrowleft'] || held['a']) dx -= 1; if (held['arrowright'] || held['d']) dx += 1;
    var len = Math.hypot(dx, dy) || 1; me.x += dx / len * sp; me.y += dy / len * sp;
    me.x = Math.max(14, Math.min(W - 14, me.x)); me.y = Math.max(14, Math.min(H - 14, me.y));
    sendT -= dt;
    if (sendT <= 0 && ws && ws.readyState === 1) { sendT = 0.08; ws.send(JSON.stringify({ t: 'state', x: Math.round(me.x), y: Math.round(me.y), c: me.c })); }
    // expire stale peers
    var now = performance.now(); for (var id in peers) { if (now - peers[id].last > 5000) delete peers[id]; }
  }
  function dot(x, y, color, name, mine) {
    ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fillStyle = color; ctx.fill();
    if (mine) { ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); }
    ctx.fillStyle = palette().text; ctx.font = '700 12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(name || '', x, y - 20);
  }
  function draw() {
    var p = palette(); ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = p.line; ctx.lineWidth = 2; ctx.strokeRect(6, 6, W - 12, H - 12);
    for (var id in peers) dot(peers[id].x, peers[id].y, peers[id].c, peers[id].name, false);
    if (me) dot(me.x, me.y, me.c, me.name + ' (you)', true);
    ctx.fillStyle = p.muted; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText((Object.keys(peers).length + (me ? 1 : 0)) + ' online · arrow keys to move', 16, 14);
  }
  function loop(t) { raf = requestAnimationFrame(loop); if (!last) last = t; var dt = Math.min((t - last) / 1000, 0.05); last = t; step(dt); draw(); }

  function onShow() {
    cv = document.getElementById('online-canvas'); ctx = cv.getContext('2d'); cv.width = W; cv.height = H;
    peers = {}; me = null; myId = null;
    role('url').value = ARC.get('arc_mp_url', ''); role('name').value = ARC.get('arc_mp_name', '');
    role('lobby').classList.remove('hidden'); status('');
    keyH = function (e) { var k = (e.key || '').toLowerCase(); if (k.indexOf('arrow') === 0) e.preventDefault(); held[k] = true; };
    keyU = function (e) { held[(e.key || '').toLowerCase()] = false; };
    window.addEventListener('keydown', keyH); window.addEventListener('keyup', keyU);
    last = 0; raf = requestAnimationFrame(loop);
  }
  function onHide() { cancelAnimationFrame(raf); if (ws) { try { ws.close(); } catch (e) {} ws = null; } if (keyH) window.removeEventListener('keydown', keyH); if (keyU) window.removeEventListener('keyup', keyU); held = {}; }

  document.addEventListener('DOMContentLoaded', function () { var c = role('connect'); if (c) c.addEventListener('click', connect); });
  ARC.register({ id: 'online', label: 'Online', view: view, onShow: onShow, onHide: onHide });

  // debug hook for automated tests
  window.__ONLINE = { connected: function () { return !!(ws && ws.readyState === 1); }, peerCount: function () { return Object.keys(peers).length; } };
})();
