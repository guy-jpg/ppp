/* =========================================================================
   SPEED RIVALS — arcade kart racing (3D)
   An original kart-racer inspired by the genre (Mario-Kart / Speedstorm style):
   detailed karts, a closed circuit with curbs, drift-to-boost, AI rivals,
   laps and finishing positions. Built on Three.js / WebGL.

   Loaded as a CLASSIC script — Three.js is provided as a global `THREE` via a
   plain <script> tag (UMD build), so there is no ES-module `import`.
   ========================================================================= */

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (ax, az, bx, bz) => (ax - bx) ** 2 + (az - bz) ** 2;

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
if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
else if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
wrap.appendChild(renderer.domElement);

function texSRGB(t) {
  if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
  else if ("encoding" in t) t.encoding = THREE.sRGBEncoding;
  return t;
}

const scene = new THREE.Scene();
let BASE_FOV = 64;
const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.5, 3000);
camera.position.set(0, 20, -30);

// Optional bloom post-processing — gives the glossy "AAA" glow on lights, the
// sky and the boost. Falls back to plain rendering if the passes aren't loaded.
let composer = null, bloomPass = null;
function setupComposer() {
  try {
    if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      // high threshold + modest strength: only lights/boost/emissives glow,
      // not the whole sunlit scene
      bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.4, 0.92);
      composer.addPass(bloomPass);
    }
  } catch (e) { console.warn("Bloom disabled:", e); composer = null; }
}

// ----------------------------------------------------------------------------
// Sky dome
// ----------------------------------------------------------------------------
const skyUniforms = {
  top: { value: new THREE.Color(0x2472c8) },
  bottom: { value: new THREE.Color(0xd6ecff) },
  exponent: { value: 0.6 },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1800, 32, 16),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vDir=normalize(wp.xyz); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `varying vec3 vDir; uniform vec3 top; uniform vec3 bottom; uniform float exponent; void main(){ float t=pow(max(vDir.y,0.0),exponent); gl_FragColor=vec4(mix(bottom,top,t),1.0);} `,
  })
);
sky.frustumCulled = false;
scene.add(sky);
scene.fog = new THREE.Fog(0xcfe6ff, 220, 1100);

// Reflection environment for glossy car paint — capture the sky gradient into a
// pre-filtered cube map so metallic/clearcoat materials reflect the world.
function buildEnvironment() {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.04, 0.1, 5000).texture;
  scene.environment = env;
  pmrem.dispose();
}

// ----------------------------------------------------------------------------
// Lights
// ----------------------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0xeaf4ff, 0x5a6a4a, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.6);
sun.position.set(180, 240, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
const sc = sun.shadow.camera;
sc.near = 10; sc.far = 900;
sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260;
sc.updateProjectionMatrix();
scene.add(sun);
scene.add(sun.target);

// ----------------------------------------------------------------------------
// Track definition (closed Catmull-Rom circuit)
// ----------------------------------------------------------------------------
const CONTROL = [
  [0, -220], [150, -190], [235, -80], [200, 50], [110, 95], [70, 200],
  [-40, 215], [-150, 165], [-235, 40], [-205, -90], [-110, -170], [-40, -215],
].map(([x, z]) => new THREE.Vector3(x, 0, z));

const curve = new THREE.CatmullRomCurve3(CONTROL, true, "catmullrom", 0.5);
const TRACK_LEN = curve.getLength();
const SAMPLES = 900;
const HALF_W = 11;            // road half-width
const centers = [];
const tangents = [];
const normals = [];           // left-hand normal in XZ plane
for (let i = 0; i < SAMPLES; i++) {
  const u = i / SAMPLES;
  const c = curve.getPointAt(u);
  const t = curve.getTangentAt(u);
  centers.push(c);
  tangents.push(t);
  normals.push(new THREE.Vector3(-t.z, 0, t.x).normalize());
}

function buildTrack() {
  // grass ground
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600, 1, 1),
    new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness: 1 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  // road ribbon
  const pos = [], idx = [], uv = [];
  let runLen = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const k = i % SAMPLES;
    if (i > 0) runLen += centers[k].distanceTo(centers[(i - 1) % SAMPLES]);
    const c = centers[k], n = normals[k];
    const l = c.clone().addScaledVector(n, HALF_W);
    const r = c.clone().addScaledVector(n, -HALF_W);
    pos.push(l.x, 0.06, l.z, r.x, 0.06, r.z);
    const v = runLen / 7;
    uv.push(0, v, 1, v);
  }
  for (let i = 0; i < SAMPLES; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    idx.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const road = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: makeRoadTexture(), roughness: 0.92, metalness: 0.0, side: THREE.DoubleSide,
  }));
  road.receiveShadow = true;
  scene.add(road);

  // red/white curbs along both edges
  const curbGeo = new THREE.BoxGeometry(2.2, 0.4, 3.2);
  const curbRed = new THREE.MeshStandardMaterial({ color: 0xd23b3b, roughness: 0.7 });
  const curbWhite = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7 });
  for (let i = 0; i < SAMPLES; i += 7) {
    const c = centers[i], n = normals[i], t = tangents[i];
    const ang = Math.atan2(t.x, t.z);
    const mat = (i / 7) % 2 === 0 ? curbRed : curbWhite;
    [HALF_W + 1.2, -(HALF_W + 1.2)].forEach((off) => {
      const m = new THREE.Mesh(curbGeo, mat);
      m.position.copy(c).addScaledVector(n, off);
      m.position.y = 0.2;
      m.rotation.y = ang;
      scene.add(m);
    });
  }

  // start/finish line (checkered) at sample 0
  const sl = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF_W * 2, 5),
    new THREE.MeshBasicMaterial({ map: makeCheckerTexture() })
  );
  sl.rotation.x = -Math.PI / 2;
  sl.position.copy(centers[0]); sl.position.y = 0.08;
  sl.rotation.z = Math.atan2(tangents[0].x, tangents[0].z);
  scene.add(sl);

  // decorative scenery: trees + grandstands away from the track
  scatterScenery();
  // track furniture: gantry, tyre walls, billboards, crowd
  dressTrack();
  // distant hills to fill the horizon
  addBackdrop();
  // boost pads on the tarmac
  placeBoostPads();
}

