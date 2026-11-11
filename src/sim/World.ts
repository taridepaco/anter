import quadVert from '../shaders/quad.vert?raw';
import worldFrag from '../shaders/world_update.frag?raw';
import { Program } from '../gl/program';
import { bindTarget, clearTarget, drawFullscreen, PingPong, uploadTexture } from '../gl/targets';
import { defaultNest, fromClassic, SHADER_DEFINES, type SimParams, type Tool, type WorldSize } from '../params';
import type { Vec2 } from '../util';

/** Trazo de pincel en coordenadas de mundo (de la posición anterior del ratón a la actual). */
export interface Stroke {
  from: Vec2;
  to: Vec2;
  tool: Tool;
}

const BRUSH_MODE: Record<Tool, number> = { food: 1, wall: 2, danger: 3, erase: 4, nest: 0 };

const WALL = 0;
const FOOD = 1;
const DANGER = 2;

/** Rejilla del mundo (RGBA32F): R = muro, G = comida, B = peligro, A = libre. El nido va aparte. */
export class World {
  field: PingPong;
  nest: Vec2;
  private readonly program: Program;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    size: WorldSize,
  ) {
    this.field = new PingPong(gl, size.w, size.h, ['rgba32f']);
    this.nest = defaultNest(size);
    this.program = new Program(gl, 'world_update', quadVert, worldFrag, SHADER_DEFINES);
  }

  get width(): number {
    return this.field.read.width;
  }

  get height(): number {
    return this.field.read.height;
  }

  get size(): WorldSize {
    return { w: this.width, h: this.height };
  }

  get texture(): WebGLTexture {
    return this.field.read.textures[0];
  }

  /** Cambia el tamaño de la rejilla. Queda vacía: después hace falta loadDefault(). */
  resize(size: WorldSize): void {
    if (size.w === this.width && size.h === this.height) return;
    this.field.dispose(this.gl);
    this.field = new PingPong(this.gl, size.w, size.h, ['rgba32f']);
  }

  loadDefault(p: SimParams): void {
    this.nest = defaultNest(this.size);
    uploadTexture(this.gl, this.texture, this.width, this.height, buildDefaultMap(p, this.size));
  }

  clear(): void {
    clearTarget(this.gl, this.field.read);
  }

  /** Resta la comida recogida y aplica el trazo de pincel, si lo hay. */
  update(consumed: WebGLTexture, stroke: Stroke | null, p: SimParams): void {
    const gl = this.gl;
    bindTarget(gl, this.field.write);
    const prog = this.program
      .use()
      .tex('u_world', 0, this.texture)
      .tex('u_consume', 1, consumed)
      .i('u_brushMode', stroke ? BRUSH_MODE[stroke.tool] : 0)
      .f('u_brushRadius', p.brushRadius)
      .f('u_foodPerCell', p.foodPerCell)
      .f('u_dangerIntensity', p.dangerIntensity);
    if (stroke) prog.f('u_brushFrom', stroke.from.x, stroke.from.y).f('u_brushTo', stroke.to.x, stroke.to.y);
    drawFullscreen(gl);
    this.field.swap();
  }
}

/**
 * Escenario inicial: tres montones de comida, un muro entre el nido y la comida, y una zona
 * peligrosa. Está dibujado para el mundo clásico (1024×640); en otro tamaño cada pieza va al mismo
 * sitio en proporción (fromClassic) y conserva su tamaño en celdas.
 */
export function buildDefaultMap(p: SimParams, size: WorldSize): Float32Array {
  const { w: width, h: height } = size;
  const data = new Float32Array(width * height * 4);
  const set = (x: number, y: number, channel: number, value: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    data[(y * width + x) * 4 + channel] = value;
  };
  const disc = (cx: number, cy: number, r: number, channel: number, value: number) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 < r * r) set(x, y, channel, value);
      }
    }
  };
  const wall = (from: Vec2, to: Vec2, halfWidth: number) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      disc(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, halfWidth, WALL, 1);
    }
  };
  const at = (x: number, y: number) => fromClassic(x, y, size);
  const piece = (x: number, y: number, r: number, channel: number, value: number) => {
    const c = at(x, y);
    disc(c.x, c.y, r, channel, value);
  };

  piece(780, 170, 24, FOOD, p.foodPerCell);
  piece(860, 470, 20, FOOD, p.foodPerCell);
  piece(140, 560, 14, FOOD, p.foodPerCell);
  wall(at(560, 120), at(560, 400), 5);
  piece(660, 520, 26, DANGER, p.dangerIntensity);
  return data;
}
