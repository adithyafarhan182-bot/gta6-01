// SUNSET BAY — the story: six missions, "The Sunset Job".
// One clear job: what Riko Vale has to do, in what order, and when a
// stage is done. Combat with the rival crew lives here too.

import { PLACES } from './config.js';
import { dist } from './utils.js';
import { createCar } from './vehicles.js';
import { enemyShoot, clearBullets } from './combat.js';
import { sfxMissionPass, sfxPickup } from './audio.js';
import { saveGame } from './save.js';

export const MISSIONS = [
  {
    id: 'first-fare',
    title: 'First Fare',
    briefing: "Mama June needs a driver. Pick up her client at the diner and get him to the Marina — the Tide Kings are watching the roads, so don't dawdle.",
    reward: 300,
    stages: [
      { type: 'goto', x: PLACES.mamaJunes.x, y: PLACES.mamaJunes.y, r: 90, text: 'Go to Mama June\'s Diner' },
      { type: 'pickup', x: PLACES.mamaJunes.x, y: PLACES.mamaJunes.y, r: 80, text: 'Pick up the client (stand by the door)' },
      { type: 'drive', x: PLACES.marina.x, y: PLACES.marina.y, r: 110, text: 'Drive the client to the Marina', time: 80 },
    ],
  },
  {
    id: 'repo-man',
    title: 'Repo Man',
    briefing: 'A sportscar at the North Docks missed three payments. Take it — quietly — and bring it to the Old Warehouse.',
    reward: 500,
    stages: [
      { type: 'goto', x: PLACES.docks.x, y: PLACES.docks.y, r: 110, text: 'Go to the North Docks' },
      { type: 'steal', x: PLACES.docks.x, y: PLACES.docks.y, r: 60, text: 'Steal the red sportscar' },
      { type: 'deliver', x: PLACES.warehouse.x, y: PLACES.warehouse.y, r: 120, text: 'Deliver the car to the Old Warehouse' },
    ],
  },
  {
    id: 'the-pickup',
    title: 'The Pickup',
    briefing: 'A package is waiting on Sunset Pier. Grab it — and expect company. The Tide Kings want it too.',
    reward: 700,
    stages: [
      { type: 'goto', x: PLACES.pier.x, y: PLACES.pier.y - 120, r: 100, text: 'Go to Sunset Pier' },
      { type: 'pickup', x: PLACES.pier.x, y: PLACES.pier.y - 120, r: 80, text: 'Grab the package' },
      { type: 'holdout', x: PLACES.pier.x, y: PLACES.pier.y - 120, r: 260, seconds: 22, text: 'Hold the pier — the Tide Kings are coming' },
      { type: 'goto', x: PLACES.mamaJunes.x, y: PLACES.mamaJunes.y, r: 100, text: 'Bring the package to Mama June' },
    ],
  },
  {
    id: 'getaway-driver',
    title: 'Getaway Driver',
    briefing: "The job went loud. Bay PD has your plate. Lose them — survive the heat, then slip back to the safehouse.",
    reward: 800,
    stages: [
      { type: 'survive', seconds: 45, text: 'Survive the police chase — 45 seconds' },
      { type: 'goto', x: PLACES.safehouse.x, y: PLACES.safehouse.y, r: 100, text: 'Reach the safehouse' },
    ],
  },
  {
    id: 'the-setup',
    title: 'The Setup',
    briefing: 'An armored van parks behind Bay Trust Bank every evening. Take it to the warehouse and the crew can crack it open.',
    reward: 1000,
    stages: [
      { type: 'goto', x: PLACES.bank.x, y: PLACES.bank.y, r: 110, text: 'Go to Bay Trust Bank' },
      { type: 'steal', x: PLACES.bank.x, y: PLACES.bank.y, r: 60, text: 'Steal the armored van' },
      { type: 'deliver', x: PLACES.warehouse.x, y: PLACES.warehouse.y, r: 120, text: 'Deliver the van to the Old Warehouse' },
    ],
  },
  {
    id: 'sunset-job',
    title: 'The Sunset Job',
    briefing: 'The big one. Hit Bay Trust Bank at sunset, grab the cash, and get out to the boat at the pier. This is the job that buys your freedom.',
    reward: 2500,
    stages: [
      { type: 'goto', x: PLACES.bank.x, y: PLACES.bank.y, r: 110, text: 'Go to Bay Trust Bank' },
      { type: 'holdout', x: PLACES.bank.x, y: PLACES.bank.y, r: 280, seconds: 25, text: 'Hold the bank while the vault opens' },
      { type: 'goto', x: PLACES.pier.x, y: PLACES.pier.y - 120, r: 110, text: 'Escape to the boat at Sunset Pier' },
    ],
  },
];

export function currentMission(G) {
  if (G.missionIndex >= MISSIONS.length) return null;
  return MISSIONS[G.missionIndex];
}

export function startMission(G, index) {
  const m = MISSIONS[index];
  if (!m) return;
  G.mission = { index, stage: 0, stageT: 0, progress: 0, spawned: false, enemiesLeft: 0 };
  G.missionActive = true;
  G.message = m.title + ' — ' + m.briefing;
  G.messageT = 6;
  clearBullets(G);
  if (index === 3) {
    G.wanted = 3;
  }
}

export function missionTarget(G) {
  if (!G.missionActive || !G.mission) return null;
  const m = MISSIONS[G.mission.index];
  const s = m.stages[G.mission.stage];
  if (!s || s.type === 'survive') return null;
  return { x: s.x, y: s.y, r: s.r, text: s.text };
}

function playerPos(G) {
  const p = G.player;
  return p.inCar ? { x: p.inCar.x, y: p.inCar.y } : { x: p.x, y: p.y };
}

