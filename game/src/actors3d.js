// SUNSET BAY — the moving cast in 3D: cars, Riko on foot, pedestrians,
// bullets, particles, skid marks and the mission beacon.
// One clear job: keep a three.js mesh for every game entity and sync it
// from the 2D game state each frame. (2D x,y -> three.js x,0,y; an angle
// theta becomes rotation.y = -theta.)

import * as THREE from 'three';

const CAR_DIMS = {
  sedan: { len: 48, wid: 24 },
  sport: { len: 48, wid: 24 },
  taxi: { len: 48, wid: 24 },
  truck: { len: 62, wid: 26 },
  police: { len: 48, wid: 24 },
};

const MAX_PEDS = 48;
const MAX_BULLETS = 64;
const MAX_PARTICLES = 128;
const MAX_SKIDS = 220;
const MAX_WHEELS = 256; // 4 wheels per car, room for ~60 cars on the road.

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

function setInstance(mesh, i, x, y, z, rotY, sx, sy, sz) {
  _e.set(0, rotY, 0);
  _q.setFromEuler(_e);
  _v.set(x, y, z);
  _s.set(sx, sy, sz);
  _m4.compose(_v, _q, _s);
  mesh.setMatrixAt(i, _m4);
}

function makeCarGroup(car) {
  const dims = CAR_DIMS[car.kind] || CAR_DIMS.sedan;
  const { len, wid } = dims;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(car.color), metalness: 0.4, roughness: 0.45,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(len, 10, wid), bodyMat);
  body.position.y = 8;
  body.castShadow = true;
  g.add(body);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x18242f, metalness: 0.7, roughness: 0.22,
  });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(len * 0.42, 8, wid * 0.78), glassMat);
  cabin.position.set(-3, 16, 0);
  cabin.castShadow = true;
  g.add(cabin);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xffe9a8, emissive: 0xffdf8a, emissiveIntensity: 2.2,
  });
  for (const z of [-wid / 2 + 4, wid / 2 - 4]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 5), lightMat);
    hl.position.set(len / 2 - 1, 8, z);
    g.add(hl);
    const tl = new THREE.Mesh(
      new THREE.BoxGeometry(2, 3, 5),
      new THREE.MeshStandardMaterial({ color: 0x881111, emissive: 0xff2222, emissiveIntensity: 1.2 })
    );
    tl.position.set(-len / 2 + 1, 8, z);
    g.add(tl);
  }
  if (car.kind === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(10, 3, wid * 0.55), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }));
    bar.position.set(-3, 21, 0);
    g.add(bar);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3, wid * 0.24),
      new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 3 })
    );
    red.position.set(-3, 22, -wid * 0.14);
    g.add(red);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3, wid * 0.24),
      new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 3 })
    );
    blue.position.set(-3, 22, wid * 0.14);
    g.add(blue);
    g.userData.strobe = { red, blue };
  }
  if (car.kind === 'taxi') {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(12, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd640, emissive: 0xcc9900, emissiveIntensity: 0.8 })
    );
    sign.position.set(-3, 21, 0);
    g.add(sign);
  }
  g.userData.bodyMat = bodyMat;
  g.userData.dims = dims;
  return g;
}

function makePlayerFigure() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0x1f8f8a, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23232c, roughness: 0.9 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(5, 13, 5), dark);
  legL.position.set(0, 6.5, -4);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(5, 13, 5), dark);
  legR.position.set(0, 6.5, 4);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(8, 9, 18, 10), jacket);
  torso.position.y = 22;
  const head = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 10), skin);
  head.position.y = 35;
  const gun = new THREE.Mesh(new THREE.BoxGeometry(14, 3, 3), dark);
  gun.position.set(10, 24, 0);
  for (const m of [legL, legR, torso, head, gun]) m.castShadow = true;
  g.add(legL, legR, torso, head, gun);
  g.userData.legL = legL;
  g.userData.legR = legR;
  g.userData.gun = gun;
  return g;
}

