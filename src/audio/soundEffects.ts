// Web Audio API Synthesizer with 3D Positional Spatial Audio for USS Enterprise
// 100% client-side, zero external assets, zero-latency high-fidelity Star Trek audio

import * as THREE from 'three';

class StarTrekSoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  
  // Continuous engine hum & thruster nodes
  private impulseOsc1: OscillatorNode | null = null;
  private impulseOsc2: OscillatorNode | null = null;
  private impulseGain: GainNode | null = null;
  
  // Dedicated low-intensity sublight thruster sound
  private thrusterNoiseNode: AudioBufferSourceNode | null = null;
  private thrusterGain: GainNode | null = null;
  private thrusterFilter: BiquadFilterNode | null = null;
  private thrusterToneOsc: OscillatorNode | null = null;
  
  // Red alert loop
  private redAlertTimer: number | null = null;
  private isRedAlertPlaying: boolean = false;

  constructor() {
    // Initialized on user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.isMuted) {
      if (this.impulseGain && this.ctx) {
        this.impulseGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      if (this.thrusterGain && this.ctx) {
        this.thrusterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      this.stopRedAlert();
    } else {
      if (this.impulseGain && this.ctx) {
        this.impulseGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // --- 3D Listener Orientation Tracking (Updated Every Frame from Camera) ---
  public updateListener(cameraPos: THREE.Vector3, forward: THREE.Vector3, up: THREE.Vector3) {
    if (!this.ctx) return;
    const listener = this.ctx.listener;
    const t = this.ctx.currentTime;

    // Modern Web Audio API params
    if (listener.positionX) {
      listener.positionX.setValueAtTime(cameraPos.x, t);
      listener.positionY.setValueAtTime(cameraPos.y, t);
      listener.positionZ.setValueAtTime(cameraPos.z, t);
      listener.forwardX.setValueAtTime(forward.x, t);
      listener.forwardY.setValueAtTime(forward.y, t);
      listener.forwardZ.setValueAtTime(forward.z, t);
      listener.upX.setValueAtTime(up.x, t);
      listener.upY.setValueAtTime(up.y, t);
      listener.upZ.setValueAtTime(up.z, t);
    } else {
      // Legacy browser fallback
      (listener as unknown as { setPosition: (x: number, y: number, z: number) => void }).setPosition(
        cameraPos.x,
        cameraPos.y,
        cameraPos.z
      );
      (listener as unknown as { setOrientation: (fx: number, fy: number, fz: number, ux: number, uy: number, uz: number) => void }).setOrientation(
        forward.x, forward.y, forward.z, up.x, up.y, up.z
      );
    }
  }

  // Helper to construct a 3D PannerNode with inverse-distance attenuation
  private createPanner(pos?: THREE.Vector3 | [number, number, number]): PannerNode | null {
    if (!this.ctx || !pos) return null;
    try {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 80;
      panner.maxDistance = 3500;
      panner.rolloffFactor = 1.1;

      const px = Array.isArray(pos) ? pos[0] : pos.x;
      const py = Array.isArray(pos) ? pos[1] : pos.y;
      const pz = Array.isArray(pos) ? pos[2] : pos.z;

      if (panner.positionX) {
        panner.positionX.setValueAtTime(px, this.ctx.currentTime);
        panner.positionY.setValueAtTime(py, this.ctx.currentTime);
        panner.positionZ.setValueAtTime(pz, this.ctx.currentTime);
      } else {
        (panner as unknown as { setPosition: (x: number, y: number, z: number) => void }).setPosition(px, py, pz);
      }
      return panner;
    } catch {
      return null;
    }
  }

  // Connects node through panner if 3D position provided, else straight to destination
  private routeAudio(source: AudioNode, pos?: THREE.Vector3 | [number, number, number]) {
    if (!this.ctx) return;
    const panner = this.createPanner(pos);
    if (panner) {
      source.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      source.connect(this.ctx.destination);
    }
  }

  // --- LCARS Interface Chirps ---
  public playLcarsBeep(freq: number = 920, duration: number = 0.07) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.3, t + duration);

      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + duration);
    } catch {
      // Ignore
    }
  }

  // LCARS Dual Tone Affirmation
  public playLcarsAcknowledge() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [680, 1020].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.055);
      gain.gain.setValueAtTime(0.08, t + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.055 + 0.075);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.055);
      osc.stop(t + idx * 0.055 + 0.075);
    });
  }

  // Target Lock High-Tech Chirp
  public playTargetLock() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [1200, 1500, 1900].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);
      gain.gain.setValueAtTime(0.09, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.05);
    });
  }

  // --- Sublight Impulse Engine & Moving Thruster Sound ---
  // Requested: gentle, less loud, recognizable thruster motion sound
  public startImpulseHum() {
    if (this.impulseOsc1) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      // 1. Ambient low frequency reactor hum
      this.impulseOsc1 = this.ctx.createOscillator();
      this.impulseOsc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      this.impulseGain = this.ctx.createGain();

      this.impulseOsc1.type = 'sawtooth';
      this.impulseOsc1.frequency.setValueAtTime(48, this.ctx.currentTime);

      this.impulseOsc2.type = 'sine';
      this.impulseOsc2.frequency.setValueAtTime(96, this.ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, this.ctx.currentTime);

      this.impulseGain.gain.setValueAtTime(this.isMuted ? 0 : 0.035, this.ctx.currentTime);

      this.impulseOsc1.connect(filter);
      this.impulseOsc2.connect(filter);
      filter.connect(this.impulseGain);
      this.impulseGain.connect(this.ctx.destination);

      this.impulseOsc1.start();
      this.impulseOsc2.start();

      // 2. Continuous sublight thruster sound (gentle warm exhaust hiss + pitch tone)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const out = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        out[i] = (Math.random() * 2 - 1) * 0.3;
      }
      this.thrusterNoiseNode = this.ctx.createBufferSource();
      this.thrusterNoiseNode.buffer = noiseBuffer;
      this.thrusterNoiseNode.loop = true;

      this.thrusterFilter = this.ctx.createBiquadFilter();
      this.thrusterFilter.type = 'bandpass';
      this.thrusterFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
      this.thrusterFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      this.thrusterToneOsc = this.ctx.createOscillator();
      this.thrusterToneOsc.type = 'sine';
      this.thrusterToneOsc.frequency.setValueAtTime(62, this.ctx.currentTime);

      this.thrusterGain = this.ctx.createGain();
      this.thrusterGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.thrusterNoiseNode.connect(this.thrusterFilter);
      this.thrusterFilter.connect(this.thrusterGain);
      this.thrusterToneOsc.connect(this.thrusterGain);
      this.thrusterGain.connect(this.ctx.destination);

      this.thrusterNoiseNode.start();
      this.thrusterToneOsc.start();
    } catch {
      // Ignore
    }
  }

  // Updates reactor hum and moving thruster volume
  public updateImpulseHum(throttle: number, isWarping: boolean) {
    if (!this.impulseGain || !this.impulseOsc1 || !this.ctx || this.isMuted) return;
    const baseFreq = isWarping ? 82 : 44 + (throttle / 100) * 36;
    const volume = isWarping ? 0.055 : 0.025 + (throttle / 100) * 0.025;
    this.impulseOsc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.2);
    if (this.impulseOsc2) {
      this.impulseOsc2.frequency.setTargetAtTime(baseFreq * 2, this.ctx.currentTime, 0.2);
    }
    this.impulseGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.2);

    // Thruster gentle exhaust sound when maneuvering or under throttle
    if (this.thrusterGain && this.thrusterToneOsc && this.thrusterFilter) {
      const isThrusting = throttle > 2 && !isWarping;
      // Gentle, pleasant sound level (0.022 max) so user recognizes motion clearly without loudness
      const targetThrusterVol = isThrusting ? 0.012 + (throttle / 100) * 0.016 : 0.0;
      this.thrusterGain.gain.setTargetAtTime(targetThrusterVol, this.ctx.currentTime, 0.25);
      this.thrusterToneOsc.frequency.setTargetAtTime(58 + (throttle / 100) * 32, this.ctx.currentTime, 0.2);
      this.thrusterFilter.frequency.setTargetAtTime(160 + (throttle / 100) * 140, this.ctx.currentTime, 0.2);
    }
  }

  // --- SPATIALIZED Phaser Beam (Dual Oscillator with 44Hz Nadion Pulse Modulator) ---
  public playPhaserBeam(originPos?: THREE.Vector3 | [number, number, number]) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.42;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(940, t);
    osc1.frequency.exponentialRampToValueAtTime(820, t + dur);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1880, t);
    osc2.frequency.exponentialRampToValueAtTime(1640, t + dur);

    // LFO: 42Hz nadion beam frequency modulation flutter
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(42, t);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(85, t);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1350, t);
    filter.Q.setValueAtTime(3.2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);

    // Route through 3D Spatial Panner
    this.routeAudio(gain, originPos);

    lfo.start(t);
    osc1.start(t);
    osc2.start(t);

    lfo.stop(t + dur);
    osc1.stop(t + dur);
    osc2.stop(t + dur);
  }

  // --- SPATIALIZED Photon Torpedo Launch ---
  public playPhotonTorpedo(launchPos?: THREE.Vector3 | [number, number, number]) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.55;

    // 1. High Plasma Chirp
    const chirpOsc = this.ctx.createOscillator();
    chirpOsc.type = 'sawtooth';
    chirpOsc.frequency.setValueAtTime(1180, t);
    chirpOsc.frequency.exponentialRampToValueAtTime(320, t + dur * 0.85);

    const flutterLfo = this.ctx.createOscillator();
    flutterLfo.type = 'sine';
    flutterLfo.frequency.setValueAtTime(34, t);
    const flutterGain = this.ctx.createGain();
    flutterGain.gain.setValueAtTime(95, t);
    flutterLfo.connect(flutterGain);
    flutterGain.connect(chirpOsc.frequency);

    const chirpFilter = this.ctx.createBiquadFilter();
    chirpFilter.type = 'bandpass';
    chirpFilter.frequency.setValueAtTime(980, t);
    chirpFilter.frequency.exponentialRampToValueAtTime(450, t + dur);
    chirpFilter.Q.setValueAtTime(3.5, t);

    const chirpGain = this.ctx.createGain();
    chirpGain.gain.setValueAtTime(0.20, t);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    chirpOsc.connect(chirpFilter);
    chirpFilter.connect(chirpGain);

    // 2. Heavy Magnetic Launcher Tube Sub-Bass Thump
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(145, t);
    subOsc.frequency.exponentialRampToValueAtTime(38, t + 0.32);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.26, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    subOsc.connect(subGain);

    const masterLaunchGain = this.ctx.createGain();
    chirpGain.connect(masterLaunchGain);
    subGain.connect(masterLaunchGain);

    // Route through 3D Spatial Panner
    this.routeAudio(masterLaunchGain, launchPos);

    flutterLfo.start(t);
    chirpOsc.start(t);
    subOsc.start(t);

    flutterLfo.stop(t + dur);
    chirpOsc.stop(t + dur);
    subOsc.stop(t + 0.32);
  }

  // --- SPATIALIZED Explosion / Torpedo Impact ---
  public playExplosion(pos?: THREE.Vector3 | [number, number, number]) {
    this.playTorpedoImpact(pos);
  }

  public playTorpedoImpact(impactPos?: THREE.Vector3 | [number, number, number]) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Massive Sub-Bass Seismic Thud (antimatter shockwave)
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(90, t);
    subOsc.frequency.exponentialRampToValueAtTime(22, t + 1.05);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.38, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.05);

    subOsc.connect(subGain);
    this.routeAudio(subGain, impactPos);
    subOsc.start(t);
    subOsc.stop(t + 1.05);

    // 2. High-Yield Low-Pass Filtered Noise Explosion
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.95);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.24));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + 0.9);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.32, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

      noise.connect(filter);
      filter.connect(noiseGain);
      this.routeAudio(noiseGain, impactPos);
      noise.start(t);
    } catch {
      // Ignore
    }
  }

  // --- SPATIALIZED Enemy Disruptor Cannon Screech ---
  public playEnemyDisruptor(enemyPos?: THREE.Vector3 | [number, number, number]) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.3;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + dur);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(820, t);
    filter.Q.setValueAtTime(4.2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    this.routeAudio(gain, enemyPos);

    osc.start(t);
    osc.stop(t + dur);
  }

  // --- SPATIALIZED Deflector Shield Deflection Sizzle ---
  public playShieldHit(shieldPos?: THREE.Vector3 | [number, number, number]) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(780, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.32);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(620, t);
    filter.Q.setValueAtTime(4.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.20, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    this.routeAudio(gain, shieldPos);

    osc.start(t);
    osc.stop(t + 0.32);
  }

  // Shield Toggle Up / Down
  public playShieldToggle(raised: boolean) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    if (raised) {
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(840, t + 0.25);
    } else {
      osc.frequency.setValueAtTime(840, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.25);
    }

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Hull Metal Crunch Impact
  public playHullImpact(impactPos?: THREE.Vector3 | [number, number, number]) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    this.routeAudio(gain, impactPos);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  // Incoming Enemy Heavy Torpedo Warning Klaxon
  public playTorpedoIncomingWarning() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [0, 0.18].forEach((offset) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, t + offset);
      osc.frequency.exponentialRampToValueAtTime(440, t + offset + 0.12);

      gain.gain.setValueAtTime(0.18, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t + offset);
      osc.stop(t + offset + 0.14);
    });
  }

  // Cloaking Device Warp Phase Sound
  public playCloakSound(pos?: THREE.Vector3 | [number, number, number]) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.6);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.6);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(filter);
    filter.connect(gain);
    this.routeAudio(gain, pos);

    osc.start(t);
    osc.stop(t + 0.65);
  }

  // Decloaking Sound
  public playDecloakSound(pos?: THREE.Vector3 | [number, number, number]) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.5);

    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(gain);
    this.routeAudio(gain, pos);

    osc.start(t);
    osc.stop(t + 0.55);
  }

  // Heavy Battleship / Mothership Heavy Disruptor Shot
  public playHeavyDisruptor(pos?: THREE.Vector3 | [number, number, number]) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    this.routeAudio(gain, pos);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  // Warp Drive Engagement Sequence
  public playWarpEngage() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 1.1);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 1.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.24, t + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    const boomOsc = this.ctx.createOscillator();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(120, t + 0.95);
    boomOsc.frequency.exponentialRampToValueAtTime(30, t + 1.6);

    const boomGain = this.ctx.createGain();
    boomGain.gain.setValueAtTime(0.0, t);
    boomGain.gain.setValueAtTime(0.3, t + 0.98);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);

    boomOsc.connect(boomGain);
    boomGain.connect(this.ctx.destination);

    osc.start(t);
    boomOsc.start(t);
    osc.stop(t + 1.4);
    boomOsc.stop(t + 1.6);
  }

  // Planetary Collision Heavy Impact
  public playPlanetCollision() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.75);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.75);
  }

  // Authentic Starfleet Red Alert Klaxon
  public startRedAlert() {
    if (this.isRedAlertPlaying || this.isMuted) return;
    this.initCtx();
    this.isRedAlertPlaying = true;
    this.loopRedAlertKlaxon();
  }

  private loopRedAlertKlaxon() {
    if (!this.isRedAlertPlaying || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const cycleDur = 1.1;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(460, t);
    osc.frequency.exponentialRampToValueAtTime(840, t + 0.55);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.setValueAtTime(0.1, t + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.6);

    this.redAlertTimer = window.setTimeout(() => {
      this.loopRedAlertKlaxon();
    }, cycleDur * 1000);
  }

  public stopRedAlert() {
    this.isRedAlertPlaying = false;
    if (this.redAlertTimer !== null) {
      clearTimeout(this.redAlertTimer);
      this.redAlertTimer = null;
    }
  }

  // Incoming Reinforcements Warp Alert
  public playReinforcementsAlert() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [440, 554, 659, 880].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      gain.gain.setValueAtTime(0.12, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.14);
    });
  }

  // Wave Clear Tactical Victory Chime
  public playVictoryChime() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.09);
      gain.gain.setValueAtTime(0.14, t + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.09 + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.09);
      osc.stop(t + idx * 0.09 + 0.22);
    });
  }

  // Evasive Thrusters High-Energy Boost
  public playEvasiveBoost() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.35);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.7);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(2200, t + 0.35);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.7);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.7);
  }

  // Torpedo Lock Achieved Confirmation Tone
  public playTargetLockAchieved() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, t); // High A6
    osc.frequency.setValueAtTime(2200, t + 0.08); // High C#7

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.24);
  }

  // Catastrophic Core Breach / Enterprise Destruction Klaxon Alarm
  public playCoreBreachAlarm() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Two-tone urgent descending klaxon
    for (let i = 0; i < 3; i++) {
      const startT = t + i * 0.45;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, startT);
      osc.frequency.exponentialRampToValueAtTime(140, startT + 0.35);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, startT);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.28, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startT);
      osc.stop(startT + 0.4);
    }
  }

  // Starfleet Promotion Fanfare / Level-Up Chime
  public playPromotionChime() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const noteTime = t + i * 0.12;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.6);
    });
  }
}

export const soundEffects = new StarTrekSoundSystem();
