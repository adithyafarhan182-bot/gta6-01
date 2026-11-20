// SUNSET BAY — cars: driving physics, traffic, parked cars and police.
// One clear job: everything with four wheels, from a Sunday driver to a
// three-star police chase.

import { ROAD_CENTERS, ROAD_W, TUNE, CAR_COLORS } from './config.js';
import { clamp, angleDiff, wrapAngle, dist } from './utils.js';
import { collideBuildings, nearestRoadPoint, isOnRoad, isInWater } from './city.js';
import { sfxCrash, sfxSiren } from './audio.js';
import { hurtPlayer, exitCar } from './player.js';

let carId = 1;

export function createCar(x, y, angle, kind, color) {
  return {
    id: carId++,
    x,
    y,
    angle,
    speed: 0,
    steer: 0,
    color: color || CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    kind: kind || 'sedan', // sedan | taxi | truck | police | sport
    driver: 'parked', // parked | traffic | player | police | mission
    hp: 100,
    // Traffic AI state.
    axis: 'h',
    dir: 1,
    lane: 20,
    cruise: 150,
    stuckT: 0,
    sirenT: Math.random() * 2,
    skid: 0,
  };
}

function randomCarColor() {
  return CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
}

// Keep the streets alive: traffic near the player, parked cars to steal.
export function maintainTraffic(G, dt) {
  const p = G.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;

  // Despawn traffic far away.
  G.cars = G.cars.filter((c) => {
    if (c.driver === 'player' || c.driver === 'mission') return true;
    return dist(c.x, c.y, px, py) < 1600;
  });

  const traffic = G.cars.filter((c) => c.driver === 'traffic').length;
  if (traffic < 13) {
    const spot = randomRoadSpawn(G, px, py);
    if (spot) {
      const car = createCar(spot.x, spot.y, spot.angle, Math.random() < 0.12 ? 'taxi' : 'sedan', randomCarColor());
      car.driver = 'traffic';
      car.axis = spot.axis;
      car.dir = spot.dir;
      car.lane = spot.lane;
      car.cruise = 130 + Math.random() * 70;
      car.speed = car.cruise;
      G.cars.push(car);
    }
  }

  const parked = G.cars.filter((c) => c.driver === 'parked').length;
  if (parked < 6) {
    const spot = randomRoadSpawn(G, px, py);
    if (spot) {
      const car = createCar(spot.x + (Math.random() - 0.5) * 30, spot.y + (Math.random() - 0.5) * 30, spot.angle, 'sedan', randomCarColor());
      car.driver = 'parked';
      G.cars.push(car);
    }
  }
}

function randomRoadSpawn(G, px, py) {
  for (let tries = 0; tries < 8; tries++) {
    const a = Math.random() * Math.PI * 2;
    const r = 500 + Math.random() * 700;
    const x = px + Math.cos(a) * r;
    const y = py + Math.sin(a) * r;
    if (x < 80 || y < 80 || x > 3120 || y > 3120) continue;
    const near = nearestRoadPoint(x, y);
    const axis = near.axis;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const lane = (Math.random() < 0.5 ? -1 : 1) * 20;
    if (axis === 'h') {
      return { x: near.x, y: near.y + lane, angle: dir > 0 ? 0 : Math.PI, axis, dir, lane };
    }
    return { x: near.x + lane, y: near.y, angle: dir > 0 ? Math.PI / 2 : -Math.PI / 2, axis, dir, lane };
  }
  return null;
}

export function updateCars(G, dt) {
  const input = G.input;
  for (const car of G.cars) {
    if (car.driver === 'player') updatePlayerCar(G, car, dt, input);
    else if (car.driver === 'traffic') updateTrafficCar(G, car, dt);
    else if (car.driver === 'police') updatePoliceCar(G, car, dt);
    else {
      car.speed = 0;
    }
    if (car.hp <= 0 && !car.wrecked) {
      car.wrecked = true;
      car.speed = 0;
      spawnSmoke(G, car.x, car.y);
    }
  }
  resolveCarCollisions(G, dt);
}

