/**
 * Automated Reproducible Unit Test Suite for StellarGenesis Physics Engine
 * Run via: npm test  (or: npx tsx tests/physics.test.ts)
 */

import { describe, it, expect } from 'vitest';
import {
  SPEED_OF_LIGHT,
  CHANDRASEKHAR_LIMIT,
  TOV_LIMIT,
  createBody,
  stepPhysics
} from '../src/physics/engine';
import { CelestialBody, Particle, SimulationSettings } from '../src/types';

describe('Standalone Mathematical & Relativistic Invariants', () => {
  const defaultSettings: SimulationSettings = {
    G: 1.2,
    softening: 8.0,
    timeSpeed: 1,
    showTrails: false,
    showVectors: false,
    soundEnabled: false,
    dopplerEffect: true,
    stellarEvolution: false,
    stellarEvolutionSpeed: 1.0,
    graphicsQuality: 'balanced',
    enableLensingShader: false,
    maxParticles: 500,
    showSpacetimeGrid: false,
    adaptiveGrid: false
  };

  it('Константа SPEED_OF_LIGHT строго равна 60.0 px/s в engine.ts и скорость ограничена', () => {
    expect(SPEED_OF_LIGHT).toBe(60.0);

    const supermassive = createBody({
      id: 'bh-massive',
      name: 'Supermassive Quasar',
      mass: 1e9,
      radius: 30,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0
    });

    const testInfallingBody = createBody({
      id: 'infall-particle',
      name: 'Infalling probe',
      mass: 0.001,
      radius: 2,
      x: 5,
      y: 0,
      vx: 100.0,
      vy: 80.0
    });

    const particles: Particle[] = [];
    const deadBodies: CelestialBody[] = [];
    const onRemove = (v: CelestialBody) => deadBodies.push(v);

    stepPhysics([supermassive, testInfallingBody], particles, defaultSettings, 0.1, onRemove);

    const resultingSpeed = Math.hypot(testInfallingBody.vx, testInfallingBody.vy);
    expect(resultingSpeed).toBeLessThanOrEqual(SPEED_OF_LIGHT + 1e-6);
    expect(Number.isFinite(testInfallingBody.x)).toBe(true);
    expect(Number.isFinite(testInfallingBody.y)).toBe(true);
  });

  it('Сглаживание сингулярности при r=0: denom = (eps^2)^1.5 = 512.0 и слияние тел', () => {
    const denom = Math.pow(0 + defaultSettings.softening * defaultSettings.softening, 1.5);
    expect(denom).toBeCloseTo(512.0, 4);

    const b1 = createBody({
      id: 'body-a',
      name: 'Singularity A',
      mass: 5.0,
      radius: 10.0,
      x: 100.0,
      y: 100.0,
      vx: 0,
      vy: 0
    });

    const b2 = createBody({
      id: 'body-b',
      name: 'Singularity B',
      mass: 5.0,
      radius: 10.0,
      x: 100.0,
      y: 100.0,
      vx: 0,
      vy: 0
    });

    const removedList: CelestialBody[] = [];
    stepPhysics([b1, b2], [], defaultSettings, 0.05, (b) => removedList.push(b));

    expect(Number.isNaN(b1.x)).toBe(false);
    expect(Number.isNaN(b1.vx)).toBe(false);
    expect(removedList).toHaveLength(1);
    expect(b1.mass).toBeCloseTo(10.0, 4);
  });

  it('Закон сохранения импульса (Px, Py) до и после неупругого соударения', () => {
    const starA = createBody({
      id: 'star-a',
      name: 'Star Alpha',
      mass: 4.0,
      radius: 12.0,
      x: 200.0,
      y: 200.0,
      vx: 3.0,
      vy: 1.0
    });

    const starB = createBody({
      id: 'star-b',
      name: 'Star Beta',
      mass: 2.0,
      radius: 8.0,
      x: 201.0,
      y: 201.0,
      vx: -6.0,
      vy: 4.0
    });

    const initialPx = starA.mass * starA.vx + starB.mass * starB.vx;
    const initialPy = starA.mass * starA.vy + starB.mass * starB.vy;

    const mergedRemoved: CelestialBody[] = [];
    stepPhysics([starA, starB], [], defaultSettings, 0.01, (b) => mergedRemoved.push(b));

    const finalPx = starA.mass * starA.vx;
    const finalPy = starA.mass * starA.vy;

    expect(finalPx).toBeCloseTo(initialPx, 2);
    expect(finalPy).toBeCloseTo(initialPy, 2);
    expect(starA.vx).toBeCloseTo(0.0, 2);
    expect(starA.vy).toBeCloseTo(2.0, 2);
  });

  it('Астрофизические пределы масс: Чандрасекар (1.44 M☉) и Оппенгеймер-Волков (2.80 M☉)', () => {
    expect(CHANDRASEKHAR_LIMIT).toBe(1.44);
    expect(TOV_LIMIT).toBe(2.80);
  });

  it('Устойчивость кеплеровской орбиты на 500 шагах интегратора Верле', () => {
    const sun = createBody({
      id: 'sun',
      name: 'Sun',
      mass: 100.0,
      radius: 25.0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0
    });

    const orbitalR = 150.0;
    const circularV = Math.sqrt((defaultSettings.G * sun.mass) / orbitalR);
    const planet = createBody({
      id: 'planet',
      name: 'Earth-like',
      mass: 0.001,
      radius: 4.0,
      x: orbitalR,
      y: 0,
      vx: 0,
      vy: circularV
    });

    let minDistance = Infinity;
    let maxDistance = -Infinity;

    for (let step = 0; step < 500; step++) {
      stepPhysics([sun, planet], [], defaultSettings, 0.2, () => {});
      const d = Math.hypot(planet.x - sun.x, planet.y - sun.y);
      if (d < minDistance) minDistance = d;
      if (d > maxDistance) maxDistance = d;
    }

    const deltaR = maxDistance - minDistance;
    const relativeEccentricity = deltaR / orbitalR;

    expect(relativeEccentricity).toBeLessThan(0.04);
  });
});
