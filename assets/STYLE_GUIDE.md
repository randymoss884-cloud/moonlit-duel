# Style Guide — Moonlit Courtyard Duel

Art direction for the 2D Sekiro-inspired prototype. Goal: painterly and
intentional at every frame. The number-one rule is **no programmer art** —
every visual on screen must come from these plates, the palette below, or
the juice list. Grey boxes are allowed only in Phase 1 movement spikes and
must be replaced before any playtest build.

## Background plates (`~/workspace/sekiro-game/assets/`)

All plates are 1920x1080 PNG. Raw generations (pre-crop/grade) are kept in
`raw/` for reference — do not ship those.

| File | Contents | Notes |
|---|---|---|
| `bg_sky.png` | Night sky, large moon right-of-center, wispy clouds, distant pagoda silhouettes along the bottom | Back layer. Full-frame. |
| `bg_mid.png` | Ink silhouettes (pines, stone lanterns, temple wall) on **transparent** background (RGBA) | Mid layer. Draw full-frame; shift **up ~120–160px** so lantern tops and the wall crest clear the horizon line instead of being buried behind the ground plate. |
| `bg_ground.png` | Moonlit stone courtyard floor, graded to night, top edge faded dark | Foreground. Draw only the **bottom ~480px** of the screen (crop source y 600–1080), i.e. horizon at y≈600. |

### Parallax spec (1920x1080 viewport)

- Draw order: sky → mid → ground → characters → particles → UI.
- Scroll factors (camera x): sky 0.15, mid 0.45, ground 1.0. Layers are
  1920px wide; for camera movement beyond ±240px, tile sky horizontally
  (it loops cleanly — gradient + repeating pagoda line) or clamp camera.
- Horizon seam: the ground plate's top edge is pre-faded dark. If a hard
  line is still visible, overlay a 60px vertical gradient
  (transparent → `#0B1026` at 55% opacity) centered on the horizon in code.
- Vignette: apply a soft radial vignette in code (edges → `#05070F` at
  ~35%) over the whole scene. The plates are graded for it.

## Palette

Sampled from the plates. Use these hex codes — no off-palette colors
without art-lead approval.

| Swatch | Hex | Use |
|---|---|---|
| Night sky deep | `#0B1026` | Sky base, fades, vignette target |
| Horizon blue | `#1E2C4E` | Sky-to-ground transition zone |
| Moon pale | `#F4F1E4` | Moon disc, brightest highlights |
| Cloud light | `#8FA3C4` | Cloud rims, atmospheric accents |
| Ink silhouette | `#0D1226` | Mid-layer silhouettes, character darks |
| Stone blue-grey | `#3D4C68` | Ground slabs (graded range `#1A2338`–`#3D4C68`) |
| Moss | `#46543A` | Slab cracks only, sparingly |
| Lantern glow | `#F5A524` | Lantern light (see below), warm accents |
| Deep amber | `#E07B1F` | Lantern glow falloff |
| Crimson | `#A93226` | Boss primary |
| Bright crimson | `#D43A2F` | Boss accents, perilous flash, damage numbers |
| Player blue | `#2C3E66` | Player outfit primary |
| Steel | `#9AA7C4` | Blade highlights |
| Bone white | `#E8E4D8` | UI text, UI lines |
| Ink black | `#05070F` | Vignette, letterbox |

## Characters (drawn in code — vector silhouettes)

Do NOT generate AI character sprites. Hand-drawn vector figures keep
silhouettes readable at speed, which is what combat legibility needs.

- **Construction:** capsule/tapered-quad limbs, ~8–10 segments per figure.
  Animate procedurally (walk cycle, attack arcs, deflect pose, stagger,
  deathblow kneel). Ease every motion — no linear tweens.
- **Player:** dark blue `#2C3E66` body, `#9AA7C4` blade edge highlight,
  subtle `#F4F1E4` rim light on the moon side (right). Lean, upright
  Sekiro-like stance: katana held mid-guard.
- **Boss:** larger frame (1.25x player height), crimson `#A93226` armor
  with `#D43A2F` accents, menacing silhouette (wide shoulder guards,
  horned helmet ridge). Blade slightly longer than the player's.
- **Readability rules:** characters must read as solid shapes against the
  sky at all times — keep a 2px `#05070F` outline OR a soft outer glow
  behind each fighter. Never let a fighter overlap a same-color background
  region without the outline.
- **Shadows:** soft elliptical contact shadow under each fighter, drawn on
  the ground layer, `#05070F` at 45%.

## UI

- Minimal bars, no chunky fantasy frames. Player: thin health bar +
  posture bar, top-left, bone-white `#E8E4D8` lines on translucent
  `#0B1026` (70%). Boss: same treatment top-right, with posture pips.
- Typography feel: light weight, wide letter-spacing, bone white. No
  system-default bold. (Actual font choice: any light sans with generous
  tracking reads "Japanese-inspired" without needing kanji.)
- Perilous attack: large `#D43A2F` kanji-style flash glyph above the
  attacker + a low warning tone. It must be unmissable for 300ms.
- Deathblow prompt: single red dot `#D43A2F` on the staggered enemy —
  nothing else. Restraint is the aesthetic.
- Damage numbers: small, bone white, float up and fade in 600ms. No
  critical-hit popups, no combo counters.

## Lantern glow (code)

The lanterns in `bg_mid.png` are unlit in the plate. In code, add a
radial gradient sprite at each lantern's window position:
`#F5A524` core → `#E07B1F` mid → transparent, ~180px radius, additive
blend, gentle 3s flicker (±8% opacity). This is the scene's only warm
light source — it sells the whole painting.

## Particles & juice (required, not optional)

These are what separate this from programmer art. Implement all of them:

1. **Cherry-blossom petals** — ambient, always on. ~40 petals, pink-white
   `#E8B4C8`, slow drift with sine sway, wrap around screen edges.
2. **Deflect sparks** — on perfect deflect: 12–18 gold-white `#F4F1E4`
   sparks, radial burst, 300ms life, plus 90ms hitstop and a 6px screen
   shake. This is the game's signature moment — make it sing.
3. **Clash flash** — on blade contact: 2-frame white flash arc along the
   parry plane.
4. **Dust puffs** — on landing/dashing: 5–8 soft `#8FA3C4` puffs at 40%.
5. **Posture-break** — brief desaturation pulse on the victim + red ring
   shockwave expanding 120px over 400ms.
6. **Deathblow** — 250ms slow-mo (0.25x), ink-slash arc `#05070F` across
   the victim, then red petal burst `#A93226`.
7. **Perilous telegraph** — rising `#D43A2F` edge glow on the attacker
   during wind-up.
8. **Moon shimmer** — faint animated glow halo on the moon (slow pulse).
9. **Footstep dust** — tiny puffs on sprint, every 200ms.

## Sound direction (for the audio agent)

All synthesized via WebAudio — no asset files. Reference palette:
deflect = bright metallic *ting* (highpassed noise + 2.8kHz ping, 120ms);
sword swing = filtered noise whoosh; perilous = low taiko-like thump
(90Hz sine drop); deathblow = deep sub hit + silence gap. Ambient: night
crickets bed at −24dB, wind gusts on a slow LFO.

## What to avoid

- Pure black `#000000` or pure white `#FFFFFF` anywhere.
- Neon saturation, gradients on characters, drop shadows on UI text.
- More than 3 warm light sources on screen (currently: lanterns only).
- Screen clutter: if a UI element isn't health, posture, or a prompt the
  player must react to in <500ms, cut it.
- Rotating/scaling the background plates (breaks the painted look).
