/**
 * Textos en español e inglés. El idioma inicial lo fija el script en línea del <head>
 * (?lang=, luego la última elección, luego el navegador); la clave de almacenamiento es la
 * misma que en la portada, así que la elección vale para todo taridepaco.github.io.
 */
export type Lang = 'es' | 'en';

const STORAGE_KEY = 'taridepaco-lang';

const es = {
  kind: 'Simulador',
  'aria.sim': 'Simulación',
  'aria.panel': 'Parámetros',
  'theme.auto': 'Tema: auto',
  'theme.light': 'Tema: claro',
  'theme.dark': 'Tema: oscuro',

  // Estado
  'hud.rate': 'Ritmo',
  'hud.paused': 'Pausa',
  'hud.tick': 'Tick',
  'hud.ants': 'Hormigas',
  'hud.carrying': 'Con comida',
  'hud.nestFood': 'Comida nido',
  'hud.energy': 'Energía media',
  'hud.danger': 'Peligro medio',
  'hud.born': 'Nacidas',
  'hud.died': 'Muertas',
  'hud.delivered': 'Entregas',

  // Mandos
  'act.pause': 'Pausa',
  'act.resume': 'Reanudar',
  'act.step': 'Paso',
  'act.reset': 'Reiniciar',
  'act.fit': 'Encuadrar (F)',
  'act.clearPheromones': 'Borrar feromonas',
  'act.clearMap': 'Vaciar mapa',

  'tool.label': 'Herramienta',
  'tool.food': 'Comida',
  'tool.wall': 'Muro',
  'tool.danger': 'Peligro',
  'tool.erase': 'Borrar',
  'tool.nest': 'Nido',

  'help.h': 'Ratón y teclado',
  'help.paint': 'Pintar con la herramienta activa',
  'help.pan': 'Mover la cámara',
  'help.zoom': 'Zoom',
  'help.tools': 'Comida, muro, peligro, borrar, nido',
  'help.keys': 'Pausa, avanzar un paso, encuadrar',
  'key.left': 'Clic izq.',
  'key.right': 'Clic der.',
  'key.wheel': 'Rueda',
  'key.space': 'Espacio',

  'f.sim': 'Simulación',
  'f.brush': 'Pincel',
  'f.layers': 'Capas',
  'f.move': 'Movimiento y sentidos',
  'f.nav': 'Navegación',
  'f.pher': 'Feromonas',
  'f.colony': 'Colonia',
  'f.danger': 'Peligro',

  stepsPerFrame: 'Pasos por frame',
  initialAnts: 'Hormigas iniciales',
  seed: 'Semilla',

  brushRadius: 'Radio',
  foodPerCell: 'Comida por celda',
  dangerIntensity: 'Intensidad del peligro',

  showHome: 'Rastro al nido',
  showFood: 'Rastro a comida',
  showAlarm: 'Alarma',
  showAnts: 'Hormigas',
  gain: 'Intensidad',
  antSize: 'Tamaño de hormiga',

  antSpeed: 'Velocidad',
  sensorAngleDeg: 'Ángulo de antenas (°)',
  sensorDist: 'Distancia de antenas',
  turnRateDeg: 'Giro máx. (°/tick)',
  wanderDeg: 'Deambular (°)',
  sensitivity: 'Umbral de olfato',
  scoutFraction: 'Exploradoras',

  homing: 'Integración de caminos',
  returnWander: 'Deambular al volver (×)',
  memoryPull: 'Memoria de la fuente',
  trailPolarity: 'Polaridad del rastro',
  trailTrust: 'Confianza en el rastro',
  searchTicks: 'Búsqueda local (ticks)',

  emitTauHome: 'τ emisión nido',
  emitTauFood: 'τ emisión comida',
  depositHome: 'Depósito nido',
  depositFood: 'Depósito comida',
  depositAlarm: 'Depósito alarma',
  alarmThreshold: 'Umbral de alarma',
  evapHome: 'Evaporación nido',
  evapFood: 'Evaporación comida',
  evapAlarm: 'Evaporación alarma',
  diffHome: 'Difusión nido',
  diffFood: 'Difusión comida',
  diffAlarm: 'Difusión alarma',
  trailWear: 'Desgaste sin comida',
  pherCap: 'Máximo por celda',

  nestRadius: 'Radio del nido',
  energyTicks: 'Autonomía (ticks)',
  hungerThreshold: 'Umbral de hambre',
  mealCost: 'Comida por ración',
  birthCost: 'Coste de nacer',
  foodReserve: 'Reserva de comida',
  maxAnts: 'Población máx.',
  maxBirthsPerFrame: 'Nacimientos/frame',
  maxAgeTicks: 'Esperanza de vida',

  dangerDamage: 'Daño en zona',
  dangerGain: 'Susto en zona',
  alarmAvoid: 'Evitar alarma',
  alarmContagion: 'Contagio de alarma',
  contagionCap: 'Tope del contagio',
  dangerDecay: 'Calma',
  fleeBoost: 'Huida (velocidad)',

  'err.h': 'No se puede arrancar la simulación',
  'err.hint':
    'Hace falta un navegador de escritorio con WebGL2 y render a texturas float (Chrome, Edge o Firefox).',
};

