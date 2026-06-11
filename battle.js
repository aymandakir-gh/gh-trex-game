/* ============================================================
   Dino Arcade — Phase 2: local 2-player Dino Battle
   Two players, one keyboard. 3 hearts each. Grab bananas to
   earn traps; drop a peel to cost the other a heart. Last dino
   standing (or most bananas if time runs out) wins.
   P1: WASD move + Space drop   ·   P2: Arrows move + Enter drop
   ============================================================ */
(function () {
  'use strict';
  var ARC = window.ARC, view = 'view-battle';
  var W = 660, H = 430, cv, ctx, raf, started, over, last;
  var p1, p2, bananas, peels, bananaTimer, roundTime, keyDown, keyUp, winnerTxt;

  function palette() {
    var s = getComputedStyle(document.body);
    function v(n, d) { return (s.getPropertyValue(n) || d).trim(); }
    return { bg: v('--card', '#fff'), text: v('--text', '#1f2227'), muted: v('--muted', '#8a8f98'), line: v('--line', '#e4e5e9') };
  }
  function role(r) { return document.querySelector('#' + view + ' [data-role="' + r + '"]'); }

  function mkPlayer(x, color, name, keys) {
    return { x: x, y: H / 2, r: 16, sp: 3.0, color: color, name: name, hearts: 3, score: 0, traps: 0, stun: 0, keys: keys, dropEdge: false, flash: 0 };
  }
  function reset() {
    p1 = mkPlayer(120, '#ff6a1a', 'P1', { up: 'w', down: 's', left: 'a', right: 'd', drop: ' ' });
    p2 = mkPlayer(W - 120, '#2f86eb', 'P2', { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', drop: 'enter' });
    bananas = []; peels = []; bananaTimer = 0; roundTime = 60; over = false; winnerTxt = '';
    for (var i = 0; i < 3; i++) spawnBanana();
  }
  function spawnBanana() { bananas.push({ x: 40 + Math.random() * (W - 80), y: 40 + Math.random() * (H - 80) }); }

  var held = {};
  function onKey(e, down) {
    var k = (e.key || '').toLowerCase();
    if (k === ' ' || k.indexOf('arrow') === 0) e.preventDefault();
    held[k] = down;
    if (!started && down && (k === 'enter' || k === ' ')) { begin(); return; }
  }

  function movePlayer(p, dt) {
    if (p.stun > 0) { p.stun -= dt; return; }
    var dx = 0, dy = 0;
    if (held[p.keys.up]) dy -= 1; if (held[p.keys.down]) dy += 1;
    if (held[p.keys.left]) dx -= 1; if (held[p.keys.right]) dx += 1;
    var len = Math.hypot(dx, dy) || 1;
    p.x += (dx / len) * p.sp; p.y += (dy / len) * p.sp;
    p.x = Math.max(p.r, Math.min(W - p.r, p.x)); p.y = Math.max(p.r, Math.min(H - p.r, p.y));
    // drop trap (edge-triggered)
    if (held[p.keys.drop]) { if (!p.dropEdge && p.traps > 0) { p.traps--; peels.push({ x: p.x, y: p.y + p.r, owner: p }); ARC.sfx.blip(); } p.dropEdge = true; } else p.dropEdge = false;
  }
  function collide(p) {
    // bananas
    for (var i = bananas.length - 1; i >= 0; i--) { var b = bananas[i]; if (Math.hypot(b.x - p.x, b.y - p.y) < p.r + 10) { bananas.splice(i, 1); p.score++; p.traps = Math.min(3, p.traps + 1); ARC.sfx.coin(); } }
    // peels (not your own freshly dropped)
    for (var j = peels.length - 1; j >= 0; j--) { var pe = peels[j]; if (pe.owner !== p && Math.hypot(pe.x - p.x, pe.y - p.y) < p.r + 8) { peels.splice(j, 1); p.hearts--; p.stun = 0.6; p.flash = 0.4; ARC.sfx.bad(); if (p.hearts <= 0) endGame(p === p1 ? p2 : p1); } }
  }
  function endGame(winner) { over = true; started = false; winnerTxt = winner ? winner.name + ' wins!' : 'Draw'; ARC.sfx.good(); role('title').textContent = winnerTxt; role('over').classList.remove('hidden'); }

  function tick(dt) {
    movePlayer(p1, dt); movePlayer(p2, dt); collide(p1); collide(p2);
    if (p1.flash > 0) p1.flash -= dt; if (p2.flash > 0) p2.flash -= dt;
    bananaTimer -= dt; if (bananaTimer <= 0 && bananas.length < 6) { bananaTimer = 1.6; spawnBanana(); }
    roundTime -= dt;
    if (roundTime <= 0) { endGame(p1.score === p2.score ? null : (p1.score > p2.score ? p1 : p2)); }
  }
  function drawDino(p) {
    ctx.save();
    if (p.flash > 0 && (Math.floor(p.flash * 20) % 2)) ctx.globalAlpha = 0.4;
    ctx.fillStyle = p.color;
    roundRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2, 7); ctx.fill();
    // eye
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x + p.r * 0.4, p.y - p.r * 0.3, 3.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(p.x + p.r * 0.5, p.y - p.r * 0.3, 1.6, 0, 7); ctx.fill();
    ctx.restore();
    // hearts + name above
    ctx.fillStyle = p.color; ctx.font = '700 12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(p.name + '  ' + '♥'.repeat(Math.max(0, p.hearts)), p.x, p.y - p.r - 8);
  }
  function draw() {
    var pal = palette();
    ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
    // arena border
    ctx.strokeStyle = pal.line; ctx.lineWidth = 2; ctx.strokeRect(6, 6, W - 12, H - 12);
    // bananas
    for (var i = 0; i < bananas.length; i++) { var b = bananas[i]; ctx.fillStyle = '#f5c518'; ctx.beginPath(); ctx.ellipse(b.x, b.y, 11, 6, -0.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#9a7a00'; ctx.lineWidth = 1.5; ctx.stroke(); }
    // peels
    for (var j = 0; j < peels.length; j++) { var pe = peels[j]; ctx.fillStyle = '#caa23a'; ctx.beginPath(); ctx.arc(pe.x, pe.y, 7, 0, 7); ctx.fill(); }
    drawDino(p1); drawDino(p2);
    // top bar: scores + timer + traps
    ctx.fillStyle = pal.text; ctx.font = '700 14px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = p1.color; ctx.fillText('P1  🍌' + p1.score + '  ▲' + p1.traps, 16, 14);
    ctx.fillStyle = pal.muted; ctx.textAlign = 'center'; ctx.fillText(Math.max(0, Math.ceil(roundTime)) + 's', W / 2, 14);
    ctx.fillStyle = p2.color; ctx.textAlign = 'right'; ctx.fillText('🍌' + p2.score + '  ▲' + p2.traps + '  P2', W - 16, 14);
    ARC.hud.setScore(Math.max(p1.score, p2.score));
  }
  function loop(t) { raf = requestAnimationFrame(loop); if (!last) last = t; var dt = Math.min((t - last) / 1000, 0.05); last = t; if (started && !over) tick(dt); draw(); }

  function begin() { ARC.unlockAudio(); reset(); started = true; over = false; role('start').classList.add('hidden'); role('over').classList.add('hidden'); var bd = document.querySelector('#' + view + ' .board'); if (bd) bd.classList.add('live'); }

  function fit() { cv.width = W; cv.height = H; }
  function onShow() {
    cv = document.getElementById('battle-canvas'); ctx = cv.getContext('2d'); fit();
    reset(); started = false; over = false; held = {};
    role('start').classList.remove('hidden'); role('over').classList.add('hidden');
    keyDown = function (e) { onKey(e, true); }; keyUp = function (e) { onKey(e, false); };
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
    last = 0; raf = requestAnimationFrame(loop);
  }
  function onHide() { cancelAnimationFrame(raf); if (keyDown) window.removeEventListener('keydown', keyDown); if (keyUp) window.removeEventListener('keyup', keyUp); held = {}; }

  document.addEventListener('DOMContentLoaded', function () {
    var sb = role('start-btn'); if (sb) sb.addEventListener('click', begin);
    var rb = role('replay'); if (rb) rb.addEventListener('click', begin);
  });
  ARC.register({ id: 'battle', label: 'Battle', view: view, onShow: onShow, onHide: onHide });
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
})();
