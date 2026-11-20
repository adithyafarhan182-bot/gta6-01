// SUNSET BAY — everything you see: the city, the cars, the people.
// One clear job: draw the world from the camera, in golden-hour light.

import { WORLD, ROAD_CENTERS, ROAD_W, PALETTE } from './config.js';
import { clamp } from './utils.js';

export function render(G) {
  const ctx = G.ctx;
  const view = G.view;
  const cam = G.camera;
  const scale = view.scale;

  ctx.save();
  ctx.fillStyle = '#101018';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.translate(view.w / 2, view.h / 2);
  ctx.scale(scale, scale);
  ctx.translate(-cam.x, -cam.y);

  drawGround(G, ctx);
  drawSkids(G, ctx);
  drawBuildings(G, ctx);
  drawTrees(G, ctx);
  drawMissionMarker(G, ctx);
  drawCars(G, ctx);
  drawPeds(G, ctx);
  drawPlayer(G, ctx);
  drawBullets(G, ctx);
  drawParticles(G, ctx);

  ctx.restore();

  // Golden-hour wash and vignette, in screen space.
  const grad = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.35, view.w / 2, view.h / 2, view.h * 0.85);
  grad.addColorStop(0, 'rgba(255, 170, 80, 0.05)');
  grad.addColorStop(1, 'rgba(20, 10, 40, 0.28)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, view.w, view.h);
}

function drawGround(G, ctx) {
  // Base grass.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  // Beach sand along the south edge, water beyond it.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, 2880, WORLD.w, 200);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(0, 3060, WORLD.w, 140);
  ctx.fillStyle = PALETTE.waterDeep;
  ctx.fillRect(0, 3120, WORLD.w, 80);
  // Gentle wave lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = 3075 + i * 22 + Math.sin(G.time * 0.8 + i * 1.7) * 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= WORLD.w; x += 160) {
      ctx.lineTo(x, y + Math.sin(x * 0.01 + G.time + i) * 4);
    }
    ctx.stroke();
  }

  // Marina water on the east edge.
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(3040, 1600, 160, 900);

  // Roads: asphalt bands with centre dashes.
  ctx.fillStyle = PALETTE.asphalt;
  for (const c of ROAD_CENTERS) {
    ctx.fillRect(0, c - ROAD_W / 2, WORLD.w, ROAD_W);
    ctx.fillRect(c - ROAD_W / 2, 0, ROAD_W, WORLD.h);
  }
  ctx.strokeStyle = PALETTE.roadLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  for (const c of ROAD_CENTERS) {
    ctx.beginPath();
    ctx.moveTo(0, c);
    ctx.lineTo(WORLD.w, c);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c, 0);
    ctx.lineTo(c, WORLD.h);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Sidewalk edges along every road: two pale lines flanking each road.
  ctx.strokeStyle = PALETTE.sidewalk;
  ctx.lineWidth = 5;
  for (const c of ROAD_CENTERS) {
    ctx.beginPath();
    ctx.moveTo(0, c - ROAD_W / 2 - 5);
    ctx.lineTo(WORLD.w, c - ROAD_W / 2 - 5);
    ctx.moveTo(0, c + ROAD_W / 2 + 5);
    ctx.lineTo(WORLD.w, c + ROAD_W / 2 + 5);
    ctx.moveTo(c - ROAD_W / 2 - 5, 0);
    ctx.lineTo(c - ROAD_W / 2 - 5, WORLD.h);
    ctx.moveTo(c + ROAD_W / 2 + 5, 0);
    ctx.lineTo(c + ROAD_W / 2 + 5, WORLD.h);
    ctx.stroke();
  }

  // Palm Park: darker green block with paths.
  ctx.fillStyle = PALETTE.grassDark;
  ctx.fillRect(1040, 1840, 320, 320);
  ctx.strokeStyle = PALETTE.parkPath;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(1040, 2000);
  ctx.lineTo(1360, 2000);
  ctx.moveTo(1200, 1840);
  ctx.lineTo(1200, 2160);
  ctx.stroke();

  // Pier planks into the water.
  ctx.fillStyle = PALETTE.pierWood;
  ctx.fillRect(1560, 2920, 80, 240);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  for (let y = 2940; y < 3160; y += 24) {
    ctx.beginPath();
    ctx.moveTo(1560, y);
    ctx.lineTo(1640, y);
    ctx.stroke();
  }
  // Marina docks.
  for (const d of G.city.docks) {
    ctx.fillStyle = PALETTE.pierWood;
    ctx.fillRect(d.x, d.y, d.w, d.h);
  }
}

function drawSkids(G, ctx) {
  ctx.strokeStyle = 'rgba(15, 15, 18, 0.35)';
  ctx.lineWidth = 5;
  for (const s of G.skids) {
    ctx.beginPath();
    ctx.moveTo(s.x - Math.cos(s.angle) * 14, s.y - Math.sin(s.angle) * 14);
    ctx.lineTo(s.x + Math.cos(s.angle) * 14, s.y + Math.sin(s.angle) * 14);
    ctx.stroke();
  }
}

function drawBuildings(G, ctx) {
  for (const b of G.city.buildings) {
    // Drop shadow for height.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(b.x + 5 + b.height, b.y + 6 + b.height, b.w, b.h);
    // Roof.
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = PALETTE.buildingEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    // Roof details: parapet line and vents.
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    const nx = Math.max(1, Math.floor(b.w / 70));
    const ny = Math.max(1, Math.floor(b.h / 70));
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        ctx.fillRect(b.x + 24 + i * 70, b.y + 24 + j * 70, 14, 10);
      }
    }
    // Downtown towers get a lit edge.
    if (b.zone === 'downtown') {
      ctx.fillStyle = 'rgba(255, 220, 140, 0.5)';
      ctx.fillRect(b.x + b.w - 8, b.y + 8, 4, b.h - 16);
    }
  }
}

