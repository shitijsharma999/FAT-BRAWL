// AudioManager.ts
// Event-based audio system using Web Audio API (procedural synthesis, no external audio files required)

export type AudioEvent =
  | 'MENU_SELECT'
  | 'ATTACK_START'
  | 'ATTACK_WHOOSH'
  | 'ATTACK_WHOOSH_LIGHT'
  | 'ATTACK_WHOOSH_HEAVY'
  | 'ATTACK_CONTACT'
  | 'HIT'
  | 'DAMAGE'
  | 'CRITICAL'
  | 'KNOCKBACK'
  | 'DEFEAT'
  | 'VICTORY'
  | 'REPLAY'
  | 'PAUSE'
  | 'ANNOUNCE'
  | 'KO';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterVolume = 0.7;
  private sfxVolume = 0.8;
  private musicVolume = 0.4;
  private muted = false;
  private activeSources: Set<AudioBufferSourceNode | OscillatorNode> = new Set();
  private bgmInterval: number | null = null;

  constructor() {
    this.initContext();
  }

  private initContext() {
    try {
      this.ctx = new AudioContext();
    } catch (e) {
      console.warn('Web Audio API not available', e);
    }
  }

  public ensureContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private getEffectiveVolume(type: 'sfx' | 'music' = 'sfx') {
    if (this.muted) return 0;
    return this.masterVolume * (type === 'sfx' ? this.sfxVolume : this.musicVolume);
  }

  // Procedural SFX generation
  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.3,
    freqEnd?: number,
    attack = 0.01,
    filterFreq?: number
  ) {
    if (!this.ctx || this.muted) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(freqEnd, 0.01),
        this.ctx.currentTime + duration
      );
    }

    const vol = volume * this.getEffectiveVolume('sfx');
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    if (filterFreq) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration + 0.05);
    this.activeSources.add(osc);
    osc.onended = () => this.activeSources.delete(osc);
  }

  private playNoise(duration: number, volume = 0.3, filterFreq = 1000) {
    if (!this.ctx || this.muted) return;
    this.ensureContext();
    const bufSize = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.5;

    const gain = this.ctx.createGain();
    const vol = volume * this.getEffectiveVolume('sfx');
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
    this.activeSources.add(source);
    source.onended = () => this.activeSources.delete(source);
  }

  playSFX(event: AudioEvent | string) {
    if (!this.ctx || this.muted) return;

    switch (event) {
      case 'MENU_SELECT':
        this.playTone(440, 0.1, 'square', 0.2, 880);
        break;

      case 'ANNOUNCE':
        this.playTone(80, 0.4, 'sawtooth', 0.4, 40, 0.005, 200);
        setTimeout(() => this.playTone(600, 0.3, 'square', 0.15, 300), 50);
        break;

      case 'ATTACK_START':
        this.playTone(200, 0.15, 'sawtooth', 0.25, 400);
        break;

      case 'ATTACK_WHOOSH':
      case 'whoosh':
        this.playNoise(0.25, 0.35, 800);
        this.playTone(300, 0.25, 'sawtooth', 0.1, 60);
        break;

      case 'ATTACK_WHOOSH_LIGHT':
      case 'whoosh_light':
        this.playNoise(0.18, 0.25, 1200);
        break;

      case 'ATTACK_WHOOSH_HEAVY':
      case 'whoosh_heavy':
        this.playNoise(0.35, 0.45, 400);
        this.playTone(120, 0.35, 'sawtooth', 0.2, 40);
        break;

      case 'ATTACK_CONTACT':
      case 'HIT':
      case 'bite_impact':
      case 'tackle_impact':
        this.playNoise(0.15, 0.5, 300);
        this.playTone(80, 0.2, 'square', 0.5, 30, 0.002);
        setTimeout(() => this.playNoise(0.1, 0.3, 600), 20);
        break;

      case 'scratch_impact':
        this.playNoise(0.12, 0.4, 1500);
        this.playTone(400, 0.1, 'sawtooth', 0.3, 200);
        break;

      case 'slam_impact':
        this.playNoise(0.25, 0.6, 150);
        this.playTone(50, 0.3, 'square', 0.7, 20, 0.001);
        setTimeout(() => this.playNoise(0.15, 0.4, 300), 40);
        break;

      case 'DAMAGE':
        this.playTone(220, 0.3, 'square', 0.3, 80);
        break;

      case 'CRITICAL':
        this.playNoise(0.2, 0.6, 500);
        this.playTone(150, 0.3, 'square', 0.5, 50, 0.002);
        break;

      case 'KNOCKBACK':
        this.playNoise(0.3, 0.3, 200);
        break;

      case 'DEFEAT':
        this.playTone(200, 0.8, 'sawtooth', 0.4, 60, 0.01);
        setTimeout(() => this.playTone(150, 0.6, 'sawtooth', 0.3, 50), 100);
        break;

      case 'KO':
        this.playNoise(0.1, 0.7, 100);
        this.playTone(60, 0.5, 'square', 0.8, 20, 0.001);
        setTimeout(() => this.playTone(40, 1.0, 'sawtooth', 0.5, 20, 0.01), 200);
        break;

      case 'VICTORY': {
        const notes = [440, 550, 660, 880];
        notes.forEach((note, i) => {
          setTimeout(() => this.playTone(note, 0.3, 'square', 0.3, note * 1.1), i * 150);
        });
        break;
      }

      case 'REPLAY':
        this.playTone(660, 0.2, 'square', 0.3, 880);
        setTimeout(() => this.playTone(880, 0.15, 'square', 0.3, 1100), 200);
        break;

      case 'PAUSE':
        this.playTone(400, 0.1, 'square', 0.2, 200);
        break;
    }
  }

  stopSFX() {
    this.activeSources.forEach(src => {
      try { src.stop(); } catch { /* ignore */ }
    });
    this.activeSources.clear();
  }

  pauseAll() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  resumeAll() {
    if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
      this.ctx.resume().catch(() => {});
    }
  }

  setMasterVolume(vol: number) { this.masterVolume = Math.max(0, Math.min(1, vol)); }
  setSFXVolume(vol: number) { this.sfxVolume = Math.max(0, Math.min(1, vol)); }
  setMusicVolume(vol: number) { this.musicVolume = Math.max(0, Math.min(1, vol)); }

  getMasterVolume() { return this.masterVolume; }
  getSFXVolume() { return this.sfxVolume; }
  getMusicVolume() { return this.musicVolume; }

  mute() { this.muted = true; this.stopSFX(); }
  unmute() { this.muted = false; this.ensureContext(); }
  toggleMute() { this.muted ? this.unmute() : this.mute(); }
  isMuted() { return this.muted; }

  playBattleMusic() {
    if (this.bgmInterval) return;
    const playDrone = () => {
      if (!this.ctx || this.muted) return;
      this.playTone(55, 3.0, 'sine', 0.08, 55, 0.5, 200);
    };
    playDrone();
    this.bgmInterval = window.setInterval(playDrone, 3000);
  }

  stopBattleMusic() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

// Singleton instance
let _audioManager: AudioManager | null = null;
export function getAudioManager(): AudioManager {
  if (!_audioManager) _audioManager = new AudioManager();
  return _audioManager;
}
