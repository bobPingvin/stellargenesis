/**
 * Automated Edge Cases & Robustness Test Suite for StellarGenesis
 * Tests boundary conditions, zero/negative guards, relativistic extremes,
 * and data integrity under stress.
 */

import { describe, it, expect } from 'vitest';
import {
  createBody,
  stepPhysics,
  SPEED_OF_LIGHT,
  getSpectralClass,
  computeDopplerFromVx,
  getDopplerBeamingIntensity,
  applyDopplerToColor
} from '../src/physics/engine';
import {
  formatRadiusKm,
  getRadiusRatioToEarth,
  getPhysicalRadiusKm,
  calculate3DViewerSphereRadius
} from '../src/physics/celestialScales';
import { createSnapshot, cloneBody, cloneBodies } from '../src/physics/history';
import { buildPresetScenario, PRESETS_CATALOG } from '../src/physics/presets';
import { CelestialBody, Particle, SimulationSettings } from '../src/types';

describe('Edge Cases & Defensive Programming: Celestial Body Factory', () => {
  it('должен корректно обрабатывать нулевую или отрицательную массу с безопасным минимумом', () => {
    const zeroMassBody = createBody({ mass: 0 });
    expect(zeroMassBody.mass).toBe(0);
    expect(zeroMassBody.radius).toBeGreaterThanOrEqual(8);
    expect(Number.isFinite(zeroMassBody.radius)).toBe(true);
  });

  it('должен гарантировать конечные значения температуры и радиуса при экстремальной массе', () => {
    const hyperMassive = createBody({ mass: 1e15 });
    expect(Number.isFinite(hyperMassive.radius)).toBe(true);
    expect(Number.isFinite(hyperMassive.Tcore)).toBe(true);
    expect(hyperMassive.Tcore).toBeGreaterThan(0);
  });

  it('должен возвращать M класс для ультра-холодных тел', () => {
    const coldBody = createBody({ Teff: 100 });
    expect(getSpectralClass(coldBody)).toBe('M');
  });

  it('должен возвращать O класс для ультра-горячих звезд с температурой выше 50000K', () => {
    const hotStar = createBody({ Teff: 60000 });
    expect(getSpectralClass(hotStar)).toBe('O');
  });
});

describe('Edge Cases: Relativistic Velocity Clamping & Integrator Safety', () => {
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

  it('должен безопасно обрабатывать пустой массив тел без исключений', () => {
    const bodies: CelestialBody[] = [];
    const particles: Particle[] = [];
    expect(() => {
      stepPhysics(bodies, particles, defaultSettings, 0.1, () => {});
    }).not.toThrow();
  });

  it('должен строго удерживать скорость в пределах SPEED_OF_LIGHT при сверхвысоких начальных импульсах', () => {
    const ultraFast = createBody({
      id: 'fast-1',
      x: 0,
      y: 0,
      vx: 1000,
      vy: 1000,
      mass: 1.0
    });

    stepPhysics([ultraFast], [], defaultSettings, 0.05, () => {});

    const speed = Math.hypot(ultraFast.vx, ultraFast.vy);
    expect(speed).toBeLessThanOrEqual(SPEED_OF_LIGHT + 1e-5);
    expect(Number.isFinite(ultraFast.x)).toBe(true);
    expect(Number.isFinite(ultraFast.y)).toBe(true);
  });

  it('должен защищать от деления на ноль при совпадении координат двух тел (r = 0)', () => {
    const b1 = createBody({ id: 'co-1', x: 50, y: 50, vx: 0, vy: 0, mass: 2.0 });
    const b2 = createBody({ id: 'co-2', x: 50, y: 50, vx: 0, vy: 0, mass: 2.0 });

    expect(() => {
      stepPhysics([b1, b2], [], defaultSettings, 0.1, () => {});
    }).not.toThrow();

    expect(Number.isNaN(b1.x)).toBe(false);
    expect(Number.isNaN(b1.vx)).toBe(false);
  });
});

