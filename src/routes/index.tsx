import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

const JACKETS = ["#e23b2f", "#f0c43a", "#1fb8a8", "#f7f9fc"];

function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const bestRef = useRef<HTMLSpanElement>(null);
  const lifeRef = useRef<HTMLSpanElement>(null);
  const multRef = useRef<HTMLSpanElement>(null);
  const biomeRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const floaterRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [jacket, setJacket] = useState(0);
  const [muted, setMuted] = useState(false);
  const state = useRef({ playing, paused, jacket, muted });
  state.current = { playing, paused, jacket, muted };
  const gameRef = useRef<{ beginRun: () => void; dispose: () => void } | null>(null);

  useEffect(() => {
    let disposed = false;
    (async () => {
      const { createGame } = await import("@/game/game");
      if (disposed || !canvasRef.current) return;
      gameRef.current = createGame({
        canvas: canvasRef.current,
        scoreEl: scoreRef.current!,
        bestEl: bestRef.current!,
        lifeEl: lifeRef.current!,
        multEl: multRef.current!,
        biomeEl: biomeRef.current!,
        hintEl: hintRef.current!,
        floaterLayer: floaterRef.current!,
        playing: () => state.current.playing,
        paused: () => state.current.paused,
        jacket: () => state.current.jacket,
        muted: () => state.current.muted,
        onPause: setPaused,
      }) as never;
    })();
    return () => {
      disposed = true;
      gameRef.current?.dispose();
      gameRef.current = null;
    };
  }, []);

  const start = () => {
    setPlaying(true);
    setPaused(false);
    gameRef.current?.beginRun();
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-sky-200 text-white select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div ref={floaterRef} className="pointer-events-none absolute inset-0" />

      <div className="pointer-events-none absolute left-4 top-4 font-mono text-sm drop-shadow">
        <div className="text-3xl font-bold">
          <span ref={scoreRef}>0</span> <span ref={multRef} className="text-yellow-300" />
        </div>
        <div>Рекорд: <span ref={bestRef}>0</span></div>
        <div>Всего: <span ref={lifeRef}>0</span></div>
      </div>
      <div ref={biomeRef} className="pointer-events-none absolute right-4 top-4 text-lg font-semibold drop-shadow" />
      <div ref={hintRef} className="pointer-events-none absolute bottom-6 left-0 right-0 text-center text-sm drop-shadow" />

      {playing && (
        <div className="absolute right-4 bottom-4 flex gap-2">
          <button className="rounded bg-black/50 px-3 py-2" onClick={() => setMuted((m) => !m)}>
            {muted ? "🔇" : "🔊"}
          </button>
          <button className="rounded bg-black/50 px-3 py-2" onClick={() => setPaused((p) => !p)}>
            {paused ? "▶" : "⏸"}
          </button>
        </div>
      )}

      {!playing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/40">
          <h1 className="text-5xl font-bold">Pudra</h1>
          <div className="flex gap-3">
            {JACKETS.map((c, i) => (
              <button
                key={c}
                aria-label={`Куртка ${i + 1}`}
                onClick={() => setJacket(i)}
                className={`h-10 w-10 rounded-full border-4 ${jacket === i ? "border-white" : "border-transparent"}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <button onClick={start} className="rounded-lg bg-white px-8 py-3 text-lg font-bold text-black">
            Играть
          </button>
          <p className="text-sm opacity-80">A D — дуга · пробел — прыжок · F — крыло</p>
        </div>
      )}
      {playing && paused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-3xl font-bold">Пауза</div>
      )}
    </main>
  );
}
