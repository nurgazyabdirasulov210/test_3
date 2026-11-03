import * as THREE from "three";
import { biomeName, biomes, sample, type BiomeW } from "@/game/height";
import {
  aiInput,
  createBody,
  horizSpeed,
  resetBody,
  stepBody,
  type Body,
  type Input,
  type ObstacleHit,
} from "@/game/sim";
import { createTerrain } from "@/game/terrain";
import { createTrail } from "@/game/trail";
import { createWorld } from "@/game/world";
import { createRider } from "@/game/rider";
import { createFx } from "@/game/fx";
import { createAudio } from "@/game/audio";

export type GameHooks = {
  canvas: HTMLCanvasElement;
  scoreEl: HTMLElement;
  bestEl: HTMLElement;
  lifeEl: HTMLElement;
  multEl: HTMLElement;
  biomeEl: HTMLElement;
  hintEl: HTMLElement;
  floaterLayer: HTMLElement;
  playing: () => boolean;
  paused: () => boolean;
  jacket: () => number;
  muted: () => boolean;
  onPause: (paused: boolean) => void;
};

type Floater = {
  el: HTMLDivElement;
  x: number;
  y: number;
  z: number;
  vy: number;
  life: number;
};

const SAVE_KEY = "pudra-save-v1";

function fmt(n: number) {
  return Math.max(0, Math.floor(n)).toLocaleString("ru-RU");
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { best: 0, life: 0 };
    const data = JSON.parse(raw) as { best?: number; life?: number };
    return { best: data.best ?? 0, life: data.life ?? 0 };
  } catch {
    return { best: 0, life: 0 };
  }
}

function blend(out: THREE.Color, a: THREE.Color, b: THREE.Color, c: THREE.Color, w: BiomeW) {
  out.setRGB(
    a.r * w.day + b.r * w.night + c.r * w.dusk,
    a.g * w.day + b.g * w.night + c.g * w.dusk,
    a.b * w.day + b.b * w.night + c.b * w.dusk,
  );
  return out;
}

function segmentClose(x0: number, z0: number, x1: number, z1: number, gx: number, gz: number, rad: number) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const l2 = dx * dx + dz * dz;
  let t = l2 < 1e-6 ? 0 : ((gx - x0) * dx + (gz - z0) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  const px = x0 + dx * t;
  const pz = z0 + dz * t;
  return Math.hypot(px - gx, pz - gz) < rad;
}

