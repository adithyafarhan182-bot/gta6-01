// SUNSET BAY — the game itself: state, loop, menus and wiring.
// One clear job: own the game state object, run the frame loop, switch
// between menu / playing / paused / busted / wasted / finale, and hand
// every system the state it needs.

import { TUNE, PLACES, WORLD } from './config.js';
import { buildCity } from './city.js';
import { createInput } from './input.js';
import { createPlayer, updatePlayer } from './player.js';
import { maintainTraffic, updateCars, spawnPolice, createCar } from './vehicles.js';
import { maintainPeds, updatePeds } from './pedestrians.js';
import { updateBullets, updateWanted } from './combat.js';
import { MISSIONS, currentMission, startMission, updateMissions, missionTarget } from './missions.js';
import { render } from './render.js';
import { initHud, updateHud } from './hud.js';
import { initAudio, startMusic, setEngine, setMuted } from './audio.js';
import { hasSave, saveGame, loadGame } from './save.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export function createGame() {
  const city = buildCity();
  const params = new URLSearchParams(window.location.search);
  const G = {
    city,
    player: createPlayer(PLACES.safehouse.x, PLACES.safehouse.y),
    cars: [],
    peds: [],
    bullets: [],
    particles: [],
    skids: [],
    cash: 150,
    totalEarned: 0,
    bestCash: 150,
    wanted: 0,
    wantedTimer: 0,
    missionIndex: 0,
    completedMissions: [],
    missionActive: false,
    mission: null,
    mode: 'menu',
    modeT: 0,
    time: 0,
    message: '',
    messageT: 0,
    banner: null,
    bustedT: 0,
    ammoRefilled: false,
    saveT: 0,
    camera: { x: PLACES.safehouse.x, y: PLACES.safehouse.y },
    view: { w: window.innerWidth, h: window.innerHeight, scale: 1 },
    input: createInput(canvas),
    ctx,
    params,
  };
  G.__missionTarget = () => missionTarget(G);
  G.__missionDef = (i) => MISSIONS[i];

  // A few parked cars and a starter sedan near the safehouse.
  const starter = createCar(PLACES.safehouse.x + 120, PLACES.safehouse.y + 40, 0, 'sedan', '#2e6fc2');
  starter.driver = 'parked';
  G.cars.push(starter);

  // Restore a save, if the player asked for it from the menu.
  const saved = loadGame();
  if (saved) {
    G.savedData = saved;
  }
  return G;
}

function applySave(G) {
  const s = G.savedData;
  if (!s) return;
  G.cash = s.cash;
  G.totalEarned = s.totalEarned || 0;
  G.bestCash = s.bestCash || s.cash;
  G.missionIndex = s.missionIndex || 0;
  G.completedMissions = s.completed || [];
  G.player.x = s.player.x;
  G.player.y = s.player.y;
  G.player.hp = s.player.hp;
  G.camera.x = s.player.x;
  G.camera.y = s.player.y;
}

