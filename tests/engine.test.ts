import { describe, it, expect } from 'vitest';
import {
  createBody,
  stepPhysics,
  SPEED_OF_LIGHT,
  CHANDRASEKHAR_LIMIT,
  TOV_LIMIT,
  computeDopplerFromVx,
  getDopplerBeamingIntensity,
  applyDopplerToColor,
  triggerStarCollapse,
  getRemainingFuelPercent
} from '../src/physics/engine';
import { CelestialBody, Particle, SimulationSettings } from '../src/types';

describe('Astrophysics Engine: Celestial Body Factory (createBody)', () => {
  it('должен создавать тело с корректными параметрами по умолчанию', () => {
    const body = createBody();
    expect(body.id).toBeDefined();
    expect(body.mass).toBe(1.0);
    expect(body.radius).toBeGreaterThan(0);
    expect(body.evolutionStage).toBe('main_sequence');
    expect(body.composition.H).toBe(0.75);
    expect(body.composition.He).toBe(0.23);
    expect(body.composition.Fe).toBe(0.0);
  });

  it('должен корректно инициализировать планету и флаг isPlanet', () => {
    const planet = createBody({
      name: 'Земля',
      planetKey: 'earth',
      mass: 0.000003,
      radius: 6.0
    });
    expect(planet.isPlanet).toBe(true);
    expect(planet.planetKey).toBe('earth');
    expect(planet.name).toBe('Земля');
  });

  it('должен назначать стадию black_hole для компактного остатка', () => {
    const bh = createBody({
      name: 'Singularity-X',
      remnantType: 'black_hole',
      mass: 15.0
    });
    expect(bh.evolutionStage).toBe('black_hole');
    expect(bh.remnantType).toBe('black_hole');
    expect(bh.isRemnant).toBe(true);
  });

  it('должен назначать стадию pulsar для нейтронной звезды', () => {
    const pulsar = createBody({
      name: 'PSR J0537',
      remnantType: 'pulsar',
      mass: 1.8
    });
    expect(pulsar.evolutionStage).toBe('pulsar');
    expect(pulsar.remnantType).toBe('pulsar');
    expect(pulsar.spinRate).toBeGreaterThan(0);
  });
});

