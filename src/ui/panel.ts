import { t, type TextKey } from '../i18n';
import { ANT_CAPACITY, type SimParams, type Tool } from '../params';

export interface PanelActions {
  step(): void;
  reset(): void;
  clearPheromones(): void;
  clearMap(): void;
  fit(): void;
}

type KeysOfType<T> = { [K in keyof SimParams]: SimParams[K] extends T ? K : never }[keyof SimParams];
type NumKey = KeysOfType<number>;
type BoolKey = KeysOfType<boolean>;

const TOOLS: ReadonlyArray<{ tool: Tool; key: string; swatch: string }> = [
  { tool: 'food', key: '1', swatch: '--sim-food' },
  { tool: 'wall', key: '2', swatch: '--sim-wall' },
  { tool: 'danger', key: '3', swatch: '--sim-danger' },
  { tool: 'erase', key: '4', swatch: '--sim-soil' },
  { tool: 'nest', key: '5', swatch: '--sim-nest' },
];

let nextId = 0;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  i18n?: TextKey,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (i18n) {
    node.dataset.i18n = i18n;
    node.textContent = t(i18n);
  }
  return node;
}

function swatch(cssVar: string): HTMLElement {
  const s = el('span', 'swatch');
  s.style.background = `var(${cssVar})`;
  s.setAttribute('aria-hidden', 'true');
  return s;
}

const decimalsOf = (step: number): number => (String(step).split('.')[1] ?? '').length;

/**
 * Panel de parámetros en vivo, hecho con las piezas y los tokens del sistema común.
 * Todo lo que se toca aquí se aplica en el siguiente paso. `update()` refleja en el panel
 * lo que cambia desde el teclado (pausa y herramienta).
 */
