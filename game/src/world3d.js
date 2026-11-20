// SUNSET BAY — the 3D city: sky, sun, ground, roads, buildings, palms,
// lamps, beach, water and the pier, all built once from the fixed city.
// One clear job: turn G.city (the 2D layout) into a three.js scene that
// reads as a real sun-soaked coastal city at golden hour.

import * as THREE from 'three';
import { WORLD, ROAD_CENTERS, PALETTE, SUN, FLOOR_H } from './config.js';

// 2D world (x, y) maps to three.js (x, 0, y): the city's y becomes z.
function v3(x, y, h) {
  return new THREE.Vector3(x, h || 0, y);
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A building facade: warm plaster, a grid of windows, some lit by sunset.
// Drawn as a tile: the material repeats it 2x2 over each face.
function facadeTexture(base, lit) {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,0.10)');
    grad.addColorStop(1, 'rgba(0,0,0,0.22)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 6; col++) {
        const x = 8 + col * 42;
        const y = 8 + row * 25;
        const isLit = Math.random() < lit;
        g.fillStyle = isLit ? '#ffd27a' : '#2a3542';
        g.fillRect(x, y, 28, 17);
        g.fillStyle = 'rgba(255,255,255,0.25)';
        g.fillRect(x, y, 28, 3);
      }
    }
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, h - 8, w, 8);
  });
}

// A rooftop: pale slab, darker parapet edge and a few vent boxes, so the
// roofs read as roofs instead of flat colour from the chase camera.
function roofTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#c9c4bb';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.4)';
    g.lineWidth = 8;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(22, 24, 26, 18);
    g.fillRect(78, 60, 22, 26);
    g.fillRect(30, 84, 18, 14);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(22, 24, 26, 4);
  });
}

// Asphalt with a dashed centre line and pale sidewalk bands at the edges.
function roadTexture() {
  return canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#8f8a80';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#33373f';
    g.fillRect(0, 8, w, h - 16);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 40; i++) {
      g.fillRect(Math.random() * w, 8 + Math.random() * (h - 16), 3, 2);
    }
    g.fillStyle = '#e8d27a';
    // Four short dashes per tile (tile = 256 world units): each dash is
    // about 30 long, as on the 2D map, not one long slab.
    for (const dx of [8, 72, 136, 200]) {
      g.fillRect(dx, h / 2 - 2, 30, 4);
    }
  });
}

// Sand with soft ripples; water with pale wave streaks.
function sandTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#e6cf96';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(180,150,90,0.35)';
    g.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      g.beginPath();
      const y = Math.random() * h;
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + 6, w * 0.6, y - 6, w, y + 3);
      g.stroke();
    }
  });
}

function waterTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#2b7ba6';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.2)';
    g.lineWidth = 2;
    for (let i = 0; i < 34; i++) {
      const y = Math.random() * h;
      const x = Math.random() * w;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 24 + Math.random() * 36, y);
      g.stroke();
    }
  });
}

// Grass with faint patchy noise so the ground is not one flat colour.
function grassTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#5f9e52';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, 4 + Math.random() * 14, 0, Math.PI * 2);
      g.fill();
    }
  });
}

// Wooden planks for the pier and marina docks.
function plankTexture() {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = '#8a6b4a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 2;
    for (let y = 0; y < h; y += 24) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,0.15)';
    g.fillRect(0, 0, 4, h);
    g.fillRect(w - 4, 0, 4, h);
  });
}

function skyMaterial() {
  const top = new THREE.Color(SUN.skyTop);
  const horizon = new THREE.Color(SUN.skyHorizon);
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: top }, horizon: { value: horizon } },
    vertexShader: 'varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 horizon; void main() { float t = clamp(normalize(vP).y * 2.6 + 0.18, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(t, 0.7)), 1.0); }',
  });
}

function glowTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255, 220, 160, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 170, 90, 0.45)');
    grad.addColorStop(1, 'rgba(255, 150, 60, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

export function buildWorld3d(G) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SUN.fog, 1200, 4200);

  // Sky dome + low sun disc + glow, following the camera focus.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3600, 24, 14), skyMaterial());
  scene.add(sky);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(150, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe9b0, fog: false })
  );
  scene.add(sunDisc);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), transparent: true, depthWrite: false, fog: false,
  }));
  sunGlow.scale.set(900, 900, 1);
  scene.add(sunGlow);

  // Golden-hour key light (warm, low, long shadows) + sky bounce.
  const sun = new THREE.DirectionalLight(SUN.color, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -480;
  sun.shadow.camera.right = 480;
  sun.shadow.camera.top = 480;
  sun.shadow.camera.bottom = -480;
  sun.shadow.camera.near = 50;
  sun.shadow.camera.far = 2600;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0xffd9a0, 0x33404f, 0.9));

  // Ground.
  const grassTex = grassTexture();
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(10, 10);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.w, WORLD.h),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD.w / 2, 0, WORLD.h / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  // Roads: one asphalt plane per road line, sidewalks baked into the texture.
  const roadTex = roadTexture();
  roadTex.wrapS = THREE.RepeatWrapping;
  roadTex.repeat.set(3200 / 256, 1);
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 });
  const roadGeoH = new THREE.PlaneGeometry(WORLD.w, 104);
  const roadGeoV = new THREE.PlaneGeometry(104, WORLD.h);
  for (const c of ROAD_CENTERS) {
    const hRoad = new THREE.Mesh(roadGeoH, roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(WORLD.w / 2, 0.15, c);
    hRoad.receiveShadow = true;
    scene.add(hRoad);
    const vRoad = new THREE.Mesh(roadGeoV, roadMat);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.rotation.z = Math.PI / 2;
    vRoad.position.set(c, 0.15, WORLD.h / 2);
    vRoad.receiveShadow = true;
    scene.add(vRoad);
  }

  // Palm Park: darker lawn with two pale paths.
  const park = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 320),
    new THREE.MeshStandardMaterial({ color: 0x548c48, roughness: 1 })
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(1200, 0.12, 2000);
  park.receiveShadow = true;
  scene.add(park);
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 1 });
  const pathH = new THREE.Mesh(new THREE.PlaneGeometry(320, 12), pathMat);
  pathH.rotation.x = -Math.PI / 2;
  pathH.position.set(1200, 0.18, 2000);
  scene.add(pathH);
  const pathV = new THREE.Mesh(new THREE.PlaneGeometry(12, 320), pathMat);
  pathV.rotation.x = -Math.PI / 2;
  pathV.position.set(1200, 0.18, 2000);
  scene.add(pathV);

  // Beach sand and the bay water (south) + marina water (east).
  const sandTex = sandTexture();
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
  sandTex.repeat.set(8, 1);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.w, 200),
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(WORLD.w / 2, 0.12, 2980);
  sand.receiveShadow = true;
  scene.add(sand);
  const waterTex = waterTexture();
  waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
  waterTex.repeat.set(6, 1);
  const waterMat = new THREE.MeshPhongMaterial({
    map: waterTex, color: 0x9fd0e8, shininess: 140, specular: 0xffe0b0,
  });
  // The bay runs past the world's edge to the horizon, so the sea meets
  // the sky instead of ending in a hard line. It starts at the waterline
  // (z = 3060), never under the beach road or the sand.
  const waterS = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.w, 540), waterMat);
  waterS.rotation.x = -Math.PI / 2;
  waterS.position.set(WORLD.w / 2, 0.4, 3330);
  scene.add(waterS);
  const waterE = new THREE.Mesh(new THREE.PlaneGeometry(560, 900), waterMat.clone());
  waterE.rotation.x = -Math.PI / 2;
  waterE.position.set(3320, 0.4, 2050);
  scene.add(waterE);

  // Pier and marina docks.
  const plankTex = plankTexture();
  plankTex.wrapS = plankTex.wrapT = THREE.RepeatWrapping;
  const plankMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.9 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(80, 8, 240), plankMat);
  pier.position.set(1600, 3, 3040);
  pier.castShadow = true;
  pier.receiveShadow = true;
  scene.add(pier);
  for (const d of G.city.docks) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(d.w, 6, d.h), plankMat);
    dock.position.set(d.x + d.w / 2, 2, d.y + d.h / 2);
    dock.castShadow = true;
    scene.add(dock);
  }

  // Buildings: instanced bodies with lit-window facades + instanced roof caps.
  const facades = [
    facadeTexture('#d8cfc0', 0.45),
    facadeTexture('#c4b8a8', 0.3),
    facadeTexture('#e0d8c8', 0.55),
  ];
  // Tile each facade 2x2 over a face so windows stay small and square-ish
  // on wide buildings instead of stretching into long bars.
  for (const tex of facades) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
  }
  const buildings = G.city.buildings;
  const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
  const capGeo = new THREE.BoxGeometry(1, 1, 1);
  const capMat = new THREE.MeshStandardMaterial({ map: roofTexture(), roughness: 0.95 });
  const bodyMeshes = facades.map((tex) => {
    const m = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), buildings.length);
    m.castShadow = true;
    m.receiveShadow = true;
    m.count = 0;
    m.frustumCulled = false;
    scene.add(m);
    return m;
  });
  const capMesh = new THREE.InstancedMesh(capGeo, capMat, buildings.length);
  capMesh.castShadow = true;
  capMesh.receiveShadow = true;
  capMesh.count = 0;
  capMesh.frustumCulled = false;
  scene.add(capMesh);
  const m4 = new THREE.Matrix4();
  const q0 = new THREE.Quaternion();
  const tint = new THREE.Color();
  const tints = [0xffffff, 0xffe9d2, 0xdfe9ff, 0xfff2df];
  buildings.forEach((b, i) => {
    const h3 = 26 + b.height * FLOOR_H;
    const mesh = bodyMeshes[i % facades.length];
    const k = mesh.count++;
    m4.compose(
      v3(b.x + b.w / 2, b.y + b.h / 2, h3 / 2),
      q0,
      new THREE.Vector3(b.w, h3, b.h)
    );
    mesh.setMatrixAt(k, m4);
    mesh.setColorAt(k, tint.setHex(tints[i % tints.length]));
    const kc = capMesh.count++;
    m4.compose(
      v3(b.x + b.w / 2, b.y + b.h / 2, h3 + 1.5),
      q0,
      new THREE.Vector3(b.w + 6, 3, b.h + 6)
    );
    capMesh.setMatrixAt(kc, m4);
    capMesh.setColorAt(kc, tint.set(b.color));
  });
  for (const mesh of bodyMeshes) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  capMesh.instanceMatrix.needsUpdate = true;
  if (capMesh.instanceColor) capMesh.instanceColor.needsUpdate = true;

  // Palm trees and park trees: instanced trunks + crowns.
  const trees = G.city.trees;
  const trunkMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(3, 4.5, 30, 6),
    new THREE.MeshStandardMaterial({ color: 0x7a5a34, roughness: 1 }),
    trees.length
  );
  trunkMesh.castShadow = true;
  trunkMesh.frustumCulled = false;
  const crownMesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(17, 0),
    new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 1, flatShading: true }),
    trees.length
  );
  crownMesh.castShadow = true;
  crownMesh.frustumCulled = false;
  scene.add(trunkMesh);
  scene.add(crownMesh);
  trees.forEach((t, i) => {
    const palm = t.palm;
    const trunkH = palm ? 34 : 26;
    m4.compose(
      v3(t.x, t.y, trunkH / 2),
      q0,
      new THREE.Vector3(1, trunkH / 30, 1)
    );
    trunkMesh.setMatrixAt(i, m4);
    m4.compose(
      v3(t.x, t.y, trunkH + 8),
      q0,
      new THREE.Vector3(1, palm ? 0.45 : 0.7, 1)
    );
    crownMesh.setMatrixAt(i, m4);
    crownMesh.setColorAt(i, tint.setHex(palm ? 0x4c9a42 : 0x3c7d33));
  });
  trunkMesh.instanceMatrix.needsUpdate = true;
  crownMesh.instanceMatrix.needsUpdate = true;
  if (crownMesh.instanceColor) crownMesh.instanceColor.needsUpdate = true;

  // Street lamps along every road, glowing warm at dusk.
  const lampSpots = [];
  for (const c of ROAD_CENTERS) {
    for (let v = 200; v <= 3000; v += 400) {
      lampSpots.push({ x: c + 56, y: v });
      lampSpots.push({ x: v, y: c - 56 });
    }
  }
  const poleMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1.6, 2.2, 56, 6),
    new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.8, metalness: 0.4 }),
    lampSpots.length
  );
  poleMesh.frustumCulled = false;
  const headMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(6, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffc46a, emissiveIntensity: 1.6 }),
    lampSpots.length
  );
  headMesh.frustumCulled = false;
  scene.add(poleMesh);
  scene.add(headMesh);
  lampSpots.forEach((s, i) => {
    m4.compose(v3(s.x, s.y, 28), q0, new THREE.Vector3(1, 1, 1));
    poleMesh.setMatrixAt(i, m4);
    m4.compose(v3(s.x, s.y, 58), q0, new THREE.Vector3(1, 0.7, 1));
    headMesh.setMatrixAt(i, m4);
  });
  poleMesh.instanceMatrix.needsUpdate = true;
  headMesh.instanceMatrix.needsUpdate = true;

  // Slow-drifting clouds, warm-lit from below.
  const cloudMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(60, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd9c2, transparent: true, opacity: 0.6, roughness: 1 }),
    14
  );
  cloudMesh.frustumCulled = false;
  scene.add(cloudMesh);
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    clouds.push({
      x: 200 + Math.random() * 2800,
      y: 380 + Math.random() * 140,
      z: 200 + Math.random() * 2800,
      s: 2.2 + Math.random() * 2.4,
      drift: 4 + Math.random() * 5,
    });
  }

  return {
    scene, sun, sunDisc, sunGlow, waterTex, cloudMesh, clouds,
    sunDir: new THREE.Vector3(SUN.dir.x, SUN.dir.y, SUN.dir.z).normalize(),
  };
}

