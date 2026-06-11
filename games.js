/* ============================================================
   Dino Arcade — classic games: Snake, 2048, Breakout
   Each registers with ARC and renders on its own canvas.
   ============================================================ */
(function () {
  'use strict';
  var ARC = window.ARC;

  /* palette pulled from CSS vars so games follow the theme */
  function palette() {
    var s = getComputedStyle(document.body);
    function v(n, d) { return (s.getPropertyValue(n) || d).trim(); }
    return {
      bg: v('--card', '#fff'), text: v('--text', '#1f2227'),
      muted: v('--muted', '#8a8f98'), line: v('--line', '#e4e5e9'),
      accent: v('--accent', '#1f2227'), coin: v('--coin', '#f5b301'), good: v('--good', '#18a957')
    };
  }
  function role(viewId, r) { return document.querySelector('#' + viewId + ' [data-role="' + r + '"]'); }
  function fit(canvas, w, h) { canvas.width = w; canvas.height = h; }

  /* =========================================================
     SNAKE
     ========================================================= */
  (function () {
    var view = 'view-snake', N = 22, CELL = 22, W = N * CELL;
    var cv, ctx, raf, started, over, snake, dir, nextDir, food, score, acc, lastT, speed;
    var keyH;

    function reset() {
      snake = [{ x: 8, y: 11 }, { x: 7, y: 11 }, { x: 6, y: 11 }];
      dir = { x: 1, y: 0 }; nextDir = dir;
      score = 0; acc = 0; speed = 120; placeFood(); over = false;
      ARC.hud.setScore(0);
    }
    function placeFood() {
      do { food = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 }; }
      while (snake.some(function (s) { return s.x === food.x && s.y === food.y; }));
    }
    function step() {
      dir = nextDir;
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N ||
          snake.some(function (s) { return s.x === head.x && s.y === head.y; })) { return die(); }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) { score++; ARC.hud.setScore(score); ARC.sfx.coin(); placeFood(); speed = Math.max(60, 120 - score * 2); }
      else snake.pop();
    }
    function die() {
      over = true; started = false; ARC.sfx.bad();
      var isBest = ARC.recordBest('snake', score);
      role(view, 'final').textContent = ARC.pad(score);
      role(view, 'title').textContent = isBest ? 'New best! 🎉' : 'Game over';
      role(view, 'over').classList.remove('hidden');
    }
    function draw() {
      var p = palette();
      ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, W);
      // grid dots
      ctx.fillStyle = p.line;
      for (var gx = 0; gx < N; gx++) for (var gy = 0; gy < N; gy++) ctx.fillRect(gx * CELL + CELL / 2 - 1, gy * CELL + CELL / 2 - 1, 2, 2);
      // food
      ctx.fillStyle = p.coin; roundRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6, 5); ctx.fill();
      // snake
      for (var i = 0; i < snake.length; i++) {
        ctx.fillStyle = i === 0 ? p.accent : p.text;
        roundRect(snake[i].x * CELL + 2, snake[i].y * CELL + 2, CELL - 4, CELL - 4, 5); ctx.fill();
      }
    }
    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (!lastT) lastT = t; var dt = t - lastT; lastT = t;
      if (started && !over) { acc += dt; if (acc >= speed) { acc = 0; step(); } }
      draw();
    }
    function onShow() {
      cv = document.getElementById('snake-canvas'); ctx = cv.getContext('2d'); fit(cv, W, W);
      reset(); started = false; over = false;
      role(view, 'start').classList.remove('hidden'); role(view, 'over').classList.add('hidden');
      keyH = function (e) {
        if (over) return;
        var k = e.key;
        if (k === ' ' || k === 'Spacebar') { begin(); return; }
        var nd = null;
        if (k === 'ArrowUp' || k === 'w') nd = { x: 0, y: -1 };
        else if (k === 'ArrowDown' || k === 's') nd = { x: 0, y: 1 };
        else if (k === 'ArrowLeft' || k === 'a') nd = { x: -1, y: 0 };
        else if (k === 'ArrowRight' || k === 'd') nd = { x: 1, y: 0 };
        if (nd && (nd.x !== -dir.x || nd.y !== -dir.y)) { nextDir = nd; e.preventDefault(); }
      };
      window.addEventListener('keydown', keyH);
      cv.onpointerdown = function () { if (!started) begin(); };
      lastT = 0; raf = requestAnimationFrame(loop);
    }
    function begin() { if (started) return; ARC.unlockAudio(); reset(); started = true; over = false; role(view, 'start').classList.add('hidden'); role(view, 'over').classList.add('hidden'); var b = document.querySelector('#' + view + ' .board'); if (b) b.classList.add('live'); }
    function onHide() { cancelAnimationFrame(raf); if (keyH) window.removeEventListener('keydown', keyH); }

    document.addEventListener('DOMContentLoaded', function () {
      var r = role(view, 'replay'); if (r) r.addEventListener('click', begin);
    });
    ARC.register({ id: 'snake', label: 'Snake', view: view, onShow: onShow, onHide: onHide });
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  })();

  /* =========================================================
     2048
     ========================================================= */
  (function () {
    var view = 'view-2048', SZ = 4, W = 380, GAP = 12, T = (W - GAP * (SZ + 1)) / SZ;
    var cv, ctx, grid, score, over, started, keyH, raf;
    var TILE_BG = { 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };

    function empty() { var g = []; for (var i = 0; i < SZ; i++) { g.push([0, 0, 0, 0]); } return g; }
    function reset() { grid = empty(); score = 0; over = false; addTile(); addTile(); ARC.hud.setScore(0); }
    function addTile() {
      var free = [];
      for (var r = 0; r < SZ; r++) for (var c = 0; c < SZ; c++) if (!grid[r][c]) free.push([r, c]);
      if (!free.length) return; var p = free[(Math.random() * free.length) | 0];
      grid[p[0]][p[1]] = Math.random() < 0.9 ? 2 : 4;
    }
    function slide(row) {
      var a = row.filter(function (x) { return x; });
      for (var i = 0; i < a.length - 1; i++) if (a[i] === a[i + 1]) { a[i] *= 2; score += a[i]; a.splice(i + 1, 1); }
      while (a.length < SZ) a.push(0);
      return a;
    }
    function rotate(g) { var n = empty(); for (var r = 0; r < SZ; r++) for (var c = 0; c < SZ; c++) n[c][SZ - 1 - r] = g[r][c]; return n; }
    function move(dir) { // 0=left,1=up,2=right,3=down
      var g = grid, k;
      for (k = 0; k < dir; k++) g = rotate(g);
      var moved = false, ng = [];
      for (var r = 0; r < SZ; r++) { var s = slide(g[r]); ng.push(s); if (s.join() !== g[r].join()) moved = true; }
      g = ng;
      for (k = 0; k < (4 - dir) % 4; k++) g = rotate(g);
      if (moved) { grid = g; ARC.hud.setScore(score); addTile(); ARC.sfx.blip(); if (!canMove()) end(); }
    }
    function canMove() {
      for (var r = 0; r < SZ; r++) for (var c = 0; c < SZ; c++) {
        if (!grid[r][c]) return true;
        if (c < SZ - 1 && grid[r][c] === grid[r][c + 1]) return true;
        if (r < SZ - 1 && grid[r][c] === grid[r + 1][c]) return true;
      }
      return false;
    }
    function end() {
      over = true; started = false; ARC.sfx.bad();
      var isBest = ARC.recordBest('2048', score);
      role(view, 'final').textContent = ARC.pad(score);
      role(view, 'title').textContent = isBest ? 'New best! 🎉' : 'No moves left';
      role(view, 'over').classList.remove('hidden');
    }
    function draw() {
      var p = palette();
      ctx.fillStyle = p.line; roundRect(0, 0, W, W, 14); ctx.fill();
      for (var r = 0; r < SZ; r++) for (var c = 0; c < SZ; c++) {
        var x = GAP + c * (T + GAP), y = GAP + r * (T + GAP), val = grid[r][c];
        ctx.fillStyle = val ? (TILE_BG[val] || '#3c3a32') : 'rgba(127,127,127,.12)';
        roundRect(x, y, T, T, 8); ctx.fill();
        if (val) {
          ctx.fillStyle = val <= 4 ? '#776e65' : '#fff';
          ctx.font = '700 ' + (val < 100 ? 34 : val < 1000 ? 28 : 22) + "px Inter, sans-serif";
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(val, x + T / 2, y + T / 2 + 1);
        }
      }
    }
    function loop() { raf = requestAnimationFrame(loop); draw(); }
    function begin() { ARC.unlockAudio(); reset(); started = true; over = false; role(view, 'start').classList.add('hidden'); role(view, 'over').classList.add('hidden'); var b = document.querySelector('#' + view + ' .board'); if (b) b.classList.add('live'); }
    function onShow() {
      cv = document.getElementById('g2048-canvas'); ctx = cv.getContext('2d'); fit(cv, W, W);
      reset(); started = false; over = false;
      role(view, 'start').classList.remove('hidden'); role(view, 'over').classList.add('hidden');
      keyH = function (e) {
        if (!started && (e.key === ' ' || e.key === 'Enter')) { begin(); return; }
        var d = { ArrowLeft: 0, a: 0, ArrowUp: 1, w: 1, ArrowRight: 2, d: 2, ArrowDown: 3, s: 3 }[e.key];
        if (d !== undefined && started && !over) { e.preventDefault(); move(d); }
      };
      window.addEventListener('keydown', keyH);
      raf = requestAnimationFrame(loop);
    }
    function onHide() { cancelAnimationFrame(raf); if (keyH) window.removeEventListener('keydown', keyH); }
    document.addEventListener('DOMContentLoaded', function () { var r = role(view, 'replay'); if (r) r.addEventListener('click', begin); });
    ARC.register({ id: '2048', label: '2048', view: view, onShow: onShow, onHide: onHide });
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  })();

  /* =========================================================
     BREAKOUT
     ========================================================= */
  (function () {
    var view = 'view-breakout', W = 520, H = 380;
    var cv, ctx, raf, paddle, ball, bricks, score, lives, started, over, keyH, mouseH, left, right, lastT;
    var COLS = 9, ROWS = 5, BW, BH = 20, BT = 36, BP = 6;

    function reset() {
      paddle = { x: W / 2 - 46, y: H - 24, w: 92, h: 12, sp: 7 };
      resetBall(); score = 0; lives = 3; over = false; left = right = false;
      BW = (W - BP * (COLS + 1)) / COLS; bricks = [];
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) bricks.push({ x: BP + c * (BW + BP), y: BT + r * (BH + BP), w: BW, h: BH, on: true, row: r });
      ARC.hud.setScore(0);
    }
    function resetBall() { ball = { x: W / 2, y: H - 40, vx: (Math.random() < 0.5 ? -1 : 1) * 3.2, vy: -3.4, r: 7 }; }
    function loseLife() { lives--; if (lives <= 0) return end(); resetBall(); }
    function end() { over = true; started = false; ARC.sfx.bad(); var isBest = ARC.recordBest('breakout', score); role(view, 'final').textContent = ARC.pad(score); role(view, 'title').textContent = isBest ? 'New best! 🎉' : (bricks.every(function (b) { return !b.on; }) ? 'Cleared! 🏆' : 'Game over'); role(view, 'over').classList.remove('hidden'); }
    function tick() {
      if (left) paddle.x -= paddle.sp; if (right) paddle.x += paddle.sp;
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.x < ball.r || ball.x > W - ball.r) { ball.vx *= -1; ARC.sfx.blip(); }
      if (ball.y < ball.r) { ball.vy *= -1; ARC.sfx.blip(); }
      if (ball.y > H + 20) return loseLife();
      // paddle
      if (ball.y + ball.r >= paddle.y && ball.y < paddle.y + paddle.h && ball.x > paddle.x && ball.x < paddle.x + paddle.w && ball.vy > 0) {
        ball.vy *= -1; var hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2); ball.vx = hit * 5; ARC.sfx.blip();
      }
      // bricks
      for (var i = 0; i < bricks.length; i++) {
        var b = bricks[i]; if (!b.on) continue;
        if (ball.x > b.x && ball.x < b.x + b.w && ball.y - ball.r < b.y + b.h && ball.y + ball.r > b.y) {
          b.on = false; ball.vy *= -1; score += 10; ARC.hud.setScore(score); ARC.sfx.coin();
          if (bricks.every(function (q) { return !q.on; })) end();
          break;
        }
      }
    }
    function draw() {
      var p = palette();
      ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
      var cols = [p.accent, '#f59563', p.coin, p.good, '#6aa9ff'];
      for (var i = 0; i < bricks.length; i++) { var b = bricks[i]; if (!b.on) continue; ctx.fillStyle = cols[b.row % cols.length]; roundRect(b.x, b.y, b.w, b.h, 4); ctx.fill(); }
      ctx.fillStyle = p.text; roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6); ctx.fill();
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fillStyle = p.accent; ctx.fill();
      // lives
      ctx.fillStyle = p.muted; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('♥'.repeat(Math.max(0, lives)), W - 10, 8);
    }
    function loop() { raf = requestAnimationFrame(loop); if (started && !over) tick(); draw(); }
    function begin() { ARC.unlockAudio(); reset(); started = true; over = false; role(view, 'start').classList.add('hidden'); role(view, 'over').classList.add('hidden'); var bd = document.querySelector('#' + view + ' .board'); if (bd) bd.classList.add('live'); }
    function onShow() {
      cv = document.getElementById('breakout-canvas'); ctx = cv.getContext('2d'); fit(cv, W, H);
      reset(); started = false; over = false;
      role(view, 'start').classList.remove('hidden'); role(view, 'over').classList.add('hidden');
      keyH = function (e) {
        if (!started && (e.key === ' ' || e.key === 'Enter')) { begin(); return; }
        if (e.key === 'ArrowLeft' || e.key === 'a') left = (e.type === 'keydown');
        if (e.key === 'ArrowRight' || e.key === 'd') right = (e.type === 'keydown');
      };
      window.addEventListener('keydown', keyH); window.addEventListener('keyup', keyH);
      mouseH = function (e) { var rect = cv.getBoundingClientRect(); var mx = (e.clientX - rect.left) * (W / rect.width); paddle.x = Math.max(0, Math.min(W - paddle.w, mx - paddle.w / 2)); };
      cv.addEventListener('pointermove', mouseH);
      cv.onpointerdown = function () { if (!started) begin(); };
      raf = requestAnimationFrame(loop);
    }
    function onHide() { cancelAnimationFrame(raf); if (keyH) { window.removeEventListener('keydown', keyH); window.removeEventListener('keyup', keyH); } if (mouseH && cv) cv.removeEventListener('pointermove', mouseH); }
    document.addEventListener('DOMContentLoaded', function () { var r = role(view, 'replay'); if (r) r.addEventListener('click', begin); });
    ARC.register({ id: 'breakout', label: 'Breakout', view: view, onShow: onShow, onHide: onHide });
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  })();
})();