function spawnCrew(G, x, y, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    G.peds.push({
      x: x + Math.cos(a) * (140 + Math.random() * 120),
      y: y + Math.sin(a) * (140 + Math.random() * 120),
      angle: 0,
      speed: 150,
      shirt: '#1c1c22',
      state: 'enemy',
      hp: 60,
      shootCd: 1 + Math.random(),
      seed: Math.random() * 10,
    });
  }
  G.mission.enemiesLeft += count;
}

function spawnMissionCar(G, x, y, kind, color) {
  const car = createCar(x, y, -Math.PI / 2, kind, color);
  car.driver = 'mission';
  car.hp = 200;
  G.cars.push(car);
  return car;
}

export function updateMissions(G, dt) {
  if (!G.missionActive || !G.mission) return;
  const m = MISSIONS[G.mission.index];
  const st = G.mission;
  const s = m.stages[st.stage];
  if (!s) {
    completeMission(G, m);
    return;
  }
  const pos = playerPos(G);
  st.stageT += dt;

  switch (s.type) {
    case 'goto':
    case 'drive':
      if (dist(pos.x, pos.y, s.x, s.y) < s.r) advanceStage(G, m);
      else if (s.time && st.stageT > s.time) failStage(G, 'Too slow — the client walked away.');
      break;
    case 'pickup': {
      if (dist(pos.x, pos.y, s.x, s.y) < s.r) {
        st.progress += dt;
        if (st.progress > 1.5) {
          sfxPickup();
          advanceStage(G, m);
        }
      } else {
        st.progress = 0;
      }
      break;
    }
    case 'steal': {
      if (!st.spawned) {
        st.spawned = true;
        const kind = m.id === 'the-setup' ? 'truck' : 'sport';
        const color = m.id === 'the-setup' ? '#3a4a3a' : '#c23b2e';
        st.missionCar = spawnMissionCar(G, s.x, s.y, kind, color);
        G.message = 'There it is. Get in and go!';
        G.messageT = 3;
      }
      if (G.player.inCar === st.missionCar) {
        if (m.id === 'the-setup') G.wanted = Math.max(G.wanted, 2);
        advanceStage(G, m);
      }
      break;
    }
    case 'deliver': {
      if (G.player.inCar && dist(pos.x, pos.y, s.x, s.y) < s.r) advanceStage(G, m);
      break;
    }
    case 'survive': {
      const left = s.seconds - st.stageT;
      if (left <= 0) advanceStage(G, m);
      break;
    }
    case 'holdout': {
      if (!st.spawned) {
        st.spawned = true;
        spawnCrew(G, s.x, s.y, m.id === 'sunset-job' ? 4 : 3);
        G.wanted = Math.max(G.wanted, m.id === 'sunset-job' ? 3 : 2);
      }
      if (st.stageT > 6 && G.mission.enemiesLeft < 2 && Math.random() < dt * 0.25) {
        spawnCrew(G, s.x, s.y, 1);
      }
      if (dist(pos.x, pos.y, s.x, s.y) > s.r + 120) {
        st.stageT = Math.max(0, st.stageT - dt * 2);
      }
      if (st.stageT >= s.seconds) advanceStage(G, m);
      break;
    }
    default:
      break;
  }

  updateEnemies(G, dt);
}

function advanceStage(G, m) {
  G.mission.stage += 1;
  G.mission.stageT = 0;
  G.mission.progress = 0;
  G.mission.spawned = false;
  const next = m.stages[G.mission.stage];
  if (next) {
    G.message = next.text;
    G.messageT = 3;
    sfxPickup();
  }
}

function failStage(G, reason) {
  G.message = 'Mission failed: ' + reason;
  G.messageT = 4;
  G.missionActive = false;
  G.mission = null;
  G.wanted = Math.min(G.wanted, 1);
}

function completeMission(G, m) {
  G.cash += m.reward;
  G.totalEarned += m.reward;
  G.bestCash = Math.max(G.bestCash, G.cash);
  G.completedMissions.push(m.id);
  G.missionIndex += 1;
  G.missionActive = false;
  G.mission = null;
  G.wanted = Math.max(0, G.wanted - 2);
  sfxMissionPass();
  G.message = 'MISSION PASSED — ' + m.title + '  +$' + m.reward;
  G.messageT = 5;
  G.banner = { text: 'MISSION PASSED', sub: m.title + '  +$' + m.reward, t: 3.5 };
  saveGame(G);
  if (G.missionIndex >= MISSIONS.length) {
    G.mode = 'finale';
    G.modeT = 0;
  }
}

function updateEnemies(G, dt) {
  const p = G.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  for (const ped of G.peds) {
    if (ped.state !== 'enemy') continue;
    const d = dist(ped.x, ped.y, px, py);
    ped.angle = Math.atan2(py - ped.y, px - ped.x);
    if (d > 320) {
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
    } else if (d < 180) {
      ped.x -= Math.cos(ped.angle) * ped.speed * 0.6 * dt;
      ped.y -= Math.sin(ped.angle) * ped.speed * 0.6 * dt;
    }
    ped.shootCd -= dt;
    if (ped.shootCd <= 0 && d < 520) {
      ped.shootCd = 1.1 + Math.random() * 0.7;
      enemyShoot(G, ped.x, ped.y, px, py, 9);
    }
    if (ped.hp <= 0 && ped.state === 'enemy') {
      ped.state = 'dead';
      ped.deadT = 0;
      if (G.mission) G.mission.enemiesLeft = Math.max(0, G.mission.enemiesLeft - 1);
    }
  }
}

// How many jobs of the six are still ahead of the player.
export function missionsRemaining(G) {
  return MISSIONS.length - G.missionIndex;
}
