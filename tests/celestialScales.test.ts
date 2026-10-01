import { describe, it, expect } from 'vitest';
import {
  EARTH_RADIUS_KM,
  SUN_RADIUS_KM,
  JUPITER_RADIUS_KM,
  getPhysicalRadiusKm,
  getRadiusRatioToEarth,
  formatRadiusKm,
  calculate3DViewerSphereRadius
} from '../src/physics/celestialScales';
import { createBody } from '../src/physics/engine';

describe('Celestial Scales & Radii (celestialScales)', () => {
  it('должен возвращать точный радиус Земли (6371 км)', () => {
    const earth = createBody({ planetKey: 'earth', name: 'Earth' });
    expect(getPhysicalRadiusKm(earth)).toBe(EARTH_RADIUS_KM);
    expect(getRadiusRatioToEarth(earth)).toBeCloseTo(1.0, 4);
  });

  it('должен возвращать точный радиус Солнца (696340 км)', () => {
    const sun = createBody({ planetKey: 'sun', name: 'Sun' });
    expect(getPhysicalRadiusKm(sun)).toBe(SUN_RADIUS_KM);
    expect(getRadiusRatioToEarth(sun)).toBeCloseTo(SUN_RADIUS_KM / EARTH_RADIUS_KM, 2);
  });

  it('должен возвращать точный радиус Юпитера (69911 км)', () => {
    const jupiter = createBody({ planetKey: 'jupiter', name: 'Jupiter' });
    expect(getPhysicalRadiusKm(jupiter)).toBe(JUPITER_RADIUS_KM);
  });

  it('должен корректно вычислять радиус Шварцшильда для Черной дыры', () => {
    const bh = createBody({ remnantType: 'black_hole', mass: 10.0 });
    // Rs ≈ 2.953 * mass
    const expectedKm = 2.953 * 10.0;
    expect(getPhysicalRadiusKm(bh)).toBeCloseTo(expectedKm, 1);
  });

  it('должен возвращать 12 км для типичного пульсара / нейтронной звезды', () => {
    const pulsar = createBody({ remnantType: 'pulsar', mass: 1.5 });
    expect(getPhysicalRadiusKm(pulsar)).toBe(12.0);
  });

  it('должен форматировать радиусы на русском языке с единицами измерения', () => {
    const earth = createBody({ planetKey: 'earth' });
    const formattedEarth = formatRadiusKm(earth);
    expect(formattedEarth).toContain('км');

    const pulsar = createBody({ remnantType: 'pulsar' });
    const formattedPulsar = formatRadiusKm(pulsar);
    expect(formattedPulsar).toContain('12,00 км');
  });

  it('должен вычислять адекватный радиус сферы для 3D-инспектора', () => {
    const earth = createBody({ planetKey: 'earth' });
    const screenRadius = calculate3DViewerSphereRadius(earth, 1000, 800, 1.0, 'real');
    expect(screenRadius).toBeGreaterThan(20);
    expect(screenRadius).toBeLessThan(500);

    const focusRadius = calculate3DViewerSphereRadius(earth, 1000, 800, 1.0, 'focus');
    expect(focusRadius).toBeGreaterThan(0);
  });
});