export function createPanel(root: HTMLElement, p: SimParams, actions: PanelActions): { update(): void } {
  function folder(title: TextKey, open: boolean): HTMLElement {
    const details = el('details', 'folder');
    details.open = open;
    const summary = el('summary');
    summary.append(el('span', undefined, title));
    const body = el('div', 'folder-body');
    details.append(summary, body);
    root.append(details);
    return body;
  }

  function slider(parent: HTMLElement, prop: NumKey, min: number, max: number, step: number, label?: TextKey): HTMLElement {
    const id = `ctl-${nextId++}`;
    const digits = decimalsOf(step);
    const row = el('div', 'ctl');
    const name = el('label', undefined, label ?? (prop as TextKey));
    name.htmlFor = id;
    const number = el('input', 'num');
    number.type = 'number';
    number.min = String(min);
    number.max = String(max);
    number.step = String(step);
    number.setAttribute('aria-labelledby', `${id}-l`);
    name.id = `${id}-l`;
    const range = el('input');
    range.type = 'range';
    range.id = id;
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);

    const show = (source?: HTMLInputElement) => {
      const v = p[prop];
      if (source !== range) range.value = String(v);
      if (source !== number) number.value = v.toFixed(digits);
      const fill = max > min ? ((Math.min(Math.max(v, min), max) - min) / (max - min)) * 100 : 0;
      range.style.setProperty('--fill', `${fill}%`);
    };
    range.addEventListener('input', () => {
      p[prop] = Number(range.value);
      show(range);
    });
    number.addEventListener('input', () => {
      const v = Number(number.value);
      if (number.value === '' || !Number.isFinite(v)) return;
      p[prop] = Math.min(Math.max(v, min), max);
      show(number);
    });
    number.addEventListener('change', () => show());
    show();

    row.append(name, number, range);
    parent.append(row);
    return row;
  }

  function toggle(parent: HTMLElement, prop: BoolKey, label: TextKey, swatchVar?: string): void {
    const row = el('label', 'ctl switch-row');
    const name = el('span', 'switch-name');
    if (swatchVar) name.append(swatch(swatchVar));
    name.append(el('span', undefined, label));
    const input = el('input', 'switch');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.checked = p[prop];
    input.addEventListener('change', () => (p[prop] = input.checked));
    row.append(name, input);
    parent.append(row);
  }

  function button(parent: HTMLElement, label: TextKey, onClick: () => void, className = 'btn ghost sm'): HTMLButtonElement {
    const b = el('button', className, label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    parent.append(b);
    return b;
  }

  // --- Mandos principales: siempre a la vista ---
  const deck = el('div', 'deck');
  const transport = el('div', 'transport');
  const pauseBtn = button(transport, 'act.pause', () => (p.paused = !p.paused), 'btn sm');
  button(transport, 'act.step', actions.step);
  button(transport, 'act.reset', actions.reset);

  const toolBox = el('div', 'tools');
  toolBox.setAttribute('role', 'group');
  toolBox.dataset.i18nAria = 'tool.label';
  toolBox.setAttribute('aria-label', t('tool.label'));
  const toolChips = TOOLS.map(({ tool, key, swatch: cssVar }) => {
    const chip = el('button', 'chip tool');
    chip.type = 'button';
    const k = el('kbd');
    k.textContent = key;
    chip.append(k, swatch(cssVar), el('span', undefined, `tool.${tool}`));
    chip.addEventListener('click', () => (p.tool = tool));
    toolBox.append(chip);
    return { tool, chip };
  });
  deck.append(transport, toolBox);
  root.append(deck);

  // --- Ayuda de ratón y teclado ---
  const help = folder('help.h', false);
  const list = el('dl', 'keys');
  const helpRow = (keys: Array<string | TextKey>, text: TextKey) => {
    const dt = el('dt');
    keys.forEach((key) => {
      const k = el('kbd');
      if (key.length > 1 && key !== 'F') {
        k.dataset.i18n = key;
        k.textContent = t(key as TextKey);
      } else k.textContent = key;
      dt.append(k);
    });
    list.append(dt, el('dd', undefined, text));
  };
  helpRow(['key.left'], 'help.paint');
  helpRow(['key.right'], 'help.pan');
  helpRow(['key.wheel'], 'help.zoom');
  helpRow(['1', '2', '3', '4', '5'], 'help.tools');
  helpRow(['key.space', '.', 'F'], 'help.keys');
  help.append(list);

  // --- Carpetas de parámetros ---
  const sim = folder('f.sim', true);
  slider(sim, 'stepsPerFrame', 0, 16, 1);
  slider(sim, 'initialAnts', 0, ANT_CAPACITY, 100);
  slider(sim, 'seed', 0, 9999, 1);

  const brush = folder('f.brush', true);
  slider(brush, 'brushRadius', 1, 60, 1);
  slider(brush, 'foodPerCell', 0.5, 20, 0.5);
  slider(brush, 'dangerIntensity', 0.05, 1, 0.05);
  const brushActions = el('div', 'actions');
  button(brushActions, 'act.clearPheromones', actions.clearPheromones);
  button(brushActions, 'act.clearMap', actions.clearMap);
  brush.append(brushActions);

  const layers = folder('f.layers', true);
  toggle(layers, 'showHome', 'showHome', '--sim-home');
  slider(layers, 'homeGain', 0.005, 2, 0.005, 'gain').classList.add('sub');
  toggle(layers, 'showFood', 'showFood', '--sim-food-trail');
  slider(layers, 'foodGain', 0.005, 2, 0.005, 'gain').classList.add('sub');
  toggle(layers, 'showAlarm', 'showAlarm', '--sim-alarm');
  slider(layers, 'alarmGain', 0.005, 2, 0.005, 'gain').classList.add('sub');
  toggle(layers, 'showAnts', 'showAnts', '--sim-ant');
  slider(layers, 'antSize', 0.5, 6, 0.1);
  const layerActions = el('div', 'actions');
  button(layerActions, 'act.fit', actions.fit);
  layers.append(layerActions);

  const move = folder('f.move', false);
  slider(move, 'antSpeed', 0.1, 3, 0.05);
  slider(move, 'sensorAngleDeg', 5, 90, 1);
  slider(move, 'sensorDist', 1, 30, 0.5);
  slider(move, 'turnRateDeg', 1, 90, 1);
  slider(move, 'wanderDeg', 0, 60, 1);
  slider(move, 'sensitivity', 0, 10, 0.05);
  slider(move, 'scoutFraction', 0, 1, 0.01);

  const nav = folder('f.nav', false);
  slider(nav, 'homing', 0, 1, 0.01);
  slider(nav, 'returnWander', 0, 1, 0.05);
  slider(nav, 'memoryPull', 0, 1, 0.01);
  slider(nav, 'trailPolarity', 0, 1, 0.05);
  slider(nav, 'trailTrust', 0, 1, 0.05);
  slider(nav, 'searchTicks', 0, 2000, 10);

  const pher = folder('f.pher', false);
  slider(pher, 'emitTauHome', 50, 10000, 10);
  slider(pher, 'emitTauFood', 50, 10000, 10);
  slider(pher, 'depositHome', 0, 5, 0.05);
  slider(pher, 'depositFood', 0, 5, 0.05);
  slider(pher, 'depositAlarm', 0, 10, 0.1);
  slider(pher, 'alarmThreshold', 0, 1, 0.01);
  slider(pher, 'evapHome', 0, 0.05, 0.0005);
  slider(pher, 'evapFood', 0, 0.05, 0.0005);
  slider(pher, 'evapAlarm', 0, 0.2, 0.001);
  slider(pher, 'diffHome', 0, 1, 0.01);
  slider(pher, 'diffFood', 0, 1, 0.01);
  slider(pher, 'diffAlarm', 0, 1, 0.01);
  slider(pher, 'trailWear', 0, 0.3, 0.005);
  slider(pher, 'pherCap', 1, 5000, 1);

  const colony = folder('f.colony', false);
  slider(colony, 'nestRadius', 4, 60, 1);
  slider(colony, 'energyTicks', 500, 50000, 100);
  slider(colony, 'hungerThreshold', 0, 0.9, 0.01);
  slider(colony, 'mealCost', 0, 5, 0.1);
  slider(colony, 'birthCost', 1, 50, 1);
  slider(colony, 'foodReserve', 0, 500, 5);
  slider(colony, 'maxAnts', 0, ANT_CAPACITY, 100);
  slider(colony, 'maxBirthsPerFrame', 0, 512, 1);
  slider(colony, 'maxAgeTicks', 1000, 200000, 1000);

  const danger = folder('f.danger', false);
  slider(danger, 'dangerDamage', 0, 0.05, 0.0005);
  slider(danger, 'dangerGain', 0, 0.5, 0.005);
  slider(danger, 'alarmAvoid', 0, 20, 0.1);
  slider(danger, 'alarmContagion', 0, 0.2, 0.001);
  slider(danger, 'contagionCap', 0, 1, 0.01);
  slider(danger, 'dangerDecay', 0, 0.1, 0.001);
  slider(danger, 'fleeBoost', 0, 3, 0.05);

  let shownPaused: boolean | null = null;
  let shownTool: Tool | null = null;
  return {
    update(): void {
      if (p.paused !== shownPaused) {
        shownPaused = p.paused;
        const key: TextKey = p.paused ? 'act.resume' : 'act.pause';
        pauseBtn.dataset.i18n = key;
        pauseBtn.textContent = t(key);
        pauseBtn.setAttribute('aria-pressed', String(p.paused));
      }
      if (p.tool !== shownTool) {
        shownTool = p.tool;
        for (const { tool, chip } of toolChips) chip.setAttribute('aria-pressed', String(tool === p.tool));
      }
    },
  };
}
