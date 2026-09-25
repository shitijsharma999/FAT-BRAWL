export const ASSET_PATHS = {
  characters: {
    fatDog: 'assets/characters/dog.jpeg',
    fatCat: 'assets/characters/cat.jpeg',
  },
  backgrounds: {
    arena: 'assets/backgrounds/arena.png',
  },
  effects: {
    hitSpark: 'assets/effects/hit_spark.png',
    impactDust: 'assets/effects/impact_dust.png',
  },
  audio: {
    // Audio synthesizer fallback or audio files
    sfxBase: 'assets/audio/',
  },
} as const;

export type AssetPaths = typeof ASSET_PATHS;
