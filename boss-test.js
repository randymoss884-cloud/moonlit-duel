/* Headless Phase-3 boss tests for game.js (Kurenai encounter).
 * Covers: perilous sweep (jump to evade, unblockable), thrust mikiri
 * (last-instant deflect) vs mistimed, grab phase-gating + catch rules,
 * leaping heavy deflectability, and the one-per-attempt resurrection.
 * Run: node boss-test.js
 */
'use strict';

// ---- fake clock ----
let fakeNow = 0;
global.performance = { now: () => fakeNow };

// ---- fake 2d context ----
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

// ---- load game without a window, then define one for boot() ----
delete global.window;
const api = require('./game.js');
let domReadyCb = null;
global.window = {
  addEventListener: (ev, cb) => { if (ev === 'DOMContentLoaded') domReadyCb = cb; },
  removeEventListener() {},
  matchMedia: () => ({ matches: false }),
  innerWidth: 1280, innerHeight: 720,
  AudioContext: undefined, webkitAudioContext: undefined,
};
global.document = { getElementById: () => canvas };
global.requestAnimationFrame = () => {};

const {
  G, Input, CFG, resetFight, update, boot,
  chooseBossAttack, damagePosture,
} = api;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) pass++;
  else { fail++; console.error('FAIL:', name); }
}
function step(ms) {
  const n = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < n; i++) { fakeNow += 1000 / 60; update(1 / 60, fakeNow); }
}
function waitFor(pred, timeoutMs, label) {
  let t = 0;
  while (!pred() && t < timeoutMs) { step(16.67); t += 16.67; }
  ok(pred(), `waitFor: ${label}`);
}

boot();

// Force the enemy into a perilous attack, player standing next to it.
function forcePerilous(type, phase) {
  resetFight();
  const e = G.enemy, p = G.player;
  e.phase = phase || 1;
  p.x = e.x - 70; p.dir = 1;
  e.dir = -1;
  e.attack = { type };
  e.state = 'perilousWindup'; e.stateT = 0;
  e.perilousDur = CFG.PERILOUS_WINDUP_MS;
  Input.left = Input.right = false;
  return { e, p };
}

// ---------- 1. sweep: jumping avoids it ----------
{
  const { e, p } = forcePerilous('sweep');
  Input.pressJump(fakeNow);
  step(150); // get airborne: y well above the sweep
  ok(p.y < CFG.FLOOR_Y - 40, 'player is airborne before the sweep lands');
  waitFor(() => e.state === 'recover', 4000, 'sweep resolves');
  ok(p.hp === 100, `jumped sweep: no damage (hp=${p.hp})`);
}

// ---------- 2. sweep: guarding does NOT stop it (unblockable) ----------
{
  const { e, p } = forcePerilous('sweep');
  // perfect-timed deflect press — still a full hit, sweeps can't be deflected
  waitFor(() => e.state === 'perilousWindup' && e.stateT >= e.perilousDur - 20, 3000, 'sweep windup near end');
  Input.pressDeflect(fakeNow); // ~100ms before impact: "perfect" timing, useless here
  waitFor(() => e.state === 'recover', 3000, 'sweep lands');
  step(200);
  ok(p.hp === 100 - CFG.SWEEP_DAMAGE, `guarded sweep: full damage (hp=${p.hp})`);
  ok(p.posture > 0, 'guarded sweep deals posture damage');
}

// ---------- 3. thrust: last-instant deflect = MIKIRI ----------
{
  const { e, p } = forcePerilous('thrust');
  waitFor(() => e.state === 'perilousWindup' && e.stateT >= e.perilousDur - 20, 3000, 'thrust windup near end');
  Input.pressDeflect(fakeNow); // ~100ms before impact: last-instant deflect
  waitFor(() => e.state === 'recover', 3000, 'thrust resolves');
  step(200);
  ok(p.hp === 100, `mikiri: no damage taken (hp=${p.hp})`);
  ok(e.posture >= CFG.MIKIRI_POSTURE - 1,
    `mikiri: boss takes ${CFG.MIKIRI_POSTURE} posture (posture=${e.posture.toFixed(1)})`);
}

