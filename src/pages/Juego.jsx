import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const GAME_W = 360;
const GAME_H = 640;
const PLAYER_W = 72;
const PLAYER_H = 20;
const ITEM_SIZE = 28;
const PLAYER_SPEED = 10;
const START_LIVES = 3;
const SPAWN_MS = 700;
const TICK_MS = 16;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function randomId() {
  return Math.random().toString(36).slice(2, 9);
}

function createItem(level = 1) {
  const good = Math.random() > 0.28;
  const speedBase = 2.7 + Math.min(level * 0.22, 3.6);
  return {
    id: randomId(),
    x: Math.random() * (GAME_W - ITEM_SIZE),
    y: -ITEM_SIZE,
    size: ITEM_SIZE,
    speed: speedBase + Math.random() * 1.8,
    type: good ? 'star' : 'bomb',
    rotation: Math.random() * 360,
  };
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2 shadow-lg backdrop-blur-sm ring-1 ring-white/10">
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function Heart({ filled }) {
  return (
    <span
      className={`text-xl transition ${filled ? 'opacity-100' : 'opacity-30'}`}
    >
      ❤️
    </span>
  );
}

export default function VerticalCatchGame() {
  const [playerX, setPlayerX] = useState((GAME_W - PLAYER_W) / 2);
  const [items, setItems] = useState([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const boardRef = useRef(null);
  const pressedRef = useRef({ left: false, right: false });
  const spawnTimer = useRef(null);
  const loopTimer = useRef(null);
  const pointerOffset = useRef(0);

  useEffect(() => {
    const saved = window.localStorage.getItem('catch-best-score');
    if (saved) setBestScore(Number(saved));
  }, []);

  useEffect(() => {
    window.localStorage.setItem('catch-best-score', String(bestScore));
  }, [bestScore]);

  const resetGame = useCallback(() => {
    setPlayerX((GAME_W - PLAYER_W) / 2);
    setItems([]);
    setScore(0);
    setLives(START_LIVES);
    setGameOver(false);
    setLevel(1);
    setCountdown(3);
  }, []);

  const stopTimers = useCallback(() => {
    if (spawnTimer.current) clearInterval(spawnTimer.current);
    if (loopTimer.current) clearInterval(loopTimer.current);
    spawnTimer.current = null;
    loopTimer.current = null;
  }, []);

  const stopGame = useCallback(() => {
    stopTimers();
    setRunning(false);
  }, [stopTimers]);

  const startGame = useCallback(() => {
    stopTimers();
    resetGame();
    setRunning(false);
  }, [resetGame, stopTimers]);

  useEffect(() => {
    if (countdown <= 0 || gameOver) return;
    const t = setTimeout(() => {
      if (countdown === 1) {
        setRunning(true);
        setCountdown(0);
      } else {
        setCountdown((c) => c - 1);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [countdown, gameOver]);

  useEffect(() => {
    if (!running) return;

    spawnTimer.current = setInterval(
      () => {
        setItems((prev) => [...prev, createItem(level)]);
      },
      Math.max(320, SPAWN_MS - level * 28)
    );

    loopTimer.current = setInterval(() => {
      setPlayerX((prev) => {
        let next = prev;
        if (pressedRef.current.left) next -= PLAYER_SPEED;
        if (pressedRef.current.right) next += PLAYER_SPEED;
        return clamp(next, 0, GAME_W - PLAYER_W);
      });

      setItems((prev) => {
        const next = [];
        let pointsGained = 0;
        let livesLost = 0;

        for (const item of prev) {
          const moved = {
            ...item,
            y: item.y + item.speed,
            rotation: item.rotation + (item.type === 'bomb' ? 5 : 2),
          };

          const hitPlayer =
            moved.y + moved.size >= GAME_H - 64 &&
            moved.y <= GAME_H - 32 &&
            moved.x + moved.size >= playerX &&
            moved.x <= playerX + PLAYER_W;

          if (hitPlayer) {
            if (moved.type === 'star') pointsGained += 1;
            else livesLost += 1;
            continue;
          }

          if (moved.y > GAME_H + moved.size) {
            if (moved.type === 'star') livesLost += 1;
            continue;
          }

          next.push(moved);
        }

        if (pointsGained > 0) {
          setScore((s) => {
            const total = s + pointsGained;
            if (total > bestScore) setBestScore(total);
            const nextLevel = 1 + Math.floor(total / 8);
            setLevel(nextLevel);
            return total;
          });
        }

        if (livesLost > 0) {
          setLives((current) => {
            const updated = current - livesLost;
            if (updated <= 0) {
              setGameOver(true);
              setRunning(false);
              stopTimers();
              return 0;
            }
            return updated;
          });
        }

        return next;
      });
    }, TICK_MS);

    return () => stopTimers();
  }, [running, level, playerX, bestScore, stopTimers]);

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a')
        pressedRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd')
        pressedRef.current.right = true;
      if (e.key === ' ' && !running && !countdown) startGame();
    };

    const up = (e) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a')
        pressedRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd')
        pressedRef.current.right = false;
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [running, countdown, startGame]);

  const movePlayerToClientX = useCallback((clientX) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const scaleX = rect.width / GAME_W;
    const internalX =
      (clientX - rect.left) / scaleX - PLAYER_W / 2 + pointerOffset.current;
    setPlayerX(clamp(internalX, 0, GAME_W - PLAYER_W));
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      pointerOffset.current = 0;
      movePlayerToClientX(e.clientX);
    },
    [movePlayerToClientX]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (e.buttons === 0 && e.pointerType !== 'touch') return;
      movePlayerToClientX(e.clientX);
    },
    [movePlayerToClientX]
  );

  const stars = useMemo(() => Array.from({ length: score % 12 }), [score]);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-6 px-4 py-5 md:flex-row md:items-stretch md:gap-8 md:px-6 md:py-8">
        <section className="order-2 w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl md:order-1 md:max-w-sm">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">
              Mini juego vertical
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Star Catch
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Atrapa estrellas, evita bombas y sobrevive el mayor tiempo
              posible. Está pensado para jugarse cómodo en teléfono, pero
              también se siente bien en computadora.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Puntos" value={score} />
            <StatCard label="Récord" value={bestScore} />
            <StatCard label="Nivel" value={level} />
            <div className="rounded-2xl bg-white/10 px-3 py-2 shadow-lg backdrop-blur-sm ring-1 ring-white/10">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">
                Vidas
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                {Array.from({ length: START_LIVES }).map((_, i) => (
                  <Heart key={i} filled={i < lives} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-3xl bg-gradient-to-br from-cyan-400/10 to-fuchsia-500/10 p-4 ring-1 ring-white/10">
            <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-white/75">
              Controles
            </h2>
            <div className="mt-3 space-y-3 text-sm text-white/80">
              <p>
                <span className="font-bold text-white">Teléfono:</span> desliza
                sobre el área de juego para mover la base.
              </p>
              <p>
                <span className="font-bold text-white">Computadora:</span> usa
                A/D o ←/→.
              </p>
              <p>
                <span className="font-bold text-white">Objetivo:</span> cada
                estrella suma, cada bomba o estrella perdida te quita vida.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row md:flex-col">
            <button
              onClick={startGame}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:scale-[1.02] active:scale-[0.99]"
            >
              {gameOver
                ? 'Jugar otra vez'
                : running || countdown
                  ? 'Reiniciar partida'
                  : 'Empezar'}
            </button>
            <button
              onClick={stopGame}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10"
            >
              Pausar
            </button>
          </div>

          <div className="mt-4 rounded-3xl border border-dashed border-white/10 p-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-white/70">
              Notas de diseño
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/65">
              El tablero usa proporción vertical fija para que se vea tipo app
              en iPhone y Android. En pantallas grandes se centra y deja un
              panel lateral para que no quede estirado ni vacío.
            </p>
          </div>
        </section>

        <section className="order-1 flex w-full max-w-md items-center justify-center md:order-2 md:flex-1">
          <div className="relative w-full max-w-[430px]">
            <div className="pointer-events-none absolute inset-x-8 -top-6 h-24 rounded-full bg-cyan-400/20 blur-3xl" />

            <div
              ref={boardRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              className="relative mx-auto aspect-[9/16] w-full overflow-hidden rounded-[2.4rem] border border-white/10 bg-gradient-to-b from-sky-900 via-slate-900 to-slate-950 shadow-[0_20px_80px_rgba(0,0,0,0.55)] select-none touch-none"
              style={{ maxWidth: GAME_W + 40 }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.22),transparent_35%),radial-gradient(circle_at_bottom,rgba(217,70,239,0.14),transparent_30%)]" />

              {Array.from({ length: 18 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute text-white/70"
                  style={{
                    left: `${(i * 19 + 7) % 94}%`,
                    top: `${(i * 11 + 5) % 64}%`,
                    fontSize: `${8 + (i % 4) * 4}px`,
                    opacity: 0.22 + (i % 3) * 0.08,
                  }}
                >
                  ✦
                </span>
              ))}

              <div className="absolute left-4 right-4 top-4 flex items-center justify-between rounded-2xl bg-slate-950/30 px-3 py-2 backdrop-blur-md ring-1 ring-white/10">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/55">
                    Puntos
                  </p>
                  <p className="text-lg font-black">{score}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/55">
                    Nivel
                  </p>
                  <p className="text-lg font-black">{level}</p>
                </div>
              </div>

              {items.map((item) => (
                <div
                  key={item.id}
                  className="absolute grid place-items-center"
                  style={{
                    width: item.size,
                    height: item.size,
                    transform: `translate(${item.x}px, ${item.y}px) rotate(${item.rotation}deg)`,
                    willChange: 'transform',
                    fontSize: item.type === 'star' ? 22 : 20,
                    filter:
                      item.type === 'star'
                        ? 'drop-shadow(0 0 12px rgba(250,204,21,0.45))'
                        : 'drop-shadow(0 0 10px rgba(248,113,113,0.35))',
                  }}
                >
                  {item.type === 'star' ? '⭐' : '💣'}
                </div>
              ))}

              <div
                className="absolute bottom-7 rounded-full bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-500 shadow-[0_8px_30px_rgba(34,211,238,0.45)]"
                style={{
                  width: PLAYER_W,
                  height: PLAYER_H,
                  left: playerX,
                  borderRadius: 999,
                }}
              >
                <div className="absolute inset-x-2 -top-1 h-2 rounded-full bg-white/60 blur-[1px]" />
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />

              {!running && !gameOver && !countdown && (
                <div className="absolute inset-0 grid place-items-center bg-slate-950/35 backdrop-blur-[2px]">
                  <div className="mx-6 rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 text-center shadow-2xl">
                    <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">
                      Listo para jugar
                    </p>
                    <h2 className="mt-2 text-3xl font-black">
                      Atrapa las estrellas
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-white/70">
                      Toca empezar y mueve la base para sumar puntos. Cada error
                      te cuesta una vida.
                    </p>
                  </div>
                </div>
              )}

              {countdown > 0 && (
                <div className="absolute inset-0 grid place-items-center bg-slate-950/30 backdrop-blur-[2px]">
                  <div className="text-center">
                    <p className="text-sm uppercase tracking-[0.35em] text-white/60">
                      Comienza en
                    </p>
                    <p className="text-8xl font-black text-cyan-300 drop-shadow-[0_0_18px_rgba(103,232,249,0.35)]">
                      {countdown}
                    </p>
                  </div>
                </div>
              )}

              {gameOver && (
                <div className="absolute inset-0 grid place-items-center bg-slate-950/45 backdrop-blur-[3px]">
                  <div className="mx-6 rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 text-center shadow-2xl">
                    <p className="text-xs uppercase tracking-[0.28em] text-rose-300/80">
                      Fin de la partida
                    </p>
                    <h2 className="mt-2 text-4xl font-black">
                      {score >= bestScore ? 'Nuevo récord' : 'Buen intento'}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-white/75">
                      Terminaste con{' '}
                      <span className="font-black text-white">{score}</span>{' '}
                      puntos.
                    </p>
                    <button
                      onClick={startGame}
                      className="mt-5 inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:scale-[1.02]"
                    >
                      Volver a jugar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/55">
              {stars.map((_, i) => (
                <span key={i}>✦</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