export function updateWorld3d(W, G) {
  // Water shimmer scrolls with time; clouds drift east and wrap.
  W.waterTex.offset.x = (G.time * 0.008) % 1;
  W.waterTex.offset.y = (G.time * 0.004) % 1;
  const m4 = new THREE.Matrix4();
  const q0 = new THREE.Quaternion();
  W.clouds.forEach((c, i) => {
    c.x += c.drift * 0.016;
    if (c.x > 3300) c.x = -100;
    m4.compose(
      new THREE.Vector3(c.x, c.y, c.z),
      q0,
      new THREE.Vector3(c.s, c.s * 0.32, c.s)
    );
    W.cloudMesh.setMatrixAt(i, m4);
  });
  W.cloudMesh.instanceMatrix.needsUpdate = true;

  // Sun, glow and key light follow the camera focus so the sunset is
  // always in the same golden direction wherever the player drives.
  const fx = G.camera.x;
  const fz = G.camera.y;
  const d = W.sunDir;
  W.sunDisc.position.set(fx + d.x * 3000, 420, fz + d.z * 3000);
  W.sunDisc.lookAt(fx, 420, fz);
  W.sunGlow.position.set(fx + d.x * 2900, 430, fz + d.z * 2900);
  W.sun.position.set(fx + d.x * 900, 320, fz + d.z * 900);
  W.sun.target.position.set(fx, 0, fz);
  W.sun.target.updateMatrixWorld();
}
