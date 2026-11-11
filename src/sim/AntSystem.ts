import quadVert from '../shaders/quad.vert?raw';
import updateFrag from '../shaders/ant_update.frag?raw';
import depositVert from '../shaders/ant_deposit.vert?raw';
import depositFrag from '../shaders/ant_deposit.frag?raw';
import { Program } from '../gl/program';
import { bindTarget, drawFullscreen, PingPong, uploadTexture, type Target } from '../gl/targets';
import { ANT_CAPACITY, ANT_TEX, SHADER_DEFINES, type SimParams, type WorldSize } from '../params';
import { degToRad, mulberry32, type Vec2 } from '../util';
import type { SpawnWindow } from './Colony';

export interface AntStep {
  world: WorldSize;
  tick: number;
  seed: number;
  nest: Vec2;
  nestHasFood: boolean;
  spawn: SpawnWindow;
  /** Pone a cero los eventos acumulados (la CPU acaba de leerlos). */
  resetEvents: boolean;
}

/**
 * Estado de todas las hormigas en cinco texturas RGBA32F de 256x256 (un texel por hormiga):
 *   [0] pos.x, pos.y, rumbo, modo (-1 hueco libre, 0 busca, 1 lleva comida, 2 vuelve con hambre,
 *       3 vuelve sin nada tras no encontrar comida)
 *   [1] energía, peligro, t desde la última fuente, edad
 *   [2] vector al nido estimado (xy), comida recordada como vector desde el nido (zw; 0 = nada)
 *   [3] lado por el que bordea un obstáculo (0 = va libre, ±1), ticks bordeando,
 *       ticks de búsqueda local que le quedan, libre
 *   [4] eventos acumulados: entregada, muerte, nacimiento, comido
 * El factor de velocidad y los rasgos fijos (exploradora, lado preferido al bordear, esperanza
 * de vida) salen de un hash del hueco.
 */
export class AntSystem {
  readonly state: PingPong;
  private readonly updateProgram: Program;
  private readonly depositProgram: Program;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.state = new PingPong(gl, ANT_TEX, ANT_TEX, ['rgba32f', 'rgba32f', 'rgba32f', 'rgba32f', 'rgba32f']);
    this.updateProgram = new Program(gl, 'ant_update', quadVert, updateFrag, SHADER_DEFINES);
    this.depositProgram = new Program(gl, 'ant_deposit', depositVert, depositFrag, SHADER_DEFINES);
  }

  /** Coloca `count` hormigas dentro del nido; el resto de huecos quedan libres. */
  seed(count: number, nest: Vec2, p: SimParams, seed: number): void {
    const rand = mulberry32(seed);
    const s0 = new Float32Array(ANT_CAPACITY * 4);
    const s1 = new Float32Array(ANT_CAPACITY * 4);
    const s2 = new Float32Array(ANT_CAPACITY * 4);
    for (let i = 0; i < ANT_CAPACITY; i++) s0[i * 4 + 3] = -1; // todos los huecos libres
    const n = Math.min(count, ANT_CAPACITY);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * p.nestRadius * 0.8;
      const x = nest.x + Math.cos(a) * r;
      const y = nest.y + Math.sin(a) * r;
      s0.set([x, y, a, 0], i * 4);
      // Edades repartidas para que no mueran todas a la vez.
      s1.set([0.6 + 0.4 * rand(), 0, 0, rand() * p.maxAgeTicks * 0.5], i * 4);
      s2.set([nest.x - x, nest.y - y, 0, 0], i * 4);
    }
    const textures = this.state.read.textures;
    uploadTexture(this.gl, textures[0], ANT_TEX, ANT_TEX, s0);
    uploadTexture(this.gl, textures[1], ANT_TEX, ANT_TEX, s1);
    uploadTexture(this.gl, textures[2], ANT_TEX, ANT_TEX, s2);
    const zeros = new Float32Array(ANT_CAPACITY * 4);
    uploadTexture(this.gl, textures[3], ANT_TEX, ANT_TEX, zeros);
    uploadTexture(this.gl, textures[4], ANT_TEX, ANT_TEX, zeros);
  }

  get eventsTexture(): WebGLTexture {
    return this.state.read.textures[4];
  }

  update(world: WebGLTexture, pheromones: WebGLTexture, step: AntStep, p: SimParams): void {
    const gl = this.gl;
    const read = this.state.read.textures;
    bindTarget(gl, this.state.write);
    this.updateProgram
      .use()
      .tex('u_state0', 0, read[0])
      .tex('u_state1', 1, read[1])
      .tex('u_state2', 2, read[2])
      .tex('u_state3', 3, read[3])
      .tex('u_events', 4, read[4])
      .tex('u_world', 5, world)
      .tex('u_pher', 6, pheromones)
      .f('u_worldSize', step.world.w, step.world.h)
      .u('u_tick', step.tick)
      .u('u_seed', step.seed)
      .f('u_nestPos', step.nest.x, step.nest.y)
      .f('u_nestRadius', p.nestRadius)
      .f('u_nestHasFood', step.nestHasFood ? 1 : 0)
      .u('u_spawnStart', step.spawn.start)
      .u('u_spawnCount', step.spawn.count)
      .f('u_resetEvents', step.resetEvents ? 1 : 0)
      .f('u_speed', p.antSpeed)
      .f('u_sensorAngle', degToRad(p.sensorAngleDeg))
      .f('u_sensorDist', p.sensorDist)
      .f('u_turnRate', degToRad(p.turnRateDeg))
      .f('u_wander', degToRad(p.wanderDeg))
      .f('u_sensitivity', p.sensitivity)
      .f('u_scoutFraction', p.scoutFraction)
      .f('u_homing', p.homing)
      .f('u_returnWander', p.returnWander)
      .f('u_memoryPull', p.memoryPull)
      .f('u_trailPolarity', p.trailPolarity)
      .f('u_trailTrust', p.trailTrust)
      .f('u_searchTicks', p.searchTicks)
      .f('u_metabolism', 1 / p.energyTicks)
      .f('u_hungerThreshold', p.hungerThreshold)
      .f('u_mealCost', p.mealCost)
      .f('u_maxAge', p.maxAgeTicks)
      .f('u_dangerDamage', p.dangerDamage)
      .f('u_dangerGain', p.dangerGain)
      .f('u_alarmAvoid', p.alarmAvoid)
      .f('u_alarmContagion', p.alarmContagion)
      .f('u_contagionCap', p.contagionCap)
      .f('u_dangerDecay', p.dangerDecay)
      .f('u_fleeBoost', p.fleeBoost);
    drawFullscreen(gl);
    this.state.swap();
  }

  /** Dibuja lo que emite cada hormiga en `target` (del tamaño del mundo) con blending aditivo. */
  deposit(target: Target, nest: Vec2, p: SimParams): void {
    const gl = this.gl;
    const read = this.state.read.textures;
    bindTarget(gl, target);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    this.depositProgram
      .use()
      .tex('u_state0', 0, read[0])
      .tex('u_state1', 1, read[1])
      .f('u_worldSize', target.width, target.height)
      .f('u_nestPos', nest.x, nest.y)
      .f('u_nestRadius', p.nestRadius)
      .f('u_emitTauHome', p.emitTauHome)
      .f('u_emitTauFood', p.emitTauFood)
      .f('u_depositHome', p.depositHome)
      .f('u_depositFood', p.depositFood)
      .f('u_depositAlarm', p.depositAlarm)
      .f('u_alarmThreshold', p.alarmThreshold);
    gl.drawArrays(gl.POINTS, 0, ANT_CAPACITY);
    gl.disable(gl.BLEND);
  }
}
