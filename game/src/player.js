// SUNSET BAY — the player on foot.
// One clear job: Riko Vale's movement, aiming, punching, shooting and
// getting in and out of cars. Driving itself lives in vehicles.js.

import { TUNE } from './config.js';
import { clamp, angleTo, circleRectResolve } from './utils.js';
import { collideBuildings, clampToWorld, isOnRoad, isInWater } from './city.js';
import { fireBullet } from './combat.js';
import { sfxPunch, sfxShot, sfxClick } from './audio.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    angle: -Math.PI / 2,
    aim: -Math.PI / 2,
    hp: TUNE.playerHp,
    maxHp: TUNE.playerHp,
    inCar: null,
    pistol: true,
    ammo: 24,
    punchCd: 0,
    shootCd: 0,
    hurtCd: 0,
    walkPhase: 0,
    moving: false,
  };
}

// Mouse position in world coordinates, for aiming.
// In 3D the mouse ray is cast onto the ground plane by the renderer.
export function mouseWorld(G) {
  if (G.screenToGround) return G.screenToGround(G.input.mouse.x, G.input.mouse.y);
  const scale = G.view.scale;
  return {
    x: G.camera.x + (G.input.mouse.x - G.view.w / 2) / scale,
    y: G.camera.y + (G.input.mouse.y - G.view.h / 2) / scale,
  };
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  if (p.inCar) return;
  p.punchCd = Math.max(0, p.punchCd - dt);
  p.shootCd = Math.max(0, p.shootCd - dt);
  p.hurtCd = Math.max(0, p.hurtCd - dt);

  // Aim at the mouse when the pistol is out, else face the walk direction.
  // (The raycast above gives the ground point under the cursor.)
  const mw = mouseWorld(G);
  p.aim = angleTo(p.x, p.y, mw.x, mw.y);

  const ax = input.axis();
  const running = input.isDown('Shift');
  const speed = running ? TUNE.runSpeed : TUNE.walkSpeed;
  let mx = ax.x;
  let my = ax.y;
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
    p.moving = true;
    p.walkPhase += dt * (running ? 13 : 9);
    p.angle = Math.atan2(my, mx);
  } else {
    p.moving = false;
  }

  const ox = p.x;
  const oy = p.y;
  p.x += mx * speed * dt;
  p.y += my * speed * dt;

  // Buildings are solid; the world edge is a wall; the sea is not for
  // walking — Riko stays on the sand.
  if (isInWater(p.x, p.y)) {
    p.x = ox;
    p.y = oy;
  }
  const push = collideBuildings(G.city, p.x, p.y, TUNE.playerRadius);
  p.x += push.x;
  p.y += push.y;
  const c = clampToWorld(p.x, p.y, TUNE.playerRadius + 2);
  p.x = c.x;
  p.y = c.y;

  // Enter or steal the nearest car.
  if (input.wasPressed('e')) {
    const car = nearestCar(G, p.x, p.y, 56);
    if (car) enterCar(G, car);
  }

  // Punch with F, shoot with the mouse.
  if (input.wasPressed('f')) punch(G);
  if (input.mouse.down && p.shootCd <= 0 && p.ammo > 0) shoot(G);

  // Slow health regen out of trouble.
  if (G.wanted === 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 2.5 * dt);
}

