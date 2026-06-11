/* ============================================================
   Dino Arcade — launcher / shared framework
   Owns: game switching, theme, mute, shared HUD, storage, audio.
   Games register with ARC.register({...}) and use ARC.* helpers.
   ============================================================ */
(function () {
  'use strict';
  var ARC = window.ARC = {};

  /* ---- storage ---- */
  ARC.get = function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  ARC.set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

  /* ---- audio (procedural) ---- */
  var actx = null;
  ARC.muted = ARC.get('arc_muted', '0') === '1';
  function ctx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return actx; }
  ARC.unlockAudio = function () { var c = ctx(); if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} } };
  ARC.tone = function (freq, dur, type, gain, slideTo) {
    if (ARC.muted) return; var c = ctx(); if (!c) return; ARC.unlockAudio();
    var t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gain || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  ARC.sfx = {
    blip:  function () { ARC.tone(440, 0.06, 'square', 0.045, 660); },
    good:  function () { ARC.tone(720, 0.07, 'square', 0.05); setTimeout(function () { ARC.tone(1080, 0.09, 'square', 0.045); }, 70); },
    coin:  function () { ARC.tone(880, 0.05, 'triangle', 0.06, 1320); setTimeout(function () { ARC.tone(1500, 0.08, 'triangle', 0.05); }, 55); },
    bad:   function () { ARC.tone(180, 0.28, 'sawtooth', 0.06, 55); },
    jump:  function () { ARC.tone(360, 0.12, 'square', 0.05, 760); }
  };

  /* ---- HUD ---- */
  var elScore, elBest, elCoins, coinWrap;
  ARC.hud = {
    setScore: function (n) { if (elScore) elScore.textContent = pad(n); },
    setBest:  function (n) { if (elBest) elBest.textContent = pad(n); },
    setCoins: function (n) { if (n === null) { if (coinWrap) coinWrap.style.display = 'none'; } else { if (coinWrap) coinWrap.style.display = ''; if (elCoins) elCoins.textContent = n; } },
    flashCoins: function () { if (!coinWrap) return; coinWrap.classList.remove('flash'); void coinWrap.offsetWidth; coinWrap.classList.add('flash'); }
  };
  function pad(n) { return String(Math.max(0, n | 0)).padStart(5, '0'); }
  ARC.pad = pad;

  /* ---- theme + mute ---- */
  ARC.dark = ARC.get('arc_dark', '0') === '1';
  function renderTheme() { document.body.classList.toggle('theme-dark', ARC.dark); var b = document.getElementById('theme'); if (b) b.textContent = ARC.dark ? '☀️' : '🌙'; }
  ARC.toggleTheme = function () { ARC.dark = !ARC.dark; ARC.set('arc_dark', ARC.dark ? '1' : '0'); renderTheme(); };
  function renderMute() { var b = document.getElementById('mute'); if (b) { b.textContent = ARC.muted ? '🔇' : '🔊'; b.classList.toggle('off', ARC.muted); } }
  ARC.toggleMute = function () { ARC.muted = !ARC.muted; ARC.set('arc_muted', ARC.muted ? '1' : '0'); renderMute(); if (!ARC.muted) ARC.unlockAudio(); };

  /* ---- games registry ---- */
  ARC.games = {};
  ARC.activeId = null;
  ARC.register = function (g) { ARC.games[g.id] = g; };

  ARC.show = function (id) {
    if (!ARC.games[id]) return;
    if (ARC.activeId === id) return;
    var prev = ARC.games[ARC.activeId];
    if (prev && prev.onHide) try { prev.onHide(); } catch (e) {}
    // toggle views + tabs
    Object.keys(ARC.games).forEach(function (k) {
      var g = ARC.games[k];
      var v = document.getElementById(g.view);
      if (v) v.classList.toggle('hidden', k !== id);
      var t = document.querySelector('.tab[data-game="' + k + '"]');
      if (t) t.classList.toggle('on', k === id);
    });
    ARC.activeId = id;
    ARC.set('arc_last', id);
    var g = ARC.games[id];
    ARC.hud.setCoins(g.hasCoins ? 0 : null);
    ARC.hud.setScore(0);
    ARC.hud.setBest(ARC.bestOf(id));
    if (g.onShow) try { g.onShow(); } catch (e) {}
  };

  ARC.bestKey = function (id) { return 'best_' + id; };
  ARC.bestOf = function (id) { return parseInt(ARC.get(ARC.bestKey(id), '0'), 10) || 0; };
  ARC.recordBest = function (id, score) {
    var b = ARC.bestOf(id);
    if (score > b) { ARC.set(ARC.bestKey(id), String(score)); ARC.hud.setBest(score); return true; }
    return false;
  };

  /* ---- boot ---- */
  document.addEventListener('DOMContentLoaded', function () {
    elScore = document.getElementById('cur');
    elBest = document.getElementById('best');
    elCoins = document.getElementById('coins');
    coinWrap = document.querySelector('.coinwrap');

    renderTheme(); renderMute();
    document.getElementById('theme').addEventListener('click', ARC.toggleTheme);
    document.getElementById('mute').addEventListener('click', ARC.toggleMute);
    window.addEventListener('keydown', function (e) {
      var k = (e.key || '').toLowerCase();
      if (k === 'm') ARC.toggleMute();
      else if (k === 't') ARC.toggleTheme();
    });

    // tab buttons
    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () { ARC.unlockAudio(); ARC.show(t.getAttribute('data-game')); });
    });

    // activate last-used (or dino)
    var last = ARC.get('arc_last', 'dino');
    if (!ARC.games[last]) last = Object.keys(ARC.games)[0];
    // ensure all hidden first, then show
    Object.keys(ARC.games).forEach(function (k) { var v = document.getElementById(ARC.games[k].view); if (v) v.classList.add('hidden'); });
    ARC.show(last);
  });
})();
