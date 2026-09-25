import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { Character } from '../entities/Character';
import { BattleStateMachine } from '../combat/BattleStateMachine';
import { InputManager } from '../input/InputManager';
import type { InputAction } from '../input/InputManager';
import { CHARACTERS, DOG_ATTACKS, CAT_ATTACKS } from '../config/characters';
import { getAudioManager } from '../audio/AudioManager';
import { ASSET_PATHS } from '../config/assetsConfig';
import { REFERENCE_TIMING } from '../config/referenceTiming';

export class BattleScene extends Phaser.Scene {
  private player!: Character;
  private enemy!: Character;
  private battle!: BattleStateMachine;
  private inputMgr!: InputManager;
  private inputUnsub?: () => void;
  private toastUnsub?: () => void;

  // UI Elements
  private playerHpBar!: Phaser.GameObjects.Rectangle;
  private enemyHpBar!: Phaser.GameObjects.Rectangle;
  private playerHpText!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  private playerHpDelayed!: Phaser.GameObjects.Rectangle;
  private enemyHpDelayed!: Phaser.GameObjects.Rectangle;
  private announceText!: Phaser.GameObjects.Text;
  private turnIndicator!: Phaser.GameObjects.Text;
  private turnPanel!: Phaser.GameObjects.Rectangle;
  private turnKicker!: Phaser.GameObjects.Text;
  private attackPanel!: Phaser.GameObjects.Rectangle;
  private attackButtons: Phaser.GameObjects.Container[] = [];
  private toastBanner?: Phaser.GameObjects.Container;
  private toastTimer?: Phaser.Time.TimerEvent;

  // Pause Menu UI
  private isGamePaused = false;
  private pauseContainer?: Phaser.GameObjects.Container;
  private controlsModalContainer?: Phaser.GameObjects.Container;

  // Game Over / Victory / Defeat UI
  private gameOverContainer?: Phaser.GameObjects.Container;

  // Debug overlay (F3)
  private isDebugMode = false;
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private debugText?: Phaser.GameObjects.Text;

  // State
  private playerAttacks = DOG_ATTACKS;
  private aiAttacks = CAT_ATTACKS;
  private isBusy = false;
  private isPlayerTurn = false;
  private HP_BAR_W = 280;

  // Deterministic reference test tracking
  private testStepIndex = 0;

  constructor() {
    super({ key: 'BattleScene' });
  }

  preload() {
    this.load.image('fat_dog', ASSET_PATHS.characters.fatDog);
    this.load.image('fat_cat', ASSET_PATHS.characters.fatCat);
  }

  create() {
    this.inputMgr = InputManager.getInstance();

    this.createBackground();
    this.createCharacters();
    this.createHUD();
    this.createAttackMenu();
    this.setupBattle();
    this.setupInput();
    this.setupDebug();

    // Start battle after brief intro
    this.time.delayedCall(700, () => {
      this.battle.startBattle();
    });

    getAudioManager().ensureContext();
  }

