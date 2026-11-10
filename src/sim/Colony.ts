/** Totales que la GPU reduce y devuelve, sumados sobre todas las hormigas. */
export interface GpuStats {
  delivered: number;
  died: number;
  born: number;
  eaten: number;
  alive: number;
  carrying: number;
  energySum: number;
  dangerSum: number;
}

export interface ColonyRules {
  birthCost: number;
  foodReserve: number;
  maxAnts: number;
  maxBirthsPerFrame: number;
}

/** Huecos [start, start + count) (módulo la capacidad) en los que pueden nacer hormigas este paso. */
export interface SpawnWindow {
  start: number;
  count: number;
}

export const NO_SPAWN: SpawnWindow = { start: 0, count: 0 };

interface Issued {
  births: number;
  food: number;
}

/**
 * Contabilidad de la colonia en CPU. La GPU acumula eventos (entregas, comidas, nacimientos,
 * muertes) en una "ventana"; cuando se capturan, la ventana se cierra y unos frames después
 * llegan sus totales. Los nacimientos se pagan por adelantado y se devuelve lo que sobró.
 */
export class Colony {
  nestFood: number;
  alive: number;
  carrying = 0;
  avgEnergy = 0;
  avgDanger = 0;
  totalBorn = 0;
  totalDied = 0;
  totalDelivered = 0;

  private cursor = 0;
  private open: Issued = { births: 0, food: 0 };
  private captured: Issued | null = null;

  constructor(
    private readonly capacity: number,
    initialFood: number,
    initialAlive: number,
  ) {
    this.nestFood = initialFood;
    this.alive = initialAlive;
    // Las hormigas iniciales ocupan los huecos [0, initialAlive): se empieza a buscar después.
    this.cursor = initialAlive % capacity;
  }

  planSpawns(rules: ColonyRules): SpawnWindow {
    const pending = this.open.births + (this.captured?.births ?? 0);
    const room = Math.min(rules.maxAnts, this.capacity) - this.alive - pending;
    const affordable = Math.floor(Math.max(0, this.nestFood - rules.foodReserve) / rules.birthCost);
    const count = Math.max(0, Math.min(affordable, room, rules.maxBirthsPerFrame));
    const window = { start: this.cursor, count };
    if (count > 0) {
      const cost = count * rules.birthCost;
      this.nestFood -= cost;
      this.open.births += count;
      this.open.food += cost;
      this.cursor = (this.cursor + count) % this.capacity;
    }
    return window;
  }

  /** La GPU acaba de capturar los eventos acumulados: empieza una ventana nueva. */
  closeWindow(): void {
    this.captured = this.open;
    this.open = { births: 0, food: 0 };
  }

  /** Aplica los totales de la última ventana cerrada. */
  applyStats(s: GpuStats): void {
    const issued = this.captured ?? { births: 0, food: 0 };
    this.captured = null;
    // Los huecos de la ventana que estaban ocupados no generaron hormiga: se devuelve su coste.
    const unborn = Math.max(0, issued.births - s.born);
    const refund = issued.births > 0 ? (issued.food * unborn) / issued.births : 0;
    this.nestFood = Math.max(0, this.nestFood + s.delivered - s.eaten + refund);

    this.alive = s.alive;
    this.carrying = s.carrying;
    this.avgEnergy = s.alive > 0 ? s.energySum / s.alive : 0;
    this.avgDanger = s.alive > 0 ? s.dangerSum / s.alive : 0;
    this.totalBorn += s.born;
    this.totalDied += s.died;
    this.totalDelivered += s.delivered;
  }
}
