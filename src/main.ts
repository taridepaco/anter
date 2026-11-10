import './style.css';
import { createContext } from './gl/context';
import { ANT_CAPACITY, ANT_TEX, defaultParams, WORLD_H, WORLD_W, type Tool } from './params';
import { Camera } from './render/Camera';
import { Renderer } from './render/Renderer';
import { AntSystem } from './sim/AntSystem';
import { Colony, NO_SPAWN } from './sim/Colony';
import { PheromoneField } from './sim/PheromoneField';
import { Stats } from './sim/Stats';
import { World, type Stroke } from './sim/World';
import { createGui } from './ui/gui';
import { Hud } from './ui/hud';
import { Input } from './ui/input';
import { clamp } from './util';

/** Cada cuántos frames se reducen y leen las estadísticas de la GPU. */
const STATS_EVERY = 6;

function showError(message: string): void {
  const el = document.getElementById('error')!;
  el.textContent = message;
  el.hidden = false;
}

function boot(): void {
  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const gl = createContext(canvas);
  // Todos los draws generan sus vértices con gl_VertexID/gl_InstanceID: basta un VAO vacío.
  gl.bindVertexArray(gl.createVertexArray());

  const params = defaultParams();
  const world = new World(gl);
  const pheromones = new PheromoneField(gl);
  const ants = new AntSystem(gl);
  const stats = new Stats(gl);
  const renderer = new Renderer(gl);
  const camera = new Camera();
  const hud = new Hud(document.getElementById('hud')!);

  let colony = new Colony(ANT_CAPACITY, params.initialNestFood, 0);
  let tick = 0;
  let resetEvents = false;
  let stepRequested = false;
  // Las lecturas de estadísticas que estaban en vuelo al reiniciar se descartan.
  let generation = 0;
  let capturedGeneration = -1;

  function reset(): void {
    generation++;
    world.loadDefault(params);
    pheromones.clear();
    ants.seed(params.initialAnts, world.nest, params, params.seed);
    colony = new Colony(ANT_CAPACITY, params.initialNestFood, Math.min(params.initialAnts, ANT_CAPACITY));
    tick = 0;
    resetEvents = false;
  }

  const actions = {
    step: () => (stepRequested = true),
    reset,
    clearPheromones: () => pheromones.clear(),
    clearMap: () => world.clear(),
    fit: () => camera.fit(),
  };

  const input = new Input(canvas, camera, params, {
    onNest: (pos) => {
      world.nest = { x: clamp(pos.x, 0, WORLD_W), y: clamp(pos.y, 0, WORLD_H) };
    },
    onTogglePause: () => (params.paused = !params.paused),
    onStep: actions.step,
    onFit: actions.fit,
  });
  createGui(params, actions);

  let fitted = false;
  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (width !== canvas.width || height !== canvas.height) {
      canvas.width = width;
      canvas.height = height;
    }
    camera.setCanvas(canvas.width, canvas.height);
    // El primer encuadre espera a que el canvas tenga su tamaño CSS real.
    if (!fitted && canvas.clientWidth > 0) {
      camera.fit();
      fitted = true;
    }
  }

  resize();
  reset();

  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 60;
  let ticksPerSecond = 0;

  function frame(now: number): void {
    const dt = Math.max(1e-3, (now - lastTime) / 1000);
    lastTime = now;
    fps += (1 / dt - fps) * 0.05;
    frameCount++;
    resize();

    pollStats();
    let steps = params.paused ? 0 : params.stepsPerFrame;
    if (stepRequested) {
      steps = Math.max(steps, 1);
      stepRequested = false;
    }
    simulate(steps, input.takeStroke());
    ticksPerSecond += (steps / dt - ticksPerSecond) * 0.05;
    if (steps > 0 && frameCount % STATS_EVERY === 0) captureStats();

    renderer.draw(world, pheromones, ants, camera, params, input.hover);
    hud.update(now, fps, ticksPerSecond, tick, colony, params);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /** Avanza `steps` ticks. El trazo de pincel y los nacimientos se aplican en el primero. */
  function simulate(steps: number, stroke: Stroke | null): void {
    for (let i = 0; i < steps; i++) {
      ants.update(
        world.texture,
        pheromones.texture,
        {
          tick,
          seed: params.seed,
          nest: world.nest,
          nestHasFood: colony.nestFood > 0,
          spawn: i === 0 ? colony.planSpawns(params) : NO_SPAWN,
          resetEvents,
        },
        params,
      );
      resetEvents = false;
      pheromones.clearDeposit();
      ants.deposit(pheromones.deposit, world.nest, params);
      pheromones.update(world.texture, params);
      world.update(pheromones.consumedTexture, i === 0 ? stroke : null, params);
      tick++;
    }
    if (steps === 0 && stroke) {
      // En pausa también se puede pintar: un pase de mundo sin consumo.
      pheromones.clearDeposit();
      world.update(pheromones.consumedTexture, stroke, params);
    }
  }

  function pollStats(): void {
    const gpuStats = stats.poll();
    if (gpuStats && capturedGeneration === generation) colony.applyStats(gpuStats);
  }

  function captureStats(): void {
    if (!stats.capture(ants)) return;
    colony.closeWindow();
    capturedGeneration = generation;
    resetEvents = true;
  }

  if (import.meta.env.DEV) {
    // Gancho para depurar desde la consola del navegador; solo existe con `npm run dev`.
    const yieldToBrowser = () =>
      new Promise<void>((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => resolve();
        channel.port2.postMessage(null);
      });
    Object.assign(window, {
      anter: {
        params,
        camera,
        actions,
        get colony() {
          return colony;
        },
        get tick() {
          return tick;
        },
        /** Milisegundos por tick de simulación, sin render (espera a que la GPU termine). */
        benchmark(steps = 200): number {
          const pixel = new Float32Array(4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, world.field.read.fbo);
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, pixel);
          const t0 = performance.now();
          simulate(steps, null);
          gl.bindFramebuffer(gl.FRAMEBUFFER, world.field.read.fbo);
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, pixel);
          return (performance.now() - t0) / steps;
        },
        /** Copia del estado de todas las hormigas: s0..s3 como en AntSystem (4 floats por hueco). */
        snapshot(): Float32Array[] {
          return [0, 1, 2, 3].map((attachment) => {
            const data = new Float32Array(ANT_CAPACITY * 4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, ants.state.read.fbo);
            gl.readBuffer(gl.COLOR_ATTACHMENT0 + attachment);
            gl.readPixels(0, 0, ANT_TEX, ANT_TEX, gl.RGBA, gl.FLOAT, data);
            return data;
          });
        },
        /** Pinta un disco con una herramienta, sin pasar por el ratón (para montar escenarios). */
        paint(tool: Tool, x: number, y: number, radius = params.brushRadius): void {
          const saved = params.brushRadius;
          params.brushRadius = radius;
          pheromones.clearDeposit();
          world.update(pheromones.consumedTexture, { from: { x, y }, to: { x, y }, tool }, params);
          params.brushRadius = saved;
        },
        /** Valores de la celda (x, y): mundo [muro, comida, peligro] y feromonas [home, food, alarm]. */
        probe(x: number, y: number) {
          const w = new Float32Array(4);
          const f = new Float32Array(4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, world.field.read.fbo);
          gl.readPixels(x, y, 1, 1, gl.RGBA, gl.FLOAT, w);
          gl.bindFramebuffer(gl.FRAMEBUFFER, pheromones.field.read.fbo);
          gl.readPixels(x, y, 1, 1, gl.RGBA, gl.FLOAT, f);
          return { world: [...w.slice(0, 3)], pheromones: [...f.slice(0, 3)] };
        },
        /**
         * Cuenta las hormigas vivas dentro del rectángulo, por modo (índice = modo), más una última
         * casilla con cuántas de las que buscan recuerdan una fuente.
         */
        antsIn(x0: number, y0: number, x1: number, y1: number): number[] {
          const readState = (attachment: number) => {
            const data = new Float32Array(ANT_CAPACITY * 4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, ants.state.read.fbo);
            gl.readBuffer(gl.COLOR_ATTACHMENT0 + attachment);
            gl.readPixels(0, 0, ANT_TEX, ANT_TEX, gl.RGBA, gl.FLOAT, data);
            return data;
          };
          const s0 = readState(0);
          const s2 = readState(2);
          const counts = [0, 0, 0, 0, 0];
          for (let i = 0; i < ANT_CAPACITY; i++) {
            const [x, y, , mode] = s0.subarray(i * 4, i * 4 + 4);
            if (mode < 0 || x < x0 || x >= x1 || y < y0 || y >= y1) continue;
            counts[Math.round(mode)]++;
            if (Math.round(mode) === 0 && Math.hypot(s2[i * 4 + 2], s2[i * 4 + 3]) > 1) counts[4]++;
          }
          return counts;
        },
        /** Avanza `ticks` sin esperar a requestAnimationFrame, con estadísticas al día. */
        async run(ticks: number): Promise<number> {
          for (let done = 0; done < ticks; done += 20) {
            pollStats();
            simulate(Math.min(20, ticks - done), null);
            captureStats();
            await yieldToBrowser();
          }
          pollStats();
          return tick;
        },
        /** Espera a que `colony` refleje el estado de este mismo tick (captura y lectura completas). */
        async flush(): Promise<void> {
          const settle = async () => {
            for (let i = 0; i < 200 && stats.busy; i++) {
              await new Promise((r) => setTimeout(r, 10));
              pollStats();
            }
          };
          await settle();
          captureStats();
          await settle();
        },
      },
    });
  }
}

try {
  boot();
} catch (err) {
  console.error(err);
  showError(err instanceof Error ? err.message : String(err));
}
