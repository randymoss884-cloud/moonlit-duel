/* Headless gameplay simulation for game.js.
 * Stubs all browser globals, boots the game, then plays scripted scenarios:
 * perfect deflect, clean hit, stagger -> deathblow, player death -> retry,
 * plus a 25-second random-input fuzz run with rendering enabled.
 * Run: node sim-test.js
 */
'use strict';

// ---- fake clock (drives performance.now) ----
let fakeNow = 0;
global.performance = { now: () => fakeNow };

// ---- fake 2d context: every method is a no-op, gradients are stubs ----
function fakeGradient() { return { addColorStop() {} }; }
const FAKE_METHODS = [
  'save', 'restore', 'translate', 'rotate', 'scale',
  'fillRect', 'strokeRect', 'clearRect',
  'beginPath', 'closePath', 'moveTo', 'lineTo', 'quadraticCurveTo',
  'arc', 'ellipse', 'fill', 'stroke', 'fillText', 'strokeText',
  'setLineDash', 'clip',
];
function fakeCtx() {
  const c = {};
  for (const m of FAKE_METHODS) c[m] = () => {};
  c.createLinearGradient = fakeGradient;
  c.createRadialGradient = fakeGradient;
  c.createPattern = () => null;
  c.canvas = null;
  return c;
}
const ctx = fakeCtx();

// ---- fake canvas ----
const canvas = {
  width: 0, height: 0, style: {},
  getContext: () => ctx,
  addEventListener() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
};

// ---- fake window/document ----
let domReadyCb = null;
global.window = {
  addEventListener: (ev, cb) => { if (ev === 'DOMContentLoaded') domReadyCb = cb; },
  removeEventListener() {},
  matchMedia: () => ({ matches: false }),
  innerWidth: 1280, innerHeight: 720,
  AudioContext: undefined, webkitAudioContext: undefined,
};
global.document = { getElementById: () => canvas };
global.requestAnimationFrame = () => {}; // we drive manually

// ---- load the game (window is undefined at require time? No — we defined
// ---- it. So instead: require BEFORE defining window. Do it via cache trick:
delete global.window;
const api = require('./game.js');
// now define window/document for boot()
global.window = {
  addEventListener: (ev, cb) => { if (ev === 'DOMContentLoaded') domReadyCb = cb; },
  removeEventListener() {},
  matchMedia: () => ({ matches: false }),
  innerWidth: 1280, innerHeight: 720,
  AudioContext: undefined, webkitAudioContext: undefined,
};
global.document = { getElementById: () => canvas };

const { G, Input, CFG, resetFight, update, render, boot, damagePosture } = api;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) pass++;
  else { fail++; console.error('FAIL:', name); }
}
function step(ms) {
  const n = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < n; i++) { fakeNow += 1000 / 60; update(1 / 60, fakeNow); }
}

// wait until predicate true or timeout (ms of game time)
function waitFor(pred, timeoutMs, label) {
  let t = 0;
  while (!pred() && t < timeoutMs) { step(16.67); t += 16.67; }
  ok(pred(), `waitFor: ${label}`);
}

boot();
ok(G.mode === 'fight', 'boots into fight mode');
ok(G.player.hp === 100 && G.enemy.hp === 150, 'initial HP correct');

// ---------- Scenario 1: enemy approaches and lands a clean hit ----------
resetFight();
Input.left = Input.right = false;
waitFor(() => G.player.hp < 100 || G.mode !== 'fight', 20000, 'enemy eventually hits player');
ok(G.player.hp === 100 - CFG.ENEMY_HIT_DAMAGE, `clean hit deals ${CFG.ENEMY_HIT_DAMAGE} dmg (hp=${G.player.hp})`);
ok(G.player.posture > 0, 'clean hit deals player posture damage');

