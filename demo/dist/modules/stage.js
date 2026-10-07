import { CLIPS } from './video-assets.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const frameRect = (clip, frame) => ({
  x: frame % clip.columns * clip.frameWidth,
  y: Math.floor(frame / clip.columns) * clip.frameHeight,
  width: clip.frameWidth,
  height: clip.frameHeight,
});
const mediaURL = src => globalThis.__CELERY_MEDIA__?.[src] || new URL(src, document.baseURI).href;

// A tiny, decoded film strip is enough for each identity. Keeping the footage in
// Canvas also lets the OS duplicate windows and put little Tayne on the terminal.
export class DanceStage {
  constructor(canvas, portraitCanvas, onFrame = () => {}) {
    this.canvas = canvas; this.portrait = portraitCanvas; this.onFrame = onFrame;
    this.context = canvas.getContext('2d', {alpha: false});
    if (!this.context) throw new Error('The video display could not initialize.');
    this.time = 0; this.playing = false; this.active = false; this.sequence = 'celery';
    this.motion = 'dance'; this.motionStartedAt = 0; this.intensity = .6;
    this.dimensions = false; this.smiling = false; this.currentCue = null;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.last = performance.now(); this.lastPaint = -Infinity; this.frame = 0; this.destroyed = false;
    this.images = new Map(); this.noise = this.makeNoise();
    this.tick = this.tick.bind(this);
    this.onVisibility = () => {
      this.stopTick();
      if (!document.hidden && this.active) { this.last = performance.now(); this.render(); this.startTick(); }
    };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.observer = new ResizeObserver(() => this.resize());
    if (canvas.parentElement) this.observer.observe(canvas.parentElement);
    this.resize();
    // Eager local decoding avoids a blank first frame when the next command lands.
    for (const clip of Object.values(CLIPS)) if (clip?.src) this.preload(clip);
    this.render();
  }

  preload(clip) {
    if (this.images.has(clip.src)) return this.images.get(clip.src);
    const image = new Image();
    const record = {image, ready: false, error: false};
    record.promise=new Promise(resolve=>{record.resolve=resolve;});
    this.images.set(clip.src, record); image.decoding = 'async';
    image.onload = async () => {
      try { await image.decode(); } catch { /* An already decoded image remains usable. */ }
      if (this.destroyed) {record.resolve(false);return;}
      record.ready = true; this.render();
      record.resolve(true);
      if (this.active) this.onFrame(this.time);
    };
    image.onerror = () => { record.error = true;record.resolve(false);if (!this.destroyed) this.render(); };
    image.src = mediaURL(clip.src);
    return record;
  }

  resize() {
    const parent = this.canvas.parentElement;
    const width = parent ? parent.clientWidth : 360, height = parent ? parent.clientHeight : 470;
    if (width < 2 || height < 2) return;
    // A deliberately small framebuffer keeps the original fuzzy video texture.
    const scale = Math.min(1, 480 / Math.max(width, height));
    this.canvas.width = Math.max(2, Math.round(width * scale));
    this.canvas.height = Math.max(2, Math.round(height * scale));
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'medium';
    this.render();
  }

  bodyClip(sequence = this.sequence, motion = this.motion) {
    if (sequence === 'tayne' && motion !== 'dance' && motion !== 'nude' && CLIPS[motion] && CLIPS[motion].kind !== 'portrait') return CLIPS[motion];
    return CLIPS[sequence] || CLIPS.celery;
  }

  faceClip(sequence = this.sequence, smiling = this.smiling) {
    if (sequence === 'tayne' && this.motion === 'hat' && CLIPS.hat) return {clip: CLIPS.hat, crop: null};
    if (sequence === 'oyster' && smiling && CLIPS.oysterSmile) return {clip: CLIPS.oysterSmile, crop: null};
    const clip = CLIPS[`${sequence}Face`];
    if (clip) return {clip, crop: null};
    const body = this.bodyClip(sequence, 'dance');
    return {clip: body, crop: body?.portrait || null};
  }

  frameIndex(clip, time = this.time, offset = 0) {
    if (!clip || this.reducedMotion || clip.frames < 2) return 0;
    const speed = .82 + this.intensity * .3;
    const cursor = Math.floor(Math.max(0, time + offset) * (clip.fps || 20) * speed);
    if (clip.loop === 'pingpong' || clip.pingpong) {
      const length = clip.frames * 2 - 2, position = cursor % length;
      return position < clip.frames ? position : length - position;
    }
    return cursor % clip.frames;
  }

