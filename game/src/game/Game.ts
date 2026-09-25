import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import { MenuScene } from './scenes/MenuScene';
import { BattleScene } from './scenes/BattleScene';

export function createGame(parent: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    ...gameConfig,
    parent,
    scene: [MenuScene, BattleScene],
    input: {
      gamepad: true,
    },
  };
  return new Phaser.Game(config);
}
