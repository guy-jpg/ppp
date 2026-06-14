/* =========================================================================
   SPEED RIVALS — Engine Edition (v2)
   Arcade kart racer rebuilt on the Babylon.js game engine.
   Uses PBR materials, image-based lighting from an HDR environment, real-time
   shadows, and Babylon's DefaultRenderingPipeline (bloom, ACES tone mapping,
   FXAA, vignette, grain, sharpen) for a modern, cinematic look.
   ========================================================================= */
(function () {
  "use strict";
  const V3 = BABYLON.Vector3;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // --- Engine / scene ---------------------------------------------------------
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, true, { antialias: true, adaptToDeviceRatio: true, stencil: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.55, 0.72, 0.9, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
  scene.fogColor = new BABYLON.Color3(0.74, 0.84, 0.93);
  scene.fogStart = 350; scene.fogEnd = 1500;

  // --- Environment (IBL + skybox) — instant realistic reflections/sky ---------
  let envTex;
  try {
    envTex = BABYLON.CubeTexture.CreateFromPrefilteredData(
      "https://assets.babylonjs.com/environments/environmentSpecular.env", scene);
    scene.environmentTexture = envTex;
    scene.environmentIntensity = 1.15;
    scene.createDefaultSkybox(envTex, true, 5000, 0.22, false);
  } catch (e) { console.warn("env load issue", e); }

  // --- Camera -----------------------------------------------------------------
  const camera = new BABYLON.FreeCamera("cam", new V3(0, 20, -40), scene);
  camera.minZ = 0.4; camera.maxZ = 6000;
  camera.fov = 1.05;
  scene.activeCamera = camera;

  // --- Lights + shadows -------------------------------------------------------
  const hemi = new BABYLON.HemisphericLight("hemi", new V3(0.2, 1, 0.1), scene);
  hemi.intensity = 0.55;
  hemi.groundColor = new BABYLON.Color3(0.25, 0.3, 0.2);
  const sun = new BABYLON.DirectionalLight("sun", new V3(-0.6, -1, -0.4), scene);
  sun.position = new V3(300, 500, 250);
  sun.intensity = 2.8;
  const shadow = new BABYLON.ShadowGenerator(2048, sun);
  shadow.useBlurExponentialShadowMap = true;
  shadow.blurKernel = 32;
  shadow.darkness = 0.45;

  // --- Post-processing pipeline (the engine "wow") ----------------------------
  const pipeline = new BABYLON.DefaultRenderingPipeline("default", true, scene, [camera]);
  pipeline.fxaaEnabled = true;
  pipeline.samples = 4;
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.85;
  pipeline.bloomWeight = 0.4;
  pipeline.bloomKernel = 64;
  pipeline.bloomScale = 0.6;
  pipeline.imageProcessing.toneMappingEnabled = true;
  pipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  pipeline.imageProcessing.exposure = 1.15;
  pipeline.imageProcessing.contrast = 1.1;
  pipeline.imageProcessing.vignetteEnabled = true;
  pipeline.imageProcessing.vignetteWeight = 2.2;
  pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0, 0);
  pipeline.grainEnabled = true; pipeline.grain.intensity = 4; pipeline.grain.animated = true;
  pipeline.sharpenEnabled = true; pipeline.sharpen.edgeAmount = 0.2;

  // --- Track (closed Catmull-Rom spline) --------------------------------------
  const HALF_W = 11;
  const CP = [
    [0, -220], [150, -190], [235, -80], [200, 50], [110, 95], [70, 200],
    [-40, 215], [-150, 165], [-235, 40], [-205, -90], [-110, -170], [-40, -215],
  ].map((p) => new V3(p[0], 0, p[1]));
  const spline = BABYLON.Curve3.CreateCatmullRomSpline(CP, 26, true);
  const centers = spline.getPoints();
  const SAMPLES = centers.length;
  const normals = [], tangents = [];
  let TRACK_LEN = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const a = centers[i], b = centers[(i + 1) % SAMPLES];
    const dir = b.subtract(a); dir.y = 0;
    const len = dir.length() || 1; dir.scaleInPlace(1 / len);
    tangents.push(dir);
    normals.push(new V3(-dir.z, 0, dir.x));
    TRACK_LEN += a.subtract(b).length();
  }

  // ground
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 4000, height: 4000 }, scene);
  const gm = new BABYLON.PBRMaterial("gm", scene);
  gm.albedoColor = new BABYLON.Color3(0.20, 0.46, 0.24);
  gm.metallic = 0; gm.roughness = 1;
  ground.material = gm; ground.receiveShadows = true;
  ground.position.y = -0.02;

  // road ribbon
  const left = [], right = [];
  for (let i = 0; i < SAMPLES; i++) {
    const c = centers[i], n = normals[i];
    left.push(new V3(c.x + n.x * HALF_W, 0.05, c.z + n.z * HALF_W));
    right.push(new V3(c.x - n.x * HALF_W, 0.05, c.z - n.z * HALF_W));
  }
  const road = BABYLON.MeshBuilder.CreateRibbon("road",
    { pathArray: [left, right], closePath: true, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
  const rm = new BABYLON.PBRMaterial("rm", scene);
  rm.albedoColor = new BABYLON.Color3(0.09, 0.10, 0.12);
  rm.metallic = 0; rm.roughness = 0.85;
  road.material = rm; road.receiveShadows = true;

  // centre lane line (thin emissive ribbon)
  const ll = [], lr = [];
  for (let i = 0; i < SAMPLES; i++) {
    if (i % 2 === 0) continue;
    const c = centers[i], n = normals[i];
    ll.push(new V3(c.x + n.x * 0.35, 0.07, c.z + n.z * 0.35));
    lr.push(new V3(c.x - n.x * 0.35, 0.07, c.z - n.z * 0.35));
  }

  // curbs (red/white) via thin instances on a single box
  const curb = BABYLON.MeshBuilder.CreateBox("curb", { width: 2.4, height: 0.4, depth: 3.4 }, scene);
  const curbMat = new BABYLON.PBRMaterial("curbMat", scene);
  curbMat.albedoColor = new BABYLON.Color3(1, 1, 1); curbMat.roughness = 0.7; curbMat.metallic = 0;
  curb.material = curbMat;
  const red = curb.clone("curbRed");
  const redMat = curbMat.clone("redMat"); redMat.albedoColor = new BABYLON.Color3(0.85, 0.2, 0.2); red.material = redMat;
  const whiteMats = [], redMats = [];
  let toggle = 0;
  curb.isVisible = false; red.isVisible = false;
  const curbMeshes = [];
  for (let i = 0; i < SAMPLES; i += 3) {
    const c = centers[i], n = normals[i], t = tangents[i];
    const ang = Math.atan2(t.x, t.z);
    [HALF_W + 1.3, -(HALF_W + 1.3)].forEach((off) => {
      const src = toggle % 2 === 0 ? curb : red;
      const m = src.createInstance("c" + i + off);
      m.position.set(c.x + n.x * off, 0.2, c.z + n.z * off);
      m.rotation.y = ang;
      curbMeshes.push(m);
    });
    toggle++;
  }

  // start/finish gantry
  (function gantry() {
    const c = centers[0], n = normals[0], t = tangents[0];
    const ang = Math.atan2(t.x, t.z);
    const pm = new BABYLON.PBRMaterial("pm", scene);
    pm.albedoColor = new BABYLON.Color3(0.12, 0.13, 0.16); pm.metallic = 0.4; pm.roughness = 0.5;
    [HALF_W + 1.5, -(HALF_W + 1.5)].forEach((off) => {
      const post = BABYLON.MeshBuilder.CreateBox("post", { width: 1, height: 9, depth: 1 }, scene);
      post.position.set(c.x + n.x * off, 4.5, c.z + n.z * off); post.rotation.y = ang; post.material = pm;
      shadow.addShadowCaster(post);
    });
    const beam = BABYLON.MeshBuilder.CreateBox("beam", { width: (HALF_W + 1.5) * 2 + 1, height: 1.8, depth: 1.2 }, scene);
    beam.position.set(c.x, 9.2, c.z); beam.rotation.y = ang; beam.material = pm;
  })();

  // boost pads (emissive — they glow through bloom)
  const boostPads = [];
  (function pads() {
    const pm = new BABYLON.PBRMaterial("padMat", scene);
    pm.albedoColor = new BABYLON.Color3(0.1, 0.5, 1);
    pm.emissiveColor = new BABYLON.Color3(0.15, 0.6, 1.2);
    pm.metallic = 0; pm.roughness = 0.4;
    [60, 200, 360, 520, 680].forEach((i) => {
      const c = centers[i % SAMPLES], t = tangents[i % SAMPLES];
      const pad = BABYLON.MeshBuilder.CreateBox("pad" + i, { width: 10, height: 0.2, depth: 8 }, scene);
      pad.position.set(c.x, 0.12, c.z); pad.rotation.y = Math.atan2(t.x, t.z);
      pad.material = pm;
      boostPads.push({ mesh: pad, x: c.x, z: c.z });
    });
  })();

  // --- Car model (glTF) with a procedural box fallback ------------------------
  let carContainer = null;
  const KART_COLORS = [
    new BABYLON.Color3(1, 0.82, 0.25), new BABYLON.Color3(0.9, 0.25, 0.25),
    new BABYLON.Color3(0.3, 0.55, 0.95), new BABYLON.Color3(0.3, 0.8, 0.4),
  ];

  function buildBoxCar(color) {
    const root = new BABYLON.TransformNode("boxcar", scene);
    const mat = new BABYLON.PBRMaterial("bcm", scene);
    mat.albedoColor = color; mat.metallic = 0.6; mat.roughness = 0.3;
    const body = BABYLON.MeshBuilder.CreateBox("b", { width: 2, height: 1, depth: 4.2 }, scene);
    body.material = mat; body.position.y = 0.7; body.parent = root; shadow.addShadowCaster(body);
    const cabin = BABYLON.MeshBuilder.CreateBox("cab", { width: 1.5, height: 0.7, depth: 1.8 }, scene);
    const cm = new BABYLON.PBRMaterial("cm", scene); cm.albedoColor = new BABYLON.Color3(0.05, 0.06, 0.08);
    cm.metallic = 0.3; cm.roughness = 0.1; cabin.material = cm; cabin.position.set(0, 1.3, -0.2); cabin.parent = root;
    return root;
  }

  function makeCar(color) {
    if (carContainer) {
      try {
        const e = carContainer.instantiateModelsToScene(undefined, false);
        const root = e.rootNodes[0];
        root.getChildMeshes().forEach((m) => { m.receiveShadows = true; shadow.addShadowCaster(m); });
        return root;
      } catch (err) { console.warn("instantiate failed", err); }
    }
    return buildBoxCar(color);
  }

  // --- Racers -----------------------------------------------------------------
  const LAPS = 3;
  const MODEL_YAW = Math.PI;   // tune if the model faces the wrong way
  const player = { node: null, x: 0, z: 0, heading: 0, speed: 0,
    drifting: false, driftDir: 0, driftCharge: 0, boost: 0, boostSpeed: 0, boostTier: 0,
    idx: 44, lap: 1, passedHalf: false, finished: false, finishTime: 0 };
  let ai = [];
  let raceState = "idle", countdownT = 0, raceTime = 0, lastPlace = 4;
  let playerSearch = 44;

  function gridPos(slot) {
    const gi = (44 - slot * 11 + SAMPLES) % SAMPLES;
    const c = centers[gi], n = normals[gi];
    const off = (slot % 2 === 0 ? 1 : -1) * 4.5;
    return { x: c.x + n.x * off, z: c.z + n.z * off, heading: Math.atan2(tangents[gi].x, tangents[gi].z), index: gi };
  }

  function placeNode(node, x, z, heading) {
    node.position.set(x, 0, z);
    node.rotation = new V3(0, heading + MODEL_YAW, 0);
  }

  function disposeNode(n) { if (n) n.dispose(); }

  function spawnRacers() {
    disposeNode(player.node);
    ai.forEach((a) => disposeNode(a.node));
    ai = [];

    const sp = gridPos(0);
    player.node = makeCar(KART_COLORS[0]);
    Object.assign(player, { x: sp.x, z: sp.z, heading: sp.heading, speed: 0, idx: sp.index,
      lap: 1, passedHalf: false, finished: false, drifting: false, driftCharge: 0, boost: 0, boostTier: 0 });
    placeNode(player.node, sp.x, sp.z, sp.heading);
    playerSearch = sp.index;

    for (let i = 1; i <= 3; i++) {
      const g = gridPos(i);
      const node = makeCar(KART_COLORS[i]);
      placeNode(node, g.x, g.z, g.heading);
      ai.push({ node, u: g.index / SAMPLES, lane: (i % 2 ? 1 : -1) * rand(2, 5),
        speed: 0, baseSpeed: rand(40, 46), lap: 1 });
    }
  }

  // --- Input ------------------------------------------------------------------
  const keys = {};
  const norm = (k) => ({ w: "ArrowUp", W: "ArrowUp", s: "ArrowDown", S: "ArrowDown",
    a: "ArrowLeft", A: "ArrowLeft", d: "ArrowRight", D: "ArrowRight" }[k] || k);
  window.addEventListener("keydown", (e) => {
    const k = norm(e.key); keys[k] = true;
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k)) e.preventDefault();
    if (k === "c" || k === "C") camMode = (camMode + 1) % 3;
    if (k === "m" || k === "M") flash(SFX.toggleMute() ? "🔇 הושתק" : "🔊 קול פעיל");
  }, { passive: false });
  window.addEventListener("keyup", (e) => { keys[norm(e.key)] = false; });

  const isTouch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
  if (isTouch) document.getElementById("touch-controls").classList.remove("hidden");
  document.querySelectorAll(".tc").forEach((btn) => {
    const key = btn.dataset.key;
    const press = (e) => { e.preventDefault(); keys[key] = true; };
    const release = (e) => { e.preventDefault(); keys[key] = false; };
    ["touchstart", "mousedown"].forEach((ev) => btn.addEventListener(ev, press, { passive: false }));
    ["touchend", "mouseup", "mouseleave"].forEach((ev) => btn.addEventListener(ev, release, { passive: false }));
  });

  // --- Sound (synthesized) ----------------------------------------------------
  const SFX = {
    ctx: null, master: null, muted: false, engineOsc: null, engineSub: null, engineGain: null, engineFilter: null,
    noiseBuf: null, musicTimer: null, musicStep: 0,
    init() {
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
          this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.5;
          this.master.connect(this.ctx.destination);
          const len = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
          const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        }
        if (this.ctx.state === "suspended") this.ctx.resume();
      } catch (e) {}
    },
    startEngine() {
      if (!this.ctx || this.engineOsc) return;
      const o = this.ctx.createOscillator(); o.type = "triangle"; o.frequency.value = 48;
      const sub = this.ctx.createOscillator(); sub.type = "sine"; sub.frequency.value = 24;
      const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500;
      const g = this.ctx.createGain(); g.gain.value = 0;
      o.connect(f); sub.connect(f); f.connect(g); g.connect(this.master); o.start(); sub.start();
      this.engineOsc = o; this.engineSub = sub; this.engineGain = g; this.engineFilter = f;
    },
    setEngine(s) {
      if (!this.engineGain) return; const t = this.ctx.currentTime, tc = 0.08;
      this.engineGain.gain.setTargetAtTime(0.02 + 0.05 * s, t, tc);
      this.engineOsc.frequency.setTargetAtTime(46 + 80 * s, t, tc);
      this.engineSub.frequency.setTargetAtTime(23 + 40 * s, t, tc);
      this.engineFilter.frequency.setTargetAtTime(420 + 1100 * s, t, tc);
    },
    stopEngine() { if (this.engineOsc) { try { this.engineOsc.stop(); this.engineSub.stop(); } catch (e) {} this.engineOsc = null; this.engineGain = null; } },
    boost() {
      if (!this.ctx || !this.noiseBuf) return; const t = this.ctx.currentTime;
      const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
      const f = this.ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2;
      f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3500, t + 0.4);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + 0.65);
    },
    tone(freq, dur, type, vol) {
      if (!this.ctx) return; const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(); o.type = type || "triangle"; o.frequency.value = freq;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.25));
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + (dur || 0.25) + 0.02);
    },
    beep(go) { this.tone(go ? 880 : 440, go ? 0.5 : 0.22, "square", 0.3); },
    jingle() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, "triangle", 0.3), i * 130)); },
    startMusic() {
      if (!this.ctx || this.musicTimer) return; const scale = [220, 277, 330, 415, 440, 415, 330, 277]; this.musicStep = 0;
      this.musicTimer = setInterval(() => { if (this.muted) return; const f = scale[this.musicStep % scale.length];
        this.tone(f, 0.22, "triangle", 0.035); if (this.musicStep % 2 === 0) this.tone(f / 2, 0.3, "sine", 0.05); this.musicStep++; }, 260);
    },
    stopMusic() { if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; } },
    toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.5; return this.muted; },
  };

  // --- Camera -----------------------------------------------------------------
  let camMode = 0;
  const camPos = new V3(0, 20, -40);
  const camLook = new V3(0, 0, 0);
  function updateCamera(dt) {
    const fwd = new V3(Math.sin(player.heading), 0, Math.cos(player.heading));
    const p = new V3(player.x, 0, player.z);
    let desired, look;
    if (camMode === 0) {
      desired = p.add(fwd.scale(-11)).add(new V3(0, 5, 0));
      look = p.add(fwd.scale(8)).add(new V3(0, 1.3, 0));
    } else if (camMode === 1) {
      desired = p.add(fwd.scale(-6)).add(new V3(0, 14, 0));
      look = p.add(fwd.scale(5));
    } else {
      desired = p.add(fwd.scale(1)).add(new V3(0, 2, 0));
      look = p.add(fwd.scale(14)).add(new V3(0, 1.6, 0));
    }
    const tp = 1 - Math.pow(0.0016, dt), tl = 1 - Math.pow(0.0006, dt);
    V3.LerpToRef(camPos, desired, tp, camPos);
    V3.LerpToRef(camLook, look, tl, camLook);
    const sr = clamp(Math.abs(player.speed) / 85, 0, 1);
    const amp = sr * 0.14 + (player.boost > 0 ? 0.12 : 0);
    const tms = performance.now() * 0.04;
    camera.position.set(camPos.x + Math.sin(tms * 1.3) * amp, camPos.y + Math.cos(tms * 1.7) * amp, camPos.z + Math.sin(tms * 2.1) * amp * 0.5);
    camera.setTarget(camLook);
    const targetFov = lerp(1.05, 1.5, sr) + (player.boost > 0 ? 0.07 : 0);
    camera.fov = lerp(camera.fov, targetFov, 1 - Math.pow(0.02, dt));
  }

  // --- Driving + drift/boost --------------------------------------------------
  const TIER = [
    { t: 0.55, time: 0.9, speed: 16, color: 0x3aa0ff, cls: "" },
    { t: 1.3, time: 1.5, speed: 24, color: 0xff8a00, cls: "tier-turbo" },
    { t: 2.1, time: 2.1, speed: 34, color: 0xb14cff, cls: "tier-ultra" },
  ];
  function currentTier(charge) { let t = -1; for (let k = 0; k < TIER.length; k++) if (charge >= TIER[k].t) t = k; return t; }
  function releaseDrift() { const tier = currentTier(player.driftCharge); if (tier >= 0) fireBoost(tier); player.drifting = false; player.driftCharge = 0; }
  function fireBoost(tier, fromPad) {
    const def = TIER[clamp(tier, 0, 2)];
    player.boost = Math.max(player.boost, def.time);
    player.boostSpeed = def.speed + (fromPad ? 6 : 0);
    player.boostColor = def.color; player.boostTier = tier;
    SFX.boost(); if (fromPad) flash("⚡ בוסט!");
  }

  function nearestIndex(x, z) {
    let best = playerSearch, bd = Infinity;
    for (let k = -25; k <= 70; k++) {
      const idx = ((playerSearch + k) % SAMPLES + SAMPLES) % SAMPLES;
      const c = centers[idx]; const d = (c.x - x) ** 2 + (c.z - z) ** 2;
      if (d < bd) { bd = d; best = idx; }
    }
    playerSearch = best; player.idx = best; return best;
  }

  function updatePlayer(dt) {
    const driving = raceState === "racing" && !player.finished;
    const baseMax = 58, boostMax = baseMax + (player.boost > 0 ? player.boostSpeed : 0);
    const accel = player.boost > 0 ? 80 : 46;
    if (driving && keys.ArrowUp) player.speed += accel * dt;
    else if (driving && keys.ArrowDown) player.speed -= (player.speed > 2 ? 75 : 36) * dt;
    else { player.speed -= Math.sign(player.speed) * Math.min(Math.abs(player.speed), 12) * 0.8 * dt; if (Math.abs(player.speed) < 0.3) player.speed = 0; }
    player.speed = clamp(player.speed, -16, boostMax);

    const steer = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0);
    const sf = clamp(Math.abs(player.speed) / 12, 0, 1);
    const wantDrift = driving && keys[" "] && Math.abs(player.speed) > 22 && steer !== 0;
    if (wantDrift && !player.drifting) { player.drifting = true; player.driftDir = Math.sign(steer); player.driftCharge = 0; }
    if (player.drifting && (!keys[" "] || Math.abs(player.speed) < 12)) releaseDrift();

    if (player.drifting) {
      player.heading += 3.1 * dt * sf * player.driftDir + steer * 0.6 * dt * sf;
      player.driftCharge += dt; player.speed *= (1 - 0.25 * dt);
    } else {
      player.heading += 2.3 * dt * sf * Math.sign(player.speed || 1) * steer;
    }
    if (player.boost > 0) player.boost -= dt;

    const fwd = new V3(Math.sin(player.heading), 0, Math.cos(player.heading));
    player.x += fwd.x * player.speed * dt;
    player.z += fwd.z * player.speed * dt;

    const i = nearestIndex(player.x, player.z);
    const c = centers[i]; const d = Math.hypot(player.x - c.x, player.z - c.z);
    if (d > HALF_W + 1) player.speed *= (1 - 1.6 * dt);
    if (d > HALF_W + 22) {
      const dx = player.x - c.x, dz = player.z - c.z, dl = Math.hypot(dx, dz) || 1;
      player.x = c.x + (dx / dl) * (HALF_W + 22); player.z = c.z + (dz / dl) * (HALF_W + 22); player.speed *= 0.4;
    }
    for (const pad of boostPads) if ((player.x - pad.x) ** 2 + (player.z - pad.z) ** 2 < 36) fireBoost(2, true);

    if (i > SAMPLES * 0.4 && i < SAMPLES * 0.75) player.passedHalf = true;
    if (player.passedHalf && i < SAMPLES * 0.06) {
      player.passedHalf = false; player.lap++;
      if (player.lap > LAPS) finishPlayer(); else flash(player.lap === LAPS ? "🏁 הקפה אחרונה!" : "הקפה " + player.lap);
    }

    placeNode(player.node, player.x, player.z, player.heading + (player.drifting ? player.driftDir * 0.35 : 0));
  }

  function updateAI(dt) {
    const racing = raceState === "racing"; const pp = progressOf(player.lap, player.idx / SAMPLES);
    for (const a of ai) {
      const gap = progressOf(a.lap, a.u) - pp;
      const target = clamp(a.baseSpeed - gap * 320, a.baseSpeed - 16, a.baseSpeed + 26);
      a.speed = racing ? lerp(a.speed, target, 0.06) : lerp(a.speed, 0, 0.1);
      a.u += (a.speed * dt) / TRACK_LEN;
      if (a.u >= 1) { a.u -= 1; a.lap++; }
      const fi = a.u * SAMPLES, i0 = Math.floor(fi) % SAMPLES, f = fi - Math.floor(fi);
      const c0 = centers[i0], c1 = centers[(i0 + 1) % SAMPLES], n = normals[i0], t = tangents[i0];
      const lane = a.lane + Math.sin(a.u * Math.PI * 8) * 1.5;
      const x = lerp(c0.x, c1.x, f) + n.x * lane, z = lerp(c0.z, c1.z, f) + n.z * lane;
      placeNode(a.node, x, z, Math.atan2(t.x, t.z));
    }
  }

  function progressOf(lap, u01) { return (lap - 1) + u01; }
  function standings() {
    const field = [{ p: progressOf(player.lap, player.idx / SAMPLES), me: true }];
    ai.forEach((a) => field.push({ p: progressOf(a.lap, a.u), me: false }));
    field.sort((x, y) => y.p - x.p);
    return field.findIndex((f) => f.me) + 1;
  }

  // --- HUD --------------------------------------------------------------------
  const placeEl = document.getElementById("place"), lapEl = document.getElementById("lap"),
    speedEl = document.getElementById("speed"), boostBar = document.getElementById("boost-bar"),
    countdownEl = document.getElementById("countdown"), toast = document.getElementById("toast"),
    wrap = document.getElementById("game-wrap");
  let toastTimer = 0;
  function flash(msg) { toast.textContent = msg; toast.classList.add("show"); toastTimer = 2.0; }
  document.getElementById("laps").textContent = LAPS;

  function updateHUD(dt) {
    speedEl.textContent = Math.round(Math.abs(player.speed) * 3.6);
    lapEl.textContent = Math.min(player.lap, LAPS);
    const place = standings(); placeEl.textContent = place;
    if (place !== lastPlace) {
      if (place < lastPlace && !player.finished) flash(place === 1 ? "🥇 תפסת את ההובלה!" : "⬆️ עקפת — מקום " + place);
      else if (place > lastPlace) flash("⬇️ נעקפת — מקום " + place);
      lastPlace = place;
    }
    let pct = 0, cls = "", firing = false;
    if (player.boost > 0) { pct = 100; cls = TIER[player.boostTier].cls; firing = true; }
    else if (player.drifting) { const tier = currentTier(player.driftCharge); pct = clamp((player.driftCharge / TIER[2].t) * 100, 0, 100); cls = tier >= 1 ? TIER[tier].cls : ""; }
    boostBar.style.width = pct + "%";
    boostBar.className = "bar-fill boost-fill " + cls + (firing ? " firing" : "");
    SFX.setEngine(clamp(Math.abs(player.speed) / 90, 0, 1));
    wrap.classList.toggle("boosting", player.boost > 0 || Math.abs(player.speed) > 66);
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toast.classList.remove("show"); }
  }

  function showCountdown(text) {
    countdownEl.textContent = text; countdownEl.classList.remove("show");
    void countdownEl.offsetWidth; countdownEl.classList.add("show"); SFX.beep(text === "GO!");
  }

  // --- Race flow --------------------------------------------------------------
  const overlay = document.getElementById("overlay"), overlayBody = document.getElementById("overlay-body"),
    startBtn = document.getElementById("start-btn"), hud = document.getElementById("hud");

  function startRace() {
    spawnRacers(); raceTime = 0; raceState = "countdown"; countdownT = 3.999; lastPlace = 4;
    overlay.classList.add("hidden"); hud.classList.remove("hidden");
    camPos.set(player.x, 20, player.z - 30); camLook.set(player.x, 1.3, player.z);
    SFX.init(); SFX.startEngine(); SFX.startMusic();
  }
  startBtn.addEventListener("click", () => { if (!startBtn.disabled) { SFX.init(); startRace(); } });

  function finishPlayer() {
    player.finished = true; player.finishTime = raceTime; const place = standings(); raceState = "done"; SFX.jingle();
    setTimeout(() => showResults(place), 800);
  }
  function showResults(place) {
    SFX.stopEngine(); SFX.stopMusic(); wrap.classList.remove("boosting");
    const medals = ["🥇", "🥈", "🥉", "🏁"];
    hud.classList.add("hidden"); overlay.classList.remove("hidden");
    overlayBody.innerHTML = '<p style="font-size:64px;margin:6px 0">' + medals[clamp(place - 1, 0, 3)] + '</p>' +
      '<p style="font-size:30px;font-weight:800;color:var(--accent)">מקום ' + place + '</p>' +
      '<p class="how">זמן: ' + player.finishTime.toFixed(2) + ' שניות · ' + LAPS + ' הקפות</p>';
    startBtn.querySelector(".btn-label") ? startBtn.querySelector(".btn-label").textContent = "מירוץ חדש" : startBtn.textContent = "מירוץ חדש";
  }

  // --- Boot -------------------------------------------------------------------
  function ready() {
    startBtn.disabled = false;
    const lbl = startBtn.querySelector(".btn-label"); if (lbl) lbl.textContent = "התחל מירוץ"; else startBtn.textContent = "התחל מירוץ";
    document.getElementById("load-note").textContent = "מוכן! לחץ כדי לזנק";
  }

  // load the car model, then enable the game
  BABYLON.SceneLoader.LoadAssetContainer(
    "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r137/examples/models/gltf/", "ferrari.glb", scene,
    (container) => { carContainer = container; spawnRacers(); ready(); flash("🚗 מודל רכב נטען"); },
    null,
    (s, msg) => { console.warn("car model failed, using box cars", msg); spawnRacers(); ready(); }
  );
  // safety: enable after 8s even if the loader never calls back
  setTimeout(() => { if (startBtn.disabled) { if (!player.node) spawnRacers(); ready(); } }, 8000);

  // --- Main loop --------------------------------------------------------------
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    if (raceState === "countdown") {
      const prev = Math.ceil(countdownT); countdownT -= dt; const now = Math.ceil(countdownT);
      if (now !== prev) showCountdown(now > 0 ? String(now) : "GO!");
      if (countdownT <= 0) raceState = "racing";
      updateAI(dt);
    } else if (raceState === "racing") {
      raceTime += dt; updatePlayer(dt); updateAI(dt); updateHUD(dt);
    } else if (raceState === "done") {
      updatePlayer(dt); updateAI(dt); updateHUD(dt);
    }
    if (player.node) updateCamera(dt);
    sun.position.set(player.x + 300, 500, player.z + 250);
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());
})();