function updatePlayerCar(G, car, dt, input) {
  const ax = input.axis();
  // Forward / reverse on W/S (or arrows), steering on A/D.
  const throttle = -ax.y; // W is -1 on y
  const steerInput = ax.x;
  const forward = { x: Math.cos(car.angle), y: Math.sin(car.angle) };

  if (throttle > 0) car.speed += TUNE.carAccel * dt;
  else if (throttle < 0) {
    if (car.speed > 30) car.speed -= TUNE.carBrake * dt;
    else car.speed -= TUNE.carReverse * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 160 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  car.speed = clamp(car.speed, -TUNE.carReverse * 0.9, TUNE.carMaxSpeed);

  const steerAmount = steerInput * TUNE.carTurn * clamp(Math.abs(car.speed) / 220, 0, 1);
  car.angle += steerAmount * dt * Math.sign(car.speed || 1);
  car.angle = wrapAngle(car.angle);

  // Skid marks when turning hard at speed.
  if (Math.abs(steerInput) > 0.6 && Math.abs(car.speed) > 300) {
    car.skid = 1;
    G.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 6 });
    if (G.skids.length > 220) G.skids.shift();
  }

  moveCarWithCollision(G, car, dt);

  // Horn.
  if (input.wasPressed('h')) {
    G.message = 'Honk! Move it!';
    G.messageT = 1;
  }
  // Handbrake.
  if (input.isDown(' ')) car.speed *= Math.max(0, 1 - 3.2 * dt);

  // Exit with E (only when nearly stopped).
  if (input.wasPressed('e') && Math.abs(car.speed) < 40) {
    exitCar(G);
  }
}

function moveCarWithCollision(G, car, dt) {
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // The sea stops a car: no driving into the bay or the marina basin.
  if (isInWater(nx, ny)) {
    car.speed *= 0.4;
    return;
  }
  const push = collideBuildings(G.city, nx, ny, 17);
  if (push.x !== 0 || push.y !== 0) {
    if (Math.abs(car.speed) > 260) {
      sfxCrash();
      car.hp -= 8;
      spawnSparks(G, car.x, car.y);
    }
    car.speed *= 0.4;
  }
  car.x = Math.max(24, Math.min(3176, nx + push.x));
  car.y = Math.max(24, Math.min(3176, ny + push.y));
}

function updateTrafficCar(G, car, dt) {
  // Slow down for the car ahead on the same lane.
  let ahead = Infinity;
  for (const o of G.cars) {
    if (o === car || o.driver === 'parked') continue;
    if (o.axis !== car.axis) continue;
    const along = car.axis === 'h' ? (o.x - car.x) * car.dir : (o.y - car.y) * car.dir;
    const side = car.axis === 'h' ? Math.abs(o.y - car.y) : Math.abs(o.x - car.x);
    if (along > 0 && along < ahead && side < 40) ahead = along;
  }
  const target = ahead < 90 ? 0 : car.cruise;
  car.speed += clamp(target - car.speed, -400 * dt, 260 * dt);

  // Move along the road; at an intersection, sometimes turn.
  if (car.axis === 'h') {
    car.x += car.dir * car.speed * dt;
    car.y += ((car.y + 0) * 0 + (nearestRoadCenter(car.y) + car.lane) - car.y) * Math.min(1, dt * 3);
  } else {
    car.y += car.dir * car.speed * dt;
    car.x += (nearestRoadCenter(car.x) + car.lane - car.x) * Math.min(1, dt * 3);
  }
  car.angle = car.axis === 'h' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);

  // Intersection turn.
  const cx = nearestRoadCenter(car.x);
  const cy = nearestRoadCenter(car.y);
  if (car.axis === 'h' && Math.abs(car.x - cx) < 6 && Math.random() < 0.012) {
    car.axis = 'v';
    car.dir = Math.random() < 0.5 ? 1 : -1;
    car.lane = (Math.random() < 0.5 ? -1 : 1) * 20;
  } else if (car.axis === 'v' && Math.abs(car.y - cy) < 6 && Math.random() < 0.012) {
    car.axis = 'h';
    car.dir = Math.random() < 0.5 ? 1 : -1;
    car.lane = (Math.random() < 0.5 ? -1 : 1) * 20;
  }

  // Wrap around the world edges so traffic never runs out.
  if (car.x < 40) car.x = 3160;
  if (car.x > 3160) car.x = 40;
  if (car.y < 40) car.y = 3160;
  if (car.y > 3160) car.y = 40;
}