  private createBackground() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xe8e2d5);
    this.add.rectangle(GAME_WIDTH / 2, 205, GAME_WIDTH, 250, 0xf4efe5, 0.72);
    this.add.rectangle(GAME_WIDTH / 2, 410, GAME_WIDTH, 170, 0xd3c2a9, 0.72);
    this.add.rectangle(GAME_WIDTH / 2, 430, GAME_WIDTH, 130, 0xb59b7b, 0.18);

    const atmosphere = this.add.graphics();
    atmosphere.fillStyle(0xffffff, 0.16);
    atmosphere.fillEllipse(185, 190, 280, 120);
    atmosphere.fillEllipse(650, 170, 320, 150);
    atmosphere.lineStyle(2, 0x8e765c, 0.14);
    for (let x = -80; x < GAME_WIDTH + 160; x += 70) {
      atmosphere.lineBetween(x, 405, x + 210, 560);
    }
    atmosphere.lineStyle(3, 0x6d5947, 0.22);
    atmosphere.strokeEllipse(GAME_WIDTH / 2, 438, 690, 190);
    atmosphere.setDepth(1);

    this.add.rectangle(GAME_WIDTH / 2, 406, GAME_WIDTH - 42, 3, 0x6d5947, 0.32).setDepth(2);
    this.add.text(GAME_WIDTH / 2, 177, 'BRAWL ZONE', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#7c6b58',
      letterSpacing: 3,
    }).setOrigin(0.5).setAlpha(0.6).setDepth(2);

    const border = this.add.graphics();
    border.lineStyle(8, 0x3b3030, 1);
    border.strokeRect(3, 3, GAME_WIDTH - 6, GAME_HEIGHT - 6);
    border.lineStyle(2, 0xf7e7c5, 0.55);
    border.strokeRect(13, 13, GAME_WIDTH - 26, GAME_HEIGHT - 26);
    border.setDepth(100);
  }

  private createCharacters() {
    const dogConfig = CHARACTERS[0];
    const catConfig = CHARACTERS[1];

    this.player = new Character(this, {
      id: dogConfig.id,
      displayName: dogConfig.displayName,
      spriteKey: dogConfig.sprite,
      maxHp: dogConfig.maxHp,
      startX: REFERENCE_TIMING.PLAYER_START_X,
      startY: REFERENCE_TIMING.PLAYER_START_Y,
      facingRight: dogConfig.facingRight,
      scale: REFERENCE_TIMING.PLAYER_SCALE,
      hurtboxW: dogConfig.hurtboxW,
      hurtboxH: dogConfig.hurtboxH,
    });

    this.enemy = new Character(this, {
      id: catConfig.id,
      displayName: catConfig.displayName,
      spriteKey: catConfig.sprite,
      maxHp: catConfig.maxHp,
      startX: REFERENCE_TIMING.OPPONENT_START_X,
      startY: REFERENCE_TIMING.OPPONENT_START_Y,
      facingRight: catConfig.facingRight,
      scale: REFERENCE_TIMING.OPPONENT_SCALE,
      hurtboxW: catConfig.hurtboxW,
      hurtboxH: catConfig.hurtboxH,
    });
    this.enemy.sprite.setFlipX(false);
  }

  private createHUD() {
    const hpBarY = 38;
    const hpBarH = 22;

    this.add.rectangle(174, 45, 316, 66, 0x241f25, 0.92)
      .setStrokeStyle(2, 0xe8d7b5, 0.8).setDepth(8);
    this.add.rectangle(GAME_WIDTH - 174, 45, 316, 66, 0x241f25, 0.92)
      .setStrokeStyle(2, 0xe8d7b5, 0.8).setDepth(8);

    // Top-Left: PLAYER ████████████ HP 100 / 100
    this.add.text(32, hpBarY - 22, 'PLAYER — FAT DOG', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '16px',
      color: '#f8e8c5',
      stroke: '#241f25',
      strokeThickness: 4,
    }).setDepth(10);

    // Bar background
    this.add.rectangle(
      32 + this.HP_BAR_W / 2, hpBarY + hpBarH / 2,
      this.HP_BAR_W, hpBarH,
      0x222634
    ).setDepth(10).setStrokeStyle(2, 0x111016, 0.9);

    this.playerHpDelayed = this.add.rectangle(
      32 + (this.HP_BAR_W - 4) / 2, hpBarY + hpBarH / 2,
      this.HP_BAR_W - 4, hpBarH - 4,
      0xf5b642
    ).setDepth(10.5);

    this.playerHpBar = this.add.rectangle(
      32 + this.HP_BAR_W / 2, hpBarY + hpBarH / 2,
      this.HP_BAR_W - 4, hpBarH - 4,
      0x38ef7d
    ).setDepth(11);

    this.playerHpText = this.add.text(
      32 + this.HP_BAR_W / 2, hpBarY + hpBarH / 2,
      '100 / 100', {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '13px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }
    ).setOrigin(0.5).setDepth(12);

    // Top-Right: OPPONENT ████████████ HP 100 / 100
    const rightX = GAME_WIDTH - 32 - this.HP_BAR_W;
    this.add.text(rightX, hpBarY - 22, 'OPPONENT — FAT CAT', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '16px',
      color: '#f8e8c5',
      stroke: '#241f25',
      strokeThickness: 4,
    }).setDepth(10);

    this.add.rectangle(
      rightX + this.HP_BAR_W / 2, hpBarY + hpBarH / 2,
      this.HP_BAR_W, hpBarH,
      0x222634
    ).setDepth(10).setStrokeStyle(2, 0x111016, 0.9);

    this.enemyHpDelayed = this.add.rectangle(
      rightX + (this.HP_BAR_W - 4) / 2, hpBarY + hpBarH / 2,
      this.HP_BAR_W - 4, hpBarH - 4,
      0xf5b642
    ).setDepth(10.5);

    this.enemyHpBar = this.add.rectangle(
      rightX + this.HP_BAR_W / 2, hpBarY + hpBarH / 2,
      this.HP_BAR_W - 4, hpBarH - 4,
      0xff416c
    ).setDepth(11);

    this.enemyHpText = this.add.text(
      rightX + this.HP_BAR_W / 2, hpBarY + hpBarH / 2,
      '100 / 100', {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '13px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }
    ).setOrigin(0.5).setDepth(12);

    // Announce text (centered top banner)
    this.announceText = this.add.text(GAME_WIDTH / 2, 105, '', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '40px',
      color: '#fff1ca',
      stroke: '#241f25',
      strokeThickness: 9,
      align: 'center',
    }).setOrigin(0.5).setDepth(80).setVisible(false).setShadow(0, 5, '#000000', 8, true, true);

    this.turnPanel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 123, 250, 46, 0x241f25, 0.94)
      .setStrokeStyle(2, 0xe8d7b5, 0.65).setDepth(19);
    this.turnKicker = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 137, 'BATTLE STATUS', {
      fontFamily: 'Georgia, serif',
      fontSize: '9px',
      color: '#d4b77d',
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(20);

    this.turnIndicator = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 120, '', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '20px',
      color: '#fff1ca',
      stroke: '#241f25',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);
  }

  private createAttackMenu() {
    const attacks = this.playerAttacks;
    const btnY = GAME_HEIGHT - 72;
    const totalWidth = 650;
    const btnW = totalWidth / attacks.length;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    this.attackPanel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 48, totalWidth + 18, 78, 0x241f25, 0.96)
      .setStrokeStyle(2, 0xe8d7b5, 0.65).setDepth(23);

    attacks.forEach((attack, i) => {
      const x = startX + i * btnW + btnW / 2;
      const container = this.add.container(x, btnY).setDepth(25);

      const bg = this.add.rectangle(0, 0, btnW - 12, 60, 0x3a3035, 0.98)
        .setStrokeStyle(2, i === 0 ? 0xc88b45 : i === 1 ? 0x8ca7d8 : 0xd16b5d, 0.9)
        .setInteractive({ useHandCursor: true });

      const keyText = i === 0 ? 'J' : i === 1 ? 'K' : 'L';
      const keyLabel = this.add.text(0, -14, keyText, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#f8e8c5',
        backgroundColor: '#241f25',
        padding: { x: 5, y: 2 },
      }).setOrigin(0.5);

      const icon = this.add.text(-48, 5, i === 0 ? 'B' : i === 1 ? 'S' : 'T', {
        fontFamily: 'Georgia, serif',
        fontSize: '25px',
        color: i === 0 ? '#f0b35e' : i === 1 ? '#9db7e4' : '#e88170',
      }).setOrigin(0.5);

      const label = this.add.text(0, 3, attack.name.toUpperCase(), {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '15px',
        color: '#fff1ca',
      }).setOrigin(0.5);

      const dmgLabel = this.add.text(0, 18, `-${attack.damage} HP`, {
        fontFamily: 'sans-serif',
        fontSize: '10px',
        color: '#eab6a4',
      }).setOrigin(0.5);

      bg.on('pointerdown', () => this.onAttackSelected(i));
      bg.on('pointerover', () => {
        bg.setFillStyle(0x55414a, 1);
        label.setColor('#ffffff');
        this.tweens.add({ targets: container, y: btnY - 4, duration: 100, ease: 'Quad.easeOut' });
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x3a3035, 0.98);
        this.tweens.add({ targets: container, y: btnY, duration: 120, ease: 'Quad.easeOut' });
      });
      bg.on('pointerdown', () => {
        this.tweens.add({ targets: container, scaleX: 0.96, scaleY: 0.96, duration: 60, yoyo: true });
      });

      container.add([bg, keyLabel, icon, label, dmgLabel]);
      this.attackButtons.push(container);
    });
  }

  private setupBattle() {
    this.battle = new BattleStateMachine(this, this.player, this.enemy);
    this.battle.announceText = this.announceText;

    this.battle.on((event) => {
      switch (event.type) {
        case 'PLAYER_TURN':
          this.isPlayerTurn = true;
          this.isBusy = false;
          this.turnIndicator.setText('YOUR TURN');
          this.turnIndicator.setColor('#b9ef9a');
          this.turnKicker.setText('CHOOSE YOUR ATTACK');
          this.turnPanel.setStrokeStyle(2, 0x9bcf76, 0.9);
          this.showAttackButtons(true);

          if (this.battle.getDeterministicTest()) {
            this.handleDeterministicStep();
          }
          break;

        case 'AI_TURN':
          this.isPlayerTurn = false;
          this.isBusy = true;
          this.turnIndicator.setText('OPPONENT TURN');
          this.turnIndicator.setColor('#f1a39a');
          this.turnKicker.setText('FAT CAT IS MOVING');
          this.turnPanel.setStrokeStyle(2, 0xd16b5d, 0.9);
          this.showAttackButtons(false);

          if (this.battle.getDeterministicTest()) {
            this.handleDeterministicStep();
          } else {
            this.time.delayedCall(REFERENCE_TIMING.AI_DECISION_DELAY, () => this.doAITurn());
          }
          break;

        case 'DAMAGE':
          this.updateHPBars();
          this.showImpactEffect(event.data as { target: string; attackId: string });
          break;

        case 'KO':
          this.isBusy = true;
          this.showAttackButtons(false);
          this.turnIndicator.setText('');
          this.turnKicker.setText('KNOCKOUT');
          break;

        case 'VICTORY':
          this.showGameOverScreen(true);
          break;

        case 'DEFEAT':
          this.showGameOverScreen(false);
          break;
      }
    });
  }

  private setupInput() {
    // Listen for unified input actions
    this.inputUnsub = this.inputMgr.on((action: InputAction) => {
      if (this.isGamePaused) {
        this.handlePauseMenuInput(action);
        return;
      }

      if (this.gameOverContainer && this.gameOverContainer.visible) {
        if (action === 'CONFIRM' || action === 'ATTACK_BASIC') {
          this.restartBattle();
        }
        return;
      }

      switch (action) {
        case 'ATTACK_BASIC':
          this.onAttackSelected(0);
          break;
        case 'ATTACK_HEAVY':
          this.onAttackSelected(1);
          break;
        case 'ATTACK_SPECIAL':
          this.onAttackSelected(2);
          break;
        case 'PAUSE':
          this.togglePause();
          break;
        case 'CANCEL':
          this.togglePause();
          break;
      }
    });

    // Toast listener for Gamepad Connection / Disconnection
    this.toastUnsub = this.inputMgr.onToast((msg) => {
      this.showToast(msg);
    });
  }

  private handleDeterministicStep() {
    const steps = REFERENCE_TIMING.REFERENCE_SEQUENCE_STEPS;
    if (this.testStepIndex >= steps.length) return;

    const step = steps[this.testStepIndex];
    this.testStepIndex++;

    this.time.delayedCall(step.delayAfter, () => {
      if (this.battle.getPhase() === 'GAME_OVER') return;

      if (step.attacker === 'player') {
        this.onAttackSelected(step.attackIndex);
      } else {
        const attack = this.aiAttacks[step.attackIndex] || this.aiAttacks[0];
        this.battle.executeAttack(this.enemy, this.player, attack, false);
      }
    });
  }

  private onAttackSelected(index: number) {
    if (this.isBusy || !this.isPlayerTurn || this.isGamePaused) return;
    if (index >= this.playerAttacks.length) return;

    const attack = this.playerAttacks[index];
    this.isBusy = true;
    this.isPlayerTurn = false;
    this.showAttackButtons(false);
    this.turnIndicator.setText('');

    this.battle.executeAttack(this.player, this.enemy, attack, true);
  }

  private doAITurn() {
    if (this.battle.getPhase() === 'GAME_OVER' || this.isGamePaused) return;

    // AI selects attack
    const chosen = this.aiAttacks[Math.floor(Math.random() * this.aiAttacks.length)];
    this.battle.executeAttack(this.enemy, this.player, chosen, false);
  }

  private updateHPBars() {
    // Player HP
    const pRatio = Math.max(0, this.player.currentHp / this.player.maxHp);
    const pW = (this.HP_BAR_W - 4) * pRatio;

    this.tweens.add({
      targets: this.playerHpDelayed,
      displayWidth: Math.max(pW, 0),
      duration: 420,
      delay: 120,
      ease: 'Quad.easeInOut',
      onUpdate: () => {
        this.playerHpDelayed.setPosition(32 + this.playerHpDelayed.displayWidth / 2, 49);
      },
    });

    this.tweens.add({
      targets: this.playerHpBar,
      displayWidth: Math.max(pW, 0),
      duration: 250,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        this.playerHpBar.setPosition(32 + this.playerHpBar.displayWidth / 2, 38 + 11);
      },
    });

    const pColor = pRatio > 0.5 ? 0x38ef7d : pRatio > 0.25 ? 0xf7b733 : 0xff416c;
    this.playerHpBar.setFillStyle(pColor);
    this.playerHpText.setText(`${Math.ceil(this.player.currentHp)} / ${this.player.maxHp}`);

    // Opponent HP
    const eRatio = Math.max(0, this.enemy.currentHp / this.enemy.maxHp);
    const rightX = GAME_WIDTH - 32 - this.HP_BAR_W;
    const eW = (this.HP_BAR_W - 4) * eRatio;

    this.tweens.add({
      targets: this.enemyHpDelayed,
      displayWidth: Math.max(eW, 0),
      duration: 420,
      delay: 120,
      ease: 'Quad.easeInOut',
      onUpdate: () => {
        this.enemyHpDelayed.setPosition(rightX + this.enemyHpDelayed.displayWidth / 2, 49);
      },
    });

    this.tweens.add({
      targets: this.enemyHpBar,
      displayWidth: Math.max(eW, 0),
      duration: 250,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        this.enemyHpBar.setPosition(rightX + this.enemyHpBar.displayWidth / 2, 38 + 11);
      },
    });

    const eColor = eRatio > 0.5 ? 0xff416c : eRatio > 0.25 ? 0xf7b733 : 0xaa1111;
    this.enemyHpBar.setFillStyle(eColor);
    this.enemyHpText.setText(`${Math.ceil(this.enemy.currentHp)} / ${this.enemy.maxHp}`);
  }

  private showImpactEffect(data: { target: string; attackId: string }) {
    const target = data.target === this.player.id ? this.player : this.enemy;
    const isHeavy = data.attackId.includes('tackle') || data.attackId.includes('slam');
    const burst = this.add.container(target.x, target.y - 28).setDepth(115);
    const ring = this.add.ellipse(0, 0, isHeavy ? 88 : 64, isHeavy ? 88 : 64, 0xfff0b0, 0.22)
      .setStrokeStyle(4, isHeavy ? 0xe88170 : 0xffd36a, 0.95);
    const rays = this.add.graphics();
    rays.lineStyle(isHeavy ? 5 : 3, isHeavy ? 0xff826d : 0xffd36a, 0.9);
    const rayCount = isHeavy ? 12 : 8;
    for (let i = 0; i < rayCount; i++) {
      const angle = (Math.PI * 2 * i) / rayCount;
      const inner = isHeavy ? 34 : 24;
      const outer = isHeavy ? 64 : 48;
      rays.lineBetween(Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    burst.add([ring, rays]);
    this.tweens.add({
      targets: burst,
      scale: isHeavy ? 1.35 : 1.15,
      alpha: 0,
      duration: isHeavy ? 260 : 190,
      ease: 'Quad.easeOut',
      onComplete: () => burst.destroy(),
    });
  }

  private showAttackButtons(visible: boolean) {
    this.attackButtons.forEach(btn => {
      btn.setAlpha(visible ? 1 : 0.35);
    });
    this.attackPanel.setAlpha(visible ? 1 : 0.7);
  }

  // ========================================================
  // PHASE 16: PAUSE MENU
  // ========================================================
  private pauseSelectionIndex = 0;
  private pauseOptions = ['RESUME', 'RESTART', 'CONTROLS', 'QUIT'];
  private pauseButtons: Phaser.GameObjects.Text[] = [];

  togglePause() {
    this.isGamePaused = !this.isGamePaused;

    if (this.isGamePaused) {
      // Stop state progression, attack timers, movement, damage, audio
      this.tweens.pauseAll();
      this.time.paused = true;
      getAudioManager().pauseAll();
      getAudioManager().playSFX('PAUSE');
      this.openPauseMenu();
    } else {
      // Resume correctly
      this.closePauseMenu();
      this.tweens.resumeAll();
      this.time.paused = false;
      getAudioManager().resumeAll();
    }
  }

  private openPauseMenu() {
    if (this.pauseContainer) this.pauseContainer.destroy();

    this.pauseContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(300);

    // Dim backdrop
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x070913, 0.75)
      .setInteractive();

    // Menu modal panel
    const panel = this.add.rectangle(0, 0, 360, 340, 0x141824, 0.95);
    panel.setStrokeStyle(3, 0x3d4766);

    const title = this.add.text(0, -120, 'PAUSED', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '44px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.pauseButtons = [];
    this.pauseOptions.forEach((opt, idx) => {
      const y = -40 + idx * 52;
      const btn = this.add.text(0, y, opt, {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '24px',
        color: idx === this.pauseSelectionIndex ? '#ffdd00' : '#cccccc',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => this.selectPauseOption(idx));
      btn.on('pointerover', () => {
        this.pauseSelectionIndex = idx;
        this.updatePauseMenuVisuals();
      });

      this.pauseButtons.push(btn);
    });

    const hint = this.add.text(0, 130, 'Use Arrow Keys & Space / Enter to Select', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#888899',
    }).setOrigin(0.5);

    this.pauseContainer.add([backdrop, panel, title, ...this.pauseButtons, hint]);
    this.updatePauseMenuVisuals();
  }

  private updatePauseMenuVisuals() {
    this.pauseButtons.forEach((btn, idx) => {
      if (idx === this.pauseSelectionIndex) {
        btn.setColor('#ffdd00');
        btn.setScale(1.1);
      } else {
        btn.setColor('#cccccc');
        btn.setScale(1.0);
      }
    });
  }

  private handlePauseMenuInput(action: InputAction) {
    if (this.controlsModalContainer) {
      if (action === 'CANCEL' || action === 'CONFIRM' || action === 'PAUSE') {
        this.controlsModalContainer.destroy();
        this.controlsModalContainer = undefined;
      }
      return;
    }

    switch (action) {
      case 'MOVE_UP':
        this.pauseSelectionIndex = (this.pauseSelectionIndex - 1 + this.pauseOptions.length) % this.pauseOptions.length;
        this.updatePauseMenuVisuals();
        break;
      case 'MOVE_DOWN':
        this.pauseSelectionIndex = (this.pauseSelectionIndex + 1) % this.pauseOptions.length;
        this.updatePauseMenuVisuals();
        break;
      case 'CONFIRM':
      case 'ATTACK_BASIC':
        this.selectPauseOption(this.pauseSelectionIndex);
        break;
      case 'PAUSE':
      case 'CANCEL':
        this.togglePause();
        break;
    }
  }

  private selectPauseOption(idx: number) {
    const choice = this.pauseOptions[idx];
    switch (choice) {
      case 'RESUME':
        this.togglePause();
        break;
      case 'RESTART':
        this.togglePause();
        this.restartBattle();
        break;
      case 'CONTROLS':
        this.showControlsModal();
        break;
      case 'QUIT':
        this.togglePause();
        this.scene.start('MenuScene');
        break;
    }
  }

  private showControlsModal() {
    this.controlsModalContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(350);
    const bg = this.add.rectangle(0, 0, 480, 360, 0x10131e, 0.98);
    bg.setStrokeStyle(2, 0x7f93ff);

    const title = this.add.text(0, -140, 'CONTROLS GUIDE', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '28px',
      color: '#ffdd00',
    }).setOrigin(0.5);

    const text = this.add.text(0, 0, 
      'KEYBOARD:\n' +
      '• Move: Arrow Keys or WASD\n' +
      '• Attacks: J (Basic), K (Heavy), L (Special) or 1 / 2 / 3\n' +
      '• Confirm / Pause: Space / Escape\n\n' +
      'GAMEPAD / CONTROLLER:\n' +
      '• Move: D-Pad or Left Stick\n' +
      '• Attacks: A (Basic), B (Heavy), X (Special)\n' +
      '• Confirm / Pause: Y / Start\n\n' +
      'TOUCH (PSP-STYLE):\n' +
      '• Left D-pad: Move | Right Diamond: A/B/X/Y Attacks',
      {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffffff',
        align: 'left',
        lineSpacing: 4,
      }
    ).setOrigin(0.5);

    const closeBtn = this.add.text(0, 140, '[ CLOSE (SPACE / ESC) ]', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '18px',
      color: '#ff6666',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      this.controlsModalContainer?.destroy();
      this.controlsModalContainer = undefined;
    });

    this.controlsModalContainer.add([bg, title, text, closeBtn]);
  }

  private closePauseMenu() {
    if (this.pauseContainer) {
      this.pauseContainer.destroy();
      this.pauseContainer = undefined;
    }
    if (this.controlsModalContainer) {
      this.controlsModalContainer.destroy();
      this.controlsModalContainer = undefined;
    }
  }

  // ========================================================
  // PHASE 17: REPLAY / VICTORY / DEFEAT
  // ========================================================
  private showGameOverScreen(playerWon: boolean) {
    if (this.gameOverContainer) this.gameOverContainer.destroy();

    this.gameOverContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(250);

    const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);

    const titleText = playerWon ? 'VICTORY!' : 'DEFEAT';
    const titleColor = playerWon ? '#ffdd00' : '#ff3333';

    const title = this.add.text(0, -60, titleText, {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '76px',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 10,
    }).setOrigin(0.5);

    const playAgainBtn = this.add.container(0, 40);
    const btnBg = this.add.rectangle(0, 0, 220, 56, 0x1f2940)
      .setStrokeStyle(3, 0xffdd00)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(0, 0, 'PLAY AGAIN', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '26px',
      color: '#ffffff',
    }).setOrigin(0.5);

    btnBg.on('pointerdown', () => this.restartBattle());
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x2f3f63));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x1f2940));

    playAgainBtn.add([btnBg, btnText]);

    const hint = this.add.text(0, 110, 'Press SPACE or CONFIRM to Play Again', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.gameOverContainer.add([bg, title, playAgainBtn, hint]);
  }

  // Clean in-place restart without page reload
  restartBattle() {
    if (this.gameOverContainer) {
      this.gameOverContainer.destroy();
      this.gameOverContainer = undefined;
    }
    this.closePauseMenu();

    this.isGamePaused = false;
    this.time.paused = false;
    this.tweens.resumeAll();

    // Reset battle machine & characters
    this.battle.reset();
    this.player.reset();
    this.enemy.reset();

    this.isBusy = false;
    this.isPlayerTurn = false;
    this.testStepIndex = 0;

    this.updateHPBars();
    this.turnIndicator.setText('Starting Round...');

    this.time.delayedCall(600, () => {
      this.battle.startBattle();
    });
  }

  // ========================================================
  // GAMEPAD TOAST NOTIFICATION
  // ========================================================
  private showToast(message: string) {
    if (this.toastBanner) this.toastBanner.destroy();

    this.toastBanner = this.add.container(GAME_WIDTH / 2, 35).setDepth(290);
    const bg = this.add.rectangle(0, 0, 320, 38, 0x1b2030, 0.95);
    bg.setStrokeStyle(2, message.includes('CONNECTED') && !message.includes('DISCONNECTED') ? 0x38ef7d : 0xff416c);

    const txt = this.add.text(0, 0, `🎮 ${message}`, {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.toastBanner.add([bg, txt]);

    this.toastBanner.setAlpha(0);
    this.tweens.add({ targets: this.toastBanner, alpha: 1, duration: 200 });

    if (this.toastTimer) this.toastTimer.remove();
    this.toastTimer = this.time.delayedCall(2500, () => {
      if (this.toastBanner) {
        this.tweens.add({
          targets: this.toastBanner,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            this.toastBanner?.destroy();
            this.toastBanner = undefined;
          },
        });
      }
    });
  }

  // ========================================================
  // PHASE 24: DEBUG MODE (F3)
  // ========================================================
  private setupDebug() {
    this.debugGraphics = this.add.graphics().setDepth(150);
    this.debugText = this.add.text(12, GAME_HEIGHT - 170, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#00ff66',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 6, y: 4 },
    }).setDepth(151).setVisible(false);

    // Listen for F3 toggle
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.isDebugMode = !this.isDebugMode;
        this.debugText?.setVisible(this.isDebugMode);
        if (!this.isDebugMode && this.debugGraphics) {
          this.debugGraphics.clear();
        }
      }
    });
  }

  private updateDebug() {
    if (!this.isDebugMode || !this.debugGraphics || !this.debugText) return;

    this.debugGraphics.clear();

    // Draw Hurtboxes
    const pHurt = this.player.getHurtbox();
    this.debugGraphics.lineStyle(2, 0x00ff00, 0.8);
    this.debugGraphics.strokeRect(pHurt.x, pHurt.y, pHurt.width, pHurt.height);

    const eHurt = this.enemy.getHurtbox();
    this.debugGraphics.lineStyle(2, 0xff0000, 0.8);
    this.debugGraphics.strokeRect(eHurt.x, eHurt.y, eHurt.width, eHurt.height);

    // Draw Attacking Hitbox if active
    if (this.player.isAttacking) {
      this.debugGraphics.lineStyle(2, 0xffff00, 1);
      this.debugGraphics.strokeRect(this.player.x, this.player.y - 40, 70, 60);
    }
    if (this.enemy.isAttacking) {
      this.debugGraphics.lineStyle(2, 0x00ffff, 1);
      this.debugGraphics.strokeRect(this.enemy.x - 70, this.enemy.y - 40, 70, 60);
    }

    // Update text
    const fps = Math.round(this.game.loop.actualFps);
    this.debugText.setText(
      `DEBUG MODE (F3)\n` +
      `FPS: ${fps} | Phase: ${this.battle.getPhase()}\n` +
      `Player: X:${Math.round(this.player.x)} Y:${Math.round(this.player.y)} | State: ${this.player.state} | HP: ${this.player.currentHp}\n` +
      `Opponent: X:${Math.round(this.enemy.x)} Y:${Math.round(this.enemy.y)} | State: ${this.enemy.state} | HP: ${this.enemy.currentHp}\n` +
      `TestMode: ${this.battle.getDeterministicTest()} | Paused: ${this.isGamePaused}`
    );
  }

  override update(_time: number, delta: number) {
    this.inputMgr.update();

    if (!this.isGamePaused) {
      // Interactive movement for player during their turn
      if (this.isPlayerTurn && !this.isBusy) {
        let dirX = 0;
        let dirY = 0;
        if (this.inputMgr.isActionHeld('MOVE_LEFT')) dirX -= 1;
        if (this.inputMgr.isActionHeld('MOVE_RIGHT')) dirX += 1;
        if (this.inputMgr.isActionHeld('MOVE_UP')) dirY -= 1;
        if (this.inputMgr.isActionHeld('MOVE_DOWN')) dirY += 1;

        this.player.move(dirX, dirY, delta);
      }

      this.player.update();
      this.enemy.update();
    }

    this.updateDebug();
  }

  destroy() {
    this.inputUnsub?.();
    this.toastUnsub?.();
    this.battle.destroy();
  }
}