function makeGroundTexture() {
  const cv = document.createElement("canvas"); cv.width = cv.height = 512;
  const g = cv.getContext("2d");
  g.fillStyle = "#3a8a42"; g.fillRect(0, 0, 512, 512);
  // patchy grass tones so the ground isn't a flat colour
  for (let i = 0; i < 2600; i++) {
    const gr = 110 + (rand(-26, 26) | 0);
    g.fillStyle = `rgba(${46 + (rand(-12, 12) | 0)},${gr},${58 + (rand(-10, 10) | 0)},0.5)`;
    g.fillRect(rand(0, 512), rand(0, 512), rand(2, 7), rand(2, 7));
  }
  const tex = texSRGB(new THREE.CanvasTexture(cv));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(34, 34);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

// start/finish gantry, tyre-stack barriers, billboards and crowd
function dressTrack() {
  const c0 = centers[0], n0 = normals[0], t0 = tangents[0];
  const ang = Math.atan2(t0.x, t0.z);
  const span = (HALF_W + 1.5);

  // gantry: two posts + a beam carrying a checkered banner
  const postMat = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.6, metalness: 0.4 });
  [span, -span].forEach((off) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1, 9, 1), postMat);
    p.position.copy(c0).addScaledVector(n0, off); p.position.y = 4.5; p.rotation.y = ang;
    p.castShadow = true; scene.add(p);
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(span * 2 + 1, 1.8, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.6 }));
  beam.position.copy(c0); beam.position.y = 9.3; beam.rotation.y = ang; beam.castShadow = true; scene.add(beam);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(span * 2, 1.5),
    new THREE.MeshBasicMaterial({ map: makeCheckerTexture(), side: THREE.DoubleSide }));
  banner.position.copy(c0).addScaledVector(t0, -0.75); banner.position.y = 8.4; banner.rotation.y = ang; scene.add(banner);

  // tyre-stack barriers at the corners
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95 });
  [110, 250, 430, 560, 760].forEach((si) => {
    const c = centers[si % SAMPLES], n = normals[si % SAMPLES];
    [1, -1].forEach((side) => {
      for (let s = 0; s < 4; s++) {
        const base = c.clone().addScaledVector(n, side * (HALF_W + 2.4 + s * 1.3));
        for (let h = 0; h < 2; h++) {
          const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.26, 8, 14), tyreMat);
          tyre.position.set(base.x, 0.3 + h * 0.55, base.z); tyre.rotation.x = Math.PI / 2;
          scene.add(tyre);
        }
      }
    });
  });

  // advertising billboards along the straights
  const adColors = [0xff5d5d, 0x4c8ee8, 0x46c46a, 0xffd23f, 0xb14cff];
  [70, 210, 360, 520, 680, 820].forEach((si, k) => {
    const c = centers[si % SAMPLES], n = normals[si % SAMPLES], t = tangents[si % SAMPLES];
    const base = c.clone().addScaledVector(n, (k % 2 ? 1 : -1) * (HALF_W + 7));
    const a = Math.atan2(t.x, t.z);
    const col = adColors[k % adColors.length];
    [-3, 3].forEach((dx) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.8 }));
      post.position.set(base.x + Math.cos(a) * dx, 2, base.z + Math.sin(a) * dx); scene.add(post);
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(9, 3, 0.4),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, emissive: col, emissiveIntensity: 0.18 }));
    board.position.set(base.x, 4.6, base.z); board.rotation.y = a; board.castShadow = true; scene.add(board);
  });
}

// rows of tiny coloured boxes = crowd in the grandstands
function addCrowd(base, ang) {
  const colors = [0xff6b6b, 0xffe066, 0x6bd1ff, 0xff9f43, 0xa29bfe, 0xffffff, 0x55efc4];
  for (let row = 0; row < 4; row++) {
    for (let s = -8; s <= 8; s++) {
      if (Math.random() < 0.15) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7),
        new THREE.MeshStandardMaterial({ color: colors[(Math.random() * colors.length) | 0], roughness: 0.9 }));
      const dx = s * 2.1, dy = 6 + row * 1.1, dz = -row * 1.6 - 2;
      m.position.set(
        base.x + Math.cos(ang) * dx + Math.sin(ang) * dz,
        dy,
        base.z + Math.sin(ang) * dx - Math.cos(ang) * dz
      );
      scene.add(m);
    }
  }
}

// low-poly hills ringing the circuit so the horizon isn't empty
function addBackdrop() {
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x4a7d4f, roughness: 1, flatShading: true });
  const farMat = new THREE.MeshStandardMaterial({ color: 0x6f8fa6, roughness: 1, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rand(-0.1, 0.1);
    const r = rand(560, 720);
    const h = rand(40, 110);
    const hill = new THREE.Mesh(new THREE.ConeGeometry(rand(70, 140), h, 6), i % 3 === 0 ? farMat : hillMat);
    hill.position.set(Math.cos(a) * r, h / 2 - 6, Math.sin(a) * r);
    hill.rotation.y = rand(0, Math.PI);
    scene.add(hill);
  }
}

