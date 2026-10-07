// Original procedural audio: no recordings, samples, or external dependencies.
// Call and await start() from a user gesture before requesting sound.
export class CincoAudio {
  constructor() {
    this.context = null;
    this.muted = false;
    this.playing = false;
    this.seated = true;
    this.sequence = 'celery';
    this.intensity = 0.55;
    this.bpm = 116;
    this.beat = 0;
    this._step = 0;
    this._nextNote = 0;
    this._timer = null;
    this._voices = new Set();
    this._ready = false;
    this._destroyed = false;
    this._startPromise = null;
    this._lastBeat = -Infinity;
    this._utterance = null;
    this._speechTimer = null;
    this._ambienceActive = false;
    this._ducked = false;
    this._lastKey = -Infinity;
    this._pageHidden = Boolean(globalThis.document?.hidden);
    this._hide = () => {
      this._pageHidden = true;
      this._pause();
      this.stopEffects();
      this.stopSpeech();
    };
    this._show = () => {
      this._pageHidden = false;
      this._startAmbience();
      if (this.playing) this._begin();
    };
    this._visibility = () => globalThis.document?.hidden ? this._hide() : this._show();
    globalThis.addEventListener?.('pagehide', this._hide);
    globalThis.addEventListener?.('pageshow', this._show);
    globalThis.document?.addEventListener('visibilitychange', this._visibility);
  }

  async start() {
    if (this._destroyed) return false;
    if (this._startPromise) return this._startPromise;
    this._startPromise = this._open();
    try { return await this._startPromise; }
    finally { this._startPromise = null; }
  }

