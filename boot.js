/* ============================================================
   GH RUNNER — boot
   1. Inject base64 sprite + audio sources from assets.js (GH_ASSETS).
   2. Recolor the Chrome sprite sheet (#535353 artwork) into GH orange.
   3. Start the engine once the recolored sprites are ready.
   4. Wire the start overlay + game-over overlay.
   ============================================================ */
(function () {
  'use strict';

  var GH_ORANGE = { r: 255, g: 106, b: 26 }; // --gh-orange #ff6a1a

  // Pull the base64 asset sources out of assets.js into the DOM nodes the
  // engine expects. Keeps the markup tiny and the codebase host-agnostic.
  function injectAssets() {
    var A = window.GH_ASSETS || {};
    var s1 = document.getElementById('offline-resources-1x');
    var s2 = document.getElementById('offline-resources-2x');
    if (s1 && A.spriteSheet1x) s1.src = A.spriteSheet1x;
    if (s2 && A.spriteSheet2x) s2.src = A.spriteSheet2x;
    var tpl = document.getElementById('audio-resources');
    if (tpl && tpl.content) {
      setSrc(tpl.content, 'offline-sound-press', A.soundPress);
      setSrc(tpl.content, 'offline-sound-hit', A.soundHit);
      setSrc(tpl.content, 'offline-sound-reached', A.soundReached);
    }
  }
  function setSrc(root, id, val) {
    var el = root.getElementById(id);
    if (el && val) el.src = val;
  }

  // Recolor every opaque pixel of an <img> to GH orange, preserving the
  // alpha channel so anti-aliased edges stay smooth. Returns a Promise.
  function recolor(img) {
    return new Promise(function (resolve) {
      function paint() {
        var c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        var data = ctx.getImageData(0, 0, c.width, c.height);
        var p = data.data;
        for (var i = 0; i < p.length; i += 4) {
          if (p[i + 3] > 0) {
            p[i] = GH_ORANGE.r;
            p[i + 1] = GH_ORANGE.g;
            p[i + 2] = GH_ORANGE.b;
          }
        }
        ctx.putImageData(data, 0, 0);
        img.onload = null;
        img.src = c.toDataURL('image/png');
        img.onload = function () { resolve(); };
      }
      if (img.complete && img.naturalWidth) paint();
      else img.onload = paint;
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
    injectAssets();
    var imgs = [
      document.getElementById('offline-resources-1x'),
      document.getElementById('offline-resources-2x')
    ].filter(Boolean);
    Promise.all(imgs.map(recolor)).then(startEngine);
  });
})();
