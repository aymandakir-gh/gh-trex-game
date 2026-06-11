/* ============================================================
   Dino Runner — boot + extras
   Fullscreen-on-start, procedural sound, saved high score,
   day/night, difficulty, and a coin layer drawn on the engine
   canvas (so it scales with the fullscreen zoom automatically).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- storage ---------- */
  function get(k, d){ try{ var v=localStorage.getItem(k); return v===null?d:v; }catch(e){ return d; } }
  function set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }

  /* ---------- sound (procedural Web Audio) ---------- */
  var actx = null, muted = get('dino_muted','0') === '1';
  function ac(){ if(!actx){ try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return actx; }
  function tone(freq, dur, type, gain, slideTo){
    if(muted) return; var c = ac(); if(!c) return;
    if(c.state === 'suspended'){ try{ c.resume(); }catch(e){} }
    var t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gain || 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function sJump(){ tone(360, 0.12, 'square', 0.05, 760); }
  function sPoint(){ tone(720, 0.07, 'square', 0.05); setTimeout(function(){ tone(1080, 0.09, 'square', 0.045); }, 80); }
  function sCoin(){ tone(880, 0.05, 'triangle', 0.06, 1320); setTimeout(function(){ tone(1500, 0.08, 'triangle', 0.05); }, 55); }
  function sHit(){ tone(180, 0.28, 'sawtooth', 0.06, 55); }

  /* Silent (but valid) clip for the engine's own loadSounds(). */
  var SILENT = 'data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
  function injectSilentAudio(){
    var tpl = document.getElementById('audio-resources');
    if(!tpl || !tpl.content) return;
    ['offline-sound-press','offline-sound-hit','offline-sound-reached'].forEach(function(id){
      var el = tpl.content.getElementById(id); if(el) el.src = SILENT;
    });
  }

  /* ---------- difficulty ---------- */
  var DIFF = {
    easy:   { SPEED:5,   ACCELERATION:0.0007, MAX_SPEED:11 },
    normal: { SPEED:6,   ACCELERATION:0.001,  MAX_SPEED:13 },
    hard:   { SPEED:7.5, ACCELERATION:0.0016, MAX_SPEED:16 }
  };
  var diff = DIFF[get('dino_diff','normal')] ? get('dino_diff','normal') : 'normal';
  function applyDifficulty(){
    var r = window.Runner, inst = r && r.instance_; if(!r) return;
    var d = DIFF[diff];
    ['SPEED','ACCELERATION','MAX_SPEED'].forEach(function(k){ r.config[k] = d[k]; if(inst) inst.config[k] = d[k]; });
    if(inst && !inst.playing){ inst.currentSpeed = d.SPEED; inst.setSpeed(d.SPEED); }
  }

  /* ---------- score / coins state ---------- */
  var best = parseInt(get('dino_best','0'), 10) || 0;
  var coins = 0;
  var coinList = [];
  var coinTimer = 1500;
  var COIN_R = 7;

  function digits(n){ return String(Math.max(0, n|0)).padStart(5, '0'); }
  function score(){ var i = Runner.instance_; return i ? i.distanceMeter.getActualDistance(Math.ceil(i.distanceRan)) : 0; }

  function seedBest(){
    var i = Runner.instance_; if(!i) return;
    i.highestScore = Math.round(best / 0.025);
    i.distanceMeter.setHighScore(i.highestScore);
  }

  /* ---------- coin layer (drawn on the engine canvas in logical space) ---------- */
  function updateCoins(dt){
    var i = Runner.instance_;
    if(!i || !i.playing || !i.canvasCtx) return;
    var ctx = i.canvasCtx, trex = i.tRex;

    if(i.activated){
      coinTimer -= dt;
      if(coinTimer <= 0){
        coinTimer = 1400 + Math.random() * 2400;
        var ys = [98, 72, 46];
        coinList.push({ x: Runner.defaultDimensions.WIDTH + 20, y: ys[(Math.random()*ys.length)|0] });
      }
    }

    var move = Math.floor(i.currentSpeed * (60/1000) * dt);
    for(var k = coinList.length - 1; k >= 0; k--){
      var co = coinList[k];
      co.x -= move;
      // draw
      ctx.save();
      ctx.beginPath(); ctx.arc(co.x, co.y, COIN_R, 0, Math.PI*2);
      ctx.fillStyle = '#f5b301'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#b97e00'; ctx.stroke();
      ctx.fillStyle = '#fff3cf'; ctx.fillRect(co.x - 1, co.y - 3, 2, 6);
      ctx.restore();
      // collect
      var w = trex.config.WIDTH, h = trex.config.HEIGHT;
      if(co.x > trex.xPos + 2 && co.x < trex.xPos + w - 2 && co.y > trex.yPos && co.y < trex.yPos + h){
        coins++; i.distanceRan += 200; sCoin(); flashCoins(); coinList.splice(k, 1); continue;
      }
      if(co.x < -20) coinList.splice(k, 1);
    }
  }
  function resetCoins(){ coinList = []; coins = 0; coinTimer = 1500; }

  /* ---------- HUD ---------- */
  var elCur, elBest, elCoins, coinWrap;
  function refreshHUD(){
    if(elCur) elCur.textContent = digits(score());
    if(elBest) elBest.textContent = digits(best);
    if(elCoins) elCoins.textContent = coins;
  }
  function flashCoins(){
    refreshHUD();
    if(!coinWrap) return;
    coinWrap.classList.remove('flash'); void coinWrap.offsetWidth; coinWrap.classList.add('flash');
  }

  /* ---------- overlays + game-over ---------- */
  function spawnConfetti(host){
    var marks = ['🎉','✨','🎊','⭐','🏆'];
    host.innerHTML = '';
    for(var n = 0; n < 16; n++){
      var s = document.createElement('span');
      s.textContent = marks[(Math.random()*marks.length)|0];
      s.style.left = (Math.random()*100) + '%';
      s.style.animationDelay = (Math.random()*0.4) + 's';
      s.style.fontSize = (12 + Math.random()*12) + 'px';
      host.appendChild(s);
    }
  }

  function wire(){
    var startOv = document.getElementById('start');
    var overOv  = document.getElementById('over');
    elCur   = document.getElementById('cur');
    elBest  = document.getElementById('best');
    elCoins = document.getElementById('coins');
    coinWrap= document.querySelector('.coinwrap');
    var finalEl = document.getElementById('final');
    var finalBest = document.getElementById('final-best');
    var finalCoins = document.getElementById('final-coins');
    var overTitle = document.getElementById('over-title');
    var confetti = document.getElementById('confetti');

    /* difficulty buttons */
    document.querySelectorAll('.diff').forEach(function(b){
      if(b.getAttribute('data-d') === diff){ document.querySelectorAll('.diff').forEach(function(x){x.classList.remove('on');}); b.classList.add('on'); }
      b.addEventListener('click', function(e){
        e.stopPropagation();
        diff = b.getAttribute('data-d'); set('dino_diff', diff);
        document.querySelectorAll('.diff').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on'); applyDifficulty();
      });
    });

    /* dismiss start overlay on first control input */
    var started = false;
    function dismissStart(){ if(started) return; started = true; startOv.classList.add('hidden'); ac(); }
    window.addEventListener('keydown', function(e){ if(e.keyCode === 32 || e.keyCode === 38) dismissStart(); });
    window.addEventListener('pointerdown', function(e){ if(!e.target.closest('.diff') && !e.target.closest('.tool')) dismissStart(); });

    /* tools */
    var muteBtn = document.getElementById('mute');
    var themeBtn = document.getElementById('theme');
    function renderMute(){ muteBtn.textContent = muted ? '🔇' : '🔊'; muteBtn.classList.toggle('off', muted); }
    function toggleMute(){ muted = !muted; set('dino_muted', muted?'1':'0'); renderMute(); if(!muted) ac(); }
    muteBtn.addEventListener('click', toggleMute); renderMute();

    var dark = get('dino_dark','0') === '1';
    function renderTheme(){ document.body.classList.toggle('theme-dark', dark); themeBtn.textContent = dark ? '☀️' : '🌙'; }
    function toggleTheme(){ dark = !dark; set('dino_dark', dark?'1':'0'); renderTheme(); }
    themeBtn.addEventListener('click', toggleTheme); renderTheme();

    /* keyboard shortcuts */
    window.addEventListener('keydown', function(e){
      var k = (e.key||'').toLowerCase();
      if(k === 'm') toggleMute();
      else if(k === 'd') toggleTheme();
      else if(e.keyCode === 27) location.reload(); // Esc = exit
    });

    /* game-over polling (crash / restart) */
    var wasCrashed = false;
    setInterval(function(){
      var i = window.Runner && Runner.instance_;
      if(!i) return;
      if(i.crashed && !wasCrashed){
        wasCrashed = true;
        sHit();
        var dist = score();
        var isBest = dist > best;
        if(isBest){ best = dist; set('dino_best', String(best)); seedBest(); }
        finalEl.textContent = digits(dist);
        finalBest.textContent = digits(best);
        finalCoins.textContent = coins;
        overTitle.textContent = isBest ? 'New best! 🎉' : 'Game over';
        overOv.classList.toggle('celebrate', isBest);
        if(isBest) spawnConfetti(confetti); else confetti.innerHTML = '';
        overOv.classList.remove('hidden');
        refreshHUD();
      } else if(!i.crashed && wasCrashed){
        wasCrashed = false; overOv.classList.add('hidden'); resetCoins(); refreshHUD();
      }
    }, 100);

    document.getElementById('replay').addEventListener('click', function(){
      var i = Runner.instance_; if(i && i.crashed){ resetCoins(); i.restart(); }
      overOv.classList.add('hidden');
    });
    document.getElementById('exit').addEventListener('click', function(){ location.reload(); });
  }

  /* ---------- per-frame hook (coins + jump/point sounds + HUD) ---------- */
  function hookFrame(){
    var i = Runner.instance_; if(!i) return;
    var orig = i.update.bind(i);
    var last = performance.now();
    var wasJump = false, lastHundred = 0;
    i.update = function(){
      orig();
      var now = performance.now(), dt = Math.min(now - last, 40); last = now;
      if(i.playing && !i.crashed){
        updateCoins(dt);
        var j = i.tRex && i.tRex.jumping;
        if(j && !wasJump) sJump();
        wasJump = j;
        var sc = score(), hun = Math.floor(sc/100);
        if(hun > lastHundred){ sPoint(); }
        lastHundred = hun;
      } else {
        wasJump = false;
      }
      refreshHUD();
    };
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', function(){
    injectSilentAudio();
    new Runner('.interstitial-wrapper'); // eslint-disable-line no-new
    applyDifficulty();
    seedBest();
    hookFrame();
    wire();
    refreshHUD();
  });
})();
