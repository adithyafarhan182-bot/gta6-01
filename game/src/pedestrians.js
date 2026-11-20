// SUNSET BAY — pedestrians.
// One clear job: the people of Sunset Bay — strolling the sidewalks,
// scattering from gunfire and speeding cars.

import { ROAD_CENTERS, PED_SHIRTS } from './config.js';
import { clamp, dist } from './utils.js';
import { isOnRoad } from './city.js';

export function maintainPeds(G, dt) {
  const p = G.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;

  G.peds = G.peds.filter((ped) => ped.state !== 'dead' || (ped.deadT || 0) < 12);
  for (const ped of G.peds) {
    if (ped.state === 'dead') ped.deadT = (ped.deadT || 0) + dt;
  }
  G.peds = G.peds.filter((ped) => dist(ped.x, ped.y, px, py) < 1500 || ped.state === 'dead');

  const alive = G.peds.filter((ped) => ped.state !== 'dead').length;
  for (let i = alive; i < 22; i++) {
    const spot = randomSidewalkSpot(px, py);
    if (spot) {
      G.peds.push({
        x: spot.x,
        y: spot.y,
        angle: Math.random() * Math.PI * 2,
        speed: 55 + Math.random() * 45,
        shirt: PED_SHIRTS[Math.floor(Math.random() * PED_SHIRTS.length)],
        state: 'walk',
        hp: 100,
        seed: Math.random() * 10,
      });
    }
  }
}

function randomSidewalkSpot(px, py) {
  for (let tries = 0; tries < 8; tries++) {
    const a = Math.random() * Math.PI * 2;
    const r = 200 + Math.random() * 700;
    const x = px + Math.cos(a) * r;
    const y = py + Math.sin(a) * r;
    if (x < 60 || y < 60 || x > 3140 || y > 3140) continue;
    // Sidewalks run just off the road edge.
    let onSidewalk = false;
    for (const c of ROAD_CENTERS) {
      if (Math.abs(x - c) > 40 && Math.abs(x - c) < 62) onSidewalk = true;
      if (Math.abs(y - c) > 40 && Math.abs(y - c) < 62) onSidewalk = true;
    }
    if (onSidewalk) return { x, y };
  }
  return null;
}

export function updatePeds(G, dt) {
  const p = G.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;

  for (const ped of G.peds) {
    if (ped.state === 'dead') continue;
    if (ped.state === 'enemy') continue; // Rival crew moves in missions.js.

    // Flee gunfire, fast cars and the player when wanted.
    let threat = null;
    for (const b of G.bullets) {
      if (dist(b.x, b.y, ped.x, ped.y) < 220) {
        threat = b;
        break;
      }
    }
    if (!threat) {
      for (const car of G.cars) {
        if (car.driver === 'player' && Math.abs(car.speed) > 240 && dist(car.x, car.y, ped.x, ped.y) < 180) {
          threat = car;
          break;
        }
      }
    }
    if (threat) ped.state = 'flee';

    if (ped.state === 'flee') {
      const away = Math.atan2(ped.y - (threat ? threat.y : py), ped.x - (threat ? threat.x : px));
      ped.angle = away;
      ped.x += Math.cos(away) * 210 * dt;
      ped.y += Math.sin(away) * 210 * dt;
      if (dist(ped.x, ped.y, px, py) > 500) ped.state = 'walk';
    } else {
      // Stroll: wander slowly, turning at random.
      ped.seed += dt;
      if (Math.random() < dt * 0.25) ped.angle += (Math.random() - 0.5) * 2.2;
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      // Stay near the sidewalks: drift back toward the nearest road edge.
      if (!isOnRoad(ped.x, ped.y) && Math.random() < dt * 0.5) {
        ped.angle = Math.atan2(nearestRoadY(ped.y) - ped.y, nearestRoadX(ped.x) - ped.x);
      }
    }

    ped.x = clamp(ped.x, 30, 3170);
    ped.y = clamp(ped.y, 30, 3170);

    // Run over by a fast car.
    for (const car of G.cars) {
      if (Math.abs(car.speed) > 200 && dist(car.x, car.y, ped.x, ped.y) < 26) {
        ped.hp = 0;
        ped.state = 'dead';
        ped.deadT = 0;
        G.wanted = Math.min(5, G.wanted + 1);
        G.message = 'You ran someone over. The city saw that.';
        G.messageT = 2.5;
        break;
      }
    }
  }
}

function nearestRoadX(x) {
  let best = ROAD_CENTERS[0];
  let bestD = Infinity;
  for (const c of ROAD_CENTERS) {
    const d = Math.abs(x - c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function nearestRoadY(y) {
  return nearestRoadX(y);
}

// How many pedestrians are still walking around.
export function countAlivePeds(G) {
  return G.peds.filter((p) => p.state !== 'dead').length;
}
