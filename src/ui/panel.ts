import { onLang, t, type TextKey } from '../i18n';
import { ANT_CAPACITY, CLASSIC_WORLD, type SimParams, type Tool, type WorldSize } from '../params';

/** Valores de la lista de tamaños: "screen" toma la forma del canvas, "classic" es 1024×640. */
export type SizeValue = 'screen' | 'classic';

export interface PanelActions {
  play(): void;
  step(): void;
  reset(): void;
  fit(): void;
  clearPheromones(): void;
  clearMap(): void;
  setSize(value: SizeValue): void;
}

export interface Panel {
  /** Refleja en el panel lo que cambia desde el teclado (pausa y herramienta). Una vez por frame. */
  update(): void;
  /** Vuelve a mostrar el valor de todos los deslizadores (tras cambiar `params` desde fuera). */
  sync(): void;
  /** Escribe en la lista de tamaños las celdas del mundo "Pantalla". */
  setScreenSize(size: WorldSize): void;
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
 * Panel de controles (#controls, dentro del <details id="panel">), con las piezas del panel del
 * sistema común: grupos con leyenda, deslizadores, desplegable, botones a dos columnas.
 * Todo lo que se toca aquí se aplica en el siguiente paso. Los botones dicen lo que hacen con
 * data-act; Play, Paso y Reiniciar están también en la barra de mandos del móvil (index.html):
 * un solo manejador por acción para las dos copias.
 */
export function createPanel(root: HTMLElement, p: SimParams, actions: PanelActions): Panel {
  const sliders: Array<() => void> = [];

  /** Grupo siempre abierto: <fieldset> con <legend>. */
  function group(title: TextKey, className?: string): HTMLElement {
    const fieldset = el('fieldset', className);
    fieldset.append(el('legend', undefined, title));
    root.append(fieldset);
    return fieldset;
  }

  /** Grupo de parámetros finos: el mismo aspecto, pero plegable y plegado al cargar. */
  function foldedGroup(title: TextKey): HTMLElement {
    const details = el('details', 'group');
    const summary = el('summary');
    summary.append(el('span', undefined, title));
    const body = el('div', 'group-body');
    details.append(summary, body);
    root.append(details);
    return body;
  }

  /** Deslizador con su valor arriba a la derecha; el valor se puede escribir. */
  function slider(parent: HTMLElement, prop: NumKey, min: number, max: number, step: number, label?: TextKey): HTMLElement {
    const id = `ctl-${nextId++}`;
    const digits = decimalsOf(step);
    const row = el('div', 'slider');
    const name = el('label', undefined, label ?? (prop as TextKey));
    name.htmlFor = id;
    name.id = `${id}-l`;
    const number = el('input', 'num');
    number.type = 'number';
    number.min = String(min);
    number.max = String(max);
    number.step = String(step);
    number.setAttribute('aria-labelledby', name.id);
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
      // parte rellena de la pista, de 0 a 1 (ver style.css)
      const fill = max > min ? (Math.min(Math.max(v, min), max) - min) / (max - min) : 0;
      range.style.setProperty('--p', String(fill));
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
    sliders.push(show);

    row.append(name, number, range);
    parent.append(row);
    return row;
  }

  function toggle(parent: HTMLElement, prop: BoolKey, label: TextKey, swatchVar?: string): void {
    const row = el('label', 'switch-row');
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

  /** Botón de acción (data-act); el manejador se pone más abajo, igual para el panel y la barra. */
  function actButton(parent: HTMLElement, act: string, className: string, label: TextKey, title?: TextKey): HTMLButtonElement {
    const b = el('button', className, label);
    b.type = 'button';
    b.dataset.act = act;
    if (title) {
      b.dataset.i18nTitle = title;
      b.title = t(title);
    }
    parent.append(b);
    return b;
  }

  const pitch = el('p', 'pitch', 'pitch');
  root.append(pitch);

  // --- Simulación: lo que está en la barra del móvil (.desk) no se repite allí en el panel ---
  const run = group('g.run');
  const runButtons = el('div', 'buttons');
  const play = el('button', 'btn wide play desk');
  play.type = 'button';
  play.dataset.act = 'play';
  play.dataset.i18nTitle = 't.play';
  play.title = t('t.play');
  play.append(el('span', undefined, 'act.play'));
  runButtons.append(play);
  actButton(runButtons, 'step', 'btn ghost desk', 'act.step', 't.step');
  actButton(runButtons, 'reset', 'btn ghost desk', 'act.reset', 't.reset');
  actButton(runButtons, 'fit', 'btn ghost wide', 'act.fit', 't.fit');
  run.append(runButtons);

  const sizeField = el('div', 'field');
  const sizeLabel = el('label', undefined, 'size');
  sizeLabel.htmlFor = 'size';
  const sizeBox = el('span', 'select');
  const sizeSel = el('select');
  sizeSel.id = 'size';
  sizeSel.add(new Option('', 'screen', true, true));
  sizeSel.add(new Option('', 'classic'));
  sizeBox.append(sizeSel);
  sizeField.append(sizeLabel, sizeBox);
  run.append(sizeField);
  let screenSize: WorldSize | null = null;
  const paintSizes = () => {
    const [screen, classic] = sizeSel.options;
    screen.text = screenSize ? `${t('size.screen')}: ${screenSize.w}×${screenSize.h}` : t('size.screen');
    classic.text = `${t('size.classic')}: ${CLASSIC_WORLD.w}×${CLASSIC_WORLD.h}`;
  };
  paintSizes();
  onLang(paintSizes);
  sizeSel.addEventListener('change', () => actions.setSize(sizeSel.value as SizeValue));

  slider(run, 'stepsPerFrame', 0, 16, 1);
  slider(run, 'initialAnts', 0, ANT_CAPACITY, 100);
  slider(run, 'seed', 0, 9999, 1);

  // --- Pincel: herramienta, tamaño y lo que se borra ---
  const brush = group('f.brush');
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
  brush.append(toolBox);
  slider(brush, 'brushRadius', 1, 60, 1);
  slider(brush, 'foodPerCell', 0.5, 20, 0.5);
  slider(brush, 'dangerIntensity', 0.05, 1, 0.05);
  const brushButtons = el('div', 'buttons');
  actButton(brushButtons, 'clearPheromones', 'btn ghost', 'act.clearPheromones');
  actButton(brushButtons, 'clearMap', 'btn ghost', 'act.clearMap');
  brush.append(brushButtons);

  // --- Capas visibles ---
  const layers = group('f.layers');
  toggle(layers, 'showHome', 'showHome', '--sim-home');
  slider(layers, 'homeGain', 0.005, 2, 0.005, 'gain').classList.add('sub');
  toggle(layers, 'showFood', 'showFood', '--sim-food-trail');
  slider(layers, 'foodGain', 0.005, 2, 0.005, 'gain').classList.add('sub');
  toggle(layers, 'showAlarm', 'showAlarm', '--sim-alarm');
  slider(layers, 'alarmGain', 0.005, 2, 0.005, 'gain').classList.add('sub');
  toggle(layers, 'showAnts', 'showAnts', '--sim-ant');
  slider(layers, 'antSize', 0.5, 6, 0.1);

  // --- Parámetros finos, plegados ---
  const move = foldedGroup('f.move');
  slider(move, 'antSpeed', 0.1, 3, 0.05);
  slider(move, 'sensorAngleDeg', 5, 90, 1);
  slider(move, 'sensorDist', 1, 30, 0.5);
  slider(move, 'turnRateDeg', 1, 90, 1);
  slider(move, 'wanderDeg', 0, 60, 1);
  slider(move, 'sensitivity', 0, 10, 0.05);
  slider(move, 'scoutFraction', 0, 1, 0.01);

  const nav = foldedGroup('f.nav');
  slider(nav, 'homing', 0, 1, 0.01);
  slider(nav, 'returnWander', 0, 1, 0.05);
  slider(nav, 'memoryPull', 0, 1, 0.01);
  slider(nav, 'trailPolarity', 0, 1, 0.05);
  slider(nav, 'trailTrust', 0, 1, 0.05);
  slider(nav, 'searchTicks', 0, 2000, 10);

  const pher = foldedGroup('f.pher');
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

  const colony = foldedGroup('f.colony');
  slider(colony, 'nestRadius', 4, 60, 1);
  slider(colony, 'energyTicks', 500, 50000, 100);
  slider(colony, 'hungerThreshold', 0, 0.9, 0.01);
  slider(colony, 'mealCost', 0, 5, 0.1);
  slider(colony, 'birthCost', 1, 50, 1);
  slider(colony, 'foodReserve', 0, 500, 5);
  slider(colony, 'maxAnts', 0, ANT_CAPACITY, 100);
  slider(colony, 'maxBirthsPerFrame', 0, 512, 1);
  slider(colony, 'maxAgeTicks', 1000, 200000, 1000);

  const danger = foldedGroup('f.danger');
  slider(danger, 'dangerDamage', 0, 0.05, 0.0005);
  slider(danger, 'dangerGain', 0, 0.5, 0.005);
  slider(danger, 'alarmAvoid', 0, 20, 0.1);
  slider(danger, 'alarmContagion', 0, 0.2, 0.001);
  slider(danger, 'contagionCap', 0, 1, 0.01);
  slider(danger, 'dangerDecay', 0, 0.1, 0.001);
  slider(danger, 'fleeBoost', 0, 3, 0.05);

  // --- Solo en el móvil: el botón de tema sale de la cabecera y viene aquí ---
  const look = group('g.look', 'm-only');
  const lookRow = el('div', 'row');
  const themeBtn = el('button', 'chip theme-btn');
  themeBtn.type = 'button';
  lookRow.append(themeBtn);
  look.append(lookRow);

  // --- Ratón y teclado ---
  const help = group('help.h', 'help');
  const list = el('dl', 'keys');
  const helpRow = (keys: Array<string | TextKey>, text: TextKey) => {
    const dt = el('dt');
    keys.forEach((key) => {
      const k = el('kbd');
      if (key.length > 1) {
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

  // --- Un manejador por acción, para los botones del panel y los de la barra del móvil ---
  const handlers: Record<string, () => void> = {
    play: () => actions.play(),
    step: () => actions.step(),
    reset: () => actions.reset(),
    fit: () => actions.fit(),
    clearPheromones: () => actions.clearPheromones(),
    clearMap: () => actions.clearMap(),
  };
  document.querySelectorAll<HTMLElement>('[data-act]').forEach((b) => {
    const handler = handlers[b.dataset.act ?? ''];
    if (handler) b.addEventListener('click', handler);
  });

  // Devuelve el teclado a la simulación tras usar un botón o una lista, para que un Espacio
  // después no vuelva a pulsar ese botón ni abra la lista.
  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target.closest('button, summary') : null;
    if (target instanceof HTMLElement) target.blur();
  });
  document.addEventListener('change', (e) => {
    const target = e.target;
    if (target instanceof HTMLElement && target.matches('select, input[type="checkbox"], input[type="radio"]')) {
      target.blur();
    }
  });

  const playButtons = document.querySelectorAll<HTMLElement>('[data-act="play"]');
  let shownPaused: boolean | null = null;
  let shownTool: Tool | null = null;
  const panel: Panel = {
    update(): void {
      if (p.paused !== shownPaused) {
        shownPaused = p.paused;
        const key: TextKey = p.paused ? 'act.play' : 'act.pause';
        playButtons.forEach((b) => {
          const label = b.querySelector('span');
          if (label) {
            label.dataset.i18n = key;
            label.textContent = t(key);
          }
          b.dataset.running = String(!p.paused);
        });
      }
      if (p.tool !== shownTool) {
        shownTool = p.tool;
        for (const { tool, chip } of toolChips) chip.setAttribute('aria-pressed', String(tool === p.tool));
      }
    },
    sync(): void {
      sliders.forEach((show) => show());
    },
    setScreenSize(size: WorldSize): void {
      screenSize = size;
      paintSizes();
    },
  };
  panel.update();
  return panel;
}
