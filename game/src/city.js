// SUNSET BAY — the city itself.
// One clear job: generate Sunset Bay once from a fixed seed (roads, blocks,
// buildings, beach, park, marina, pier) and answer collision questions.

import { ROAD_CENTERS, ROAD_W, WORLD, PALETTE } from './config.js';
import { makeRng, rngHelpers } from './rng.js';
import { circleRectResolve } from './utils.js';

const CITY_SEED = 1337;

// District of a block, from its column and row in the 7 x 7 block grid.
function districtOf(col, row) {
  if (row === 6) return 'beach';
  if (col === 6 && row >= 4) return 'marina';
  if (row === 0) return 'industrial';
  if (col >= 3 && col <= 4 && row >= 2 && row <= 3) return 'downtown';
  if (col === 1 && row === 4) return 'park';
  return 'residential';
}

export function buildCity() {
  const rng = makeRng(CITY_SEED);
  const h = rngHelpers(rng);
  const buildings = [];
  const trees = [];
  const docks = [];

  // Blocks sit between neighbouring road centres.
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row < 7; row++) {
      const x0 = ROAD_CENTERS[col] + ROAD_W / 2;
      const y0 = ROAD_CENTERS[row] + ROAD_W / 2;
      const x1 = ROAD_CENTERS[col + 1] - ROAD_W / 2;
      const y1 = ROAD_CENTERS[row + 1] - ROAD_W / 2;
      const zone = districtOf(col, row);

      if (zone === 'beach' || zone === 'marina') {
        // Sand and water, no buildings; a few palm trees on the sand.
        if (zone === 'beach') {
          const n = h.int(4, 8);
          for (let i = 0; i < n; i++) {
            trees.push({ x: h.range(x0 + 30, x1 - 30), y: h.range(y0 + 20, y1 - 20), palm: true });
          }
        }
        continue;
      }
      if (zone === 'park') {
        const n = h.int(10, 14);
        for (let i = 0; i < n; i++) {
          trees.push({ x: h.range(x0 + 20, x1 - 20), y: h.range(y0 + 20, y1 - 20), palm: h.chance(0.4) });
        }
        continue;
      }

      // 1 to 3 buildings per block, kept off the sidewalk edge.
      const count = zone === 'downtown' ? h.int(2, 3) : zone === 'industrial' ? 1 : h.int(1, 2);
      const bw = (x1 - x0) / count;
      for (let i = 0; i < count; i++) {
        const bx = x0 + i * bw + 18;
        const by = y0 + 18;
        const bwid = bw - 36;
        const bh = (y1 - y0) - 36;
        if (bwid < 50 || bh < 50) continue;
        const tall = zone === 'downtown' ? h.int(3, 6) : zone === 'industrial' ? 1 : h.int(1, 3);
        buildings.push({
          x: bx,
          y: by,
          w: bwid,
          h: bh,
          color: h.pick(PALETTE.buildingRoof),
          height: tall,
          zone,
        });
      }
    }
  }

  // Marina docks jut into the water on the east edge.
  for (let i = 0; i < 3; i++) {
    docks.push({ x: 3040, y: 1900 + i * 220, w: 130, h: 26 });
  }

  // The pier runs south from the beach road into the water.
  const pier = { x: 1560, y: 2920, w: 80, h: 240 };

  return { buildings, trees, docks, pier, seed: CITY_SEED };
}

export function isOnRoad(x, y) {
  for (const c of ROAD_CENTERS) {
    if (Math.abs(x - c) <= ROAD_W / 2 || Math.abs(y - c) <= ROAD_W / 2) return true;
  }
  return false;
}

// Nearest point on any road centre line, for spawning cars on the road.
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const cx of ROAD_CENTERS) {
    const d = Math.abs(x - cx);
    if (d < bestD) {
      bestD = d;
      best = { x: cx, y, axis: 'v' };
    }
  }
  for (const cy of ROAD_CENTERS) {
    const d = Math.abs(y - cy);
    if (d < bestD) {
      bestD = d;
      best = { x, y: cy, axis: 'h' };
    }
  }
  return best;
}

// Push a circle out of every building it overlaps. Returns total push applied.
export function collideBuildings(city, x, y, r) {
  let px = 0;
  let py = 0;
  for (const b of city.buildings) {
    const push = circleRectResolve(x + px, y + py, r, b.x, b.y, b.w, b.h);
    if (push) {
      px += push.x;
      py += push.y;
    }
  }
  return { x: px, y: py };
}

// Keep a point inside the world, with a small margin.
export function clampToWorld(x, y, margin = 24) {
  return {
    x: Math.max(margin, Math.min(WORLD.w - margin, x)),
    y: Math.max(margin, Math.min(WORLD.h - margin, y)),
  };
}

// A point on a sidewalk near (x, y), for mission NPC placement.
export function randomSidewalkPoint(rng, x, y) {
  for (let tries = 0; tries < 10; tries++) {
    const a = rng() * Math.PI * 2;
    const r = 60 + rng() * 200;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (px < 60 || py < 60 || px > 3140 || py > 3140) continue;
    for (const c of ROAD_CENTERS) {
      if (Math.abs(px - c) > 40 && Math.abs(px - c) < 62) return { x: px, y: py };
      if (Math.abs(py - c) > 40 && Math.abs(py - c) < 62) return { x: px, y: py };
    }
  }
  return { x, y };
}
