import Phaser from 'phaser';
import type { Character } from '../entities/Character';
import type { AttackDefinition } from '../config/characters';
import { getAudioManager } from '../audio/AudioManager';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { REFERENCE_TIMING } from '../config/referenceTiming';

export type BattlePhase =
  | 'WAITING'
  | 'PLAYER_TURN'
  | 'ANNOUNCING'
  | 'EXECUTING_ATTACK'
  | 'HIT_STOP'
  | 'KNOCKBACK'
  | 'AI_TURN'
  | 'AI_ANNOUNCING'
  | 'AI_EXECUTING'
  | 'AI_HIT_STOP'
  | 'AI_KNOCKBACK'
  | 'INSTANT_REPLAY'
  | 'KO'
  | 'VICTORY'
  | 'DEFEAT'
  | 'GAME_OVER';

export interface BattleEvent {
  type:
    | 'PLAYER_TURN'
    | 'AI_TURN'
    | 'HIT'
    | 'DAMAGE'
    | 'KO'
    | 'VICTORY'
    | 'DEFEAT'
    | 'REPLAY'
    | 'PHASE_CHANGE'
    | 'RESTART';
  data?: unknown;
}

export type BattleEventCallback = (event: BattleEvent) => void;

export interface DamageNumber {
  text: Phaser.GameObjects.Text;
  startY: number;
}

export class BattleStateMachine {
  private scene: Phaser.Scene;
  player: Character;
  enemy: Character;
  private phase: BattlePhase = 'WAITING';
  private listeners: BattleEventCallback[] = [];

  // UI refs
  announceText: Phaser.GameObjects.Text | null = null;
  private damageNumbers: DamageNumber[] = [];
  private replayText: Phaser.GameObjects.Text | null = null;
  private replayOverlay: Phaser.GameObjects.Rectangle | null = null;
  private lastAttackForReplay: { attacker: Character; target: Character; attack: AttackDefinition } | null = null;

  // Active timers for cleanup
  private activeTimers: number[] = [];
  private isDestroyed = false;
  private isDeterministicTest = false;

