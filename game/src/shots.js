// SUNSET BAY — staged screenshots.
// One clear job: pose the game for its four screenshots (?shot=cover,
// street, drive, mission) so each one shows several systems at once.
// These scenes only run when the page is opened with ?shot=<name>.

import { PLACES } from './config.js';
import { createCar, spawnPolice } from './vehicles.js';
import { startMission } from './missions.js';

function putPlayerInCar(G, x, y, angle, kind, color) {
  const car = createCar(x, y, angle, kind, color);
  car.driver = 'player';
  car.speed = 320;
  G.cars.push(car);
  G.player.inCar = car;
  G.player.x = x;
  G.player.y = y;
  G.camera.x = x;
  G.camera.y = y;
  return car;
}

function addTraffic(G, cx, cy, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 150 + Math.random() * 500;
    const car = createCar(cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.random() * Math.PI * 2, 'sedan');
    car.driver = 'traffic';
    car.axis = Math.random() < 0.5 ? 'h' : 'v';
    car.dir = Math.random() < 0.5 ? 1 : -1;
    car.speed = 140 + Math.random() * 60;
    G.cars.push(car);
  }
}

function addPeds(G, cx, cy, count) {
  for (let i = 0; i < count; i++) {
    G.peds.push({
      x: cx + (Math.random() - 0.5) * 700,
      y: cy + (Math.random() - 0.5) * 500,
      angle: Math.random() * Math.PI * 2,
      speed: 60 + Math.random() * 40,
      shirt: ['#e8e4da', '#c23b2e', '#2e6fc2', '#3aa655', '#e8b73a'][i % 5],
      state: 'walk',
      hp: 100,
      seed: Math.random() * 10,
    });
  }
}

function addPoliceChase(G, x, y, count) {
  for (let i = 0; i < count; i++) {
    const car = createCar(x - 120 - i * 90, y + 60 + i * 40, 0, 'police', '#1c2f57');
    car.driver = 'police';
    car.speed = 420;
    G.cars.push(car);
  }
}

export function stageShot(G, name) {
  if (name === 'cover') {
    // The money shot: a three-star chase downtown, HUD + minimap + mission.
    const car = putPlayerInCar(G, 1400, 1400, 0, 'sport', '#c23b2e');
    car.speed = 430;
    G.wanted = 3;
    addPoliceChase(G, 1400, 1400, 2);
    addTraffic(G, 1400, 1400, 7);
    addPeds(G, 1400, 1400, 8);
    startMission(G, 5);
    G.mission.stage = 1;
    G.message = 'Hold the bank while the vault opens';
    G.messageT = 99;
    G.shotKeys = ['w']; // Keep the getaway rolling for the camera.
    G.shotSpeed = 430; // Pose the chase at speed, not at a standstill.
  } else if (name === 'street') {
    // On foot in the city: traffic, pedestrians, the world at street level.
    G.player.x = 1000;
    G.player.y = 1000;
    G.player.angle = Math.PI / 4;
    G.camera.x = 1000;
    G.camera.y = 1000;
    G.wanted = 0;
    addTraffic(G, 1000, 1000, 9);
    addPeds(G, 1000, 1000, 14);
    startMission(G, 0);
    G.message = 'Go to Mama June\'s Diner';
    G.messageT = 99;
  } else if (name === 'drive') {
    // Sunset cruise down the beach road, one star, a cop in the mirror.
    // The car sits still through warm-up (a rolling start would plough
    // into the intersection traffic and pile up); the staged speed lands
    // after warm-up instead.
    const car = putPlayerInCar(G, 1200, 3000, 0, 'sport', '#e8b73a');
    car.speed = 0;
    G.wanted = 1;
    const cop = createCar(800, 3000, 0, 'police', '#1c2f57');
    cop.driver = 'police';
    cop.speed = 200;
    G.cars.push(cop);
    addTraffic(G, 1400, 3000, 4);
    addPeds(G, 1400, 2960, 6);
    G.message = '';
    G.messageT = 0;
    G.shotKeys = ['w']; // Cruise the beach road for the camera.
    G.shotSpeed = 480; // Pose the cruise at speed, not at a standstill.
    G.shotWarmup = 60; // Short warm-up: the cop is still closing in.
  } else if (name === 'mission') {
    // The bank holdout: pistol out, crew closing in, wanted climbing.
    G.player.x = PLACES.bank.x;
    G.player.y = PLACES.bank.y + 60;
    G.player.aim = -Math.PI / 2;
    G.camera.x = PLACES.bank.x;
    G.camera.y = PLACES.bank.y + 60;
    G.wanted = 3;
    startMission(G, 5);
    G.mission.stage = 1;
    G.mission.spawned = false;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      G.peds.push({
        x: PLACES.bank.x + Math.cos(a) * 220,
        y: PLACES.bank.y + Math.sin(a) * 220,
        angle: a + Math.PI,
        speed: 150,
        shirt: '#1c1c22',
        state: 'enemy',
        hp: 60,
        shootCd: 0.5 + i * 0.3,
        seed: i,
      });
    }
    G.mission.enemiesLeft = 3;
    G.message = 'Hold the bank while the vault opens';
    G.messageT = 99;
  }
}

// The four staged scenes, in the order they are screenshotted.
export const SHOT_NAMES = ['cover', 'street', 'drive', 'mission'];
