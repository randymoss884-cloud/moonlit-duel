/* Node sanity tests for the pure combat logic in game.js.
 * Run: node test.js
 */
'use strict';
const { CFG, resolveDeflect, applyPostureDrain } = require('./game.js');

let pass = 0, fail = 0;
function eq(actual, expected, name) {
  const ok = actual === expected;
  if (ok) pass++; else { fail++; console.error(`FAIL ${name}: got ${actual}, want ${expected}`); }
}
function approx(actual, expected, eps, name) {
  const ok = Math.abs(actual - expected) <= eps;
  if (ok) pass++; else { fail++; console.error(`FAIL ${name}: got ${actual}, want ~${expected}`); }
}

// --- deflect windows ---
eq(resolveDeflect(0), 'perfect', 'deflect at 0ms');
eq(resolveDeflect(100), 'perfect', 'deflect at 100ms');
eq(resolveDeflect(180), 'perfect', 'deflect at exactly 180ms (boundary)');
eq(resolveDeflect(181), 'partial', 'deflect at 181ms');
eq(resolveDeflect(250), 'partial', 'deflect at 250ms');
eq(resolveDeflect(300), 'partial', 'deflect at exactly 300ms (boundary)');
eq(resolveDeflect(301), 'hit', 'deflect at 301ms');
eq(resolveDeflect(900), 'hit', 'deflect way too early');
eq(resolveDeflect(-50), 'hit', 'negative dt (press after hit)');
eq(resolveDeflect(Infinity), 'hit', 'never pressed');
eq(resolveDeflect(NaN), 'hit', 'NaN guard');

// --- posture drain ---
// no drain inside the delay window
eq(applyPostureDrain(80, 500, 45), 80, 'no drain before delay');
eq(applyPostureDrain(80, 999, 45), 80, 'no drain just before delay');
// drains linearly after the delay
approx(applyPostureDrain(80, 2000, 45), 80 - 45 * 1.0, 1e-9, 'drain 1s past delay');
approx(applyPostureDrain(80, 1500, 30), 80 - 30 * 0.5, 1e-9, 'drain 0.5s past delay');
// clamps at zero
eq(applyPostureDrain(5, 5000, 45), 0, 'drain clamps at zero');

// --- config sanity ---
eq(CFG.DEFLECT_PERFECT_MS < CFG.DEFLECT_PARTIAL_MS, true, 'perfect window < partial window');
eq(CFG.ATTACKS.length, 3, 'three-hit chain defined');
eq(CFG.PLAYER_HP, 100, 'player hp');
eq(CFG.ENEMY_HP, 150, 'enemy hp');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