const en: Record<keyof typeof es, string> = {
  kind: 'Simulator',
  'aria.sim': 'Simulation',
  'aria.panel': 'Parameters',
  'theme.auto': 'Theme: auto',
  'theme.light': 'Theme: light',
  'theme.dark': 'Theme: dark',

  'hud.rate': 'Rate',
  'hud.paused': 'Paused',
  'hud.tick': 'Tick',
  'hud.ants': 'Ants',
  'hud.carrying': 'Carrying',
  'hud.nestFood': 'Nest food',
  'hud.energy': 'Avg energy',
  'hud.danger': 'Avg danger',
  'hud.born': 'Born',
  'hud.died': 'Died',
  'hud.delivered': 'Deliveries',

  'act.pause': 'Pause',
  'act.resume': 'Resume',
  'act.step': 'Step',
  'act.reset': 'Reset',
  'act.fit': 'Fit view (F)',
  'act.clearPheromones': 'Clear pheromones',
  'act.clearMap': 'Clear map',

  'tool.label': 'Tool',
  'tool.food': 'Food',
  'tool.wall': 'Wall',
  'tool.danger': 'Danger',
  'tool.erase': 'Erase',
  'tool.nest': 'Nest',

  'help.h': 'Mouse and keyboard',
  'help.paint': 'Paint with the active tool',
  'help.pan': 'Move the camera',
  'help.zoom': 'Zoom',
  'help.tools': 'Food, wall, danger, erase, nest',
  'help.keys': 'Pause, step once, fit view',
  'key.left': 'Left click',
  'key.right': 'Right click',
  'key.wheel': 'Wheel',
  'key.space': 'Space',

  'f.sim': 'Simulation',
  'f.brush': 'Brush',
  'f.layers': 'Layers',
  'f.move': 'Movement and senses',
  'f.nav': 'Navigation',
  'f.pher': 'Pheromones',
  'f.colony': 'Colony',
  'f.danger': 'Danger',

  stepsPerFrame: 'Steps per frame',
  initialAnts: 'Initial ants',
  seed: 'Seed',

  brushRadius: 'Radius',
  foodPerCell: 'Food per cell',
  dangerIntensity: 'Danger intensity',

  showHome: 'Trail to nest',
  showFood: 'Trail to food',
  showAlarm: 'Alarm',
  showAnts: 'Ants',
  gain: 'Intensity',
  antSize: 'Ant size',

  antSpeed: 'Speed',
  sensorAngleDeg: 'Antenna angle (°)',
  sensorDist: 'Antenna reach',
  turnRateDeg: 'Max turn (°/tick)',
  wanderDeg: 'Wander (°)',
  sensitivity: 'Smell threshold',
  scoutFraction: 'Scouts',

  homing: 'Path integration',
  returnWander: 'Wander on return (×)',
  memoryPull: 'Source memory',
  trailPolarity: 'Trail polarity',
  trailTrust: 'Trail trust',
  searchTicks: 'Local search (ticks)',

  emitTauHome: 'Emission τ, nest',
  emitTauFood: 'Emission τ, food',
  depositHome: 'Deposit, nest',
  depositFood: 'Deposit, food',
  depositAlarm: 'Deposit, alarm',
  alarmThreshold: 'Alarm threshold',
  evapHome: 'Evaporation, nest',
  evapFood: 'Evaporation, food',
  evapAlarm: 'Evaporation, alarm',
  diffHome: 'Diffusion, nest',
  diffFood: 'Diffusion, food',
  diffAlarm: 'Diffusion, alarm',
  trailWear: 'Wear without food',
  pherCap: 'Max per cell',

  nestRadius: 'Nest radius',
  energyTicks: 'Stamina (ticks)',
  hungerThreshold: 'Hunger threshold',
  mealCost: 'Food per meal',
  birthCost: 'Birth cost',
  foodReserve: 'Food reserve',
  maxAnts: 'Max population',
  maxBirthsPerFrame: 'Births/frame',
  maxAgeTicks: 'Life expectancy',

  dangerDamage: 'Damage in zone',
  dangerGain: 'Fright in zone',
  alarmAvoid: 'Avoid alarm',
  alarmContagion: 'Alarm contagion',
  contagionCap: 'Contagion cap',
  dangerDecay: 'Calm down',
  fleeBoost: 'Flee (speed)',

  'err.h': 'The simulation cannot start',
  'err.hint': 'It needs a desktop browser with WebGL2 and float render targets (Chrome, Edge or Firefox).',
};

export type TextKey = keyof typeof es;

const TEXT: Record<Lang, Record<TextKey, string>> = { es, en };
const listeners: Array<() => void> = [];
let lang: Lang = document.documentElement.lang === 'en' ? 'en' : 'es';

export const getLang = (): Lang => lang;
export const t = (key: TextKey): string => TEXT[lang][key];
export const numberLocale = (): string => (lang === 'es' ? 'es-ES' : 'en-US');

/** Avisa cuando cambia el idioma (para los textos que no van por data-i18n). */
export function onLang(fn: () => void): void {
  listeners.push(fn);
}

/** Repinta todo lo marcado con data-i18n (texto) o data-i18n-aria (aria-label). */
export function applyI18n(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as TextKey);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria as TextKey));
  });
  document.querySelectorAll<HTMLElement>('.lang-switch button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  });
  listeners.forEach((fn) => fn());
}

export function initI18n(): void {
  document.querySelectorAll<HTMLElement>('.lang-switch button').forEach((b) => {
    b.addEventListener('click', () => {
      lang = b.dataset.lang === 'en' ? 'en' : 'es';
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        /* sin almacenamiento */
      }
      applyI18n();
    });
  });
  applyI18n();
}
