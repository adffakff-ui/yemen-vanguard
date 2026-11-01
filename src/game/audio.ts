/**
 * Procedural Web Audio API sound generator for military combat
 * Zero external audio files, zero 404 dependencies, instant response.
 */

class TacticalSoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private radioGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.radioGain.connect(this.masterGain);

      this.isInitialized = true;
    } catch (e) {
      console.warn('TacticalSoundSystem could not initialize AudioContext', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        const p = this.ctx.resume();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch {
        // Silently ignore browser autoplay restriction
      }
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Generate synthetic white/pink noise buffer
  private createNoiseBuffer(duration: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink-ish noise filter
      lastOut = (lastOut * 0.7) + (white * 0.3);
      data[i] = lastOut;
    }
    return buffer;
  }

  // Assault rifle shot
  public playRifleShot() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // 1. Sharp transient crack
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    oscGain.gain.setValueAtTime(0.6, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);

    // 2. High-pressure noise blast
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.22);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1800, t);
      noiseFilter.frequency.exponentialRampToValueAtTime(300, t + 0.2);
      noiseFilter.Q.setValueAtTime(1.8, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.8, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(t);
      noise.stop(t + 0.25);
    }
  }

  // Sniper rifle shot (heavier concussive crack + canyon echo)
  public playSniperShot() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Concussive sub boom
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(180, t);
    sub.frequency.exponentialRampToValueAtTime(35, t + 0.35);
    subGain.gain.setValueAtTime(0.9, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + 0.45);

    // Supersonic crack noise
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.6);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2400, t);
      filter.frequency.exponentialRampToValueAtTime(150, t + 0.5);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(1.0, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.58);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(t);
      noise.stop(t + 0.6);
    }
  }

  // Hit-marker sound (crisp tick for confirmed hit)
  public playHitMarker(isHeadshot: boolean = false) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isHeadshot ? 2200 : 1600, t);
    osc.frequency.exponentialRampToValueAtTime(isHeadshot ? 2800 : 1800, t + 0.06);

    gain.gain.setValueAtTime(isHeadshot ? 0.35 : 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Reload mechanical clacks
  public playReload() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Mag out click
    this.playClick(t, 600, 0.06);
    // Mag in click
    this.playClick(t + 0.5, 900, 0.07);
    // Bolt slide rack
    this.playSlide(t + 1.1);
  }

  public playClick(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  public playSlide(time: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, time);
    osc.frequency.linearRampToValueAtTime(1100, time + 0.12);
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  public playWeaponSwap() {
    if (!this.ctx) return;
    this.playSlide(this.ctx.currentTime);
  }

  // Tactical Frag Grenade Explosion / Fuel Barrel detonation
  public playExplosion() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Sub-bass detonation thump
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(25, t + 0.8);
    subGain.gain.setValueAtTime(1.0, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + 0.95);

    // Rumble & debris noise
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(1.4);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + 1.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(t);
      noise.stop(t + 1.4);
    }
  }

  // Player hurt / grunt
  public playPlayerHurt() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.18);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Combat dodge roll whoosh
  public playDodgeRoll() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.3);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.exponentialRampToValueAtTime(800, t + 0.15);
      filter.frequency.exponentialRampToValueAtTime(200, t + 0.3);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(t);
      noise.stop(t + 0.32);
    }
  }

  // Tactical radio squelch & chatter beep
  public playRadioChirp() {
    if (!this.ctx || !this.radioGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Walkie-talkie dual tone squelch
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1250, t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1800, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.radioGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.11);
    osc2.stop(t + 0.11);
  }

  // Footstep on terrain
  public playFootstep(isSprint: boolean = false) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.08);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isSprint ? 450 : 320, t);

      const gain = this.ctx.createGain();
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(t);
      noise.stop(t + 0.08);
    }
  }

  // Heavy Autocannon blast (for Armored Boss Technical)
  public playHeavyAutocannon() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(140, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + 0.35);
    subGain.gain.setValueAtTime(0.85, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + 0.4);

    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.45);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.exponentialRampToValueAtTime(160, t + 0.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(t);
      noise.stop(t + 0.48);
    }
  }

  // Tactical Warning Alarm (when Armored Boss arrives)
  public playBossAlarm() {
    if (!this.ctx || !this.radioGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const startT = t + i * 0.28;
      osc.frequency.setValueAtTime(750, startT);
      osc.frequency.linearRampToValueAtTime(1150, startT + 0.18);

      gain.gain.setValueAtTime(0.35, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.24);

      osc.connect(gain);
      gain.connect(this.radioGain);
      osc.start(startT);
      osc.stop(startT + 0.25);
    }
  }

  // Procedural Arabic Military Radio Callout (Walkie-talkie squelch + vocal formant modulation)
  public playRadioVoiceCallout() {
    if (!this.ctx || !this.radioGain || this.isMuted) return;
    this.resume();
    this.playRadioChirp();

    const t = this.ctx.currentTime + 0.12;
    // Formant vocal beeps & radio noise burst (synthesizing military chatter)
    const chatterPitches = [340, 420, 310, 480, 360];
    chatterPitches.forEach((pitch, idx) => {
      if (!this.ctx || !this.radioGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, t + idx * 0.09);
      filter.Q.setValueAtTime(4.0, t + idx * 0.09);

      const st = t + idx * 0.09;
      osc.frequency.setValueAtTime(pitch, st);
      gain.gain.setValueAtTime(0.2, st);
      gain.gain.exponentialRampToValueAtTime(0.01, st + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.radioGain);

      osc.start(st);
      osc.stop(st + 0.085);
    });
  }

  // Wood Splinter & Crate Shatter Sound (sharp wooden crack + timber crunch)
  public playWoodSplinterSound() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Wood snap transient
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.1);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.14);

    // Splinter noise burst
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.18);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.frequency.exponentialRampToValueAtTime(400, t + 0.15);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.6, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(t);
      noise.stop(t + 0.2);
    }
  }

  // Sandbag Impact & Burst Sound (heavy muffled thud + sand dispersion)
  public playSandbagImpactSound() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, t);
    sub.frequency.exponentialRampToValueAtTime(40, t + 0.22);
    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + 0.28);

    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.2);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(t);
      noise.stop(t + 0.22);
    }
  }

  // Tactical Loot Pickup Chime (high dual-tone shimmer)
  public playLootPickupSound() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const st = t + idx * 0.05;
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.3, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(st);
      osc.stop(st + 0.14);
    });
  }

  // Tactical Recon Drone Turbine Spin-up & Launch Whir
  public playDroneLaunch() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Ascending rotor pitch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(850, t + 0.6);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.8);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.85);

    // High frequency rotor air turbulence
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.7);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(3200, t + 0.5);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(t);
      noise.stop(t + 0.75);
    }
  }

  // Tactical Drone Sonar Ping when identifying sniper nest
  public playDroneScanPing() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(2200, t + 0.18);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Tactical Target Lock-on Beep (Electronic dual-pulse targeting chime)
  public playTargetLockSound() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Pulse 1: 920 Hz
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(920, t);
    gain1.gain.setValueAtTime(0.35, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(t);
    osc1.stop(t + 0.09);

    // Pulse 2: 1840 Hz (octave higher, sharp lock confirmation)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1840, t + 0.07);
    gain2.gain.setValueAtTime(0.4, t + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.17);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(t + 0.07);
    osc2.stop(t + 0.18);
  }
}

export const soundManager = new TacticalSoundSystem();