function drawTrees(G, ctx) {
  for (const t of G.city.trees) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(t.x + 4, t.y + 5, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    if (t.palm) {
      ctx.strokeStyle = '#7a5a34';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y + 8);
      ctx.lineTo(t.x, t.y - 4);
      ctx.stroke();
      ctx.fillStyle = '#3f8f3a';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.ellipse(t.x + Math.cos(a) * 10, t.y - 4 + Math.sin(a) * 7, 10, 4, a, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#3c7d33';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4c9a42';
      ctx.beginPath();
      ctx.arc(t.x - 4, t.y - 4, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawMissionMarker(G, ctx) {
  const target = G.__missionTarget ? G.__missionTarget() : null;
  if (!target) return;
  const pulse = 1 + Math.sin(G.time * 4) * 0.15;
  ctx.save();
  ctx.translate(target.x, target.y);
  // Ground ring.
  ctx.strokeStyle = 'rgba(255, 214, 64, 0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, target.r * pulse * 0.4, 0, Math.PI * 2);
  ctx.stroke();
  // Beacon beam.
  const grad = ctx.createLinearGradient(0, 0, 0, -260);
  grad.addColorStop(0, 'rgba(255, 214, 64, 0.45)');
  grad.addColorStop(1, 'rgba(255, 214, 64, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(-14, -260, 28, 260);
  // Floating diamond.
  ctx.fillStyle = '#ffd640';
  ctx.beginPath();
  ctx.moveTo(0, -250 + Math.sin(G.time * 2.5) * 8);
  ctx.lineTo(12, -238 + Math.sin(G.time * 2.5) * 8);
  ctx.lineTo(0, -226 + Math.sin(G.time * 2.5) * 8);
  ctx.lineTo(-12, -238 + Math.sin(G.time * 2.5) * 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCarBody(G, ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-22, -10, 48, 26);
  // Body.
  const len = car.kind === 'truck' ? 56 : 46;
  const wid = car.kind === 'truck' ? 24 : 22;
  ctx.fillStyle = car.wrecked ? '#3a3a3a' : car.color;
  roundRect(ctx, -len / 2, -wid / 2, len, wid, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 2;
  roundRect(ctx, -len / 2, -wid / 2, len, wid, 7);
  ctx.stroke();
  // Windshield + roof.
  ctx.fillStyle = 'rgba(20, 30, 44, 0.85)';
  ctx.fillRect(len / 2 - 14, -wid / 2 + 3, 9, wid - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(-6, -wid / 2 + 3, 12, wid - 6);
  // Headlights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(len / 2 - 2, -wid / 2 + 2, 3, 4);
  ctx.fillRect(len / 2 - 2, wid / 2 - 6, 3, 4);
  // Police light bar.
  if (car.kind === 'police') {
    const flash = Math.floor(G.time * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2e2e' : '#2e7bff';
    ctx.fillRect(-4, -wid / 2 - 2, 8, 5);
    ctx.fillStyle = flash ? '#2e7bff' : '#ff2e2e';
    ctx.fillRect(-4, wid / 2 - 3, 8, 5);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
  }
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#ffd640';
    ctx.fillRect(-8, -wid / 2 - 2, 16, 4);
  }
  if (car.kind === 'truck') {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-len / 2 + 4, -wid / 2 + 3, 16, wid - 6);
  }
  ctx.restore();
}

function drawCars(G, ctx) {
  for (const car of G.cars) drawCarBody(G, ctx, car);
}

function drawPeds(G, ctx) {
  for (const ped of G.peds) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    if (ped.state === 'dead') {
      ctx.rotate(ped.angle + Math.PI / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ped.shirt;
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }
    const bob = ped.state === 'walk' ? Math.sin(G.time * 8 + ped.seed * 7) * 1.5 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 3, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body.
    ctx.fillStyle = ped.state === 'enemy' ? '#1c1c22' : ped.shirt;
    ctx.beginPath();
    ctx.arc(0, bob * 0.3, 8, 0, Math.PI * 2);
    ctx.fill();
    // Head.
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3 + bob * 0.3, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Enemy marker.
    if (ped.state === 'enemy') {
      ctx.fillStyle = '#ff2e2e';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -14);
    }
    ctx.restore();
  }
}

function drawPlayer(G, ctx) {
  const p = G.player;
  if (p.inCar) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  const bob = p.moving ? Math.sin(p.walkPhase) * 2 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Riko's teal jacket.
  ctx.fillStyle = '#1f8f8a';
  ctx.beginPath();
  ctx.arc(0, bob * 0.3, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f5a56';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, bob * 0.3, 11, 0, Math.PI * 2);
  ctx.stroke();
  // Head and gun direction.
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(Math.cos(p.angle) * 3, Math.sin(p.angle) * 3, 5.5, 0, Math.PI * 2);
  ctx.fill();
  if (p.pistol) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(p.aim) * 8, Math.sin(p.aim) * 8);
    ctx.lineTo(Math.cos(p.aim) * 20, Math.sin(p.aim) * 20);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBullets(G, ctx) {
  ctx.fillStyle = '#ffe9a8';
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(G, ctx) {
  for (const pt of G.particles) {
    const a = clamp(pt.life / pt.max, 0, 1);
    if (pt.kind === 'spark') {
      ctx.fillStyle = 'rgba(255, 220, 90, ' + a + ')';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.kind === 'smoke') {
      ctx.fillStyle = 'rgba(120, 120, 120, ' + a * 0.5 + ')';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8 + (1 - a) * 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.kind === 'muzzle') {
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.angle);
      ctx.fillStyle = 'rgba(255, 230, 120, ' + a + ')';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// __REV__