export function createActors(G, scene) {
  const A = { scene, cars: new Map() };

  // Wheels: one instanced mesh for every wheel of every car.
  const wheelGeo = new THREE.CylinderGeometry(6, 6, 4, 12);
  wheelGeo.rotateX(Math.PI / 2);
  A.wheels = new THREE.InstancedMesh(
    wheelGeo,
    new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9 }),
    MAX_WHEELS
  );
  A.wheels.castShadow = true;
  A.wheels.frustumCulled = false;
  A.wheels.count = 0;
  scene.add(A.wheels);

  // Riko on foot.
  A.player = makePlayerFigure();
  scene.add(A.player);

  // Pedestrians: instanced bodies, heads and enemy markers.
  A.pedBodies = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(7, 8, 17, 8),
    new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    MAX_PEDS
  );
  A.pedBodies.castShadow = true;
  A.pedBodies.frustumCulled = false;
  A.pedBodies.count = 0;
  scene.add(A.pedBodies);
  A.pedHeads = new THREE.InstancedMesh(
    new THREE.SphereGeometry(5, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 }),
    MAX_PEDS
  );
  A.pedHeads.castShadow = true;
  A.pedHeads.frustumCulled = false;
  A.pedHeads.count = 0;
  scene.add(A.pedHeads);
  A.pedMarks = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(6),
    new THREE.MeshStandardMaterial({ color: 0xff2e2e, emissive: 0xff2e2e, emissiveIntensity: 2 }),
    MAX_PEDS
  );
  A.pedMarks.frustumCulled = false;
  A.pedMarks.count = 0;
  scene.add(A.pedMarks);

  // Bullets: glowing tracers.
  A.bullets = new THREE.InstancedMesh(
    new THREE.BoxGeometry(8, 2, 2),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
    MAX_BULLETS
  );
  A.bullets.frustumCulled = false;
  A.bullets.count = 0;
  scene.add(A.bullets);

  // Particles: sparks and smoke, tinted per instance.
  A.particles = new THREE.InstancedMesh(
    new THREE.SphereGeometry(3, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 }),
    MAX_PARTICLES
  );
  A.particles.frustumCulled = false;
  A.particles.count = 0;
  scene.add(A.particles);

  // Skid marks: dark decals on the asphalt.
  A.skids = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(22, 6),
    new THREE.MeshBasicMaterial({ color: 0x0f0f12, transparent: true, opacity: 0.4 }),
    MAX_SKIDS
  );
  A.skids.frustumCulled = false;
  A.skids.count = 0;
  scene.add(A.skids);

  // Mission beacon: light beam + a wider faint halo + ground ring +
  // floating diamond. The beam has to read against an orange sky.
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffd640, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
  });
  A.beam = new THREE.Mesh(new THREE.CylinderGeometry(13, 20, 320, 12, 1, true), beamMat);
  A.beam.position.y = 160;
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffd640, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false,
  });
  A.halo = new THREE.Mesh(new THREE.CylinderGeometry(34, 46, 320, 12, 1, true), haloMat);
  A.halo.position.y = 160;
  A.ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1, 40),
    new THREE.MeshBasicMaterial({ color: 0xffd640, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  A.ring.rotation.x = -Math.PI / 2;
  A.ring.position.y = 0.6;
  A.diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(13),
    new THREE.MeshStandardMaterial({ color: 0xffd640, emissive: 0xffb800, emissiveIntensity: 1.4 })
  );
  A.marker = new THREE.Group();
  A.marker.add(A.beam, A.halo, A.ring, A.diamond);
  A.marker.visible = false;
  scene.add(A.marker);

  // One strobe light shared by the nearest police car — red/blue flash.
  A.strobe = new THREE.PointLight(0xff2222, 0, 420, 1.6);
  scene.add(A.strobe);

  return A;
}

