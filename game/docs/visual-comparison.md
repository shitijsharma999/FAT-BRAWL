# Visual Comparison

**Reference:** `reference/reference-gamelay.mp4`

## Matches

- Fixed 4:3 battle composition with FAT DOG on the left and FAT CAT on the right.
- Quiet paper-like arena with a restrained ground plane so the characters remain the focus.
- Impact timing retains the reference sequence: announcement, anticipation, lunge, hit-stop, damage number, recoil, and recovery.
- Attack-specific impact sounds, floating damage numbers, brief impact flash, and restrained camera shake are now synchronized at the damage event.
- HP bars animate smoothly and retain current/max HP text.

## Differences

- The reference has a simpler white background; the implementation adds a low-contrast floor and arena ring for depth.
- The implementation uses generated procedural audio rather than copying the reference soundtrack or effects.
- Attack controls are presented in a bottom ability panel instead of the reference's minimal text treatment.
- The supplied video appears to use more photographic character staging; the existing project artwork is preserved as requested.

## Remaining Polish Risk

- Exact frame-by-frame comparison still needs a browser capture at the reference's native playback size. The current timing values are based on the existing analysis and configuration, not a new automated video diff.
- A follow-up pass could tune character scale and the arena floor contrast after reviewing a side-by-side capture on desktop and mobile.
