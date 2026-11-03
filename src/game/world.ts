import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { biomes, hash01, sample, type BiomeW } from "@/game/height";

export type Obstacle = { x: number; y: number; z: number; r: number; key: string };

const DAY = [0xf0b07a, 0xfff6ea, 0xe7f0c4, 0xf6d2a8, 0xfbfbf8];
const DUSK = [0xe86a58, 0xd85aaa, 0xf09a68, 0xc96b88, 0xf3b39a];
const PINE = [0x14384a, 0x1d5168, 0x0f2e3e, 0x24586c];
const NIGHT_PUFF = [0x8eacbf, 0xd5e2ee, 0x6d4e68];

function paintWhite(geo: THREE.BufferGeometry) {
  const n = geo.getAttribute("position").count;
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  return geo;
}

function puffGeo() {
  const parts = [
    new THREE.IcosahedronGeometry(1.05, 1),
    new THREE.IcosahedronGeometry(0.72, 1),
    new THREE.IcosahedronGeometry(0.66, 1),
    new THREE.IcosahedronGeometry(0.5, 1),
  ];
  parts[1].translate(0.62, 0.28, 0.15);
  parts[2].translate(-0.55, 0.22, -0.18);
  parts[3].translate(0.08, 0.95, 0.02);
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error("puff");
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return paintWhite(merged);
}

function pineGeo() {
  const a = new THREE.ConeGeometry(1.25, 2.2, 6);
  a.translate(0, 1.1, 0);
  const b = new THREE.ConeGeometry(0.88, 1.65, 6);
  b.translate(0, 2.2, 0);
  const merged = mergeGeometries([a, b], false);
  if (!merged) throw new Error("pine");
  a.dispose();
  b.dispose();
  merged.computeVertexNormals();
  return paintWhite(merged);
}

function styledMat(roughness: number) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness,
    metalness: 0,
    vertexColors: true,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       vLocalY = position.y;`,
    );
    shader.vertexShader = "varying float vLocalY;\n" + shader.vertexShader;
    shader.fragmentShader =
      "varying float vLocalY;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         float cap = smoothstep(-0.1, 1.15, vLocalY);
         diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.72 + vec3(0.95), cap * 0.72);`,
      );
  };
  mat.customProgramCacheKey = () => "pudra-foliage";
  return mat;
}

