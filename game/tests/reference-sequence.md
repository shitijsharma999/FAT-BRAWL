# Reference Battle Sequence Documentation
**Source:** `reference/reference-gameplay.mp4`  
**Choreography & Timing Specifications**

## 1. Sequence Overview
The battle features a comic meme-style confrontation between **Fat Dog** (Player) and **Fat Cat** (Opponent) inside a clean, white-boxed paper arena. The interaction follows a distinct turn-based combat flow with dynamic physical lunges, screen freeze (hitstop), knockback physics, camera zoom, and meme instant replays.

## 2. Step-by-Step Reference Sequence
1. **00:00.000 — Battle Start**
   - Arena initialized (800×600 letterboxed arena, white floor, boundary lines).
   - Fat Dog positioned at `X: 22% (176px)`, facing right.
   - Fat Cat positioned at `X: 76% (608px)`, facing left.
   - Both characters play subtle breathing/squash idle animation.

2. **00:07.000 — Turn 1: Fat Dog Announcement**
   - Centered banner text: `FAT DOG USES: BITE`.
   - Announce delay: ~1800ms.
   - Attack whoosh sound triggers.

3. **00:09.500 — Turn 1: Fat Dog Lunge & Windup**
   - Windup / squash: Character squishes down horizontally and pulls back (-10px).
   - Forward lunge: Fast horizontal leap across 280px directly into the Cat's hurtbox.

4. **00:11.000 — Turn 1: Impact & Hitstop**
   - Contact frame: Both characters freeze for ~80ms (hitstop).
   - Screen shake: Subtle 3-4px impulse.
   - Red flash on Cat sprite (`#ff4444`).
   - Impact audio: Bite crunch + heavy contact thump.

5. **00:11.200 — Turn 1: Damage & Reaction**
   - Cat is launched backward horizontally by 160px with squished hurt posture.
   - Red damage number `-20 HP` floats upward 50px above Cat and fades out.
   - Cat's HP bar drops smoothly from 100 to 80.
   - Fat Dog smoothly glides back to original starting coordinates.

6. **00:17.000 — Turn 2: Fat Cat Announcement**
   - Centered banner text: `FAT CAT USES: BODY SLAM`.
   - Announce delay: ~1800ms.

7. **00:19.500 — Turn 2: Jump & Slam**
   - Cat leaps high into the air in a parabolic arc (Y -120px).
   - Cat slams down with high velocity directly atop Fat Dog.

8. **00:21.100 — Turn 2: Impact & Hitstop**
   - Hitstop freeze frame ~100ms.
   - Screen shake: Heavy impact shake.
   - Red damage number `-25 HP` floats above Dog.
   - Dog's HP bar drops from 100 to 75.
   - Dog reacts with squish and vertical ground bounce.

9. **00:25.000 — Instant Replay Sequence**
   - Background flashes into soft pastel pink (`#ff99cc`) with 55% opacity.
   - Banner displays `INSTANT REPLAY!!!!`.
   - Camera zooms to 1.55x magnification, panning tightly onto the impact moment.
   - After 2.5s, camera smoothly pans and zooms back to 1.0x baseline, pink tint fades.

10. **00:35.000 — Turn 3: Fat Dog Scratch**
    - Announcement: `FAT DOG USES: SCRATCH`.
    - Fast lunge forward.
    - Impact: Scratch slash effect, hitstop ~60ms.
    - Damage: `-15 HP`. Cat HP drops to 65.
    - Cat knockback: 100px.

11. **00:40.000 — Turn 4: Fat Cat Bite**
    - Announcement: `FAT CAT USES: BITE`.
    - Heavy bite lunge.
    - Impact: `-25 HP`. Dog HP drops to 50.

12. **00:44.000 — Climax & K.O.**
    - Decisive strike reduces HP to 0.
    - Defeated character tilts 90 degrees and topples onto the ground with defeat sound.
    - Huge `K.O.` text explodes in the center of the screen with impact shake.
    - Winner plays bouncy celebration loop (`FAT CAT WINS!` or `FAT DOG WINS!`).
    - Victory / Defeat screen appears with `PLAY AGAIN` prompt.

## 3. Deterministic Reference Test Mode
The game includes a built-in deterministic test mode:
- Activated via URL parameter: `?referenceTest=true` or clicking the **"Reference Test Mode"** toggle in Settings.
- Randomness is completely disabled:
  - Fixed attack choices and exact sequence steps.
  - Predictable timing intervals and non-random damage outputs.
  - Consistent camera shakes and replays.
  - Allows frame-by-frame comparison against the reference video.
