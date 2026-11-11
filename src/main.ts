import './style.css';
import { createContext } from './gl/context';
import { applyI18n, initI18n, onLang, t } from './i18n';
import {
  ANT_CAPACITY,
  ANT_TEX,
  CLASSIC_WORLD,
  defaultAntsFor,
  defaultParams,
  type SimParams,
  type Tool,
  type WorldSize,
} from './params';
import { Camera } from './render/Camera';
import { exposePalette, paletteFor } from './render/palette';
import { Renderer } from './render/Renderer';
import { AntSystem } from './sim/AntSystem';
import { Colony, NO_SPAWN } from './sim/Colony';
import { PheromoneField } from './sim/PheromoneField';
import { Stats } from './sim/Stats';
import { World, type Stroke } from './sim/World';
import { createPanel, type Panel, type PanelActions, type SizeValue } from './ui/panel';
import { Hud } from './ui/hud';
import { Input } from './ui/input';
import { clamp } from './util';

/** Cada cuántos frames se reducen y leen las estadísticas de la GPU. */
const STATS_EVERY = 6;

function showError(message: string): void {
  const el = document.getElementById('error')!;
  const title = document.createElement('h2');
  title.dataset.i18n = 'err.h';
  const detail = document.createElement('p');
  detail.textContent = message;
  const hint = document.createElement('p');
  hint.className = 'muted';
  hint.dataset.i18n = 'err.hint';
  el.replaceChildren(title, detail, hint);
  el.hidden = false;
  applyI18n();
}

/**
 * Botones de tema (auto -> claro -> oscuro) y paleta del canvas, que no hereda los tokens CSS.
 * Hay dos botones, en la cabecera y, en el móvil, en el panel (Aspecto): cambian juntos.
 */
function initTheme(): { palette: () => ReturnType<typeof paletteFor> } {
  const root = document.documentElement;
  const theme = window.Theme;
  const buttons = document.querySelectorAll<HTMLButtonElement>('.theme-btn');
  let palette = paletteFor(false);
  const sync = () => {
    palette = paletteFor(!!theme && theme.isDark());
    exposePalette(palette, root);
    if (theme) buttons.forEach((b) => (b.textContent = t(`theme.${theme.mode()}`)));
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(root).getPropertyValue('--bg').trim();
  };
  if (theme) {
    buttons.forEach((b) => b.addEventListener('click', () => theme.cycle()));
    theme.onChange(sync);
  } else buttons.forEach((b) => (b.hidden = true));
  onLang(sync);
  sync();
  return { palette: () => palette };
}

/**
 * Mundo con la forma del canvas (el tamaño por defecto, "Pantalla"), hecho de celdas de un
 * número entero c de píxeles reales, para que Camera.fit() lo dibuje exactamente a c píxeles por
 * celda, alineado con los píxeles: cada celda es un cuadrado exacto y no hay muaré. c son los
 * píxeles reales del lado largo del canvas entre un objetivo de celdas, redondeado y como mínimo
 * 2: el objetivo es la potencia de dos más pequeña que cubre el lado largo en px CSS, entre 256 y
 * 1024. Un ordenador sale con c = 2, un móvil con 2 o 3.
 */
function screenWorld(canvas: HTMLCanvasElement, maxSize: number): WorldSize {
  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (!cw || !ch) return { ...CLASSIC_WORLD };
  // el mismo tamaño en píxeles reales que resizeCanvas() da al canvas
  const dw = Math.max(1, Math.round(cw * dpr));
  const dh = Math.max(1, Math.round(ch * dpr));
  let target = 256;
  while (target < Math.max(cw, ch) && target < 1024) target *= 2;
  const long = Math.max(dw, dh);
  const c = Math.max(2, Math.round(long / target), Math.ceil(long / maxSize));
  return { w: Math.floor(dw / c), h: Math.floor(dh / c) };
}