describe('N-body Gravitation & Velocity Verlet Integration (stepPhysics)', () => {
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

  it('должен перемещать тело согласно закону инерции при отсутствии сил', () => {
    const loneStar = createBody({ x: 10, y: 20, vx: 5, vy: -2 });
    const bodies = [loneStar];
    const particles: Particle[] = [];

    stepPhysics(bodies, particles, defaultSettings, 1.0, () => {});

    expect(loneStar.x).toBeCloseTo(15.0, 2);
    expect(loneStar.y).toBeCloseTo(18.0, 2);
  });

  it('должен притягивать два тела в соответствии с гравитацией Ньютона', () => {
    const b1 = createBody({ x: -50, y: 0, vx: 0, vy: 0, mass: 10 });
    const b2 = createBody({ x: 50, y: 0, vx: 0, vy: 0, mass: 10 });
    const bodies = [b1, b2];

    stepPhysics(bodies, [], defaultSettings, 0.5, () => {});

    expect(b1.vx).toBeGreaterThan(0); // ускоряется вправо к b2
    expect(b2.vx).toBeLessThan(0);    // ускоряется влево к b1
    expect(b1.vx).toBeCloseTo(-b2.vx, 4); // равенство по модулю (действие равно противодействию)
  });

  it('должен предотвращать деление на 0 при r = 0 благодаря фактору смягчения eps = 8.0', () => {
    const b1 = createBody({ x: 100, y: 100, vx: 0, vy: 0, mass: 5 });
    const b2 = createBody({ x: 100, y: 100, vx: 0, vy: 0, mass: 5 });
    const bodies = [b1, b2];
    const removed: CelestialBody[] = [];

    stepPhysics(bodies, [], defaultSettings, 0.05, (v) => removed.push(v));

    expect(Number.isFinite(b1.x)).toBe(true);
    expect(Number.isFinite(b1.vx)).toBe(true);
    expect(Number.isNaN(b1.x)).toBe(false);
    expect(removed).toHaveLength(1); // слияние при коллизии
    expect(b1.mass).toBeCloseTo(10.0, 4);
  });

  it('должен строго сохранять линейный импульс при неупругом слиянии тел', () => {
    const starA = createBody({ x: 0, y: 0, vx: 3.0, vy: 1.0, mass: 4.0, radius: 15 });
    const starB = createBody({ x: 1, y: 1, vx: -6.0, vy: 4.0, mass: 2.0, radius: 10 });
    const bodies = [starA, starB];

    const initialPx = starA.mass * starA.vx + starB.mass * starB.vx; // 4*3 + 2*(-6) = 0
    const initialPy = starA.mass * starA.vy + starB.mass * starB.vy; // 4*1 + 2*4 = 12

    const removed: CelestialBody[] = [];
    stepPhysics(bodies, [], defaultSettings, 0.01, (v) => removed.push(v));

    const finalPx = starA.mass * starA.vx;
    const finalPy = starA.mass * starA.vy;

    expect(finalPx).toBeCloseTo(initialPx, 2);
    expect(finalPy).toBeCloseTo(initialPy, 2);
    expect(starA.vx).toBeCloseTo(0.0, 2);
    expect(starA.vy).toBeCloseTo(2.0, 2); // 12 / 6 = 2
  });

  it('должен жестко ограничивать релятивистскую скорость пределом SPEED_OF_LIGHT (60.0 px/s)', () => {
    expect(SPEED_OF_LIGHT).toBe(60.0);

    const bh = createBody({ x: 0, y: 0, mass: 1e9 });
    const probe = createBody({ x: 2, y: 0, vx: 120.0, vy: 80.0, mass: 0.001 });

    stepPhysics([bh, probe], [], defaultSettings, 0.1, () => {});

    const speed = Math.hypot(probe.vx, probe.vy);
    expect(speed).toBeLessThanOrEqual(SPEED_OF_LIGHT + 1e-5);
    expect(Number.isFinite(probe.x)).toBe(true);
  });
});

describe('Relativistic Doppler Effect & Beaming', () => {
  it('должен вычислять блюшифт (z < 0) при приближении объекта к наблюдателю', () => {
    const zApproaching = computeDopplerFromVx(-3.0);
    expect(zApproaching).toBeLessThan(0);
  });

  it('должен вычислять редшифт (z > 0) при удалении объекта от наблюдателя', () => {
    const zReceding = computeDopplerFromVx(3.0);
    expect(zReceding).toBeGreaterThan(0);
  });

  it('должен усиливать светимость приближающейся материи (релятивистский биминг)', () => {
    const intensityApproaching = getDopplerBeamingIntensity(-0.5);
    const intensityReceding = getDopplerBeamingIntensity(0.5);
    expect(intensityApproaching).toBeGreaterThan(1.0);
    expect(intensityReceding).toBeLessThan(1.0);
  });

  it('должен модифицировать цвет объекта при сильном релятивистском сдвиге', () => {
    const baseColor = '#fde047'; // Солнечный желтый цвет
    const shiftedBlue = applyDopplerToColor(baseColor, -0.6);
    const shiftedRed = applyDopplerToColor(baseColor, 0.6);

    expect(shiftedBlue).not.toBe(baseColor);
    expect(shiftedRed).not.toBe(baseColor);
    expect(shiftedBlue).toBe('#ffffff');
    expect(shiftedRed).toBe('#7f1d1d');
  });
});

