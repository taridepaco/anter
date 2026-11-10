/**
 * Colores de la simulación, de día y de noche. Salen de la paleta extendida del sistema común
 * (mar, bosque, prado, cielo, flor, tierra) más los tokens rojo y amarillo. El canvas no hereda
 * los tokens CSS, así que se pasan al shader como uniforms y a la página como variables --sim-*.
 */
export type Rgb = readonly [number, number, number];

export interface Palette {
  /** De noche los rastros suman luz sobre el suelo; de día lo tiñen. */
  dark: boolean;
  outside: Rgb;
  soil: Rgb;
  homeTrail: Rgb;
  foodTrail: Rgb;
  alarmTrail: Rgb;
  danger: Rgb;
  food: Rgb;
  wall: Rgb;
  nest: Rgb;
  cursor: Rgb;
  ant: Rgb;
  antHungry: Rgb;
  antGiveUp: Rgb;
  antScared: Rgb;
}

const hex = (h: string): Rgb => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const DAY: Palette = {
  dark: false,
  outside: hex('#bfe3d6'),
  soil: hex('#f3e9c2'),
  homeTrail: hex('#2f7e96'),
  foodTrail: hex('#4f8f47'),
  alarmTrail: hex('#d9442e'),
  danger: hex('#e9879a'),
  food: hex('#f2b63d'),
  wall: hex('#1f2a33'),
  nest: hex('#6a4a33'),
  cursor: hex('#1f2a33'),
  ant: hex('#1f2a33'),
  antHungry: hex('#b8560f'),
  antGiveUp: hex('#5f7f9c'),
  antScared: hex('#d9442e'),
};

const NIGHT: Palette = {
  dark: true,
  outside: hex('#12222b'),
  soil: hex('#0a151b'),
  homeTrail: hex('#3f9fc0'),
  foodTrail: hex('#74b34e'),
  alarmTrail: hex('#f0694a'),
  danger: hex('#e9879a'),
  food: hex('#f2b63d'),
  wall: hex('#7f918f'),
  nest: hex('#b0845c'),
  cursor: hex('#f1ead0'),
  ant: hex('#f1ead0'),
  antHungry: hex('#ff8c26'),
  antGiveUp: hex('#8ca6d9'),
  antScared: hex('#ff3b24'),
};

export const paletteFor = (dark: boolean): Palette => (dark ? NIGHT : DAY);

const css = ([r, g, b]: Rgb): string =>
  `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;

/** Publica los colores del mapa como variables CSS para las muestras del panel. */
export function exposePalette(p: Palette, root: HTMLElement): void {
  const vars: Record<string, Rgb> = {
    '--sim-home': p.homeTrail,
    '--sim-food-trail': p.foodTrail,
    '--sim-alarm': p.alarmTrail,
    '--sim-danger': p.danger,
    '--sim-food': p.food,
    '--sim-wall': p.wall,
    '--sim-nest': p.nest,
    '--sim-soil': p.soil,
    '--sim-ant': p.ant,
  };
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, css(value));
}