function syncCars(A, G) {
  const seen = new Set();
  let wheelCount = 0;
  let firstPolice = null;
  for (const car of G.cars) {
    seen.add(car.id);
    let grp = A.cars.get(car.id);
    if (!grp) {
      grp = makeCarGroup(car);
      A.cars.set(car.id, grp);
      A.scene.add(grp);
    }
    grp.position.set(car.x, 0, car.y);
    grp.rotation.y = -car.angle;
    if (car.wrecked) {
      grp.userData.bodyMat.color.setHex(0x3a3a3a);
    } else if (grp.userData.bodyMat.color.getHexString() !== new THREE.Color(car.color).getHexString()) {
      grp.userData.bodyMat.color.set(car.color);
    }
    const { len, wid } = grp.userData.dims;
    const wx = len / 2 - 9;
    const wz = wid / 2 - 1;
    for (const [ox, oz] of [[wx, wz], [wx, -wz], [-wx, wz], [-wx, -wz]]) {
      if (wheelCount >= MAX_WHEELS) break;
      const ca = Math.cos(car.angle);
      const sa = Math.sin(car.angle);
      const px = car.x + ox * ca - oz * sa;
      const pz = car.y + ox * sa + oz * ca;
      setInstance(A.wheels, wheelCount++, px, 6, pz, -car.angle, 1, 1, 1);
    }
    if (car.driver === 'police' && !firstPolice) firstPolice = car;
    if (grp.userData.strobe) {
      const flash = Math.floor(G.time * 6) % 2 === 0;
      grp.userData.strobe.red.material.emissiveIntensity = flash ? 3.5 : 0.4;
      grp.userData.strobe.blue.material.emissiveIntensity = flash ? 0.4 : 3.5;
    }
  }
  A.wheels.count = wheelCount;
  A.wheels.instanceMatrix.needsUpdate = true;
  for (const [id, grp] of A.cars) {
    if (!seen.has(id)) {
      A.scene.remove(grp);
      A.cars.delete(id);
    }
  }
  if (firstPolice) {
    const flash = Math.floor(G.time * 6) % 2 === 0;
    A.strobe.color.setHex(flash ? 0xff2222 : 0x2244ff);
    A.strobe.intensity = 60;
    A.strobe.position.set(firstPolice.x, 40, firstPolice.y);
  } else {
    A.strobe.intensity = 0;
  }
}

function syncPlayer(A, G) {
  const p = G.player;
  const fig = A.player;
  if (p.inCar) {
    fig.visible = false;
    return;
  }
  fig.visible = true;
  fig.position.set(p.x, 0, p.y);
  fig.rotation.y = -p.angle;
  const swing = p.moving ? Math.sin(p.walkPhase) * 0.55 : 0;
  fig.userData.legL.rotation.x = swing;
  fig.userData.legR.rotation.x = -swing;
  fig.userData.gun.visible = !!p.pistol;
  fig.userData.gun.rotation.y = -(p.aim - p.angle);
}

