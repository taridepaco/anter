import quadVert from '../shaders/quad.vert?raw';
import compositeFrag from '../shaders/composite.frag?raw';
import antsVert from '../shaders/ants_draw.vert?raw';
import antsFrag from '../shaders/ants_draw.frag?raw';
import { Program } from '../gl/program';
import { drawFullscreen } from '../gl/targets';
import { ANT_CAPACITY, SHADER_DEFINES, WORLD_H, WORLD_W, type SimParams } from '../params';
import type { AntSystem } from '../sim/AntSystem';
import type { PheromoneField } from '../sim/PheromoneField';
import type { World } from '../sim/World';
import type { Vec2 } from '../util';
import type { Camera } from './Camera';

export class Renderer {
  private readonly composite: Program;
  private readonly ants: Program;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.composite = new Program(gl, 'composite', quadVert, compositeFrag, SHADER_DEFINES);
    this.ants = new Program(gl, 'ants_draw', antsVert, antsFrag, SHADER_DEFINES);
  }

  draw(
    world: World,
    pheromones: PheromoneField,
    ants: AntSystem,
    camera: Camera,
    p: SimParams,
    cursor: Vec2 | null,
  ): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, camera.canvasWidth, camera.canvasHeight);

    const brushRadius = cursor && p.tool !== 'nest' ? p.brushRadius : 0;
    this.composite
      .use()
      .tex('u_world', 0, world.texture)
      .tex('u_pher', 1, pheromones.texture)
      .f('u_worldSize', WORLD_W, WORLD_H)
      .f('u_canvas', camera.canvasWidth, camera.canvasHeight)
      .f('u_center', camera.center.x, camera.center.y)
      .f('u_zoom', camera.zoom)
      .f(
        'u_gain',
        p.showHome ? p.homeGain : 0,
        p.showFood ? p.foodGain : 0,
        p.showAlarm ? p.alarmGain : 0,
      )
      .f('u_nestPos', world.nest.x, world.nest.y)
      .f('u_nestRadius', p.nestRadius)
      .f('u_foodPerCell', p.foodPerCell)
      .f('u_cursor', cursor?.x ?? 0, cursor?.y ?? 0, brushRadius);
    drawFullscreen(gl);

    if (!p.showAnts) return;
    const state = ants.state.read.textures;
    this.ants
      .use()
      .tex('u_state0', 0, state[0])
      .tex('u_state1', 1, state[1])
      .f('u_canvas', camera.canvasWidth, camera.canvasHeight)
      .f('u_center', camera.center.x, camera.center.y)
      .f('u_zoom', camera.zoom)
      .f('u_antSize', p.antSize);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, ANT_CAPACITY);
  }
}
