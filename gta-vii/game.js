/* =========================================================================
   GTA VII — Liberty Shores 3D
   A 3D open-world driving game built on Three.js / WebGL.
   Focus: graphics & lighting — PBR materials, soft shadows, dynamic
   day/night cycle, glowing-window city, fog, tone mapping, chase camera.
   ========================================================================= */
import * as THREE from "three";

// ----------------------------------------------------------------------------
// Layout constants (world units ~ meters)
// ----------------------------------------------------------------------------
const GRID = 8;          // city blocks per axis
const BLOCK = 40;        // block footprint
const ROAD = 14;         // road width
const PITCH = BLOCK + ROAD;
const TOTAL = GRID * PITCH + ROAD;
const HALF = TOTAL / 2;

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// road & block center lines (shared for X and Z)
const roadCenters = [];
const blockStarts = [];
for (let i = 0; i <= GRID; i++) roadCenters.push(-HALF + i * PITCH + ROAD / 2);
for (let i = 0; i < GRID; i++) blockStarts.push(-HALF + i * PITCH + ROAD);

// ----------------------------------------------------------------------------
// Renderer / scene / camera
// ----------------------------------------------------------------------------
const wrap = document.getElementById("game-wrap");
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
wrap.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.5, 2000);
camera.position.set(0, 30, -40);

// ----------------------------------------------------------------------------
// Sky dome (gradient shader)
// ----------------------------------------------------------------------------
const skyUniforms = {
  top: { value: new THREE.Color(0x1f5fa8) },
  bottom: { value: new THREE.Color(0xcfe8ff) },
  exponent: { value: 0.65 },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1200, 32, 16),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vDir;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDir = normalize(wp.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 top; uniform vec3 bottom; uniform float exponent;
      void main(){
        float t = pow(max(vDir.y, 0.0), exponent);
        gl_FragColor = vec4(mix(bottom, top, t), 1.0);
      }`,
  })
);
sky.frustumCulled = false;
scene.add(sky);

scene.fog = new THREE.Fog(0xbfe0ff, 120, 620);

// ----------------------------------------------------------------------------
// Lights
// ----------------------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0xdfefff, 0x4a4636, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2dc, 2.4);
sun.position.set(120, 180, 80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
const sc = sun.shadow.camera;
sc.near = 10; sc.far = 520;
// Tight frustum that travels with the player (sun tracks the car each frame),
// giving crisp shadows near the action instead of one blurry map for the whole city.
sc.left = -150; sc.right = 150; sc.top = 150; sc.bottom = -150;
sc.updateProjectionMatrix();
scene.add(sun);
scene.add(sun.target);

// ----------------------------------------------------------------------------
// Texture helpers (canvas-generated)
// ----------------------------------------------------------------------------
function makeGroundTexture() {
  const px = 2048;
  const cv = document.createElement("canvas");
  cv.width = cv.height = px;
  const g = cv.getContext("2d");
  const s = px / TOTAL;                       // world->pixel scale
  const W = (v) => (v + HALF) * s;            // world coord -> pixel

  // asphalt base
  g.fillStyle = "#23262e";
  g.fillRect(0, 0, px, px);
  // subtle asphalt noise
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(255,255,255,${rand(0, 0.025)})`;
    g.fillRect(rand(0, px), rand(0, px), 2, 2);
  }

  // sidewalks + plazas on each block
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const x = blockStarts[i], z = blockStarts[j];
      g.fillStyle = "#3c4049";                 // sidewalk
      g.fillRect(W(x), W(z), BLOCK * s, BLOCK * s);
      g.fillStyle = "#2f333b";                 // inner plaza
      g.fillRect(W(x + 3), W(z + 3), (BLOCK - 6) * s, (BLOCK - 6) * s);
    }
  }

  // lane markings along every road
  const drawDashes = (horizontal, center) => {
    g.strokeStyle = "rgba(255,205,70,0.85)";
    g.lineWidth = 2.5 * s;
    g.setLineDash([6 * s, 7 * s]);
    g.beginPath();
    if (horizontal) { g.moveTo(0, W(center)); g.lineTo(px, W(center)); }
    else { g.moveTo(W(center), 0); g.lineTo(W(center), px); }
    g.stroke();
    g.setLineDash([]);
    // white edge lines
    g.strokeStyle = "rgba(235,235,235,0.5)";
    g.lineWidth = 1.4 * s;
    [-ROAD / 2 + 1.5, ROAD / 2 - 1.5].forEach((off) => {
      g.beginPath();
      if (horizontal) { g.moveTo(0, W(center + off)); g.lineTo(px, W(center + off)); }
      else { g.moveTo(W(center + off), 0); g.lineTo(W(center + off), px); }
      g.stroke();
    });
  };
  roadCenters.forEach((c) => { drawDashes(true, c); drawDashes(false, c); });

  // crosswalks at intersections
  g.fillStyle = "rgba(235,235,235,0.55)";
  roadCenters.forEach((cx) => roadCenters.forEach((cz) => {
    for (let k = -2; k <= 2; k++) {
      g.fillRect(W(cx + k * 2.4), W(cz - ROAD / 2 - 3), 1.4 * s, 3 * s);
      g.fillRect(W(cx + k * 2.4), W(cz + ROAD / 2), 1.4 * s, 3 * s);
    }
  }));

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