function makeRoadTexture() {
  const cv = document.createElement("canvas"); cv.width = 128; cv.height = 256;
  const g = cv.getContext("2d");
  g.fillStyle = "#33373f"; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(255,255,255,${rand(0, 0.03)})`; g.fillRect(rand(0, 128), rand(0, 256), 2, 2); }
  // white edge lines
  g.fillStyle = "rgba(235,235,235,0.6)";
  g.fillRect(6, 0, 4, 256); g.fillRect(118, 0, 4, 256);
  // dashed center line
  g.fillStyle = "rgba(255,210,63,0.85)";
  for (let y = 0; y < 256; y += 40) g.fillRect(60, y, 8, 22);
  const tex = texSRGB(new THREE.CanvasTexture(cv));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makeCheckerTexture() {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const g = cv.getContext("2d");
  const n = 8, s = 128 / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    g.fillStyle = (x + y) % 2 ? "#111" : "#fff";
    g.fillRect(x * s, y * s, s, s);
  }
  return texSRGB(new THREE.CanvasTexture(cv));
}

function scatterScenery() {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f7a38, roughness: 1, flatShading: true });
  for (let i = 0; i < 170; i++) {
    // pick a random spot, keep it off the track
    const x = rand(-520, 520), z = rand(-520, 520);
    let near = false;
    for (let k = 0; k < SAMPLES; k += 12) if (dist2(x, z, centers[k].x, centers[k].z) < (HALF_W + 16) ** 2) { near = true; break; }
    if (near) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 5, 6), trunkMat);
    trunk.position.set(x, 2.5, z); trunk.castShadow = true; scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(rand(3, 5), 8, 6), leafMat);
    leaves.position.set(x, rand(6, 7), z); leaves.castShadow = true; scene.add(leaves);
  }
  // a couple of grandstands near a straight
  const standMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xd23b5b, roughness: 0.8 });
  [120, 480, 700].forEach((si) => {
    const c = centers[si % SAMPLES], n = normals[si % SAMPLES], t = tangents[si % SAMPLES];
    const base = c.clone().addScaledVector(n, HALF_W + 18);
    const ang = Math.atan2(t.x, t.z);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 14), standMat);
    stand.position.set(base.x, 5, base.z); stand.rotation.y = ang;
    stand.castShadow = true; stand.receiveShadow = true; scene.add(stand);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(42, 1, 16), roofMat);
    roof.position.set(base.x, 11, base.z); roof.rotation.y = ang;
    roof.castShadow = true; scene.add(roof);
    addCrowd(c.clone().addScaledVector(n, HALF_W + 13), ang);
  });
}

// ----------------------------------------------------------------------------
// Boost pads
// ----------------------------------------------------------------------------
const boostPads = [];
function placeBoostPads() {
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x1a90ff, emissive: 0x2aa0ff, emissiveIntensity: 1.2, roughness: 0.5,
  });
  [80, 250, 430, 620, 780].forEach((i) => {
    const c = centers[i % SAMPLES], t = tangents[i % SAMPLES];
    const pad = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 8), padMat.clone());
    pad.position.copy(c); pad.position.y = 0.12;
    pad.rotation.y = Math.atan2(t.x, t.z);
    scene.add(pad);
    boostPads.push({ mesh: pad, x: c.x, z: c.z });
  });
}

// ----------------------------------------------------------------------------
// Sports-car model (smooth extruded coupe body + reflective paint)
// ----------------------------------------------------------------------------
function paintMat(color) {
  const m = THREE.MeshPhysicalMaterial
    ? new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.3 })
    : new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.35 });
  if ("clearcoat" in m) { m.clearcoat = 1.0; m.clearcoatRoughness = 0.22; }
  m.envMapIntensity = 1.35;
  return m;
}

// side-profile silhouette of a coupe (X = length, nose at +X; Y = height)
function carBodyShape() {
  const s = new THREE.Shape();
  s.moveTo(-2.35, 0.12);   // tail bottom
  s.lineTo(2.4, 0.12);     // nose bottom
  s.lineTo(2.4, 0.5);      // nose tip
  s.lineTo(1.65, 0.6);     // hood front
  s.lineTo(0.65, 0.72);    // hood
  s.lineTo(0.15, 1.12);    // windshield top (A-pillar)
  s.lineTo(-0.8, 1.18);    // roof rear
  s.lineTo(-1.4, 0.95);    // rear glass
  s.lineTo(-2.05, 0.84);   // decklid
  s.lineTo(-2.35, 0.7);    // tail top
  s.closePath();
  return s;
}

function buildKart(bodyColor, accentColor) {
  const g = new THREE.Group();
  const body = paintMat(bodyColor);
  const accent = paintMat(accentColor);
  const dark = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.55, metalness: 0.2 });
  const glass = THREE.MeshPhysicalMaterial
    ? new THREE.MeshPhysicalMaterial({ color: 0x10141c, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.78 })
    : new THREE.MeshStandardMaterial({ color: 0x10141c, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.78 });

  // smooth body via extruded silhouette with beveled (rounded) edges
  const WIDTH = 2.0;
  const bodyGeo = new THREE.ExtrudeGeometry(carBodyShape(), {
    depth: WIDTH, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.16, bevelSegments: 4, steps: 1,
  });
  bodyGeo.translate(0, 0, -WIDTH / 2);
  bodyGeo.computeVertexNormals();
  const shell = new THREE.Mesh(bodyGeo, body);
  shell.rotation.y = -Math.PI / 2;   // map length onto +Z (forward)
  shell.castShadow = true; shell.receiveShadow = true;
  g.add(shell);

  // muscular fender flares over each wheel (flattened spheres) so the wheels
  // read as part of the bodywork instead of bolted-on cylinders
  const flareGeo = new THREE.SphereGeometry(0.78, 16, 12);
  [[-0.92, 1.45], [0.92, 1.45], [-0.96, -1.45], [0.96, -1.45]].forEach(([x, z]) => {
    const f = new THREE.Mesh(flareGeo, body);
    f.position.set(x, 0.58, z);
    f.scale.set(0.62, 0.7, 1.05);
    f.castShadow = true; g.add(f);
  });

  // low, tapered cockpit canopy (clearly narrower than the body)
  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(0.55, 0); cabinShape.lineTo(0.05, 0.46);
  cabinShape.lineTo(-0.95, 0.5); cabinShape.lineTo(-1.25, 0);
  cabinShape.closePath();
  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
    depth: WIDTH - 0.7, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2, steps: 1,
  });
  cabinGeo.translate(0, 0, -(WIDTH - 0.7) / 2);
  cabinGeo.computeVertexNormals();
  const cabin = new THREE.Mesh(cabinGeo, glass);
  cabin.rotation.y = -Math.PI / 2;
  cabin.position.set(0, 0.74, 0.1);
  g.add(cabin);

  // hood accent stripe (kept to the flat hood so it doesn't clip the body)
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 1.3), accent);
  stripe.position.set(0, 0.735, 1.35); g.add(stripe);

  // front grille / intake
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.1), dark);
  grille.position.set(0, 0.42, 2.32); g.add(grille);

  // front splitter + rear diffuser
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.1, 0.06, 0.5), dark);
  splitter.position.set(0, 0.18, 2.3); g.add(splitter);
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.1, 0.2, 0.4), dark);
  diffuser.position.set(0, 0.22, -2.3); g.add(diffuser);

  // rear wing (accent) on two uprights
  const wing = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.05, 0.08, 0.5), accent);
  wing.position.set(0, 1.02, -2.1); wing.castShadow = true; g.add(wing);
  [-0.78, 0.78].forEach((x) => {
    const up = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.12), dark);
    up.position.set(x, 0.84, -2.05); g.add(up);
  });

  // side mirrors
  [-1.0, 1.0].forEach((x) => {
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.24), body);
    mir.position.set(x, 0.9, 0.7); g.add(mir);
  });

  // headlights (emissive) + taillight bar
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff6e0, emissiveIntensity: 1.2 });
  [-0.66, 0.66].forEach((x) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.13, 0.1), hlMat);
    hl.position.set(x, 0.6, 2.32); g.add(hl);
  });
  const tl = new THREE.Mesh(new THREE.BoxGeometry(WIDTH - 0.25, 0.12, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2200, emissiveIntensity: 0.9 }));
  tl.position.set(0, 0.74, -2.34); g.add(tl);

  // wheels — fat low-profile tyres with metallic multi-spoke rims
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd6dae1, roughness: 0.22, metalness: 0.95, envMapIntensity: 1.6 });
  const caliper = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5, metalness: 0.3 });
  const frontWheels = [], rearWheels = [];
  function wheel(x, z, r, w, store) {
    const grp = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 24), tyreMat);
    tyre.rotation.z = Math.PI / 2; tyre.castShadow = true; grp.add(tyre);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.66, r * 0.66, w + 0.05, 14), rimMat);
    rim.rotation.z = Math.PI / 2; grp.add(rim);
    for (let k = 0; k < 6; k++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, r * 1.15, 0.05), rimMat);
      sp.rotation.x = (k / 6) * Math.PI; grp.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.18, w + 0.07, 10), caliper);
    hub.rotation.z = Math.PI / 2; grp.add(hub);
    grp.position.set(x, r, z); g.add(grp); store.push(grp);
  }
  wheel(-0.9, 1.45, 0.52, 0.46, frontWheels);
  wheel(0.9, 1.45, 0.52, 0.46, frontWheels);
  wheel(-0.94, -1.45, 0.56, 0.54, rearWheels);
  wheel(0.94, -1.45, 0.56, 0.54, rearWheels);

  const spots = []; // headlight spotlights (player only — added separately)
  g.userData = { frontWheels, rearWheels, spots, bodyColor };
  return g;
}

// ----------------------------------------------------------------------------
// Real sports-car model (glTF) with procedural fallback
// ----------------------------------------------------------------------------
const CAR_MODEL_URL = "https://threejs.org/examples/models/gltf/ferrari.glb";
const MODEL_SCALE = 1.0;
let MODEL_YAW = Math.PI;    // model faces -Z by default; flip it to point forward (+Z)
let CAR_PROTO = null;       // loaded model template (null => use procedural)

function loadCarModel() {
  if (typeof THREE.GLTFLoader !== "function") return;   // loader unavailable
  const loader = new THREE.GLTFLoader();
  if (typeof THREE.DRACOLoader === "function") {
    const draco = new THREE.DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
    loader.setDRACOLoader(draco);
  }
  loader.load(CAR_MODEL_URL, (gltf) => {
    CAR_PROTO = gltf.scene;
    CAR_PROTO.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (raceState === "idle") spawnRacers();   // refresh the menu car with the model
    flash("🚗 מודל רכב נטען");
  }, undefined, (err) => { console.warn("Car model failed to load — using procedural car.", err); });
}

function makeModelCar(bodyColor, accentColor) {
  const wrapper = new THREE.Group();
  const car = CAR_PROTO.clone(true);
  car.traverse((o) => {
    if (o.isMesh && o.material) { o.material = o.material.clone(); o.castShadow = true; o.receiveShadow = true; }
  });
  const bodyMesh = car.getObjectByName("body");
  if (bodyMesh && bodyMesh.material && bodyMesh.material.color) {
    bodyMesh.material.color.set(bodyColor);
    bodyMesh.material.metalness = 0.6; bodyMesh.material.roughness = 0.32;
    if ("clearcoat" in bodyMesh.material) bodyMesh.material.clearcoat = 1.0;
    bodyMesh.material.envMapIntensity = 1.3;
  }
  const front = [], rear = [];
  ["wheel_fl", "wheel_fr"].forEach((n) => { const w = car.getObjectByName(n); if (w) front.push(w); });
  ["wheel_rl", "wheel_rr"].forEach((n) => { const w = car.getObjectByName(n); if (w) rear.push(w); });
  car.rotation.y = MODEL_YAW;
  wrapper.add(car);
  wrapper.scale.setScalar(MODEL_SCALE);
  wrapper.userData = { frontWheels: front, rearWheels: rear, spots: [], bodyColor, isModel: true };
  return wrapper;
}

// dispatcher: use the loaded model if available, otherwise the procedural car
function makeCar(bodyColor, accentColor) {
  if (CAR_PROTO) { try { return makeModelCar(bodyColor, accentColor); } catch (e) { console.warn(e); } }
  return buildKart(bodyColor, accentColor);
}

function addPlayerHeadlights(kart) {
  [-0.55, 0.55].forEach((x) => {
    const spot = new THREE.SpotLight(0xfff1d0, 0, 70, Math.PI / 6, 0.4, 1.2);
    spot.position.set(x, 0.9, 2.4);
    spot.target.position.set(x * 2, -2, 16);
    kart.add(spot); kart.add(spot.target);
    kart.userData.spots.push(spot);
  });
}

// ----------------------------------------------------------------------------
// Racers
// ----------------------------------------------------------------------------
const LAPS = 3;
const KART_COLORS = [0xffd23f, 0xff5d5d, 0x4c8ee8, 0x46c46a, 0xb14cff, 0xff8a00];
const HELMETS = [0x1a1a1a, 0xffffff, 0x0a2a6a, 0x0a4a1a, 0x3a0a4a, 0x6a2a00];

const player = {
  mesh: null, x: 0, z: 0, heading: 0, speed: 0,
  drifting: false, driftDir: 0, driftCharge: 0, boost: 0, boostTier: 0,
  idx: 0, lap: 1, passedHalf: false, finished: false, finishTime: 0,
};

let ai = [];        // computer rivals
let raceTime = 0;
let raceState = "idle"; // idle | countdown | racing | done
let countdownT = 0;

function startPositionFor(slot) {
  // Grid sits just AFTER the start line. The player (slot 0) is frontmost, so
  // larger track-param = further ahead, and the standings metric stays monotonic.
  const gi = (44 - slot * 11 + SAMPLES) % SAMPLES;
  const c = centers[gi], n = normals[gi];
  const off = (slot % 2 === 0 ? 1 : -1) * 4.5;
  return { x: c.x + n.x * off, z: c.z + n.z * off, heading: Math.atan2(tangents[gi].x, tangents[gi].z), index: gi };
}

function spawnRacers() {
  // player
  const sp = startPositionFor(0);
  player.mesh = makeCar(KART_COLORS[0], HELMETS[0]);
  addPlayerHeadlights(player.mesh);
  scene.add(player.mesh);
  Object.assign(player, { x: sp.x, z: sp.z, heading: sp.heading, speed: 0,
    idx: sp.index, lap: 1, passedHalf: false, finished: false,
    drifting: false, driftCharge: 0, boost: 0, boostTier: 0 });
  player.mesh.position.set(sp.x, 0, sp.z);
  player.mesh.rotation.y = sp.heading;
  playerSearch = sp.index;

  // 3 AI rivals
  ai = [];
  for (let i = 1; i <= 3; i++) {
    const sp = startPositionFor(i);
    const m = makeCar(KART_COLORS[i], HELMETS[i]);
    scene.add(m);
    m.position.set(sp.x, 0, sp.z);
    m.rotation.y = sp.heading;
    ai.push({
      mesh: m,
      u: sp.index / SAMPLES,
      lane: (i % 2 === 0 ? 1 : -1) * rand(2, 5),
      speed: 0,
      baseSpeed: rand(40, 46),
      lap: 1, prevU: 0, wheelSpin: 0,
    });
  }
}

function clearRacers() {
  if (player.mesh) scene.remove(player.mesh);
  ai.forEach((a) => scene.remove(a.mesh));
  ai = [];
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
  if (k === "c" || k === "C") camMode = (camMode + 1) % 3;
  if (k === "m" || k === "M") flash(SFX.toggleMute() ? "🔇 הושתק" : "🔊 קול פעיל");
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
    sun.intensity = 0.3; sun.color.set(0x4060a0);
    hemi.intensity = 0.3; hemi.color.set(0x2a3550); hemi.groundColor.set(0x0a0c14);
    skyUniforms.top.value.set(0x05070f); skyUniforms.bottom.value.set(0x18243f);
    scene.fog.color.set(0x0a1424); renderer.toneMappingExposure = 1.15;
    if (player.mesh) player.mesh.userData.spots.forEach((s) => s.intensity = 5);
    dayNightBtn.firstChild.textContent = "🌙 ";
  } else {
    sun.intensity = 2.3; sun.color.set(0xfff2dc);
    hemi.intensity = 0.7; hemi.color.set(0xdcecff); hemi.groundColor.set(0x53624a);
    skyUniforms.top.value.set(0x2a72c0); skyUniforms.bottom.value.set(0xbfdcf2);
    scene.fog.color.set(0xbcd6ec); scene.fog.near = 320; scene.fog.far = 1500;
    renderer.toneMappingExposure = 0.95;
    if (player.mesh) player.mesh.userData.spots.forEach((s) => s.intensity = 0);
    dayNightBtn.firstChild.textContent = "☀️ ";
  }
}
function toggleDayNight() { isNight = !isNight; applyDayNight(); }

// ----------------------------------------------------------------------------
// Sound — fully synthesized via WebAudio (no external files)
// ----------------------------------------------------------------------------
const SFX = {
  ctx: null, master: null, muted: false,
  engineOsc: null, engineGain: null, engineFilter: null,
  noiseBuf: null, musicTimer: null, musicStep: 0,
  init() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        // white-noise buffer for whooshes
        const len = this.ctx.sampleRate * 1.0;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
    } catch (e) { console.warn("audio init failed", e); }
  },
  startEngine() {
    if (!this.ctx || this.engineOsc) return;
    const o = this.ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 60;
    const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 800;
    const g = this.ctx.createGain(); g.gain.value = 0.0;
    o.connect(f); f.connect(g); g.connect(this.master); o.start();
    this.engineOsc = o; this.engineGain = g; this.engineFilter = f;
  },
  setEngine(s) { // s in 0..1
    if (!this.engineGain) return;
    this.engineGain.gain.value = 0.05 + 0.13 * s;
    this.engineOsc.frequency.value = 55 + 230 * s;
    this.engineFilter.frequency.value = 600 + 2600 * s;
  },
  stopEngine() { if (this.engineOsc) { try { this.engineOsc.stop(); } catch (e) {} this.engineOsc = null; this.engineGain = null; } },
  boost() {
    if (!this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3500, t + 0.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.65);
  },
  tone(freq, dur, type, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = type || "triangle"; o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.25));
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + (dur || 0.25) + 0.02);
  },
  beep(go) { this.tone(go ? 880 : 440, go ? 0.5 : 0.22, "square", 0.3); },
  jingle() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, "triangle", 0.3), i * 130)); },
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const scale = [220, 277, 330, 415, 440, 415, 330, 277];
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const f = scale[this.musicStep % scale.length];
      this.tone(f, 0.22, "sawtooth", 0.05);
      if (this.musicStep % 2 === 0) this.tone(f / 2, 0.3, "sine", 0.06); // bass
      this.musicStep++;
    }, 260);
  },
  stopMusic() { if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; } },
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.5; return this.muted; },
};

// ----------------------------------------------------------------------------
// Camera
// ----------------------------------------------------------------------------
let camMode = 0;
const camCurrent = new THREE.Vector3(0, 20, -30);
function updateCamera(dt) {
  const fwd = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  const pos = new THREE.Vector3(player.x, 0, player.z);
  let desired, look;
  if (camMode === 0) {
    desired = pos.clone().addScaledVector(fwd, -10).add(new THREE.Vector3(0, 5, 0));
    look = pos.clone().addScaledVector(fwd, 8).add(new THREE.Vector3(0, 1.3, 0));
  } else if (camMode === 1) {
    desired = pos.clone().addScaledVector(fwd, -6).add(new THREE.Vector3(0, 14, 0));
    look = pos.clone().addScaledVector(fwd, 5);
  } else {
    desired = pos.clone().addScaledVector(fwd, 1.0).add(new THREE.Vector3(0, 2.0, 0));
    look = pos.clone().addScaledVector(fwd, 14).add(new THREE.Vector3(0, 1.6, 0));
  }
  const t = 1 - Math.pow(0.0016, dt);
  camCurrent.lerp(desired, t);
  camera.position.copy(camCurrent);
  camera.lookAt(look);
  // FOV kick on boost for a sense of speed
  const targetFov = BASE_FOV + (player.boost > 0 ? 10 : 0) + Math.abs(player.speed) * 0.06;
  camera.fov = lerp(camera.fov, targetFov, 1 - Math.pow(0.01, dt));
  camera.updateProjectionMatrix();
}

// ----------------------------------------------------------------------------
// Sparks (drift / boost particles)
// ----------------------------------------------------------------------------
const sparks = [];
const sparkGeo = new THREE.SphereGeometry(0.18, 6, 5);
function spawnSpark(x, z, color) {
  if (sparks.length > 140) return;
  const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, 0.4, z);
  scene.add(m);
  sparks.push({ mesh: m, vx: rand(-3, 3), vy: rand(2, 6), vz: rand(-3, 3), life: rand(0.3, 0.6), max: 0.6 });
}
function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.mesh.position.x += s.vx * dt; s.mesh.position.y += s.vy * dt; s.mesh.position.z += s.vz * dt;
    s.vy -= 12 * dt; s.life -= dt;
    const sc = clamp(s.life / s.max, 0, 1);
    s.mesh.scale.setScalar(sc);
    if (s.life <= 0) { scene.remove(s.mesh); s.mesh.material.dispose(); sparks.splice(i, 1); }
  }
}

// ----------------------------------------------------------------------------
// Player physics + drift/boost
// ----------------------------------------------------------------------------
const TIER = [
  { t: 0.55, time: 0.9, speed: 16, color: 0x3aa0ff, cls: "" },
  { t: 1.3, time: 1.5, speed: 24, color: 0xff8a00, cls: "tier-turbo" },
  { t: 2.1, time: 2.1, speed: 34, color: 0xb14cff, cls: "tier-ultra" },
];

function updatePlayer(dt) {
  const driving = raceState === "racing" && !player.finished;
  const baseMax = 58, boostMax = baseMax + (player.boost > 0 ? player.boostSpeed : 0);
  const accel = (player.boost > 0 ? 80 : 46);

  if (driving && keys.ArrowUp) player.speed += accel * dt;
  else if (driving && keys.ArrowDown) player.speed -= (player.speed > 2 ? 75 : 36) * dt;
  else { player.speed -= Math.sign(player.speed) * Math.min(Math.abs(player.speed), 12) * 0.8 * dt; if (Math.abs(player.speed) < 0.3) player.speed = 0; }
  player.speed = clamp(player.speed, -16, boostMax);

  // steering & drift
  const steer = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0);
  const speedFactor = clamp(Math.abs(player.speed) / 12, 0, 1);
  const wantDrift = driving && keys[" "] && Math.abs(player.speed) > 22 && steer !== 0;

  if (wantDrift && !player.drifting) { player.drifting = true; player.driftDir = Math.sign(steer); player.driftCharge = 0; }
  if (player.drifting && (!keys[" "] || Math.abs(player.speed) < 12)) releaseDrift();

  let turn = 2.3 * dt * speedFactor * Math.sign(player.speed || 1);
  if (player.drifting) {
    turn = 3.1 * dt * speedFactor;            // sharper while drifting
    player.heading += turn * player.driftDir + steer * 0.6 * dt * speedFactor;
    player.driftCharge += dt;
    player.speed *= (1 - 0.25 * dt);          // slight scrub
    // drift sparks at rear wheels
    if (Math.random() < 0.8) {
      const tier = currentTier(player.driftCharge);
      const col = tier >= 0 ? TIER[tier].color : 0xffffff;
      const rl = rearWheelWorld(-1);
      spawnSpark(rl.x, rl.z, col);
      const rr = rearWheelWorld(1);
      spawnSpark(rr.x, rr.z, col);
    }
  } else {
    player.heading += turn * steer;
  }

  // boost
  if (player.boost > 0) {
    player.boost -= dt;
    if (Math.random() < 0.6) { const rl = rearWheelWorld(0); spawnSpark(rl.x, rl.z, player.boostColor); }
  }

  // integrate
  const fwd = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  let nx = player.x + fwd.x * player.speed * dt;
  let nz = player.z + fwd.z * player.speed * dt;
  player.x = nx; player.z = nz;

  // track progress + surface handling
  const i = nearestPlayerIndex(player.x, player.z);
  const c = centers[i];
  const d = Math.hypot(player.x - c.x, player.z - c.z);
  if (d > HALF_W + 1) player.speed *= (1 - 1.6 * dt);              // grass drag
  if (d > HALF_W + 22) {                                            // hard edge — keep on the world
    const dir = new THREE.Vector3(player.x - c.x, 0, player.z - c.z).normalize();
    player.x = c.x + dir.x * (HALF_W + 22);
    player.z = c.z + dir.z * (HALF_W + 22);
    player.speed *= 0.4;
  }

  // boost pads
  for (const p of boostPads) {
    if (dist2(player.x, player.z, p.x, p.z) < 36) { fireBoost(2, true); }
  }

  // lap accounting
  if (i > SAMPLES * 0.4 && i < SAMPLES * 0.75) player.passedHalf = true;
  if (player.passedHalf && i < SAMPLES * 0.06) {
    player.passedHalf = false; player.lap++;
    if (player.lap > LAPS) finishPlayer();
    else flash(player.lap === LAPS ? "🏁 הקפה אחרונה!" : "הקפה " + player.lap);
  }

  // apply transform + visual drift yaw + wheel spin
  player.mesh.position.set(player.x, 0, player.z);
  const yaw = player.drifting ? player.driftDir * 0.35 : 0;
  player.mesh.rotation.y = lerp(player.mesh.rotation.y, player.heading + yaw, 1 - Math.pow(0.001, dt));
  player.mesh.userData.rearWheels.forEach((w) => w.rotation.x += player.speed * dt * 1.2);
  player.mesh.userData.frontWheels.forEach((w) => {
    w.rotation.x += player.speed * dt * 1.2;
    w.rotation.y = lerp(w.rotation.y, steer * 0.4, 0.3);
  });
}

function rearWheelWorld(side) {
  // approximate rear-wheel world position behind the kart
  const back = new THREE.Vector3(-Math.sin(player.heading), 0, -Math.cos(player.heading));
  const right = new THREE.Vector3(Math.cos(player.heading), 0, -Math.sin(player.heading));
  return { x: player.x + back.x * 1.4 + right.x * side * 1.2, z: player.z + back.z * 1.4 + right.z * side * 1.2 };
}

function currentTier(charge) {
  let t = -1;
  for (let k = 0; k < TIER.length; k++) if (charge >= TIER[k].t) t = k;
  return t;
}
function releaseDrift() {
  const tier = currentTier(player.driftCharge);
  if (tier >= 0) fireBoost(tier);
  player.drifting = false; player.driftCharge = 0;
}
function fireBoost(tier, fromPad) {
  const def = TIER[clamp(tier, 0, 2)];
  player.boost = Math.max(player.boost, def.time);
  player.boostSpeed = def.speed + (fromPad ? 6 : 0);
  player.boostColor = def.color;
  player.boostTier = tier;
  SFX.boost();
  if (fromPad) flash("⚡ בוסט!");
}

let playerSearch = SAMPLES - 18;
function nearestPlayerIndex(x, z) {
  let best = playerSearch, bd = Infinity;
  for (let k = -25; k <= 70; k++) {
    const idx = ((playerSearch + k) % SAMPLES + SAMPLES) % SAMPLES;
    const d = dist2(x, z, centers[idx].x, centers[idx].z);
    if (d < bd) { bd = d; best = idx; }
  }
  playerSearch = best; player.idx = best; return best;
}

// ----------------------------------------------------------------------------
// AI rivals — follow the racing line with small variations
// ----------------------------------------------------------------------------
function updateAI(dt) {
  const racing = raceState === "racing";
  const pp = playerProgress();
  for (const a of ai) {
    // rubber-banding: rivals ahead ease off, rivals behind catch up, so the
    // player can realistically fight for 1st (arcade-racer style).
    const gap = progressOf(a.lap, a.u) - pp;   // >0 => ahead of player
    let target = a.baseSpeed;
    if (gap > 0.03) target -= 12;
    else if (gap < -0.03) target += 16;
    if (racing) a.speed = lerp(a.speed, target, 0.05);
    else a.speed = lerp(a.speed, 0, 0.1);
    a.prevU = a.u;
    a.u += (a.speed * dt) / TRACK_LEN;
    if (a.u >= 1) { a.u -= 1; a.lap++; }
    const p = curve.getPointAt(a.u);
    const t = curve.getTangentAt(a.u);
    const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
    const lane = a.lane + Math.sin(a.u * Math.PI * 8) * 1.5;   // gentle weaving
    a.mesh.position.set(p.x + n.x * lane, 0, p.z + n.z * lane);
    a.mesh.rotation.y = Math.atan2(t.x, t.z);
    a.wheelSpin += a.speed * dt * 1.2;
    a.mesh.userData.rearWheels.forEach((w) => w.rotation.x = a.wheelSpin);
    a.mesh.userData.frontWheels.forEach((w) => w.rotation.x = a.wheelSpin);
  }
}

// progress metric for ranking (higher = further)
function progressOf(lap, u01) { return (lap - 1) + u01; }
function playerProgress() { return progressOf(player.lap, player.idx / SAMPLES); }

function updateStandings() {
  const field = [{ p: playerProgress(), isPlayer: true, finished: player.finished, ft: player.finishTime }];
  ai.forEach((a) => field.push({ p: progressOf(a.lap, a.u), isPlayer: false }));
  field.sort((x, y) => y.p - x.p);
  const place = field.findIndex((f) => f.isPlayer) + 1;
  return place;
}

// ----------------------------------------------------------------------------
// HUD
// ----------------------------------------------------------------------------
const placeEl = document.getElementById("place");
const lapEl = document.getElementById("lap");
const speedEl = document.getElementById("speed");
const boostBar = document.getElementById("boost-bar");
const countdownEl = document.getElementById("countdown");
const toast = document.getElementById("toast");
let toastTimer = 0;
function flash(msg) { toast.textContent = msg; toast.classList.add("show"); toastTimer = 2.0; }

document.getElementById("laps").textContent = LAPS;
function updateHUD(dt) {
  speedEl.textContent = Math.round(Math.abs(player.speed) * 3.6);
  lapEl.textContent = Math.min(player.lap, LAPS);
  placeEl.textContent = updateStandings();

  // boost meter: show drift charge (filling) or active boost (firing)
  let pct = 0, cls = "", firing = false;
  if (player.boost > 0) { pct = 100; cls = TIER[player.boostTier].cls; firing = true; }
  else if (player.drifting) {
    const tier = currentTier(player.driftCharge);
    pct = clamp((player.driftCharge / TIER[2].t) * 100, 0, 100);
    cls = tier >= 1 ? TIER[tier].cls : "";
  }
  boostBar.style.width = pct + "%";
  boostBar.className = "bar-fill boost-fill " + cls + (firing ? " firing" : "");
  boostBar.style.color = firing ? "#" + TIER[player.boostTier].color.toString(16) : "";

  // engine note tracks speed; screen speed-lines while boosting
  SFX.setEngine(clamp(Math.abs(player.speed) / 90, 0, 1));
  wrap.classList.toggle("boosting", player.boost > 0);

  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toast.classList.remove("show"); }
}

function showCountdown(text) {
  countdownEl.textContent = text;
  countdownEl.classList.remove("show");
  void countdownEl.offsetWidth; // restart animation
  countdownEl.classList.add("show");
  SFX.beep(text === "GO!");
}

// boost pad glow pulse
function animatePads() {
  const k = 1.2 + Math.sin(performance.now() / 250) * 0.6;
  boostPads.forEach((p) => p.mesh.material.emissiveIntensity = k);
}

// ----------------------------------------------------------------------------
// Race flow
// ----------------------------------------------------------------------------
const overlay = document.getElementById("overlay");
const overlayBody = document.getElementById("overlay-body");
const startBtn = document.getElementById("start-btn");
const hud = document.getElementById("hud");

function startRace() {
  clearRacers();
  spawnRacers();
  applyDayNight();
  raceTime = 0;
  raceState = "countdown";
  countdownT = 3.999;
  overlay.classList.add("hidden");
  hud.classList.remove("hidden");
  camCurrent.set(player.x, 20, player.z - 30);
  SFX.init(); SFX.startEngine(); SFX.startMusic();
}
startBtn.addEventListener("click", () => { if (!startBtn.disabled) { SFX.init(); startRace(); } });

function finishPlayer() {
  player.finished = true;
  player.finishTime = raceTime;
  const place = updateStandings();
  raceState = "done";
  SFX.jingle();
  setTimeout(() => showResults(place), 800);
}

function showResults(place) {
  SFX.stopEngine(); SFX.stopMusic();
  wrap.classList.remove("boosting");
  const medals = ["🥇", "🥈", "🥉", "🏁"];
  hud.classList.add("hidden");
  overlay.classList.remove("hidden");
  overlayBody.innerHTML = `
    <p style="font-size:64px;margin:6px 0">${medals[clamp(place - 1, 0, 3)]}</p>
    <p style="font-size:30px;font-weight:800;color:var(--accent)">מקום ${place}</p>
    <p class="how">זמן: ${player.finishTime.toFixed(2)} שניות · ${LAPS} הקפות</p>`;
  startBtn.textContent = "מירוץ חדש";
}

// ----------------------------------------------------------------------------
// Resize
// ----------------------------------------------------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
});

// ----------------------------------------------------------------------------
// Boot + loop
// ----------------------------------------------------------------------------
function boot() {
  buildEnvironment();   // capture sky into a reflection map for the car paint
  setupComposer();      // bloom post-processing (optional)
  buildTrack();
  // show a kart idling on the start line behind the menu
  spawnRacers();
  raceState = "idle";
  applyDayNight();
  startBtn.disabled = false;
  startBtn.textContent = "התחל מירוץ";
  document.getElementById("load-note").textContent = "מוכן! לחץ כדי לזנק";
  loadCarModel();   // upgrade to the real sports-car model in the background
}

const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (raceState === "countdown") {
    const prev = Math.ceil(countdownT);
    countdownT -= dt;
    const now = Math.ceil(countdownT);
    if (now !== prev) showCountdown(now > 0 ? String(now) : "GO!");
    if (countdownT <= 0) { raceState = "racing"; }
    updateAI(dt);
  } else if (raceState === "racing") {
    raceTime += dt;
    updatePlayer(dt);
    updateAI(dt);
    updateHUD(dt);
  } else if (raceState === "done") {
    updatePlayer(dt);  // let the player coast to a stop
    updateAI(dt);
    updateHUD(dt);
  }

  updateSparks(dt);
  animatePads();
  updateCamera(dt);
  // keep the sun following the action for crisp shadows
  sun.position.set(player.x + 180, 240, player.z + 120);
  sun.target.position.set(player.x, 0, player.z);
  if (composer) composer.render(dt); else renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

boot();
loop();
