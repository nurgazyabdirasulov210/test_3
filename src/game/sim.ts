import { downhillYaw, sample, SPAWN } from "@/game/height";

export type Input = {
  steer: number;
  tuck: boolean;
  brake: boolean;
  jump: boolean;
  wing: boolean;
};

export type Body = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  roll: number;
  onGround: boolean;
  wings: boolean;
  crashed: boolean;
  crashT: number;
  airTime: number;
  airYaw: number;
  airPitch: number;
  pitchVel: number;
  visualPitch: number;
};

export type ObstacleHit = { x: number; z: number; r: number; y: number };

export type SimEvent =
  | { t: "jump" }
  | { t: "wing"; open: boolean }
  | { t: "land"; air: number; spins: number; flips: number; impact: number }
  | { t: "crash" }
  | { t: "getup" };

const G = 26;
const GRAV = 20;

export function wrapAng(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function horizSpeed(b: Body): number {
  return Math.hypot(b.vx, b.vz);
}

export function createBody(): Body {
  return {
    x: SPAWN.x,
    y: 0,
    z: SPAWN.z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    roll: 0,
    onGround: true,
    wings: false,
    crashed: false,
    crashT: 0,
    airTime: 0,
    airYaw: 0,
    airPitch: 0,
    pitchVel: 0,
    visualPitch: 0,
  };
}

export function resetBody(b: Body, x = SPAWN.x, z = SPAWN.z, speed = 12): void {
  const s = sample(x, z);
  const yaw = downhillYaw(x, z);
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  b.x = x;
  b.z = z;
  b.y = s.h + 0.08;
  b.yaw = yaw;
  b.vx = fx * speed;
  b.vz = fz * speed;
  b.vy = 0;
  b.roll = 0;
  b.onGround = true;
  b.wings = false;
  b.crashed = false;
  b.crashT = 0;
  b.airTime = 0;
  b.airYaw = 0;
  b.airPitch = 0;
  b.pitchVel = 0;
  b.visualPitch = 0;
}

function basis(yaw: number) {
  return {
    fx: -Math.sin(yaw),
    fz: -Math.cos(yaw),
    rx: Math.cos(yaw),
    rz: -Math.sin(yaw),
  };
}

function stick(b: Body) {
  const s = sample(b.x, b.z);
  b.y = s.h + 0.08;
  return s;
}

export function stepBody(
  b: Body,
  input: Input,
  dt: number,
  collide: (b: Body) => ObstacleHit | null,
): SimEvent[] {
  const events: SimEvent[] = [];
  const steer = Math.max(-1, Math.min(1, input.steer));

  if (b.crashed) {
    b.crashT += dt;
    b.vx *= Math.exp(-1.6 * dt);
    b.vz *= Math.exp(-1.6 * dt);
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    stick(b);
    b.vy = 0;
    b.wings = false;
    b.onGround = true;
    const targetRoll = Math.sin(b.crashT * 14) * 1.1;
    b.roll += (targetRoll - b.roll) * (1 - Math.exp(-6 * dt));
    b.visualPitch += (0.9 - b.visualPitch) * (1 - Math.exp(-4 * dt));
    if (b.crashT > 1.05) {
      b.crashed = false;
      b.crashT = 0;
      b.visualPitch = 0;
      const sp = horizSpeed(b);
      const { fx, fz } = basis(b.yaw);
      const keep = Math.max(4, sp * 0.45);
      b.vx = fx * keep;
      b.vz = fz * keep;
      events.push({ t: "getup" });
    }
    return events;
  }

  if (b.onGround) {
    const s = sample(b.x, b.z);
    const sp0 = horizSpeed(b);
    const speedFactor = Math.max(0.4, Math.min(1, sp0 / 6));
    b.yaw += steer * 1.9 * speedFactor * dt;
    const { fx, fz, rx, rz } = basis(b.yaw);
    let forwardSpeed = b.vx * fx + b.vz * fz;
    let lateral = b.vx * rx + b.vz * rz;
    lateral *= Math.exp(-10 * dt);
    const along = (s.nx * fx + s.nz * fz) * G * s.ny;
    forwardSpeed += along * dt;
    if (input.tuck) forwardSpeed += 7.5 * dt;
    if (input.brake) forwardSpeed -= 16 * dt;
    forwardSpeed -= Math.abs(steer) * forwardSpeed * 0.18 * dt;
    const drag = 0.0095 * forwardSpeed * Math.abs(forwardSpeed);
    forwardSpeed -= drag * dt;
    if (forwardSpeed < 0) forwardSpeed = 0;
    if (forwardSpeed > 38) forwardSpeed = 38;
    b.vx = fx * forwardSpeed + rx * lateral;
    b.vz = fz * forwardSpeed + rz * lateral;

    const prevY = b.y;
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    const s2 = sample(b.x, b.z);
    const groundY = s2.h + 0.08;
    const launched = prevY - groundY > 0.85 && forwardSpeed > 8;
    if (input.jump || launched) {
      b.onGround = false;
      b.vy = input.jump ? 6.4 + Math.min(forwardSpeed, 30) * 0.15 : Math.max(1.2, (prevY - groundY) * 0.35);
      b.y = prevY + Math.max(0, b.vy) * dt;
      b.airTime = 0;
      b.airYaw = 0;
      b.airPitch = 0;
      b.pitchVel = 0;
      if (input.jump) events.push({ t: "jump" });
    } else {
      b.y = groundY;
      b.vy = 0;
      b.onGround = true;
      b.wings = false;
    }
  } else {
    b.airTime += dt;
    const yawBefore = b.yaw;
    if (b.wings) {
      b.yaw += steer * 1.25 * dt;
      const { fx, fz } = basis(b.yaw);
      const hs = horizSpeed(b);
      const lift = Math.min(24, 7 + hs * 0.62);
      b.vy += (-GRAV + lift) * dt;
      if (b.vy < -5.5) b.vy = -5.5;
      if (b.vy > 8) b.vy = 8;
      b.vx += fx * 10 * dt;
      b.vz += fz * 10 * dt;
      const sp = horizSpeed(b);
      const align = 1 - Math.exp(-1.8 * dt);
      b.vx += (fx * sp - b.vx) * align;
      b.vz += (fz * sp - b.vz) * align;
      const m = Math.hypot(b.vx, b.vz);
      if (m > 40) {
        b.vx *= 40 / m;
        b.vz *= 40 / m;
      }
    } else {
      b.yaw += steer * 3.8 * dt;
      b.airYaw += b.yaw - yawBefore;
      if (input.tuck) b.pitchVel -= 5.2 * dt;
      if (input.brake) b.pitchVel += 5.2 * dt;
      b.airPitch += b.pitchVel * dt;
      b.pitchVel *= Math.exp(-0.35 * dt);
      b.vy -= GRAV * dt;
      b.vx *= Math.exp(-0.06 * dt);
      b.vz *= Math.exp(-0.06 * dt);
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    const s2 = sample(b.x, b.z);
    const groundY = s2.h + 0.08;
    if (b.y <= groundY && b.vy <= 0.5) {
      const impact = Math.max(0, -b.vy);
      const air = b.airTime;
      const spins = Math.abs(b.airYaw) / (Math.PI * 2);
      const flips = Math.abs(b.airPitch) / (Math.PI * 2);
      b.y = groundY;
      b.vy = 0;
      b.onGround = true;
      b.wings = false;
      const sp = horizSpeed(b);
      const { fx, fz } = basis(b.yaw);
      b.vx = fx * sp;
      b.vz = fz * sp;
      b.airTime = 0;
      b.airYaw = 0;
      b.airPitch = 0;
      b.pitchVel = 0;
      events.push({ t: "land", air, spins, flips, impact });
    }
  }

  const obstacle = collide(b);
  if (!b.crashed && obstacle && b.y < obstacle.y + 2.7) {
    const dx = b.x - obstacle.x;
    const dz = b.z - obstacle.z;
    const d = Math.hypot(dx, dz) || 1;
    b.x = obstacle.x + (dx / d) * (obstacle.r + 0.28);
    b.z = obstacle.z + (dz / d) * (obstacle.r + 0.28);
    b.crashed = true;
    b.crashT = 0;
    b.wings = false;
    b.onGround = true;
    b.vx *= -0.12;
    b.vz *= -0.12;
    stick(b);
    events.push({ t: "crash" });
    return events;
  }

  if (!b.onGround && input.wing) {
    b.wings = !b.wings;
    if (b.wings) b.pitchVel = 0;
    events.push({ t: "wing", open: b.wings });
  }

  const sVis = sample(b.x, b.z);
  const { fx, fz } = basis(b.yaw);
  const dhdx = -sVis.nx / Math.max(0.18, sVis.ny);
  const dhdz = -sVis.nz / Math.max(0.18, sVis.ny);
  const slopePitch = Math.atan(dhdx * fx + dhdz * fz);
  const airP = b.onGround ? 0 : b.airPitch;
  const targetPitch = (b.onGround ? slopePitch : slopePitch * 0.25 + airP) + (b.wings ? 0.18 : 0);
  b.visualPitch += (targetPitch - b.visualPitch) * (1 - Math.exp(-8 * dt));
  const targetRoll = b.onGround ? steer * 0.66 : b.wings ? steer * 0.9 : steer * 0.25;
  b.roll += (targetRoll - b.roll) * (1 - Math.exp(-8 * dt));
  return events;
}

export function aiInput(b: Body, time: number): Input {
  const desired = downhillYaw(b.x, b.z);
  const err = wrapAng(desired - b.yaw);
  let steer = Math.max(-1, Math.min(1, err / 0.55));
  steer = Math.max(-1, Math.min(1, steer * 0.55 + Math.sin(time * 0.72 + 0.4) * 0.85));
  const jump = b.onGround && horizSpeed(b) > 14 && Math.sin(time * 0.37) > 0.992;
  return { steer, tuck: true, brake: false, jump, wing: false };
}
