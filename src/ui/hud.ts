import { numberLocale, onLang, t } from '../i18n';
import type { SimParams } from '../params';
import type { Colony } from '../sim/Colony';

/**
 * Pantallas pequeñas: el móvil y las pantallas bajas (el móvil en horizontal). Ahí la línea de
 * estado es una sola fila corta, con lo principal; el mismo corte está en style.css.
 */
const COMPACT = '(max-width: 720px), (max-height: 500px)';

/**
 * Línea de estado bajo la pantalla, dentro del marco; se refresca unas cuantas veces por segundo.
 * En escritorio son siempre dos filas (ritmo y población; comida y estado de la colonia), así su
 * altura no cambia y el canvas tampoco. En el móvil, una fila con el tick, las hormigas y el ritmo.
 * Cada fila que no cabe termina en puntos suspensivos; todos los datos están también en el title.
 */
export class Hud {
  private lastUpdate = 0;
  private readonly main: HTMLElement;
  private readonly more: HTMLElement;
  private readonly compact = window.matchMedia(COMPACT);

  constructor(private readonly el: HTMLElement) {
    this.main = document.createElement('span');
    this.main.className = 'st-line';
    this.more = document.createElement('span');
    this.more.className = 'st-line st-more';
    this.main.textContent = this.more.textContent = '\u00a0';
    el.replaceChildren(this.main, this.more);
    // Al cambiar de idioma o de tamaño de pantalla, refresca aunque la simulación esté en pausa.
    const refresh = () => (this.lastUpdate = 0);
    onLang(refresh);
    this.compact.addEventListener('change', refresh);
  }

  update(now: number, fps: number, ticksPerSecond: number, tick: number, colony: Colony, p: SimParams): void {
    if (this.lastUpdate && now - this.lastUpdate < 250) return;
    this.lastUpdate = now;
    const locale = numberLocale();
    const n = (v: number) => Math.round(v).toLocaleString(locale);
    const d = (v: number, digits: number) =>
      v.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

    const head = [`tick ${n(tick)}`, p.paused ? t('st.paused') : `${n(ticksPerSecond)} t/s`];
    const ants = `${n(colony.alive)} ${t('st.ants')}`;
    const population = [`${fps.toFixed(0)} fps`, ants, `${n(colony.totalBorn)} ${t('st.born')}`, `${n(colony.totalDied)} ${t('st.died')}`];
    const food = [
      `${n(colony.carrying)} ${t('st.carrying')}`,
      `${n(colony.totalDelivered)} ${t('st.delivered')}`,
      `${t('st.nestFood')} ${d(colony.nestFood, 1)}`,
      `${t('st.energy')} ${d(colony.avgEnergy * 100, 0)} %`,
      `${t('st.danger')} ${d(colony.avgDanger * 100, 1)} %`,
    ];
    if (this.compact.matches) {
      // si no cabe, que se corte el ritmo antes que las hormigas
      this.main.textContent = [head[0], ants, head[1]].join(' · ');
    } else {
      this.main.textContent = [...head, ...population].join(' · ');
      this.more.textContent = food.join(' · ');
    }
    this.el.title = [...head, ...population, ...food].join(' · ');
  }
}