export function nearestCar(G, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function enterCar(G, car) {
  const p = G.player;
  if (car.driver === 'police') return;
  if (car.driver === 'traffic') {
    // Carjacking: the driver flees on foot and the law notices.
    car.driver = 'player';
    G.wanted = Math.min(5, Math.max(G.wanted, 1));
    spawnFleeingDriver(G, car);
    G.message = 'Car jacked! The driver ran — and someone called the cops.';
    G.messageT = 3;
  } else if (car.driver === 'parked' || car.driver === 'mission') {
    const wasParked = car.driver === 'parked';
    car.driver = 'player';
    if (wasParked) {
      G.wanted = Math.min(5, Math.max(G.wanted, 1));
      G.message = 'Hot-wired! That was somebody\'s ride.';
      G.messageT = 2.5;
    }
  }
  p.inCar = car;
  p.x = car.x;
  p.y = car.y;
  sfxClick();
}

function spawnFleeingDriver(G, car) {
  G.peds.push({
    x: car.x + 30,
    y: car.y + 30,
    angle: Math.random() * Math.PI * 2,
    speed: 200,
    shirt: '#e8e4da',
    state: 'flee',
    hp: 100,
    fleeX: car.x + 300,
    fleeY: car.y + 300,
    seed: Math.random() * 10,
  });
}

export function exitCar(G) {
  const p = G.player;
  const car = p.inCar;
  if (!car) return;
  car.driver = 'parked';
  car.speed = 0;
  const side = { x: Math.cos(car.angle + Math.PI / 2), y: Math.sin(car.angle + Math.PI / 2) };
  p.x = car.x + side.x * 34;
  p.y = car.y + side.y * 34;
  const push = collideBuildings(G.city, p.x, p.y, TUNE.playerRadius);
  p.x += push.x;
  p.y += push.y;
  p.inCar = null;
  sfxClick();
}

function punch(G) {
  const p = G.player;
  if (p.punchCd > 0) return;
  p.punchCd = 0.35;
  sfxPunch();
  const hx = p.x + Math.cos(p.aim) * TUNE.punchRange;
  const hy = p.y + Math.sin(p.aim) * TUNE.punchRange;
  for (const ped of G.peds) {
    if (ped.state === 'dead') continue;
    if (Math.hypot(ped.x - hx, ped.y - hy) < 30) {
      hurtPed(G, ped, TUNE.punchDamage);
      break;
    }
  }
  for (const car of G.cars) {
    if (Math.hypot(car.x - hx, car.y - hy) < 30) {
      car.hp -= 4;
      break;
    }
  }
}

function shoot(G) {
  const p = G.player;
  p.shootCd = 0.22;
  p.ammo -= 1;
  fireBullet(G, p.x + Math.cos(p.aim) * 20, p.y + Math.sin(p.aim) * 20, p.aim, 'player', TUNE.pistolDamage);
  sfxShot();
  addMuzzle(G, p.x + Math.cos(p.aim) * 24, p.y + Math.sin(p.aim) * 24, p.aim);
  if (p.ammo === 0) {
    G.message = 'Out of ammo — find the ammo crate at the safehouse.';
    G.messageT = 3;
  }
}

function addMuzzle(G, x, y, angle) {
  G.particles.push({ kind: 'muzzle', x, y, angle, life: 0.08, max: 0.08 });
}

export function hurtPlayer(G, amount) {
  const p = G.player;
  if (p.hurtCd > 0 || G.mode !== 'playing') return;
  p.hp -= amount;
  p.hurtCd = 0.4;
  if (p.hp <= 0) {
    p.hp = 0;
    G.mode = 'wasted';
    G.modeT = 0;
  }
}

export function hurtPed(G, ped, amount) {
  ped.hp -= amount;
  if (ped.hp <= 0 && ped.state !== 'dead') {
    ped.state = 'dead';
    ped.deadT = 0;
    G.wanted = Math.min(5, G.wanted + 1);
    G.message = 'A pedestrian is down. The city saw that.';
    G.messageT = 2.5;
  } else if (ped.state !== 'dead') {
    ped.state = 'flee';
  }
}

// Restock the pistol at the safehouse ammo crate.
export function giveAmmo(G, amount) {
  G.player.ammo += amount;
  G.message = 'Ammo restocked: +' + amount + ' rounds.';
  G.messageT = 2;
}

export function healPlayer(G, amount) {
  const p = G.player;
  p.hp = Math.min(p.maxHp, p.hp + amount);
}
