/**
 * Textos en español e inglés. El idioma inicial lo fija el script en línea del <head>
 * (?lang=, luego la última elección, luego el navegador); la clave de almacenamiento es la
 * misma que en la portada, así que la elección vale para todo taridepaco.github.io.
 */
export type Lang = 'es' | 'en';

const STORAGE_KEY = 'taridepaco-lang';

const es = {
  kind: 'Simulador',
  panel: 'Controles',
  pitch: 'Una colonia de hormigas en la GPU de tu navegador: los caminos a la comida salen solos de tres feromonas.',
  deck: 'Mandos principales',
  'aria.sim': 'Mundo de las hormigas',
  'theme.auto': 'Tema: auto',
  'theme.light': 'Tema: claro',
  'theme.dark': 'Tema: oscuro',

  // Línea de estado
  'st.paused': 'en pausa',
  'st.ants': 'hormigas',
  'st.carrying': 'con comida',
  'st.nestFood': 'comida nido',
  'st.energy': 'energía media',
  'st.danger': 'peligro medio',
  'st.born': 'nacidas',
  'st.died': 'muertas',
  'st.delivered': 'entregas',

  // Mandos
  'act.play': 'Play',
  'act.pause': 'Pausa',
  'act.step': 'Paso',
  'act.reset': 'Reiniciar',
  'act.fit': 'Encajar',
  'act.clearPheromones': 'Borrar feromonas',
  'act.clearMap': 'Vaciar mapa',
  't.play': 'Reproducir / pausa (espacio)',
  't.step': 'Avanzar un paso (.)',
  't.reset': 'Volver al escenario inicial',
  't.fit': 'Ver el mundo entero (F)',

  size: 'Tamaño del mundo',
  'size.screen': 'Pantalla',
  'size.classic': 'Clásico',

  'tool.label': 'Herramienta',
  'tool.food': 'Comida',
  'tool.wall': 'Muro',
  'tool.danger': 'Peligro',
  'tool.erase': 'Borrar',
  'tool.nest': 'Nido',

  'g.run': 'Simulación',
  'g.look': 'Aspecto',
  'help.h': 'Manejo',
  'help.paint': 'Pintar con la herramienta activa',
  'help.pan': 'Mover la cámara',
  'help.zoom': 'Zoom',
  'help.tools': 'Comida, muro, peligro, borrar, nido',
  'help.keys': 'Pausa, avanzar un paso, encajar',
  'key.left': 'Clic izq.',
  'key.right': 'Clic der.',
  'key.wheel': 'Rueda',
  'key.space': 'Espacio',

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
  panel: 'Controls',
  pitch: "An ant colony on your browser's GPU: the paths to food emerge on their own from three pheromones.",
  deck: 'Main controls',
  'aria.sim': 'Ant world',
  'theme.auto': 'Theme: auto',
  'theme.light': 'Theme: light',
  'theme.dark': 'Theme: dark',

  'st.paused': 'paused',
  'st.ants': 'ants',
  'st.carrying': 'carrying food',
  'st.nestFood': 'nest food',
  'st.energy': 'avg energy',
  'st.danger': 'avg danger',
  'st.born': 'born',
  'st.died': 'died',
  'st.delivered': 'deliveries',

  'act.play': 'Play',
  'act.pause': 'Pause',
  'act.step': 'Step',
  'act.reset': 'Reset',
  'act.fit': 'Fit',
  'act.clearPheromones': 'Clear pheromones',
  'act.clearMap': 'Clear map',
  't.play': 'Play / pause (space)',
  't.step': 'Step once (.)',
  't.reset': 'Back to the starting scene',
  't.fit': 'See the whole world (F)',

  size: 'World size',
  'size.screen': 'Screen',
  'size.classic': 'Classic',

  'tool.label': 'Tool',
  'tool.food': 'Food',
  'tool.wall': 'Wall',
  'tool.danger': 'Danger',
  'tool.erase': 'Erase',
  'tool.nest': 'Nest',

  'g.run': 'Simulation',
  'g.look': 'Appearance',
  'help.h': 'How to use it',
  'help.paint': 'Paint with the active tool',
  'help.pan': 'Move the camera',
  'help.zoom': 'Zoom',
  'help.tools': 'Food, wall, danger, erase, nest',
  'help.keys': 'Pause, step once, fit',
  'key.left': 'Left click',
  'key.right': 'Right click',
  'key.wheel': 'Wheel',
  'key.space': 'Space',

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

/** Repinta todo lo marcado con data-i18n (texto), data-i18n-title (title) o data-i18n-aria (aria-label). */
export function applyI18n(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as TextKey);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle as TextKey);
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
