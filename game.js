/* ============================================================================
 * SHINOBI DUEL — 2D Sekiro-inspired combat prototype (original IP)
 * Single-file HTML5 Canvas game. No dependencies, no build step.
 *
 * HOW TO TUNE: every gameplay number lives in CFG below. Timing windows are
 * in milliseconds, speeds in px/sec, damages in flat points.
 * ========================================================================== */
'use strict';

/* ------------------------------------------------------------------ CFG */
const CFG = {
  // --- canvas / world ---
  W: 1280, H: 720,
  FLOOR_Y: 600,            // y of the ground
  WALL_L: 60, WALL_R: 1220,

  // --- deflect timing (ms before the enemy hit lands) ---
  DEFLECT_PERFECT_MS: 180, // <= this  -> PERFECT deflect
  DEFLECT_PARTIAL_MS: 300, // <= this  -> partial (chip). Beyond -> full hit
  DEFLECT_ACTIVE_MS: 350,  // how long the deflect stance stays up per press

  // --- posture ---
  POSTURE_MAX: 100,
  POSTURE_DRAIN_DELAY_MS: 1000, // posture only starts draining after this long
  PLAYER_POSTURE_DRAIN: 45,     // posture points drained per second
  ENEMY_POSTURE_DRAIN: 30,
  PERFECT_ENEMY_POSTURE: 35,    // posture dmg to enemy on perfect deflect
  PARTIAL_ENEMY_POSTURE: 10,
  PARTIAL_PLAYER_POSTURE: 10,
  ENEMY_HIT_PLAYER_POSTURE: 25, // posture dmg to player on a clean hit
  PLAYER_HIT_ENEMY_POSTURE: [8, 9, 14], // per swing of the 3-hit chain
  STAGGER_WINDOW_MS: 2500,      // deathblow window once staggered

  // --- health ---
  PLAYER_HP: 100,
  ENEMY_HP: 150,
  ENEMY_HIT_DAMAGE: 18,         // clean enemy hit
  PARTIAL_CHIP_DAMAGE: 5,       // chip through a partial deflect

  // --- player attack chain: 3 swings ---
  // startup/active/recover in ms, dmg flat, range px
  ATTACKS: [
    { startup: 110, active: 110, recover: 170, dmg: 12, range: 102 },
    { startup:  90, active: 100, recover: 170, dmg: 12, range: 102 },
    { startup: 130, active: 120, recover: 260, dmg: 16, range: 112 },
  ],
  CHAIN_WINDOW_MS: 420,         // press attack again within this after a swing
  PLAYER_HITSTOP_MS: 55,        // freeze on landing a normal hit

  // --- movement ---
  PLAYER_RUN_SPEED: 340,
  PLAYER_AIR_CONTROL: 0.65,
  PLAYER_JUMP_VEL: -780,
  GRAVITY: 2300,
  COYOTE_MS: 100,
  JUMP_BUFFER_MS: 120,
  ENEMY_RUN_SPEED: 205,
  ENGAGE_RANGE: 88,             // enemy stops to attack inside this distance

  // --- enemy brain ---
  ENEMY_WINDUP_MS: 400,         // telegraph before a strike (spec: 400ms white flash)
  ENEMY_STRIKE_HIT_AT_MS: 60,   // the hit "lands" this far into the strike
  ENEMY_STRIKE_ACTIVE_MS: 120,
  ENEMY_RECOVER_MIN_MS: 450,
  ENEMY_RECOVER_MAX_MS: 800,
  ENEMY_THINK_MIN_MS: 250,      // pause before committing to an attack
  ENEMY_THINK_MAX_MS: 550,
  ENEMY_DOUBLE_CHANCE: 0.25,    // chance of a second slash after the first
  ENEMY_BACKSTEP_CHANCE: 0.25,  // chance to hop back instead of pressing
  ENEMY_BACKSTEP_DIST: 130,

  // --- feel ---
  HITSTOP_PERFECT_MS: 140,
  HITSTOP_DEATHBLOW_MS: 750,
  SHAKE_HIT: 5,
  SHAKE_PERFECT: 3,
  SHAKE_DEATHBLOW: 11,
  PLAYER_HITSTUN_MS: 320,
  PLAYER_STAGGER_MS: 1200,      // player vulnerable window at full posture

  // --- perilous attacks (Kurenai boss AI, Phase 3) ---
  PERILOUS_WINDUP_MS: 420,     // red-flash warning; impact 80ms into the strike = 500ms total
  PERILOUS_HIT_AT_MS: 80,      // perilous impact lands this far into the strike
  PERILOUS_STRIKE_MS: 300,     // total perilous strike duration
  MIKIRI_POSTURE: 25,          // thrust deflected at the last instant -> boss posture dmg
  SWEEP_DAMAGE: 18, SWEEP_POSTURE: 12,
  GRAB_DAMAGE: 40, GRAB_RANGE: 150,   // grab: phase 2 only, close range
  LEAP_HEAVY_DAMAGE: 28, LEAP_HEAVY_POSTURE: 20, // phase 2 leaping heavy (normal, deflectable)
  PHASE2_SPEED_MUL: 1.25,
  BOSS_PIPS: 2,                // two deathblows: first -> phase 2, second -> kill
  PERILOUS_RECOVER_MIN_MS: 650, // long recover after a perilous = the punish window
  PERILOUS_RECOVER_MAX_MS: 950,
  P1_PERILOUS_CHANCE: 0.25,    // phase 1: occasional sweep / single thrusts
  P2_PERILOUS_CHANCE: 0.38,    // phase 2: sweep/thrust mix-ups off the same red flash
  P2_LEAP_CHANCE: 0.22,        // phase 2: new leaping heavy
  P2_GRAB_CHANCE: 0.35,        // of phase-2 perilous picks at close range
  // --- resurrection (spec: one per attempt, revive in place at 50% HP) ---
  RESURRECT_WINDOW_MS: 2500,   // time to choose resurrection before death is final
  RESURRECT_INVULN_MS: 1200,   // brief invulnerability after rising
};

/* --------------------------------------------- ART (visual only) ----------
 * Painted plates in assets/ (1920x1080). The canvas is 1280x720; plates are
 * drawn with horizontal overscan so parallax never exposes an edge.
 * NOTHING here affects gameplay: no timings, damages, ranges, or AI.
 * ------------------------------------------------------------------------ */
const ART = {
  SCALE: 1408 / 1920,   // plate -> canvas scale (includes overscan)
  OX: -64,              // overscan draw offset x
  SKY_DY: -36,          // overscan draw offset y (sky)
  MID_LIFT: 103,        // mid layer shifted up ~140 plate px (lantern tops clear the horizon)
  GROUND_TOP: 400,      // horizon line, canvas y
  GROUND_SRC_Y: 600, GROUND_SRC_H: 480,  // plate crop for the ground strip
  CAM_MAX: 30,          // subtle camera drift range, px
  MOON_PX: 1330, MOON_PY: 390,          // moon center, plate coords (shimmer halo)
  // lantern window positions, plate coords (code glow sprites; lanterns are unlit in the plate)
  LANTERNS: [[228, 585], [398, 678], [1585, 862], [1712, 868]],
};

/* ------------------------------------------------------------- utilities */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function dist1D(a, b) { return Math.abs(a.x - b.x); }

/* ------------------------------------------- pure combat logic (testable) */
/**
 * Resolve a deflect attempt. dtMs = ms between the deflect press and the
 * moment the enemy hit lands. Returns 'perfect' | 'partial' | 'hit'.
 */
function resolveDeflect(dtMs) {
  if (!(dtMs >= 0) || dtMs > CFG.DEFLECT_PARTIAL_MS) return 'hit';
  if (dtMs <= CFG.DEFLECT_PERFECT_MS) return 'perfect';
  return 'partial';
}

/**
 * Posture drain. Posture only drains once POSTURE_DRAIN_DELAY_MS have passed
 * since the last posture damage; then it drains linearly.
 */
function applyPostureDrain(posture, msSinceDamage, drainPerSec) {
  const idle = msSinceDamage - CFG.POSTURE_DRAIN_DELAY_MS;
  if (idle <= 0) return posture;
  return Math.max(0, posture - drainPerSec * (idle / 1000));
}

/* ============================================================================
 * AUDIO — tiny WebAudio synth. No assets; every sound is synthesized.
 * The context is created lazily on the first user gesture (mobile policy).
 * ========================================================================== */
const AudioSys = {
  ctx: null,
  master: null,

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { /* audio unavailable — game still runs */ }
  },

  now() { return this.ctx ? this.ctx.currentTime : 0; },

  // Short filtered noise burst (swings, sparks).
  noise(dur, filterFreq, type, gain, sweepTo) {
    if (!this.ctx) return;
    const t = this.now();
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  },

  // Simple oscillator blip with pitch + gain envelopes.
  tone(freq, dur, type, gain, slideTo, delay) {
    if (!this.ctx) return;
    const t = this.now() + (delay || 0);
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  swing()      { this.noise(0.12, 2600, 'bandpass', 0.25, 700); },
  swingHeavy() { this.noise(0.16, 1800, 'bandpass', 0.3, 500); },

  // Perfect deflect: bright metallic clang (detuned partials + click).
  clang() {
    this.tone(1244, 0.28, 'square', 0.10);
    this.tone(1866, 0.22, 'square', 0.07);
    this.tone(2493, 0.16, 'triangle', 0.09);
    this.noise(0.05, 6000, 'highpass', 0.22);
  },
  // Partial deflect: duller, woodier block.
  block() {
    this.tone(420, 0.12, 'triangle', 0.22, 180);
    this.noise(0.07, 1800, 'bandpass', 0.18);
  },
  // Clean hit landing on flesh.
  thud() {
    this.tone(130, 0.16, 'sine', 0.5, 55);
    this.noise(0.08, 900, 'lowpass', 0.25);
  },
  hurt() { this.tone(220, 0.18, 'sawtooth', 0.16, 90); },

  // Telegraph cue: rising "ting" as the enemy commits.
  telegraph() {
    this.tone(880, 0.09, 'sine', 0.10, 1320);
  },
  // Perilous warning: low two-tone alarm under the red flash.
  dangerCue() {
    this.tone(196, 0.18, 'sawtooth', 0.13, 130);
    this.tone(147, 0.24, 'sawtooth', 0.11, 98, 0.14);
  },
  // Stagger: shimmering break.
  staggerCue() {
    this.tone(660, 0.3, 'sine', 0.12, 1320);
    this.tone(990, 0.3, 'sine', 0.08, 1980, 0.05);
  },
  // Deathblow: deep boom + shimmer.
  deathblow() {
    this.tone(70, 0.7, 'sine', 0.55, 34);
    this.noise(0.4, 3000, 'highpass', 0.12, 800);
    this.tone(1568, 0.5, 'sine', 0.07, 2093, 0.08);
  },
  jump() { this.noise(0.08, 1200, 'bandpass', 0.10, 2400); },
  land() { this.noise(0.06, 500, 'lowpass', 0.12); },
  step() { this.noise(0.03, 700, 'lowpass', 0.05); },
  uiTap() { this.tone(660, 0.06, 'sine', 0.12); },
};

/* ============================================================================
 * INPUT — unified keyboard + mouse + touch.
 * Touch buttons are drawn on-canvas (see UI section) and hit-tested here.
 * Multi-touch is tracked by pointer identifier so two thumbs work at once.
 * ========================================================================== */
