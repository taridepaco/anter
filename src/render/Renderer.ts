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
import type { Palette } from './palette';

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
    pal: Palette,
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
      .f('u_cursor', cursor?.x ?? 0, cursor?.y ?? 0, brushRadius)
      .f('u_dark', pal.dark ? 1 : 0)
      .f('u_outside', ...pal.outside)
      .f('u_soil', ...pal.soil)
      .f('u_homeTrail', ...pal.homeTrail)
      .f('u_foodTrail', ...pal.foodTrail)
      .f('u_alarmTrail', ...pal.alarmTrail)
      .f('u_danger', ...pal.danger)
      .f('u_food', ...pal.food)
      .f('u_wall', ...pal.wall)
      .f('u_nest', ...pal.nest)
      .f('u_cursorColor', ...pal.cursor);
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
      .f('u_antSize', p.antSize)
      .f('u_ant', ...pal.ant)
      .f('u_antHungry', ...pal.antHungry)
      .f('u_antGiveUp', ...pal.antGiveUp)
      .f('u_antScared', ...pal.antScared)
      .f('u_food', ...pal.food);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, ANT_CAPACITY);
  }
}
