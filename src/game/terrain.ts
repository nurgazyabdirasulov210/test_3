import * as THREE from "three";
import { buildHeightGlsl } from "@/game/height";

export type SnowUniforms = {
  uTrail: { value: THREE.Texture | null };
  uTrailCenter: { value: THREE.Vector2 };
  uTrailSize: { value: number };
  uTime: { value: number };
  uGlitter: { value: number };
  uTint: { value: THREE.Color };
};

export function createTerrain(scene: THREE.Scene) {
  const seg = 200;
  const size = 680;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array((seg + 1) * (seg + 1) * 3);
  const normals = new Float32Array((seg + 1) * (seg + 1) * 3);
  const uvs = new Float32Array((seg + 1) * (seg + 1) * 2);
  const index: number[] = [];
  for (let j = 0; j <= seg; j++) {
    for (let i = 0; i <= seg; i++) {
      const id = j * (seg + 1) + i;
      positions[id * 3] = (i / seg - 0.5) * size;
      positions[id * 3 + 1] = 0;
      positions[id * 3 + 2] = (j / seg - 0.5) * size;
      normals[id * 3 + 1] = 1;
      uvs[id * 2] = i / seg;
      uvs[id * 2 + 1] = j / seg;
    }
  }
  for (let j = 0; j < seg; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i;
      index.push(a, a + seg + 1, a + 1, a + 1, a + seg + 1, a + seg + 2);
    }
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 140, 0), 620);

  const uniforms: SnowUniforms = {
    uTrail: { value: null },
    uTrailCenter: { value: new THREE.Vector2() },
    uTrailSize: { value: 128 },
    uTime: { value: 0 },
    uGlitter: { value: 1 },
    uTint: { value: new THREE.Color("#ffffff") },
  };

  const mat = new THREE.MeshStandardMaterial({
    color: 0xf5f8fb,
    roughness: 0.84,
    metalness: 0.02,
  });
  mat.customProgramCacheKey = () => "pudra-snow-v1";
  const heightGlsl = buildHeightGlsl();
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTrail = uniforms.uTrail;
    shader.uniforms.uTrailCenter = uniforms.uTrailCenter;
    shader.uniforms.uTrailSize = uniforms.uTrailSize;
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uGlitter = uniforms.uGlitter;
    shader.uniforms.uTint = uniforms.uTint;
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", `${heightGlsl}\nvarying highp vec3 vSnowWorld;\nvoid main() {`)
      .replace(
        "#include <beginnormal_vertex>",
        `
        vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
        float te = 0.8;
        float hL = heightAt(wp.x - te, wp.z);
        float hR = heightAt(wp.x + te, wp.z);
        float hD = heightAt(wp.x, wp.z - te);
        float hU = heightAt(wp.x, wp.z + te);
        vec3 objectNormal = normalize(vec3(hL - hR, 2.0 * te, hD - hU));
        `,
      )
      .replace(
        "#include <begin_vertex>",
        `
        float th = heightAt(wp.x, wp.z);
        vec3 transformed = vec3(position.x, th, position.z);
        `,
      )
      .replace(
        "#include <worldpos_vertex>",
        `
        #include <worldpos_vertex>
        vSnowWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `,
      );
    shader.fragmentShader =
      `varying highp vec3 vSnowWorld;
       uniform sampler2D uTrail;
       uniform vec2 uTrailCenter;
       uniform float uTrailSize;
       uniform float uTime;
       uniform float uGlitter;
       uniform vec3 uTint;
      ` +
      shader.fragmentShader
        .replace(
          "#include <color_fragment>",
          `
          #include <color_fragment>
          vec2 tuv = (vSnowWorld.xz - uTrailCenter) / uTrailSize + 0.5;
          float tr = 0.0;
          if (tuv.x > 0.0 && tuv.y > 0.0 && tuv.x < 1.0 && tuv.y < 1.0) {
            tr = texture2D(uTrail, tuv).r;
          }
          float edge = smoothstep(0.15, 0.95, tr);
          diffuseColor.rgb *= uTint;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.76, 0.92), edge * 0.62);
          diffuseColor.rgb *= mix(1.0, 0.78, edge);
          float spark = fract(sin(dot(floor(vSnowWorld.xz * 14.0), vec2(127.1, 311.7))) * 43758.5453 + uTime * 0.22);
          diffuseColor.rgb += step(0.988, spark) * 0.7 * uGlitter * (1.0 - edge);
          float cloud = 0.9 + 0.1 * sin(vSnowWorld.x * 0.02 + uTime * 0.05) * sin(vSnowWorld.z * 0.017 - uTime * 0.03);
          diffuseColor.rgb *= mix(1.0, cloud, 0.65);
          `,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `
          #include <roughnessmap_fragment>
          vec2 ruv = (vSnowWorld.xz - uTrailCenter) / uTrailSize + 0.5;
          float rr = 0.0;
          if (ruv.x > 0.0 && ruv.y > 0.0 && ruv.x < 1.0 && ruv.y < 1.0) rr = texture2D(uTrail, ruv).r;
          roughnessFactor = mix(roughnessFactor, 0.97, smoothstep(0.2, 0.8, rr));
          `,
        );
  };

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  scene.add(mesh);

  const cell = size / seg;
  return {
    mesh,
    uniforms,
    snap(x: number, z: number) {
      const ox = Math.round(x / cell) * cell;
      const oz = Math.round(z / cell) * cell;
      mesh.position.set(ox, 0, oz);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