const Input = {
  left: false, right: false,
  // edge-triggered buffers with timestamps (ms, performance.now based)
  attackBuf: -1e9, deflectBuf: -1e9, jumpBuf: -1e9,
  anyPressBuf: -1e9, // any button — used to dismiss DEATH / VICTORY screens
  touchMode: false,  // becomes true once a touch is seen
  // touch button geometry is filled in by the UI layer (canvas coords)
  buttons: [],       // {id, x, y, r, label, sub}
  activeTouches: {}, // touchId -> button id

  pressAttack(now) { this.attackBuf = now; this.anyPressBuf = now; },
  pressDeflect(now) { this.deflectBuf = now; this.anyPressBuf = now; },
  pressJump(now) { this.jumpBuf = now; this.anyPressBuf = now; },

  // Consume a buffered press if it is still fresh (for input buffering).
  consume(bufName, now, windowMs) {
    if (now - this[bufName] <= windowMs) { this[bufName] = -1e9; return true; }
    return false;
  },

  init(canvas, toCanvas) {
    const now = () => performance.now();
    AudioSys.unlock();

    // ---- keyboard ----
    const keyState = {};
    window.addEventListener('keydown', (e) => {
      AudioSys.unlock();
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      keyState[k] = true;
      if (k === 'j') this.pressAttack(now());
      else if (k === 'k') this.pressDeflect(now());
      else if (k === ' ') { this.pressJump(now()); e.preventDefault(); }
      else this.anyPressBuf = now();
      this.updateHeld(keyState);
    });
    window.addEventListener('keyup', (e) => {
      keyState[e.key.toLowerCase()] = false;
      this.updateHeld(keyState);
    });
    this.updateHeld = (ks) => {
      this.left = !!(ks['a'] || ks['arrowleft']);
      this.right = !!(ks['d'] || ks['arrowright']);
    };

    // ---- mouse: left click = attack, right click = deflect ----
    canvas.addEventListener('mousedown', (e) => {
      AudioSys.unlock();
      if (e.button === 0) this.pressAttack(now());
      else if (e.button === 2) this.pressDeflect(now());
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // ---- touch ----
    const btnAt = (cx, cy) => {
      for (const b of this.buttons) {
        const dx = cx - b.x, dy = cy - b.y;
        if (dx * dx + dy * dy <= b.r * b.r) return b;
      }
      return null;
    };
    const handleStart = (e) => {
      e.preventDefault();
      AudioSys.unlock();
      this.touchMode = true;
      const t = now();
      for (const ch of e.changedTouches) {
        const p = toCanvas(ch.clientX, ch.clientY);
        const b = btnAt(p.x, p.y);
        if (b) {
          this.activeTouches[ch.identifier] = b.id;
          b.pressed = true;
          if (b.id === 'left' || b.id === 'right') {
            if (b.id === 'left') this.left = true; else this.right = true;
          } else if (b.id === 'attack') this.pressAttack(t);
          else if (b.id === 'deflect') this.pressDeflect(t);
          else if (b.id === 'jump') this.pressJump(t);
        } else {
          // tap anywhere else: attack (feels natural on phones)
          this.pressAttack(t);
        }
      }
    };
    const handleEnd = (e) => {
      e.preventDefault();
      for (const ch of e.changedTouches) {
        const id = this.activeTouches[ch.identifier];
        if (id) {
          delete this.activeTouches[ch.identifier];
          const b = this.buttons.find((x) => x.id === id);
          if (b) b.pressed = false;
          if (id === 'left' || id === 'right') {
            // recompute held state from remaining touches
            this.left = this.right = false;
            for (const k in this.activeTouches) {
              const bid = this.activeTouches[k];
              if (bid === 'left') this.left = true;
              if (bid === 'right') this.right = true;
            }
          }
        }
      }
    };
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchend', handleEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleEnd, { passive: false });
    // Some desktop browsers emulate touch; also enable when coarse pointer.
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      this.touchMode = true;
    }
  },
};

/* ============================================================================
 * PARTICLES & FLOATING TEXT
 * ========================================================================== */
const Particles = {
  list: [],
  spawn(p) { if (this.list.length < 400) this.list.push(Object.assign({ t: 0 }, p)); },

  // Radiating spark streaks (deflects, hits).
  sparks(x, y, n, color, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (speed || 420) * rand(0.4, 1.1);
      this.spawn({
        kind: 'spark', x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120,
        life: rand(0.25, 0.55), color: color || '#F4F1E4',
      });
    }
  },
  // Soft dust puff (landing, footsteps, backsteps). Palette: cloud light at 40%.
  dust(x, y, n) {
    for (let i = 0; i < (n || 8); i++) {
      this.spawn({
        kind: 'dust', x: x + rand(-14, 14), y: y + rand(-4, 4),
        vx: rand(-90, 90), vy: rand(-140, -20),
        life: rand(0.4, 0.8), color: 'rgba(143,163,196,0.4)',
      });
    }
  },
  // Drifting cherry petals — ambient, always alive.
  petal() {
    this.spawn({
      kind: 'petal', x: rand(0, CFG.W), y: -12,
      vx: rand(-40, -10), vy: rand(40, 90),
      life: rand(6, 10), color: '#E8B4C8', sway: rand(0, 6.28),
    });
  },
  // Petal burst (e.g. red petals on deathblow).
  petalBurst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(120, 420);
      this.spawn({
        kind: 'rpetal', x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160,
        life: rand(0.7, 1.1), color: color || '#E8B4C8', sway: rand(0, 6.28),
      });
    }
  },
  // Expanding ring (perfect deflect shockwave, posture-break).
  ring(x, y, color, maxR, life) {
    this.spawn({ kind: 'ring', x, y, life: life || 0.35, color: color || '#F4F1E4', maxR: maxR || 90 });
  },
  // Blade-clash flash: brief bright arc along the parry plane.
  arcFlash(x, y) {
    this.spawn({ kind: 'arcflash', x, y, life: 0.09, color: '#F4F1E4' });
  },
  // Ink slash across a deathblow victim.
  slashArc(x, y, r) {
    this.spawn({ kind: 'slash', x, y, life: 0.5, color: '#05070F', maxR: r || 90 });
  },

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      if (p.t >= p.life) { this.list.splice(i, 1); continue; }
      if (p.kind === 'spark') { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      else if (p.kind === 'dust') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; }
      else if (p.kind === 'petal') {
        p.sway += dt * 2; p.x += (p.vx + Math.sin(p.sway) * 30) * dt; p.y += p.vy * dt;
      }
      else if (p.kind === 'rpetal') {
        p.sway += dt * 3; p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      }
    }
    // keep ambient petals coming
    if (Math.random() < 0.25 && this.list.filter((p) => p.kind === 'petal').length < 40) this.petal();
  },

  draw(ctx) {
    for (const p of this.list) {
      const k = 1 - p.t / p.life;
      if (p.kind === 'spark') {
        ctx.strokeStyle = p.color; ctx.globalAlpha = k; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
      } else if (p.kind === 'dust') {
        ctx.fillStyle = p.color; ctx.globalAlpha = k * 0.7;
        ctx.beginPath(); ctx.arc(p.x, p.y, 6 * (1 - k * 0.5), 0, 6.29); ctx.fill();
      } else if (p.kind === 'petal') {
        ctx.fillStyle = p.color; ctx.globalAlpha = 0.75;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.sway);
        ctx.beginPath(); ctx.ellipse(0, 0, 5, 3, 0, 0, 6.29); ctx.fill(); ctx.restore();
      } else if (p.kind === 'rpetal') {
        ctx.fillStyle = p.color; ctx.globalAlpha = Math.min(1, k * 2);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.sway);
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.5, 0, 0, 6.29); ctx.fill(); ctx.restore();
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = p.color; ctx.globalAlpha = k; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.maxR * (1 - k * k), 0, 6.29); ctx.stroke();
      } else if (p.kind === 'arcflash') {
        ctx.strokeStyle = p.color; ctx.globalAlpha = k * k; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(p.x, p.y, 36, -1.25, 1.25); ctx.stroke();
      } else if (p.kind === 'slash') {
        ctx.strokeStyle = p.color; ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.lineWidth = 2 + 13 * k; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.maxR * (0.55 + 0.45 * (1 - k)), -0.7, 1.05); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  },
  clear() { this.list.length = 0; },
};

