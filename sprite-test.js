/* Sprite integration tests for game.js.
 * Verifies: (1) spriteFrameFor covers every fighter state with a valid frame
 * on both sheets; (2) frame data sanity; (3) the real drawFighter render path
 * with sprites on: exactly one drawImage per fighter, correct source rect,
 * foot-center anchored on (f.x, f.y) in both facing directions, correct frame
 * per state, and the dead-state fade.
 * Run: node sprite-test.js
 */
'use strict';
const G = require('./game.js');

let passed = 0, failed = 0;
function ok(cond, name) {
  if (cond) { passed++; }
  else { failed++; console.error('FAIL:', name); }
}

const SHEETS = ['player', 'boss'];
const STATES = ['idle', 'approach', 'run', 'jump', 'attack', 'deflect', 'aim',
  'windup', 'strike', 'perilousWindup', 'perilousStrike', 'backstep',
  'recover', 'hitstun', 'staggered', 'dead'];

// ---- 1. state -> frame coverage ----
for (const st of STATES) {
  for (const isPlayer of [true, false]) {
    const sheet = isPlayer ? 'player' : 'boss';
    const f = {
      state: st, isPlayer, dir: 1, animT: 1.7, chain: 1,
      attack: { type: 'sweep' }, deadT: 0, flash: 0, x: 400, y: 500,
    };
    let fr = null;
    try { fr = G.spriteFrameFor(f); } catch (e) { /* caught below */ }
    ok(typeof fr === 'string' && !!G.SPRITE_FRAMES[sheet][fr],
      `state '${st}' (${sheet}) -> valid frame '${fr}'`);
  }
}
for (const chain of [0, 1, 2]) {
  const fr = G.spriteFrameFor({ state: 'attack', chain });
  ok(fr === ['attack1', 'attack2', 'attack3'][chain], `chain ${chain} -> ${fr}`);
}
ok(G.spriteFrameFor({ state: 'strike', attack: { type: 'leapHeavy' } }) === 'attack3', 'leapHeavy -> attack3');
ok(G.spriteFrameFor({ state: 'strike', attack: null }) === 'attack1', 'strike w/o attack -> attack1');
for (const [type, want] of [['sweep', 'attack2'], ['thrust', 'attack1'], ['grab', 'attack3']]) {
  ok(G.spriteFrameFor({ state: 'perilousStrike', attack: { type } }) === want, `perilous ${type} -> ${want}`);
}
{
  const a = G.spriteFrameFor({ state: 'run', animT: 0.1 });
  const b = G.spriteFrameFor({ state: 'run', animT: 0.1 + Math.PI / 13 });
  ok(a !== b, `walk alternates (${a} -> ${b})`);
}
ok(G.spriteFrameFor({ state: 'bogus' }) === 'idle', 'unknown state -> idle');

// ---- 2. frame data sanity ----
for (const sheet of SHEETS) {
  const frames = G.SPRITE_FRAMES[sheet];
  ok(Object.keys(frames).length === 12, `${sheet} has 12 frames`);
  for (const [name, g] of Object.entries(frames)) {
    ok(g.tw > 0 && g.th > 0, `${sheet}/${name} positive size`);
    ok(g.ax >= 0 && g.ax <= g.tw, `${sheet}/${name} anchor in range`);
  }
}

// ---- 3. real render path with sprites forced on ----
function recordCtx() {
  const calls = [];
  const grad = { addColorStop() {} };
  return {
    calls,
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    translate(x, y) { calls.push(['translate', x, y]); },
    scale(x, y) { calls.push(['scale', x, y]); },
    rotate(a) { calls.push(['rotate', a]); },
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    quadraticCurveTo() {}, arc() {}, ellipse() {}, fill() {}, stroke() {},
    fillText() {},
    createRadialGradient() { return grad; },
    createLinearGradient() { return grad; },
    drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) {
      calls.push(['drawImage', img, sx, sy, sw, sh, dx, dy, dw, dh]);
    },
  };
}

function baseFighter(over) {
  return Object.assign({
    isPlayer: true, dir: 1, x: 400, y: 500,
    state: 'idle', animT: 0.5, stateT: 0, chain: 0,
    attack: null, flash: 0, deadT: 0, windupDur: 300, perilousDur: 420,
  }, over);
}

