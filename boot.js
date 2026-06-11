/* ============================================================
   Dino Runner — boot
   Starts the engine and wires the start / game-over overlays.
   No sprite recolor: the classic dark Chrome dino is used as-is
   on the light theme.
   ============================================================ */
(function () {
  'use strict';

  // Tiny valid silent WAV so the engine's loadSounds() decodes cleanly
  // (keeps the game silent without "Unable to decode audio data" errors).
  var SILENT = 'data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

  function injectSilentAudio() {
    var tpl = document.getElementById('audio-resources');
    if (!tpl || !tpl.content) return;
    ['offline-sound-press', 'offline-sound-hit', 'offline-sound-reached']
      .forEach(function (id) {
        var el = tpl.content.getElementById(id);
        if (el) el.src = SILENT;
      });
  }

  function wireOverlays() {
    var startOverlay = document.getElementById('start');
    var overOverlay = document.getElementById('over');
    var finalScore = document.getElementById('final-score');
    var dismissed = false;

    function dismissStart() {
      if (dismissed) return;
      dismissed = true;
      startOverlay.classList.add('hidden');
    }
    window.addEventListener('keydown', function (e) {
      if (e.keyCode === 32 || e.keyCode === 38) dismissStart();
    });
    window.addEventListener('pointerdown', dismissStart);

    var wasCrashed = false;
    setInterval(function () {
      var r = window.Runner && Runner.instance_;
      if (!r) return;
      if (r.crashed && !wasCrashed) {
        wasCrashed = true;
        finalScore.textContent = digits(r.distanceMeter.getActualDistance(
          Math.ceil(r.distanceRan)));
        overOverlay.classList.remove('hidden');
      } else if (!r.crashed && wasCrashed) {
        wasCrashed = false;
        overOverlay.classList.add('hidden');
      }
    }, 120);

    document.getElementById('replay').addEventListener('click', function () {
      var r = window.Runner && Runner.instance_;
      if (r && r.crashed) r.restart();
      overOverlay.classList.add('hidden');
    });
  }

  function digits(n) { return String(n).padStart(5, '0'); }

  document.addEventListener('DOMContentLoaded', function () {
    injectSilentAudio();
    new Runner('.interstitial-wrapper'); // eslint-disable-line no-new
    wireOverlays();
  });
})();