function boot(
  params: SimParams,
  actions: PanelActions,
  panel: Panel,
  theme: { palette: () => ReturnType<typeof paletteFor> },
): void {
  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const gl = createContext(canvas);
  // Todos los draws generan sus vértices con gl_VertexID/gl_InstanceID: basta un VAO vacío.
  gl.bindVertexArray(gl.createVertexArray());

  const world = new World(gl, CLASSIC_WORLD);
  const pheromones = new PheromoneField(gl, CLASSIC_WORLD);
  const ants = new AntSystem(gl);
  const stats = new Stats(gl);
  const renderer = new Renderer(gl);
  const camera = new Camera();
  const hud = new Hud(document.getElementById('stats')!);
  const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

  let colony = new Colony(ANT_CAPACITY, params.initialNestFood, 0);
  let tick = 0;
  let resetEvents = false;
  let stepRequested = false;
  // Las lecturas de estadísticas que estaban en vuelo al reiniciar se descartan.
  let generation = 0;
  let capturedGeneration = -1;
  // El mundo se crea cuando han llegado las fuentes (ver el final); hasta entonces los mandos esperan.
  let ready = false;
  let screenSize: WorldSize = { ...CLASSIC_WORLD };

  function reset(): void {
    generation++;
    world.loadDefault(params);
    pheromones.clear();
    ants.seed(params.initialAnts, world.nest, params, params.seed);
    colony = new Colony(ANT_CAPACITY, params.initialNestFood, Math.min(params.initialAnts, ANT_CAPACITY));
    tick = 0;
    resetEvents = false;
  }

  /** Lienzo a píxeles reales: tamaño CSS × devicePixelRatio. Se comprueba en cada frame. */
  function resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (width !== canvas.width || height !== canvas.height) {
      canvas.width = width;
      canvas.height = height;
    }
    if (width !== camera.canvasWidth || height !== camera.canvasHeight) {
      camera.setCanvas(width, height);
      if (camera.autoFit) camera.fit();
    }
  }

  function fit(): void {
    resizeCanvas();
    camera.fit();
  }

  /** Mundo nuevo de la lista de tamaños, con el escenario inicial y las hormigas a su medida. */
  function newWorld(value: SizeValue): void {
    const size = value === 'screen' ? screenSize : CLASSIC_WORLD;
    world.resize(size);
    pheromones.resize(size);
    camera.setWorld(size);
    params.initialAnts = defaultAntsFor(size);
    panel.sync();
    reset();
    fit();
  }

  Object.assign(actions, {
    play: () => (params.paused = !params.paused),
    step: () => ready && (stepRequested = true),
    reset: () => ready && reset(),
    clearPheromones: () => ready && pheromones.clear(),
    clearMap: () => ready && world.clear(),
    fit: () => ready && fit(),
    setSize: (value: SizeValue) => {
      if (!ready) return;
      // "Pantalla" se vuelve a medir: el canvas puede haber cambiado desde que se abrió la página
      if (value === 'screen') {
        screenSize = screenWorld(canvas, maxSize);
        panel.setScreenSize(screenSize);
      }
      newWorld(value);
    },
  } satisfies PanelActions);

  const input = new Input(canvas, camera, params, {
    onNest: (pos) => {
      if (ready) world.nest = { x: clamp(pos.x, 0, world.width), y: clamp(pos.y, 0, world.height) };
    },
    onTogglePause: actions.play,
    onStep: actions.step,
    onFit: actions.fit,
  });

  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 60;
  let ticksPerSecond = 0;

  function frame(now: number): void {
    const dt = Math.max(1e-3, (now - lastTime) / 1000);
    lastTime = now;
    fps += (1 / dt - fps) * 0.05;
    frameCount++;
    resizeCanvas();

    pollStats();
    let steps = params.paused ? 0 : params.stepsPerFrame;
    if (stepRequested) {
      steps = Math.max(steps, 1);
      stepRequested = false;
    }
    simulate(steps, input.takeStroke());
    ticksPerSecond += (steps / dt - ticksPerSecond) * 0.05;
    if (steps > 0 && frameCount % STATS_EVERY === 0) captureStats();

    renderer.draw(world, pheromones, ants, camera, params, input.hover, theme.palette());
    panel.update();
    hud.update(now, fps, ticksPerSecond, tick, colony, params);
    requestAnimationFrame(frame);
  }

  // Hasta que exista el mundo, el canvas se pinta del color de alrededor del mundo (no de negro).
  resizeCanvas();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clearColor(...theme.palette().outside, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // El mundo "Pantalla" toma el tamaño del canvas, y el canvas solo tiene su tamaño final cuando
  // han llegado las fuentes web: cambian el ancho del panel plegado y la altura de la cabecera.
  // Se esperan, como mucho 1,5 s.
  const fontsReady = document.fonts?.ready
    ? Promise.race([document.fonts.ready, new Promise((done) => setTimeout(done, 1500))])
    : Promise.resolve();
  void fontsReady.then(() => {
    resizeCanvas();
    screenSize = screenWorld(canvas, maxSize);
    panel.setScreenSize(screenSize);
    ready = true;
    newWorld('screen'); // y arranca en marcha: params.paused empieza en false
    lastTime = performance.now();
    requestAnimationFrame(frame);
  });

  /** Avanza `steps` ticks. El trazo de pincel y los nacimientos se aplican en el primero. */
  function simulate(steps: number, stroke: Stroke | null): void {
    for (let i = 0; i < steps; i++) {
      ants.update(
        world.texture,
        pheromones.texture,
        {
          world: world.size,
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
        world,
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

// El panel va primero (lleva la segunda copia del botón de tema); sus acciones las pone boot().
const params = defaultParams();
const noop = () => {};
const actions: PanelActions = {
  play: noop,
  step: noop,
  reset: noop,
  fit: noop,
  clearPheromones: noop,
  clearMap: noop,
  setSize: noop,
};
const panel = createPanel(document.getElementById('controls')!, params, actions);
const theme = initTheme();
initI18n();
try {
  boot(params, actions, panel, theme);
} catch (err) {
  console.error(err);
  showError(err instanceof Error ? err.message : String(err));
}
