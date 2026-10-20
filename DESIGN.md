# DESIGN.md — "Moonlit Duel" (working title)
*2D Sekiro-inspired action prototype. Original IP, Japanese-inspired setting. Source of truth for all build agents. iPhone playtesting is a first-class target: touch controls are mandatory.*

## 1. Core pillars (4)

1. **Deflect-first combat.** Attacking is how you pressure; deflecting is how you win. Perfect deflects deal zero damage to you and heavy posture damage to the enemy.
2. **Posture over HP.** Duels are won by breaking posture, not grinding HP. A well-played fight ends in deathblows with the boss's HP bar still half full.
3. **Readable duels.** Every enemy attack is telegraphed; every perilous attack has a distinct, learnable counter. Deaths feel like *your* mistake.
4. **No Atari.** Painted backgrounds, deliberate palette, juice everywhere. Programmer-art look is a defect, not a style.

## 2. Scope — first playable

**In:** one arena (moonlit courtyard, flat ground, walls at both edges, ~1600px world width, camera follows player), one duel boss, one encounter designed to last ~5 minutes for a first-time player. Player character: nameless swordsman, dark blue.

**Explicitly out of scope for the first playable:** additional bosses/arenas (roster planned in §5b for Phase 6+), XP/progression, prosthetic tools, stealth, items, save system, menus beyond title/death screens, multiplayer/netcode, 3D anything, story/cutscenes beyond a one-line intro card.

## 3. Combat spec (contract — build exactly to these numbers)

- **HP:** player 100, boss 100.
- **Posture:** max 100 for both. Posture bar empties visually but the value persists; break at ≥100.
- **Deflect windows** (measured from attack impact):
  - *Perfect deflect:* input within **180 ms** before impact → 0 HP damage to player, **14 posture damage** to attacker, triggers hitstop + spark burst.
  - *Partial deflect:* input 180–400 ms before impact → player takes 25% of attack's HP as chip, attacker takes **8 posture damage**.
  - *Early guard* (>400 ms before impact, i.e. holding deflect): player takes full posture damage of the attack, 0 HP. Holding deflect is safe but passive — posture will break.
- **Posture damage values:**
  - Player light attack → boss: 10 HP / **8 posture**.
  - Boss slash → player: 18 HP / **12 posture**.
  - Boss heavy (phase 2) → player: 28 HP / **20 posture**.
  - Mikiri-style thrust counter → boss: **25 posture**, 0 HP.
- **Posture recovery:** player 12/s after 1.2 s without taking posture damage (4/s while holding deflect). Boss 6/s after 2.0 s without taking posture damage — you must keep pressure on.
- **Deathblow:** boss has **2 deathblow pips**. When boss posture ≥ 100, boss is staggered 2.5 s and a deathblow prompt appears; landing the attack consumes one pip. First deathblow triggers phase 2 (boss HP refills to 100, posture resets to 0). Second deathblow kills. (Boss HP damage is deliberately slow — posture is the win condition.)
- **Player death:** HP 0 → red DEATH screen → respawn at arena entrance, boss fully reset (both pips, full HP/posture). **One resurrection per attempt:** on lethal hit, player may revive in place at 50% HP once; boss state unchanged.
- **Timing:** 60 fps target, fixed timestep 1/60 with accumulator. All windows above are in real ms.

*Math check:* ~7 perfect deflects (7×14=98) or ~12 landed attacks break the boss; mixed play breaks in ~8–10 exchanges. Boss regen punishes passivity. This is the intended rhythm.

## 4. Controls (all three must work)

- **Keyboard:** A/D move · J attack · K deflect (tap; hold = guard) · Space jump.
- **Mouse:** left-click attack · right-click deflect (tap/hold).
- **Touch (iPhone):** on-screen buttons, minimum 64 px touch targets: ◀ ▶ bottom-left · ⚔ attack, 🛡 deflect, ▲ jump bottom-right. Buttons semi-transparent, never overlapping the duel center. Multi-touch must allow move + deflect simultaneously.

## 5. Boss AI spec — "Kurenai, Warden of the Moonlit Court"

Build order note: AI comes after the combat core, but this spec is locked now.

- **Behavior loop:** advance toward player → attack string (2–4 hits) → pause 0.8–1.5 s → reposition or back off. Aggression scales with phase. Never attacks during player's deathblow animation.
- **Telegraphs:** 400 ms white wind-up flash before strikes. **Perilous attacks:** red kanji flash (危) above boss, 500 ms before impact — unblockable, must be countered, never guarded.
- **Perilous set:**
  - *Sweep* (low, wide): **jump** over it → punish on landing.
  - *Thrust* (fast, linear): **deflect at the last instant** (mikiri-style) → 25 posture damage to boss.
  - *Grab* (phase 2 only, close range): **dodge away / jump back** — if caught: 40 HP damage, no posture interaction.
