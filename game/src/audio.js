// Nightshade — small procedural WebAudio synth: footsteps, pickups, alarms.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ambientOn = false;
  }

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    } catch (e) { this.ctx = null; }
  }

  unlock() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(vol || 0.08, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) { /* audio is decoration; never break the game */ }
  }

  footstep(sneak) {
    this.tone(sneak ? 130 : 95, 0.07, 'triangle', sneak ? 0.015 : 0.035);
  }

  pickup() {
    this.tone(660, 0.12, 'sine', 0.09);
    setTimeout(() => this.tone(990, 0.18, 'sine', 0.09), 70);
  }

  alarm() {
    this.tone(520, 0.22, 'sawtooth', 0.05, 780);
    setTimeout(() => this.tone(780, 0.22, 'sawtooth', 0.05, 520), 180);
  }

  caught() {
    this.tone(220, 0.5, 'sawtooth', 0.07, 70);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'sine', 0.08), i * 110));
  }

  click() {
    this.tone(440, 0.06, 'square', 0.04);
  }
}
