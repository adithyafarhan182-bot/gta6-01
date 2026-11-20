// SUNSET BAY — the HUD: health, cash, wanted stars, objective and minimap.
// One clear job: read the game state and paint the interface (DOM + a
// small minimap canvas) every frame.

import { WORLD, ROAD_CENTERS } from './config.js';
import { clamp } from './utils.js';

let els = null;
let mapCtx = null;

export function initHud(document) {
  els = {
    healthFill: document.getElementById('health-fill'),
    healthText: document.getElementById('health-text'),
    cash: document.getElementById('cash'),
    stars: document.getElementById('stars'),
    objective: document.getElementById('objective'),
    objectiveText: document.getElementById('objective-text'),
    speed: document.getElementById('speed'),
    message: document.getElementById('message'),
    banner: document.getElementById('banner'),
    bannerTitle: document.getElementById('banner-title'),
    bannerSub: document.getElementById('banner-sub'),
    hint: document.getElementById('hint'),
    map: document.getElementById('minimap'),
  };
  if (els.map) mapCtx = els.map.getContext('2d');
}

export function updateHud(G) {
  if (!els) return;
  const p = G.player;

  const hpPct = clamp((p.hp / p.maxHp) * 100, 0, 100);
  els.healthFill.style.width = hpPct + '%';
  els.healthFill.style.background = hpPct > 50 ? '#3aa655' : hpPct > 25 ? '#e8b73a' : '#c23b2e';
  els.healthText.textContent = Math.ceil(p.hp) + ' HP';
  els.cash.textContent = '$' + G.cash.toLocaleString('en-US');

  // Wanted stars.
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < G.wanted ? '★' : '☆';
  els.stars.textContent = stars;
  els.stars.style.color = G.wanted > 0 ? '#ffd640' : 'rgba(255,255,255,0.4)';

  // Speed.
  if (p.inCar) {
    const mph = Math.round(Math.abs(p.inCar.speed) * 0.12);
    els.speed.textContent = mph + ' mph';
    els.speed.style.display = 'block';
  } else {
    els.speed.style.display = 'none';
  }

  // Mission objective.
  if (G.missionActive && G.mission) {
    const m = G.mission;
    const def = G.__missionDef ? G.__missionDef(m.index) : null;
    const stage = def ? def.stages[m.stage] : null;
    els.objective.style.display = 'block';
    els.objectiveText.textContent = stage ? stage.text : '';
    if (stage && stage.type === 'survive') {
      const left = Math.max(0, Math.ceil(stage.seconds - m.stageT));
      els.objectiveText.textContent = stage.text + ' — ' + left + 's';
    }
    if (stage && stage.type === 'holdout') {
      const left = Math.max(0, Math.ceil(stage.seconds - m.stageT));
      els.objectiveText.textContent = stage.text + ' — ' + left + 's';
    }
  } else {
    els.objective.style.display = G.missionIndex < 6 ? 'block' : 'none';
    els.objectiveText.textContent = G.missionIndex < 6 ? 'Press M for the next job — ' + (G.missionIndex + 1) + ' of 6' : 'The Sunset Job is done. Free roam!';
  }

  // Toast message.
  if (G.messageT > 0 && G.message) {
    els.message.textContent = G.message;
    els.message.style.opacity = '1';
  } else {
    els.message.style.opacity = '0';
  }

  // Big centre banner (mission passed etc).
  if (G.banner && G.banner.t > 0) {
    els.banner.style.display = 'block';
    els.bannerTitle.textContent = G.banner.text;
    els.bannerSub.textContent = G.banner.sub || '';
    els.banner.style.opacity = String(clamp(G.banner.t, 0, 1));
  } else {
    els.banner.style.display = 'none';
  }

  drawMinimap(G);
}

function drawMinimap(G) {
  if (!mapCtx || !els.map) return;
  const S = 180 / WORLD.w;
  mapCtx.clearRect(0, 0, 180, 180);
  // Water and sand.
  mapCtx.fillStyle = '#2b7ba6';
  mapCtx.fillRect(0, 0, 180, 180);
  mapCtx.fillStyle = '#5f9e52';
  mapCtx.fillRect(0, 0, 180, 164);
  mapCtx.fillStyle = '#e6cf96';
  mapCtx.fillRect(0, 162, 180, 10);
  // Roads.
  mapCtx.strokeStyle = '#33373f';
  mapCtx.lineWidth = 3;
  for (const c of ROAD_CENTERS) {
    mapCtx.beginPath();
    mapCtx.moveTo(0, c * S);
    mapCtx.lineTo(180, c * S);
    mapCtx.stroke();
    mapCtx.beginPath();
    mapCtx.moveTo(c * S, 0);
    mapCtx.lineTo(c * S, 180);
    mapCtx.stroke();
  }
  // Buildings.
  mapCtx.fillStyle = 'rgba(40, 36, 32, 0.7)';
  for (const b of G.city.buildings) {
    mapCtx.fillRect(b.x * S, b.y * S, Math.max(2, b.w * S), Math.max(2, b.h * S));
  }
  // Police as red dots.
  for (const car of G.cars) {
    if (car.driver !== 'police') continue;
    mapCtx.fillStyle = '#ff2e2e';
    mapCtx.beginPath();
    mapCtx.arc(car.x * S, car.y * S, 3, 0, Math.PI * 2);
    mapCtx.fill();
  }
  // Mission marker.
  const target = G.__missionTarget ? G.__missionTarget() : null;
  if (target) {
    mapCtx.fillStyle = '#ffd640';
    mapCtx.beginPath();
    mapCtx.arc(target.x * S, target.y * S, 4.5, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.strokeStyle = '#ffd640';
    mapCtx.lineWidth = 1.5;
    mapCtx.beginPath();
    mapCtx.arc(target.x * S, target.y * S, 7 + Math.sin(G.time * 4) * 2, 0, Math.PI * 2);
    mapCtx.stroke();
  }
  // Player arrow (white) and, around it, the direction of travel.
  const p = G.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  const ang = p.inCar ? p.inCar.angle : p.angle;
  mapCtx.save();
  mapCtx.translate(px * S, py * S);
  mapCtx.rotate(ang);
  mapCtx.fillStyle = '#ffffff';
  mapCtx.beginPath();
  mapCtx.moveTo(7, 0);
  mapCtx.lineTo(-5, -4.5);
  mapCtx.lineTo(-5, 4.5);
  mapCtx.closePath();
  mapCtx.fill();
  mapCtx.restore();
  // Viewport box: the 3D camera reports how much world it sees.
  mapCtx.strokeStyle = 'rgba(255,255,255,0.5)';
  mapCtx.lineWidth = 1;
  const vw = (G.view.worldW || G.view.w / G.view.scale) * S;
  const vh = (G.view.worldH || G.view.h / G.view.scale) * S;
  mapCtx.strokeRect(G.camera.x * S - vw / 2, G.camera.y * S - vh / 2, vw, vh);
}

// __REV__
