/* ============================================================
   GH RUNNER — boot
   1. Recolor the Chrome sprite sheet (#535353 artwork) into GH orange.
      Sprites are CORS-loaded (crossorigin="anonymous") so the canvas
      stays untainted and getImageData works.
   2. Start the engine once the recolored sprites are ready.
   3. Wire the start overlay + game-over overlay.
   ============================================================ */
(function () {
  'use strict';

  var GH_ORANGE = { r: 255, g: 106, b: 26 }; // --gh-orange #ff6a1a

  // Tiny valid silent WAV. The engine's loadSounds() decodes whatever is in
  // the audio template; giving it a valid (silent) clip avoids "Unable to
  // decode audio data" errors while keeping the game silent.
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

  function recolor(img) {
    return new Promise(function (resolve) {
      function paint() {
        try {
          var c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          var ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          var data = ctx.getImageData(0, 0, c.width, c.height);
          var p = data.data;
          for (var i = 0; i < p.length; i += 4) {
            if (p[i + 3] > 0) {
              p[i] = GH_ORANGE.r; p[i + 1] = GH_ORANGE.g; p[i + 2] = GH_ORANGE.b;
            }
          }
          ctx.putImageData(data, 0, 0);
          img.onload = null;
          img.src = c.toDataURL('image/png');
          img.onload = function () { resolve(); };
        } catch (e) {
          // If recolor fails for any reason, fall back to the original sprite.
          resolve();
        }
      }
      if (img.complete && img.naturalWidth) paint();
      else { img.onload = paint; img.onerror = function () { resolve(); }; }
    });
  }

  function startEngine() {
    new Runner('.interstitial-wrapper'); // eslint-disable-line no-new
    wireOverlays();
  }

  function wireOverlays() {
    var startOverlay = document.getElementById('gh-start');
    var overOverlay = document.getElementById('gh-over');
    var finalScore = document.getElementById('gh-final-score');
    var dismissed = false;

    function dismissStart() {
      if (dismissed) return;
      dismissed = true;
      startOverlay.classList.add('gh-hidden');
    }
    window.addEventListener('keydown', function (e) {
      if (e.keyCode === 32 || e.keyCode === 38) dismissStart();
    });
    window.addEventListener('pointerdown', dismissStart);

    var wasCrashed = false;
    setInterval(function () {
      var r = Runner.instance_;
      if (!r) return;
      if (r.crashed && !wasCrashed) {
        wasCrashed = true;
        finalScore.textContent = digits(r.distanceMeter.getActualDistance(
          Math.ceil(r.distanceRan)));
        overOverlay.classList.remove('gh-hidden');
      } else if (!r.crashed && wasCrashed) {
        wasCrashed = false;
        overOverlay.classList.add('gh-hidden');
      }
    }, 120);

    document.getElementById('gh-replay').addEventListener('click', function () {
      var r = Runner.instance_;
      if (r && r.crashed) r.restart();
      overOverlay.classList.add('gh-hidden');
    });
  }

  function digits(n) { return String(n).padStart(5, '0'); }

  document.addEventListener('DOMContentLoaded', function () {
    injectSilentAudio();
    var imgs = [
      document.getElementById('offline-resources-1x'),
      document.getElementById('offline-resources-2x')
    ].filter(Boolean);
    Promise.all(imgs.map(recolor)).then(startEngine);
  });
})();
