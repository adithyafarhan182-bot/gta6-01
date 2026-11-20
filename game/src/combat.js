// SUNSET BAY — combat and the wanted system.
// One clear job: bullets, damage, and how the law notices what you do.

import { TUNE } from './config.js';
import { dist } from './utils.js';
import { sfxShot } from './audio.js';

export function fireBullet(G, x, y, angle, from, damage) {
  G.bullets.push({
    x,
    y,
    vx: Math.cos(angle) * TUNE.bulletSpeed,
    vy: Math.sin(angle) * TUNE.bulletSpeed,
    life: 1.4,
    from,
    damage: damage || TUNE.pistolDamage,
  });
}

// Enemy crew shooting at the player.
export function enemyShoot(G, fromX, fromY, targetX, targetY, damage) {
  const a = Math.atan2(targetY - fromY, targetX - fromX) + (Math.random() - 0.5) * 0.22;
  fireBullet(G, fromX, fromY, a, 'enemy', damage || 10);
  sfxShot();
}

export function updateBullets(G, dt) {
  const city = G.city;
  for (const b of G.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    // A building stops a bullet with a spark.
    for (const bd of city.buildings) {
      if (b.x >= bd.x && b.x <= bd.x + bd.w && b.y >= bd.y && b.y <= bd.y + bd.h) {
        b.life = 0;
        G.particles.push({ kind: 'spark', x: b.x, y: b.y, vx: 0, vy: 0, life: 0.25, max: 0.25 });
        break;
      }
    }
    if (b.life <= 0) continue;

    if (b.from === 'player') {
      // Hit a pedestrian.
      for (const ped of G.peds) {
        if (ped.state === 'dead') continue;
        if (dist(b.x, b.y, ped.x, ped.y) < 16) {
          b.life = 0;
          ped.hp -= b.damage;
          if (ped.hp <= 0) {
            ped.state = 'dead';
            ped.deadT = 0;
            G.wanted = Math.min(5, G.wanted + 1);
          } else {
            ped.state = 'flee';
          }
          break;
        }
      }
      if (b.life <= 0) continue;
      // Hit a car (not the player's own).
      for (const car of G.cars) {
        if (car.driver === 'player') continue;
        if (dist(b.x, b.y, car.x, car.y) < 24) {
          b.life = 0;
          car.hp -= b.damage;
          if (car.driver === 'traffic' || car.driver === 'parked') {
            G.wanted = Math.min(5, Math.max(G.wanted, 1));
          }
          break;
        }
      }
    } else {
      // Enemy bullets can hit the player (on foot or in a car).
      const p = G.player;
      const tx = p.inCar ? p.inCar.x : p.x;
      const ty = p.inCar ? p.inCar.y : p.y;
      if (dist(b.x, b.y, tx, ty) < (p.inCar ? 24 : 16)) {
        b.life = 0;
        if (p.inCar) {
          p.inCar.hp -= b.damage;
          if (p.inCar.hp <= 0) {
            p.hp -= 20;
            p.inCar.hp = 1;
          }
        } else {
          p.hp -= b.damage;
          p.hurtCd = 0.4;
          if (p.hp <= 0) {
            p.hp = 0;
            G.mode = 'wasted';
            G.modeT = 0;
          }
        }
      }
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < 3200 && b.y > 0 && b.y < 3200);
}

// The wanted level cools off when no police can see you.
export function updateWanted(G, dt) {
  if (G.wanted === 0) return;
  let nearest = Infinity;
  const px = G.player.inCar ? G.player.inCar.x : G.player.x;
  const py = G.player.inCar ? G.player.inCar.y : G.player.y;
  for (const car of G.cars) {
    if (car.driver !== 'police') continue;
    nearest = Math.min(nearest, dist(car.x, car.y, px, py));
  }
  if (nearest > 700) {
    G.wantedTimer += dt;
    if (G.wantedTimer >= TUNE.wantedDecaySeconds) {
      G.wantedTimer = 0;
      G.wanted -= 1;
      if (G.wanted === 0) {
        G.message = 'You lost them. The heat is off — for now.';
        G.messageT = 3;
      }
    }
  } else {
    G.wantedTimer = 0;
  }
}

// Clear every bullet (used when a mission restarts).
export function clearBullets(G) {
  G.bullets.length = 0;
}