// window emissive texture — one lit pane per tile
function makeWindowTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const g = cv.getContext("2d");
  g.fillStyle = "#0a0c10"; g.fillRect(0, 0, 64, 64);
  // randomly lit windows give a lived-in look
  g.fillStyle = "#ffd9a0";
  if (Math.random() > 0.35) {
    g.fillRect(10, 8, 44, 48);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ----------------------------------------------------------------------------
// Ground
// ----------------------------------------------------------------------------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(TOTAL, TOTAL),
  new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness: 0.95, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// thin curb border for depth
const curbMat = new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 1 });

// ----------------------------------------------------------------------------
// Buildings
// ----------------------------------------------------------------------------
const buildingFootprints = [];   // {minX,maxX,minZ,maxZ} for collision
const windowMaterials = [];      // to tweak emissive on day/night

const BUILDING_TINTS = [0x8a93a6, 0x9aa1ad, 0x7d8794, 0xa6a09a, 0x6f7a86, 0xb0a59a, 0x8f8a86];

function addBuilding(cx, cz, w, d, h, tint) {
  const winTex = makeWindowTexture();
  winTex.repeat.set(Math.max(2, Math.round(w / 3.5)), Math.max(3, Math.round(h / 3.5)));
  const winTexSide = winTex.clone();
  winTexSide.repeat.set(Math.max(2, Math.round(d / 3.5)), Math.max(3, Math.round(h / 3.5)));
  winTexSide.needsUpdate = true;

  const base = { color: tint, roughness: 0.78, metalness: 0.08,
    emissive: 0xffca66, emissiveIntensity: 0.0 };
  const matFB = new THREE.MeshStandardMaterial({ ...base, emissiveMap: winTex });
  const matLR = new THREE.MeshStandardMaterial({ ...base, emissiveMap: winTexSide });
  const matTop = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.9, metalness: 0.05 });
  windowMaterials.push(matFB, matLR);

  // BoxGeometry material order: +x,-x,+y,-y,+z,-z
  const mats = [matLR, matLR, matTop, matTop, matFB, matFB];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  mesh.position.set(cx, h / 2, cz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // rooftop detail
  if (Math.random() > 0.4) {
    const rw = rand(2, 5), rd = rand(2, 5), rh = rand(2, 6);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd),
      new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.9 }));
    roof.position.set(cx + rand(-w / 4, w / 4), h + rh / 2, cz + rand(-d / 4, d / 4));
    roof.castShadow = true;
    scene.add(roof);
  }

  buildingFootprints.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
}

function buildCity() {
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      // leave a couple of empty lots as parks/plazas
      const cx = blockStarts[i] + BLOCK / 2;
      const cz = blockStarts[j] + BLOCK / 2;
      if (Math.random() < 0.12) { addPark(cx, cz); continue; }

      const tint = BUILDING_TINTS[randInt(0, BUILDING_TINTS.length - 1)];
      // 1 large tower or 2-4 smaller buildings per block
      if (Math.random() < 0.45) {
        const w = rand(BLOCK * 0.5, BLOCK * 0.7);
        const d = rand(BLOCK * 0.5, BLOCK * 0.7);
        const h = rand(26, 78);
        addBuilding(cx, cz, w, d, h, tint);
      } else {
        const cells = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
        for (const [sx, sz] of cells) {
          if (Math.random() < 0.25) continue;
          const w = rand(11, 16), d = rand(11, 16);
          const h = rand(12, 46);
          addBuilding(cx + sx * BLOCK * 0.23, cz + sz * BLOCK * 0.23, w, d, h,
            BUILDING_TINTS[randInt(0, BUILDING_TINTS.length - 1)]);
        }
      }
    }
  }
}