function syncPeds(A, G) {
  let n = 0;
  let marks = 0;
  for (const ped of G.peds) {
    if (n >= MAX_PEDS) break;
    const dead = ped.state === 'dead';
    if (dead) {
      _e.set(Math.PI / 2, 0, ped.angle);
      _q.setFromEuler(_e);
      _v.set(ped.x, 4, ped.y);
      _s.set(1, 1, 1);
      _m4.compose(_v, _q, _s);
      A.pedBodies.setMatrixAt(n, _m4);
      A.pedBodies.setColorAt(n, _c.set(ped.shirt));
      setInstance(A.pedHeads, n, ped.x, 3, ped.y, 0, 0.01, 0.01, 0.01);
    } else {
      const bob = ped.state === 'walk' ? Math.sin(G.time * 8 + ped.seed * 7) * 1.2 : 0;
      setInstance(A.pedBodies, n, ped.x, 9 + bob * 0.3, ped.y, -ped.angle, 1, 1, 1);
      A.pedBodies.setColorAt(n, _c.set(ped.state === 'enemy' ? '#1c1c22' : ped.shirt));
      setInstance(A.pedHeads, n, ped.x + Math.cos(ped.angle) * 3, 21 + bob * 0.3, ped.y + Math.sin(ped.angle) * 3, 0, 1, 1, 1);
      if (ped.state === 'enemy' && marks < MAX_PEDS) {
        setInstance(A.pedMarks, marks++, ped.x, 34 + Math.sin(G.time * 3 + ped.seed) * 2, ped.y, 0, 1, 1, 1);
      }
    }
    n++;
  }
  A.pedBodies.count = n;
  A.pedBodies.instanceMatrix.needsUpdate = true;
  if (A.pedBodies.instanceColor) A.pedBodies.instanceColor.needsUpdate = true;
  A.pedHeads.count = n;
  A.pedHeads.instanceMatrix.needsUpdate = true;
  A.pedMarks.count = marks;
  A.pedMarks.instanceMatrix.needsUpdate = true;
}

function syncBullets(A, G) {
  let n = 0;
  for (const b of G.bullets) {
    if (n >= MAX_BULLETS) break;
    const a = Math.atan2(b.vy, b.vx);
    setInstance(A.bullets, n++, b.x, 14, b.y, -a, 1, 1, 1);
  }
  A.bullets.count = n;
  A.bullets.instanceMatrix.needsUpdate = true;
}

function syncParticles(A, G) {
  let n = 0;
  for (const pt of G.particles) {
    if (n >= MAX_PARTICLES) break;
    const frac = Math.max(0, Math.min(1, pt.life / pt.max));
    if (pt.kind === 'spark') {
      setInstance(A.particles, n, pt.x, 12, pt.y, 0, 1, 1, 1);
      A.particles.setColorAt(n, _c.setHex(0xffdc5a));
    } else if (pt.kind === 'smoke') {
      setInstance(A.particles, n, pt.x, 16 + (1 - frac) * 26, pt.y, 0, 2 + (1 - frac) * 4, 2 + (1 - frac) * 4, 2 + (1 - frac) * 4);
      A.particles.setColorAt(n, _c.setHex(0x777777));
    } else {
      setInstance(A.particles, n, pt.x, 20, pt.y, 0, 1.6, 1.6, 1.6);
      A.particles.setColorAt(n, _c.setHex(0xffe678));
    }
    n++;
  }
  A.particles.count = n;
  A.particles.instanceMatrix.needsUpdate = true;
  if (A.particles.instanceColor) A.particles.instanceColor.needsUpdate = true;
}

function syncSkids(A, G) {
  let n = 0;
  for (const s of G.skids) {
    if (n >= MAX_SKIDS) break;
    setInstance(A.skids, n++, s.x, 0.3, s.y, -s.angle, 1, 1, 1);
  }
  A.skids.count = n;
  A.skids.instanceMatrix.needsUpdate = true;
}

function syncMarker(A, G) {
  const target = G.__missionTarget ? G.__missionTarget() : null;
  if (!target) {
    A.marker.visible = false;
    return;
  }
  A.marker.visible = true;
  A.marker.position.set(target.x, 0, target.y);
  const pulse = 1 + Math.sin(G.time * 4) * 0.15;
  A.ring.scale.set(target.r * 0.4 * pulse, target.r * 0.4 * pulse, 1);
  A.diamond.position.y = 130 + Math.sin(G.time * 2.5) * 10;
  A.diamond.rotation.y = G.time * 1.5;
}

export function syncActors(A, G) {
  syncCars(A, G);
  syncPlayer(A, G);
  syncPeds(A, G);
  syncBullets(A, G);
  syncParticles(A, G);
  syncSkids(A, G);
  syncMarker(A, G);
}
