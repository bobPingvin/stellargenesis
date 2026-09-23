/**
 * Web Audio Synthesizer for Stellar Soundscapes
 * Simulates radio pulsar pulses, supernova rumbles, and mass injection hums.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (!val && this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  /**
   * Supernova massive explosion sound: low frequency sweep + filtered noise
   */
  public playSupernova() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 1.8);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 2.0);
  }

  /**
   * Pulsar radio chirp/pulse
   */
  public playPulsarChirp(rate: number) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 + rate * 300, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * Black hole matter/energy injection sound: deep resonant cosmic bass pulse
   */
  public playBlackHoleFeed() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscSub = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.18);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.5);

    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(42, t);
    oscSub.frequency.exponentialRampToValueAtTime(22, t + 0.6);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(gain);
    oscSub.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    oscSub.start(t);
    osc.stop(t + 0.65);
    oscSub.stop(t + 0.65);
  }

  /**
   * Mass pump injection beam hum
   */
  public playMassPump() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(320, t + 0.08);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * Object spawn click sound
   */
  public playSpawn() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Rewind / Undo sound (descending chirp)
   */
  public playUndo() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + 0.14);

    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  /**
   * Redo sound (ascending chirp)
   */
  public playRedo() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.14);

    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  /**
   * Tidal disruption event (TDE) deep gravitational sub-bass & relativistic shredding
   */
  public playTidalDisruption() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 1.2);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 1.3);
  }

  /**
   * Tractor beam / body drag hum
   */
  public playObjectMove() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.08);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Nebula birth / stellar nursery generation sound (atmospheric harmonic chord)
   */
  public playNebulaBirth() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [196, 246.94, 293.66, 392]; // G major chord

    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, t + 1.6);

      const maxGain = 0.05 / (idx + 1);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(maxGain, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 1.8);
    });
  }
}

export const sound = new SoundEngine();