function addPark(cx, cz) {
  const grass = new THREE.Mesh(
    new THREE.BoxGeometry(BLOCK - 6, 0.6, BLOCK - 6),
    new THREE.MeshStandardMaterial({ color: 0x2f7d3f, roughness: 1 })
  );
  grass.position.set(cx, 0.3, cz);
  grass.receiveShadow = true;
  scene.add(grass);
  // a few trees
  for (let t = 0; t < 5; t++) {
    const tx = cx + rand(-BLOCK / 3, BLOCK / 3);
    const tz = cz + rand(-BLOCK / 3, BLOCK / 3);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 4, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 1 }));
    trunk.position.set(tx, 2, tz); trunk.castShadow = true; scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(rand(2.4, 3.6), 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x357a3a, roughness: 1, flatShading: true }));
    leaves.position.set(tx, rand(4.5, 5.5), tz); leaves.castShadow = true; scene.add(leaves);
  }
}

// ----------------------------------------------------------------------------
// Car factory (shared geometry-from-boxes model)
// ----------------------------------------------------------------------------
function buildCarMesh(bodyColor, isPolice = false, withSpots = false) {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), bodyMat);
  body.position.y = 0.75; body.castShadow = true; g.add(body);

  // lower chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.4, 4.3),
    new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.8 }));
  chassis.position.y = 0.45; chassis.castShadow = true; g.add(chassis);

  // cabin
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f1115, roughness: 0.2, metalness: 0.3 });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.62, 2.0), cabinMat);
  cabin.position.set(0, 1.28, -0.15); cabin.castShadow = true; g.add(cabin);
  // windshield glass
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.5, 1.85),
    new THREE.MeshStandardMaterial({ color: 0x6fa8d8, roughness: 0.05, metalness: 0.9,
      transparent: true, opacity: 0.6 }));
  glass.position.set(0, 1.3, -0.15); g.add(glass);

  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 14);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 });
  const wheels = [];
  [[-1.0, 1.4], [1.0, 1.4], [-1.0, -1.4], [1.0, -1.4]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.5, z); w.castShadow = true; g.add(w); wheels.push(w);
  });

  // headlights (emissive) + spotlights (used at night)
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff6e0, emissiveIntensity: 1.4 });
  const spots = [];
  [-0.65, 0.65].forEach((x) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), hlMat);
    hl.position.set(x, 0.8, 2.1); g.add(hl);
    // Only the player's car gets real spotlights — keeps dynamic-light count low.
    if (withSpots) {
      const spot = new THREE.SpotLight(0xfff1d0, 0, 60, Math.PI / 6, 0.4, 1.2);
      spot.position.set(x, 0.9, 2.1);
      spot.target.position.set(x * 2, -2, 14);
      g.add(spot); g.add(spot.target);
      spots.push(spot);
    }
  });
  // tail lights
  const tlMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2200, emissiveIntensity: 0.6 });
  [-0.6, 0.6].forEach((x) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), tlMat);
    tl.position.set(x, 0.8, -2.1); g.add(tl);
  });

  // police lightbar
  let lightbar = null;
  if (isPolice) {
    lightbar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 }));
    red.position.x = -0.35;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x0033ff, emissive: 0x0033ff, emissiveIntensity: 2 }));
    blue.position.x = 0.35;
    lightbar.add(red, blue);
    lightbar.position.set(0, 1.68, -0.15);
    g.add(lightbar);
  }

  g.userData = { wheels, spots, tlMat, lightbar };
  return g;
}

// ----------------------------------------------------------------------------
// Player / traffic / police state
// ----------------------------------------------------------------------------
const CAR_COLORS = [0xe24a4a, 0x3f7fe2, 0x37b24d, 0xe2b33f, 0x9b59b6, 0xe8e8e8, 0x2c3e50, 0xff7f50, 0x16a085];

const player = {
  mesh: null, x: 0, z: 0, heading: 0, speed: 0,
  hp: 100,
};

let traffic = [];
let police = [];

