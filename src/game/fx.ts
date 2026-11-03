import * as THREE from "three";
import { heightAt } from "@/game/height";

type Chunk = {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  spin: number;
};

function circleTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  if (!g) return null;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,0.95)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.35)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createFx(scene: THREE.Scene) {
  const CHUNK_N = 220;
  const chunks: Chunk[] = Array.from({ length: CHUNK_N }, () => ({
    alive: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    max: 1,
    size: 0.2,
    spin: 0,
  }));
  const geo = new THREE.IcosahedronGeometry(0.16, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf7fbff,
    roughness: 0.35,
    metalness: 0.02,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, CHUNK_N);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.count = CHUNK_N;
  scene.add(mesh);
  const dummy = new THREE.Object3D();

  const FLAKE_N = 140;
  const flakePos = new Float32Array(FLAKE_N * 3);
  const flakes = Array.from({ length: FLAKE_N }, () => ({
    x: 0,
    y: 0,
    z: 0,
    v: 0.4 + Math.random(),
  }));
  const flakeGeo = new THREE.BufferGeometry();
  flakeGeo.setAttribute("position", new THREE.BufferAttribute(flakePos, 3));
  const flakeMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.16,
    map: circleTexture() ?? undefined,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const flakePoints = new THREE.Points(flakeGeo, flakeMat);
  flakePoints.frustumCulled = false;
  scene.add(flakePoints);

  const mistN = 160;
  const mist = Array.from({ length: mistN }, () => ({
    alive: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
  }));
  const mistPos = new Float32Array(mistN * 3);
  const mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute("position", new THREE.BufferAttribute(mistPos, 3));
  const mistMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.55,
    map: flakeMat.map ?? undefined,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const mistPoints = new THREE.Points(mistGeo, mistMat);
  mistPoints.frustumCulled = false;
  scene.add(mistPoints);

  let cursor = 0;
  let mistCursor = 0;
  let primed = false;

  function emitChunk(x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, life: number) {
    const c = chunks[cursor];
    cursor = (cursor + 1) % CHUNK_N;
    c.alive = true;
    c.x = x;
    c.y = y;
    c.z = z;
    c.vx = vx;
    c.vy = vy;
    c.vz = vz;
    c.size = size;
    c.life = life;
    c.max = life;
    c.spin = Math.random() * 6;
  }

  function emitMist(x: number, y: number, z: number, vx: number, vy: number, vz: number) {
    const m = mist[mistCursor];
    mistCursor = (mistCursor + 1) % mistN;
    m.alive = true;
    m.x = x;
    m.y = y;
    m.z = z;
    m.vx = vx;
    m.vy = vy;
    m.vz = vz;
    m.life = 0.45 + Math.random() * 0.25;
  }

  function burst(x: number, y: number, z: number, power: number) {
    const n = Math.min(18, 6 + Math.floor(power));
    for (let i = 0; i < n; i++) {
      emitChunk(
        x,
        y + 0.2,
        z,
        (Math.random() - 0.5) * power,
        1 + Math.random() * power * 0.6,
        (Math.random() - 0.5) * power,
        0.12 + Math.random() * 0.28,
        0.45 + Math.random() * 0.4,
      );
    }
  }

  return {
    burst,
    update(
      dt: number,
      s: { x: number; y: number; z: number; yaw: number; steer: number; speed: number; grounded: boolean; wings: boolean },
    ) {
      if (!primed) {
        for (const f of flakes) {
          f.x = s.x + (Math.random() - 0.5) * 40;
          f.y = s.y + Math.random() * 18;
          f.z = s.z + (Math.random() - 0.5) * 40;
        }
        primed = true;
      }
      if (s.grounded && !s.wings && s.speed > 7) {
        const rx = Math.cos(s.yaw);
        const rz = -Math.sin(s.yaw);
        const fx = -Math.sin(s.yaw);
        const fz = -Math.cos(s.yaw);
        const rate = (s.speed > 16 ? 2 : 1) + (Math.abs(s.steer) > 0.45 ? 2 : 0);
        for (let i = 0; i < rate; i++) {
          const side = i % 2 === 0 ? 1 : -1;
          const px = s.x + rx * 0.16 * side - fx * 0.3;
          const pz = s.z + rz * 0.16 * side - fz * 0.3;
          emitChunk(
            px,
            s.y + 0.15,
            pz,
            -fx * s.speed * 0.15 + rx * s.steer * 4 + (Math.random() - 0.5) * 1.5,
            1.4 + Math.abs(s.steer) * 3.2 + Math.random() * 1.6,
            -fz * s.speed * 0.15 + rz * s.steer * 4 + (Math.random() - 0.5) * 1.5,
            0.1 + Math.random() * 0.28 * (1 + Math.abs(s.steer)),
            0.35 + Math.random() * 0.35,
          );
          if (Math.random() > 0.4) {
            emitMist(px, s.y + 0.3, pz, -fx * 2 + (Math.random() - 0.5), 1.2, -fz * 2);
          }
        }
      }

      for (let i = 0; i < CHUNK_N; i++) {
        const c = chunks[i];
        if (!c.alive) {
          dummy.scale.setScalar(0.0001);
          dummy.position.set(0, -999, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        c.life -= dt;
        c.vy -= 11 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.z += c.vz * dt;
        c.spin += dt * 4;
        const gh = heightAt(c.x, c.z);
        if (c.y < gh + 0.05) {
          c.y = gh + 0.05;
          c.vy *= -0.15;
          c.vx *= 0.6;
          c.vz *= 0.6;
          if (c.life < 0.12) c.life = 0;
        }
        if (c.life <= 0) {
          c.alive = false;
          dummy.scale.setScalar(0.0001);
        } else {
          const k = Math.max(0.05, c.life / c.max);
          dummy.position.set(c.x, c.y, c.z);
          dummy.rotation.set(c.spin, c.spin * 0.7, 0);
          dummy.scale.setScalar(c.size * (0.4 + k));
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < mistN; i++) {
        const m = mist[i];
        if (!m.alive) {
          mistPos[i * 3 + 1] = -999;
          continue;
        }
        m.life -= dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.z += m.vz * dt;
        m.vy -= dt * 2;
        if (m.life <= 0) m.alive = false;
        mistPos[i * 3] = m.x;
        mistPos[i * 3 + 1] = m.alive ? m.y : -999;
        mistPos[i * 3 + 2] = m.z;
      }
      mistGeo.attributes.position.needsUpdate = true;

      for (let i = 0; i < FLAKE_N; i++) {
        const f = flakes[i];
        f.y -= f.v * dt * (0.8 + (s.wings ? 0.4 : 0));
        f.x += Math.sin(f.y) * dt * 0.3;
        if (f.y < s.y - 2 || Math.hypot(f.x - s.x, f.z - s.z) > 28) {
          f.x = s.x + (Math.random() - 0.5) * 36;
          f.z = s.z + (Math.random() - 0.5) * 36;
          f.y = s.y + 6 + Math.random() * 12;
        }
        flakePos[i * 3] = f.x;
        flakePos[i * 3 + 1] = f.y;
        flakePos[i * 3 + 2] = f.z;
      }
      flakeGeo.attributes.position.needsUpdate = true;
      flakeMat.opacity = 0.35 + Math.min(0.4, s.speed * 0.01);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      flakeGeo.dispose();
      flakeMat.map?.dispose();
      flakeMat.dispose();
      mistGeo.dispose();
      mistMat.dispose();
    },
  };
}