  constructor(scene: Phaser.Scene, player: Character, enemy: Character) {
    this.scene = scene;
    this.player = player;
    this.enemy = enemy;

    // Check URL for referenceTest param
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      this.isDeterministicTest = urlParams.get('referenceTest') === 'true' || urlParams.get('REFERENCE_TEST') === 'true';
    }
  }

  setDeterministicTest(enabled: boolean) {
    this.isDeterministicTest = enabled;
  }

  getDeterministicTest(): boolean {
    return this.isDeterministicTest;
  }

  getPhase(): BattlePhase {
    return this.phase;
  }

  on(cb: BattleEventCallback) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(c => c !== cb);
    };
  }

  private emit(event: BattleEvent) {
    if (this.isDestroyed) return;
    this.listeners.forEach(cb => cb(event));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timer = window.setTimeout(() => {
        this.activeTimers = this.activeTimers.filter(t => t !== timer);
        resolve();
      }, ms);
      this.activeTimers.push(timer);
    });
  }

  startBattle() {
    this.phase = 'PLAYER_TURN';
    this.emit({ type: 'PLAYER_TURN' });
  }

  async executeAttack(
    attacker: Character,
    target: Character,
    attack: AttackDefinition,
    isPlayer: boolean
  ) {
    if (this.isDestroyed) return;
    const audio = getAudioManager();

    // 1. Announcement
    this.phase = isPlayer ? 'ANNOUNCING' : 'AI_ANNOUNCING';
    audio.playSFX('ANNOUNCE');
    await this.showAnnouncement(attack.announceText, attack.announceDelay);
    if (this.isDestroyed) return;

    // 2. Anticipation windup
    this.phase = isPlayer ? 'EXECUTING_ATTACK' : 'AI_EXECUTING';
    await attacker.playAnticipation();
    if (this.isDestroyed) return;

    // 3. Attack release and whoosh sound
    audio.playSFX('ATTACK_START');
    audio.playSFX(attack.sfxWhoosh);

    // 4. Lunge movement
    const targetX = target.sprite.x;
    const lungeTargetX = attacker.facingRight
      ? targetX - target.hurtboxW / 2 - 25
      : targetX + target.hurtboxW / 2 + 25;

    let attackComplete: Promise<void>;
    if (attack.moveType === 'jump') {
      attackComplete = attacker.playJumpSlam(lungeTargetX, attack.lungeDuration);
    } else {
      attackComplete = attacker.playLunge(lungeTargetX, attack.lungeDuration);
    }

    await this.sleep(attack.startup);
    if (this.isDestroyed) return;
    await attackComplete;
    if (this.isDestroyed) return;

    // 5. Contact & Hitstop freeze
    audio.playSFX(attack.sfxImpact);
    audio.playSFX('ATTACK_CONTACT');

    this.phase = isPlayer ? 'HIT_STOP' : 'AI_HIT_STOP';
    this.scene.tweens.pauseAll();
    const reducedMotion = typeof localStorage !== 'undefined'
      && localStorage.getItem('fat-brawl-reduced-motion') === 'true';
    await this.sleep(reducedMotion ? 30 : (attack.hitStop || REFERENCE_TIMING.HITSTOP_DURATION));
    if (this.isDestroyed) return;
    this.scene.tweens.resumeAll();

    // 6. Camera shake
    const shakeStrength = (REFERENCE_TIMING.SCREEN_SHAKE_STRENGTH * (attack.damage / 20));
    const shakeEnabled = typeof localStorage === 'undefined'
      || localStorage.getItem('fat-brawl-screen-shake') !== 'false';
    if (shakeEnabled && !reducedMotion) {
      this.scene.cameras.main.shake(
        REFERENCE_TIMING.SCREEN_SHAKE_DURATION,
        shakeStrength
      );
    }

    // 7. Flash red
    target.sprite.setTint(0xff4444);
    this.sleep(80).then(() => {
      if (!this.isDestroyed && target.sprite && target.sprite.active) {
        target.sprite.clearTint();
      }
    });

    // 8. Damage & Floating number
    const actualDamage = target.takeDamage(attack.damage);
    this.emit({
      type: 'DAMAGE',
      data: { amount: actualDamage, target: target.id, attackId: attack.id },
    });
    this.spawnDamageNumber(target.sprite.x, target.sprite.y - 60, actualDamage);

    // 9. Knockback & Hurt reaction
    this.phase = isPlayer ? 'KNOCKBACK' : 'AI_KNOCKBACK';
    audio.playSFX('KNOCKBACK');
    const hurtPromise = target.playHurtReaction(
      attack.knockback,
      attack.knockbackDir,
      attack.recovery
    );

    attacker.returnToStart(REFERENCE_TIMING.RETURN_TO_BASE_DURATION);
    await hurtPromise;
    if (this.isDestroyed) return;

    audio.playSFX('DAMAGE');
    this.lastAttackForReplay = { attacker, target, attack };

    // 10. Check KO / Game over
    if (target.currentHp <= 0) {
      await this.triggerKO(target, attacker, isPlayer);
      return;
    }

    // 11. Instant Replay on heavy hits (or deterministic trigger)
    const shouldReplay = this.isDeterministicTest
      ? attack.name.toLowerCase().includes('body slam')
      : attack.damage >= 20 && Math.random() < 0.45;

    if (shouldReplay) {
      await this.triggerInstantReplay();
      if (this.isDestroyed) return;
    }

    // 12. Advance turn
    if (isPlayer) {
      this.phase = 'AI_TURN';
      this.emit({ type: 'AI_TURN' });
    } else {
      this.phase = 'PLAYER_TURN';
      this.emit({ type: 'PLAYER_TURN' });
    }
  }

  private async showAnnouncement(text: string, duration: number) {
    if (!this.announceText || this.isDestroyed) return;

    this.announceText.setText(text);
    this.announceText.setAlpha(0);
    this.announceText.setVisible(true);

    return new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: this.announceText,
        alpha: 1,
        duration: 180,
        ease: 'Power2',
        onComplete: () => {
          const holdTime = Math.max(duration - 450, 400);
          const t = window.setTimeout(() => {
            if (this.isDestroyed) { resolve(); return; }
            this.scene.tweens.add({
              targets: this.announceText,
              alpha: 0,
              duration: 250,
              ease: 'Power2',
              onComplete: () => {
                this.announceText?.setVisible(false);
                resolve();
              },
            });
          }, holdTime);
          this.activeTimers.push(t);
        },
      });
    });
  }

  private spawnDamageNumber(x: number, y: number, damage: number) {
    if (this.isDestroyed) return;
    const text = this.scene.add.text(x, y, `-${damage}HP`, {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '38px',
      color: '#ff2222',
      stroke: '#ffffff',
      strokeThickness: 5,
    });
    text.setOrigin(0.5);
    text.setDepth(120);

    const dn: DamageNumber = { text, startY: y };
    this.damageNumbers.push(dn);

    this.scene.tweens.add({
      targets: text,
      y: y - REFERENCE_TIMING.DAMAGE_FLOAT_DISTANCE,
      alpha: 0,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: REFERENCE_TIMING.DAMAGE_NUMBER_DURATION,
      ease: 'Quad.easeOut',
      onComplete: () => {
        text.destroy();
        this.damageNumbers = this.damageNumbers.filter(d => d.text !== text);
      },
    });
  }

  private async triggerInstantReplay() {
    if (this.isDestroyed) return;
    const audio = getAudioManager();
    audio.playSFX('REPLAY');
    this.emit({ type: 'REPLAY' });

    // Pink overlay (meme style from reference)
    if (!this.replayOverlay) {
      this.replayOverlay = this.scene.add.rectangle(
        GAME_WIDTH / 2, GAME_HEIGHT / 2,
        GAME_WIDTH, GAME_HEIGHT,
        0xff99cc, 0
      );
      this.replayOverlay.setDepth(50);
    }

    // Fade in pink background
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: this.replayOverlay,
        alpha: 0.55,
        duration: 250,
        ease: 'Power2',
        onComplete: () => resolve(),
      });
    });
    if (this.isDestroyed) return;

    // Show banner
    if (!this.replayText) {
      this.replayText = this.scene.add.text(GAME_WIDTH / 2, 90, 'INSTANT REPLAY!!!!', {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '52px',
        color: '#000000',
        stroke: '#ffffff',
        strokeThickness: 7,
      });
      this.replayText.setOrigin(0.5);
      this.replayText.setDepth(60);
    }
    this.replayText.setAlpha(0).setVisible(true);
    this.scene.tweens.add({ targets: this.replayText, alpha: 1, duration: 200 });

    // Zoom in on target
    if (this.lastAttackForReplay) {
      const target = this.lastAttackForReplay.target;
      this.scene.cameras.main.zoomTo(
        REFERENCE_TIMING.REPLAY_ZOOM,
        REFERENCE_TIMING.REPLAY_ZOOM_DURATION,
        'Quad.easeOut'
      );
      this.scene.cameras.main.pan(
        target.sprite.x,
        target.sprite.y,
        REFERENCE_TIMING.REPLAY_ZOOM_DURATION,
        'Quad.easeOut'
      );
    }

    await this.sleep(2200);
    if (this.isDestroyed) return;

    // Zoom out back to standard view
    this.scene.cameras.main.zoomTo(1, 450, 'Quad.easeOut');
    this.scene.cameras.main.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2, 450, 'Quad.easeOut');

    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: this.replayOverlay,
        alpha: 0,
        duration: 350,
        ease: 'Power2',
        onComplete: () => resolve(),
      });
    });
    this.replayText?.setVisible(false);
    await this.sleep(200);
  }

  private async triggerKO(loser: Character, winner: Character, playerAttacked: boolean) {
    if (this.isDestroyed) return;
    const audio = getAudioManager();

    // Defeat animation
    audio.playSFX('DEFEAT');
    await loser.playDefeat();
    if (this.isDestroyed) return;

    await this.sleep(300);

    // K.O. blast banner
    audio.playSFX('KO');
    const ko = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, 'K.O.', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '100px',
      color: '#ff1111',
      stroke: '#ffffff',
      strokeThickness: 10,
    });
    ko.setOrigin(0.5).setDepth(200).setAlpha(0);

    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: ko,
        alpha: 1,
        scaleX: 1.25,
        scaleY: 1.25,
        duration: 250,
        ease: 'Back.easeOut',
        onComplete: () => resolve(),
      });
    });
    if (this.isDestroyed) return;

    this.scene.cameras.main.shake(180, 0.008);
    await this.sleep(1600);
    if (this.isDestroyed) return;

    ko.destroy();

    // Winner celebration
    winner.playVictory();
    audio.playSFX('VICTORY');

    const winnerText = `${winner.displayName} WINS!`;
    const winBanner = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, winnerText, {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '60px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 8,
    });
    winBanner.setOrigin(0.5).setDepth(200).setAlpha(0);

    this.scene.tweens.add({
      targets: winBanner,
      alpha: 1,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 350,
      ease: 'Back.easeOut',
    });

    this.phase = 'GAME_OVER';
    this.emit({ type: 'KO', data: { winner: winner.id, loser: loser.id } });

    await this.sleep(2200);
    if (this.isDestroyed) return;

    winBanner.destroy();

    const isVictory = playerAttacked;
    this.phase = isVictory ? 'VICTORY' : 'DEFEAT';
    this.emit({
      type: isVictory ? 'VICTORY' : 'DEFEAT',
      data: { winner: winner.id },
    });
  }

  reset() {
    this.phase = 'WAITING';
    this.activeTimers.forEach(t => clearTimeout(t));
    this.activeTimers = [];

    this.damageNumbers.forEach(dn => {
      if (dn.text && dn.text.active) dn.text.destroy();
    });
    this.damageNumbers = [];

    if (this.replayOverlay && this.replayOverlay.active) {
      this.replayOverlay.setAlpha(0);
    }
    if (this.replayText && this.replayText.active) {
      this.replayText.setVisible(false);
    }
    if (this.announceText && this.announceText.active) {
      this.announceText.setVisible(false);
    }

    this.scene.cameras.main.resetFX();
    this.scene.cameras.main.setZoom(1);
    this.scene.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    this.lastAttackForReplay = null;
    this.emit({ type: 'RESTART' });
  }

  destroy() {
    this.isDestroyed = true;
    this.activeTimers.forEach(t => clearTimeout(t));
    this.activeTimers = [];
    this.listeners = [];
  }
}
