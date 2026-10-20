# Moonlit Duel

A 2D Sekiro-inspired samurai duel game — original IP. Deflect-first combat, posture meters, deathblows, perilous attacks. Built as a playable web prototype.

## Play it

Open `index.html` in a browser (or play the hosted build). No build step, no dependencies — vanilla JS + Canvas.

**Controls**
- Touch: on-screen buttons (◀ ▶ move, ATK / DFL / JMP)
- Keyboard: A/D or arrows = move, J = attack, K = deflect, Space = jump
- Mouse: left-click = attack, right-click = deflect

**The duel:** deflect at the last instant to build the boss's posture. Break it → deathblow. Watch for the red 危 flash: sweep (jump it), thrust (last-instant deflect = mikiri), grab (get away). Kurenai has two deathblow pips and a second phase.

## Project layout

- `index.html` / `game.js` — the game (all tunable numbers in the `CFG` block)
- `test.js`, `sim-test.js`, `boss-test.js` — unit + headless simulation tests (`node test.js` etc.)
- `DESIGN.md` — the design source of truth (combat numbers, boss AI spec, roster)
- `assets/` — painted background plates, sprite sheets, `STYLE_GUIDE.md`

## Art assets

The PNG art (background plates, sprite sheets) is committed separately — the automated push used for this repo handles text files only. If `assets/` PNGs are missing here, they live with the build.

## Boss roster (planned)

Kurenai → Iwao → Mekura → Kagehime → Ito → Hachiro → Hibana → Mugen. See `DESIGN.md` §5b.
