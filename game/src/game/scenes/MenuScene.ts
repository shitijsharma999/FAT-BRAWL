import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { getAudioManager } from '../audio/AudioManager';
import { ASSET_PATHS } from '../config/assetsConfig';
import { InputManager } from '../input/InputManager';

export class MenuScene extends Phaser.Scene {
  private inputUnsub?: () => void;

  constructor() {
    super({ key: 'MenuScene' });
  }

  preload() {
    this.load.image('fat_dog', ASSET_PATHS.characters.fatDog);
    this.load.image('fat_cat', ASSET_PATHS.characters.fatCat);
  }

  create() {
    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xf6f6f2);

    // Border
    const g = this.add.graphics();
    g.lineStyle(6, 0x1a1a2e, 1);
    g.strokeRect(3, 3, GAME_WIDTH - 6, GAME_HEIGHT - 6);

    // VS style header
    const title = this.add.text(GAME_WIDTH / 2, 75, 'FAT BRAWL', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '84px',
      color: '#1a1a2e',
      stroke: '#ffffff',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 145, 'FAT DOG  VS  FAT CAT', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '28px',
      color: '#666666',
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Animate title
    this.tweens.add({
      targets: title,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Dog and cat sprites on menu
    const dog = this.add.image(160, 320, 'fat_dog').setScale(0.13);
    const cat = this.add.image(GAME_WIDTH - 160, 320, 'fat_cat').setScale(0.14);

    // Idle bounce animations
    this.tweens.add({
      targets: dog,
      y: 320 - 12,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: cat,
      y: 320 - 12,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(GAME_WIDTH / 2, 210, 
      'Recreation of the Meme Battle Choreography!', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#444455',
      }
    ).setOrigin(0.5);

    // Start button
    const startBg = this.add.rectangle(GAME_WIDTH / 2, 450, 280, 64, 0x1a1a2e)
      .setInteractive({ useHandCursor: true });
    const startText = this.add.text(GAME_WIDTH / 2, 450, 'FIGHT!', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '38px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    startBg.on('pointerover', () => {
      startBg.setFillStyle(0x28314e);
      startText.setScale(1.05);
    });
    startBg.on('pointerout', () => {
      startBg.setFillStyle(0x1a1a2e);
      startText.setScale(1);
    });
    startBg.on('pointerdown', () => this.startGame());

    // VS text in center
    this.add.text(GAME_WIDTH / 2, 340, 'VS', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '68px',
      color: '#dd2222',
      stroke: '#ffffff',
      strokeThickness: 8,
    }).setOrigin(0.5);

    // Controls hint
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 35, 
      'Press SPACE / ENTER / Gamepad A / Touch to Start Battle', {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#777788',
      }
    ).setOrigin(0.5);

    // Unified input listener
    const inputMgr = InputManager.getInstance();
    this.inputUnsub = inputMgr.on((action) => {
      if (action === 'CONFIRM' || action === 'ATTACK_BASIC') {
        this.startGame();
      }
    });
  }

  private startGame() {
    this.inputUnsub?.();
    getAudioManager().playSFX('ANNOUNCE');
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('BattleScene');
    });
  }
}
