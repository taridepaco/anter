import type { Vec2 } from './util';

/** Lado de las texturas de estado: cada texel es una hormiga. */
export const ANT_TEX = 256;
export const ANT_CAPACITY = ANT_TEX * ANT_TEX;

/** Tamaño del mundo en celdas (= resolución de las rejillas de mundo y feromonas). */
export const WORLD_W = 1024;
export const WORLD_H = 640;

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

export const defaultNest = (): Vec2 => ({ x: WORLD_W * 0.28, y: WORLD_H * 0.5 });
