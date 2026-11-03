import * as THREE from "three";
import type { Body } from "@/game/sim";

const JACKETS = [0xe23b2f, 0xf0c43a, 0x1fb8a8, 0xf7f9fc];
const STRIPES = [0x8d241c, 0x2ec4c4, 0x0d5c56, 0xb9c6d4];
const SKIS = [0xff4d3c, 0x5ee7e0, 0x7af0e4, 0xff5a4a];

export function createRider(scene: THREE.Scene) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const cloth = new THREE.MeshStandardMaterial({ color: JACKETS[0], roughness: 0.58, metalness: 0.02 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: STRIPES[0], roughness: 0.5, metalness: 0.04 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.72, metalness: 0.04 });
  const skiMat = new THREE.MeshStandardMaterial({
    color: SKIS[0],
    roughness: 0.32,
    metalness: 0.08,
    emissive: new THREE.Color(SKIS[0]).multiplyScalar(0.18),
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), cloth);
  torso.scale.set(1.15, 1.2, 0.86);
  torso.position.y = 1.02;
  torso.castShadow = true;

  const hip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), cloth);
  hip.scale.set(1.15, 0.8, 0.9);
  hip.position.y = 0.68;
  hip.castShadow = true;

  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 12), cloth);
  hood.position.y = 1.46;
  hood.castShadow = true;

  const goggle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.08), dark);
  goggle.position.set(0, 1.48, -0.2);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.08), stripeMat);
  panel.position.set(0, 1.05, 0.26);
  panel.castShadow = true;

  function limb(radius: number, len: number, mat: THREE.Material) {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.78, len, 6), mat);
    mesh.position.y = -len / 2;
    mesh.castShadow = true;
    g.add(mesh);
    return g;
  }

  const armL = limb(0.075, 0.48, dark);
  const armR = limb(0.075, 0.48, dark);
  armL.position.set(-0.34, 1.18, 0);
  armR.position.set(0.34, 1.18, 0);
  const legL = limb(0.09, 0.5, dark);
  const legR = limb(0.09, 0.5, dark);
  legL.position.set(-0.14, 0.58, 0);
  legR.position.set(0.14, 0.58, 0);

  const skiGeo = new THREE.BoxGeometry(0.11, 0.03, 1.5);
  skiGeo.translate(0, 0.04, -0.12);
  const skiL = new THREE.Mesh(skiGeo, skiMat);
  const skiR = new THREE.Mesh(skiGeo, skiMat);
  skiL.position.x = -0.15;
  skiR.position.x = 0.15;
  skiL.castShadow = true;
  skiR.castShadow = true;

  const poleGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.05, 4);
  const poleL = new THREE.Mesh(poleGeo, dark);
  const poleR = new THREE.Mesh(poleGeo, dark);
  poleL.position.set(-0.42, 0.7, 0.15);
  poleR.position.set(0.42, 0.7, 0.15);
  poleL.rotation.x = 0.35;
  poleR.rotation.x = 0.35;
  poleL.rotation.z = 0.25;
  poleR.rotation.z = -0.25;

  const wingGeo = new THREE.SphereGeometry(1.15, 18, 10, 0, Math.PI * 2, 0, 0.52);
  wingGeo.scale(2.15, 0.62, 1.2);
  wingGeo.translate(0, 1.72, 0.05);
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x142226,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const wing = new THREE.Mesh(wingGeo, wingMat);
  wing.castShadow = true;
  wing.visible = false;

  const lineMat = new THREE.MeshStandardMaterial({ color: 0x101416 });
  const lines: THREE.Mesh[] = [];
  for (const x of [-1.55, -0.55, 0.55, 1.55]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4), lineMat);
    m.position.set(x * 0.85, 1.25, 0);
    m.scale.y = 0.85;
    lines.push(m);
    wing.add(m);
  }

  body.add(torso, hip, hood, goggle, panel, armL, armR, legL, legR, skiL, skiR, poleL, poleR, wing);
  scene.add(root);

  let jacket = 0;
  let tuck = 0;
  let night = 0;

  function applyJacket(index: number) {
    jacket = index;
    cloth.color.setHex(JACKETS[index]);
    stripeMat.color.setHex(STRIPES[index]);
    skiMat.color.setHex(SKIS[index]);
    skiMat.emissive.setHex(SKIS[index]).multiplyScalar(0.12 + night * 0.35);
  }

  return {
    root,
    setJacket: applyJacket,
    setNight(n: number) {
      night = n;
      skiMat.emissive.setHex(SKIS[jacket]).multiplyScalar(0.12 + night * 0.4);
    },
    update(b: Body, dt: number, inputTuck: boolean, fp: boolean) {
      root.position.set(b.x, b.y, b.z);
      root.rotation.order = "YXZ";
      root.rotation.y = b.yaw;
      root.rotation.x = b.visualPitch;
      root.rotation.z = b.roll;
      const wantTuck = b.onGround && inputTuck ? 1 : 0;
      tuck += (wantTuck - tuck) * (1 - Math.exp(-8 * dt));
      body.rotation.x = -0.62 * tuck;
      body.position.y = -0.16 * tuck;
      const spread = b.wings ? 1.35 : 0.55;
      armL.rotation.z = spread + b.roll * 0.1;
      armR.rotation.z = -spread - b.roll * 0.1;
      armL.rotation.x = b.wings ? -0.2 : 0.45 + tuck * 0.4;
      armR.rotation.x = armL.rotation.x;
      legL.rotation.x = tuck * 0.55;
      legR.rotation.x = tuck * 0.55;
      wing.visible = b.wings;
      wing.rotation.z = Math.sin(performance.now() * 0.004) * 0.05;
      wing.rotation.x = -0.08;
      const showBody = !fp;
      torso.visible = showBody;
      hip.visible = showBody;
      hood.visible = showBody;
      goggle.visible = showBody;
      panel.visible = showBody;
      armL.visible = showBody;
      armR.visible = showBody;
      legL.visible = showBody;
      legR.visible = showBody;
      poleL.visible = showBody && !b.wings;
      poleR.visible = showBody && !b.wings;
    },
    dispose() {
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      cloth.dispose();
      stripeMat.dispose();
      dark.dispose();
      skiMat.dispose();
      wingMat.dispose();
      lineMat.dispose();
    },
  };
}
