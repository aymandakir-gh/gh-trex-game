/* ============================================================
   Dino Arcade — Phase 3: 3D Kart (prototype, single-player)
   A drivable low-poly kart on an oval track with a chase camera,
   lap timer, best-lap saving, and one AI rival. Three.js is
   lazy-loaded from a CDN the first time you open this tab.
   Controls: W/↑ accelerate · S/↓ brake · A/←  D/→ steer
   ============================================================ */
(function () {
  'use strict';
  var ARC = window.ARC, view = 'view-kart';
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var VW = 820, VH = 470;
  var ready = false, raf = null, scene, cam, renderer, keyH, keyU, hudEl;
  var kart, bot, ground, cones = [];
  var started, lap, lapStart, bestLap, lastT, cp, CPS;
  var held = {};

  function role(r) { return document.querySelector('#' + view + ' [data-role="' + r + '"]'); }

  /* ---- track geometry (oval) ---- */
  var RX = 70, RZ = 46; // oval radii
  function trackPoint(a) { return { x: Math.cos(a) * RX, z: Math.sin(a) * RZ }; }

  function ensureThree(cb) {
    if (window.THREE) return cb();
    var s = document.createElement('script'); s.src = THREE_URL;
    s.onload = function () { cb(); };
    s.onerror = function () { var m = role('msg'); if (m) m.textContent = 'Could not load the 3D engine (offline?).'; };
    document.head.appendChild(s);
  }

  function makeKart(color) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.1, 5), new THREE.MeshLambertMaterial({ color: color }));
    body.position.y = 1.1; g.add(body);
    var roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 2.2), new THREE.MeshLambertMaterial({ color: color }));
    roof.position.set(0, 2.1, -0.4); g.add(roof);
    var wmat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    [[-1.6, 1.8], [1.6, 1.8], [-1.6, -1.8], [1.6, -1.8]].forEach(function (p) {
      var w = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.7, 12), wmat);
      w.rotation.z = Math.PI / 2; w.position.set(p[0], 0.8, p[1]); g.add(w);
    });
    g.userData = { x: 0, z: 0, h: 0, sp: 0 };
    return g;
  }

  function build() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fd0ff);
    scene.fog = new THREE.Fog(0x9fd0ff, 120, 260);
    cam = new THREE.PerspectiveCamera(60, VW / VH, 0.1, 600);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x556b2f, 1.05));
    var sun = new THREE.DirectionalLight(0xffffff, 0.6); sun.position.set(40, 80, 20); scene.add(sun);

    ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: 0x6fbf73 }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);

    // track ribbon (dark torus, flattened)
    var track = new THREE.Mesh(new THREE.TorusGeometry((RX + RZ) / 2, 11, 8, 80), new THREE.MeshLambertMaterial({ color: 0x3a3f47 }));
    track.scale.set(RX / ((RX + RZ) / 2), RZ / ((RX + RZ) / 2), 1);
    track.rotation.x = Math.PI / 2; track.position.y = 0.05; scene.add(track);

    // cone markers + checkpoints
    CPS = []; cones = [];
    for (var i = 0; i < 24; i++) {
      var a = (i / 24) * Math.PI * 2, po = trackPoint(a);
      var outer = trackPoint(a); var s = 1.18;
      var cone = new THREE.Mesh(new THREE.ConeGeometry(1, 3, 8), new THREE.MeshLambertMaterial({ color: i % 2 ? 0xff7043 : 0xffffff }));
      cone.position.set(po.x * s, 1.5, po.z * s); scene.add(cone);
    }
    for (var c = 0; c < 4; c++) { CPS.push(trackPoint((c / 4) * Math.PI * 2)); }

    // start gate
    var gate = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 1), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
    gate.position.set(RX, 4, 0); scene.add(gate);

    kart = makeKart(0xff6a1a); scene.add(kart);
    bot = makeKart(0x2f86eb); scene.add(bot);
    resetPositions();
  }

  function resetPositions() {
    kart.userData = { x: RX, z: 6, h: -Math.PI / 2, sp: 0 };
    bot.userData = { x: RX, z: -6, h: -Math.PI / 2, sp: 0, t: 0 };
    lap = 0; bestLap = ARC.bestOf('kart'); lapStart = 0; started = false; cp = 0;
  }

  function driveKart(k, dt, accel, steer, brake) {
    var u = k.userData;
    if (accel) u.sp += 38 * dt;
    if (brake) u.sp -= 46 * dt;
    u.sp *= (1 - 0.8 * dt); // friction
    u.sp = Math.max(-18, Math.min(54, u.sp));
    if (Math.abs(u.sp) > 0.5) u.h += steer * 1.7 * dt * (u.sp > 0 ? 1 : -1);
    u.x += Math.cos(u.h) * u.sp * dt;
    u.z += Math.sin(u.h) * u.sp * dt;
    k.position.set(u.x, 0, u.z);
    k.rotation.y = -u.h + Math.PI / 2;
  }

  function botAI(dt) {
    var u = bot.userData;
    var target = trackPoint(u.t * 1.0 + 0.0); // follow path param
    u.t += dt * 0.6; var tp = trackPoint(u.t);
    var ang = Math.atan2(tp.z - u.z, tp.x - u.x);
    var diff = ((ang - u.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    driveKart(bot, dt, true, Math.max(-1, Math.min(1, diff * 1.5)), false);
  }

  function checkLap() {
    var u = kart.userData;
    var t = trackPoint((cp / 4) * Math.PI * 2);
    if (Math.hypot(u.x - t.x, u.z - t.z) < 22) {
      cp++;
      if (cp >= 4) {
        cp = 0;
        if (started) {
          var lt = (performance.now() - lapStart) / 1000;
          var ltTenths = Math.round(lt * 10); // best lap stored/compared in tenths
          // Best lap is the SMALLEST; ARC.recordBest is maximize-only, so set directly.
          if (bestLap === 0 || ltTenths < bestLap) { bestLap = ltTenths; ARC.set(ARC.bestKey('kart'), String(bestLap)); }
          lap++;
        }
        lapStart = performance.now(); started = true;
        ARC.sfx.good();
      }
    }
  }

  function updateCam() {
    var u = kart.userData;
    var cx = u.x - Math.cos(u.h) * 16, cz = u.z - Math.sin(u.h) * 16;
    cam.position.lerp(new THREE.Vector3(cx, 10, cz), 0.18);
    cam.lookAt(u.x + Math.cos(u.h) * 8, 2, u.z + Math.sin(u.h) * 8);
  }

  function hud() {
    var u = kart.userData;
    var cur = started ? ((performance.now() - lapStart) / 1000).toFixed(1) : '0.0';
    var best = bestLap ? (bestLap / 10).toFixed(1) + 's' : '—';
    if (hudEl) hudEl.innerHTML = 'Lap <b>' + lap + '</b> &nbsp; Time <b>' + cur + 's</b> &nbsp; Best <b>' + best + '</b> &nbsp; Speed <b>' + Math.abs(u.sp * 2).toFixed(0) + '</b>';
    ARC.hud.setScore(lap);
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (!lastT) lastT = t; var dt = Math.min((t - lastT) / 1000, 0.05); lastT = t;
    var accel = held['w'] || held['arrowup'], brake = held['s'] || held['arrowdown'];
    var steer = (held['a'] || held['arrowleft'] ? -1 : 0) + (held['d'] || held['arrowright'] ? 1 : 0);
    driveKart(kart, dt, accel, steer, brake);
    botAI(dt);
    checkLap(); updateCam(); hud();
    renderer.render(scene, cam);
  }

  function onShow() {
    var msg = role('msg'); if (msg) msg.textContent = 'Loading 3D…';
    hudEl = role('hud');
    held = {};
    keyH = function (e) { var k = (e.key || '').toLowerCase(); if (k === ' ' || k.indexOf('arrow') === 0) e.preventDefault(); held[k] = true; };
    keyU = function (e) { held[(e.key || '').toLowerCase()] = false; };
    window.addEventListener('keydown', keyH); window.addEventListener('keyup', keyU);
    ensureThree(function () {
      if (!renderer) {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(VW, VH); renderer.domElement.className = 'kart-canvas';
        var host = document.getElementById('kart-mount'); host.innerHTML = ''; host.appendChild(renderer.domElement);
      }
      if (!scene) build(); else resetPositions();
      if (msg) msg.textContent = '';
      ready = true; lastT = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    });
  }
  function onHide() { cancelAnimationFrame(raf); if (keyH) window.removeEventListener('keydown', keyH); if (keyU) window.removeEventListener('keyup', keyU); held = {}; }

  ARC.register({ id: 'kart', label: 'Kart 3D', view: view, onShow: onShow, onHide: onHide });
})();