function nearestRoadCenter(v) {
  let best = ROAD_CENTERS[0];
  let bestD = Infinity;
  for (const c of ROAD_CENTERS) {
    const d = Math.abs(v - c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function updatePoliceCar(G, car, dt) {
  const target = G.player.inCar || G.player;
  const tx = target.x;
  const ty = target.y;
  const want = angleTo(car.x, car.y, tx, ty);
  const turn = clamp(angleDiff(car.angle, want), -2.4 * dt, 2.4 * dt);
  car.angle = wrapAngle(car.angle + turn);
  const maxSpeed = TUNE.policeMaxSpeed * (0.85 + G.wanted * 0.05);
  car.speed += clamp(maxSpeed - car.speed, -500 * dt, 420 * dt);
  const ox = car.x;
  const oy = car.y;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (isInWater(car.x, car.y)) {
    car.x = ox;
    car.y = oy;
    car.speed *= 0.5;
  }
  const push = collideBuildings(G.city, car.x, car.y, 17);
  car.x += push.x;
  car.y += push.y;
  if (push.x !== 0 || push.y !== 0) car.speed *= 0.5;
  car.x = clamp(car.x, 24, 3176);
  car.y = clamp(car.y, 24, 3176);

  car.sirenT -= dt;
  if (car.sirenT <= 0) {
    car.sirenT = 1.4;
    sfxSiren(true);
  }

  // Ram the player's car; catch the player on foot.
  const d = dist(car.x, car.y, tx, ty);
  if (G.player.inCar && d < 46 && Math.abs(car.speed) > 200) {
    hurtPlayer(G, 6);
    G.player.inCar.hp -= 6;
    sfxCrash();
  }
  if (!G.player.inCar && d < 44 && Math.abs(car.speed) < 120) {
    G.bustedT = (G.bustedT || 0) + dt;
    if (G.bustedT > 1.2) {
      G.mode = 'busted';
      G.modeT = 0;
    }
  } else {
    G.bustedT = 0;
  }
}

function resolveCarCollisions(G, dt) {
  const cars = G.cars;
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < 40) {
        const push = (40 - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        const ax0 = a.x;
        const ay0 = a.y;
        const bx0 = b.x;
        const by0 = b.y;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        // A shunt never pushes a car into the sea.
        if (isInWater(a.x, a.y)) {
          a.x = ax0;
          a.y = ay0;
        }
        if (isInWater(b.x, b.y)) {
          b.x = bx0;
          b.y = by0;
        }
        const impact = Math.abs(a.speed - b.speed);
        if (impact > 220) {
          a.hp -= 4;
          b.hp -= 4;
          if (a.driver === 'player' || b.driver === 'player') sfxCrash();
          spawnSparks(G, (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
        const tmp = a.speed;
        a.speed = b.speed * 0.6;
        b.speed = tmp * 0.6;
      }
    }
  }
}

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function spawnSparks(G, x, y) {
  for (let i = 0; i < 8; i++) {
    G.particles.push({
      kind: 'spark',
      x,
      y,
      vx: (Math.random() - 0.5) * 260,
      vy: (Math.random() - 0.5) * 260,
      life: 0.4,
      max: 0.4,
    });
  }
}

function spawnSmoke(G, x, y) {
  for (let i = 0; i < 10; i++) {
    G.particles.push({
      kind: 'smoke',
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 40,
      vy: -30 - Math.random() * 40,
      life: 1.2,
      max: 1.2,
    });
  }
}

// How many police the wanted level calls for.
export function wantedPoliceCount(wanted) {
  return [0, 1, 2, 3, 4, 6][wanted] || 0;
}

export function spawnPolice(G) {
  const want = wantedPoliceCount(G.wanted);
  const have = G.cars.filter((c) => c.driver === 'police').length;
  const p = G.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  for (let i = have; i < want; i++) {
    const spot = randomRoadSpawn(G, px, py);
    if (!spot) break;
    const car = createCar(spot.x, spot.y, spot.angle, 'police', '#1c2f57');
    car.driver = 'police';
    car.cruise = 0;
    G.cars.push(car);
  }
  // Too many police after the heat dies down: the extras drive off.
  if (have > want) {
    let removed = 0;
    G.cars = G.cars.filter((c) => {
      if (c.driver === 'police' && have - removed > want) {
        removed++;
        return false;
      }
      return true;
    });
  }
}

// __REV__
