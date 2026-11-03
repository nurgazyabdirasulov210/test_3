export type Kicker = {
  x: number;
  z: number;
  ang: number;
  len: number;
  wid: number;
  amp: number;
};

const RAYS = [1.0, 0.42, 1.72, 2.38, -1.68, -2.45];

export const KICKERS: Kicker[] = RAYS.flatMap((ang) =>
  [205, 485].map((rad) => ({
    x: Math.cos(ang) * rad,
    z: Math.sin(ang) * rad,
    ang,
    len: 26,
    wid: 8,
    amp: rad > 400 ? 8.2 : 6.4,
  })),
);

export const SPAWN = {
  x: Math.cos(1.0) * 76,
  z: Math.sin(1.0) * 76,
};

function kickerAt(x: number, z: number, k: Kicker): number {
  const dx = x - k.x;
  const dz = z - k.z;
  const c = Math.cos(k.ang);
  const s = Math.sin(k.ang);
  const lx = dx * c + dz * s;
  const lz = -dx * s + dz * c;
  if (lx < -2 || lx > k.len + 4) return 0;
  const across = Math.abs(lz) / k.wid;
  if (across > 1) return 0;
  const edge = Math.cos(across * Math.PI) * 0.5 + 0.5;
  let profile = 0;
  if (lx >= 0 && lx < k.len * 0.72) {
    const t = lx / (k.len * 0.72);
    profile = t * t * k.amp;
  } else if (lx >= k.len * 0.72 && lx < k.len) {
    const t = (lx - k.len * 0.72) / (k.len * 0.28);
    profile = Math.cos(t * Math.PI * 0.5) * k.amp;
  }
  return profile * edge;
}

export function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z) + 0.001;
  let h = 340 * Math.exp(-Math.pow(r / 420, 1.28));
  h += 26 * Math.sin(x * 0.0043 + 0.7) * Math.cos(z * 0.0038);
  h += 16 * Math.sin(x * 0.0105 + z * 0.006);
  h += 8 * Math.sin(r * 0.018) * Math.exp(-r * 0.0008);
  h += 150 * Math.exp(-((x - 900) ** 2 + (z - 500) ** 2) / 180000);
  h += 120 * Math.exp(-((x + 700) ** 2 + (z - 800) ** 2) / 140000);
  h += 90 * Math.exp(-((x - 200) ** 2 + (z + 1000) ** 2) / 160000);
  h += 5.5 * Math.sin(x * 0.031 + 1.7) * Math.cos(z * 0.028 + 0.4);
  h += 3.2 * Math.sin(x * 0.07 + z * 0.05);
  for (let i = 0; i < KICKERS.length; i++) h += kickerAt(x, z, KICKERS[i]);
  return h;
}

const E = 0.8;

export type Sample = { h: number; nx: number; ny: number; nz: number };

export function sample(x: number, z: number): Sample {
  const h = heightAt(x, z);
  const hx = heightAt(x + E, z) - heightAt(x - E, z);
  const hz = heightAt(x, z + E) - heightAt(x, z - E);
  const nx = -hx;
  const ny = 2 * E;
  const nz = -hz;
  const len = Math.hypot(nx, ny, nz) || 1;
  return { h, nx: nx / len, ny: ny / len, nz: nz / len };
}

export function hash01(ix: number, iz: number): number {
  let n = (Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263)) | 0;
  n = Math.imul(n ^ (n >> 13), 1274126177);
  n = n ^ (n >> 16);
  return (n >>> 0) / 4294967296;
}

export type BiomeW = { day: number; night: number; dusk: number };

export function biomes(x: number, z: number): BiomeW {
  const ang = Math.atan2(z, x);
  const lobe = (center: number, width: number) => {
    const d = Math.atan2(Math.sin(ang - center), Math.cos(ang - center));
    return Math.exp(-(d * d) / (width * width));
  };
  let day = lobe(1.0, 0.95);
  let night = lobe(2.35, 0.82);
  let dusk = lobe(-1.7, 0.9);
  const s = day + night + dusk + 1e-4;
  day /= s;
  night /= s;
  dusk /= s;
  return { day, night, dusk };
}

export function biomeName(b: BiomeW): string {
  if (b.night >= b.day && b.night >= b.dusk) return "Ночная чаща";
  if (b.dusk >= b.day) return "Закатный хребет";
  return "Ясный склон";
}

export function downhillYaw(x: number, z: number): number {
  const s = sample(x, z);
  if (s.nx * s.nx + s.nz * s.nz < 1e-4) return 0;
  return Math.atan2(-s.nx, -s.nz);
}

export function buildHeightGlsl(): string {
  const calls = KICKERS.map(
    (k) =>
      `h += kicker(x, z, ${k.x.toFixed(3)}, ${k.z.toFixed(3)}, ${k.ang.toFixed(4)}, ${k.len.toFixed(2)}, ${k.wid.toFixed(2)}, ${k.amp.toFixed(2)});`,
  ).join("\n");
  return /* glsl */ `
float kicker(float x, float z, float cx, float cz, float ang, float len, float wid, float amp) {
  float dx = x - cx;
  float dz = z - cz;
  float co = cos(ang);
  float sn = sin(ang);
  float lx = dx * co + dz * sn;
  float lz = -dx * sn + dz * co;
  if (lx < -2.0 || lx > len + 4.0) return 0.0;
  float across = abs(lz) / wid;
  if (across > 1.0) return 0.0;
  float edge = cos(across * 3.14159265) * 0.5 + 0.5;
  float profile = 0.0;
  if (lx >= 0.0 && lx < len * 0.72) {
    float t = lx / (len * 0.72);
    profile = t * t * amp;
  } else if (lx >= len * 0.72 && lx < len) {
    float t = (lx - len * 0.72) / (len * 0.28);
    profile = cos(t * 1.5707963) * amp;
  }
  return profile * edge;
}
float heightAt(float x, float z) {
  float r = length(vec2(x, z)) + 0.001;
  float h = 340.0 * exp(-pow(r / 420.0, 1.28));
  h += 26.0 * sin(x * 0.0043 + 0.7) * cos(z * 0.0038);
  h += 16.0 * sin(x * 0.0105 + z * 0.006);
  h += 8.0 * sin(r * 0.018) * exp(-r * 0.0008);
  h += 150.0 * exp(-(pow(x - 900.0, 2.0) + pow(z - 500.0, 2.0)) / 180000.0);
  h += 120.0 * exp(-(pow(x + 700.0, 2.0) + pow(z - 800.0, 2.0)) / 140000.0);
  h += 90.0 * exp(-(pow(x - 200.0, 2.0) + pow(z + 1000.0, 2.0)) / 160000.0);
  h += 5.5 * sin(x * 0.031 + 1.7) * cos(z * 0.028 + 0.4);
  h += 3.2 * sin(x * 0.07 + z * 0.05);
  ${calls}
  return h;
}
`;
}