export function createGame(hooks: GameHooks) {
  const canvas = hooks.canvas;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, canvas.clientWidth < 800 ? 1.25 : 1.6));
  renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x9fd0f2, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd7ecf8, 50, 280);
  const camera = new THREE.PerspectiveCamera(68, 1, 0.12, 1800);

  const sun = new THREE.DirectionalLight(0xfff3dd, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 160;
  sun.shadow.camera.left = -72;
  sun.shadow.camera.right = 72;
  sun.shadow.camera.top = 72;
  sun.shadow.camera.bottom = -72;
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0xd7ecff, 0x8eacc4, 0.85);
  scene.add(hemi);

  const skyGeo = new THREE.SphereGeometry(900, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color("#7ec8ff") },
      uHorizon: { value: new THREE.Color("#e7f4ff") },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.2) },
      uSunColor: { value: new THREE.Color("#fff4dd") },
      uStars: { value: 0 },
      uAurora: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uStars;
      uniform float uAurora;
      uniform float uTime;
      void main() {
        vec3 dir = normalize(vDir);
        float h = clamp(dir.y, -0.05, 1.0);
        vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.62, h));
        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        col += uSunColor * pow(sunDot, 7.0) * 0.95;
        col += uSunColor * pow(sunDot, 140.0) * 1.8;
        float star = step(0.9975, fract(sin(dot(floor(dir * 180.0), vec3(12.9, 78.2, 37.1))) * 43758.5));
        col += star * uStars * smoothstep(0.05, 0.4, dir.y);
        float band = sin(dir.x * 7.0 + dir.z * 5.0 + uTime * 0.25) * 0.5 + 0.5;
        float auroraMask = smoothstep(0.12, 0.45, dir.y) * (1.0 - smoothstep(0.45, 0.85, dir.y));
        col += vec3(0.25, 0.9, 0.75) * band * auroraMask * uAurora * 0.45;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);

  const terrain = createTerrain(scene);
  const trail = createTrail(128);
  const world = createWorld(scene);
  const rider = createRider(scene);
  const fx = createFx(scene);
  const audio = createAudio();
  const body = createBody();
  resetBody(body);

  const dayTop = new THREE.Color("#6eb6f5");
  const dayHor = new THREE.Color("#eef7ff");
  const daySun = new THREE.Color("#fff6e4");
  const dayDir = new THREE.Vector3(0.48, 0.66, 0.28).normalize();
  const daySky = new THREE.Color("#d5ebff");
  const dayGround = new THREE.Color("#90b0c8");
  const dayTint = new THREE.Color("#fff9f4");

  const nightTop = new THREE.Color("#071433");
  const nightHor = new THREE.Color("#1a4e98");
  const nightSun = new THREE.Color("#d5e6ff");
  const nightDir = new THREE.Vector3(-0.28, 0.86, -0.18).normalize();
  const nightSky = new THREE.Color("#245099");
  const nightGround = new THREE.Color("#0d1d42");
  const nightTint = new THREE.Color("#c9d8ff");

  const duskTop = new THREE.Color("#2c4d78");
  const duskHor = new THREE.Color("#ffc29a");
  const duskSun = new THREE.Color("#ffd8b4");
  const duskDir = new THREE.Vector3(0.2, 0.22, -0.82).normalize();
  const duskSky = new THREE.Color("#ffb088");
  const duskGround = new THREE.Color("#b56d78");
  const duskTint = new THREE.Color("#ffe1d2");

  const tmpA = new THREE.Color();
  const tmpB = new THREE.Color();
  const tmpC = new THREE.Color();
  const sunDir = new THREE.Vector3();
  const camPos = new THREE.Vector3(body.x, body.y + 8, body.z + 12);
  const lookPos = new THREE.Vector3(body.x, body.y + 1, body.z);
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();
  const proj = new THREE.Vector3();

  const saved = loadSave();
  let best = saved.best;
  let lifetime = saved.life;
  let score = 0;
  let heat = 0;
  let intro = 0;
  let wingTick = 0;
  let stuck = 0;
  let shake = 0;
  let fp = false;
  let snapCam = true;
  let clearTrail = true;
  let saveTimer = 0;
  let lastJacket = -1;
  let touchSteer = 0;
  let touchBrake = false;
  let touchTuck = false;
  let jumpLatch = false;
  let wingLatch = false;
  let jumpWas = false;
  let wingWas = false;
  const missed = new Set<string>();
  const realKeys = new Set<string>();
  let probe: Set<string> | null = null;
  const floaters: Floater[] = [];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement("div");
    el.className = "floater";
    hooks.floaterLayer.appendChild(el);
    floaters.push({ el, x: 0, y: 0, z: 0, vy: 0, life: 0 });
  }

  const timer = new THREE.Timer();
  timer.connect(document);
  let acc = 0;
  let prevX = body.x;
  let prevZ = body.z;

  function held(code: string) {
    if (probe) return probe.has(code);
    return realKeys.has(code);
  }

  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ best, life: lifetime, v: 1 }));
    } catch {
      /* ignore quota */
    }
  }

  function multiplier() {
    return 1 + Math.min(7, Math.floor(heat / 280));
  }

  function spawnFloater(x: number, y: number, z: number, text: string) {
    const f = floaters.find((item) => item.life <= 0) ?? floaters[0];
    f.x = x;
    f.y = y;
    f.z = z;
    f.vy = 1.6;
    f.life = 1.15;
    f.el.textContent = text;
  }

  function addScore(base: number, x: number, y: number, z: number, label?: string) {
    const mult = multiplier();
    const before = mult;
    const pts = Math.max(1, Math.round(base * mult));
    score += pts;
    heat = Math.min(4200, heat + base);
    const after = multiplier();
    spawnFloater(x, y + 0.4, z, label ?? `+${fmt(pts)}`);
    if (after > before) spawnFloater(x, y + 1.6, z, `×${after}`);
    audio.chime(after);
    if (score > best) best = score;
  }

  function commitScore() {
    if (score > best) best = score;
    if (score > 0) lifetime += Math.floor(score);
    score = 0;
    heat = 0;
    persist();
    paintHud();
  }

  function beginRun() {
    commitScore();
    missed.clear();
    world.resetGates();
    resetBody(body);
    clearTrail = true;
    snapCam = true;
    intro = 6;
    stuck = 0;
    wingTick = 0;
    audio.warmup();
  }

  function paintHud() {
    hooks.scoreEl.textContent = fmt(score);
    hooks.bestEl.textContent = fmt(best);
    hooks.lifeEl.textContent = fmt(lifetime);
    const mult = multiplier();
    hooks.multEl.textContent = mult >= 2 ? `×${mult}` : "";
  }

  function playerInput(): Input {
    let steer = 0;
    if (held("KeyA") || held("ArrowLeft")) steer += 1;
    if (held("KeyD") || held("ArrowRight")) steer -= 1;
    steer = Math.max(-1, Math.min(1, steer + touchSteer));
    const tuck = held("KeyW") || held("ArrowUp") || touchTuck;
    const brake = held("KeyS") || held("ArrowDown") || touchBrake;
    const jumpDown = held("Space");
    if (jumpDown && !jumpWas) jumpLatch = true;
    jumpWas = jumpDown;
    const wingDown = held("KeyF");
    if (wingDown && !wingWas) wingLatch = true;
    wingWas = wingDown;
    return { steer, tuck, brake, jump: false, wing: false };
  }

  function collide(b: Body): ObstacleHit | null {
    const ground = sample(b.x, b.z).h;
    if (b.wings && b.y > ground + 3.4) return null;
    let bestHit: ObstacleHit | null = null;
    let bestD = 1e9;
    const list = world.obstacles;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (b.y > o.y + 2.7) continue;
      const d = Math.hypot(b.x - o.x, b.z - o.z);
      if (d < o.r && d < bestD) {
        bestD = d;
        bestHit = o;
      }
    }
    return bestHit;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    realKeys.add(e.code);
    if (!hooks.playing()) {
      if (e.code === "Space" || e.code === "Enter") beginRun();
      return;
    }
    if (e.code === "Escape") {
      hooks.onPause(!hooks.paused());
    } else if (e.code === "KeyC") {
      fp = !fp;
      snapCam = true;
    } else if (e.code === "KeyR") {
      beginRun();
    } else if (e.code === "KeyM") {
      /* mute lives in the DOM button */
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    realKeys.delete(e.code);
  }
  function onBlur() {
    realKeys.clear();
    jumpWas = false;
    wingWas = false;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w < 2 || h < 2) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 800 ? 1.25 : 1.6));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const resizeObs = new ResizeObserver(resize);
  resizeObs.observe(canvas);
  resize();

  window.__controlsTest = {
    getYaw: () => body.yaw,
    getSpeed: () => horizSpeed(body),
    setKeys: (codes: string[]) => {
      probe = codes.length ? new Set(codes) : null;
    },
  };

  function frame() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const playing = hooks.playing();
    const paused = playing && hooks.paused();
    const jacket = hooks.jacket();
    if (jacket !== lastJacket) {
      rider.setJacket(jacket);
      lastJacket = jacket;
    }

    if (!paused) {
      acc += dt;
      const step = 1 / 60;
      let steps = 0;
      let useJump = jumpLatch;
      let useWing = wingLatch;
      const startX = body.x;
      const startZ = body.z;
      while (acc >= step && steps < 5) {
        const base = playing ? playerInput() : aiInput(body, timer.getElapsed());
        const input: Input = {
          ...base,
          jump: useJump,
          wing: useWing,
        };
        useJump = false;
        useWing = false;
        const events = stepBody(body, input, step, collide);
        if (playing) {
          for (const ev of events) {
            if (ev.t === "crash") {
              heat = 0;
              shake = Math.max(shake, 0.45);
              fx.burst(body.x, body.y, body.z, 7);
              audio.thud();
              spawnFloater(body.x, body.y + 1.5, body.z, "срыв");
            } else if (ev.t === "jump") {
              audio.whoosh();
            } else if (ev.t === "wing") {
              if (ev.open) addScore(80, body.x, body.y + 2, body.z, "крыло");
              audio.whoosh();
            } else if (ev.t === "land") {
              if (ev.air > 0.35) {
                let basePts = 60 * ev.air;
                if (ev.spins >= 0.7) basePts += ev.spins * 170;
                if (ev.flips >= 0.7) basePts += ev.flips * 210;
                const label = ev.spins >= 0.75 ? `${Math.max(1, Math.round(ev.spins))}×360` : undefined;
                addScore(basePts, body.x, body.y + 1.8, body.z, label);
              }
              if (ev.impact > 7) {
                shake = Math.max(shake, Math.min(0.5, ev.impact * 0.02));
                fx.burst(body.x, body.y, body.z, Math.min(8, ev.impact * 0.4));
                audio.thud();
              }
            }
          }
        }
        acc -= step;
        steps++;
      }
      jumpLatch = false;
      wingLatch = false;
      if (!playing && Math.hypot(body.x, body.z) > 1500) {
        resetBody(body);
        snapCam = true;
      }
      if (playing && (body.y < -40 || !Number.isFinite(body.y))) {
        resetBody(body);
        snapCam = true;
      }

      if (playing && body.onGround) {
        const sp = horizSpeed(body);
        if (sp > 11) {
          const list = world.obstacles;
          for (let i = 0; i < list.length; i++) {
            const o = list[i];
            if (o.key[0] !== "t" && o.key[0] !== "p") continue;
            const d = Math.hypot(body.x - o.x, body.z - o.z);
            if (d < o.r + 1.45 && d > o.r * 0.92 && !missed.has(o.key)) {
              missed.add(o.key);
              addScore(36 + sp * 2.4, o.x, o.y + 2.2, o.z);
            }
          }
        }
        for (const g of world.gates) {
          if (g.taken) continue;
          if (!segmentClose(startX, startZ, body.x, body.z, g.x, g.z, 3.45)) continue;
          if (Math.abs(body.y - g.y) > 6.5) continue;
          g.taken = true;
          g.mat.emissive.setHex(0xffe1a8);
          g.mat.color.setHex(0xf4f7fb);
          addScore(340, g.x, g.y + 2.4, g.z);
        }
      }

      prevX = startX;
      prevZ = startZ;
    }

    const sp = horizSpeed(body);
    if (playing && !paused) {
      const mult = multiplier();
      score += sp * dt * 1.15 * (0.65 + mult * 0.2);
      if (score > best) best = score;
      heat = Math.max(0, heat - 30 * dt);
      if (body.wings) {
        wingTick += dt;
        if (wingTick > 1.25) {
          wingTick = 0;
          addScore(55, body.x, body.y + 1.4, body.z, "полёт");
        }
      } else wingTick = 0;
      if (body.onGround && sp < 1.2) stuck += dt;
      else stuck = 0;
      if (intro > 0) intro -= dt;
      saveTimer += dt;
      if (saveTimer > 2) {
        saveTimer = 0;
        persist();
      }
    }

    const b = biomes(body.x, body.z);
    rider.setNight(b.night);
    const steerVisual = body.onGround ? body.roll / 0.66 : 0;
    rider.update(body, dt, (playing ? held("KeyW") || held("ArrowUp") || touchTuck : true) && body.onGround, fp && playing);

    world.update(body.x, body.z);
    terrain.snap(body.x, body.z);
    terrain.uniforms.uTime.value = timer.getElapsed();
    terrain.uniforms.uGlitter.value = b.day * 1 + b.dusk * 0.65 + b.night * 0.2;
    blend(terrain.uniforms.uTint.value, dayTint, nightTint, duskTint, b);

    trail.render(renderer, {
      x: body.x,
      z: body.z,
      px: prevX,
      pz: prevZ,
      yaw: body.yaw,
      grounded: body.onGround && !body.crashed && !body.wings,
      steer: steerVisual,
      clear: clearTrail,
    });
    clearTrail = false;
    terrain.uniforms.uTrail.value = trail.current();
    terrain.uniforms.uTrailCenter.value.copy(trail.center);

    fx.update(dt, {
      x: body.x,
      y: body.y,
      z: body.z,
      yaw: body.yaw,
      steer: steerVisual,
      speed: sp,
      grounded: body.onGround && !body.crashed,
      wings: body.wings,
    });

    blend(skyMat.uniforms.uTop.value, dayTop, nightTop, duskTop, b);
    blend(skyMat.uniforms.uHorizon.value, dayHor, nightHor, duskHor, b);
    blend(skyMat.uniforms.uSunColor.value, daySun, nightSun, duskSun, b);
    sunDir.set(0, 0, 0).addScaledVector(dayDir, b.day).addScaledVector(nightDir, b.night).addScaledVector(duskDir, b.dusk);
    if (sunDir.lengthSq() < 1e-4) sunDir.copy(dayDir);
    sunDir.normalize();
    skyMat.uniforms.uSunDir.value.copy(sunDir);
    skyMat.uniforms.uStars.value = b.night;
    skyMat.uniforms.uAurora.value = b.night * 0.9;
    skyMat.uniforms.uTime.value = timer.getElapsed();

    const fog = scene.fog as THREE.Fog;
    blend(fog.color, dayHor, nightHor, duskHor, b);
    fog.near = 55 * b.day + 16 * b.night + 28 * b.dusk;
    fog.far = 300 * b.day + 150 * b.night + 230 * b.dusk;
    blend(hemi.color, daySky, nightSky, duskSky, b);
    blend(hemi.groundColor, dayGround, nightGround, duskGround, b);
    hemi.intensity = 0.82 * b.day + 0.7 * b.night + 0.62 * b.dusk;
    sun.color.copy(skyMat.uniforms.uSunColor.value);
    sun.intensity = 2.7 * b.day + 1.25 * b.night + 2.35 * b.dusk;
    renderer.toneMappingExposure = 1.08 * b.day + 0.9 * b.night + 1.12 * b.dusk;
    sun.position.copy(lookPos).addScaledVector(sunDir, 90);
    sun.target.position.set(body.x, body.y, body.z);
    sky.position.set(camera.position.x, camera.position.y, camera.position.z);

    const fxw = -Math.sin(body.yaw);
    const fzw = -Math.cos(body.yaw);
    const dist = body.wings ? 11.5 : 7.6;
    const height = body.wings ? 3.8 : 2.55;
    const back = dist + Math.min(4, sp * 0.06);
    if (fp && playing) {
      desired.set(body.x - fxw * 0.15, body.y + 0.92, body.z - fzw * 0.15);
      look.set(body.x + fxw * 12, body.y + 0.92 + body.visualPitch * 1.4, body.z + fzw * 12);
    } else {
      desired.set(body.x - fxw * back, body.y + height, body.z - fzw * back);
      const camH = sample(desired.x, desired.z).h + 1.5;
      if (desired.y < camH) desired.y = camH;
      look.set(body.x + fxw * 2.4, body.y + 1.15, body.z + fzw * 2.4);
    }
    shake *= Math.exp(-2.8 * dt);
    if (shake > 0.001) {
      desired.x += (Math.random() - 0.5) * shake;
      desired.y += (Math.random() - 0.5) * shake * 0.6;
    }
    const k = snapCam ? 1 : 1 - Math.exp(-3.4 * Math.max(dt, 0.001));
    camPos.lerp(desired, k);
    lookPos.lerp(look, k);
    snapCam = false;
    camera.position.copy(camPos);
    camera.lookAt(lookPos);
    const targetFov = (fp && playing ? 80 : 64) + Math.min(18, sp * 0.42) + (body.wings ? 6 : 0);
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-4 * dt));
    camera.updateProjectionMatrix();

    audio.update(paused ? 0 : sp, Math.abs(steerVisual), body.wings, hooks.muted() || !playing);

    for (const f of floaters) {
      if (f.life <= 0) {
        f.el.style.opacity = "0";
        continue;
      }
      f.life -= dt;
      f.y += f.vy * dt;
      proj.set(f.x, f.y, f.z).project(camera);
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      if (proj.z < 1) {
        f.el.style.opacity = String(Math.max(0, Math.min(1, f.life * 1.4)));
        f.el.style.left = `${(proj.x * 0.5 + 0.5) * w}px`;
        f.el.style.top = `${(-proj.y * 0.5 + 0.5) * h}px`;
      } else f.el.style.opacity = "0";
    }

    if (playing) {
      hooks.biomeEl.textContent = biomeName(b);
      if (intro > 0) hooks.hintEl.textContent = "A D — дуга · пробел — прыжок · F — крыло";
      else if (!body.onGround && !body.wings && body.airTime > 0.28) hooks.hintEl.textContent = "F — раскрыть крыло";
      else if (body.wings) hooks.hintEl.textContent = "F — сложить крыло";
      else if (body.crashed) hooks.hintEl.textContent = "Встаём…";
      else if (stuck > 1.6) hooks.hintEl.textContent = "W — толкнуться · R — на вершину";
      else hooks.hintEl.textContent = "";
    } else {
      hooks.hintEl.textContent = "";
      hooks.biomeEl.textContent = "";
    }
    paintHud();

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(frame);

  return {
    beginRun,
    warmupAudio: () => audio.warmup(),
    toggleCam: () => {
      fp = !fp;
      snapCam = true;
    },
    setTouchSteer: (v: number) => {
      touchSteer = v;
    },
    setTouchBrake: (v: boolean) => {
      touchBrake = v;
    },
    setTouchTuck: (v: boolean) => {
      touchTuck = v;
    },
    pulseJump: () => {
      jumpLatch = true;
    },
    pulseWing: () => {
      wingLatch = true;
    },
    dispose() {
      renderer.setAnimationLoop(null);
      timer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      resizeObs.disconnect();
      if (window.__controlsTest) delete window.__controlsTest;
      terrain.dispose();
      trail.dispose();
      world.dispose();
      rider.dispose();
      fx.dispose();
      audio.dispose();
      skyGeo.dispose();
      skyMat.dispose();
      renderer.dispose();
      for (const f of floaters) f.el.remove();
    },
  };
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
    };
  }
}
