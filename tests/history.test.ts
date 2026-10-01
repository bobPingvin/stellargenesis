import { describe, it, expect } from 'vitest';
import {
  createSnapshot,
  cloneBody,
  cloneBodies,
  cloneParticles
} from '../src/physics/history';
import { createBody, createParticle } from '../src/physics/engine';

describe('State History & Undo/Redo Engine (history)', () => {
  it('должен глубоко клонировать небесное тело, изолируя состав и трейл', () => {
    const original = createBody({
      id: 'body-orig',
      name: 'Original Star',
      mass: 5.0,
      composition: { H: 0.7, He: 0.25, C: 0.05, Fe: 0.0 }
    });
    original.trail.push({ x: 10, y: 10 });

    const cloned = cloneBody(original);

    // Модифицируем клон
    cloned.mass = 99.0;
    cloned.composition.H = 0.1;
    cloned.trail.push({ x: 20, y: 20 });

    // Исходный объект не должен мутировать
    expect(original.mass).toBe(5.0);
    expect(original.composition.H).toBe(0.7);
    expect(original.trail).toHaveLength(1);
    expect(cloned.trail).toHaveLength(2);
  });

  it('должен клонировать массив тел полностью', () => {
    const bodies = [
      createBody({ id: 'b1', name: 'Star 1' }),
      createBody({ id: 'b2', name: 'Star 2' })
    ];

    const clonedList = cloneBodies(bodies);
    expect(clonedList).toHaveLength(2);
    expect(clonedList[0].id).toBe('b1');
    expect(clonedList[1].id).toBe('b2');
    expect(clonedList[0]).not.toBe(bodies[0]);
  });

  it('должен ограничивать клонирование частиц газа не более 250 штук для производительности', () => {
    const manyParticles = [];
    for (let i = 0; i < 400; i++) {
      manyParticles.push(createParticle(i, i, 0, 0, '#ffffff', 2, 100));
    }

    const clonedParticles = cloneParticles(manyParticles);
    expect(clonedParticles).toHaveLength(250);
  });

  it('должен создавать снимок симуляции с метаданными и временной меткой', () => {
    const bodies = [createBody({ id: 'star-a', mass: 2.0 })];
    const particles = [createParticle(0, 0, 1, 1, '#ff0000', 3, 50)];

    const snapshot = createSnapshot('Перед взрывом Сверхновой', bodies, particles, 'star-a');

    expect(snapshot.id).toMatch(/^snap_/);
    expect(snapshot.description).toBe('Перед взрывом Сверхновой');
    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.bodies).toHaveLength(1);
    expect(snapshot.particles).toHaveLength(1);
    expect(snapshot.selectedBodyId).toBe('star-a');
  });
});
