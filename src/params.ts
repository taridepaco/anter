import { clamp, type Vec2 } from './util';

/** Lado de las texturas de estado: cada texel es una hormiga. */
export const ANT_TEX = 256;
export const ANT_CAPACITY = ANT_TEX * ANT_TEX;

/** Tamaño del mundo en celdas (= resolución de las rejillas de mundo y feromonas). */
export interface WorldSize {
  w: number;
  h: number;
}

/**
 * El mundo de siempre, apaisado. Por defecto el mundo toma la forma de la pantalla (ver
 * screenWorld en main.ts); este tamaño sigue en la lista y el escenario inicial está dibujado
 * para él.
 */
export const CLASSIC_WORLD: WorldSize = { w: 1024, h: 640 };

/** Constantes que se inyectan como #define en todos los shaders. */
export const SHADER_DEFINES = { ANT_TEX, ANT_CAPACITY };

export type Tool = 'food' | 'wall' | 'danger' | 'erase' | 'nest';

/**
 * Todo lo que se puede tocar en vivo desde el panel. Los tiempos van en ticks
 * (pasos de simulación) y las distancias en celdas.
 */
export interface SimParams {
  // Simulación
  paused: boolean;
  stepsPerFrame: number;
  seed: number;
  initialAnts: number;

  // Pincel
  tool: Tool;
  brushRadius: number;
  foodPerCell: number;
  dangerIntensity: number;

  // Capas visibles
  showHome: boolean;
  showFood: boolean;
  showAlarm: boolean;
  showAnts: boolean;
  homeGain: number;
  foodGain: number;
  alarmGain: number;
  antSize: number;

  // Movimiento y sentidos
  antSpeed: number;
  sensorAngleDeg: number;
  sensorDist: number;
  turnRateDeg: number;
  wanderDeg: number;
  sensitivity: number;
  scoutFraction: number;

  // Navegación
  homing: number;
  returnWander: number;
  memoryPull: number;
  trailPolarity: number;
  trailTrust: number;
  searchTicks: number;

  // Feromonas
  emitTauHome: number;
  emitTauFood: number;
  depositHome: number;
  depositFood: number;
  depositAlarm: number;
  alarmThreshold: number;
  evapHome: number;
  evapFood: number;
  evapAlarm: number;
  diffHome: number;
  diffFood: number;
  diffAlarm: number;
  trailWear: number;
  pherCap: number;

  // Colonia
  nestRadius: number;
  initialNestFood: number;
  energyTicks: number;
  hungerThreshold: number;
  mealCost: number;
  birthCost: number;
  foodReserve: number;
  maxAnts: number;
  maxBirthsPerFrame: number;
  maxAgeTicks: number;

  // Peligro
  dangerDamage: number;
  dangerGain: number;
  alarmAvoid: number;
  alarmContagion: number;
  contagionCap: number;
  dangerDecay: number;
  fleeBoost: number;
}

export function defaultParams(): SimParams {
  return {
    paused: false,
    stepsPerFrame: 2,
    seed: 1,
    initialAnts: 12000,

    tool: 'food',
    brushRadius: 12,
    foodPerCell: 5,
    dangerIntensity: 1,

    showHome: true,
    showFood: true,
    showAlarm: true,
    showAnts: true,
    homeGain: 0.15,
    foodGain: 0.25,
    alarmGain: 1,
    antSize: 2.2,

    antSpeed: 0.7,
    sensorAngleDeg: 35,
    sensorDist: 6,
    turnRateDeg: 20,
    wanderDeg: 15,
    sensitivity: 0.3,
    scoutFraction: 0.1,

    homing: 0.25,
    returnWander: 0.3,
    memoryPull: 0.15,
    trailPolarity: 0.5,
    trailTrust: 0.7,
    searchTicks: 200,

    emitTauHome: 800,
    emitTauFood: 3000,
    depositHome: 0.5,
    depositFood: 1,
    depositAlarm: 2,
    alarmThreshold: 0.25,
    evapHome: 0.003,
    evapFood: 0.0007,
    evapAlarm: 0.03,
    // Rastros algo anchos: en las curvas se acumula más feromona por el lado de dentro, las hormigas
    // la siguen y la ruta se va acortando sola (p. ej. al rodear un muro acaba tensándose en la punta).
    diffHome: 0.25,
    diffFood: 0.25,
    diffAlarm: 0.4,
    trailWear: 0.01,
    pherCap: 500,

    nestRadius: 14,
    initialNestFood: 200,
    energyTicks: 9000,
    hungerThreshold: 0.35,
    mealCost: 0.25,
    birthCost: 8,
    foodReserve: 30,
    maxAnts: ANT_CAPACITY,
    maxBirthsPerFrame: 64,
    maxAgeTicks: 60000,

    dangerDamage: 0.003,
    dangerGain: 0.05,
    alarmAvoid: 3,
    alarmContagion: 0.02,
    contagionCap: 0.2,
    dangerDecay: 0.01,
    fleeBoost: 0.8,
  };
}

/**
 * Lleva un punto del escenario clásico (1024×640) a un mundo de otro tamaño, en proporción. Si el
 * mundo es más alto que ancho (un móvil en vertical), el escenario se gira para que siga
 * extendiéndose a lo largo del lado largo.
 */
export function fromClassic(x: number, y: number, size: WorldSize): Vec2 {
  const u = x / CLASSIC_WORLD.w;
  const v = y / CLASSIC_WORLD.h;
  return size.h > size.w ? { x: v * size.w, y: u * size.h } : { x: u * size.w, y: v * size.h };
}

export const defaultNest = (size: WorldSize): Vec2 => fromClassic(CLASSIC_WORLD.w * 0.28, CLASSIC_WORLD.h * 0.5, size);

/**
 * Hormigas iniciales para un mundo: las de por defecto en el mundo clásico, con la misma densidad
 * (hormigas por celda) en un mundo más pequeño o más grande. Redondeado a centenas.
 */
export function defaultAntsFor(size: WorldSize): number {
  const ratio = (size.w * size.h) / (CLASSIC_WORLD.w * CLASSIC_WORLD.h);
  return clamp(Math.round((defaultParams().initialAnts * ratio) / 100) * 100, 100, ANT_CAPACITY);
}