  async _open() {
    try {
      if (!this.context) {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) return false;
        this.context = new AudioContext();
        const ctx = this.context;
        this._master = ctx.createGain();
        this._master.gain.value = this.muted ? 0 : 0.42;
        this._music = ctx.createGain();
        this._music.gain.value = 0.72;
        this._effects = ctx.createGain();
        this._effects.gain.value = 0.7;
        this._room = ctx.createGain();
        this._room.gain.value = 0.6;
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -15;
        compressor.knee.value = 12;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.16;
        this._music.connect(this._master);
        this._effects.connect(this._master);
        this._room.connect(this._master);
        this._master.connect(compressor);
        compressor.connect(ctx.destination);
        this._compressor = compressor;
        this._noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.7), ctx.sampleRate);
        const data = this._noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.context.state !== 'running') await this.context.resume();
      if (this._destroyed || this.context.state !== 'running') return false;
      this._ready = true;
      this._startAmbience();
      if (this.playing) this._begin();
      return true;
    } catch {
      // Browser policy, absent audio devices, and private browsing can disable audio.
      this._ready = false;
      return false;
    }
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this._master && this.context?.state !== 'closed') {
      this._master.gain.setTargetAtTime(this.muted ? 0 : 0.42, this.context.currentTime, 0.018);
    }
    if (this.muted) { this._cancelSpeech(); this._stopAmbience(); }
    else this._startAmbience();
  }

  stopSpeech() { this._cancelSpeech(); }

  // Sitting controls the whole computer, independently of the transport button.
  setSeated(value) {
    if (this._destroyed) return;
    this.seated = Boolean(value);
    if (!this.seated) {
      this._pause();
      this.stopEffects();
      this.stopSpeech();
    } else {
      this._startAmbience();
      if (this.playing) this._begin();
    }
  }

  // Stops even future scheduled effects; does not change the transport setting.
  stopEffects() {
    for (const voice of this._voices) {
      if (voice.channel !== 'music') this._stopVoice(voice);
    }
    this._ambienceActive = false;
  }

  // A dismissed call must also cancel bell strikes queued on the audio clock.
  stopRinging() {
    for (const voice of this._voices) {
      if (voice.channel === 'ring') this._stopVoice(voice);
    }
  }

  _canSound() {
    return this._ready && !this._destroyed && this.seated && !this.muted &&
      !this._pageHidden && this.context?.state === 'running';
  }

  _startAmbience() {
    if (!this._canSound() || this._ambienceActive) return;
    this._ambienceActive = true;
    const ctx = this.context;
    const time = ctx.currentTime;
    // A quiet transformer and filtered fan, intentionally below the music.
    for (const [frequency, volume] of [[59.8, 0.017], [119.7, 0.006]]) {
      const source = ctx.createOscillator();
      const gain = ctx.createGain();
      source.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time);
      gain.gain.setTargetAtTime(volume, time, 0.3);
      source.connect(gain); gain.connect(this._room);
      this._track(source, [source, gain], 'ambient');
      source.start(time);
    }
    const fan = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    fan.buffer = this._noise; fan.loop = true;
    filter.type = 'bandpass'; filter.frequency.value = 480; filter.Q.value = 0.6;
    gain.gain.setValueAtTime(0, time); gain.gain.setTargetAtTime(0.018, time, 0.3);
    fan.connect(filter); filter.connect(gain); gain.connect(this._room);
    this._track(fan, [fan, filter, gain], 'ambient');
    fan.start(time);
  }

  _stopAmbience() {
    for (const voice of this._voices) {
      if (voice.channel === 'ambient') this._stopVoice(voice);
    }
    this._ambienceActive = false;
  }

  setSequence(value) {
    if (Object.hasOwn(SEQUENCES, value)) this.sequence = value;
  }

  setIntensity(value) {
    if (Number.isFinite(value)) this.intensity = Math.max(0, Math.min(1, value));
  }

  setPlaying(value) {
    if (this._destroyed) return;
    const next = Boolean(value);
    if (next === this.playing) return;
    this.playing = next;
    if (next && this._ready) this._begin();
    else if (!next) this._pause();
  }

  _begin() {
    if (this._timer !== null || !this._ready || this._destroyed || !this.seated || this._pageHidden) return;
    this._step = 0;
    this._nextNote = this.context.currentTime + 0.045;
    this._tick();
    // JavaScript only wakes the scheduler; the audio clock determines note timing.
    this._timer = globalThis.setInterval(() => this._tick(), 25);
  }

  _pause() {
    if (this._timer !== null) globalThis.clearInterval(this._timer);
    this._timer = null;
    for (const voice of this._voices) {
      if (voice.channel === 'music') this._stopVoice(voice);
    }
    this._lastBeat = -Infinity;
    this.beat = 0;
  }

  _tick() {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !this.playing || !this.seated || this._pageHidden) return;
    const duration = 60 / this.bpm / 4;
    // Skip missed steps after background throttling instead of bursting queued notes.
    if (this._nextNote < ctx.currentTime - duration) {
      const missed = Math.ceil((ctx.currentTime - this._nextNote) / duration);
      this._step = (this._step + missed) % 32;
      this._nextNote += missed * duration;
    }
    while (this._nextNote < ctx.currentTime + 0.12) {
      this._scheduleStep(this._step, this._nextNote, duration);
      this._nextNote += duration;
      this._step = (this._step + 1) % 32;
    }
  }

  _scheduleStep(step, time, duration) {
    const pattern = SEQUENCES[this.sequence];
    const pos = step % 16;
    const energy = 0.6 + this.intensity * 0.4;
    if (pattern.kicks.includes(pos) || (this.intensity > 0.75 && pos === pattern.extraKick)) {
      this._tone(150, time, 0.21, 0.62 * energy, 'sine', 'music', 43);
      this._lastBeat = time;
      this.beat = (step / 4) | 0;
    }
    if (pos === 4 || pos === 12) {
      this._hiss(time, pattern.snare, 0.14 * energy, 1400, 'highpass', 'music');
      this._tone(175, time, 0.075, 0.11, 'triangle', 'music', 85);
      if (this.sequence === 'tayne') this._hiss(time + 0.018, 0.085, 0.07, 1600, 'bandpass', 'music');
    }
    if (pos % 2 === 0 || (this.intensity > 0.68 && pos % 4 === 3)) {
      this._hiss(time, pos % 4 === 2 ? 0.085 : 0.035, pos % 4 === 2 ? 0.067 : 0.039,
        6900, 'highpass', 'music');
    }
    const bassIndex = pattern.bassSteps.indexOf(pos);
    if (bassIndex !== -1) {
      const midi = pattern.bass[bassIndex] + (step >= 16 ? pattern.turn : 0);
      this._tone(mtof(midi), time, duration * pattern.gate, 0.18 * energy, pattern.bassWave, 'music', null,
        { cutoff: 520 + this.intensity * 1000 });
    }
    const arpIndex = pattern.arpSteps.indexOf(pos);
    if (arpIndex !== -1 && this.intensity > 0.12) {
      const midi = pattern.arp[(arpIndex + (step >= 16 ? 2 : 0)) % pattern.arp.length];
      this._tone(mtof(midi), time, duration * pattern.arpGate, 0.043 + this.intensity * 0.035,
        pattern.wave, 'music', null, { cutoff: 2300 });
      if (this.sequence === 'oyster') this._tone(mtof(midi) * 2, time, 0.045, 0.02, 'sine', 'music');
    }
    if (step === 30 && this.intensity > 0.55) {
      this._tone(mtof(pattern.bass[0] + 12), time, 0.08, 0.065, 'triangle', 'music', mtof(pattern.bass[0]));
    }
  }

  _track(source, nodes, channel) {
    const voice = { source, nodes, channel };
    this._voices.add(voice);
    source.onended = () => {
      this._voices.delete(voice);
      for (const node of nodes) { try { node.disconnect(); } catch {} }
    };
    return voice;
  }

  _stopVoice(voice) {
    try { voice.source.stop(); } catch {}
    for (const node of voice.nodes) { try { node.disconnect(); } catch {} }
    this._voices.delete(voice);
  }

  _tone(frequency, time, duration, volume, type = 'sine', channel = 'fx', endFrequency, options = {}) {
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration * 0.8);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + Math.min(0.008, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    const nodes = [oscillator, gain];
    if (options.cutoff) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = options.cutoff; filter.Q.value = 0.6;
      oscillator.connect(filter); filter.connect(gain); nodes.push(filter);
    } else oscillator.connect(gain);
    gain.connect(channel === 'music' ? this._music : this._effects);
    this._track(oscillator, nodes, channel);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.012);
  }

  _hiss(time, duration, volume, frequency, type = 'highpass', channel = 'fx') {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = this._noise;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(channel === 'music' ? this._music : this._effects);
    this._track(source, [source, filter, gain], channel);
    source.start(time);
    source.stop(time + duration + 0.012);
  }

  fx(kind = 'click') {
    if (!this._canSound()) return false;
    if (kind === 'keyboard' && this.context.currentTime - this._lastKey < 0.032) return false;
    if (kind === 'keyboard') this._lastKey = this.context.currentTime;
    // Keep rapid button mashing bounded without interrupting the music.
    const effects = [...this._voices].filter(voice => voice.channel === 'fx' || voice.channel === 'ring');
    for (const voice of effects.slice(0, Math.max(0, effects.length - 16))) this._stopVoice(voice);
    const time = this.context.currentTime + 0.005;
    switch (kind) {
      case 'boot':
        this._hiss(time, 0.28, 0.14, 1900, 'bandpass');
        this._tone(58, time, 0.45, 0.13, 'triangle', 'fx', 126);
        [60, 67, 72].forEach((note, i) => this._tone(mtof(note), time + 0.16 + i * 0.095, 0.22, 0.14, 'sine'));
        this._seek(time + 0.51, 6);
        break;
      case 'load':
        this._seek(time, 7);
        [55, 67].forEach((note, i) => this._tone(mtof(note), time + 0.3 + i * 0.07, 0.13, 0.14, 'triangle'));
        break;
      case 'seek':
        this._seek(time, 8);
        break;
      case 'keyboard':
        this._hiss(time, 0.024, 0.07, 2100 + Math.random() * 500, 'bandpass');
        this._tone(145 + Math.random() * 35, time, 0.023, 0.07, 'triangle', 'fx', 80);
        break;
      case 'confirm':
      case 'affirmative':
        this._tone(660, time, 0.09, 0.12, 'triangle');
        this._tone(880, time + 0.082, 0.16, 0.12, 'sine');
        break;
      case 'error':
        [0, 0.15].forEach(offset => this._tone(196, time + offset, 0.1, 0.09, 'square', 'fx', 174, { cutoff: 1100 }));
        break;
      case 'dismiss':
        this._tone(540, time, 0.075, 0.13, 'sine', 'fx', 390);
        this._tone(260, time + 0.085, 0.075, 0.1, 'triangle');
        break;
      case 'dimensions':
        [48, 55, 62, 69, 76, 83].forEach((note, i) => {
          this._tone(mtof(note), time + i * 0.063, 0.25, 0.09, 'triangle', 'fx', mtof(note + 3));
          this._tone(mtof(note + 12), time + 0.12 + i * 0.063, 0.18, 0.03, 'sine');
        });
        this._hiss(time, 0.42, 0.05, 3400, 'bandpass');
        break;
      case 'preview':
        this._seek(time, 4);
        [62, 69, 70].forEach((note, i) => this._tone(mtof(note), time + 0.19 + i * 0.13, 0.18, 0.12, 'sine'));
        break;
      case 'hat':
        this._hiss(time, 0.16, 0.2, 7300);
        this._tone(1046.5, time + 0.04, 0.12, 0.12, 'sine');
        break;
      case 'flarhgunnstow':
        [0, 1, 2, 3, 4].forEach(i => this._tone(95 + i * 71, time + i * 0.068, 0.16, 0.12, 'sawtooth', 'fx', 760 - i * 91, { cutoff: 2200 }));
        break;
      case 'nude':
        this._hiss(time, 0.11, 0.09, 2700, 'bandpass');
        [74, 69, 66, 62].forEach((note, i) => this._tone(mtof(note), time + 0.07 + i * 0.09, 0.17, 0.12, 'triangle'));
        this._tone(1000, time + 0.46, 0.14, 0.08, 'sine');
        break;
      case 'print':
        for (let i = 0; i < 12; i++) {
          const at = time + i * 0.056 + (i > 5 ? 0.12 : 0);
          this._hiss(at, 0.025, 0.12, 1500, 'bandpass');
          this._tone(i % 2 ? 240 : 290, at, 0.028, 0.06, 'square', 'fx', null, { cutoff: 1900 });
        }
        this._tone(155, time + 0.82, 0.19, 0.09, 'sawtooth', 'fx', 78, { cutoff: 850 });
        break;
      case 'ring':
      case 'call':
        // Mechanical bell tremolo: two short, cancellable ring bursts.
        this.stopRinging();
        for (let i = 0; i < 12; i++) {
          const offset = (i % 6) * 0.047 + (i >= 6 ? 0.66 : 0);
          this._tone(i % 2 ? 860 : 650, time + offset, 0.09, 0.10, 'sine', 'ring');
          this._tone(i % 2 ? 1720 : 1300, time + offset, 0.04, 0.018, 'triangle', 'ring');
        }
        break;
      default:
        this._tone(900, time, 0.045, 0.15, 'sine', 'fx', 420);
    }
    return true;
  }

  _seek(time, count) {
    for (let i = 0; i < count; i++) {
      const at = time + i * 0.038 + (i % 3 === 2 ? 0.016 : 0);
      this._hiss(at, 0.018, 0.085, i % 2 ? 1750 : 2500, 'bandpass');
      this._tone(i % 2 ? 310 : 230, at, 0.027, 0.055, 'triangle', 'fx', 160);
    }
  }

  speak(text) {
    if (!this._canSound() || typeof text !== 'string' || !text.trim()) return false;
    if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return false;
    try {
      this._cancelSpeech();
      const utterance = new globalThis.SpeechSynthesisUtterance(text.slice(0, 320));
      const voices = globalThis.speechSynthesis.getVoices?.() || [];
      const english = voices.filter(voice => /^en(?:[-_]|$)/i.test(voice.lang));
      // Prefer a generic local English system voice, never an actor or named persona.
      const voice = english.find(voice => voice.localService && voice.default) ||
        english.find(voice => voice.localService) || english.find(voice => voice.default) || english[0];
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || 'en-US';
      utterance.rate = 0.84;
      utterance.pitch = 0.83;
      utterance.volume = 0.65;
      const finished = () => {
        if (this._utterance !== utterance) return;
        this._utterance = null;
        globalThis.clearTimeout(this._speechTimer);
        this._speechTimer = null;
        this._setDucking(false);
      };
      utterance.onstart = () => { if (this._utterance === utterance) this._setDucking(true); };
      utterance.onend = finished;
      utterance.onerror = finished;
      this._utterance = utterance;
      this._setDucking(true);
      // Recover the mix if a browser fails to send a speech completion event.
      this._speechTimer = globalThis.setTimeout(() => {
        if (this._utterance === utterance) this._cancelSpeech();
      }, Math.max(8000, utterance.text.length * 115 + 4000));
      globalThis.speechSynthesis.speak(utterance);
      return true;
    } catch { this._cancelSpeech(); return false; }
  }

  _cancelSpeech() {
    globalThis.clearTimeout(this._speechTimer);
    this._speechTimer = null;
    if (this._utterance) {
      this._utterance = null;
      try { globalThis.speechSynthesis?.cancel(); } catch {}
    }
    this._setDucking(false);
  }

  _setDucking(value) {
    this._ducked = Boolean(value);
    if (!this.context || this.context.state === 'closed') return;
    const time = this.context.currentTime;
    const ease = value ? 0.025 : 0.18;
    this._music?.gain.setTargetAtTime(value ? 0.2 : 0.72, time, ease);
    this._effects?.gain.setTargetAtTime(value ? 0.43 : 0.7, time, ease);
    this._room?.gain.setTargetAtTime(value ? 0.3 : 0.6, time, ease);
  }

  getLevel() {
    if (!this.playing || !this._canSound()) return 0;
    const elapsed = this.context.currentTime - this._lastBeat;
    return elapsed < 0 ? 0.2 : Math.max(0, Math.exp(-elapsed * 9));
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._ready = false;
    this.playing = false;
    this._pause();
    this._cancelSpeech();
    globalThis.removeEventListener?.('pagehide', this._hide);
    globalThis.removeEventListener?.('pageshow', this._show);
    globalThis.document?.removeEventListener('visibilitychange', this._visibility);
    for (const voice of this._voices) this._stopVoice(voice);
    for (const node of [this._music, this._effects, this._room, this._master, this._compressor]) {
      try { node?.disconnect(); } catch {}
    }
    try { this.context?.close()?.catch(() => {}); } catch {}
    this._noise = null;
  }
}

