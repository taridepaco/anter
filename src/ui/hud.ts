import type { SimParams } from '../params';
import type { Colony } from '../sim/Colony';

const TOOL_NAMES = { food: 'comida', wall: 'muro', danger: 'peligro', erase: 'borrar', nest: 'nido' } as const;

/** Texto de estado arriba a la izquierda; se refresca unas cuantas veces por segundo. */
export class Hud {
  private lastUpdate = 0;

  constructor(private readonly el: HTMLElement) {}

  update(now: number, fps: number, ticksPerSecond: number, tick: number, colony: Colony, p: SimParams): void {
    if (now - this.lastUpdate < 250) return;
    this.lastUpdate = now;
    const n = (v: number) => Math.round(v).toLocaleString('es-ES');
    this.el.textContent = [
      `${p.paused ? 'PAUSA' : `${fps.toFixed(0)} fps · ${n(ticksPerSecond)} ticks/s`} · tick ${n(tick)}`,
      `hormigas      ${n(colony.alive)}  (${n(colony.carrying)} con comida)`,
      `comida nido   ${colony.nestFood.toFixed(1)}`,
      `energía media ${(colony.avgEnergy * 100).toFixed(0)}%   peligro medio ${(colony.avgDanger * 100).toFixed(1)}%`,
      `nacidas ${n(colony.totalBorn)} · muertas ${n(colony.totalDied)} · entregas ${n(colony.totalDelivered)}`,
      `pincel: ${TOOL_NAMES[p.tool]}`,
    ].join('\n');
  }
}
