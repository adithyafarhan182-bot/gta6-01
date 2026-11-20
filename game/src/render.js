// SUNSET BAY — everything you see, in 3D: the city, the cars, the people.
// One clear job: own the three.js renderer and, every frame, advance the
// world (water, clouds, sun), sync the actors and place the camera, then
// draw. The game logic still lives in 2D x,y; this module is the only
// place that knows about three.js.

import * as THREE from 'three';
import { buildWorld3d, updateWorld3d } from './world3d.js';
import { createActors, syncActors } from './actors3d.js';
import { createCamera3d, updateCamera3d, screenToGround } from './camera3d.js';

let R = null;

function init(G) {
  const canvas = document.getElementById('game');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch (err) {
    const status = document.getElementById('status');
    if (status) status.textContent = 'SUNSET BAY needs WebGL to play — please open it in desktop Chrome.';
    throw err;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const world = buildWorld3d(G);
  const cam3d = createCamera3d();
  const actors = createActors(G, world.scene);
  G.screenToGround = (sx, sy) => screenToGround(cam3d, G, sx, sy);
  G.__cam3d = cam3d;
  R = { renderer, world, cam3d, actors };
  resizeRenderer(G);
}

export function resizeRenderer(G) {
  if (!R) return;
  R.renderer.setSize(G.view.w, G.view.h, false);
  R.cam3d.camera.aspect = G.view.w / Math.max(1, G.view.h);
  R.cam3d.camera.updateProjectionMatrix();
}

export function render(G) {
  if (!R) init(G);
  updateWorld3d(R.world, G);
  syncActors(R.actors, G);
  updateCamera3d(G, R.cam3d);
  R.renderer.render(R.world.scene, R.cam3d.camera);
}
