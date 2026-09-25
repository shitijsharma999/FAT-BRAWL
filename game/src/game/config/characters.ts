export interface AttackDefinition {
  id: string;
  name: string;
  announceText: string;
  announceDelay: number;  // ms before attack executes
  startup: number;        // ms windup animation
  active: number;         // ms hitbox active
  hitStop: number;        // ms both freeze on hit
  recovery: number;       // ms after hit before idle
  damage: number;
  knockback: number;      // pixels
  knockbackDir: 'horizontal' | 'vertical' | 'diagonal';
  lungeDistance: number;  // pixels to move toward target
  lungeDuration: number;  // ms
  moveType: 'lunge' | 'jump' | 'sweep';
  sfxAnnounce: string;
  sfxWhoosh: string;
  sfxImpact: string;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  displayName: string;
  sprite: string;
  maxHp: number;
  attacks: AttackDefinition[];
  startX: number;        // 0-1 normalized
  startY: number;        // 0-1 normalized
  facingRight: boolean;
  scale: number;
  // hurtbox relative to center (for hitbox detection)
  hurtboxW: number;
  hurtboxH: number;
}

// Attack data derived from reference video (Fat Dog vs Fat Cat meme battle)
export const DOG_ATTACKS: AttackDefinition[] = [
  {
    id: 'dog_bite',
    name: 'Bite',
    announceText: 'FAT DOG USES:\nBITE',
    announceDelay: 2000,
    startup: 250,
    active: 100,
    hitStop: 80,
    recovery: 350,
    damage: 20,
    knockback: 160,
    knockbackDir: 'horizontal',
    lungeDistance: 280,
    lungeDuration: 300,
    moveType: 'lunge',
    sfxAnnounce: 'announce',
    sfxWhoosh: 'whoosh',
    sfxImpact: 'bite_impact',
  },
  {
    id: 'dog_scratch',
    name: 'Scratch',
    announceText: 'FAT DOG USES:\nSCRATCH',
    announceDelay: 1500,
    startup: 200,
    active: 80,
    hitStop: 60,
    recovery: 280,
    damage: 15,
    knockback: 100,
    knockbackDir: 'horizontal',
    lungeDistance: 180,
    lungeDuration: 220,
    moveType: 'lunge',
    sfxAnnounce: 'announce',
    sfxWhoosh: 'whoosh_light',
    sfxImpact: 'scratch_impact',
  },
  {
    id: 'dog_tackle',
    name: 'Tackle',
    announceText: 'FAT DOG USES:\nTACKLE',
    announceDelay: 1800,
    startup: 280,
    active: 100,
    hitStop: 80,
    recovery: 320,
    damage: 18,
    knockback: 140,
    knockbackDir: 'horizontal',
    lungeDistance: 320,
    lungeDuration: 280,
    moveType: 'lunge',
    sfxAnnounce: 'announce',
    sfxWhoosh: 'whoosh',
    sfxImpact: 'tackle_impact',
  },
];

export const CAT_ATTACKS: AttackDefinition[] = [
  {
    id: 'cat_body_slam',
    name: 'Body Slam',
    announceText: 'FAT CAT USES:\nBODY SLAM',
    announceDelay: 2000,
    startup: 300,
    active: 120,
    hitStop: 100,
    recovery: 400,
    damage: 25,
    knockback: 80,
    knockbackDir: 'vertical',
    lungeDistance: 300,
    lungeDuration: 350,
    moveType: 'jump',
    sfxAnnounce: 'announce',
    sfxWhoosh: 'whoosh_heavy',
    sfxImpact: 'slam_impact',
  },
  {
    id: 'cat_bite',
    name: 'Bite',
    announceText: 'FAT CAT USES:\nBITE',
    announceDelay: 2000,
    startup: 250,
    active: 100,
    hitStop: 80,
    recovery: 350,
    damage: 25,
    knockback: 180,
    knockbackDir: 'horizontal',
    lungeDistance: 280,
    lungeDuration: 300,
    moveType: 'lunge',
    sfxAnnounce: 'announce',
    sfxWhoosh: 'whoosh',
    sfxImpact: 'bite_impact',
  },
  {
    id: 'cat_swipe',
    name: 'Claw Swipe',
    announceText: 'FAT CAT USES:\nCLAW SWIPE',
    announceDelay: 1500,
    startup: 200,
    active: 80,
    hitStop: 60,
    recovery: 280,
    damage: 18,
    knockback: 110,
    knockbackDir: 'horizontal',
    lungeDistance: 180,
    lungeDuration: 220,
    moveType: 'lunge',
    sfxAnnounce: 'announce',
    sfxWhoosh: 'whoosh_light',
    sfxImpact: 'scratch_impact',
  },
];

export const CHARACTERS: CharacterDefinition[] = [
  {
    id: 'fat_dog',
    name: 'fat_dog',
    displayName: 'FAT DOG',
    sprite: 'fat_dog',
    maxHp: 100,
    attacks: DOG_ATTACKS,
    startX: 0.2,
    startY: 0.68,
    facingRight: true,
    scale: 0.28,
    hurtboxW: 120,
    hurtboxH: 100,
  },
  {
    id: 'fat_cat',
    name: 'fat_cat',
    displayName: 'FAT CAT',
    sprite: 'fat_cat',
    maxHp: 100,
    attacks: CAT_ATTACKS,
    startX: 0.78,
    startY: 0.68,
    facingRight: false,
    scale: 0.30,
    hurtboxW: 130,
    hurtboxH: 110,
  },
];