// ---------- Scenario 2: perfect deflect ----------
// wait for the next windup, press deflect 100ms before the hit lands
resetFight();
waitFor(() => G.enemy.state === 'windup', 15000, 'enemy winds up again');
{
  const e = G.enemy, p = G.player;
  const hpBefore = p.hp;
  // hit lands at windupDur + STRIKE_HIT_AT; press 100ms before that
  const pressAt = e.windupDur - 40; // 40ms before windup ends => ~100ms before hit
  waitFor(() => e.state === 'windup' && e.stateT >= pressAt, 2000, 'windup near end');
  Input.pressDeflect(fakeNow);
  waitFor(() => e.state === 'recover' || e.state === 'strike' && e.hitDone, 2000, 'strike resolves');
  step(300);
  ok(p.hp === hpBefore, `perfect deflect: no damage taken (hp=${p.hp})`);
  ok(e.posture >= CFG.PERFECT_ENEMY_POSTURE - 5, `perfect deflect: enemy posture +35 (posture=${e.posture.toFixed(1)})`);
}

// ---------- Scenario 3: stagger -> deathblow -> PHASE 2 (2 pips per spec) ----------
resetFight();
{
  const p = G.player, e = G.enemy;
  damagePosture(e, 100, fakeNow);
  ok(e.state === 'staggered', 'full posture staggers enemy');
  p.x = e.x - 60; p.dir = 1; // step into range
  Input.pressAttack(fakeNow);
  waitFor(() => G.mode === 'deathblow', 4000, 'deathblow triggers on staggered enemy');
  step(1500); // let the deathblow cinematic finish
  // first deathblow consumes one pip and triggers phase 2 — NOT victory
  ok(G.mode === 'fight', 'first deathblow -> back to fight (phase 2)');
  ok(e.pips === 1, `one pip consumed (pips=${e.pips})`);
  ok(e.phase === 2, 'boss is in phase 2');
  ok(e.hp === e.maxHp && e.posture === 0, 'phase 2: HP refilled, posture reset');

  // second deathblow ends the fight
  damagePosture(e, 100, fakeNow);
  ok(e.state === 'staggered', 'phase-2 posture break staggers enemy');
  p.x = e.x - 60; p.dir = 1;
  Input.pressAttack(fakeNow);
  waitFor(() => G.mode === 'deathblow', 4000, 'second deathblow triggers');
  step(1500);
  ok(e.dead && G.mode === 'victory', 'second deathblow kills -> victory');
}

// ---------- Scenario 4: player death -> instant retry ----------
resetFight();
{
  const p = G.player;
  p.hp = 10;
  waitFor(() => G.mode === 'gameover', 25000, 'player can die');
  ok(G.mode === 'gameover', 'player death -> gameover mode');
  step(1200); // let the DEATH screen appear
  Input.pressAttack(fakeNow); // any press retries
  step(400);
  ok(G.mode === 'fight' && G.player.hp === 100, 'tap retries instantly with full reset');
}

// ---------- Scenario 5: fuzz — 25s of random inputs, render every step ----------
resetFight();
{
  let rendered = 0;
  const moves = ['l', 'r', 'none'];
  for (let i = 0; i < 1500; i++) {
    fakeNow += 1000 / 60;
    const r = Math.random();
    const mv = moves[(Math.random() * 3) | 0];
    Input.left = mv === 'l'; Input.right = mv === 'r';
    if (r < 0.10) Input.pressAttack(fakeNow);
    else if (r < 0.18) Input.pressDeflect(fakeNow);
    else if (r < 0.23) Input.pressJump(fakeNow);
    update(1 / 60, fakeNow);
    render(ctx); rendered++;
    // if someone died mid-fuzz, retry and keep going
    if ((G.mode === 'gameover' || G.mode === 'victory') && G.modeT > 1300) {
      Input.pressAttack(fakeNow);
    }
    ok(Number.isFinite(G.player.x) && Number.isFinite(G.enemy.x), 'positions stay finite');
    ok(G.player.hp >= 0 && G.enemy.hp >= 0, 'hp never negative');
  }
  ok(rendered === 1500, 'fuzz completed 1500 steps with rendering');
  // touch buttons exist and are on-canvas
  ok(Input.buttons.length === 5, 'five touch buttons defined');
  for (const b of Input.buttons) {
    ok(b.x - b.r >= 0 && b.x + b.r <= CFG.W && b.y - b.r >= 0 && b.y + b.r <= CFG.H,
      `button ${b.id} inside canvas`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