function roadCellSpawn() {
  // pick a road center on one axis, random along the other
  const onX = Math.random() < 0.5;
  const c = roadCenters[randInt(1, GRID - 1)];
  const along = rand(-HALF + ROAD, HALF - ROAD);
  return onX
    ? { x: c, z: along, heading: rand(0, 1) < 0.5 ? 0 : Math.PI }
    : { x: along, z: c, heading: rand(0, 1) < 0.5 ? Math.PI / 2 : -Math.PI / 2 };
}

function spawnTraffic(n) {
  for (let i = 0; i < n; i++) {
    const s = roadCellSpawn();
    const m = buildCarMesh(CAR_COLORS[randInt(0, CAR_COLORS.length - 1)]);
    m.position.set(s.x, 0, s.z);
    m.rotation.y = s.heading;
    scene.add(m);
    traffic.push({ mesh: m, x: s.x, z: s.z, heading: s.heading, speed: rand(6, 14), axis: s.heading % Math.PI === 0 ? "x" : "z" });
  }
}

function spawnPolice() {
  const s = roadCellSpawn();
  const m = buildCarMesh(0x141d3a, true);
  m.position.set(s.x, 0, s.z);
  scene.add(m);
  police.push({ mesh: m, x: s.x, z: s.z, heading: s.heading, speed: 0, hp: 100 });
}

// ----------------------------------------------------------------------------
// Mission markers
// ----------------------------------------------------------------------------
let mission = null;
const missionText = document.getElementById("mission-text");
const marker = new THREE.Group();
{
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 4, 18, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  ring.position.y = 9;
  marker.add(ring);
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 30, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe98a, transparent: true, opacity: 0.5 })
  );
  core.position.y = 15; marker.add(core);
}
marker.visible = false;
scene.add(marker);

const MISSION_LABELS = [
  "הגע לנקודה הזוהרת",
  "משלוח דחוף — נהג אל היעד",
  "אסוף את החבילה והבא ליעד",
  "מרדף! הגע בזמן",
];

function newMission() {
  const type = randInt(0, 3);
  const s = roadCellSpawn();
  mission = {
    type,
    label: MISSION_LABELS[type],
    x: s.x, z: s.z,
    reward: [250, 400, 600, 500][type],
    timeLeft: type === 3 ? 22 : 0,
  };
  marker.position.set(s.x, 0, s.z);
  marker.visible = true;
  missionText.textContent = mission.label;
  flash("📍 משימה חדשה!");
}

function updateMission(dt) {
  if (!mission) return;
  if (mission.timeLeft > 0) {
    mission.timeLeft -= dt;
    missionText.textContent = `${mission.label} (${Math.ceil(mission.timeLeft)} ש׳)`;
    if (mission.timeLeft <= 0) { flash("⌛ נכשלת"); mission = null; marker.visible = false; setTimeout(newMission, 1400); return; }
  }
  const d = Math.hypot(player.x - mission.x, player.z - mission.z);
  if (d < 6) {
    money += mission.reward;
    flash(`+$${mission.reward} — הושלם!`);
    mission = null; marker.visible = false;
    setTimeout(newMission, 1300);
  }
}

// ----------------------------------------------------------------------------
// Input
// ----------------------------------------------------------------------------
const keys = {};
const normKey = (k) => ({ w: "ArrowUp", W: "ArrowUp", s: "ArrowDown", S: "ArrowDown",
  a: "ArrowLeft", A: "ArrowLeft", d: "ArrowRight", D: "ArrowRight" }[k] || k);
window.addEventListener("keydown", (e) => {
  const k = normKey(e.key);
  keys[k] = true;
  if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k)) e.preventDefault();
  if (k === "n" || k === "N") toggleDayNight();
  if (k === "c" || k === "C") cycleCamera();
}, { passive: false });
window.addEventListener("keyup", (e) => { keys[normKey(e.key)] = false; });

const isTouch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
if (isTouch) document.getElementById("touch-controls").classList.remove("hidden");
document.querySelectorAll(".tc").forEach((btn) => {
  const key = btn.dataset.key;
  const press = (e) => { e.preventDefault(); keys[key] = true; };
  const release = (e) => { e.preventDefault(); keys[key] = false; };
  ["touchstart", "mousedown"].forEach((ev) => btn.addEventListener(ev, press, { passive: false }));
  ["touchend", "mouseup", "mouseleave"].forEach((ev) => btn.addEventListener(ev, release, { passive: false }));
});

