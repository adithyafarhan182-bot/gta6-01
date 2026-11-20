// SUNSET BAY — shared tuning, palette and world constants.
// One clear job: every number the rest of the game agrees on lives here.

export const WORLD = { w: 3200, h: 3200 };

// City grid: roads run every 400 px, centred on these lines, 80 px wide.
export const PITCH = 400;
export const ROAD_W = 80;
export const ROAD_CENTERS = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];

// Golden-hour palette for a sun-soaked coastal city.
export const PALETTE = {
  asphalt: '#33373f',
  asphaltDark: '#2b2f36',
  roadLine: '#e8d27a',
  sidewalk: '#8f8a80',
  sidewalkEdge: '#6f6a60',
  grass: '#5f9e52',
  grassDark: '#548c48',
  sand: '#e6cf96',
  water: '#2b7ba6',
  waterDeep: '#1f5f84',
  parkPath: '#c9b48a',
  buildingRoof: ['#b0563a', '#7a6a9e', '#4a7d8c', '#a8894f', '#8c4a5e', '#5e7d4a'],
  buildingEdge: '#241f1c',
  pierWood: '#8a6b4a',
};

// Player / car / police tuning.
export const TUNE = {
  walkSpeed: 235,
  runSpeed: 335,
  playerRadius: 13,
  playerHp: 100,
  carAccel: 520,
  carBrake: 900,
  carReverse: 260,
  carMaxSpeed: 560,
  carTurn: 2.9,
  carGrip: 4.2,
  policeMaxSpeed: 600,
  bulletSpeed: 900,
  pistolDamage: 34,
  punchDamage: 12,
  punchRange: 34,
  wantedDecaySeconds: 9,
  paySprayCost: 200,
  hospitalFee: 150,
  bustFee: 300,
};

// Fixed places in Sunset Bay (world coordinates).
export const PLACES = {
  safehouse: { x: 600, y: 2600, name: "Riko's Safehouse" },
  mamaJunes: { x: 1400, y: 1400, name: "Mama June's Diner" },
  marina: { x: 2900, y: 1800, name: 'Marina' },
  docks: { x: 2900, y: 600, name: 'North Docks' },
  bank: { x: 1800, y: 1000, name: 'Bay Trust Bank' },
  warehouse: { x: 600, y: 600, name: 'Old Warehouse' },
  garage: { x: 1000, y: 2200, name: "Lou's Pay 'n Spray" },
  hospital: { x: 2200, y: 2600, name: 'Sunset General' },
  policeStation: { x: 2200, y: 1400, name: 'Bay PD Central' },
  pier: { x: 1600, y: 3080, name: 'Sunset Pier' },
  park: { x: 1000, y: 1800, name: 'Palm Park' },
};

// Car and pedestrian paint jobs, picked per vehicle at spawn.
export const CAR_COLORS = ['#c23b2e', '#2e6fc2', '#e8b73a', '#3aa655', '#7a4fa3', '#d8d8d8', '#22242a', '#e07b2e'];
export const PED_SHIRTS = ['#e8e4da', '#c23b2e', '#2e6fc2', '#3aa655', '#e8b73a', '#7a4fa3', '#e07b2e', '#4a7d8c'];

// Named districts, west to east, for the minimap and mission text.
export const DISTRICTS = ['Old Town', 'North Docks', 'Downtown', 'Marina', 'Palm Park', 'Beachfront'];

// 3D presentation tuning (three.js chase camera).
export const CAM3D = {
  fov: 62,
  footDist: 200,
  footHeight: 120,
  carDist: 260,
  carHeight: 150,
  lookAhead: 40,
  menuOrbitR: 1250,
  menuOrbitH: 620,
};

// Sunset in the west-southwest: warm light, long shadows.
export const SUN = {
  dir: { x: -0.82, y: 0.34, z: 0.42 },
  color: 0xffb066,
  skyTop: 0x6b5a9e,
  skyHorizon: 0xffb060,
  fog: 0xff9a5c,
};

// World units of height per building floor in 3D.
export const FLOOR_H = 17;

// Coordinate convention, shared by the 3D modules: the 2D game lives in
// x,y on a 3200 x 3200 plane; three.js renders it as x,0,y (the game's y
// becomes three.js z), and a 2D heading theta becomes rotation.y = -theta.
