// SUNSET BAY — the 3D camera: a chase camera behind Riko (on foot or in
// a car), a slow orbit around the city behind the start menu, and the
// mouse ray that turns a screen click into a ground point for aiming.
// One clear job: where the camera sits and what the mouse points at.

import * as THREE from 'three';
import { CAM3D } from './config.js';

export function createCamera3d() {
  const camera = new THREE.PerspectiveCamera(
    CAM3D.fov,
    window.innerWidth / Math.max(1, window.innerHeight),
    1,
    8000
  );
  camera.position.set(1600, 500, 400);
  return {
    camera,
    raycaster: new THREE.Raycaster(),
    look: new THREE.Vector3(1600, 0, 1600),
    started: false,
  };
}

// 2D heading (atan2 in x,y) -> three.js forward (x, 0, z).
function forwardOf(angle) {
  return { x: Math.cos(angle), z: Math.sin(angle) };
}

// Tallest building top under a ground point, or 0 when the point is on a
// street — the chase camera lifts over rooftops instead of clipping in.
function buildingTopAt(G, x, z) {
  let top = 0;
  for (const b of G.city.buildings) {
    if (x >= b.x && x <= b.x + b.w && z >= b.y && z <= b.y + b.h) {
      top = Math.max(top, 26 + b.height * 17 + 5);
    }
  }
  return top;
}

export function updateCamera3d(G, C) {
  const dt = G.frameDt || 1 / 60;
  const cam = C.camera;
  const k = 1 - Math.exp(-4.5 * dt);

  if (G.mode === 'menu') {
    // Establishing shot: slow orbit over the whole city at sunset.
    const a = G.time * 0.045;
    const cx = 1600 + Math.cos(a) * CAM3D.menuOrbitR;
    const cz = 1600 + Math.sin(a) * CAM3D.menuOrbitR;
    const desired = new THREE.Vector3(cx, CAM3D.menuOrbitH, cz);
    if (!C.started) {
      cam.position.copy(desired);
      C.started = true;
    } else {
      cam.position.lerp(desired, 1 - Math.exp(-1.2 * dt));
    }
    C.look.lerp(new THREE.Vector3(1600, 30, 1600), 1 - Math.exp(-2 * dt));
    cam.lookAt(C.look);
    setVisibleSize(G, C);
    return;
  }

  const p = G.player;
  const driving = !!p.inCar;
  const heading = driving ? p.inCar.angle : p.angle;
  const speedRatio = driving ? Math.min(1, Math.abs(p.inCar.speed) / 560) : 0;
  const dist = (driving ? CAM3D.carDist : CAM3D.footDist) + speedRatio * 40;
  const height = (driving ? CAM3D.carHeight : CAM3D.footHeight) + speedRatio * 20;
  const fwd = forwardOf(heading);
  const fx = G.camera.x;
  const fz = G.camera.y;
  const desired = new THREE.Vector3(
    fx - fwd.x * dist,
    Math.max(height, buildingTopAt(G, fx - fwd.x * dist, fz - fwd.z * dist) + 45),
    fz - fwd.z * dist
  );
  if (!C.started) {
    cam.position.copy(desired);
    C.look.set(fx + fwd.x * CAM3D.lookAhead, 18, fz + fwd.z * CAM3D.lookAhead);
    C.started = true;
  } else {
    cam.position.lerp(desired, k);
  }
  const lookTarget = new THREE.Vector3(
    fx + fwd.x * CAM3D.lookAhead,
    18,
    fz + fwd.z * CAM3D.lookAhead
  );
  C.look.lerp(lookTarget, 1 - Math.exp(-6 * dt));
  cam.lookAt(C.look);
  setVisibleSize(G, C);
}

// How much world the camera sees at the focus plane, for the minimap box.
function setVisibleSize(G, C) {
  const cam = C.camera;
  const d = cam.position.distanceTo(new THREE.Vector3(G.camera.x, 0, G.camera.y));
  const halfH = Math.tan((cam.fov * Math.PI) / 360) * d;
  G.view.worldH = halfH * 2;
  G.view.worldW = G.view.worldH * cam.aspect;
}

// Mouse position (screen pixels) -> point on the ground plane y = 0.
export function screenToGround(C, G, sx, sy) {
  const ndc = new THREE.Vector2(
    (sx / G.view.w) * 2 - 1,
    -(sy / G.view.h) * 2 + 1
  );
  C.raycaster.setFromCamera(ndc, C.camera);
  const ray = C.raycaster.ray;
  if (Math.abs(ray.direction.y) < 0.0001) {
    return { x: G.player.x, y: G.player.y };
  }
  const t = -ray.origin.y / ray.direction.y;
  if (t < 0) return { x: G.player.x, y: G.player.y };
  return {
    x: ray.origin.x + ray.direction.x * t,
    y: ray.origin.z + ray.direction.z * t,
  };
}