function resize(G) {
  G.view.w = window.innerWidth;
  G.view.h = window.innerHeight;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function computeScale(G) {
  const base = Math.min(G.view.w / 1150, G.view.h / 780);
  const driving = G.player.inCar ? 0.88 : 1;
  const speedZoom = G.player.inCar ? Math.max(0.82, 1 - Math.abs(G.player.inCar.speed) / 4000) : 1;
  return Math.max(0.6, Math.min(1.25, base * driving * speedZoom));
}

function updateCamera(G, dt) {
  const p = G.player;
  const tx = p.inCar ? p.inCar.x : p.x;
  const ty = p.inCar ? p.inCar.y : p.y;
  const k = Math.min(1, dt * 5);
  G.camera.x += (tx - G.camera.x) * k;
  G.camera.y += (ty - G.camera.y) * k;
  G.view.scale = computeScale(G);
  // Keep the view inside the world so no black band shows at the edges.
  const halfW = G.view.w / (2 * G.view.scale);
  const halfH = G.view.h / (2 * G.view.scale);
  G.camera.x = Math.max(halfW, Math.min(WORLD.w - halfW, G.camera.x));
  G.camera.y = Math.max(halfH, Math.min(WORLD.h - halfH, G.camera.y));
}

function updateParticles(G, dt) {
  for (const pt of G.particles) {
    pt.life -= dt;
    if (pt.vx) pt.x += pt.vx * dt;
    if (pt.vy) pt.y += pt.vy * dt;
  }
  G.particles = G.particles.filter((pt) => pt.life > 0);
  for (const s of G.skids) s.life -= dt;
  G.skids = G.skids.filter((s) => s.life > 0);
}

function paySprayCheck(G) {
  const p = G.player;
  if (!p.inCar || G.wanted === 0) return;
  const d = Math.hypot(p.inCar.x - PLACES.garage.x, p.inCar.y - PLACES.garage.y);
  if (d < 80) {
    if (G.cash >= TUNE.paySprayCost) {
      G.cash -= TUNE.paySprayCost;
      G.wanted = 0;
      G.message = "Lou's spray job — clean plates, heat's off. -$200";
      G.messageT = 3;
    } else {
      G.message = "Lou's Pay 'n Spray: $200 to lose the heat. You're short.";
      G.messageT = 2;
    }
  }
}

function safehouseCheck(G) {
  const p = G.player;
  if (p.inCar) return;
  const d = Math.hypot(p.x - PLACES.safehouse.x, p.y - PLACES.safehouse.y);
  if (d < 100 && p.ammo < 12 && !G.ammoRefilled) {
    G.ammoRefilled = true;
    p.ammo = 24;
    G.message = 'Ammo crate at the safehouse — restocked to 24 rounds.';
    G.messageT = 2.5;
  } else if (d > 160) {
    G.ammoRefilled = false;
  }
}

function respawn(G, place, fee, label) {
  const p = G.player;
  p.inCar = null;
  p.x = place.x;
  p.y = place.y;
  p.hp = p.maxHp;
  p.ammo = Math.max(p.ammo, 12);
  G.cash = Math.max(0, G.cash - fee);
  G.wanted = 0;
  G.bullets = [];
  G.mode = 'playing';
  G.modeT = 0;
  G.camera.x = p.x;
  G.camera.y = p.y;
  G.message = label + ' -$' + fee;
  G.messageT = 3;
  saveGame(G);
}

function updatePlaying(G, dt) {
  const input = G.input;

  if (input.wasPressed('Escape')) {
    G.mode = 'paused';
    G.modeT = 0;
    showMenu('pause');
    return;
  }
  if (input.wasPressed('m') && !G.missionActive && G.missionIndex < MISSIONS.length) {
    startMission(G, G.missionIndex);
  }
  if (input.wasPressed('n')) {
    G.muted = !G.muted;
    setMuted(G.muted);
  }

  updatePlayer(G, dt);
  updateCars(G, dt);
  maintainTraffic(G, dt);
  updatePeds(G, dt);
  maintainPeds(G, dt);
  updateBullets(G, dt);
  updateMissions(G, dt);
  updateWanted(G, dt);
  spawnPolice(G);
  updateParticles(G, dt);
  paySprayCheck(G);
  safehouseCheck(G);

  // Engine hum follows the car.
  setEngine(G.player.inCar ? Math.abs(G.player.inCar.speed) / TUNE.carMaxSpeed : 0);

  // Timers.
  if (G.messageT > 0) G.messageT -= dt;
  if (G.banner) {
    G.banner.t -= dt;
    if (G.banner.t <= 0) G.banner = null;
  }

  // Autosave every 30 seconds of play.
  G.saveT += dt;
  if (G.saveT > 30) {
    G.saveT = 0;
    saveGame(G);
  }

  updateCamera(G, dt);
}

function updateAmbient(G, dt) {
  // Behind the menus the city stays alive: traffic and pedestrians only.
  updateCars(G, dt);
  maintainTraffic(G, dt);
  updatePeds(G, dt);
  maintainPeds(G, dt);
  updateParticles(G, dt);
  G.camera.x += (1600 - G.camera.x) * Math.min(1, dt * 0.25);
  G.camera.y += (1600 - G.camera.y) * Math.min(1, dt * 0.25);
  G.view.scale = Math.max(0.6, Math.min(1.25, Math.min(G.view.w / 1150, G.view.h / 780) * 0.62));
}

function showMenu(name) {
  for (const id of ['menu-start', 'menu-pause', 'menu-end']) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  if (!name) return;
  const el = document.getElementById('menu-' + name);
  if (el) el.style.display = 'flex';
}

function showEnd(G, title, sub) {
  document.getElementById('end-title').textContent = title;
  document.getElementById('end-sub').textContent = sub;
  showMenu('end');
}

function startPlaying(G, fromSave) {
  initAudio();
  startMusic();
  if (fromSave) applySave(G);
  G.mode = 'playing';
  G.modeT = 0;
  showMenu(null);
}

function bindMenus(G) {
  const startBtn = document.getElementById('btn-start');
  const contBtn = document.getElementById('btn-continue');
  const resumeBtn = document.getElementById('btn-resume');
  const restartBtn = document.getElementById('btn-restart');
  const endBtn = document.getElementById('btn-end');
  const quitBtn = document.getElementById('btn-quit');
  if (startBtn) startBtn.addEventListener('click', () => startPlaying(G, false));
  if (contBtn) {
    contBtn.style.display = hasSave() ? 'inline-block' : 'none';
    contBtn.addEventListener('click', () => startPlaying(G, true));
  }
  if (resumeBtn) resumeBtn.addEventListener('click', () => {
    G.mode = 'playing';
    showMenu(null);
  });
  if (restartBtn) restartBtn.addEventListener('click', () => {
    const fresh = createGame();
    Object.assign(G, fresh);
    startPlaying(G, false);
  });
  if (endBtn) endBtn.addEventListener('click', () => {
    if (G.mode === 'finale') {
      G.mode = 'playing';
      G.modeT = 0;
      showMenu(null);
      return;
    }
    respawn(G, G.mode === 'busted' ? PLACES.policeStation : PLACES.hospital, G.mode === 'busted' ? TUNE.bustFee : TUNE.hospitalFee, G.mode === 'busted' ? 'Busted — Bay PD let you off' : 'Patched up at Sunset General');
  });
  if (quitBtn) quitBtn.addEventListener('click', () => {
    saveGame(G);
    G.mode = 'menu';
    showMenu('start');
  });
  document.getElementById('btn-sound').addEventListener('click', () => {
    initAudio();
    G.muted = !G.muted;
    setMuted(G.muted);
  });
}

function frame(G, last) {
  const now = performance.now();
  let dt = Math.min(0.05, (now - last) / 1000);
  G.time += dt;

  if (G.mode === 'playing') {
    updatePlaying(G, dt);
  } else if (G.mode === 'menu') {
    updateAmbient(G, dt);
  } else if (G.mode === 'paused') {
    // Frozen world behind the pause menu.
  } else if (G.mode === 'busted' || G.mode === 'wasted') {
    G.modeT += dt;
    if (G.modeT > 1.4 && document.getElementById('menu-end').style.display !== 'flex') {
      if (G.mode === 'busted') showEnd(G, 'BUSTED', 'Bay PD caught up with you. The crew posts your bail — for a price.');
      else showEnd(G, 'WASTED', 'Sunset Bay chewed you up. The hospital patches you up — for a price.');
    }
  } else if (G.mode === 'finale') {
    G.modeT += dt;
    if (G.modeT > 1.2 && document.getElementById('menu-end').style.display !== 'flex') {
      showEnd(G, 'THE SUNSET JOB — COMPLETE', 'The boat pulls away as the sun drops into the bay. Riko Vale is free — $' + G.totalEarned.toLocaleString('en-US') + ' richer. Free roam, or start a new game.');
    }
  }

  render(G);
  updateHud(G);
  G.input.endFrame();
  requestAnimationFrame(() => frame(G, now));
}

function main() {
  const G = createGame();
  resize(G);
  window.addEventListener('resize', () => resize(G));
  initHud(document);
  bindMenus(G);
  window.SUNSETBAY = G;

  const shot = G.params.get('shot');
  if (shot) {
    // Staged screenshot: skip the menu, pose the scene, warm it up.
    stageShot(G, shot);
    G.mode = 'playing';
    showMenu(null);
    const warmup = G.shotWarmup || 150;
    for (let i = 0; i < warmup; i++) {
      updatePlaying(G, 1 / 30);
      G.input.endFrame();
    }
    // Keys staged for the shot (e.g. holding W) start only after warm-up,
    // so the car is still near its posed spot when the camera fires.
    for (const k of G.shotKeys || []) G.input.keys.add(k);
    // The warm-up bleeds the car's speed to zero; restore the staged speed
    // so the shot reads as a chase, not a parking lot.
    if (G.player.inCar && G.shotSpeed) G.player.inCar.speed = G.shotSpeed;
    // Keep the staged message on screen (its timer was set to 99 on purpose).
  } else {
    showMenu('start');
  }
  requestAnimationFrame((t) => frame(G, t));
}

main();

// Reset a run to the start screen without reloading the page
// (used by the pause menu's Restart button through createGame).
export function resetRun(G) {
  const fresh = createGame();
  Object.assign(G, fresh);
  G.mode = 'menu';
  showMenu('start');
}
