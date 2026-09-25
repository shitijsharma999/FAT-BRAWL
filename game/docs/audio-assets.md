# Audio Asset Policy

The game uses original procedural Web Audio effects in `src/game/audio/AudioManager.ts`. No audio was ripped from the reference video.

## Sources

- Attack whooshes: generated filtered noise and oscillator sweeps.
- Bite and tackle impacts: generated low-frequency square tones plus short filtered noise.
- Scratch impact: generated high-frequency filtered noise and a descending sawtooth tone.
- UI, turn, pause, replay, KO, victory, and defeat cues: generated oscillator motifs.
- Battle music: a low-volume generated drone loop.

## Timing

Combat SFX are dispatched from the deterministic attack timeline. The attack-start cue follows anticipation; the whoosh accompanies the lunge; the attack-specific impact cue is dispatched at the same logical frame as the `DAMAGE` event. Browser audio is resumed only after user interaction through `ensureContext()`.

## Licensing

All sounds are project-created procedural effects. There are no third-party audio files or copyrighted recordings in the shipped audio path.
