import { numberLocale, onLang, t, type TextKey } from '../i18n';
import type { SimParams } from '../params';
import type { Colony } from '../sim/Colony';

const CELLS = [
  'rate',
  'tick',
  'ants',
  'carrying',
  'nestFood',
  'energy',
  'danger',
  'born',
  'died',
  'delivered',
] as const;
type Cell = (typeof CELLS)[number];

/** Barra de estado bajo la pantalla; se refresca unas cuantas veces por segundo. */
export class Hud {
  private lastUpdate = 0;
  private readonly values = {} as Record<Cell, HTMLElement>;
  private readonly rateLabel: HTMLElement;

  constructor(el: HTMLElement) {
    for (const cell of CELLS) {
      const box = document.createElement('div');
      box.className = 'stat';
      const label = document.createElement('span');
      label.className = 'util muted';
      label.dataset.i18n = `hud.${cell}` satisfies TextKey;
      const value = document.createElement('span');
      value.className = 'value';
      value.textContent = '–';
      box.append(label, value);
      el.append(box);
      this.values[cell] = value;
    }
    this.rateLabel = el.querySelector('.stat .util')!;
    // Al cambiar de idioma, fuerza un refresco aunque la simulación esté en pausa.
    onLang(() => (this.lastUpdate = 0));
  }

  update(now: number, fps: number, ticksPerSecond: number, tick: number, colony: Colony, p: SimParams): void {
    if (now - this.lastUpdate < 250) return;
    this.lastUpdate = now;
    const locale = numberLocale();
    const n = (v: number) => Math.round(v).toLocaleString(locale);
    const d = (v: number, digits: number) =>
      v.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    const v = this.values;
    this.rateLabel.textContent = t(p.paused ? 'hud.paused' : 'hud.rate');
    v.rate.textContent = `${fps.toFixed(0)} fps · ${n(p.paused ? 0 : ticksPerSecond)} t/s`;
    v.tick.textContent = n(tick);
    v.ants.textContent = n(colony.alive);
    v.carrying.textContent = n(colony.carrying);
    v.nestFood.textContent = d(colony.nestFood, 1);
    v.energy.textContent = `${d(colony.avgEnergy * 100, 0)} %`;
    v.danger.textContent = `${d(colony.avgDanger * 100, 1)} %`;
    v.born.textContent = n(colony.totalBorn);
    v.died.textContent = n(colony.totalDied);
    v.delivered.textContent = n(colony.totalDelivered);
  }
}
