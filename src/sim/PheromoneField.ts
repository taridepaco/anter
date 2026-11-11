import quadVert from '../shaders/quad.vert?raw';
import pheromoneFrag from '../shaders/pheromone_update.frag?raw';
import { Program } from '../gl/program';
import {
  bindTarget,
  clearTarget,
  createTarget,
  deleteTarget,
  drawFullscreen,
  PingPong,
  type Target,
} from '../gl/targets';
import { SHADER_DEFINES, type SimParams, type WorldSize } from '../params';

/**
 * Feromonas (RGBA32F): R = home (rastro al nido), G = food (rastro a la comida),
 * B = alarm, A = libre para una cuarta hormona.
 */
export class PheromoneField {
  field: PingPong;
  /** Lo que depositan las hormigas en un paso: [0] feromonas, [1] comida recogida y tráfico sin comida. RGBA16F. */
  deposit: Target;
  private readonly program: Program;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    size: WorldSize,
  ) {
    this.field = new PingPong(gl, size.w, size.h, ['rgba32f']);
    this.deposit = createTarget(gl, size.w, size.h, ['rgba16f', 'rgba16f']);
    this.program = new Program(gl, 'pheromone_update', quadVert, pheromoneFrag, SHADER_DEFINES);
  }

  /** Cambia el tamaño de las rejillas (del mismo tamaño que el mundo). Quedan vacías. */
  resize(size: WorldSize): void {
    if (size.w === this.field.read.width && size.h === this.field.read.height) return;
    this.field.dispose(this.gl);
    deleteTarget(this.gl, this.deposit);
    this.field = new PingPong(this.gl, size.w, size.h, ['rgba32f']);
    this.deposit = createTarget(this.gl, size.w, size.h, ['rgba16f', 'rgba16f']);
  }

  get texture(): WebGLTexture {
    return this.field.read.textures[0];
  }

  get consumedTexture(): WebGLTexture {
    return this.deposit.textures[1];
  }

  clear(): void {
    clearTarget(this.gl, this.field.read);
  }

  clearDeposit(): void {
    clearTarget(this.gl, this.deposit);
  }

  update(world: WebGLTexture, p: SimParams): void {
    const gl = this.gl;
    bindTarget(gl, this.field.write);
    this.program
      .use()
      .tex('u_pher', 0, this.texture)
      .tex('u_deposit', 1, this.deposit.textures[0])
      .tex('u_traffic', 2, this.deposit.textures[1])
      .tex('u_world', 3, world)
      .f('u_diffusion', p.diffHome, p.diffFood, p.diffAlarm, 0)
      .f('u_evaporation', p.evapHome, p.evapFood, p.evapAlarm, 1)
      .f('u_cap', p.pherCap)
      .f('u_trailWear', p.trailWear);
    drawFullscreen(gl);
    this.field.swap();
  }
}
