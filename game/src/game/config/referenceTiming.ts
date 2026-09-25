/**
 * Reference Timing & Gameplay Parameters
 * All timing, positioning, scale, and combat constants matching the reference video.
 * Configurable in one central location for exact choreography matching.
 */

export const REFERENCE_TIMING = {
  // Character Positions & Scales (matches reference video framing)
  PLAYER_START_X: 0.22,             // 22% of screen width
  PLAYER_START_Y: 0.68,             // 68% of screen height
  OPPONENT_START_X: 0.76,           // 76% of screen width
  OPPONENT_START_Y: 0.68,           // 68% of screen height
  PLAYER_SCALE: 0.16,
  OPPONENT_SCALE: 0.20,

  // Camera Framing
  CAMERA_X: 400,
  CAMERA_Y: 300,
  CAMERA_ZOOM: 1.0,
  REPLAY_ZOOM: 1.55,
  REPLAY_ZOOM_DURATION: 500,

  // General Combat Timing & Mechanics
  ATTACK_STARTUP: 250,              // ms windup before strike
  ATTACK_ACTIVE: 100,               // ms attack hitbox active
  ATTACK_RECOVERY: 350,             // ms recovery after contact
  ATTACK_DISTANCE: 280,             // px forward strike travel
  HITSTOP_DURATION: 80,             // ms freeze frame on impact
  KNOCKBACK_DISTANCE: 150,          // px target pushed back
  KNOCKBACK_RECOVERY: 280,          // ms for target to recover balance
  RETURN_TO_BASE_DURATION: 320,     // ms to return to origin

  // Damage & Visuals
  DAMAGE: 20,
  SCREEN_SHAKE_STRENGTH: 0.0035,
  SCREEN_SHAKE_DURATION: 120,       // ms
  DAMAGE_NUMBER_DURATION: 900,      // ms
  DAMAGE_FLOAT_DISTANCE: 55,        // px upward float
  EFFECT_DURATION: 300,             // ms for hit sparks / shockwaves

  // Turn Flow & Announcements
  ANNOUNCE_DURATION: 1800,          // ms move title stays visible
  TURN_TRANSITION_DELAY: 600,       // ms between turns
  AI_DECISION_DELAY: 1000,          // ms before AI triggers action

  // Deterministic Reference Test Sequence
  REFERENCE_SEQUENCE_STEPS: [
    { attacker: 'player', attackIndex: 0, delayAfter: 1200 }, // Dog Bite -> 20 HP
    { attacker: 'enemy', attackIndex: 0, delayAfter: 1500 },  // Cat Body Slam -> 25 HP
    { attacker: 'player', attackIndex: 1, delayAfter: 1200 }, // Dog Scratch -> 15 HP
    { attacker: 'enemy', attackIndex: 1, delayAfter: 1200 },  // Cat Bite -> 25 HP
    { attacker: 'player', attackIndex: 2, delayAfter: 1200 }, // Dog Tackle -> 18 HP
    { attacker: 'enemy', attackIndex: 0, delayAfter: 1500 },  // Cat Body Slam -> KO Dog
  ],
} as const;

export type ReferenceTiming = typeof REFERENCE_TIMING;
