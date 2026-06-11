/* ============================================================
   Dino Arcade — Dino Runner module
   Wraps the Chrome-dino engine; lazy-inits when the tab opens,
   fully tears down when you switch away. Uses ARC for sound,
   HUD, theme and the saved best.
   ============================================================ */
(function () {
  'use strict';
  var ARC = window.ARC, view = 'view-dino';
  var inited = false, cleanups = [], goTimer = null;
  var coins = 0, coinList = [], coinTimer = 1500, COIN_R = 7;

  var SILENT = 'data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
  function injectSilentAudio() {
    var tpl = document.getElementById('audio-resources'); if (!tpl || !tpl.content) return;
    ['offline-sound-press', 'offline-sound-hit', 'offline-sound-reached'].forEach(function (id) {
      var el = tpl.content.getElementById(id); if (el) el.src = SILENT;
    });
  }

  var DIFF = { easy: { SPEED: 5, ACCELERATION: 0.0007, MAX_SPEED: 11 }, normal: { SPEED: 6, ACCELERATION: 0.001, MAX_SPEED: 13 }, hard: { SPEED: 7.5, ACCELERATION: 0.0016, MAX_SPEED: 16 } };
  var diff = DIFF[ARC.get('dino_diff', 'normal')] ? ARC.get('dino_diff', 'normal') : 'normal';
  function applyDifficulty() {
    var r = window.Runner, inst = r && r.instance_; if (!r) return; var d = DIFF[diff];
    ['SPEED', 'ACCELERATION', 'MAX_SPEED'].forEach(function (k) { r.config[k] = d[k]; if (inst) inst.config[k] = d[k]; });
    if (inst && !inst.playing) { inst.currentSpeed = d.SPEED; inst.setSpeed(d.SPEED); }
  }

  function score() { var i = Runner.instance_; return i ? i.distanceMeter.getActualDistance(Math.ceil(i.distanceRan)) : 0; }
  function seedBest() { var i = Runner.instance_; if (!i) return; var b = ARC.bestOf('dino'); i.highestScore = Math.round(b / 0.025); i.distanceMeter.setHighScore(i.highestScore); }

  function updateCoins(dt) {
    var i = Runner.instance_; if (!i || !i.playing || !i.canvasCtx) return;
    var ctx = i.canvasCtx, trex = i.tRex;
    if (i.activated) {
      coinTimer -= dt;
      if (coinTimer <= 0) { coinTimer = 1400 + Math.random() * 2400; var ys = [98, 72, 46]; coinList.push({ x: Runner.defaultDimensions.WIDTH + 20, y: ys[(Math.random() * ys.length) | 0] }); }
    }
    var move = Math.floor(i.currentSpeed * (60 / 1000) * dt);
    for (var k = coinList.length - 1; k >= 0; k--) {
      var co = coinList[k]; co.x -= move;
      ctx.save(); ctx.beginPath(); ctx.arc(co.x, co.y, COIN_R, 0, Math.PI * 2); ctx.fillStyle = '#f5b301'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#b97e00'; ctx.stroke(); ctx.fillStyle = '#fff3cf'; ctx.fillRect(co.x - 1, co.y - 3, 2, 6); ctx.restore();
      var w = trex.config.WIDTH, h = trex.config.HEIGHT;
      if (co.x > trex.xPos + 2 && co.x < trex.xPos + w - 2 && co.y > trex.yPos && co.y < trex.yPos + h) { coins++; i.distanceRan += 200; ARC.sfx.coin(); ARC.hud.setCoins(coins); ARC.hud.flashCoins(); coinList.splice(k, 1); continue; }
      if (co.x < -20) coinList.splice(k, 1);
    }
  }
  function resetCoins() { coinList = []; coins = 0; coinTimer = 1500; ARC.hud.setCoins(0); }

  function hookFrame() {
    var i = Runner.instance_; if (!i) return;
    var orig = i.update.bind(i), last = performance.now(), wasJump = false, lastHundred = 0;
    i.update = function () {
      orig();
      var now = performance.now(), dt = Math.min(now - last, 40); last = now;
      if (i.playing && !i.crashed) {
        updateCoins(dt);
        var j = i.tRex && i.tRex.jumping; if (j && !wasJump) ARC.sfx.jump(); wasJump = j;
        var hun = Math.floor(score() / 100); if (hun > lastHundred) ARC.sfx.good(); lastHundred = hun;
      } else wasJump = false;
      ARC.hud.setScore(score());
    };
  }

  function confetti(host) {
    var marks = ['🎉', '✨', '🎊', '⭐', '🏆']; host.innerHTML = '';
    for (var n = 0; n < 16; n++) { var s = document.createElement('span'); s.textContent = marks[(Math.random() * marks.length) | 0]; s.style.left = (Math.random() * 100) + '%'; s.style.animationDelay = (Math.random() * 0.4) + 's'; s.style.fontSize = (12 + Math.random() * 12) + 'px'; host.appendChild(s); }
  }

  function wireDino() {
    var startOv = document.getElementById('dino-start'), overOv = document.getElementById('dino-over');
    var finalEl = document.getElementById('dino-final'), finalBest = document.getElementById('dino-final-best'), finalCoins = document.getElementById('dino-final-coins');
    var title = document.getElementById('dino-over-title'), conf = document.getElementById('dino-confetti');

    document.querySelectorAll('#dino-start .diff').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-d') === diff);
      var h = function (e) { e.stopPropagation(); diff = b.getAttribute('data-d'); ARC.set('dino_diff', diff); document.querySelectorAll('#dino-start .diff').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); applyDifficulty(); };
      b.addEventListener('click', h); cleanups.push(function () { b.removeEventListener('click', h); });
    });

    var started = false;
    function dismiss() { if (started) return; started = true; startOv.classList.add('hidden'); ARC.unlockAudio(); }
    var kh = function (e) { if (e.keyCode === 32 || e.keyCode === 38) dismiss(); };
    var ph = function (e) { if (!e.target.closest('.diff') && !e.target.closest('.tool') && !e.target.closest('.tab')) dismiss(); };
    window.addEventListener('keydown', kh); window.addEventListener('pointerdown', ph);
    cleanups.push(function () { window.removeEventListener('keydown', kh); window.removeEventListener('pointerdown', ph); });

    var wasCrashed = false;
    goTimer = setInterval(function () {
      var i = window.Runner && Runner.instance_; if (!i) return;
      if (i.crashed && !wasCrashed) {
        wasCrashed = true; ARC.sfx.bad();
        var dist = score(), isBest = ARC.recordBest('dino', dist); if (isBest) seedBest();
        finalEl.textContent = ARC.pad(dist); finalBest.textContent = ARC.pad(ARC.bestOf('dino')); finalCoins.textContent = coins;
        title.textContent = isBest ? 'New best! 🎉' : 'Game over';
        overOv.classList.toggle('celebrate', isBest); if (isBest) confetti(conf); else conf.innerHTML = '';
        overOv.classList.remove('hidden');
      } else if (!i.crashed && wasCrashed) { wasCrashed = false; overOv.classList.add('hidden'); resetCoins(); }
    }, 100);

    var rep = document.getElementById('dino-replay'), ex = document.getElementById('dino-exit');
    var rh = function () { var i = Runner.instance_; if (i && i.crashed) { resetCoins(); i.restart(); } overOv.classList.add('hidden'); };
    var eh = function () { ARC.show('dino'); teardown(); initDino(); };
    rep.addEventListener('click', rh); ex.addEventListener('click', eh);
    cleanups.push(function () { rep.removeEventListener('click', rh); ex.removeEventListener('click', eh); });
  }

  function initDino() {
    injectSilentAudio();
    new Runner('.interstitial-wrapper'); // eslint-disable-line no-new
    applyDifficulty(); seedBest(); hookFrame(); wireDino();
    inited = true;
    document.getElementById('dino-start').classList.remove('hidden');
    document.getElementById('dino-over').classList.add('hidden');
  }

  function teardown() {
    cleanups.forEach(function (f) { try { f(); } catch (e) {} }); cleanups = [];
    if (goTimer) { clearInterval(goTimer); goTimer = null; }
    var i = window.Runner && Runner.instance_;
    if (i) { try { i.stopListening(); i.stop(); } catch (e) {} if (i.containerEl && i.containerEl.parentNode) i.containerEl.parentNode.removeChild(i.containerEl); window.Runner.instance_ = null; }
    document.body.classList.remove('arcade-mode');
    resetCoins(); inited = false;
  }

  ARC.register({
    id: 'dino', label: 'Dino', view: view, hasCoins: true,
    onShow: function () { if (!inited) initDino(); ARC.hud.setCoins(coins); ARC.hud.setScore(0); ARC.hud.setBest(ARC.bestOf('dino')); },
    onHide: function () { teardown(); }
  });
})();
