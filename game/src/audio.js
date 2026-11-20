// SUNSET BAY — all sound, synthesized live with WebAudio.
// One clear job: effects and a small synthwave loop, no audio files at all.

let ctx = null;
let master = null;
let engineOsc = null;
let engineGain = null;
let musicTimer = null;
let musicStep = 0;
let muted = false;

// Must be called from a user gesture at least once.
export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    // Engine hum: a low sawtooth whose pitch follows the car's speed.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  } catch (err) {
    ctx = null;
  }
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}

export function setEngine(speedRatio) {
  if (!ctx || !engineOsc) return;
  engineOsc.frequency.value = 50 + speedRatio * 140;
  engineGain.gain.value = speedRatio > 0.03 ? 0.05 + speedRatio * 0.05 : 0;
}

function blip(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseBurst(dur, vol, lowpass) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = vol || 0.3;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass || 3000;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t);
}

export function sfxShot() {
  noiseBurst(0.12, 0.35, 2200);
  blip(160, 0.08, 'square', 0.15, 60);
}

export function sfxPunch() {
  noiseBurst(0.08, 0.25, 900);
}

export function sfxPickup() {
  blip(660, 0.09, 'sine', 0.22);
  setTimeout(() => blip(990, 0.12, 'sine', 0.2), 70);
}

export function sfxCrash() {
  noiseBurst(0.25, 0.4, 700);
}

export function sfxSiren(on) {
  // Sirens are drawn from the police cars themselves; this is the wail sting.
  if (!ctx || muted || !on) return;
  blip(700, 0.35, 'sine', 0.08, 1050);
  setTimeout(() => blip(1050, 0.35, 'sine', 0.08, 700), 350);
}

export function sfxMissionPass() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => setTimeout(() => blip(n, 0.22, 'triangle', 0.25), i * 110));
}

export function sfxBusted() {
  blip(392, 0.3, 'sawtooth', 0.2, 196);
  setTimeout(() => blip(311, 0.5, 'sawtooth', 0.2, 155), 280);
}

export function sfxClick() {
  blip(880, 0.05, 'sine', 0.15);
}

// A lazy synthwave bassline + pad, one bar at a time, Am – F – C – G.
const BASS = [55, 55, 55, 65.4, 43.65, 43.65, 49, 49];
export function startMusic() {
  if (!ctx || musicTimer) return;
  musicTimer = setInterval(() => {
    if (muted || !ctx) return;
    const root = BASS[musicStep % BASS.length];
    blip(root, 0.42, 'triangle', 0.16);
    if (musicStep % 4 === 0) blip(root * 4, 0.5, 'sine', 0.05);
    musicStep++;
  }, 430);
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

export function sfxDoor() {
  noiseBurst(0.07, 0.2, 1200);
  blip(220, 0.06, 'square', 0.1, 180);
}