describe('Astrophysical Stellar Collapse & Mass Limits', () => {
  it('должен соблюдать предел Чандрасекара (1.44 M☉)', () => {
    expect(CHANDRASEKHAR_LIMIT).toBe(1.44);
  });

  it('должен соблюдать предел Оппенгеймера-Волкова (TOV, 2.80 M☉)', () => {
    expect(TOV_LIMIT).toBe(2.80);
  });

  it('должен порождать планетарную туманность для звезд малой массы (< 8 M☉)', () => {
    const star = createBody({ mass: 3.0, radius: 12.0 });
    const particles: Particle[] = [];
    let notified = false;

    triggerStarCollapse(star, particles, () => { notified = true; });

    expect(star.remnantType).toBe('white_dwarf');
    expect(particles.length).toBeGreaterThan(0);
    expect(notified).toBe(true);
  });

  it('должен порождать Сверхновую и Пульсар для звезд промежуточной массы (8-20 M☉)', () => {
    const star = createBody({ mass: 14.0, radius: 25.0 });
    const particles: Particle[] = [];

    triggerStarCollapse(star, particles, () => {});

    expect(star.remnantType).toBe('pulsar');
    expect(particles.length).toBeGreaterThan(50);
  });

  it('должен коллапсировать в Черную дыру для сверхмассивных звезд (> 20 M☉)', () => {
    const star = createBody({ mass: 30.0, radius: 40.0 });
    const particles: Particle[] = [];

    triggerStarCollapse(star, particles, () => {});

    expect(star.remnantType).toBe('black_hole');
    expect(star.evolutionStage).toBe('black_hole');
  });

  it('должен рассчитывать уровень термоядерного топлива звезды от 100% до 0%', () => {
    const starFresh = createBody({
      mass: 1.0,
      composition: { H: 0.74, He: 0.24, C: 0.018, Fe: 0.002 }
    });
    expect(getRemainingFuelPercent(starFresh)).toBe(100);

    const starMidAge = createBody({
      mass: 1.0,
      composition: { H: 0.35, He: 0.63, C: 0.018, Fe: 0.002 }
    });
    expect(getRemainingFuelPercent(starMidAge)).toBeLessThan(100);
    expect(getRemainingFuelPercent(starMidAge)).toBeGreaterThan(40);

    const starExhausted = createBody({
      mass: 1.0,
      composition: { H: 0.0, He: 0.02, C: 0.96, Fe: 0.02 }
    });
    expect(getRemainingFuelPercent(starExhausted)).toBeLessThanOrEqual(5);

    const whiteDwarf = createBody({
      mass: 0.6,
      remnantType: 'white_dwarf'
    });
    expect(getRemainingFuelPercent(whiteDwarf)).toBe(0);
  });

  it('должен автономно расходовать топливо звезды в цикле симуляции со временем', () => {
    const star = createBody({
      mass: 10.0,
      composition: { H: 0.74, He: 0.24, C: 0.018, Fe: 0.002 }
    });
    const evoSettings: SimulationSettings = {
      G: 1.2,
      softening: 8.0,
      timeSpeed: 1,
      showTrails: false,
      showVectors: false,
      soundEnabled: false,
      dopplerEffect: true,
      stellarEvolution: true,
      stellarEvolutionSpeed: 2.0,
      graphicsQuality: 'balanced',
      enableLensingShader: false,
      maxParticles: 500,
      showSpacetimeGrid: false,
      adaptiveGrid: false
    };

    const initialFuel = getRemainingFuelPercent(star);
    const initialH = star.composition.H;

    // Simulate 120 steps
    for (let i = 0; i < 120; i++) {
      stepPhysics([star], [], evoSettings, 0.035, () => {});
    }

    expect(star.composition.H).toBeLessThan(initialH);
    expect(getRemainingFuelPercent(star)).toBeLessThan(initialFuel);
  });

  it('должен поглощать и испарять тела, попадающие в фотосферу звезды (Солнца)', () => {
    const sun = createBody({
      name: 'Солнце',
      planetKey: 'sun',
      mass: 1.0,
      radius: 36.0,
      x: 0,
      y: 0
    });
    const comet = createBody({
      name: 'Падающая комета',
      isPlanet: true,
      mass: 0.005,
      radius: 2.0,
      x: 35.0, // Inside stellar radius (36.0)
      y: 0,
      vx: -1.0,
      vy: 0
    });

    const bodies = [sun, comet];
    const particles: Particle[] = [];
    const removed: CelestialBody[] = [];
    const simSettings: SimulationSettings = {
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

    stepPhysics(bodies, particles, simSettings, 0.035, (victim) => {
      removed.push(victim);
    });

    expect(removed).toHaveLength(1);
    expect(removed[0].name).toBe('Падающая комета');
    expect(sun.mass).toBeCloseTo(1.005, 4);
    expect(particles.length).toBeGreaterThan(0); // Solar flare plasma splash particles
  });
});
