import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

export type CharacterState =
  | 'IDLE'
  | 'WALKING'
  | 'ANTICIPATION'
  | 'WINDUP'
  | 'ATTACKING'
  | 'HURT'
  | 'KNOCKBACK'
  | 'RECOVER'
  | 'VICTORY'
  | 'DEFEAT';

export interface CharacterConfig {
  id: string;
  displayName: string;
  spriteKey: string;
  maxHp: number;
  startX: number;
  startY: number;
  facingRight: boolean;
  scale: number;
  hurtboxW: number;
  hurtboxH: number;
}

export class Character {
  scene: Phaser.Scene;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;

  id: string;
  displayName: string;
  maxHp: number;
  currentHp: number;
  facingRight: boolean;
  hurtboxW: number;
  hurtboxH: number;

  state: CharacterState = 'IDLE';
  isAttacking = false;
  isInvulnerable = false;
  isDefeated = false;

  baseStartX: number;
  baseStartY: number;
  startX: number;
  startY: number;

  // Animation state
  private idleTween: Phaser.Tweens.Tween | null = null;
  private currentTween: Phaser.Tweens.Tween | null = null;
  private waddlePhase = 0;

  constructor(scene: Phaser.Scene, config: CharacterConfig) {
    this.scene = scene;
    this.id = config.id;
    this.displayName = config.displayName;
    this.maxHp = config.maxHp;
    this.currentHp = config.maxHp;
    this.facingRight = config.facingRight;
    this.hurtboxW = config.hurtboxW;
    this.hurtboxH = config.hurtboxH;
    this.baseStartX = config.startX * GAME_WIDTH;
    this.baseStartY = config.startY * GAME_HEIGHT;
    this.startX = this.baseStartX;
    this.startY = this.baseStartY;

    // Shadow
    this.shadow = scene.add.ellipse(
      this.startX,
      this.startY + 20,
      config.hurtboxW * 0.9 * config.scale * 3,
      20 * config.scale * 3,
      0x000000,
      0.08
    );

    // Sprite
    this.sprite = scene.add.image(this.startX, this.startY, config.spriteKey);
    this.sprite.setScale(config.scale);

    // Flip if facing left
    if (!config.facingRight) {
      this.sprite.setFlipX(true);
    }

    this.startIdleAnimation();
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  setPosition(x: number, y: number) {
    this.sprite.setPosition(x, y);
    this.shadow.setPosition(x, y + this.sprite.displayHeight * 0.45);
  }

  startIdleAnimation() {
    if (this.idleTween) {
      this.idleTween.stop();
      this.idleTween = null;
    }

    // Gentle breathing/wobble animation
    this.idleTween = this.scene.tweens.add({
      targets: this.sprite,
      y: this.startY - 6,
      scaleX: this.sprite.scaleX * 1.02,
      scaleY: this.sprite.scaleY * 0.98,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  stopIdleAnimation() {
    if (this.idleTween) {
      this.idleTween.stop();
      this.idleTween = null;
    }
  }

  setState(state: CharacterState) {
    this.state = state;
    if (state === 'IDLE') {
      this.startIdleAnimation();
    } else {
      this.stopIdleAnimation();
    }
  }

  // Interactive movement (Arrow Keys / WASD / D-Pad / Analog Stick)
  move(dirX: number, dirY: number, deltaMs: number) {
    if (this.state !== 'IDLE' && this.state !== 'WALKING') return;
    if (this.isAttacking || this.isDefeated) return;

    if (dirX === 0 && dirY === 0) {
      if (this.state === 'WALKING') {
        this.setState('IDLE');
        this.sprite.setAngle(0);
      }
      return;
    }

    this.setState('WALKING');
    const speed = 0.22; // px per ms
    let newX = this.sprite.x + dirX * speed * deltaMs;
    let newY = this.sprite.y + dirY * speed * 0.5 * deltaMs;

    // Arena boundary clamps
    const minX = 80;
    const maxX = GAME_WIDTH / 2 - 40; // Stay on left side of arena
    const minY = this.baseStartY - 40;
    const maxY = this.baseStartY + 25;

    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    this.sprite.setPosition(newX, newY);
    this.startX = newX;
    this.startY = newY;

    // Waddling angle
    this.waddlePhase += deltaMs * 0.015;
    const wobbleAngle = Math.sin(this.waddlePhase) * 6;
    this.sprite.setAngle(wobbleAngle);
  }

  // Squish scale effect for anticipation
  playAnticipation(): Promise<void> {
    this.setState('ANTICIPATION');
    return new Promise(resolve => {
      if (this.currentTween) this.currentTween.stop();
      this.currentTween = this.scene.tweens.add({
        targets: this.sprite,
        scaleX: this.sprite.scaleX * 0.80,
        scaleY: this.sprite.scaleY * 1.20,
        duration: 180,
        ease: 'Back.easeIn',
        yoyo: true,
        onComplete: () => resolve(),
      });
    });
  }

  // Lunge forward attack movement
  playLunge(targetX: number, duration: number): Promise<void> {
    this.setState('ATTACKING');
    this.isAttacking = true;
    return new Promise(resolve => {
      if (this.currentTween) this.currentTween.stop();
      this.currentTween = this.scene.tweens.add({
        targets: this.sprite,
        x: targetX,
        scaleX: this.sprite.scaleX * 1.15,
        scaleY: this.sprite.scaleY * 0.88,
        duration,
        ease: 'Cubic.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  // Jump slam (for body slam)
  playJumpSlam(targetX: number, duration: number): Promise<void> {
    this.setState('ATTACKING');
    this.isAttacking = true;
    return new Promise(resolve => {
      if (this.currentTween) this.currentTween.stop();
      const currentY = this.sprite.y;
      this.scene.tweens.add({
        targets: this.sprite,
        x: targetX,
        y: currentY - 120,
        scaleX: this.sprite.scaleX * 1.1,
        scaleY: this.sprite.scaleY * 1.1,
        duration: duration * 0.45,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.sprite,
            y: currentY + 15,
            scaleX: this.sprite.scaleX * 0.85,
            scaleY: this.sprite.scaleY * 0.85,
            duration: duration * 0.55,
            ease: 'Bounce.easeOut',
            onComplete: () => resolve(),
          });
        },
      });
    });
  }

  // Return to start position
  returnToStart(duration = 320): Promise<void> {
    return new Promise(resolve => {
      if (this.currentTween) this.currentTween.stop();
      this.currentTween = this.scene.tweens.add({
        targets: this.sprite,
        x: this.startX,
        y: this.startY,
        scaleX: this.sprite.scaleX / 1.15,
        scaleY: this.sprite.scaleY / 0.88,
        duration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.isAttacking = false;
          this.setState('IDLE');
          resolve();
        },
      });
    });
  }

  // Hit reaction — flash white + push back
  playHurtReaction(knockback: number, knockbackDir: 'horizontal' | 'vertical' | 'diagonal', duration: number): Promise<void> {
    this.setState('HURT');
    this.isInvulnerable = true;
    return new Promise(resolve => {
      if (this.currentTween) this.currentTween.stop();

      this.startFlash(5, 50);

      const scaleX = this.sprite.scaleX;
      const scaleY = this.sprite.scaleY;
      this.sprite.setScale(scaleX * 1.25, scaleY * 0.7);

      const knockDir = this.facingRight ? -1 : 1;
      let targetX = this.sprite.x + knockback * knockDir;
      let targetY = this.sprite.y;

      if (knockbackDir === 'vertical') {
        targetY = this.sprite.y + 40;
      } else if (knockbackDir === 'diagonal') {
        targetX = this.sprite.x + knockback * 0.7 * knockDir;
        targetY = this.sprite.y + knockback * 0.4;
      }

      targetX = Math.max(60, Math.min(GAME_WIDTH - 60, targetX));

      this.currentTween = this.scene.tweens.add({
        targets: this.sprite,
        x: targetX,
        y: targetY,
        scaleX,
        scaleY,
        duration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (knockbackDir === 'vertical' || knockbackDir === 'diagonal') {
            this.scene.tweens.add({
              targets: this.sprite,
              y: this.startY,
              duration: 200,
              ease: 'Bounce.easeOut',
              onComplete: () => {
                this.setState('RECOVER');
                setTimeout(() => {
                  this.isInvulnerable = false;
                  this.startX = this.sprite.x;
                  this.setState('IDLE');
                  resolve();
                }, 180);
              },
            });
          } else {
            this.setState('RECOVER');
            setTimeout(() => {
              this.isInvulnerable = false;
              this.startX = this.sprite.x;
              this.setState('IDLE');
              resolve();
            }, 180);
          }
        },
      });
    });
  }

  // Defeat animation — topple over
  playDefeat(): Promise<void> {
    this.setState('DEFEAT');
    this.isDefeated = true;
    return new Promise(resolve => {
      if (this.currentTween) this.currentTween.stop();
      this.stopIdleAnimation();
      this.scene.tweens.add({
        targets: this.sprite,
        angle: this.facingRight ? 90 : -90,
        y: this.sprite.y + 30,
        alpha: 0.85,
        duration: 550,
        ease: 'Quad.easeIn',
        onComplete: () => resolve(),
      });
    });
  }

  // Victory animation
  playVictory() {
    this.setState('VICTORY');
    this.stopIdleAnimation();
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - 35,
      scaleX: this.sprite.scaleX * 1.1,
      scaleY: this.sprite.scaleY * 1.1,
      duration: 320,
      yoyo: true,
      repeat: 5,
      ease: 'Bounce.easeOut',
    });
  }

  private startFlash(times: number, interval: number) {
    let count = 0;
    const doFlash = () => {
      if (!this.sprite || !this.sprite.active) return;
      this.sprite.setTint(0xffffff);
      setTimeout(() => {
        if (!this.sprite || !this.sprite.active) return;
        this.sprite.clearTint();
        count++;
        if (count < times) setTimeout(doFlash, interval);
      }, interval);
    };
    doFlash();
  }

  getHurtbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.sprite.x - this.hurtboxW / 2,
      this.sprite.y - this.hurtboxH / 2,
      this.hurtboxW,
      this.hurtboxH
    );
  }

  takeDamage(amount: number): number {
    const actualDamage = Math.min(amount, this.currentHp);
    this.currentHp = Math.max(0, this.currentHp - amount);
    return actualDamage;
  }

  reset() {
    this.currentHp = this.maxHp;
    this.state = 'IDLE';
    this.isAttacking = false;
    this.isInvulnerable = false;
    this.isDefeated = false;
    this.startX = this.baseStartX;
    this.startY = this.baseStartY;
    this.sprite.setAngle(0);
    this.sprite.setAlpha(1);
    this.sprite.clearTint();
    this.sprite.setPosition(this.baseStartX, this.baseStartY);
    this.scene.tweens.killTweensOf(this.sprite);
    this.startIdleAnimation();
  }

  updateShadow() {
    this.shadow.setPosition(this.sprite.x, this.baseStartY + 22);
    const scaleRatio = Math.max(0.4, 1 - (this.baseStartY - this.sprite.y) / 300);
    this.shadow.setScale(scaleRatio, scaleRatio * 0.5);
    this.shadow.setAlpha(0.08 * scaleRatio);
  }

  update() {
    this.updateShadow();
  }

  destroy() {
    if (this.idleTween) this.idleTween.stop();
    if (this.currentTween) this.currentTween.stop();
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
