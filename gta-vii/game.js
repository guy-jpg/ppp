/* =========================================================================
   GTA VII — Liberty Shores
   Top-down 2D open-world mini-game. Pure HTML5 Canvas, no dependencies.
   ========================================================================= */
(() => {
  "use strict";

  // ---------- Canvas & context ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // ---------- World constants ----------
  const TILE = 80;                 // size of one map cell
  const MAP_W = 28, MAP_H = 28;    // map size in tiles
  const WORLD_W = MAP_W * TILE;
  const WORLD_H = MAP_H * TILE;
  const ROAD_EVERY = 4;            // every Nth row/col is a road

  // ---------- Helpers ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const lerpAngle = (a, b, t) => {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + d * t;
  };

  function isRoadTile(tx, ty) {
    return tx % ROAD_EVERY === 0 || ty % ROAD_EVERY === 0;
  }
  function isRoadPoint(x, y) {
    return isRoadTile(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  // ---------- Input ----------
  const keys = {};
  const norm = (k) => {
    if (k === "w" || k === "W") return "ArrowUp";
    if (k === "s" || k === "S") return "ArrowDown";
    if (k === "a" || k === "A") return "ArrowLeft";
    if (k === "d" || k === "D") return "ArrowRight";
    return k;
  };
  window.addEventListener("keydown", (e) => {
    const k = norm(e.key);
    keys[k] = true;
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k)) e.preventDefault();
    if (k === "f" || k === "F") tryEnterExit();
  }, { passive: false });
  window.addEventListener("keyup", (e) => { keys[norm(e.key)] = false; });

  // Touch controls
  const isTouch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
  if (isTouch) document.getElementById("touch-controls").classList.remove("hidden");
  document.querySelectorAll(".tc").forEach((btn) => {
    const key = btn.dataset.key;
    const press = (e) => { e.preventDefault(); keys[key] = true; if (key === "f") tryEnterExit(); };
    const release = (e) => { e.preventDefault(); keys[key] = false; };
    btn.addEventListener("touchstart", press, { passive: false });
    btn.addEventListener("touchend", release, { passive: false });
    btn.addEventListener("mousedown", press);
    btn.addEventListener("mouseup", release);
    btn.addEventListener("mouseleave", release);
  });

  // ---------- Game state ----------
  const State = {
    money: 0,
    health: 100,
    wanted: 0,
    running: false,
    cam: { x: 0, y: 0 },
  };

  // ---------- Entities ----------
  const player = {
    x: WORLD_W / 2 + TILE / 2, y: WORLD_H / 2,
    angle: 0, speed: 0,
    onFoot: true, car: null,
    radius: 11,
    shootCd: 0,
  };

  let traffic = [];
  let peds = [];
  let police = [];
  let bullets = [];
  let particles = [];
  let pickups = [];

  const CAR_COLORS = ["#e84c4c", "#4c8ee8", "#46c46a", "#e8b84c", "#9b59b6", "#e8e8e8", "#34495e", "#ff7f50"];

  function makeCar(x, y, isPolice = false) {
    return {
      x, y, angle: rand(0, Math.PI * 2), speed: 0,
      w: 34, h: 18,
      color: isPolice ? "#1c2b55" : CAR_COLORS[randInt(0, CAR_COLORS.length - 1)],
      isPolice,
      hp: isPolice ? 60 : 40,
      dir: [[1,0],[-1,0],[0,1],[0,-1]][randInt(0,3)],
      turnTimer: rand(1, 4),
      occupied: false,
    };
  }

  function spawnTraffic(n) {
    for (let i = 0; i < n; i++) {
      // place on a road tile
      let tx = randInt(0, MAP_W - 1), ty = randInt(0, MAP_H - 1);
      for (let a = 0; a < 20 && !isRoadTile(tx, ty); a++) { tx = randInt(0, MAP_W - 1); ty = randInt(0, MAP_H - 1); }
      const c = makeCar(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
      c.speed = rand(1, 2.5);
      traffic.push(c);
    }
  }

  function spawnPeds(n) {
    for (let i = 0; i < n; i++) {
      let tx = randInt(0, MAP_W - 1), ty = randInt(0, MAP_H - 1);
      peds.push({
        x: tx * TILE + rand(10, TILE - 10),
        y: ty * TILE + rand(10, TILE - 10),
        angle: rand(0, Math.PI * 2),
        speed: rand(0.4, 0.9),
        color: `hsl(${randInt(0,360)},45%,60%)`,
        wander: rand(1, 3),
        radius: 8,
        scared: 0,
      });
    }
  }

  // ---------- Missions ----------
  let mission = null;
  const missionText = document.getElementById("mission-text");
  const MISSIONS = [
    { type: "drive", label: "היכנס לרכב והגע לנקודה הצהובה", reward: 250 },
    { type: "drive", label: "משלוח דחוף! נהג אל היעד", reward: 400 },
    { type: "deliver", label: "אסוף את החבילה והבא אותה ליעד", reward: 600 },
    { type: "drive", label: "מרדף! הגע לנקודה לפני שייגמר הזמן", reward: 500, timed: 18 },
  ];

  function newMission() {
    const m = { ...MISSIONS[randInt(0, MISSIONS.length - 1)] };
    m.target = randomRoadPoint();
    if (m.type === "deliver") {
      m.pickup = randomRoadPoint();
      m.gotPackage = false;
    }
    if (m.timed) m.timeLeft = m.timed;
    mission = m;
    missionText.textContent = m.label;
    flash(m.timed ? "⏱ משימה מתוזמנת!" : "משימה חדשה!");
  }

  function randomRoadPoint() {
    let tx, ty, tries = 0;
    do { tx = randInt(2, MAP_W - 2); ty = randInt(2, MAP_H - 2); tries++; }
    while (!isRoadTile(tx, ty) && tries < 50);
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }

  function updateMission(dt) {
    if (!mission) return;
    const t = mission.target;

    if (mission.timed) {
      mission.timeLeft -= dt;
      missionText.textContent = `${mission.label}  (${Math.ceil(mission.timeLeft)} ש׳)`;
      if (mission.timeLeft <= 0) {
        flash("⌛ נכשלת במשימה");
        mission = null;
        setTimeout(newMission, 1500);
        return;
      }
    }

    // deliver: pick up package first
    if (mission.type === "deliver" && !mission.gotPackage) {
      if (dist(player.x, player.y, mission.pickup.x, mission.pickup.y) < 40) {
        mission.gotPackage = true;
        flash("📦 אספת את החבילה!");
      }
      return;
    }

    if (dist(player.x, player.y, t.x, t.y) < 44) {
      State.money += mission.reward;
      flash(`+$${mission.reward} משימה הושלמה!`);
      burst(t.x, t.y, "#ffd23f", 24);
      mission = null;
      setTimeout(newMission, 1400);
    }
  }

  // ---------- Enter / exit vehicle ----------
  function tryEnterExit() {
    if (!State.running) return;
    if (player.onFoot) {
      // find nearest car within range
      let best = null, bd = 46;
      for (const c of traffic) {
        const d = dist(player.x, player.y, c.x, c.y);
        if (d < bd) { bd = d; best = c; }
      }
      if (best) {
        player.car = best;
        best.occupied = true;
        best.isPolice = best.isPolice; // keep
        player.onFoot = false;
        player.angle = best.angle;
        flash("נכנסת לרכב");
      }
    } else {
      const c = player.car;
      c.occupied = false;
      c.speed = 0;
      player.onFoot = true;
      player.x = c.x + Math.cos(c.angle + Math.PI / 2) * 24;
      player.y = c.y + Math.sin(c.angle + Math.PI / 2) * 24;
      player.car = null;
      player.speed = 0;
    }
  }

  // ---------- Wanted system ----------
  let policeTimer = 0;
  function addWanted(n) {
    const before = State.wanted;
    State.wanted = clamp(State.wanted + n, 0, 5);
    if (State.wanted > before) flash("☆ רמת המבוקש עלתה!");
  }
  function updateWanted(dt) {
    // spawn police based on wanted level
    if (State.wanted > 0) {
      policeTimer -= dt;
      if (policeTimer <= 0 && police.length < State.wanted * 2) {
        policeTimer = 2.2;
        spawnPolice();
      }
    } else {
      // slowly clear police when no wanted
      if (police.length && Math.random() < 0.01) police.pop();
    }
  }
  function spawnPolice() {
    // spawn off near edge on a road
    let tx = randInt(0, MAP_W - 1), ty = randInt(0, MAP_H - 1);
    for (let a = 0; a < 20 && !isRoadTile(tx, ty); a++) { tx = randInt(0, MAP_W - 1); ty = randInt(0, MAP_H - 1); }
    const cop = {
      x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2,
      angle: 0, speed: 0, w: 34, h: 18,
      color: "#1c2b55", hp: 70, shootCd: rand(0.5, 1.5),
    };
    police.push(cop);
  }

  // ---------- Update loops ----------
  function updatePlayer(dt) {
    if (player.onFoot) {
      const sp = 130 * dt;
      let dx = 0, dy = 0;
      if (keys.ArrowUp) dy -= 1;
      if (keys.ArrowDown) dy += 1;
      if (keys.ArrowLeft) dx -= 1;
      if (keys.ArrowRight) dx += 1;
      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        player.x += (dx / len) * sp;
        player.y += (dy / len) * sp;
        player.angle = Math.atan2(dy, dx);
      }
      player.x = clamp(player.x, 10, WORLD_W - 10);
      player.y = clamp(player.y, 10, WORLD_H - 10);

      // shooting
      player.shootCd -= dt;
      if (keys[" "] && player.shootCd <= 0) {
        player.shootCd = 0.18;
        fireBullet(player.x, player.y, player.angle, true);
        addWanted(0.5);
      }

      // car-jacking pickups & damage from contact handled elsewhere
    } else {
      driveCar(player.car, dt, true);
      player.x = player.car.x;
      player.y = player.car.y;
      player.angle = player.car.angle;
    }
  }

  function driveCar(car, dt, isPlayer) {
    const accel = 320, maxSpeed = 270, reverse = -120, turnRate = 2.8;
    if (isPlayer) {
      if (keys.ArrowUp) car.speed += accel * dt;
      else if (keys.ArrowDown) car.speed -= accel * dt;
      else car.speed *= 0.96; // friction
      car.speed = clamp(car.speed, reverse, maxSpeed);
      const steer = (Math.abs(car.speed) > 8 ? 1 : 0) * Math.sign(car.speed);
      if (keys.ArrowLeft) car.angle -= turnRate * dt * steer * 0.6;
      if (keys.ArrowRight) car.angle += turnRate * dt * steer * 0.6;
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    // soft world bounds
    if (nx > 16 && nx < WORLD_W - 16) car.x = nx; else car.speed *= -0.3;
    if (ny > 16 && ny < WORLD_H - 16) car.y = ny; else car.speed *= -0.3;

    // off-road slows you down
    if (!isRoadPoint(car.x, car.y)) car.speed *= 0.985;

    // tire particles when fast
    if (isPlayer && Math.abs(car.speed) > 180 && Math.random() < 0.4) {
      particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.4, max: 0.4, color: "rgba(40,40,40,0.4)", r: 5 });
    }
  }

  function updateTraffic(dt) {
    for (const c of traffic) {
      if (c.occupied) continue;
      c.turnTimer -= dt;
      if (c.turnTimer <= 0 || !isRoadPoint(c.x + c.dir[0] * 30, c.y + c.dir[1] * 30)) {
        // pick a new road-aligned direction at intersections
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]].filter(d =>
          isRoadPoint(c.x + d[0] * 50, c.y + d[1] * 50));
        c.dir = dirs.length ? dirs[randInt(0, dirs.length - 1)] : [-c.dir[0], -c.dir[1]];
        c.turnTimer = rand(1.5, 4);
        c.angle = Math.atan2(c.dir[1], c.dir[0]);
      }
      c.x += c.dir[0] * c.speed * 40 * dt;
      c.y += c.dir[1] * c.speed * 40 * dt;
      c.x = clamp(c.x, 16, WORLD_W - 16);
      c.y = clamp(c.y, 16, WORLD_H - 16);
    }
  }

  function updatePeds(dt) {
    for (const p of peds) {
      if (p.scared > 0) {
        p.scared -= dt;
        // run away from player
        const a = Math.atan2(p.y - player.y, p.x - player.x);
        p.x += Math.cos(a) * 90 * dt;
        p.y += Math.sin(a) * 90 * dt;
        p.angle = a;
      } else {
        p.wander -= dt;
        if (p.wander <= 0) { p.angle = rand(0, Math.PI * 2); p.wander = rand(1, 4); }
        p.x += Math.cos(p.angle) * p.speed * 30 * dt;
        p.y += Math.sin(p.angle) * p.speed * 30 * dt;
      }
      p.x = clamp(p.x, 6, WORLD_W - 6);
      p.y = clamp(p.y, 6, WORLD_H - 6);

      // run over pedestrian
      if (!player.onFoot && Math.abs(player.car.speed) > 60 &&
          dist(p.x, p.y, player.x, player.y) < 18) {
        burst(p.x, p.y, "#b23", 14);
        respawnPed(p);
        State.money += 5;
        addWanted(1);
        flash("דרסת הולך רגל! מבוקש +1");
      } else if (dist(p.x, p.y, player.x, player.y) < 70 &&
                 ((!player.onFoot && Math.abs(player.car.speed) > 30) || keys[" "])) {
        p.scared = 2.5;
      }
    }
  }
  function respawnPed(p) {
    let tx = randInt(0, MAP_W - 1), ty = randInt(0, MAP_H - 1);
    p.x = tx * TILE + rand(10, TILE - 10);
    p.y = ty * TILE + rand(10, TILE - 10);
    p.scared = 0;
  }

  function updatePolice(dt) {
    for (let i = police.length - 1; i >= 0; i--) {
      const cop = police[i];
      const d = dist(cop.x, cop.y, player.x, player.y);
      // chase
      const targetAngle = Math.atan2(player.y - cop.y, player.x - cop.x);
      cop.angle = lerpAngle(cop.angle, targetAngle, 0.06);
      const desiredSpeed = d > 60 ? 230 : 40;
      cop.speed += (desiredSpeed - cop.speed) * 0.04;
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      cop.x = clamp(cop.x, 16, WORLD_W - 16);
      cop.y = clamp(cop.y, 16, WORLD_H - 16);

      // ram damage
      if (d < 26) {
        damagePlayer(12 * dt * 6 * dt + 0.15);
      }
      // shoot at player when wanted >=2 and close
      if (State.wanted >= 2 && d < 260) {
        cop.shootCd -= dt;
        if (cop.shootCd <= 0) {
          cop.shootCd = rand(0.8, 1.6);
          fireBullet(cop.x, cop.y, targetAngle + rand(-0.12, 0.12), false);
        }
      }
      if (cop.hp <= 0) {
        burst(cop.x, cop.y, "#ff5d8f", 26);
        police.splice(i, 1);
        State.money += 50;
        flash("+$50 הפלת שוטר");
      }
    }
  }

  // ---------- Bullets & combat ----------
  function fireBullet(x, y, angle, fromPlayer) {
    const sp = 520;
    bullets.push({
      x: x + Math.cos(angle) * 16, y: y + Math.sin(angle) * 16,
      vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp,
      life: 1.0, fromPlayer,
    });
    burst(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16, "#ffd23f", 3, 60);
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let hit = false;
      if (b.fromPlayer) {
        for (const cop of police) {
          if (dist(b.x, b.y, cop.x, cop.y) < 16) { cop.hp -= 22; hit = true; burst(b.x, b.y, "#fff", 5); break; }
        }
        if (!hit) for (const c of traffic) {
          if (!c.occupied && dist(b.x, b.y, c.x, c.y) < 16) { c.hp -= 22; hit = true; if (c.hp <= 0) { burst(c.x, c.y, "#f80", 20); c.hp = 40; c.x = randomRoadPoint().x; c.y = randomRoadPoint().y; } break; }
        }
      } else {
        if (dist(b.x, b.y, player.x, player.y) < (player.onFoot ? 13 : 20)) {
          damagePlayer(8); hit = true; burst(b.x, b.y, "#f44", 6);
        }
      }
      if (hit || b.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD_W || b.y > WORLD_H)
        bullets.splice(i, 1);
    }
  }

  function damagePlayer(n) {
    State.health = clamp(State.health - n, 0, 100);
    if (State.health <= 0) gameOver();
  }

  // ---------- Particles ----------
  function burst(x, y, color, count, spd = 120) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2), s = rand(20, spd);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.8), max: 0.8, color, r: rand(2, 5) });
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ---------- Pickups (health / cash) ----------
  function maybeSpawnPickup() {
    if (pickups.length < 4 && Math.random() < 0.004) {
      const pt = randomRoadPoint();
      pickups.push({ x: pt.x, y: pt.y, type: Math.random() < 0.5 ? "cash" : "health" });
    }
  }
  function updatePickups() {
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      if (dist(p.x, p.y, player.x, player.y) < 26) {
        if (p.type === "cash") { State.money += 100; flash("+$100"); }
        else { State.health = clamp(State.health + 30, 0, 100); flash("+30 חיים"); }
        burst(p.x, p.y, p.type === "cash" ? "#4ade80" : "#ff5d8f", 16);
        pickups.splice(i, 1);
      }
    }
  }

  // ---------- HUD ----------
  const moneyEl = document.getElementById("money");
  const speedEl = document.getElementById("speed");
  const healthBar = document.getElementById("health-bar");
  const stars = document.querySelectorAll("#wanted .star");
  const toast = document.getElementById("toast");
  let toastTimer = 0;

  function flash(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    toastTimer = 2.2;
  }
  function updateHUD(dt) {
    moneyEl.textContent = Math.floor(State.money).toLocaleString();
    const spd = player.onFoot ? 0 : Math.abs(player.car.speed) * 0.6;
    speedEl.textContent = Math.round(spd);
    healthBar.style.width = State.health + "%";
    healthBar.style.background = State.health > 40
      ? "linear-gradient(90deg,#22c55e,#86efac)"
      : "linear-gradient(90deg,#ef4444,#f87171)";
    stars.forEach((s, i) => s.classList.toggle("on", i < Math.floor(State.wanted)));
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toast.classList.remove("show"); }
  }

  // ---------- Rendering ----------
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  function draw() {
    const W = canvas.width, H = canvas.height;
    // camera centered on player
    State.cam.x = clamp(player.x - W / 2, 0, WORLD_W - W);
    State.cam.y = clamp(player.y - H / 2, 0, WORLD_H - H);
    if (WORLD_W < W) State.cam.x = (WORLD_W - W) / 2;
    if (WORLD_H < H) State.cam.y = (WORLD_H - H) / 2;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.translate(-State.cam.x, -State.cam.y);

    drawMap();
    drawPickups();
    drawMissionMarkers();
    for (const c of traffic) if (!c.occupied) drawCar(c);
    for (const p of peds) drawPed(p);
    for (const cop of police) drawCar(cop, true);
    if (!player.onFoot) drawCar(player.car);
    drawPlayer();
    for (const b of bullets) drawBullet(b);
    drawParticles();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawMinimap();
  }

  function drawMap() {
    const startX = Math.floor(State.cam.x / TILE);
    const startY = Math.floor(State.cam.y / TILE);
    const endX = Math.ceil((State.cam.x + canvas.width) / TILE);
    const endY = Math.ceil((State.cam.y + canvas.height) / TILE);
    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
        const x = tx * TILE, y = ty * TILE;
        if (isRoadTile(tx, ty)) {
          ctx.fillStyle = "#2a2e38";
          ctx.fillRect(x, y, TILE, TILE);
          // lane markings
          ctx.strokeStyle = "rgba(255,210,63,0.35)";
          ctx.lineWidth = 2;
          ctx.setLineDash([12, 14]);
          if (tx % ROAD_EVERY === 0) {
            ctx.beginPath(); ctx.moveTo(x + TILE / 2, y); ctx.lineTo(x + TILE / 2, y + TILE); ctx.stroke();
          }
          if (ty % ROAD_EVERY === 0) {
            ctx.beginPath(); ctx.moveTo(x, y + TILE / 2); ctx.lineTo(x + TILE, y + TILE / 2); ctx.stroke();
          }
          ctx.setLineDash([]);
        } else {
          // building block — deterministic look from tile coords
          const seed = (tx * 73856093 ^ ty * 19349663) >>> 0;
          const hue = 210 + (seed % 40);
          const shade = 14 + (seed % 10);
          ctx.fillStyle = `hsl(${hue}, 12%, ${shade}%)`;
          ctx.fillRect(x, y, TILE, TILE);
          // building footprint with inset
          ctx.fillStyle = `hsl(${hue}, 14%, ${shade + 10}%)`;
          const pad = 6;
          ctx.fillRect(x + pad, y + pad, TILE - pad * 2, TILE - pad * 2);
          // windows
          ctx.fillStyle = (seed % 3 === 0) ? "rgba(255,210,63,0.25)" : "rgba(120,160,220,0.18)";
          for (let wy = 0; wy < 3; wy++)
            for (let wx = 0; wx < 3; wx++)
              if ((seed >> (wx + wy)) & 1)
                ctx.fillRect(x + 16 + wx * 18, y + 16 + wy * 18, 9, 9);
        }
      }
    }
  }

  function drawCar(c, isCop) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-c.w / 2 + 2, -c.h / 2 + 3, c.w, c.h);
    // body
    ctx.fillStyle = c.color;
    roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 4);
    ctx.fill();
    // windshield
    ctx.fillStyle = "rgba(180,210,255,0.55)";
    ctx.fillRect(c.w / 2 - 13, -c.h / 2 + 3, 7, c.h - 6);
    // roof
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-c.w / 2 + 8, -c.h / 2 + 3, 12, c.h - 6);
    if (isCop || c.isPolice) {
      const t = Math.floor(Date.now() / 250) % 2;
      ctx.fillStyle = t ? "#ff3b3b" : "#3b6bff";
      ctx.fillRect(-2, -c.h / 2 + 3, 5, 4);
      ctx.fillStyle = t ? "#3b6bff" : "#ff3b3b";
      ctx.fillRect(-2, c.h / 2 - 7, 5, 4);
    }
    ctx.restore();
  }

  function drawPed(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.arc(1, 2, p.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e8c39e";
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawPlayer() {
    if (!player.onFoot) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.arc(1, 2, player.radius, 0, Math.PI * 2); ctx.fill();
    // body
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, Math.PI * 2); ctx.fill();
    // head/gun direction
    ctx.fillStyle = "#1a1300";
    ctx.fillRect(player.radius - 2, -2, 10, 4);
    ctx.fillStyle = "#e8c39e";
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBullet(b) {
    ctx.fillStyle = b.fromPlayer ? "#ffd23f" : "#ff5d5d";
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPickups() {
    for (const p of pickups) {
      const bob = Math.sin(Date.now() / 200 + p.x) * 3;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.shadowBlur = 14;
      ctx.shadowColor = p.type === "cash" ? "#4ade80" : "#ff5d8f";
      ctx.fillStyle = p.type === "cash" ? "#4ade80" : "#ff5d8f";
      ctx.font = "bold 22px Segoe UI";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(p.type === "cash" ? "$" : "+", 0, 0);
      ctx.restore();
    }
  }

  function drawMissionMarkers() {
    if (!mission) return;
    const t = (mission.type === "deliver" && !mission.gotPackage) ? mission.pickup : mission.target;
    const color = (mission.type === "deliver" && !mission.gotPackage) ? "#4ade80" : "#ffd23f";
    const pulse = 30 + Math.sin(Date.now() / 250) * 8;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(t.x, t.y, pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(t.x, t.y, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- Minimap ----------
  function drawMinimap() {
    const size = 130, pad = 16;
    const x0 = pad, y0 = canvas.height - size - pad;
    const sx = size / WORLD_W, sy = size / WORLD_H;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#0c0d12";
    roundRect(x0 - 4, y0 - 4, size + 8, size + 8, 8); ctx.fill();
    // roads
    ctx.fillStyle = "#2a2e38";
    ctx.fillRect(x0, y0, size, size);
    ctx.strokeStyle = "#3a3f4d"; ctx.lineWidth = 1;
    for (let i = 0; i < MAP_W; i += ROAD_EVERY) {
      ctx.beginPath(); ctx.moveTo(x0 + i * TILE * sx, y0); ctx.lineTo(x0 + i * TILE * sx, y0 + size); ctx.stroke();
    }
    for (let i = 0; i < MAP_H; i += ROAD_EVERY) {
      ctx.beginPath(); ctx.moveTo(x0, y0 + i * TILE * sy); ctx.lineTo(x0 + size, y0 + i * TILE * sy); ctx.stroke();
    }
    // mission
    if (mission) {
      const t = (mission.type === "deliver" && !mission.gotPackage) ? mission.pickup : mission.target;
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath(); ctx.arc(x0 + t.x * sx, y0 + t.y * sy, 3, 0, Math.PI * 2); ctx.fill();
    }
    // police
    ctx.fillStyle = "#3b6bff";
    for (const c of police) { ctx.fillRect(x0 + c.x * sx - 1, y0 + c.y * sy - 1, 3, 3); }
    // player
    ctx.fillStyle = "#ff5d8f";
    ctx.beginPath(); ctx.arc(x0 + player.x * sx, y0 + player.y * sy, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------- Game over / start ----------
  const overlay = document.getElementById("overlay");
  const overlayBody = document.getElementById("overlay-body");
  const startBtn = document.getElementById("start-btn");

  function gameOver() {
    State.running = false;
    overlay.classList.remove("hidden");
    overlayBody.innerHTML = `
      <p class="how">נתפסת / חוסלת ברחובות ליברטי שורס.</p>
      <p style="font-size:28px;font-weight:800;color:var(--accent);margin:10px 0">
        $${Math.floor(State.money).toLocaleString()}</p>
      <p class="how">סך הכל הרווחת</p>`;
    startBtn.textContent = "שחק שוב";
  }

  function startGame() {
    State.money = 0; State.health = 100; State.wanted = 0; State.running = true;
    traffic = []; peds = []; police = []; bullets = []; particles = []; pickups = [];
    player.onFoot = true; player.car = null; player.speed = 0;
    player.x = WORLD_W / 2 + TILE / 2; player.y = WORLD_H / 2;
    // ensure player starts on a road
    let ty = Math.round(player.y / TILE); ty = ty - (ty % ROAD_EVERY);
    player.y = ty * TILE + TILE / 2;
    spawnTraffic(26);
    spawnPeds(40);
    newMission();
    overlay.classList.add("hidden");
    flash("ברוך הבא לליברטי שורס!");
  }
  startBtn.addEventListener("click", startGame);

  // ---------- Main loop ----------
  let last = performance.now();
  function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 0.05); // clamp big frame gaps

    if (State.running) {
      updatePlayer(dt);
      updateTraffic(dt);
      updatePeds(dt);
      updatePolice(dt);
      updateBullets(dt);
      updateParticles(dt);
      updateWanted(dt);
      updateMission(dt);
      updatePickups();
      maybeSpawnPickup();
      // passive wanted decay when not committing crimes & no police nearby
      if (State.wanted > 0 && police.length === 0 && Math.random() < 0.003)
        State.wanted = Math.max(0, State.wanted - 1);
      updateHUD(dt);
    }
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