// ----------------------------------------------------------------------------
// Day / night
// ----------------------------------------------------------------------------
let isNight = false;
const dayNightBtn = document.getElementById("daynight");
dayNightBtn.addEventListener("click", toggleDayNight);

function applyDayNight() {
  if (isNight) {
    sun.intensity = 0.25;
    sun.color.set(0x4060a0);
    hemi.intensity = 0.28;
    hemi.color.set(0x2a3550); hemi.groundColor.set(0x0a0c14);
    renderer.toneMappingExposure = 1.15;
    skyUniforms.top.value.set(0x05070f);
    skyUniforms.bottom.value.set(0x182840);
    scene.fog.color.set(0x0a1020);
    scene.fog.near = 60; scene.fog.far = 420;
    windowMaterials.forEach((m) => { m.emissiveIntensity = 1.0; });
    setHeadlights(true);
    dayNightBtn.firstChild.textContent = "🌙 ";
  } else {
    sun.intensity = 2.4;
    sun.color.set(0xfff2dc);
    hemi.intensity = 0.9;
    hemi.color.set(0xdfefff); hemi.groundColor.set(0x4a4636);
    renderer.toneMappingExposure = 1.05;
    skyUniforms.top.value.set(0x1f5fa8);
    skyUniforms.bottom.value.set(0xcfe8ff);
    scene.fog.color.set(0xbfe0ff);
    scene.fog.near = 120; scene.fog.far = 620;
    windowMaterials.forEach((m) => { m.emissiveIntensity = 0.0; });
    setHeadlights(false);
    dayNightBtn.firstChild.textContent = "☀️ ";
  }
}
function setHeadlights(on) {
  // Only the player car carries real spotlights (see buildCarMesh).
  const spots = player.mesh && player.mesh.userData.spots;
  if (spots) spots.forEach((s) => { s.intensity = on ? 5 : 0; });
}
function toggleDayNight() { isNight = !isNight; applyDayNight(); }

// ----------------------------------------------------------------------------
// Camera modes
// ----------------------------------------------------------------------------
let camMode = 0; // 0 chase, 1 high, 2 hood
function cycleCamera() { camMode = (camMode + 1) % 3; }

const camCurrent = new THREE.Vector3(0, 30, -40);
function updateCamera(dt) {
  const fwd = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  let desired, look;
  const pos = new THREE.Vector3(player.x, 0, player.z);
  if (camMode === 0) {
    desired = pos.clone().addScaledVector(fwd, -11).add(new THREE.Vector3(0, 5.5, 0));
    look = pos.clone().addScaledVector(fwd, 6).add(new THREE.Vector3(0, 1.5, 0));
  } else if (camMode === 1) {
    desired = pos.clone().addScaledVector(fwd, -7).add(new THREE.Vector3(0, 16, 0));
    look = pos.clone().addScaledVector(fwd, 4).add(new THREE.Vector3(0, 0, 0));
  } else {
    desired = pos.clone().addScaledVector(fwd, 1.2).add(new THREE.Vector3(0, 2.2, 0));
    look = pos.clone().addScaledVector(fwd, 12).add(new THREE.Vector3(0, 1.8, 0));
  }
  const t = 1 - Math.pow(0.0015, dt); // smooth, frame-rate independent
  camCurrent.lerp(desired, t);
  camera.position.copy(camCurrent);
  camera.lookAt(look);
}

// ----------------------------------------------------------------------------
// Physics & collision
// ----------------------------------------------------------------------------
function hitsBuilding(x, z, pad = 1.4) {
  for (const b of buildingFootprints) {
    if (x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad) return true;
  }
  return false;
}

let money = 0;

