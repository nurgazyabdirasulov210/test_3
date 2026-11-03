export type AudioRig = {
  warmup: () => void;
  update: (speed: number, carve: number, wings: boolean, muted: boolean) => void;
  chime: (mul: number) => void;
  thud: () => void;
  whoosh: () => void;
  dispose: () => void;
};

export function createAudio(): AudioRig {
  let ctx: AudioContext | null = null;
  let windGain: GainNode | null = null;
  let windFilter: BiquadFilterNode | null = null;
  let padGain: GainNode | null = null;
  let lastChime = 0;

  function warmup() {
    if (ctx) {
      if (ctx.state === "suspended") void ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctx();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let v = 0;
    for (let i = 0; i < data.length; i++) {
      v = (v + Math.random() * 2 - 1) * 0.5;
      data[i] = v;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 420;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    noise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);
    noise.start();

    padGain = ctx.createGain();
    padGain.gain.value = 0;
    padGain.connect(ctx.destination);
    const freqs = [196, 247, 392];
    for (const f of freqs) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = f === 196 ? 0.45 : 0.22;
      o.connect(g);
      g.connect(padGain);
      o.start();
    }
  }

  function update(speed: number, carve: number, wings: boolean, muted: boolean) {
    if (!ctx || !windGain || !windFilter || !padGain) return;
    const now = ctx.currentTime;
    const target = muted ? 0 : Math.min(0.16, speed * 0.0036 + (wings ? 0.05 : 0) + Math.abs(carve) * 0.02);
    windGain.gain.setTargetAtTime(target, now, 0.12);
    windFilter.frequency.setTargetAtTime(260 + speed * 36 + Math.abs(carve) * 520 + (wings ? 180 : 0), now, 0.12);
    padGain.gain.setTargetAtTime(muted ? 0 : 0.018, now, 0.4);
  }

  function chime(mul: number) {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - lastChime < 0.07) return;
    lastChime = now;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = 620 + Math.min(4, mul) * 70;
    g.gain.setValueAtTime(0.045, now);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 0.16);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(now);
    o.stop(now + 0.18);
  }

  function noiseBurst(freq: number, dur: number, vol: number) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(now);
  }

  return {
    warmup,
    update,
    chime,
    thud: () => noiseBurst(140, 0.22, 0.12),
    whoosh: () => noiseBurst(700, 0.18, 0.05),
    dispose: () => {
      if (ctx) void ctx.close();
      ctx = null;
    },
  };
}
