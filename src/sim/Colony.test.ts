import { describe, expect, it } from 'vitest';
import { Colony, type ColonyRules, type GpuStats } from './Colony';

const rules: ColonyRules = { birthCost: 10, foodReserve: 20, maxAnts: 1000, maxBirthsPerFrame: 5 };

const stats = (s: Partial<GpuStats>): GpuStats => ({
  delivered: 0,
  died: 0,
  born: 0,
  eaten: 0,
  alive: 0,
  carrying: 0,
  energySum: 0,
  dangerSum: 0,
  ...s,
});

describe('Colony', () => {
  it('solo gasta en nacimientos la comida por encima de la reserva', () => {
    const c = new Colony(1000, 55, 0);
    expect(c.planSpawns(rules)).toEqual({ start: 0, count: 3 });
    expect(c.nestFood).toBe(25);
    expect(c.planSpawns(rules).count).toBe(0);
  });

  it('limita los nacimientos por frame y avanza el cursor circular', () => {
    const c = new Colony(8, 1000, 0);
    expect(c.planSpawns(rules)).toEqual({ start: 0, count: 5 });
    expect(c.planSpawns({ ...rules, maxAnts: 8 })).toEqual({ start: 5, count: 3 });
    expect(c.planSpawns({ ...rules, maxAnts: 8 }).count).toBe(0);
  });

  it('no supera la población máxima contando los nacimientos pendientes', () => {
    const c = new Colony(1000, 1000, 98);
    expect(c.planSpawns({ ...rules, maxAnts: 100 }).count).toBe(2);
    expect(c.planSpawns({ ...rules, maxAnts: 100 }).count).toBe(0);
  });

  it('suma entregas, resta comidas y devuelve el coste de los huecos que estaban ocupados', () => {
    const c = new Colony(1000, 70, 10);
    c.planSpawns(rules); // 5 nacimientos reservados: quedan 20
    c.closeWindow();
    c.applyStats(stats({ delivered: 12, eaten: 4, born: 2, alive: 12, energySum: 6 }));
    // 20 + 12 - 4 + 3 huecos sin nacimiento * 10
    expect(c.nestFood).toBe(58);
    expect(c.alive).toBe(12);
    expect(c.avgEnergy).toBe(0.5);
    expect(c.totalBorn).toBe(2);
    expect(c.totalDelivered).toBe(12);
  });

  it('los nacimientos de la ventana abierta no se devuelven con la ventana cerrada', () => {
    const c = new Colony(1000, 100, 0);
    c.planSpawns(rules); // ventana A: 5 → quedan 50
    c.closeWindow();
    c.planSpawns(rules); // ventana B: 3 → quedan 20
    c.applyStats(stats({ born: 5, alive: 5 }));
    expect(c.nestFood).toBe(20);
    c.closeWindow();
    c.applyStats(stats({ born: 1, alive: 6 }));
    expect(c.nestFood).toBe(40);
  });

  it('la comida del nido nunca baja de cero', () => {
    const c = new Colony(1000, 5, 10);
    c.closeWindow();
    c.applyStats(stats({ eaten: 9, alive: 10 }));
    expect(c.nestFood).toBe(0);
  });
});
