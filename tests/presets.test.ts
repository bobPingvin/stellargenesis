import { describe, it, expect } from 'vitest';
import { PRESETS_CATALOG, buildPresetScenario } from '../src/physics/presets';

describe('Astrophysical Presets Catalog & Scenario Builder', () => {
  it('каталог пресетов должен содержать ключевые сценарии', () => {
    expect(PRESETS_CATALOG.length).toBeGreaterThanOrEqual(6);
    const ids = PRESETS_CATALOG.map(p => p.id);
    expect(ids).toContain('solar');
    expect(ids).toContain('crab_pulsar');
    expect(ids).toContain('massive_sn');
    expect(ids).toContain('hyper_bh');
  });

  it('сценарий solar должен генерировать Солнце и основные планеты', () => {
    const scenario = buildPresetScenario('solar', 1.2);
    expect(scenario.bodies.length).toBeGreaterThanOrEqual(9);
    expect(scenario.selectedId).toBeDefined();
    expect(scenario.cameraZoom).toBeCloseTo(0.65, 2);

    const sun = scenario.bodies.find(b => b.planetKey === 'sun');
    expect(sun).toBeDefined();
    expect(sun?.mass).toBe(1.0);

    const earth = scenario.bodies.find(b => b.planetKey === 'earth');
    expect(earth).toBeDefined();
    expect(earth?.isPlanet).toBe(true);
  });

  it('сценарий crab_pulsar должен содержать компактный пульсар и газ туманности', () => {
    const scenario = buildPresetScenario('crab_pulsar', 1.2);
    const pulsar = scenario.bodies.find(b => b.remnantType === 'pulsar');
    expect(pulsar).toBeDefined();
    expect(scenario.particles.length).toBeGreaterThan(0);
  });

  it('сценарий hyper_bh должен содержать релятивистскую черную дыру', () => {
    const scenario = buildPresetScenario('hyper_bh', 1.2);
    expect(scenario.bodies.length).toBeGreaterThan(0);
    const heavyStar = scenario.bodies[0];
    expect(heavyStar.mass).toBeGreaterThanOrEqual(20.0);
  });
});