function enableSprites() {
  G.SPR.player = { fake: 'player-img' };
  G.SPR.boss = { fake: 'boss-img' };
  G.SPR.ready = true; G.SPR.ok = true;
}
function disableSprites() {
  G.SPR.player = null; G.SPR.boss = null;
  G.SPR.ready = false; G.SPR.ok = false;
}

// one drawImage per fighter, correct sheet image, source = frame's tight box
for (const isPlayer of [true, false]) {
  const sheet = isPlayer ? 'player' : 'boss';
  enableSprites();
  const ctx = recordCtx();
  const f = baseFighter({ isPlayer, state: 'attack', chain: 2 });
  G.drawFighter(ctx, f);
  const draws = ctx.calls.filter(c => c[0] === 'drawImage');
  ok(draws.length === 1, `${sheet}: exactly one drawImage (got ${draws.length})`);
  const wantFrame = G.SPRITE_FRAMES[sheet]['attack3'];
  const d = draws[0];
  ok(d[1] && d[1].fake === sheet + '-img', `${sheet}: draws the ${sheet} sheet`);
  ok(d[2] === wantFrame.tx && d[3] === wantFrame.ty && d[4] === wantFrame.tw && d[5] === wantFrame.th,
    `${sheet}: source rect = attack3 tight box`);
  // dest: dx=-ax, dy=-th in the translated+scaled local space, so the
  // foot-center lands on (f.x, f.y): world = f + dir*sc*(dx+ax), f.y + sc*(dy+th)
  const sc = G.SPR_SCALE * (isPlayer ? 1 : 1.25);
  const wx = f.x + f.dir * sc * (d[6] + wantFrame.ax);
  const wy = f.y + sc * (d[7] + wantFrame.th);
  ok(Math.abs(wx - f.x) < 1e-9 && Math.abs(wy - f.y) < 1e-9,
    `${sheet}: foot-center anchored on (f.x, f.y)`);
  // facing flip: scale x must carry the sign of dir
  const scales = ctx.calls.filter(c => c[0] === 'scale');
  ok(scales.some(s => Math.sign(s[1]) === Math.sign(f.dir) && Math.abs(Math.abs(s[1]) - sc) < 1e-9),
    `${sheet}: facing flip via scale x sign`);
  disableSprites();
}

// facing left: anchor still exact
{
  enableSprites();
  const ctx = recordCtx();
  const f = baseFighter({ isPlayer: true, dir: -1, state: 'deflect', x: 611, y: 502 });
  G.drawFighter(ctx, f);
  const draws = ctx.calls.filter(c => c[0] === 'drawImage');
  const g = G.SPRITE_FRAMES.player['deflect'];
  const d = draws[0];
  const sc = G.SPR_SCALE;
  const wx = f.x + f.dir * sc * (d[6] + g.ax);
  const wy = f.y + sc * (d[7] + g.th);
  ok(draws.length === 1 && Math.abs(wx - f.x) < 1e-9 && Math.abs(wy - f.y) < 1e-9,
    `dir=-1: foot-center anchored on (f.x, f.y)`);
  disableSprites();
}

// dead state: 'down' frame + fade alpha applied
{
  enableSprites();
  const ctx = recordCtx();
  let alphaSeen = null;
  const proxy = new Proxy(ctx, {
    set(t, p, v) { if (p === 'globalAlpha') alphaSeen = v; t[p] = v; return true; },
  });
  const f = baseFighter({ isPlayer: false, state: 'dead', deadT: 600 });
  G.drawFighter(proxy, f);
  const draws = ctx.calls.filter(c => c[0] === 'drawImage');
  const g = G.SPRITE_FRAMES.boss['down'];
  ok(draws.length === 1 && draws[0][2] === g.tx && draws[0][4] === g.tw, 'dead: draws down frame');
  ok(alphaSeen !== null && alphaSeen < 1 && alphaSeen >= 0.25, `dead: fade alpha applied (${alphaSeen})`);
  disableSprites();
}

// fallback path still works when sprites are unavailable (Node default)
{
  const ctx = recordCtx();
  const f = baseFighter({ state: 'attack', chain: 0 });
  let threw = null;
  try { G.drawFighter(ctx, f); } catch (e) { threw = e; }
  const draws = ctx.calls.filter(c => c[0] === 'drawImage');
  ok(!threw && draws.length === 0, 'fallback: procedural path runs, no drawImage');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
