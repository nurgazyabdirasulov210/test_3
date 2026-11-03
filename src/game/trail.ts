import * as THREE from "three";
import { NoColorSpace } from "three";

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uPrev;
uniform vec2 uDelta;
uniform vec4 uA0;
uniform vec4 uB0;
uniform vec4 uA1;
uniform vec4 uB1;
uniform float uClear;
uniform float uStamp;
uniform float uCarve;
uniform float uWorld;

float capsule(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  if (uClear > 0.5) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec2 suv = vUv + uDelta;
  float old = 0.0;
  if (suv.x > 0.0 && suv.y > 0.0 && suv.x < 1.0 && suv.y < 1.0) {
    old = texture2D(uPrev, suv).r * 0.9965;
  }
  if (uStamp > 0.5) {
    vec2 p = (vUv - 0.5) * uWorld;
    float d0 = capsule(p, uA0.xy, uB0.xy);
    float d1 = capsule(p, uA1.xy, uB1.xy);
    float d = min(d0, d1);
    float core = smoothstep(0.36, 0.04, d);
    float wash = smoothstep(1.25 + uCarve * 0.9, 0.2, d) * 0.62;
    old = max(old, max(core, wash));
  }
  gl_FragColor = vec4(clamp(old, 0.0, 1.0), 0.0, 0.0, 1.0);
}
`;

export function createTrail(worldSize = 128) {
  const res = typeof window !== "undefined" && window.innerWidth < 760 ? 512 : 1024;
  const make = () => {
    const rt = new THREE.WebGLRenderTarget(res, res, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    });
    rt.texture.colorSpace = NoColorSpace;
    return rt;
  };
  let read = make();
  let write = make();
  const geo = new THREE.PlaneGeometry(2, 2);
  const uniforms = {
    uPrev: { value: read.texture },
    uDelta: { value: new THREE.Vector2() },
    uA0: { value: new THREE.Vector4() },
    uB0: { value: new THREE.Vector4() },
    uA1: { value: new THREE.Vector4() },
    uB1: { value: new THREE.Vector4() },
    uClear: { value: 0 },
    uStamp: { value: 0 },
    uCarve: { value: 0 },
    uWorld: { value: worldSize },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const scene = new THREE.Scene();
  scene.add(mesh);
  const cam = new THREE.Camera();
  const center = new THREE.Vector2();
  let ready = false;

  return {
    worldSize,
    center,
    current: () => read.texture,
    render(
      renderer: THREE.WebGLRenderer,
      skier: {
        x: number;
        z: number;
        px: number;
        pz: number;
        yaw: number;
        grounded: boolean;
        steer: number;
        clear: boolean;
      },
    ) {
      const dx = ready ? center.x - skier.x : 0;
      const dz = ready ? center.z - skier.z : 0;
      uniforms.uPrev.value = read.texture;
      uniforms.uDelta.value.set(ready ? -dx / worldSize : 0, ready ? -dz / worldSize : 0);
      uniforms.uClear.value = skier.clear || !ready ? 1 : 0;
      const dist = Math.hypot(skier.x - skier.px, skier.z - skier.pz);
      const stamp = skier.grounded && ready && !skier.clear && dist < 8 && dist > 0.0008;
      uniforms.uStamp.value = stamp ? 1 : 0;
      uniforms.uCarve.value = Math.abs(skier.steer);
      if (stamp) {
        const rx = Math.cos(skier.yaw);
        const rz = -Math.sin(skier.yaw);
        const off = 0.16;
        const nx = skier.x;
        const nz = skier.z;
        uniforms.uA0.value.set(skier.px - nx + rx * off, skier.pz - nz + rz * off, 0, 0);
        uniforms.uB0.value.set(rx * off, rz * off, 0, 0);
        uniforms.uA1.value.set(skier.px - nx - rx * off, skier.pz - nz - rz * off, 0, 0);
        uniforms.uB1.value.set(-rx * off, -rz * off, 0, 0);
      }
      center.set(skier.x, skier.z);
      ready = true;
      const prevTarget = renderer.getRenderTarget();
      const prevClear = renderer.autoClear;
      renderer.autoClear = true;
      renderer.setRenderTarget(write);
      renderer.render(scene, cam);
      renderer.setRenderTarget(prevTarget);
      renderer.autoClear = prevClear;
      const tmp = read;
      read = write;
      write = tmp;
    },
    dispose() {
      read.dispose();
      write.dispose();
      geo.dispose();
      mat.dispose();
    },
  };
}
