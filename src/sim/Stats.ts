import quadVert from '../shaders/quad.vert?raw';
import reduceFirstFrag from '../shaders/reduce_first.frag?raw';
import reduceFrag from '../shaders/reduce.frag?raw';
import packFrag from '../shaders/reduce_pack.frag?raw';
import { Program } from '../gl/program';
import { AsyncReader } from '../gl/readback';
import { bindTarget, createTarget, drawFullscreen, type Target } from '../gl/targets';
import { SHADER_DEFINES } from '../params';
import type { AntSystem } from './AntSystem';
import type { GpuStats } from './Colony';

/** Suma los eventos y la población de todas las hormigas en la GPU (256 → 64 → 16 → 4 → 1) y la lee sin bloquear. */
export class Stats {
  private readonly levels: Target[];
  private readonly packed: Target;
  private readonly firstProgram: Program;
  private readonly reduceProgram: Program;
  private readonly packProgram: Program;
  private readonly reader: AsyncReader;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.levels = [64, 16, 4, 1].map((size) => createTarget(gl, size, size, ['rgba32f', 'rgba32f']));
    this.packed = createTarget(gl, 2, 1, ['rgba32f']);
    this.firstProgram = new Program(gl, 'reduce_first', quadVert, reduceFirstFrag, SHADER_DEFINES);
    this.reduceProgram = new Program(gl, 'reduce', quadVert, reduceFrag, SHADER_DEFINES);
    this.packProgram = new Program(gl, 'reduce_pack', quadVert, packFrag, SHADER_DEFINES);
    this.reader = new AsyncReader(gl, 8);
  }

  get busy(): boolean {
    return this.reader.busy;
  }

  /** Reduce el estado actual y encola su lectura. Devuelve false si aún hay una lectura en curso. */
  capture(ants: AntSystem): boolean {
    if (this.reader.busy) return false;
    const gl = this.gl;
    const state = ants.state.read.textures;
    bindTarget(gl, this.levels[0]);
    this.firstProgram
      .use()
      .tex('u_events', 0, ants.eventsTexture)
      .tex('u_state0', 1, state[0])
      .tex('u_state1', 2, state[1]);
    drawFullscreen(gl);
    for (let i = 1; i < this.levels.length; i++) {
      const src = this.levels[i - 1];
      bindTarget(gl, this.levels[i]);
      this.reduceProgram.use().tex('u_a', 0, src.textures[0]).tex('u_b', 1, src.textures[1]);
      drawFullscreen(gl);
    }
    const last = this.levels[this.levels.length - 1];
    bindTarget(gl, this.packed);
    this.packProgram.use().tex('u_a', 0, last.textures[0]).tex('u_b', 1, last.textures[1]);
    drawFullscreen(gl);
    return this.reader.request(this.packed, 2, 1);
  }

  poll(): GpuStats | null {
    const d = this.reader.poll();
    if (!d) return null;
    return {
      delivered: d[0],
      died: d[1],
      born: d[2],
      eaten: d[3],
      alive: d[4],
      carrying: d[5],
      energySum: d[6],
      dangerSum: d[7],
    };
  }
}