describe('Edge Cases: Relativistic Doppler & Beaming Optics', () => {
  it('computeDopplerFromVx должен вычислять z: z >= -1 (блюшифт ограничен -1)', () => {
    const shiftPositive = computeDopplerFromVx(SPEED_OF_LIGHT * 2);
    const shiftNegative = computeDopplerFromVx(-SPEED_OF_LIGHT * 2);

    expect(shiftPositive).toBeGreaterThan(0);
    expect(shiftNegative).toBeLessThan(0);
    expect(shiftNegative).toBeGreaterThanOrEqual(-1.0);
  });

  it('getDopplerBeamingIntensity должен возвращать 1.0 при нулевой скорости', () => {
    const intensity = getDopplerBeamingIntensity(0);
    expect(intensity).toBeCloseTo(1.0, 3);
  });

  it('applyDopplerToColor должен возвращать валидный hex-цвет при любых сдвигах', () => {
    const hexRegex = /^#[0-9a-f]{6}$/i;
    expect(applyDopplerToColor('#ffffff', 0.8)).toMatch(hexRegex);
    expect(applyDopplerToColor('#ffffff', -0.8)).toMatch(hexRegex);
    expect(applyDopplerToColor('#38bdf8', 0.0)).toMatch(hexRegex);
  });
});

describe('Edge Cases: Celestial Scales & Unit Conversions', () => {
  it('formatRadiusKm должен форматировать реальный и симуляционный радиус', () => {
    const earth = createBody({ planetKey: 'earth', realRadiusKm: 6371 });
    const sun = createBody({ mass: 1.0 });

    const earthStr = formatRadiusKm(earth);
    const sunStr = formatRadiusKm(sun);

    expect(earthStr).toContain('км');
    expect(sunStr).toContain('км');
  });

  it('getRadiusRatioToEarth должен возвращать 1.0 для Земли', () => {
    const earth = createBody({ planetKey: 'earth', realRadiusKm: 6371 });
    expect(getRadiusRatioToEarth(earth)).toBeCloseTo(1.0, 1);
  });

  it('calculate3DViewerSphereRadius должен возвращать положительное конечное значение для любого тела', () => {
    const blackHole = createBody({ remnantType: 'black_hole', mass: 100 });
    const tinyAsteroid = createBody({ mass: 0.00001, radius: 2 });

    const rBhReal = calculate3DViewerSphereRadius(blackHole, 1200, 800, 2.5, 'real');
    const rBhFocus = calculate3DViewerSphereRadius(blackHole, 1200, 800, 2.5, 'focus');
    const rAstReal = calculate3DViewerSphereRadius(tinyAsteroid, 1200, 800, 2.5, 'real');

    expect(rBhReal).toBeGreaterThan(0);
    expect(rBhFocus).toBeGreaterThan(0);
    expect(rAstReal).toBeGreaterThan(0);
    expect(Number.isFinite(rBhReal)).toBe(true);
    expect(Number.isFinite(rBhFocus)).toBe(true);
    expect(Number.isFinite(rAstReal)).toBe(true);
  });
});

describe('Edge Cases: Presets Catalog Consistency', () => {
  it('все пресеты каталога должны успешно генерировать сценарии без ошибок', () => {
    const presetIds = PRESETS_CATALOG.map(p => p.id);

    for (const pid of presetIds) {
      const scenario = buildPresetScenario(pid, 1.2);
      expect(scenario.bodies.length + scenario.particles.length).toBeGreaterThan(0);
      expect(scenario.cameraZoom).toBeGreaterThan(0);
      expect(Number.isFinite(scenario.cameraZoom)).toBe(true);

      for (const b of scenario.bodies) {
        expect(Number.isFinite(b.x)).toBe(true);
        expect(Number.isFinite(b.y)).toBe(true);
        expect(Number.isFinite(b.vx)).toBe(true);
        expect(Number.isFinite(b.vy)).toBe(true);
        expect(b.mass).toBeGreaterThan(0);
      }
    }
  });
});