function updatePlayer(dt) {
  const accel = 36, maxSpeed = 60, reverseMax = -18, drag = 0.7, brakeForce = 60;
  const handbrake = keys[" "];

  if (keys.ArrowUp) player.speed += accel * dt;
  else if (keys.ArrowDown) {
    if (player.speed > 1) player.speed -= brakeForce * dt;
    else player.speed -= accel * 0.6 * dt;
  } else {
    player.speed -= Math.sign(player.speed) * drag * dt * Math.min(Math.abs(player.speed), 10);
    if (Math.abs(player.speed) < 0.4) player.speed = 0;
  }
  player.speed = clamp(player.speed, reverseMax, maxSpeed);

  // steering scales with speed; reverse inverts
  const speedFactor = clamp(Math.abs(player.speed) / 12, 0, 1);
  const turn = 2.4 * dt * speedFactor * Math.sign(player.speed) * (handbrake ? 1.7 : 1);
  if (keys.ArrowLeft) player.heading += turn;
  if (keys.ArrowRight) player.heading -= turn;
  if (handbrake) player.speed *= (1 - 1.5 * dt);

  const fwd = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  let nx = player.x + fwd.x * player.speed * dt;
  let nz = player.z + fwd.z * player.speed * dt;

  // off-road drag (driving over parks/sidewalks edges)
  // per-axis collision resolution against buildings
  if (!hitsBuilding(nx, player.z)) player.x = nx;
  else { player.speed *= 0.4; takeDamage(Math.abs(player.speed) * 0.04); }
  if (!hitsBuilding(player.x, nz)) player.z = nz;
  else { player.speed *= 0.4; takeDamage(Math.abs(player.speed) * 0.04); }

  player.x = clamp(player.x, -HALF + 2, HALF - 2);
  player.z = clamp(player.z, -HALF + 2, HALF - 2);

  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.heading;
  // subtle body roll & wheel spin
  player.mesh.userData.wheels.forEach((w) => { w.rotation.x += player.speed * dt * 0.8; });
}

function takeDamage(n) {
  player.hp = clamp(player.hp - n, 0, 100);
  if (player.hp <= 0) gameOver();
}

// ----------------------------------------------------------------------------
// Traffic & police AI
// ----------------------------------------------------------------------------
function updateTraffic(dt) {
  for (const c of traffic) {
    const fwd = new THREE.Vector3(Math.sin(c.heading), 0, Math.cos(c.heading));
    c.x += fwd.x * c.speed * dt;
    c.z += fwd.z * c.speed * dt;
    // wrap around the city
    if (c.x > HALF) c.x = -HALF; if (c.x < -HALF) c.x = HALF;
    if (c.z > HALF) c.z = -HALF; if (c.z < -HALF) c.z = HALF;
    c.mesh.position.set(c.x, 0, c.z);
    c.mesh.rotation.y = c.heading;
    c.mesh.userData.wheels.forEach((w) => { w.rotation.x += c.speed * dt * 0.8; });

    // crash into player
    if (Math.hypot(c.x - player.x, c.z - player.z) < 3.5 && Math.abs(player.speed) > 18) {
      takeDamage(6);
      addWanted(1);
      flash("💥 תאונה!");
      const s = roadCellSpawn(); c.x = s.x; c.z = s.z; c.heading = s.heading;
    }
  }
}

let wanted = 0;
let policeSpawnTimer = 0;
function addWanted(n) {
  const before = wanted;
  wanted = clamp(wanted + n, 0, 5);
  if (Math.floor(wanted) > Math.floor(before)) flash("⭐ רמת מבוקש עלתה!");
}

function updatePolice(dt) {
  if (wanted >= 1) {
    policeSpawnTimer -= dt;
    if (policeSpawnTimer <= 0 && police.length < Math.floor(wanted) + 1) {
      policeSpawnTimer = 3;
      spawnPolice();
      if (isNight) setHeadlights(true);
    }
  } else if (police.length && Math.random() < 0.004) {
    const p = police.pop(); scene.remove(p.mesh);
  }

  for (let i = police.length - 1; i >= 0; i--) {
    const cop = police[i];
    const dx = player.x - cop.x, dz = player.z - cop.z;
    const d = Math.hypot(dx, dz);
    const target = Math.atan2(dx, dz);
    let diff = ((target - cop.heading + Math.PI) % (Math.PI * 2)) - Math.PI;
    cop.heading += diff * clamp(4 * dt, 0, 1);
    cop.speed = lerp(cop.speed, d > 8 ? 52 : 0, 0.05);
    const fwd = new THREE.Vector3(Math.sin(cop.heading), 0, Math.cos(cop.heading));
    cop.x += fwd.x * cop.speed * dt;
    cop.z += fwd.z * cop.speed * dt;
    cop.mesh.position.set(cop.x, 0, cop.z);
    cop.mesh.rotation.y = cop.heading;
    cop.mesh.userData.wheels.forEach((w) => { w.rotation.x += cop.speed * dt * 0.8; });

    // flashing lightbar
    if (cop.mesh.userData.lightbar) {
      const t = Math.floor(performance.now() / 180) % 2;
      const [red, blue] = cop.mesh.userData.lightbar.children;
      red.material.emissiveIntensity = t ? 3 : 0.2;
      blue.material.emissiveIntensity = t ? 0.2 : 3;
    }

    // ramming the player damages the car
    if (d < 3.5) takeDamage(14 * dt);
  }
}