function trunkMat(birch: boolean) {
  const mat = new THREE.MeshStandardMaterial({
    color: birch ? 0xf3f5f2 : 0x2a241e,
    roughness: 0.86,
  });
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  white.needsUpdate = true;
  white.colorSpace = THREE.SRGBColorSpace;
  mat.map = white;
  if (birch) {
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         float band = floor(vUv.y * 16.0);
         float wedge = floor(vUv.x * 4.0);
         float spot = step(0.62, fract(sin(band * 17.13 + wedge * 9.2) * 43758.5));
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.09, 0.08), spot * 0.9);`,
      );
    };
    mat.customProgramCacheKey = () => "pudra-birch";
  }
  return mat;
}

const MAX_PUFF = 520;
const MAX_PINE = 420;
const MAX_ROCK = 220;
const MAX_SLAB = 140;

export function createWorld(scene: THREE.Scene) {
  const puff = new THREE.InstancedMesh(puffGeo(), styledMat(0.96), MAX_PUFF);
  const pine = new THREE.InstancedMesh(pineGeo(), styledMat(0.94), MAX_PINE);
  const birchTrunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.09, 0.16, 2.7, 5),
    trunkMat(true),
    MAX_PUFF,
  );
  const pineTrunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.2, 1.8, 5),
    trunkMat(false),
    MAX_PINE,
  );
  const rock = new THREE.InstancedMesh(paintWhite(new THREE.DodecahedronGeometry(1, 0)), styledMat(0.9), MAX_ROCK);
  const slab = new THREE.InstancedMesh(paintWhite(new THREE.BoxGeometry(2.8, 0.42, 1.25)), styledMat(0.88), MAX_SLAB);
  const meshes = [puff, pine, birchTrunk, pineTrunk, rock, slab];
  for (const m of meshes) {
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
  }

  const gateGeo = new THREE.TorusGeometry(4.3, 0.5, 8, 20);
  const gates: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    mesh: THREE.Mesh;
    mat: THREE.MeshStandardMaterial;
    taken: boolean;
  }[] = [];
  const rays = [1.12, 0.22, 1.88, 2.55, -1.52, -2.28];
  const radii = [175, 340, 540, 800];
  const archMatBase = { roughness: 0.82, metalness: 0.04 };
  for (const ang of rays) {
    for (const rad of radii) {
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      const s = sample(x, z);
      if (s.ny < 0.72) continue;
      const mat = new THREE.MeshStandardMaterial({ color: 0x66788a, ...archMatBase });
      const mesh = new THREE.Mesh(gateGeo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.scale.set(1, 1.28, 1);
      const yaw = Math.atan2(-s.nx, -s.nz);
      mesh.position.set(x, s.h + 3.15, z);
      mesh.rotation.y = yaw;
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.7 }),
      );
      cap.position.y = 4.5;
      mesh.add(cap);
      scene.add(mesh);
      gates.push({ x, y: s.h + 3.15, z, yaw, mesh, mat, taken: false });
    }
  }

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const obstacles: Obstacle[] = [];
  const cell = 11;
  const reach = 15;

  function palette(puffTree: boolean, b: BiomeW, ix: number, iz: number) {
    const roll = hash01(ix + 2, iz + 9);
    if (!puffTree) return PINE[Math.floor(roll * PINE.length) % PINE.length];
    if (b.night > b.day && b.night > b.dusk) return NIGHT_PUFF[Math.floor(roll * NIGHT_PUFF.length) % NIGHT_PUFF.length];
    if (b.dusk > b.day) return DUSK[Math.floor(roll * DUSK.length) % DUSK.length];
    return DAY[Math.floor(roll * DAY.length) % DAY.length];
  }

  function update(px: number, pz: number) {
    let nPuff = 0;
    let nPine = 0;
    let nRock = 0;
    let nSlab = 0;
    obstacles.length = 0;
    const ox = Math.floor(px / cell);
    const oz = Math.floor(pz / cell);
    for (let ring = 0; ring <= reach; ring++) {
      for (let iz = -ring; iz <= ring; iz++) {
        for (let ix = -ring; ix <= ring; ix++) {
          if (ring > 0 && Math.max(Math.abs(ix), Math.abs(iz)) !== ring) continue;
          const cx = ox + ix;
          const cz = oz + iz;
          const h = hash01(cx, cz);
          const wx = (cx + 0.18 + hash01(cx + 5, cz) * 0.64) * cell;
          const wz = (cz + 0.18 + hash01(cx, cz + 5) * 0.64) * cell;
          const dist = Math.hypot(wx - px, wz - pz);
          if (dist > reach * cell) continue;
          const fade = dist < 120 ? 1 : Math.max(0, 1 - (dist - 120) / 45);
          if (fade <= 0.04) continue;
          const b = biomes(wx, wz);
          const s = sample(wx, wz);
          const density = 0.2 + b.night * 0.42 + b.day * 0.16 + b.dusk * 0.22;
          if (h < density && s.ny > 0.64) {
            const isPuff = hash01(cx + 11, cz + 4) < b.day * 0.84 + b.dusk * 0.9 + b.night * 0.22;
            const sc = (0.75 + hash01(cx + 3, cz + 8) * 1.15) * (0.65 + fade * 0.35);
            const yaw = hash01(cx + 9, cz + 1) * Math.PI * 2;
            if (isPuff && nPuff < MAX_PUFF) {
              dummy.rotation.set(0, yaw, 0);
              dummy.scale.set(sc, sc, sc);
              dummy.position.set(wx, s.h + 1.35 * sc, wz);
              dummy.updateMatrix();
              birchTrunk.setMatrixAt(nPuff, dummy.matrix);
              dummy.position.set(wx, s.h + 2.15 * sc, wz);
              dummy.scale.set(sc * 1.35, sc * 1.05, sc * 1.2);
              dummy.updateMatrix();
              puff.setMatrixAt(nPuff, dummy.matrix);
              puff.setColorAt(nPuff, color.setHex(palette(true, b, cx, cz)));
              obstacles.push({ x: wx, y: s.h, z: wz, r: 0.38 * sc + 0.28, key: `t${cx}:${cz}` });
              nPuff++;
            } else if (!isPuff && nPine < MAX_PINE) {
              const psc = sc * 1.35;
              dummy.rotation.set(0, yaw, 0);
              dummy.scale.set(psc * 0.85, psc, psc * 0.85);
              dummy.position.set(wx, s.h + 0.9 * psc, wz);
              dummy.updateMatrix();
              pineTrunk.setMatrixAt(nPine, dummy.matrix);
              dummy.position.set(wx, s.h, wz);
              dummy.scale.set(psc, psc, psc);
              dummy.updateMatrix();
              pine.setMatrixAt(nPine, dummy.matrix);
              pine.setColorAt(nPine, color.setHex(palette(false, b, cx, cz)));
              obstacles.push({ x: wx, y: s.h, z: wz, r: 0.34 * psc + 0.25, key: `p${cx}:${cz}` });
              nPine++;
            }
          }
          const hr = hash01(cx + 21, cz + 4);
          if (hr > 0.72 && s.ny > 0.5 && nRock < MAX_ROCK && dist < 150) {
            const rs = 0.35 + hash01(cx + 6, cz + 2) * 1.5;
            dummy.position.set(wx + 3.2, s.h + rs * 0.25, wz - 2.1);
            dummy.rotation.set(hr * 2, hash01(cx, cz + 8) * 6, hr);
            dummy.scale.set(rs, rs * 0.7, rs);
            dummy.updateMatrix();
            rock.setMatrixAt(nRock, dummy.matrix);
            const rockCol = b.night > 0.5 ? 0x1b2744 : b.dusk > 0.5 ? 0x3a2a44 : 0x3d4c5c;
            rock.setColorAt(nRock, color.setHex(rockCol));
            if (rs > 0.85) obstacles.push({ x: wx + 3.2, y: s.h, z: wz - 2.1, r: rs * 0.55, key: `r${cx}:${cz}` });
            nRock++;
          }
          if (b.night > 0.48 && hash01(cx + 40, cz + 12) > 0.78 && nSlab < MAX_SLAB && s.ny > 0.7) {
            const tilt = hash01(cx + 1, cz + 15);
            dummy.position.set(wx - 4, s.h + 0.3, wz + 3);
            dummy.rotation.set(tilt * 0.5, tilt * 6, tilt > 0.55 ? 1.15 : 0.15);
            dummy.scale.set(0.7 + tilt, 0.8 + tilt, 0.7);
            dummy.updateMatrix();
            slab.setMatrixAt(nSlab, dummy.matrix);
            slab.setColorAt(nSlab, color.setHex(0x243044));
            nSlab++;
          }
        }
      }
    }
    puff.count = nPuff;
    birchTrunk.count = nPuff;
    pine.count = nPine;
    pineTrunk.count = nPine;
    rock.count = nRock;
    slab.count = nSlab;
    puff.instanceMatrix.needsUpdate = true;
    birchTrunk.instanceMatrix.needsUpdate = true;
    pine.instanceMatrix.needsUpdate = true;
    pineTrunk.instanceMatrix.needsUpdate = true;
    rock.instanceMatrix.needsUpdate = true;
    slab.instanceMatrix.needsUpdate = true;
    if (puff.instanceColor) puff.instanceColor.needsUpdate = true;
    if (pine.instanceColor) pine.instanceColor.needsUpdate = true;
    if (rock.instanceColor) rock.instanceColor.needsUpdate = true;
    if (slab.instanceColor) slab.instanceColor.needsUpdate = true;
  }

  return {
    update,
    obstacles,
    gates,
    resetGates() {
      for (const g of gates) {
        g.taken = false;
        g.mat.emissive.setHex(0x000000);
        g.mat.color.setHex(0x66788a);
      }
    },
    dispose() {
      for (const m of meshes) {
        m.geometry.dispose();
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
      gateGeo.dispose();
      for (const g of gates) g.mat.dispose();
    },
  };
}