  drawClip(context, clip, box, {crop = null, time = this.time, offset = 0, opacity = 1, flip = false} = {}) {
    if (!clip?.src) return false;
    const record = this.preload(clip);
    if (!record.ready) return false;
    const source = frameRect(clip, this.frameIndex(clip, time, offset));
    if (crop) {
      source.x += crop.x; source.y += crop.y;
      source.width = crop.width; source.height = crop.height;
    }
    const scale = Math.min(box.width / source.width, box.height / source.height);
    const width = source.width * scale, height = source.height * scale;
    context.save(); context.globalAlpha = opacity; context.imageSmoothingEnabled = true;
    context.translate(box.x + box.width / 2, box.y + box.height / 2);
    if (flip) context.scale(-1, 1);
    context.drawImage(record.image, source.x, source.y, source.width, source.height, -width / 2, -height / 2, width, height);
    context.restore();
    return true;
  }

  makeNoise() {
    const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96;
    const context = canvas.getContext('2d'), pixels = context.createImageData(96, 96);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value = Math.floor(Math.random() * 255);
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0); return canvas;
  }

  texture(context, width, height) {
    context.save();
    // The source supplies the softness. This only adds a faint, quiet video grain.
    context.globalAlpha = .017;
    const shift = this.reducedMotion ? 0 : Math.floor(this.time * 12) % 24;
    context.fillStyle = context.createPattern(this.noise, 'repeat');
    context.translate(-shift, -shift); context.fillRect(0, 0, width + 24, height + 24);
    context.restore();
  }

  waiting(context, width, height, clip) {
    const error = clip?.src && this.images.get(clip.src)?.error;
    context.save(); context.fillStyle = '#666'; context.textAlign = 'center';
    context.font = `${Math.max(9, Math.min(12, width / 23))}px monospace`;
    context.fillText(error ? 'SIGNAL UNAVAILABLE' : 'ACQUIRING VIDEO…', width / 2, height / 2);
    context.restore();
  }

  paintBody(context, width, height, {sequence = this.sequence, motion = this.motion, transparent = false} = {}) {
    context.clearRect(0, 0, width, height);
    if (!transparent) { context.fillStyle = '#eeeFEB'; context.fillRect(0, 0, width, height); }
    const clip = this.bodyClip(sequence, motion);
    const box = {x: width * .045, y: height * .035, width: width * .91, height: height * .93};
    if(transparent&&clip){
      box.height=Math.min(height*.85,box.width*clip.frameHeight/clip.frameWidth);
      box.y=height*(183/210)-box.height;
    }
    if (this.dimensions && !transparent && motion !== 'nude') {
      this.drawClip(context, clip, {...box, x: box.x - width * .12}, {opacity: .12, offset: -.16, flip: true});
      this.drawClip(context, clip, {...box, x: box.x + width * .12}, {opacity: .12, offset: -.32});
    }
    const ready = this.drawClip(context, clip, box, {time: motion === 'dance' ? this.time : Math.max(0, this.time - this.motionStartedAt)});
    if (!ready && !transparent) this.waiting(context, width, height, clip);
    if (motion === 'nude' && !transparent) {
      // The original joke is a blocked preview. Keep the actual performer clothed.
      context.fillStyle = '#090909'; context.fillRect(width * .2, height * .38, width * .6, height * .28);
      context.fillStyle = '#fff'; context.textAlign = 'center';
      context.font = `bold ${Math.max(15, width * .075)}px monospace`;
      context.fillText('NSFW', width / 2, height * .535);
    }
    if (!transparent) this.texture(context, width, height);
  }

  paintPortrait(context, width, height, sequence = this.sequence, smiling = this.smiling) {
    context.fillStyle = sequence === 'oyster' ? '#d9cc7f' : '#d17bb7';
    context.fillRect(0, 0, width, height);
    const {clip, crop} = this.faceClip(sequence, smiling);
    if (!this.drawClip(context, clip, {x: 0, y: 0, width, height}, {crop})) this.waiting(context, width, height, clip);
    this.texture(context, width, height);
  }

  render() {
    if (this.destroyed || !this.context) return;
    this.paintBody(this.context, this.canvas.width, this.canvas.height);
    if (this.portrait) {
      const context = this.portrait.getContext('2d');
      if (context) this.paintPortrait(context, this.portrait.width, this.portrait.height);
    }
    if (this.currentCue && !this.reducedMotion) {
      const age = (performance.now() - this.currentCue.startedAt) / 1000;
      if (age < this.currentCue.duration) {
        const {width, height} = this.canvas;
        this.context.save(); this.context.fillStyle = `rgba(255,255,255,${.22 * (1 - age / this.currentCue.duration)})`;
        this.context.fillRect(0, height * ((age * 5) % 1), width, Math.max(2, height * .026)); this.context.restore();
      } else this.currentCue = null;
    }
  }

  startTick() {
    if (!this.frame && !this.destroyed && this.active && !document.hidden && (this.playing || this.currentCue)) {
      this.last = performance.now(); this.frame = requestAnimationFrame(this.tick);
    }
  }
  stopTick() { if (this.frame) cancelAnimationFrame(this.frame); this.frame = 0; }
  tick(now) {
    this.frame = 0;
    if (this.destroyed || document.hidden || !this.active) return;
    const dt = Math.min((now - this.last) / 1000, .1); this.last = now;
    if (this.playing) this.time += dt;
    if (now - this.lastPaint >= (this.reducedMotion ? 1000 : 1000 / 24)) {
      this.lastPaint = now; this.render(); this.onFrame(this.time);
    }
    if (this.playing || this.currentCue) this.frame = requestAnimationFrame(this.tick);
  }

  setActive(value) {
    this.active = Boolean(value); this.stopTick();
    if (this.active) { this.render(); this.onFrame(this.time); this.startTick(); }
  }
  setPlaying(value) {
    this.playing = Boolean(value);
    if (this.playing) this.startTick();
    else { this.stopTick(); this.render(); if (this.currentCue) this.startTick(); }
  }
  setSequence(name) {
    this.sequence = ['celery', 'oyster', 'tayne'].includes(name) ? name : 'celery';
    this.motion = 'dance'; this.time = 0; this.motionStartedAt = 0; this.smiling = false;
    this.render(); if (this.active) this.onFrame(this.time);
  }
  setMotion(name) {
    this.motion = ['dance', 'hat', 'flarhgunnstow', 'nude'].includes(name) ? name : 'dance';
    this.motionStartedAt = this.time; this.render(); if (this.active) this.onFrame(this.time);
  }
  setIntensity(value) { if (Number.isFinite(value)) this.intensity = clamp(value, 0, 1); }
  setDimensions(value) { this.dimensions = Boolean(value); this.render();if(this.active)this.onFrame(this.time); }
  setSmile(value) { this.smiling = Boolean(value); this.render();if(this.active)this.onFrame(this.time); }
  cue(kind) {
    const durations = {load: .32, dimensions: .38, hat: .18, flarhgunnstow: .28, print: .22, nude: .3};
    if (!(kind in durations) || this.reducedMotion) return;
    this.currentCue = {kind, startedAt: performance.now(), duration: durations[kind]};
    this.render(); this.startTick();
  }
  snapshot() { this.render(); return this.canvas.toDataURL('image/png'); }
  readyForPrint(){const clip=this.faceClip('oyster',true).clip;return clip?this.preload(clip).promise:Promise.resolve(false);}

  printOyster() {
    const copy = document.createElement('canvas'); copy.width = 640; copy.height = 720;
    const context = copy.getContext('2d'); context.fillStyle = '#efeadb'; context.fillRect(0, 0, 640, 720);
    context.save(); context.translate(20, 20); this.paintPortrait(context, 600, 600, 'oyster', true); context.restore();
    context.fillStyle = '#151515'; context.textAlign = 'center'; context.font = 'bold 26px monospace';
    context.fillText('OYSTER SMILING', 320, 663); context.font = '13px monospace';
    context.fillText('CINCO IDENTITY GENERATOR 2.5', 320, 695);
    return copy.toDataURL('image/png');
  }

  drawMini(canvas) {
    if (!canvas || canvas.width < 1 || canvas.height < 1) return;
    const context = canvas.getContext('2d');
    if (context) this.paintBody(context, canvas.width, canvas.height, {sequence: 'tayne', motion: 'flarhgunnstow', transparent: true});
  }

  destroy() {
    this.destroyed = true; this.stopTick(); this.observer.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    for (const record of this.images.values()) { record.resolve(false);record.image.onload = null; record.image.onerror = null; }
    this.images.clear();
  }
}
