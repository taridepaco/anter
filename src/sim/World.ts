import quadVert from '../shaders/quad.vert?raw';
import worldFrag from '../shaders/world_update.frag?raw';
import { Program } from '../gl/program';
import { bindTarget, clearTarget, drawFullscreen, PingPong, uploadTexture } from '../gl/targets';
import { defaultNest, SHADER_DEFINES, WORLD_H, WORLD_W, type SimParams, type Tool } from '../params';
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
  readonly field: PingPong;
  nest: Vec2 = defaultNest();
  private readonly program: Program;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.field = new PingPong(gl, WORLD_W, WORLD_H, ['rgba32f']);
    this.program = new Program(gl, 'world_update', quadVert, worldFrag, SHADER_DEFINES);
  }

  get texture(): WebGLTexture {
    return this.field.read.textures[0];
  }

  loadDefault(p: SimParams): void {
    this.nest = defaultNest();
    uploadTexture(this.gl, this.texture, WORLD_W, WORLD_H, buildDefaultMap(p));
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

/** Escenario inicial: tres montones de comida, un muro entre el nido y la comida, y una zona peligrosa. */
export function buildDefaultMap(p: SimParams): Float32Array {
  const data = new Float32Array(WORLD_W * WORLD_H * 4);
  const set = (x: number, y: number, channel: number, value: number) => {
    if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return;
    data[(y * WORLD_W + x) * 4 + channel] = value;
  };
  const disc = (cx: number, cy: number, r: number, channel: number, value: number) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 < r * r) set(x, y, channel, value);
      }
    }
  };
  const wall = (x0: number, y0: number, x1: number, y1: number, halfWidth: number) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, halfWidth, WALL, 1);
    }
  };

  disc(780, 170, 24, FOOD, p.foodPerCell);
  disc(860, 470, 20, FOOD, p.foodPerCell);
  disc(140, 560, 14, FOOD, p.foodPerCell);
  wall(560, 120, 560, 400, 5);
  disc(660, 520, 26, DANGER, p.dangerIntensity);
  return data;
}