// ---------- 4. thrust: mistimed deflect (partial window) = FULL damage ----------
{
  const { e, p } = forcePerilous('thrust');
  // press 250ms before impact: inside the normal partial window, but a
  // thrust can't be partially deflected — mistimed means full damage
  waitFor(() => e.state === 'perilousWindup' && e.stateT >= e.perilousDur - 170, 3000, 'thrust windup mid');
  Input.pressDeflect(fakeNow);
  waitFor(() => e.state === 'recover', 3000, 'thrust lands');
  step(200);
  ok(p.hp === 100 - CFG.ENEMY_HIT_DAMAGE,
    `mistimed thrust deflect: full damage, not chip (hp=${p.hp})`);
}

// ---------- 5. grab is phase-2-only ----------
{
  resetFight();
  const e = G.enemy, p = G.player;
  e.phase = 1;
  const seen = new Set();
  for (let i = 0; i < 300; i++) seen.add(chooseBossAttack(e, p));
  ok(!seen.has('grab'), 'phase 1 never selects grab (300 trials)');

  e.phase = 2;
  p.x = e.x - 100; // close range
  const origRandom = Math.random;
  Math.random = () => 0.1; // force: perilous roll < 0.38, grab roll < 0.35
  ok(chooseBossAttack(e, p) === 'grab', 'phase 2 at close range can select grab');
  Math.random = origRandom;
}

// ---------- 6. grab: caught = heavy HP, NO posture ----------
{
  const { e, p } = forcePerilous('grab', 2);
  waitFor(() => e.state === 'recover', 4000, 'grab resolves');
  step(200);
  ok(p.hp === 100 - CFG.GRAB_DAMAGE, `grabbed: ${CFG.GRAB_DAMAGE} HP damage (hp=${p.hp})`);
  ok(p.posture === 0, `grabbed: no posture interaction (posture=${p.posture})`);
}

// ---------- 7. grab: jumping avoids it ----------
{
  const { e, p } = forcePerilous('grab', 2);
  Input.pressJump(fakeNow);
  step(150);
  waitFor(() => e.state === 'recover', 4000, 'grab whiffs');
  ok(p.hp === 100, `jumped grab: no damage (hp=${p.hp})`);
}

// ---------- 8. leaping heavy (phase 2): normal deflect rules apply ----------
{
  resetFight();
  const e = G.enemy, p = G.player;
  e.phase = 2;
  p.x = e.x - 70; p.dir = 1; e.dir = -1;
  e.attack = { type: 'leapHeavy' };
  e.leapFromX = e.x;
  e.leapTargetX = p.x - e.dir * 70;
  e.state = 'windup'; e.stateT = 0; e.windupDur = 400;
  Input.left = Input.right = false;
  // impact at 200ms into the strike; press 100ms before
  waitFor(() => e.state === 'strike' && e.stateT >= 100, 4000, 'leap in flight');
  Input.pressDeflect(fakeNow);
  waitFor(() => e.state === 'recover', 4000, 'leap resolves');
  step(200);
  ok(p.hp === 100, `deflected leaping heavy: no damage (hp=${p.hp})`);
  ok(e.posture >= CFG.PERFECT_ENEMY_POSTURE - 5,
    `deflected leaping heavy: enemy posture damage (posture=${e.posture.toFixed(1)})`);
}

// ---------- 9. resurrection: one per attempt ----------
{
  resetFight();
  const p = G.player;
  p.hp = 10;
  waitFor(() => G.mode === 'resurrect' || G.mode === 'gameover', 25000, 'lethal hit offers resurrection');
  ok(G.mode === 'resurrect', 'first lethal hit -> resurrect prompt (not instant death)');
  Input.pressAttack(fakeNow);
  step(300);
  ok(G.mode === 'fight', 'strike to rise -> back in the fight');
  ok(p.hp === Math.floor(p.maxHp * 0.5), `resurrect at 50% HP (hp=${p.hp})`);
  ok(G.resUsed === true, 'resurrection is consumed');
  // second lethal hit: no more resurrections
  p.hp = 5;
  waitFor(() => G.mode === 'gameover', 25000, 'second lethal hit -> gameover');
  ok(G.mode === 'gameover', 'no second resurrection');
}