const mtof = midi => 440 * 2 ** ((midi - 69) / 12);
const SEQUENCES = {
  celery: {
    kicks: [0, 4, 8, 12], extraKick: 14, snare: 0.1,
    bassSteps: [0, 2, 6, 8, 10, 14], bass: [36, 36, 43, 39, 36, 43],
    bassWave: 'triangle', gate: 1.35, turn: 0,
    arpSteps: [1, 5, 9, 13], arp: [60, 67, 63, 70, 67, 72], wave: 'triangle', arpGate: 0.72,
  },
  oyster: {
    kicks: [0, 6, 8, 12], extraKick: 11, snare: 0.075,
    bassSteps: [0, 3, 6, 8, 11, 14], bass: [38, 45, 38, 41, 45, 36],
    bassWave: 'sine', gate: 1.65, turn: 0,
    arpSteps: [2, 7, 10, 15], arp: [62, 69, 65, 74, 72, 69], wave: 'sine', arpGate: 1.25,
  },
  tayne: {
    kicks: [0, 4, 8, 10, 12], extraKick: 15, snare: 0.14,
    bassSteps: [0, 2, 3, 6, 8, 10, 11, 14], bass: [33, 33, 40, 43, 33, 45, 40, 43],
    bassWave: 'square', gate: 0.82, turn: 0,
    arpSteps: [1, 3, 7, 9, 11, 15], arp: [69, 72, 76, 79, 76, 72, 81, 76], wave: 'triangle', arpGate: 0.58,
  },
};
