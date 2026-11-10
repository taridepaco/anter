import GUI from 'lil-gui';
import { ANT_CAPACITY, type SimParams } from '../params';

export interface GuiActions {
  step(): void;
  reset(): void;
  clearPheromones(): void;
  clearMap(): void;
  fit(): void;
}

/** Panel de parámetros en vivo. Todo lo que se toca aquí se aplica en el siguiente paso. */
export function createGui(p: SimParams, actions: GuiActions): GUI {
  const gui = new GUI({ title: 'Anter' });

  const sim = gui.addFolder('Simulación');
  sim.add(p, 'paused').name('Pausa').listen();
  sim.add(p, 'stepsPerFrame', 0, 16, 1).name('Pasos por frame');
  sim.add(actions, 'step').name('Avanzar un paso');
  sim.add(p, 'initialAnts', 0, ANT_CAPACITY, 100).name('Hormigas iniciales');
  sim.add(p, 'seed', 0, 9999, 1).name('Semilla');
  sim.add(actions, 'reset').name('Reiniciar');

  const brush = gui.addFolder('Pincel');
  brush
    .add(p, 'tool', { Comida: 'food', Muro: 'wall', Peligro: 'danger', Borrar: 'erase', Nido: 'nest' })
    .name('Herramienta')
    .listen();
  brush.add(p, 'brushRadius', 1, 60, 1).name('Radio');
  brush.add(p, 'foodPerCell', 0.5, 20, 0.5).name('Comida por celda');
  brush.add(p, 'dangerIntensity', 0.05, 1, 0.05).name('Intensidad peligro');
  brush.add(actions, 'clearPheromones').name('Borrar feromonas');
  brush.add(actions, 'clearMap').name('Vaciar mapa');

  const layers = gui.addFolder('Capas');
  layers.add(p, 'showHome').name('Rastro al nido (azul)');
  layers.add(p, 'homeGain', 0.005, 2, 0.005).name('  intensidad');
  layers.add(p, 'showFood').name('Rastro a comida (verde)');
  layers.add(p, 'foodGain', 0.005, 2, 0.005).name('  intensidad');
  layers.add(p, 'showAlarm').name('Alarma (rojo)');
  layers.add(p, 'alarmGain', 0.005, 2, 0.005).name('  intensidad');
  layers.add(p, 'showAnts').name('Hormigas');
  layers.add(p, 'antSize', 0.5, 6, 0.1).name('Tamaño hormiga');
  layers.add(actions, 'fit').name('Encuadrar (F)');

  const move = gui.addFolder('Movimiento y sentidos');
  move.add(p, 'antSpeed', 0.1, 3, 0.05).name('Velocidad');
  move.add(p, 'sensorAngleDeg', 5, 90, 1).name('Ángulo antenas (°)');
  move.add(p, 'sensorDist', 1, 30, 0.5).name('Distancia antenas');
  move.add(p, 'turnRateDeg', 1, 90, 1).name('Giro máx. (°/tick)');
  move.add(p, 'wanderDeg', 0, 60, 1).name('Deambular (°)');
  move.add(p, 'sensitivity', 0, 10, 0.05).name('Umbral de olfato');
  move.add(p, 'scoutFraction', 0, 1, 0.01).name('Exploradoras');
  move.close();

  const nav = gui.addFolder('Navegación');
  nav.add(p, 'homing', 0, 1, 0.01).name('Integración de caminos');
  nav.add(p, 'returnWander', 0, 1, 0.05).name('Deambular al volver (×)');
  nav.add(p, 'memoryPull', 0, 1, 0.01).name('Memoria de la fuente');
  nav.add(p, 'trailPolarity', 0, 1, 0.05).name('Polaridad del rastro');
  nav.add(p, 'trailTrust', 0, 1, 0.05).name('Confianza en el rastro');
  nav.add(p, 'searchTicks', 0, 2000, 10).name('Búsqueda local (ticks)');
  nav.close();

  const pher = gui.addFolder('Feromonas');
  pher.add(p, 'emitTauHome', 50, 10000, 10).name('τ emisión home');
  pher.add(p, 'emitTauFood', 50, 10000, 10).name('τ emisión food');
  pher.add(p, 'depositHome', 0, 5, 0.05).name('Depósito home');
  pher.add(p, 'depositFood', 0, 5, 0.05).name('Depósito food');
  pher.add(p, 'depositAlarm', 0, 10, 0.1).name('Depósito alarma');
  pher.add(p, 'alarmThreshold', 0, 1, 0.01).name('Umbral alarma');
  pher.add(p, 'evapHome', 0, 0.05, 0.0005).name('Evaporación home');
  pher.add(p, 'evapFood', 0, 0.05, 0.0005).name('Evaporación food');
  pher.add(p, 'evapAlarm', 0, 0.2, 0.001).name('Evaporación alarma');
  pher.add(p, 'diffHome', 0, 1, 0.01).name('Difusión home');
  pher.add(p, 'diffFood', 0, 1, 0.01).name('Difusión food');
  pher.add(p, 'diffAlarm', 0, 1, 0.01).name('Difusión alarma');
  pher.add(p, 'trailWear', 0, 0.3, 0.005).name('Desgaste sin comida');
  pher.add(p, 'pherCap', 1, 5000, 1).name('Máximo por celda');
  pher.close();

  const colony = gui.addFolder('Colonia');
  colony.add(p, 'nestRadius', 4, 60, 1).name('Radio del nido');
  colony.add(p, 'energyTicks', 500, 50000, 100).name('Autonomía (ticks)');
  colony.add(p, 'hungerThreshold', 0, 0.9, 0.01).name('Umbral de hambre');
  colony.add(p, 'mealCost', 0, 5, 0.1).name('Comida por ración');
  colony.add(p, 'birthCost', 1, 50, 1).name('Coste de nacer');
  colony.add(p, 'foodReserve', 0, 500, 5).name('Reserva de comida');
  colony.add(p, 'maxAnts', 0, ANT_CAPACITY, 100).name('Población máx.');
  colony.add(p, 'maxBirthsPerFrame', 0, 512, 1).name('Nacimientos/frame');
  colony.add(p, 'maxAgeTicks', 1000, 200000, 1000).name('Esperanza de vida');
  colony.close();

  const danger = gui.addFolder('Peligro');
  danger.add(p, 'dangerDamage', 0, 0.05, 0.0005).name('Daño en zona');
  danger.add(p, 'dangerGain', 0, 0.5, 0.005).name('Susto en zona');
  danger.add(p, 'alarmAvoid', 0, 20, 0.1).name('Evitar alarma');
  danger.add(p, 'alarmContagion', 0, 0.2, 0.001).name('Contagio de alarma');
  danger.add(p, 'contagionCap', 0, 1, 0.01).name('Tope del contagio');
  danger.add(p, 'dangerDecay', 0, 0.1, 0.001).name('Calma (decay)');
  danger.add(p, 'fleeBoost', 0, 3, 0.05).name('Huida (velocidad)');
  danger.close();

  return gui;
}