// ---------- 10. perilous whiff: backing off avoids damage ----------
{
  const { e, p } = forcePerilous('sweep');
  p.x = e.x - 400; // walk out of range before it lands
  waitFor(() => e.state === 'recover', 4000, 'sweep whiffs at range');
  ok(p.hp === 100, `out-of-range sweep: no damage (hp=${p.hp})`);
}

// ---------- 11. thrust mikiri TIMING BOUNDARY ----------
// press ~180ms before impact (inclusive boundary) -> mikiri;
// press ~200ms before impact -> full damage. Frame granularity is 16.67ms,
// so the chosen offsets keep both cases deterministic.
{
  const { e, p } = forcePerilous('thrust');
  // dt = (420 - stateT) + 80; stateT in [320, 336.7) -> dt in (163, 180] -> mikiri
  waitFor(() => e.state === 'perilousWindup' && e.stateT >= e.perilousDur - 100, 3000, 'thrust at boundary');
  Input.pressDeflect(fakeNow);
  waitFor(() => e.state === 'recover', 3000, 'thrust resolves');
  step(200);
  ok(p.hp === 100 && e.posture >= CFG.MIKIRI_POSTURE - 1,
    `180ms boundary: mikiri (hp=${p.hp}, posture=${e.posture.toFixed(1)})`);
}
{
  const { e, p } = forcePerilous('thrust');
  // stateT in [290, 306.7) -> dt in (193, 210] -> full damage
  waitFor(() => e.state === 'perilousWindup' && e.stateT >= e.perilousDur - 130, 3000, 'thrust past boundary');
  Input.pressDeflect(fakeNow);
  waitFor(() => e.state === 'recover', 3000, 'thrust lands');
  step(200);
  ok(p.hp === 100 - CFG.ENEMY_HIT_DAMAGE,
    `200ms: mistimed, full damage (hp=${p.hp})`);
}

// ---------- 12. sweep jumped at the LAST moment (~110ms before impact) ----------
{
  const { e, p } = forcePerilous('sweep');
  waitFor(() => e.state === 'perilousWindup' && e.stateT >= e.perilousDur - 30, 3000, 'sweep almost over');
  Input.pressJump(fakeNow); // ~110ms before impact; needs ~73ms to clear the blade
  waitFor(() => e.state === 'recover', 4000, 'sweep resolves');
  ok(p.hp === 100, `last-moment jump: evaded (hp=${p.hp})`);
}

// ---------- 13. deflect stance expires (350ms) — no permanent root ----------
{
  resetFight();
  const p = G.player, e = G.enemy;
  e.state = 'idle'; e.thinkT = 99999; // keep the enemy out of it
  Input.pressDeflect(fakeNow);
  step(100);
  ok(p.state === 'deflect', 'deflect stance is up right after press');
  step(400); // stance (350ms) expires on its own
  ok(p.state === 'idle', `stance expires after ${CFG.DEFLECT_ACTIVE_MS}ms (state=${p.state})`);
}

// ---------- 14. jump cancels the deflect stance (sweep counter always live) ----------
{
  resetFight();
  const p = G.player;
  const e = G.enemy;
  e.state = 'idle'; e.thinkT = 99999; // keep the enemy out of it
  Input.pressDeflect(fakeNow);
  step(100);
  ok(p.state === 'deflect', 'in deflect stance');
  Input.pressJump(fakeNow);
  step(120);
  ok(p.y < CFG.FLOOR_Y - 40, `jump cancelled the stance, player airborne (y=${p.y.toFixed(0)})`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
