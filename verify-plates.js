/* Plate-integration verification for game.js (NOT part of the shipped tests).
 * Stubs a fake Image that "loads" the real PNG dimensions, records every
 * drawImage call, boots the game, renders frames, and asserts the painted
 * backdrop pipeline is wired: all 3 plates blitted, lantern glows drawn,
 * moon shimmer drawn, camera/parallax math sane.
 * Run: node verify-plates.js
 */
'use strict';

// ---- fake clock ----
let fakeNow = 0;
global.performance = { now: () => fakeNow };

// ---- fake Image: loads synchronously, reports real plate dimensions ----
const PLATE_DIMS = {
  'assets/bg_sky.png': [1920, 1080],
  'assets/bg_mid.png': [1920, 1080],
  'assets/bg_ground.png': [1920, 1080],
};
global.Image = class {
  constructor() { this.complete = false; this.onload = null; this.onerror = null; }
  set src(v) {
    const d = PLATE_DIMS[v];
    if (d) { this.width = d[0]; this.height = d[1]; this.complete = true; this._src = v; if (this.onload) this.onload(); }
    else if (this.onerror) this.onerror();
  }
};

// ---- recording fake 2d context ----
function fakeGradient() { return { addColorStop() {} }; }
const FAKE_METHODS = [
  'save', 'restore', 'translate', 'rotate', 'scale',
  'fillRect', 'strokeRect', 'clearRect',
  'beginPath', 'closePath', 'moveTo', 'lineTo', 'quadraticCurveTo',
  'arc', 'ellipse', 'fill', 'stroke', 'fillText', 'strokeText',
  'setLineDash', 'clip',
];
const calls = { drawImage: [], gradients: 0, arcs: 0, compositeLighter: 0 };
function fakeCtx() {
  const c = { _composite: 'source-over' };
  for (const m of FAKE_METHODS) c[m] = () => {};
  c.createLinearGradient = () => { calls.gradients++; return fakeGradient(); };
  c.createRadialGradient = () => { calls.gradients++; return fakeGradient(); };
  c.drawImage = (...a) => { calls.drawImage.push(a); };
  Object.defineProperty(c, 'globalCompositeOperation', {
    get() { return this._composite; },
    set(v) { this._composite = v; if (v === 'lighter') calls.compositeLighter++; },
  });
  c.canvas = null;
  return c;
}
const ctx = fakeCtx();

const canvas = {
  width: 0, height: 0, style: {},
  getContext: () => ctx,
  addEventListener() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
};

let domReadyCb = null;
global.document = { getElementById: () => canvas };
global.requestAnimationFrame = () => {};

delete global.window; // ensure game.js takes the Node export path
const api = require('./game.js');
global.window = {
  addEventListener: (ev, cb) => { if (ev === 'DOMContentLoaded') domReadyCb = cb; },
  removeEventListener() {},
  matchMedia: () => ({ matches: false }),
  innerWidth: 1280, innerHeight: 720,
  AudioContext: undefined, webkitAudioContext: undefined,
};

const { G, CFG, ART, Input, resetFight, update, render, boot } = api;
const BG = api.__BG || null;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) pass++;
  else { fail++; console.error('FAIL:', name); }
}

// BG is module-private; reach it via boot side-effect is not possible,
// so re-derive: render N frames and inspect recorded drawImage calls.
boot();
ok(typeof boot === 'function', 'boot exists');

// step some game time, then render several frames at different camera offsets
function step(ms) {
  const n = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < n; i++) { fakeNow += 1000 / 60; update(1 / 60, fakeNow); }
}
resetFight();
step(500);
G.player.x = 420; // left side -> camera should drift negative
for (let i = 0; i < 60; i++) { fakeNow += 1000 / 60; update(1 / 60, fakeNow); render(ctx); }
const camLeft = G.camX;
G.player.x = 1100; // right side -> camera drifts positive
for (let i = 0; i < 120; i++) { fakeNow += 1000 / 60; update(1 / 60, fakeNow); render(ctx); }
const camRight = G.camX;

ok(calls.drawImage.length > 0, `plates blitted via drawImage (${calls.drawImage.length} calls)`);
// identify plates by source-rect args: drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
const srcKeys = new Set(calls.drawImage.map((a) => `${a[1]},${a[2]},${a[3]},${a[4]}`));
ok(srcKeys.has('0,0,1920,1080'), 'sky plate drawn full-frame (0,0,1920,1080)');
ok(srcKeys.has('0,600,1920,480'), 'ground plate drawn cropped (0,600,1920,480)');
ok(calls.compositeLighter > 0, `lantern glow uses additive blend (${calls.compositeLighter}x)`);
ok(calls.gradients > 50, `radial gradients drawn for glows/shimmer (${calls.gradients})`);
ok(camLeft < 0 && camRight > 0, `camera drifts with player (left=${camLeft.toFixed(1)}, right=${camRight.toFixed(1)})`);
ok(Math.abs(camLeft) <= ART.CAM_MAX + 1 && Math.abs(camRight) <= ART.CAM_MAX + 1, 'camera clamped to CAM_MAX');
// mid layer lifted: mid dest y should be SKY_DY - MID_LIFT = -139 (sky at -36)
const midCalls = calls.drawImage.filter((a) => a[1] === 0 && a[2] === 0 && a[3] === 1920 && a[4] === 1080);
const dys = new Set(midCalls.map((a) => Math.round(a[6])));
ok(dys.has(-36) || [...dys].some((y) => Math.abs(y + 36) < 35), `sky layer near y=-36 (saw ${[...dys].join(',')})`);
ok([...dys].some((y) => Math.abs(y + 139) < 40), `mid layer lifted near y=-139 (saw ${[...dys].join(',')})`);
// ground dest: y=400, height=320
const gCalls = calls.drawImage.filter((a) => a[1] === 0 && a[2] === 600);
ok(gCalls.length > 0 && Math.abs(gCalls[0][6] - 400) < 35 && Math.abs(gCalls[0][8] - 320) < 40,
  `ground strip at y~400 h~320 (saw y=${gCalls.length ? gCalls[0][6].toFixed(0) : 'n/a'} h=${gCalls.length ? gCalls[0][8].toFixed(0) : 'n/a'})`);

// visuals must not move gameplay: fighter x within walls, hp sane after sim
resetFight();
for (let i = 0; i < 600; i++) {
  fakeNow += 1000 / 60;
  Input.left = Math.random() < 0.3; Input.right = Math.random() < 0.3;
  if (Math.random() < 0.1) Input.pressAttack(fakeNow);
  update(1 / 60, fakeNow); render(ctx);
  if ((G.mode === 'gameover' || G.mode === 'victory') && G.modeT > 1300) Input.pressAttack(fakeNow);
}
ok(G.player.x >= CFG.WALL_L && G.player.x <= CFG.WALL_R, 'player stays in arena (gameplay untouched)');
ok(Number.isFinite(G.camX), 'camera stays finite');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