// ----------------------------------------------------------------------------
// HUD
// ----------------------------------------------------------------------------
const moneyEl = document.getElementById("money");
const speedEl = document.getElementById("speed");
const healthBar = document.getElementById("health-bar");
const stars = document.querySelectorAll("#wanted .star");
const toast = document.getElementById("toast");
let toastTimer = 0;
function flash(msg) { toast.textContent = msg; toast.classList.add("show"); toastTimer = 2.2; }

function updateHUD(dt) {
  moneyEl.textContent = Math.floor(money).toLocaleString();
  speedEl.textContent = Math.round(Math.abs(player.speed) * 3.6);
  healthBar.style.width = player.hp + "%";
  healthBar.style.background = player.hp > 40
    ? "linear-gradient(90deg,#22c55e,#86efac)"
    : "linear-gradient(90deg,#ef4444,#f87171)";
  stars.forEach((s, i) => s.classList.toggle("on", i < Math.floor(wanted)));
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toast.classList.remove("show"); }
  // passive wanted decay
  if (wanted > 0 && police.length === 0) wanted = Math.max(0, wanted - dt * 0.15);
}

// ----------------------------------------------------------------------------
// Marker animation
// ----------------------------------------------------------------------------
function animateMarker(dt) {
  if (!marker.visible) return;
  marker.children[0].rotation.y += dt * 1.5;
  marker.position.y = Math.sin(performance.now() / 400) * 0.5;
}

// ----------------------------------------------------------------------------
// Start / game over
// ----------------------------------------------------------------------------
const overlay = document.getElementById("overlay");
const overlayBody = document.getElementById("overlay-body");
const startBtn = document.getElementById("start-btn");
const hud = document.getElementById("hud");
let running = false;

function resetGame() {
  // clear traffic & police
  traffic.forEach((t) => scene.remove(t.mesh));
  police.forEach((p) => scene.remove(p.mesh));
  traffic = []; police = [];
  money = 0; wanted = 0; player.hp = 100; player.speed = 0;
  // place player on the central road
  player.x = roadCenters[Math.floor(GRID / 2)];
  player.z = -HALF + ROAD;
  player.heading = 0;
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = 0;
  camCurrent.set(player.x, 30, player.z - 40);
  spawnTraffic(22);
  newMission();
  applyDayNight();
}

function startGame() {
  resetGame();
  running = true;
  overlay.classList.add("hidden");
  hud.classList.remove("hidden");
  flash("ברוך הבא לליברטי שורס 🌆");
}

function gameOver() {
  running = false;
  overlay.classList.remove("hidden");
  hud.classList.add("hidden");
  overlayBody.innerHTML = `
    <p class="how">הרכב הושמד ברחובות ליברטי שורס.</p>
    <p style="font-size:30px;font-weight:800;color:var(--accent);margin:10px 0">
      $${Math.floor(money).toLocaleString()}</p>
    <p class="how">סך הכל הרווחת</p>`;
  startBtn.textContent = "שחק שוב";
}
startBtn.addEventListener("click", () => { if (!startBtn.disabled) startGame(); });

// ----------------------------------------------------------------------------
// Resize
// ----------------------------------------------------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ----------------------------------------------------------------------------
// Boot
// ----------------------------------------------------------------------------
function boot() {
  buildCity();
  player.mesh = buildCarMesh(0xffd23f, false, true);
  scene.add(player.mesh);
  applyDayNight();

  startBtn.disabled = false;
  startBtn.textContent = "התחל לנהוג";
  document.getElementById("load-note").textContent = "מוכן! לחץ כדי לשחק";
}

const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (running) {
    updatePlayer(dt);
    updateTraffic(dt);
    updatePolice(dt);
    updateMission(dt);
    updateHUD(dt);
    // keep sun following the player so shadows stay crisp across the big map
    sun.position.set(player.x + 120, 180, player.z + 80);
    sun.target.position.set(player.x, 0, player.z);
  }
  animateMarker(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

boot();
loop();
