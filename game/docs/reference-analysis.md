# Reference Gameplay Analysis
**Source:** `reference/reference-gamelay.mp4`  
**Total Duration:** ~46 seconds  
**Resolution:** ~800×600 (4:3 ratio, displayed letterboxed in browser)  
**Aspect Ratio:** 4:3  
**Frame Rate:** ~30 fps estimated  

---

## Visual Style

| Element | Description |
|---|---|
| Background | White / off-white paper-like background |
| Border | Thin dark border/frame around play area |
| Camera | Fixed. No zoom. No tracking. No shake visible. |
| Art Style | Photo-realistic animals placed in white scene (meme aesthetic) |
| Typography | Bold outlined/Impact-style font for action text |
| UI position | Action announcement text centered top of arena |

---

## Characters

### Player Character — FAT DOG
- **Position:** Left side of screen (~20% from left edge)
- **Scale:** Medium, roughly 20% of screen height
- **Facing:** Right (toward opponent)
- **Style:** Brown chubby dog, roll-shaped body, small paws

### Opponent Character — FAT CAT
- **Position:** Right side of screen (~75% from left edge)
- **Scale:** Slightly larger than dog, ~25% screen height
- **Facing:** Left (toward player)
- **Style:** Grey tabby cat, round fat body, small paws

---

## Battle Timeline

| Time | Event | Notes |
|---|---|---|
| 00:00.000 | Battle begins - both face each other | Both idle |
| 00:07.000 | "FAT DOG USES: BITE" | Action announcement |
| 00:09.500 | Dog lunges toward cat | Attack movement |
| 00:11.000 | Contact frame | Hard impact |
| 00:11.100 | Hit stop ~80ms | Both freeze |
| 00:11.200 | "-20HP" red text appears | Damage number |
| 00:11.500 | Cat knocked back | Knockback |
| 00:17.000 | "CAT USES: BODY SLAM" | Next turn |
| 00:19.500 | Cat body slams dog | Jump attack |
| 00:21.100 | Hit stop ~80ms | |
| 00:21.200 | "-25HP" near dog | |
| 00:25.000 | "INSTANT REPLAY!!!!" with pink bg | Replay moment |
| 00:35.000 | "FAT DOG USES: SCRATCH" | |
| 00:37.000 | Dog scratch attack | -15HP |
| 00:40.000 | "FAT CAT USES: BITE" | |
| 00:42.000 | Cat bites dog | -25HP |
| 00:44.000 | Dog KO | Collapse |
| 00:44.500 | "K.O." text | |
| 00:45.000 | "FAT CAT WINS!" | Victory |

---

## Attack Frame Data

| Attack | Announce Delay | Startup | Active | Hit Stop | Recovery | Damage |
|---|---|---|---|---|---|---|
| BITE | 2000ms | 250ms | 100ms | 80ms | 350ms | 20-25 |
| SCRATCH | 1500ms | 200ms | 80ms | 60ms | 280ms | 15 |
| BODY SLAM | 2000ms | 300ms | 120ms | 100ms | 400ms | 25 |
| TACKLE | 1800ms | 280ms | 100ms | 80ms | 320ms | 18 |

---

## Camera
- Fixed, no tracking
- Brief 2-3px shake on hard impacts
- Pink background wash during replay sequence

## HP System
- Max HP: 100 each
- Damage numbers: Red "-XXhp", float up 40px, fade over 800ms
- Battle is turn-based: announce → execute → react → next turn

## Implementation Notes

- The reference favors a quiet 4:3 arena with the animals as the visual focus. The implementation keeps the fixed 800x600 Phaser canvas and adds low-contrast floor depth rather than a busy background.
- Impact timing remains deterministic in `BattleStateMachine`: attack-specific impact audio, hit-stop, damage emission, damage number, recoil, and camera shake occur in that order.
- The supplied clip has no sustained camera tracking. Shake is reserved for impact and can be disabled or reduced through Settings.