- **Phase 1** (both pips intact): katana combos (3-hit strings), occasional sweep, single thrusts. Moderate pace.
- **Phase 2** (after first deathblow): +25% attack speed, adds grab, longer strings (up to 5), sweep/thrust mix-ups (same red flash, different attack — the read is the *counter*, not the tell), new leaping heavy.
- **Difficulty intent:** a first-time player dies 3–6 times; a player who has learned the patterns wins in ~5 minutes.

### 5b. Boss roster (Phase 6+ — archetypes inspired by *Ninja Scroll*, all original characters)

Design rule: borrow the *archetype and the mechanic*, never the name, likeness, or story. Every boss is an original character with original lore; each introduces exactly one new mechanical idea on top of the deflect/posture core. Build order after Kurenai is TBD by playtest feel.

1. **Iwao, the Quarry Saint** (stone-skinned brute archetype). His skin turns aside blades: deflecting him deals almost no posture — *his own* overcommitted heavy swings are the window. Bait the slam, punish the recovery. Teaches patience.
2. **Mekura, the Listening Blade** (blind swordsman archetype). He tracks by sound: sprinting and landing loudly near him sharpens his aim; moving slow and quiet makes his strikes drift off-target. Teaches movement discipline.
3. **Kagehime, the Divided Shadow** (shadow-clone archetype). Splits into three; only the true body takes posture damage. Tell: drifting petals swirl around the real one. Teaches observation under pressure.
4. **Ito, the Weaver** (wire/thread archetype). Strangles the arena with near-invisible threads — some must be jumped, some deflected mid-flight, and his reel-in is a perilous grab. Teaches reading the air, not the man.
5. **Hachiro, the Hive** (swarm-keeper archetype). Sows hives around the arena that harass you mid-duel; smash hives or fight through the swarm. Teaches target priority.
6. **Hibana, the Cinder Bride** (explosives archetype). Powder tags and delayed blasts turn positioning into the duel — her own explosions damage *her* posture if you're clear of them. Teaches spacing as offense.
7. **Mugen, the Undying** (immortal final-boss archetype). Knits wounds and reattaches severed limbs mid-fight: 4 deathblow pips, phases that remix earlier bosses' tricks. The exam.

Nothing here ships until the Kurenai duel feels perfect — the roster is the reward for nailing the core.

## 6. Art direction

- **Setting:** moonlit courtyard — stone floor, paper lanterns on posts, pagoda silhouette, drifting cherry-blossom petals, large moon.
- **Palette (limited, locked):** moonlight blues (#1a2340 / #3a5a8c), lantern oranges (#e8933c / #ffcf7d), crimson accents (#c62f3b), bone white (#e8e4d8). Nothing outside this family without design-lead approval.
- **Method:** AI-painted parallax background layers (sky/moon → pagoda → courtyard → foreground posts) + code-drawn stylized characters (strong silhouettes, procedural animation). Characters read by silhouette at a glance: player slim/dark blue, Kurenai larger/crimson with mempo mask.
- **Explicitly not:** rectangles-and-circles programmer art, rainbow colors, placeholder stick figures in the shipped build. Grey-box is allowed *only* in internal Phase 1 spikes, never in a playtest build.

## 7. Game feel (all required)

- **Hitstop:** 60 ms freeze on perfect deflect; 120 ms on deathblow; 30 ms on landed attack.
- **Screen shake:** 4 px amplitude, 150 ms on perfect deflect; 8 px, 250 ms on deathblow; 2 px on player hit.
- **Particles:** 12–20 spark burst on perfect deflect (white/gold); petal drift ambient (always); dust puff on landing; crimson slash arc on boss heavy.
- **UI:** player HP + gold posture bar top-left; boss HP + posture bar top-right with 2 red deathblow pips; red 危 flash for perilous; damage numbers: none (Sekiro doesn't do them).
- **Sound:** all synthesized via WebAudio, zero asset files — katana clash (filtered noise burst + metallic ping), deflect *ting* (high sine + fast decay), deathblow (low thud + swell), footsteps, ambient night loop (soft wind noise). Mute toggle.

## 8. Risks & deliberate deferrals

- **Feel risk:** deflect timing is the whole game and I can't playtest it — the tuning loop depends on the user's hands. Ship generous first, tighten on feedback.
- **Touch latency:** mobile browsers add input lag; keep input handling on `touchstart` (not `touchend`), zero animation delay on buttons.
- **Scope creep:** the #1 killer. One arena, one boss. Anything else waits for Phase 6.
- **Deferred:** balance beyond rough numbers, accessibility options, performance on low-end devices (target iPhone 12+), localization, analytics.
- **IP:** original characters, names, and art only. "Sekiro-inspired" describes mechanics, never branding.
