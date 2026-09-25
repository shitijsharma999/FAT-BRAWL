import Phaser from 'phaser';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const CAMERA_CONFIG = {
  x: 0,
  y: 0,
  zoom: 1,
  shakeStrength: 0.003,
  shakeDuration: 120,
  replayZoom: 1.6,
  replayZoomDuration: 500,
};

export const BATTLE_CONFIG = {
  groundY: 0.80,           // 80% from top = ground level (normalized)
  arenaLeft: 0.08,
  arenaRight: 0.92,
  aiDecisionDelay: 1000,   // ms before AI picks next move
  aiAttackDelay: 1200,
  replayDuration: 3500,
  koDisplayDuration: 2000,
  victoryDisplayDuration: 4000,
};

export const AUDIO_CONFIG = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.4,
};

export const UI_CONFIG = {
  hpBarHeight: 22,
  hpBarWidth: 280,
  hpBarY: 40,
  hpBarPadding: 30,
  fontFamily: '"Impact", "Arial Black", sans-serif',
  announceFont: '"Impact", "Arial Black", sans-serif',
  announceFontSize: 42,
  damageFont: '"Impact", "Arial Black", sans-serif',
  damageFontSize: 36,
};

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#f5f5f0',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 500 },
      debug: false,
    },
  },
  parent: 'phaser-container',
};