const FloatText = {
  list: [],
  add(x, y, str, color, size) {
    this.list.push({ x, y, str, color: color || '#F4F1E4', size: size || 30, t: 0, life: 0.9 });
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i]; f.t += dt; f.y -= 46 * dt;
      if (f.t >= f.life) this.list.splice(i, 1);
    }
  },
  draw(ctx) {
    ctx.textAlign = 'center';
    for (const f of this.list) {
      const k = 1 - f.t / f.life;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `600 ${f.size}px system-ui, sans-serif`;
      ctx.fillStyle = f.color;
      ctx.fillText(f.str, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  },
  clear() { this.list.length = 0; },
};

/* ============================================================================
 * SCENE — painted parallax backdrop.
 * Three AI-painted plates (assets/bg_*.png), drawn per STYLE_GUIDE.md:
 *   sky    full-frame,                        parallax 0.15
 *   mid    full-frame, shifted up (lantern tops clear the horizon), parallax 0.45
 *   ground bottom strip (plate y 600-1080 -> canvas y 400-720),     parallax 1.0
 * The lanterns in the mid plate are unlit: warm glow sprites are added in
 * code (additive blend, slow flicker) per the guide's lantern recipe.
 * If the plates haven't loaded yet (or Image is unavailable, e.g. in Node),
 * a simple moonlit gradient fallback is drawn instead — never a black frame.
 * ========================================================================== */
const BG = {
  sky: null, mid: null, ground: null,
  loaded: 0, ready: false,
  load() {
    if (typeof Image === 'undefined') return; // Node / tests: no image loading
    const files = [
      ['sky', 'assets/bg_sky.png'],
      ['mid', 'assets/bg_mid.png'],
      ['ground', 'assets/bg_ground.png'],
    ];
    for (const [key, src] of files) {
      const img = new Image();
      img.onload = () => { BG.loaded++; if (BG.loaded === 3) BG.ready = true; };
      img.onerror = () => { BG.loaded++; if (BG.loaded === 3) BG.ready = true; };
      img.src = src;
      BG[key] = img;
    }
  },
};

/* ==========================================================================
 * Painted sprite fighters (assets/sprites/). Replaces the old limb-drawn
 * stick figures. 12 frames per sheet, row-major:
 * idle, walkA, walkB, attack1, attack2, attack3,
 * deflect, windup, stagger, kneel, down, jump.
 * Sprites face RIGHT in the sheets; flipped when f.dir is left.
 * Feet-anchoring: per-frame foot-center offsets (ax, sheet px from the
 * tight-box left) keep f.x/f.y exactly where the logic thinks it is.
 * If the sheets fail to load, the game falls back to the old procedural
 * drawing (drawProceduralFighter) - never a broken frame.
 * ========================================================================== */
const SPR = {
  player: null, boss: null,
  loaded: 0, ready: false, ok: false,
  load() {
    if (typeof Image === 'undefined') return; // Node / tests: no image loading
    let good = 0;
    const files = [
      ['player', 'assets/sprites/player.png'],
      ['boss', 'assets/sprites/boss.png'],
    ];
    const next = () => {
      SPR.loaded++;
      if (SPR.loaded === files.length) { SPR.ready = true; SPR.ok = (good === files.length); }
    };
    for (const [key, src] of files) {
      const img = new Image();
      img.onload = () => { good++; next(); };
      img.onerror = () => { next(); };
      img.src = src;
      SPR[key] = img;
    }
  },
};

// Per-frame tight boxes + foot-center anchors (sheet pixels).
// Generated from assets/sprites/frames.json + pixel analysis of the sheets.
const SPRITE_FRAMES = {"player":{"idle":{"tx":125,"ty":16,"tw":295,"th":432,"ax":109.2},"walkA":{"tx":527,"ty":12,"tw":327,"th":436,"ax":131.5},"walkB":{"tx":929,"ty":15,"tw":415,"th":433,"ax":170.3},"attack1":{"tx":1344,"ty":60,"tw":428,"th":381,"ax":140.5},"attack2":{"tx":43,"ty":448,"tw":405,"th":448,"ax":220.9},"attack3":{"tx":448,"ty":448,"tw":436,"th":448,"ax":241.5},"deflect":{"tx":963,"ty":448,"tw":377,"th":448,"ax":139.5},"windup":{"tx":1407,"ty":498,"tw":293,"th":396,"ax":153.9},"stagger":{"tx":83,"ty":896,"tw":365,"th":429,"ax":186.1},"kneel":{"tx":448,"ty":896,"tw":448,"th":431,"ax":239.0},"down":{"tx":896,"ty":896,"tw":448,"th":428,"ax":224.0},"jump":{"tx":1344,"ty":901,"tw":334,"th":346,"ax":187.2}},"boss":{"idle":{"tx":42,"ty":2,"tw":406,"th":424,"ax":171.5},"walkA":{"tx":517,"ty":4,"tw":404,"th":422,"ax":176.7},"walkB":{"tx":977,"ty":6,"tw":463,"th":420,"ax":210.1},"attack1":{"tx":1440,"ty":38,"tw":472,"th":388,"ax":150.7},"attack2":{"tx":26,"ty":426,"tw":454,"th":427,"ax":179.5},"attack3":{"tx":480,"ty":426,"tw":480,"th":427,"ax":238.7},"deflect":{"tx":960,"ty":426,"tw":468,"th":427,"ax":231.7},"windup":{"tx":1497,"ty":426,"tw":338,"th":427,"ax":156.7},"stagger":{"tx":41,"ty":853,"tw":366,"th":424,"ax":223.5},"kneel":{"tx":504,"ty":853,"tw":456,"th":399,"ax":169.5},"down":{"tx":960,"ty":853,"tw":480,"th":352,"ax":240.0},"jump":{"tx":1440,"ty":853,"tw":424,"th":412,"ax":202.3}}};

// On-canvas sprite scale. Player idle is 432px tall in-sheet -> ~151px.
// Boss keeps the 1.25x visual scale it always had (purely visual).
const SPR_SCALE = 0.35;

function spriteSheetFor(f) { return f.isPlayer ? 'player' : 'boss'; }

// Pure function: fighter state -> sprite frame name. No drawing.
function spriteFrameFor(f) {
  switch (f.state) {
    case 'run':
    case 'approach':
      return (Math.floor(f.animT * 13 / Math.PI) % 2 === 0) ? 'walkA' : 'walkB';
    case 'jump': return 'jump';
    case 'attack': return (f.chain === 1) ? 'attack2' : (f.chain === 2) ? 'attack3' : 'attack1';
    case 'deflect': return 'deflect';
    case 'aim': return 'idle';
    case 'windup': return 'windup';
    case 'strike':
      return (f.attack && f.attack.type === 'leapHeavy') ? 'attack3' : 'attack1';
    case 'perilousWindup': return 'windup';
    case 'perilousStrike': {
      const at = f.attack ? f.attack.type : 'sweep';
      return (at === 'sweep') ? 'attack2' : (at === 'thrust') ? 'attack1' : 'attack3';
    }
    case 'backstep': return 'walkB';
    case 'recover': return 'idle';
    case 'hitstun': return 'stagger';
    case 'staggered': return 'kneel';
    case 'dead': return 'down';
    case 'idle':
    default: return 'idle';
  }
}

// Draw the fighter from the sprite sheet. Feet-anchored: the foot-center
// (ax) lands exactly on f.x and the tight-box bottom on f.y, in every frame.
function drawSpriteFighter(ctx, f) {
  const dir = f.dir;
  const sheet = spriteSheetFor(f);
  const img = SPR[sheet];
  const sc = SPR_SCALE * (f.isPlayer ? 1 : 1.25);

  ctx.save();
  // Moonlit halo behind the fighter (same as the old path - readability).
  const haloY = f.y - (f.isPlayer ? 80 : 100);
  const halo = ctx.createRadialGradient(f.x, haloY, 10, f.x, haloY, 115);
  halo.addColorStop(0, 'rgba(244,241,228,0.12)');
  halo.addColorStop(1, 'rgba(244,241,228,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.ellipse(f.x, haloY, 115, 88, 0, 0, 6.29); ctx.fill();

  // Soft contact shadow on the ground.
  ctx.fillStyle = 'rgba(5,7,15,0.45)';
  ctx.beginPath(); ctx.ellipse(f.x, f.y + 6, f.isPlayer ? 34 : 42, 8, 0, 0, 6.29); ctx.fill();

  const frame = spriteFrameFor(f);
  const g = SPRITE_FRAMES[sheet][frame];

  if (f.state === 'dead') {
    // 'down' is a lying figure: draw centered, fading out. Same timing as before.
    ctx.globalAlpha = Math.max(0.25, 1 - f.deadT / 2400);
    ctx.save();
    ctx.translate(f.x, f.y - 10);
    ctx.scale(dir * sc, sc);
    blit(ctx, img, g.tx, g.ty, g.tw, g.th, -g.ax, -g.th, g.tw, g.th);
    ctx.restore();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(dir * sc, sc);
  blit(ctx, img, g.tx, g.ty, g.tw, g.th, -g.ax, -g.th, g.tw, g.th);
  ctx.restore();
  ctx.restore();
}

// drawImage guarded so headless test contexts (no drawImage) still run.
function blit(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
  if (ctx.drawImage) ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

const Scene = {
  // Sky layer in screen space. ox/oy = parallax + shake offsets.
  drawSky(ctx, ox, oy, time) {
    const s = ART.SCALE, dw = 1920 * s, dh = 1080 * s;
    blit(ctx, BG.sky, 0, 0, 1920, 1080, ART.OX + ox, ART.SKY_DY + oy, dw, dh);
    // moon shimmer: faint slow-pulsing halo over the painted moon
    const mx = ART.MOON_PX * s + ART.OX + ox;
    const my = ART.MOON_PY * s + ART.SKY_DY + oy;
    const pulse = 0.10 + 0.035 * Math.sin(time * 0.9);
    const halo = ctx.createRadialGradient(mx, my, 40, mx, my, 210);
    halo.addColorStop(0, 'rgba(244,241,228,' + pulse.toFixed(3) + ')');
    halo.addColorStop(1, 'rgba(244,241,228,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(mx, my, 210, 0, 6.29); ctx.fill();
  },

  // Mid layer in screen space: silhouettes + code lantern glows.
  drawMid(ctx, ox, oy, time) {
    const s = ART.SCALE, dw = 1920 * s, dh = 1080 * s;
    blit(ctx, BG.mid, 0, 0, 1920, 1080, ART.OX + ox, ART.SKY_DY - ART.MID_LIFT + oy, dw, dh);
    // lantern glow recipe: warm radial sprite, additive blend, 3s flicker ±8%
    const flick = 1 + 0.08 * Math.sin(time * (Math.PI * 2 / 3));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [px, py] of ART.LANTERNS) {
      const x = px * s + ART.OX + ox;
      const y = py * s + ART.SKY_DY - ART.MID_LIFT + oy;
      const r = 120;
      const g = ctx.createRadialGradient(x, y, 6, x, y, r);
      g.addColorStop(0, 'rgba(245,165,36,' + (0.55 * flick).toFixed(3) + ')');
      g.addColorStop(0.45, 'rgba(224,123,31,' + (0.28 * flick).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(224,123,31,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
    }
    ctx.restore();
  },

  // Ground strip. Called in world space (camera 1.0) — ox is folded into the
  // caller's translate, so this just draws at fixed local coords.
  drawGround(ctx) {
    const dh = CFG.H - ART.GROUND_TOP;
    blit(ctx, BG.ground, 0, ART.GROUND_SRC_Y, 1920, ART.GROUND_SRC_H,
      ART.OX, ART.GROUND_TOP, 1920 * ART.SCALE, dh);
    // horizon seam insurance: soft gradient over the sky/ground join
    const seam = ctx.createLinearGradient(0, ART.GROUND_TOP - 30, 0, ART.GROUND_TOP + 30);
    seam.addColorStop(0, 'rgba(11,16,38,0)');
    seam.addColorStop(0.5, 'rgba(11,16,38,0.55)');
    seam.addColorStop(1, 'rgba(11,16,38,0)');
    ctx.fillStyle = seam;
    ctx.fillRect(-90, ART.GROUND_TOP - 30, CFG.W + 180, 60);
  },

  // Minimal painted-feel fallback while plates load.
  fallback(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, CFG.H);
    sky.addColorStop(0, '#0B1026');
    sky.addColorStop(0.6, '#1E2C4E');
    sky.addColorStop(1, '#0B1026');
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, CFG.W + 40, CFG.H + 40);
    ctx.fillStyle = '#F4F1E4';
    ctx.beginPath(); ctx.arc(911, 250, 46, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#1A2338';
    ctx.fillRect(-20, CFG.FLOOR_Y, CFG.W + 40, CFG.H - CFG.FLOOR_Y + 20);
  },

  // Sky + mid in screen space. Ground is drawn separately in world space.
  draw(ctx, camX, shX, shY, time) {
    if (BG.ready) {
      this.drawSky(ctx, shX - camX * 0.15, shY, time);
      this.drawMid(ctx, shX - camX * 0.45, shY, time);
    } else {
      this.fallback(ctx);
    }
  },
};

/* ============================================================================
 * FIGHTERS & COMBAT
 * y = feet position. x = center. dir = 1 (facing right) | -1 (facing left).
 * ========================================================================== */
function makeFighter(o) {
  return Object.assign({
    x: 0, y: CFG.FLOOR_Y, vx: 0, vy: 0, dir: 1,
    hp: 100, maxHp: 100, posture: 0,
    state: 'idle', stateT: 0,          // ms spent in current state
    chain: 0, swingT: 0, swingPhase: '', hitConnected: false,
    lastDeflectPress: -1e9, deflectT: 0,
    lastPostureDmg: -1e9,
    grounded: true, coyote: 0,
    flash: 0,                          // white hit-flash timer (ms)
    dead: false, deadT: 0,
    staggerT: 0,
    animT: 0,                          // generic animation clock (s)
    stepT: 0,
    // enemy brain fields
    thinkT: 0, windupDur: CFG.ENEMY_WINDUP_MS, doubleQueued: false,
    backstepFrom: 0, backstepTo: 0,
    // boss encounter fields (Phase 3)
    phase: 1, pips: CFG.BOSS_PIPS,
    attack: null,              // { type: 'slash'|'sweep'|'thrust'|'grab'|'leapHeavy' }
    stringLeft: 0,             // hits remaining in the current attack string
    perilousDur: CFG.PERILOUS_WINDUP_MS,
    leapFromX: 0, leapTargetX: 0,
    // player fields
    invulnT: 0,                // post-resurrection invulnerability (ms)
  }, o);
}

const G = {
  now: 0,            // game clock, ms (advances only in logic steps)
  mode: 'fight',     // fight | deathblow | resurrect | gameover | victory
  modeT: 0,
  freeze: 0,         // hitstop remaining, ms
  shake: 0, shakeX: 0, shakeY: 0,
  flashWhite: 0,     // full-screen flash timer
  resUsed: false,    // one resurrection per attempt
  player: null, enemy: null,
  time: 0,           // wall-clock seconds for ambient animation
  camX: 0,           // subtle camera drift toward the player (visual only)
};

function resetFight() {
  G.player = makeFighter({
    name: 'player', isPlayer: true, x: 420, dir: 1,
    hp: CFG.PLAYER_HP, maxHp: CFG.PLAYER_HP,
  });
  G.enemy = makeFighter({
    name: 'enemy', isPlayer: false, x: 860, dir: -1,
    hp: CFG.ENEMY_HP, maxHp: CFG.ENEMY_HP,
    phase: 1, pips: CFG.BOSS_PIPS,
  });
  G.mode = 'fight'; G.modeT = 0; G.freeze = 0; G.shake = 0; G.flashWhite = 0;
  G.resUsed = false;
  Particles.clear(); FloatText.clear();
}

/* ---------------------------------------------------------- posture utils */
function damagePosture(f, amt, now) {
  if (f.dead) return;
  f.posture = Math.min(CFG.POSTURE_MAX, f.posture + amt);
  f.lastPostureDmg = now;
  if (f.posture >= CFG.POSTURE_MAX && f.state !== 'staggered') {
    f.state = 'staggered';
    f.stateT = 0;
    f.staggerT = f.isPlayer ? CFG.PLAYER_STAGGER_MS : CFG.STAGGER_WINDOW_MS;
    f.vx = 0;
    // posture-break shockwave: red ring expanding over the victim
    Particles.ring(f.x, f.y - 100, '#D43A2F', 120, 0.4);
    if (!f.isPlayer) { AudioSys.staggerCue(); FloatText.add(f.x, f.y - 170, 'STAGGERED', '#F5A524', 26); }
  }
}

function updatePostureDrain(f, now, dt) {
  if (f.dead || f.state === 'staggered') return;
  const idle = now - f.lastPostureDmg - CFG.POSTURE_DRAIN_DELAY_MS;
  if (idle > 0) {
    const rate = f.isPlayer ? CFG.PLAYER_POSTURE_DRAIN : CFG.ENEMY_POSTURE_DRAIN;
    f.posture = Math.max(0, f.posture - rate * dt);
  }
}

/* ---------------------------------------------------------------- player */
function playerTryDeflect(p, now) {
  if (p.dead || p.state === 'staggered' || p.state === 'hitstun') return;
  if (G.mode !== 'fight') return;
  // Deflect cancels an attack — this is what makes the defense feel responsive.
  p.state = 'deflect'; p.stateT = 0; p.deflectT = CFG.DEFLECT_ACTIVE_MS;
  p.lastDeflectPress = now;
  p.vx *= 0.3;
}

function playerStartSwing(p, idx, now) {
  const atk = CFG.ATTACKS[idx];
  p.state = 'attack'; p.stateT = 0;
  p.chain = idx; p.swingT = 0; p.swingPhase = 'startup';
  p.hitConnected = false;
  p.vx = p.dir * 120; // small step-in
  if (idx === 2) AudioSys.swingHeavy(); else AudioSys.swing();
}

function updatePlayer(p, e, dt, now) {
  const dtMs = dt * 1000;
  p.stateT += dtMs; p.animT += dt;
  if (p.flash > 0) p.flash -= dtMs;
  if (p.invulnT > 0) p.invulnT -= dtMs;
  if (p.deflectT > 0) { p.deflectT -= dtMs; if (p.deflectT <= 0 && p.state === 'deflect') { p.state = 'idle'; p.stateT = 0; } }

  // input buffers (generous windows = responsive feel)
  const wantDeflect = Input.consume('deflectBuf', now, 260);
  const wantAttack = Input.consume('attackBuf', now, 300);
  const wantJump = Input.consume('jumpBuf', now, CFG.JUMP_BUFFER_MS);

  if (wantDeflect) playerTryDeflect(p, now);

  // physics always applies
  p.vy += CFG.GRAVITY * dt;

  const canAct = p.state !== 'hitstun' && p.state !== 'staggered' && !p.dead;

  if (p.state === 'attack') {
    const atk = CFG.ATTACKS[p.chain];
    p.swingT += dtMs;
    if (p.swingT < atk.startup) p.swingPhase = 'startup';
    else if (p.swingT < atk.startup + atk.active) {
      p.swingPhase = 'active';
      if (!p.hitConnected) {
        p.hitConnected = tryPlayerHit(p, e, atk, now);
      }
    } else if (p.swingT < atk.startup + atk.active + atk.recover) p.swingPhase = 'recover';
    else {
      // swing over — chain into the next swing if the player buffered one
      if (wantAttack && p.chain < 2) playerStartSwing(p, p.chain + 1, now);
      else { p.state = 'idle'; p.stateT = 0; }
    }
    p.vx *= Math.pow(0.02, dt); // strong friction during swings
  } else if (p.state === 'deflect') {
    p.vx *= Math.pow(0.001, dt);
    if (wantAttack) playerStartSwing(p, 0, now); // attack cancels deflect
    // jump also cancels the stance — the sweep counter must always be
    // available, even to a player who was guarding when the red flash came
    if (wantJump && p.grounded) {
      p.vy = CFG.PLAYER_JUMP_VEL; p.grounded = false; p.coyote = 0;
      AudioSys.jump(); Particles.dust(p.x, p.y, 6);
      p.state = 'jump'; p.stateT = 0;
    }
  } else if (p.state === 'hitstun' || p.state === 'staggered') {
    p.vx *= Math.pow(0.05, dt);
    if (p.state === 'hitstun' && p.stateT > CFG.PLAYER_HITSTUN_MS) { p.state = 'idle'; p.stateT = 0; }
    if (p.state === 'staggered') {
      p.staggerT -= dtMs;
      if (p.staggerT <= 0) { p.state = 'idle'; p.stateT = 0; p.posture = 40; }
    }
  } else if (canAct) {
    // locomotion
    let mv = 0;
    if (Input.left) mv -= 1;
    if (Input.right) mv += 1;
    p.vx = mv * CFG.PLAYER_RUN_SPEED * (p.grounded ? 1 : CFG.PLAYER_AIR_CONTROL);
    p.state = mv !== 0 ? 'run' : 'idle';
    // face the enemy
    if (e.x !== p.x) p.dir = e.x > p.x ? 1 : -1;
    // jump (coyote time + buffer = forgiving)
    if (p.grounded) p.coyote = CFG.COYOTE_MS; else p.coyote -= dtMs;
    if (wantJump && (p.grounded || p.coyote > 0)) {
      p.vy = CFG.PLAYER_JUMP_VEL; p.grounded = false; p.coyote = 0;
      AudioSys.jump(); Particles.dust(p.x, p.y, 6);
      p.state = 'jump';
    }
    if (wantAttack && p.grounded) playerStartSwing(p, 0, now);
  }

  // integrate + collide
  p.x += p.vx * dt; p.y += p.vy * dt;
  if (p.y >= CFG.FLOOR_Y) {
    if (!p.grounded && p.vy > 500) { Particles.dust(p.x, p.y, 5); AudioSys.land(); }
    p.y = CFG.FLOOR_Y; p.vy = 0; p.grounded = true;
    if (p.state === 'jump') { p.state = 'idle'; p.stateT = 0; }
  } else if (p.y < CFG.FLOOR_Y - 4) p.grounded = false;
  p.x = clamp(p.x, CFG.WALL_L + 20, CFG.WALL_R - 20);

  // run footstep puffs
  if (p.state === 'run' && p.grounded) {
    p.stepT += dt;
    if (p.stepT > 0.28) { p.stepT = 0; Particles.dust(p.x - p.dir * 10, p.y, 2); }
  }
}

/* ------------------------------------------------------------ enemy AI */
/**
 * Choose Kurenai's next attack. Phase 1: katana slashes with occasional
 * sweep / single thrusts. Phase 2: adds grab (close range), sweep/thrust
 * mix-ups off the same red flash, and the leaping heavy.
 * Pure in its inputs (reads e.phase, positions) apart from Math.random.
 */
function chooseBossAttack(e, p) {
  const ph = e.phase || 1;
  const perilChance = ph === 2 ? CFG.P2_PERILOUS_CHANCE : CFG.P1_PERILOUS_CHANCE;
  if (Math.random() < perilChance) {
    const d = Math.abs(p.x - e.x);
    if (ph === 2 && d <= CFG.GRAB_RANGE && Math.random() < CFG.P2_GRAB_CHANCE) return 'grab';
    // sweep/thrust mix-up: same red flash, different attack — the read is
    // the counter (jump vs last-instant deflect), not the tell.
    return Math.random() < 0.5 ? 'sweep' : 'thrust';
  }
  if (ph === 2 && Math.random() < CFG.P2_LEAP_CHANCE) return 'leapHeavy';
  return 'slash';
}

function enemyDecide(e, p, now) {
  // called when entering 'idle' — pick a think duration
  e.thinkT = rand(CFG.ENEMY_THINK_MIN_MS, CFG.ENEMY_THINK_MAX_MS);
}

function updateEnemy(e, p, dt, now) {
  const dtMs = dt * 1000;
  e.stateT += dtMs; e.animT += dt;
  if (e.flash > 0) e.flash -= dtMs;
  e.vy += CFG.GRAVITY * dt;

  switch (e.state) {
    case 'idle': {
      e.vx *= Math.pow(0.01, dt);
      if (e.x !== p.x) e.dir = p.x > e.x ? 1 : -1;
      e.thinkT -= dtMs;
      if (e.thinkT <= 0) e.state = 'approach';
      break;
    }
    case 'approach': {
      const dx = p.x - e.x;
      const d = Math.abs(dx);
      e.dir = dx > 0 ? 1 : -1;
      if (d > CFG.ENGAGE_RANGE + rand(-8, 8)) {
        e.vx = e.dir * CFG.ENEMY_RUN_SPEED;
        e.stateT = 0; // keep anim running
      } else {
        e.vx = 0;
        e.state = 'aim'; e.stateT = 0;
        e.thinkT = rand(180, 420); // the "read" beat before committing
      }
      break;
    }
    case 'aim': {
      e.vx *= Math.pow(0.01, dt);
      e.dir = p.x > e.x ? 1 : -1;
      e.thinkT -= dtMs;
      if (e.thinkT <= 0) {
        const atkType = chooseBossAttack(e, p);
        e.attack = { type: atkType };
        const spd = e.phase === 2 ? CFG.PHASE2_SPEED_MUL : 1;
        if (atkType === 'sweep' || atkType === 'thrust' || atkType === 'grab') {
          // PERILOUS: red flash warning, unblockable — guard does nothing.
          e.state = 'perilousWindup'; e.stateT = 0;
          e.perilousDur = CFG.PERILOUS_WINDUP_MS;
          AudioSys.telegraph();
          AudioSys.dangerCue();
        } else {
          e.state = 'windup'; e.stateT = 0;
          // vary the wind-up slightly so it never feels robotic
          e.windupDur = (CFG.ENEMY_WINDUP_MS + rand(-25, 30)) / spd;
          if (atkType === 'leapHeavy') {
            // record the landing spot now — the leap commits to it
            e.leapFromX = e.x;
            e.leapTargetX = clamp(p.x - e.dir * 70, CFG.WALL_L + 30, CFG.WALL_R - 30);
          }
          // attack strings: phase 1 = 2-4 hits, phase 2 = up to 5
          e.stringLeft = e.phase === 2 ? 2 + ((Math.random() * 4) | 0)
                                       : 2 + ((Math.random() * 3) | 0);
          AudioSys.telegraph();
        }
      }
      break;
    }
    case 'windup': {
      e.vx = 0;
      if (e.stateT >= e.windupDur) {
        e.state = 'strike'; e.stateT = 0; e.hitDone = false;
        const leap = e.attack && e.attack.type === 'leapHeavy';
        if (leap || e.windupDur >= 300) AudioSys.swingHeavy(); else AudioSys.swing();
      }
      break;
    }
    case 'perilousWindup': {
      e.vx = 0;
      e.dir = p.x > e.x ? 1 : -1; // tracks the player until the strike commits
      if (e.stateT >= e.perilousDur) {
        e.state = 'perilousStrike'; e.stateT = 0; e.hitDone = false;
        AudioSys.swingHeavy();
      }
      break;
    }
    case 'strike': {
      const atkType = e.attack ? e.attack.type : 'slash';
      // the leaping heavy needs a longer strike: impact at 200ms
      const strikeEnd = atkType === 'leapHeavy' ? 280 : CFG.ENEMY_STRIKE_ACTIVE_MS + 40;
      if (atkType === 'leapHeavy') {
        // leaping arc toward the committed target; impact at 200ms
        const k = Math.min(1, e.stateT / 200);
        e.x = lerp(e.leapFromX, e.leapTargetX, k);
        e.y = CFG.FLOOR_Y - Math.sin(Math.PI * k) * 130;
        if (!e.hitDone && e.stateT >= 200) {
          e.hitDone = true;
          e.y = CFG.FLOOR_Y;
          Particles.dust(e.x, e.y, 10);
          tryEnemyHit(e, p, now, CFG.LEAP_HEAVY_DAMAGE, CFG.LEAP_HEAVY_POSTURE, 130);
          G.shake = Math.max(G.shake, CFG.SHAKE_HIT);
        }
      } else {
        // committed — slight forward lunge at the start
        if (e.stateT < 90) e.vx = e.dir * 130; else e.vx *= Math.pow(0.01, dt);
        if (!e.hitDone && e.stateT >= CFG.ENEMY_STRIKE_HIT_AT_MS) {
          e.hitDone = true;
          tryEnemyHit(e, p, now);
        }
      }
      if (e.stateT >= strikeEnd) {
        e.stringLeft--;
        const spd = e.phase === 2 ? CFG.PHASE2_SPEED_MUL : 1;
        const chainChance = e.phase === 2 ? 0.7 : 0.4;
        if (e.stringLeft > 1 && Math.random() < chainChance) {
          // continue the string with a quicker follow-up slash
          e.state = 'windup'; e.stateT = 0;
          e.windupDur = 210 / spd;
          e.attack = { type: 'slash' };
          AudioSys.telegraph();
        } else {
          e.state = 'recover'; e.stateT = 0;
          e.thinkT = rand(CFG.ENEMY_RECOVER_MIN_MS, CFG.ENEMY_RECOVER_MAX_MS) / spd;
        }
      }
      break;
    }
    case 'perilousStrike': {
      const atkType = e.attack ? e.attack.type : 'sweep';
      // lunge into the attack (thrust lunges hardest)
      if (e.stateT < 90) e.vx = e.dir * (atkType === 'thrust' ? 220 : 120);
      else e.vx *= Math.pow(0.01, dt);
      if (!e.hitDone && e.stateT >= CFG.PERILOUS_HIT_AT_MS) {
        e.hitDone = true;
        tryPerilousHit(e, p, now);
      }
      if (e.stateT >= CFG.PERILOUS_STRIKE_MS) {
        e.state = 'recover'; e.stateT = 0;
        const spd = e.phase === 2 ? CFG.PHASE2_SPEED_MUL : 1;
        // long recover — this is the punish window for a countered perilous
        e.thinkT = rand(CFG.PERILOUS_RECOVER_MIN_MS, CFG.PERILOUS_RECOVER_MAX_MS) / spd;
      }
      break;
    }
    case 'recover': {
      e.vx *= Math.pow(0.01, dt);
      e.thinkT -= dtMs;
      if (e.thinkT <= 0) {
        if (Math.random() < CFG.ENEMY_BACKSTEP_CHANCE) {
          e.state = 'backstep'; e.stateT = 0;
          e.backstepFrom = e.x;
          e.backstepTo = clamp(e.x - e.dir * CFG.ENEMY_BACKSTEP_DIST, CFG.WALL_L + 30, CFG.WALL_R - 30);
          Particles.dust(e.x, e.y, 6);
        } else { e.state = 'idle'; e.stateT = 0; enemyDecide(e, p, now); }
      }
      break;
    }
    case 'backstep': {
      const k = Math.min(1, e.stateT / 260);
      const ease = 1 - Math.pow(1 - k, 3);
      e.x = lerp(e.backstepFrom, e.backstepTo, ease);
      if (k >= 1) { e.state = 'idle'; e.stateT = 0; enemyDecide(e, p, now); }
      break;
    }
    case 'staggered': {
      e.vx = 0;
      e.staggerT -= dtMs;
      if (e.staggerT <= 0) {
        e.state = 'idle'; e.stateT = 0;
        e.posture = 55; // recovers partially, not fully
        enemyDecide(e, p, now);
      }
      break;
    }
  }

  // integrate + collide
  e.x += e.vx * dt; e.y += e.vy * dt;
  if (e.y >= CFG.FLOOR_Y) { e.y = CFG.FLOOR_Y; e.vy = 0; }
  e.x = clamp(e.x, CFG.WALL_L + 20, CFG.WALL_R - 20);

  // don't let the fighters overlap
  const minD = 46;
  const dx = e.x - p.x;
  if (Math.abs(dx) < minD && !p.dead && !e.dead) {
    const push = (minD - Math.abs(dx)) / 2 * Math.sign(dx || 1);
    e.x += push; p.x -= push;
  }
}

/* ------------------------------------------------------- combat resolution */
function inStrikeRange(a, b, range) {
  const dx = (b.x - a.x) * a.dir;
  return dx > -20 && dx < range && Math.abs(a.y - b.y) < 95;
}

// Player's swing connects. Returns true if it hit.
function tryPlayerHit(p, e, atk, now) {
  if (e.dead || G.mode !== 'fight') return false;
  if (!inStrikeRange(p, e, atk.range)) return false;

  // Deathblow: any connecting hit on a staggered enemy is fatal.
  if (e.state === 'staggered') { startDeathblow(p, e, now); return true; }

  e.hp -= atk.dmg;
  damagePosture(e, CFG.PLAYER_HIT_ENEMY_POSTURE[p.chain], now);
  e.flash = 90;
  e.vx += p.dir * 150;
  const cx = e.x - e.dir * 24, cy = e.y - 105;
  Particles.sparks(cx, cy, 10, '#F5A524', 380);
  G.freeze = Math.max(G.freeze, CFG.PLAYER_HITSTOP_MS);
  G.shake = Math.max(G.shake, CFG.SHAKE_HIT);
  AudioSys.thud();
  if (e.hp <= 0) killFighter(e, now);
  return true;
}

// Shared "player takes a clean, unblockable-style hit" helper.
// dmg/postDmg are explicit so perilous attacks (sweep/thrust/grab-fail)
// and normal strikes share one code path with identical feedback.
function hurtPlayer(p, dmg, postDmg, e, now, cx, cy) {
  p.hp -= dmg;
  damagePosture(p, postDmg, now);
  p.flash = 130;
  p.state = 'hitstun'; p.stateT = 0;
  p.vx = e.dir * 260;
  Particles.sparks(cx, cy, 12, '#D43A2F', 400);
  G.freeze = Math.max(G.freeze, 60);
  G.shake = Math.max(G.shake, CFG.SHAKE_HIT);
  AudioSys.thud(); AudioSys.hurt();
  if (p.hp <= 0) killFighter(p, now);
}

// The enemy's strike lands — resolve deflect / partial / clean hit.
// Optional dmg/postDmg/range let special attacks (leaping heavy) reuse the
// standard deflect machinery; defaults preserve the original slash.
function tryEnemyHit(e, p, now, dmg, postDmg, range) {
  if (p.dead || G.mode !== 'fight') return;
  if (p.invulnT > 0) return; // post-resurrection grace
  if (!inStrikeRange(e, p, range || 108)) return; // whiffed (player jumped away etc.)

  const dmgV = dmg !== undefined ? dmg : CFG.ENEMY_HIT_DAMAGE;
  const postV = postDmg !== undefined ? postDmg : CFG.ENEMY_HIT_PLAYER_POSTURE;
  const dtPress = now - p.lastDeflectPress;
  const canDeflect = p.state !== 'staggered' && p.state !== 'hitstun';
  const result = canDeflect ? resolveDeflect(dtPress) : 'hit';
  const cx = p.x + p.dir * 26, cy = p.y - 108;

  if (result === 'perfect') {
    damagePosture(e, CFG.PERFECT_ENEMY_POSTURE, now);
    Particles.sparks(cx, cy, 16, '#F4F1E4', 520);
    Particles.sparks(cx, cy, 8, '#F5A524', 300);
    Particles.ring(cx, cy, '#F4F1E4', 95);
    Particles.arcFlash(cx, cy);
    FloatText.add(cx, cy - 44, 'PERFECT', '#F4F1E4', 30);
    G.freeze = Math.max(G.freeze, CFG.HITSTOP_PERFECT_MS);
    G.shake = Math.max(G.shake, CFG.SHAKE_PERFECT);
    AudioSys.clang();
    e.thinkT = (e.thinkT || 0) + 140; // deflected blows cost the enemy momentum
  } else if (result === 'partial') {
    p.hp -= CFG.PARTIAL_CHIP_DAMAGE;
    damagePosture(p, CFG.PARTIAL_PLAYER_POSTURE, now);
    damagePosture(e, CFG.PARTIAL_ENEMY_POSTURE, now);
    p.flash = 90;
    Particles.sparks(cx, cy, 10, '#8FA3C4', 320);
    G.freeze = Math.max(G.freeze, 45);
    AudioSys.block();
    if (p.hp <= 0) killFighter(p, now);
  } else {
    hurtPlayer(p, dmgV, postV, e, now, cx, cy);
  }
}

// A perilous attack lands. Perilous attacks are UNBLOCKABLE: holding deflect
// (guard) does not reduce them. Each has its own counter:
//   sweep  -> be airborne (jump it); otherwise full damage
//   thrust -> deflect at the last instant (mikiri) for heavy boss posture
//            damage; mistimed or guarded = full damage
//   grab   -> be airborne or out of range; caught = heavy HP, no posture
function tryPerilousHit(e, p, now) {
  if (p.dead || G.mode !== 'fight') return;
  if (p.invulnT > 0) return;
  const type = e.attack ? e.attack.type : 'sweep';
  const range = type === 'grab' ? CFG.GRAB_RANGE : 118;
  const airborne = p.y < CFG.FLOOR_Y - 40;
  const cx = p.x + p.dir * 26, cy = p.y - 108;

  if (!inStrikeRange(e, p, range)) {
    if (!airborne) FloatText.add(p.x, p.y - 190, 'EVADED', '#8FA3C4', 24);
    return; // whiffed entirely — backed off out of reach
  }

  if (type === 'sweep') {
    if (airborne) { FloatText.add(p.x, p.y - 190, 'EVADED', '#8FA3C4', 24); return; }
    hurtPlayer(p, CFG.SWEEP_DAMAGE, CFG.SWEEP_POSTURE, e, now, cx, cy);
  } else if (type === 'thrust') {
    const dtPress = now - p.lastDeflectPress;
    const canDeflect = p.state !== 'staggered' && p.state !== 'hitstun';
    if (canDeflect && dtPress >= 0 && dtPress <= CFG.DEFLECT_PERFECT_MS) {
      // MIKIRI — last-instant deflect stamps the thrust down
      damagePosture(e, CFG.MIKIRI_POSTURE, now);
      Particles.sparks(cx, cy, 18, '#F4F1E4', 560);
      Particles.ring(cx, cy, '#D43A2F', 110);
      Particles.arcFlash(cx, cy);
      FloatText.add(cx, cy - 44, 'MIKIRI', '#D43A2F', 34);
      G.freeze = Math.max(G.freeze, CFG.HITSTOP_PERFECT_MS);
      G.shake = Math.max(G.shake, CFG.SHAKE_PERFECT);
      AudioSys.clang();
      e.thinkT = (e.thinkT || 0) + 140;
    } else {
      // mistimed or guarded — thrusts cannot be blocked
      hurtPlayer(p, CFG.ENEMY_HIT_DAMAGE, CFG.ENEMY_HIT_PLAYER_POSTURE, e, now, cx, cy);
    }
  } else if (type === 'grab') {
    if (airborne) { FloatText.add(p.x, p.y - 190, 'EVADED', '#8FA3C4', 24); return; }
    p.hp -= CFG.GRAB_DAMAGE; // no posture interaction, per spec
    p.flash = 150;
    p.state = 'hitstun'; p.stateT = 0;
    p.vx = e.dir * 340;
    Particles.sparks(cx, cy, 14, '#D43A2F', 420);
    FloatText.add(cx, cy - 44, 'GRABBED', '#D43A2F', 34);
    G.freeze = Math.max(G.freeze, 70);
    G.shake = Math.max(G.shake, CFG.SHAKE_HIT + 2);
    AudioSys.thud(); AudioSys.hurt();
    if (p.hp <= 0) killFighter(p, now);
  }
}

function killFighter(f, now) {
  // Spec: one resurrection per attempt — a lethal hit offers revival first.
  if (f.isPlayer && !G.resUsed && G.mode === 'fight') { startResurrect(now); return; }
  f.hp = 0; f.dead = true; f.deadT = 0; f.state = 'dead';
  f.vx = 0;
  Particles.dust(f.x, f.y, 14);
  if (f.isPlayer) { G.mode = 'gameover'; G.modeT = 0; }
  else { G.mode = 'victory'; G.modeT = 0; }
}

// Lethal hit, resurrection available: freeze the duel and offer the choice.
function startResurrect(now) {
  G.mode = 'resurrect'; G.modeT = 0;
  G.resUsed = true;
  G.freeze = 0;
  const pl = G.player;
  pl.hp = 0; // clamp — the blow was lethal, the prompt decides the rest
  pl.vx = 0;
  AudioSys.staggerCue();
  FloatText.add(pl.x, pl.y - 220, 'RESURRECT?', '#F4F1E4', 40);
}

function startDeathblow(p, e, now) {
  G.mode = 'deathblow'; G.modeT = 0;
  G.db = { px: p.x, ex: e.x, dir: p.dir };
  AudioSys.deathblow();
}

/* ------------------------------------------------------------- deathblow */
function updateDeathblow(dt, now) {
  const dtMs = dt * 1000;
  G.modeT += dtMs;
  const p = G.player, e = G.enemy;
  const T = G.modeT;
  if (T < 260) {
    // dramatic pause — world frozen, white flash blooms
    G.flashWhite = Math.min(1, T / 200);
    G.freeze = 60;
  } else if (T < 420) {
    // the dash-through
    const k = (T - 260) / 160;
    p.x = lerp(G.db.px, G.db.ex + G.db.dir * 46, k);
    p.dir = G.db.dir;
    G.flashWhite = Math.max(0, 1 - (T - 260) / 160);
    if (!G.db.slashed) {
      G.db.slashed = true;
      Particles.sparks(e.x, e.y - 105, 30, '#D43A2F', 560);
      Particles.ring(e.x, e.y - 105, '#D43A2F', 150);
      Particles.slashArc(e.x, e.y - 105, 95);          // ink slash across the victim
      Particles.petalBurst(e.x, e.y - 105, 16, '#A93226'); // red petal burst
      FloatText.add(e.x, e.y - 200, 'DEATHBLOW', '#D43A2F', 44);
      G.shake = CFG.SHAKE_DEATHBLOW;
    }
  } else {
    // The deathblow landed. Kurenai has 2 pips: the first deathblow does
    // NOT kill — it triggers phase 2 (HP refills, posture resets, faster
    // and deadlier). The second deathblow ends the fight.
    e.pips -= 1;
    if (e.pips > 0) {
      e.hp = e.maxHp; e.posture = 0; e.phase = 2;
      e.dead = false; e.vx = 0;
      e.state = 'idle'; e.stateT = 0;
      enemyDecide(e, p, now);
      e.thinkT = Math.max(e.thinkT, 1400); // a breath after the deathblow
      G.mode = 'fight'; G.modeT = 0; G.flashWhite = 0;
      FloatText.add(e.x, e.y - 230, 'KURENAI RISES', '#D43A2F', 42);
      Particles.ring(e.x, e.y - 100, '#D43A2F', 160, 0.5);
      Particles.dust(e.x, e.y, 16);
      AudioSys.staggerCue();
    } else {
      if (!e.dead) killFighter(e, now); // killFighter sets mode='victory'
      G.mode = 'victory'; G.modeT = 0;
    }
  }
}

/* ============================================================================
 * RENDERING — fighters are drawn procedurally (pose-driven). Grey-box art
 * direction: clean silhouettes, moonlight rim, juice on top.
 * ========================================================================== */
function limb(ctx, x1, y1, x2, y2, x3, y3, w, color) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();
}

// Compute a pose for the fighter. Returns joint angles/positions.
function poseFor(f) {
  const P = {
    crouch: 0, lean: 0,           // body
    armA: 0.5, swordA: 0.5,      // sword arm + blade angle (0 = forward, + = down)
    legSpread: 12, legPhase: 0, runAmp: 0,
    headTilt: 0, kneel: 0,
  };
  const t = f.animT;
  switch (f.state) {
    case 'idle':
      P.armA = 0.45; P.swordA = 0.55;
      P.lean = Math.sin(t * 2.1) * 0.03;
      P.crouch = 0.08 + Math.sin(t * 2.1) * 0.02;
      break;
    case 'run':
      P.runAmp = 1; P.legPhase = t * 13;
      P.lean = 0.14; P.crouch = 0.12;
      P.armA = -0.5; P.swordA = -0.9; // sword swept back while sprinting
      break;
    case 'jump':
      P.legSpread = 20; P.crouch = 0.3;
      P.armA = -0.8; P.swordA = -1.2;
      break;
    case 'attack': {
      const atk = CFG.ATTACKS[f.chain];
      const k = f.swingT / (atk.startup + atk.active + atk.recover);
      if (f.swingPhase === 'startup') {
        const s = f.swingT / atk.startup;
        P.armA = lerp(0.45, -2.1, s); P.swordA = lerp(0.55, -2.5, s);
        P.crouch = lerp(0.08, 0.3, s); P.lean = lerp(0, -0.12, s);
      } else if (f.swingPhase === 'active') {
        const s = (f.swingT - atk.startup) / atk.active;
        P.armA = lerp(-2.1, 0.9, s); P.swordA = lerp(-2.5, 1.0, s);
        P.crouch = 0.18; P.lean = lerp(-0.12, 0.22, s);
        P.trail = s;
      } else {
        const s = (f.swingT - atk.startup - atk.active) / atk.recover;
        P.armA = lerp(0.9, 0.45, s); P.swordA = lerp(1.0, 0.55, s);
        P.crouch = lerp(0.18, 0.08, s); P.lean = lerp(0.22, 0, s);
      }
      // chain 2 (heavy): bigger wind-up
      if (f.chain === 2 && f.swingPhase === 'startup') { P.armA -= 0.3; P.swordA -= 0.3; }
      break;
    }
    case 'deflect':
      P.armA = -1.15; P.swordA = -1.5; // blade up, edge forward
      P.crouch = 0.3; P.lean = -0.06;
      P.legSpread = 22;
      break;
    case 'aim':
      P.armA = -0.4; P.swordA = -0.7; P.crouch = 0.22; P.lean = 0.08;
      break;
    case 'windup': {
      const s = clamp(f.stateT / f.windupDur, 0, 1);
      P.armA = lerp(-0.4, -2.6, s); P.swordA = lerp(-0.7, -2.9, s);
      P.crouch = lerp(0.22, 0.42, s); P.lean = lerp(0.08, -0.2, s);
      P.windupK = s;
      break;
    }
    case 'strike':
      if (f.attack && f.attack.type === 'leapHeavy') {
        // airborne lunge: blade raised, body extended
        P.legSpread = 20; P.crouch = 0.3;
        P.armA = -2.2; P.swordA = -2.4; P.lean = 0.28;
        P.trail = 1 - clamp(f.stateT / 200, 0, 1);
      } else {
        P.armA = 1.0; P.swordA = 1.15; P.crouch = 0.25; P.lean = 0.3;
        P.trail = 1 - clamp(f.stateT / 160, 0, 1);
      }
      break;
    case 'perilousWindup': {
      // the crouch before the storm — pose differs per attack so the
      // strike itself is the read (the red flash is identical for all)
      const s = clamp(f.stateT / (f.perilousDur || 420), 0, 1);
      const at = f.attack ? f.attack.type : 'sweep';
      if (at === 'sweep') {
        P.armA = lerp(0.4, -2.9, s); P.swordA = lerp(0.5, -3.1, s);
        P.crouch = lerp(0.2, 0.55, s); P.lean = lerp(0.05, -0.25, s);
      } else if (at === 'thrust') {
        P.armA = lerp(0.4, -1.8, s); P.swordA = lerp(0.5, -1.9, s);
        P.crouch = lerp(0.2, 0.35, s); P.lean = lerp(0.05, -0.3, s);
      } else { // grab: arms opening wide
        P.armA = lerp(0.4, 1.2, s); P.swordA = lerp(0.5, 0.9, s);
        P.crouch = lerp(0.2, 0.3, s); P.lean = lerp(0.05, 0.25, s);
      }
      P.windupK = s;
      break;
    }
    case 'perilousStrike': {
      const at2 = f.attack ? f.attack.type : 'sweep';
      if (at2 === 'sweep') {
        P.armA = 1.1; P.swordA = 1.3; P.crouch = 0.5; P.lean = 0.35;
        P.trail = 1 - clamp(f.stateT / 200, 0, 1);
      } else if (at2 === 'thrust') {
        P.armA = -0.15; P.swordA = -0.1; P.crouch = 0.15; P.lean = 0.45;
        P.trail = 1 - clamp(f.stateT / 160, 0, 1);
      } else { // grab: clutching forward
        P.armA = 1.4; P.swordA = 1.5; P.crouch = 0.2; P.lean = 0.4;
      }
      break;
    }
    case 'backstep':
      P.crouch = 0.35; P.lean = -0.25; P.armA = 0.2; P.swordA = 0.3;
      break;
    case 'hitstun':
      P.armA = 0.9; P.swordA = 1.2; P.crouch = 0.25; P.lean = -0.28;
      break;
    case 'staggered':
      P.kneel = 1; P.armA = 0.7; P.swordA = 1.35; P.headTilt = 0.5;
      break;
    case 'dead':
      P.deadK = Math.min(1, f.deadT / 600);
      break;
  }
  return P;
}

function drawFighter(ctx, f) {
  // Sprite path when the painted sheets loaded; procedural stick-figure
  // fallback otherwise (also the path exercised by headless tests).
  const P = poseFor(f);
  if (SPR.ready && SPR.ok) {
    drawSpriteFighter(ctx, f);
  } else {
    drawProceduralFighter(ctx, f, P);
  }


  ctx.save();
  // telegraph glow during enemy wind-up
  if (f.state === 'windup' && P.windupK !== undefined) {
    const k = P.windupK;
    ctx.globalAlpha = 0.25 + 0.55 * k;
    ctx.strokeStyle = k > 0.7 ? '#D43A2F' : '#F4F1E4';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(f.x, f.y - 95, 46 + 14 * k, 0, 6.29); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // hit flash: brief hot glow on the body after taking a hit
  if (f.flash > 0 && f.state !== 'dead') {
    ctx.globalAlpha = Math.min(0.65, f.flash / 130);
    ctx.fillStyle = '#F4F1E4';
    ctx.beginPath(); ctx.arc(f.x, f.y - 80, 44, 0, 6.29); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // staggered marker: pulsing red dot (the deathblow prompt — restraint is the aesthetic)
  if (f.state === 'staggered' && !f.isPlayer) {
    const pulse = 1 + Math.sin(f.animT * 10) * 0.25;
    ctx.fillStyle = '#D43A2F';
    ctx.beginPath(); ctx.arc(f.x, f.y - 178, 11 * pulse, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#F4F1E4';
    ctx.beginPath(); ctx.arc(f.x, f.y - 178, 4.5 * pulse, 0, 6.29); ctx.fill();
  }

  // PERILOUS WARNING: red contracting ring + the kanji 危 above the boss.
  // The flash is identical for sweep/thrust/grab — the read is the counter.
  if (!f.isPlayer && f.state === 'perilousWindup') {
    const k = clamp(f.stateT / (f.perilousDur || 420), 0, 1);
    const pulse = 0.7 + 0.3 * Math.sin(f.animT * 18);
    ctx.save();
    ctx.globalAlpha = (0.55 + 0.45 * k) * pulse;
    ctx.strokeStyle = '#D43A2F'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(f.x, f.y - 105, 70 - 24 * k, 0, 6.29); ctx.stroke();
    ctx.fillStyle = '#D43A2F';
    ctx.font = '700 46px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('危', f.x, f.y - 195);
    ctx.restore();
    ctx.textAlign = 'left';
  }
}

function drawProceduralFighter(ctx, f, P) {
  const dir = f.dir;
  // locked palette (STYLE_GUIDE.md): player dark blue, boss crimson
  const body = f.isPlayer ? '#2C3E66' : '#A93226';
  const trim = f.isPlayer ? '#9AA7C4' : '#D43A2F';
  const skin = f.isPlayer ? '#E8E4D8' : '#d9cfbb';
  // Boss reads 1.25x larger. Purely visual: hitboxes use f.x/f.y only.
  const scale = f.isPlayer ? 1 : 1.25;

  ctx.save();
  // Moonlit halo behind the fighter: a soft cool glow that lifts the dark
  // silhouette off the dark courtyard floor (readability rule, STYLE_GUIDE.md).
  // Subtle on purpose — restraint is the aesthetic.
  const haloY = f.y - (f.isPlayer ? 80 : 100);
  const halo = ctx.createRadialGradient(f.x, haloY, 10, f.x, haloY, 115);
  halo.addColorStop(0, 'rgba(244,241,228,0.12)');
  halo.addColorStop(1, 'rgba(244,241,228,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.ellipse(f.x, haloY, 115, 88, 0, 0, 6.29); ctx.fill();
  // dark edge definition so the figure reads as a solid shape
  ctx.shadowColor = 'rgba(5,7,15,0.85)';
  ctx.shadowBlur = 7;

  if (f.state === 'dead') {
    // fallen: drawn in local space, rotated flat, fading out
    ctx.globalAlpha = Math.max(0.25, 1 - f.deadT / 2400);
    ctx.translate(f.x, f.y - 14);
    ctx.scale(scale, scale);
    ctx.rotate(dir * 1.35 * Math.min(1, f.deadT / 500));
    drawBody(ctx, dir, body, trim, skin,
      { crouch: 0.5, lean: 0, armA: 0.8, swordA: 1.4, legSpread: 16, headTilt: 0.4 },
      f, 0, 0);
    ctx.restore();
    return;
  }

  if (P.kneel) {
    // kneeling stagger
    ctx.translate(f.x, f.y);
    ctx.scale(scale, scale);
    drawKneel(ctx, dir, body, trim, skin, P, f);
  } else {
    ctx.translate(f.x, f.y);
    ctx.scale(scale, scale);
    ctx.translate(-f.x, -f.y);
    drawBody(ctx, dir, body, trim, skin, P, f);
  }
  ctx.restore(); // also clears the separation shadow
}

function drawBody(ctx, dir, body, trim, skin, P, f, ox, oy) {
  const x = ox !== undefined ? ox : f.x;
  const feetY = oy !== undefined ? oy : f.y;
  const crouchPx = (P.crouch || 0) * 34;
  const hipY = feetY - 54 + crouchPx;
  const shY = hipY - 32 + crouchPx * 0.25;
  const headY = shY - 15;
  const leanPx = (P.lean || 0) * 60;

  // shadow: soft elliptical contact shadow on the ground layer
  ctx.fillStyle = 'rgba(5,7,15,0.45)';
  ctx.beginPath(); ctx.ellipse(x, feetY + 6, 34, 8, 0, 0, 6.29); ctx.fill();

  // legs (two-segment)
  const spread = P.legSpread || 12;
  const runSwing = (P.runAmp || 0) * Math.sin(P.legPhase || 0) * 20;
  const hipX = x + leanPx * 0.3;
  limb(ctx, hipX, hipY,
    hipX + dir * (spread * 0.5 + runSwing * 0.4), (hipY + feetY) / 2 + 4,
    hipX + dir * (spread + runSwing), feetY, 11, '#0D1226');
  limb(ctx, hipX, hipY,
    hipX - dir * (spread * 0.5 + runSwing * 0.4), (hipY + feetY) / 2 + 4,
    hipX - dir * (spread + runSwing), feetY, 11, '#141b33');

  // torso
  ctx.strokeStyle = body; ctx.lineWidth = 20; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(x + leanPx, shY); ctx.stroke();
  // belt trim
  ctx.strokeStyle = trim; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(hipX - dir * 9, hipY + 2); ctx.lineTo(hipX + dir * 9, hipY + 2); ctx.stroke();

  // head
  const hx = x + leanPx + (P.headTilt || 0) * 8;
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(hx, headY, 11, 0, 6.29); ctx.fill();
  // headband (player) / horned helmet ridge (boss)
  ctx.strokeStyle = trim; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(hx - dir * 11, headY - 3); ctx.lineTo(hx + dir * 11, headY - 3); ctx.stroke();
  if (f.isPlayer) {
    ctx.lineWidth = 2.5;
    const tailW = Math.sin(f.animT * 3) * 4;
    ctx.beginPath(); ctx.moveTo(hx - dir * 10, headY - 2);
    ctx.quadraticCurveTo(hx - dir * 26, headY + 4 + tailW, hx - dir * 34, headY + 14 + tailW);
    ctx.stroke();
  } else {
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx - 5, headY - 9); ctx.lineTo(hx - 11, headY - 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 5, headY - 9); ctx.lineTo(hx + 11, headY - 22); ctx.stroke();
  }

  // sword arm: shoulder -> elbow -> hand, then blade
  const shX = x + leanPx;
  const elbowX = shX + dir * Math.cos(P.armA) * 20;
  const elbowY = shY + Math.sin(P.armA) * 20 + 8;
  const handX = elbowX + dir * Math.cos(P.armA) * 20;
  const handY = elbowY + Math.sin(P.armA) * 20;
  limb(ctx, shX, shY, elbowX, elbowY, handX, handY, 9, body);
  // off arm (simple, tucked)
  limb(ctx, shX, shY + 4, shX - dir * 8, shY + 22, shX - dir * 4, shY + 38, 8, '#141b33');

  // blade (boss blade slightly longer)
  const bl = f.isPlayer ? 52 : 62;
  const bx = handX + dir * Math.cos(P.swordA) * bl;
  const by = handY + Math.sin(P.swordA) * bl;
  ctx.strokeStyle = '#9AA7C4'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(bx, by); ctx.stroke();
  ctx.strokeStyle = 'rgba(244,241,228,0.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(bx, by); ctx.stroke();
  // guard
  ctx.strokeStyle = trim; ctx.lineWidth = 4;
  const gx = handX + dir * Math.cos(P.swordA) * 8, gy = handY + Math.sin(P.swordA) * 8;
  ctx.beginPath(); ctx.moveTo(gx - 6, gy); ctx.lineTo(gx + 6, gy); ctx.stroke();

  // swing trail during active frames
  if (P.trail !== undefined && P.trail > 0) {
    ctx.globalAlpha = 0.5 * P.trail;
    ctx.strokeStyle = f.isPlayer ? 'rgba(154,167,196,0.85)' : 'rgba(212,58,47,0.85)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(handX, handY, bl * 0.95, P.swordA - 1.1 * dir, P.swordA + 0.15 * dir, dir < 0);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // moonlight rim on the facing edge
  ctx.strokeStyle = 'rgba(244,241,228,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(hipX + dir * 10, hipY); ctx.lineTo(x + leanPx + dir * 10, shY); ctx.stroke();
}

function drawKneel(ctx, dir, body, trim, skin, P, f) {
  const x = 0, feetY = 0; // already translated to (f.x, f.y)
  ctx.fillStyle = 'rgba(5,7,15,0.45)';
  ctx.beginPath(); ctx.ellipse(0, 6, 36, 8, 0, 0, 6.29); ctx.fill();
  const hipY = -34, shY = -62, headY = -76;
  // folded legs
  ctx.strokeStyle = '#0D1226'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(dir * 22, -6); ctx.lineTo(dir * -6, -4); ctx.stroke();
  // torso slumped
  ctx.strokeStyle = body; ctx.lineWidth = 20;
  ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(dir * 8, shY); ctx.stroke();
  // head bowed
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(dir * 14, headY + 8, 11, 0, 6.29); ctx.fill();
  ctx.strokeStyle = trim; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(dir * 4, headY + 4); ctx.lineTo(dir * 24, headY + 6); ctx.stroke();
  // sword planted in the ground
  const hx = dir * 26, hy = shY + 16;
  ctx.strokeStyle = '#9AA7C4'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + dir * 6, 2); ctx.stroke();
  ctx.strokeStyle = body; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(dir * 8, shY + 6); ctx.lineTo(hx, hy); ctx.stroke();
}

/* ============================================================================
 * UI — bars, touch buttons, screens
 * ========================================================================== */
const UI = {
  setupTouchButtons() {
    Input.buttons = [
      { id: 'left', x: 112, y: 606, r: 58, label: '◀', pressed: false },
      { id: 'right', x: 250, y: 606, r: 58, label: '▶', pressed: false },
      { id: 'jump', x: 1006, y: 606, r: 55, label: 'JMP', sub: 'jump', pressed: false },
      { id: 'deflect', x: 1082, y: 492, r: 58, label: 'DFL', sub: 'deflect', pressed: false },
      { id: 'attack', x: 1180, y: 606, r: 64, label: 'ATK', sub: 'attack', pressed: false },
    ];
  },

  bar(ctx, x, y, w, h, frac, fill) {
    // thin minimal bar: translucent night track, bone hairline, palette fill
    ctx.fillStyle = 'rgba(11,16,38,0.7)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.strokeStyle = 'rgba(232,228,216,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
    // faint top shine
    ctx.fillStyle = 'rgba(244,241,228,0.15)';
    ctx.fillRect(x, y, w * clamp(frac, 0, 1), h * 0.4);
  },

  label(ctx, str, x, y, align) {
    ctx.textAlign = align || 'left';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.font = '300 15px system-ui, sans-serif';
    ctx.fillStyle = '#E8E4D8';
    ctx.fillText(str, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.textAlign = 'left';
  },

  draw(ctx) {
    const p = G.player, e = G.enemy;
    // player bars (top-left)
    this.label(ctx, 'RONIN', 28, 32);
    this.bar(ctx, 28, 40, 300, 10, p.hp / p.maxHp, '#A93226');
    this.bar(ctx, 28, 56, 300, 6, p.posture / CFG.POSTURE_MAX, '#F5A524');
    // enemy bars (top-right)
    this.label(ctx, 'KURENAI', CFG.W - 28, 32, 'right');
    this.bar(ctx, CFG.W - 328, 40, 300, 10, e.hp / e.maxHp, '#A93226');
    this.bar(ctx, CFG.W - 328, 56, 300, 6, e.posture / CFG.POSTURE_MAX, '#F5A524');
    // deathblow pips: filled red = remaining, hollow = spent
    for (let i = 0; i < CFG.BOSS_PIPS; i++) {
      const px = CFG.W - 328 + i * 26, py = 82;
      ctx.beginPath(); ctx.arc(px, py, 8, 0, 6.29);
      if (i < e.pips) { ctx.fillStyle = '#D43A2F'; ctx.fill(); }
      else {
        ctx.strokeStyle = 'rgba(212,58,47,0.45)'; ctx.lineWidth = 2; ctx.stroke();
      }
    }
    // phase 2 marker: the boss name burns red once Kurenai rises again
    if (e.phase === 2) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#D43A2F';
      ctx.font = '300 13px system-ui, sans-serif';
      ctx.fillText('PHASE II', CFG.W - 28, 100);
      ctx.textAlign = 'left';
    }

    // deflect timing pip: shows how "fresh" your last deflect was
    // (helps players learn the timing windows)
    const sinceD = performance.now() - p.lastDeflectPress;
    if (sinceD < 600 && G.mode === 'fight') {
      const k = 1 - sinceD / 600;
      ctx.globalAlpha = 0.85 * k + 0.15;
      ctx.fillStyle = sinceD <= CFG.DEFLECT_PERFECT_MS ? '#F4F1E4'
        : sinceD <= CFG.DEFLECT_PARTIAL_MS ? '#8FA3C4' : '#3D4C68';
      ctx.beginPath(); ctx.arc(348, 58, 8, 0, 6.29); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // touch buttons
    if (Input.touchMode) {
      for (const b of Input.buttons) {
        ctx.globalAlpha = b.pressed ? 0.55 : 0.30;
        ctx.fillStyle = b.id === 'attack' ? '#A93226' : b.id === 'deflect' ? '#2C3E66' : '#1a2340';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.29); ctx.fill();
        ctx.globalAlpha = b.pressed ? 0.95 : 0.6;
        ctx.strokeStyle = '#E8E4D8'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.29); ctx.stroke();
        ctx.fillStyle = '#E8E4D8'; ctx.textAlign = 'center';
        ctx.font = `600 ${b.r > 60 ? 24 : 20}px system-ui, sans-serif`;
        ctx.fillText(b.label, b.x, b.y + 8);
      }
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = 'rgba(232,228,216,0.5)';
      ctx.font = '300 14px system-ui, sans-serif';
      ctx.fillText('A/D move · J attack · K deflect · SPACE jump · click attack · right-click deflect', 28, CFG.H - 18);
    }
  },

  drawScreens(ctx) {
    if (G.mode === 'gameover' && G.modeT > 700) {
      const k = Math.min(1, (G.modeT - 700) / 900);
      ctx.fillStyle = `rgba(20,2,2,${0.78 * k})`;
      ctx.fillRect(0, 0, CFG.W, CFG.H);
      ctx.globalAlpha = k;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#D43A2F';
      ctx.font = '300 120px system-ui, sans-serif';
      ctx.fillText('DEATH', CFG.W / 2, CFG.H / 2 - 10);
      ctx.fillStyle = 'rgba(230,220,220,0.75)';
      ctx.font = '22px Georgia, serif';
      ctx.fillText('tap to rise again', CFG.W / 2, CFG.H / 2 + 60);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    } else if (G.mode === 'victory' && G.modeT > 900) {
      const k = Math.min(1, (G.modeT - 900) / 900);
      ctx.fillStyle = `rgba(2,8,14,${0.72 * k})`;
      ctx.fillRect(0, 0, CFG.W, CFG.H);
      ctx.globalAlpha = k;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#F5A524';
      ctx.font = '300 84px system-ui, sans-serif';
      ctx.fillText('VICTORY', CFG.W / 2, CFG.H / 2 - 10);
      ctx.fillStyle = 'rgba(230,230,220,0.75)';
      ctx.font = '22px Georgia, serif';
      ctx.fillText('tap to fight again', CFG.W / 2, CFG.H / 2 + 56);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
    // resurrection choice: the duel is frozen, strike to rise or fall
    if (G.mode === 'resurrect') {
      const k = Math.min(1, G.modeT / 300);
      ctx.fillStyle = `rgba(10,4,4,${0.55 * k})`;
      ctx.fillRect(0, 0, CFG.W, CFG.H);
      ctx.globalAlpha = k;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#F4F1E4';
      ctx.font = '300 64px system-ui, sans-serif';
      ctx.fillText('RESURRECT?', CFG.W / 2, CFG.H / 2 - 30);
      ctx.fillStyle = 'rgba(230,220,220,0.75)';
      ctx.font = '22px Georgia, serif';
      ctx.fillText('strike to rise again', CFG.W / 2, CFG.H / 2 + 34);
      // countdown: the choice expires
      const frac = clamp(1 - G.modeT / CFG.RESURRECT_WINDOW_MS, 0, 1);
      ctx.fillStyle = 'rgba(232,228,216,0.25)';
      ctx.fillRect(CFG.W / 2 - 150, CFG.H / 2 + 70, 300, 6);
      ctx.fillStyle = '#D43A2F';
      ctx.fillRect(CFG.W / 2 - 150, CFG.H / 2 + 70, 300 * frac, 6);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
    // deathblow flash
    if (G.flashWhite > 0) {
      ctx.fillStyle = `rgba(244,241,228,${clamp(G.flashWhite, 0, 1) * 0.9})`;
      ctx.fillRect(0, 0, CFG.W, CFG.H);
    }
  },
};

/* ============================================================================
 * MAIN LOOP — fixed 60Hz timestep, hitstop freezes logic but never rendering.
 * ========================================================================== */
const STEP = 1000 / 60;
let acc = 0, lastT = 0;

function update(dt, now) {
  const dtMs = dt * 1000;
  G.now = now;

  if (G.mode === 'deathblow') { updateDeathblow(dt, now); Particles.update(dt); FloatText.update(dt); return; }

  if (G.mode === 'resurrect') {
    // The duel is frozen; the player chooses: strike to rise, or fall.
    const dtMs = dt * 1000;
    G.modeT += dtMs;
    G.player.deadT += dtMs;
    Particles.update(dt); FloatText.update(dt);
    const rose = Input.consume('attackBuf', now, 400) || Input.consume('deflectBuf', now, 400);
    if (G.modeT < CFG.RESURRECT_WINDOW_MS && rose) {
      const pl = G.player;
      pl.hp = Math.floor(pl.maxHp * 0.5); pl.posture = 0;
      pl.state = 'idle'; pl.stateT = 0; pl.vx = 0; pl.vy = 0;
      pl.invulnT = CFG.RESURRECT_INVULN_MS;
      G.mode = 'fight'; G.modeT = 0;
      FloatText.add(pl.x, pl.y - 200, 'RESURRECTED', '#F4F1E4', 36);
      Particles.ring(pl.x, pl.y - 90, '#F4F1E4', 120, 0.5);
      AudioSys.uiTap();
    } else if (G.modeT >= CFG.RESURRECT_WINDOW_MS) {
      // the choice expires — death is final
      const pl = G.player;
      pl.hp = 0; pl.dead = true; pl.state = 'dead'; pl.vx = 0;
      Particles.dust(pl.x, pl.y, 14);
      G.mode = 'gameover'; G.modeT = 0;
    }
    return;
  }

  if (G.mode === 'gameover' || G.mode === 'victory') {
    G.modeT += dtMs;
    const p = G.player, e = G.enemy;
    p.deadT += dtMs; e.deadT += dtMs;
    Particles.update(dt); FloatText.update(dt);
    // instant retry on any fresh press
    const wait = G.mode === 'gameover' ? 900 : 1200;
    if (G.modeT > wait && now - Input.anyPressBuf < 300) {
      AudioSys.uiTap();
      resetFight();
      FloatText.add(CFG.W / 2, 300, 'FIGHT!', '#F4F1E4', 54);
    }
    return;
  }

  // --- fight ---
  updatePlayer(G.player, G.enemy, dt, now);
  if (!G.enemy.dead) updateEnemy(G.enemy, G.player, dt, now);
  else G.enemy.deadT += dtMs;
  if (G.player.dead) G.player.deadT += dtMs;
  updatePostureDrain(G.player, now, dt);
  updatePostureDrain(G.enemy, now, dt);
  Particles.update(dt);
  FloatText.update(dt);
}

function render(ctx) {
  // screen shake
  G.shake = Math.max(0, G.shake - 40 * (1 / 60));
  const sx = (Math.random() * 2 - 1) * G.shake;
  const sy = (Math.random() * 2 - 1) * G.shake;

  // subtle camera drift toward the player — visual only, never gameplay
  const target = clamp((G.player.x - CFG.W / 2) * 0.12, -ART.CAM_MAX, ART.CAM_MAX);
  G.camX = lerp(G.camX, target, 0.08);

  // painted backdrop: sky (0.15) -> mid (0.45) in screen space
  Scene.draw(ctx, G.camX, sx, sy, G.time);

  // world space: ground (1.0), fighters, particles, floating text
  ctx.save();
  ctx.translate(sx - G.camX, sy);
  if (BG.ready) Scene.drawGround(ctx);
  const p = G.player, e = G.enemy;
  drawFighter(ctx, e);
  drawFighter(ctx, p);
  Particles.draw(ctx);
  FloatText.draw(ctx);
  ctx.restore();

  // UI in screen space
  UI.draw(ctx);
  UI.drawScreens(ctx);

  // vignette: soft radial to ink black
  const v = ctx.createRadialGradient(CFG.W / 2, CFG.H / 2, 320, CFG.W / 2, CFG.H / 2, 760);
  v.addColorStop(0, 'rgba(5,7,15,0)'); v.addColorStop(1, 'rgba(5,7,15,0.35)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, CFG.W, CFG.H);
}

function frame(t) {
  requestAnimationFrame(frame);
  if (!lastT) lastT = t;
  let dt = (t - lastT) / 1000;
  lastT = t;
  dt = Math.min(dt, 0.1);
  G.time += dt;

  if (G.freeze > 0) {
    G.freeze -= dt * 1000; // hitstop: logic frozen, rendering continues
  } else {
    acc += dt;
    let n = 0;
    const now = performance.now();
    while (acc >= STEP / 1000 && n < 5) { update(STEP / 1000, now); acc -= STEP / 1000; n++; }
    if (n === 5) acc = 0; // drop backlog after hitches
  }
  const canvas = frame.canvas;
  render(canvas.getContext('2d'));
}

/* ------------------------------------------------------------- boot */
function boot() {
  const canvas = document.getElementById('game');
  canvas.width = CFG.W; canvas.height = CFG.H;
  frame.canvas = canvas;

  // scale canvas to fit viewport, preserving aspect ratio
  const fit = () => {
    const s = Math.min(window.innerWidth / CFG.W, window.innerHeight / CFG.H);
    canvas.style.width = Math.floor(CFG.W * s) + 'px';
    canvas.style.height = Math.floor(CFG.H * s) + 'px';
  };
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 100));
  fit();

  const toCanvas = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    return { x: (cx - r.left) / r.width * CFG.W, y: (cy - r.top) / r.height * CFG.H };
  };

  UI.setupTouchButtons();
  Input.init(canvas, toCanvas);
  BG.load(); // painted plates (async); Scene falls back to gradient until ready
  SPR.load(); // painted fighter sprites (async); falls back to procedural drawing
  resetFight();
  FloatText.add(CFG.W / 2, 300, 'FIGHT!', '#F4F1E4', 54);
  // opening petals
  for (let i = 0; i < 14; i++) Particles.petal();
  requestAnimationFrame(frame);
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', boot);
}

// Node test hook (kept at end of file so all declarations are initialized).
if (typeof window === 'undefined' && typeof module !== 'undefined') {
  module.exports = {
    CFG, ART, BG, SPR, SPRITE_FRAMES, SPR_SCALE, spriteSheetFor, spriteFrameFor,
    clamp, lerp, resolveDeflect, applyPostureDrain,
    G, Input, Particles, FloatText, UI, Scene, AudioSys,
    resetFight, update, render, boot, drawFighter,
    updatePlayer, updateEnemy, tryPlayerHit, tryEnemyHit,
    damagePosture, startDeathblow, killFighter, makeFighter,
    chooseBossAttack, tryPerilousHit, hurtPlayer, startResurrect,
  };
}
