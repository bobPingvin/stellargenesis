/**
 * Astrophysics Engine: StellarGenesis
 * Velocity Verlet N-Body Gravitation, Hydrostatic Balance, Nucleosynthesis & Relativistic Collapse
 */

import { CelestialBody, Particle, RemnantType, SpectralClass, SimulationSettings } from '../types';
import { sound } from './audio';

export const SPEED_OF_LIGHT = 60.0;
export const CHANDRASEKHAR_LIMIT = 1.44; // M☉
export const TOV_LIMIT = 2.80;           // Tolman-Oppenheimer-Volkoff limit (M☉)

// Physical & Numerical Simulation Constants (Inspection NC-01 Refactoring)
export const ACCRETION_EFFICIENCY = 0.85;            // 85% of stripped mass accreted to singularity
export const DIRECT_COLLISION_BH_ACCRETION = 0.90;   // 90% of colliding companion mass absorbed by BH
export const MAX_TIDAL_STRETCH_FACTOR = 6.5;         // Maximum spaghettification elongation ratio
export const TIDAL_INTERACTION_ZONE_FACTOR = 25.0;   // Distance multiplier for mutual tidal deformation
export const FILAMENT_GRAVITY_DRAG = 0.012;          // Drag coefficient for relativistic plasma filaments
export const IMPACT_KINETIC_HEATING_MK = 12.0;       // Core temperature surge (MK) upon stellar collision

export interface SpectralClassData {
  name: string;
  russianName: string;
  color: string;
  halo: string;
  temp: number;
  description: string;
}

export const SPECTRAL_DATA: Record<SpectralClass, SpectralClassData> = {
  O: {
    name: 'O-Class',
    russianName: 'Голубой сверхгигант (O)',
    color: '#60a5fa',
    halo: 'rgba(96, 165, 250, 0.45)',
    temp: 35000,
    description: 'Исключительно горячая, массивная и яркая звезда с мощным ультрафиолетовым излучением.'
  },
  B: {
    name: 'B-Class',
    russianName: 'Бело-голубая звезда (B)',
    color: '#93c5fd',
    halo: 'rgba(147, 197, 253, 0.40)',
    temp: 20000,
    description: 'Массивная горячая звезда спектрального класса B, сжигающая водород с колоссальной скоростью.'
  },
  A: {
    name: 'A-Class',
    russianName: 'Белая звезда (A)',
    color: '#f8fafc',
    halo: 'rgba(248, 250, 252, 0.35)',
    temp: 9500,
    description: 'Яркая белая звезда (аналог Сириуса или Веги) с выраженными водородными линиями Бальмера.'
  },
  F: {
    name: 'F-Class',
    russianName: 'Желто-белая звезда (F)',
    color: '#fef08a',
    halo: 'rgba(254, 240, 138, 0.35)',
    temp: 7000,
    description: 'Звезда промежуточной массы (аналог Проциона), умеренно стабильная на Главной последовательности.'
  },
  G: {
    name: 'G-Class',
    russianName: 'Желтый карлик (G, Солнечный тип)',
    color: '#fde047',
    halo: 'rgba(253, 224, 71, 0.40)',
    temp: 5800,
    description: 'Стабильная звезда спектрального класса G (как наше Солнце). Время жизни ~10 млрд лет.'
  },
  K: {
    name: 'K-Class',
    russianName: 'Оранжевый карлик (K)',
    color: '#fb923c',
    halo: 'rgba(251, 146, 60, 0.40)',
    temp: 4200,
    description: 'Долгоживущая спокойная оранжевая звезда с высокой стабильностью и низкой светимостью.'
  },
  M: {
    name: 'M-Class',
    russianName: 'Красный карлик (M)',
    color: '#ef4444',
    halo: 'rgba(239, 68, 68, 0.45)',
    temp: 3100,
    description: 'Холодная маломассивная звезда. Способна гореть сотни миллиардов лет благодаря полной конвекции.'
  },
  RED_GIANT: {
    name: 'Красный гигант',
    russianName: 'Красный гигант / Сверхгигант',
    color: '#f87171',
    halo: 'rgba(248, 113, 113, 0.60)',
    temp: 3400,
    description: 'Оболочка колоссально раздута лучевым давлением тройной гелиевой реакции (3-alpha He ➔ C).'
  },
  WHITE_DWARF: {
    name: 'Белый карлик',
    russianName: 'Белый карлик (Вырожденный)',
    color: '#e0f2fe',
    halo: 'rgba(224, 242, 254, 0.70)',
    temp: 40000,
    description: 'Компактный остаток звезды малой массы (< 1.44 M☉). Удерживается давлением вырожденных электронов.'
  },
  PULSAR: {
    name: 'Пульсар',
    russianName: 'Нейтронная звезда (Пульсар)',
    color: '#38bdf8',
    halo: 'rgba(56, 189, 248, 0.85)',
    temp: 100000,
    description: 'Сверхплотное ядро из нейтронов с бешеной скоростью вращения и релятивистскими магнитными джетами.'
  },
  BLACK_HOLE: {
    name: 'Черная дыра',
    russianName: 'Черная дыра (Сингулярность)',
    color: '#000000',
    halo: 'rgba(168, 85, 247, 0.50)',
    temp: 0,
    description: 'Гравитационный коллапс выше предела Оппенгеймера-Волкова (> 2.8 M☉). Горизонт событий не выпускает свет.'
  }
};

/**
 * Determines astrophysical spectral class / remnant classification based on surface temperature and remnant state.
 *
 * @param body - Target celestial body
 * @returns SpectralClass - Spectral identifier (O, B, A, F, G, K, M, RED_GIANT, WHITE_DWARF, PULSAR, BLACK_HOLE)
 */
export function getSpectralClass(body: CelestialBody): SpectralClass {
  if (body.remnantType === 'black_hole') return 'BLACK_HOLE';
  if (body.remnantType === 'pulsar') return 'PULSAR';
  if (body.remnantType === 'white_dwarf') return 'WHITE_DWARF';
  if (body.radius > 24.0) return 'RED_GIANT';

  if (body.Teff >= 30000) return 'O';
  if (body.Teff >= 11000) return 'B';
  if (body.Teff >= 7500) return 'A';
  if (body.Teff >= 6000) return 'F';
  if (body.Teff >= 5000) return 'G';
  if (body.Teff >= 3500) return 'K';
  return 'M';
}

/**
 * Factory function for creating fully initialized celestial bodies with realistic astrophysical defaults.
 *
 * @param params - Partial configuration to override default values
 * @returns CelestialBody - Complete celestial body entity
 */
export function createBody(params: Partial<CelestialBody> = {}): CelestialBody {
  const mass = params.mass ?? 1.0;
  const initialRadius = params.radius ?? Math.max(8, Math.pow(mass, 0.7) * 12);
  
  const initialEvolutionStage = params.evolutionStage ?? (
    params.remnantType === 'black_hole' ? 'black_hole' :
    params.remnantType === 'pulsar' ? 'pulsar' :
    params.remnantType === 'white_dwarf' ? 'white_dwarf' :
    (params.composition && params.composition.Fe > 0.25) ? 'iron_crisis' :
    (params.composition && (params.composition.C > 0.2 || params.composition.He > 0.5)) ? (mass >= 8.0 ? 'supergiant' : 'red_giant') :
    'main_sequence'
  );

  return {
    id: params.id || 'body_' + Math.random().toString(36).substring(2, 9),
    name: params.name || `Звезда SG-${Math.floor(Math.random() * 800 + 100)}`,
    x: params.x ?? 0,
    y: params.y ?? 0,
    vx: params.vx ?? 0,
    vy: params.vy ?? 0,
    ax: 0,
    ay: 0,
    mass: mass,
    initialMass: params.initialMass ?? mass,
    stellarAge: params.stellarAge ?? 0,
    evolutionStage: initialEvolutionStage,
    radius: initialRadius,
    realRadiusKm: params.realRadiusKm,
    targetRadius: initialRadius,
    radialVelocity: 0,
    Tcore: params.Tcore ?? (12.0 + mass * 3.5),
    Teff: params.Teff ?? 5800,
    luminosity: params.luminosity ?? 1.0,
    composition: params.composition ? { ...params.composition } : {
      H: 0.75,
      He: 0.23,
      C: 0.02,
      Fe: 0.0
    },
    remnantType: params.remnantType ?? null,
    isRemnant: params.isRemnant ?? (params.remnantType !== null && params.remnantType !== undefined),
    spinRate: params.spinRate ?? 0.03,
    rotationAngle: Math.random() * Math.PI * 2,
    hasExploded: params.hasExploded ?? false,
    P_grav: 1.0,
    P_gas: 0.5,
    P_rad: 0.5,
    balanceRatio: 1.0,
    trail: [],

    // Planetary identification & visuals
    planetKey: params.planetKey,
    isPlanet: params.isPlanet ?? (params.planetKey !== undefined && params.planetKey !== 'sun' && params.planetKey !== 'generic_star' && params.planetKey !== 'black_hole' && params.planetKey !== 'pulsar'),
    hasRings: params.hasRings ?? false,
    ringInnerRadius: params.ringInnerRadius,
    ringOuterRadius: params.ringOuterRadius,
    ringColor: params.ringColor,
    parentBodyId: params.parentBodyId,
    axialTilt: params.axialTilt ?? 0,
    rotationPeriodHours: params.rotationPeriodHours ?? 24,
    atmosphereColor: params.atmosphereColor,
    customDescription: params.customDescription
  };
}

/**
 * Creates an accretion or nebula gas particle.
 *
 * @param x - Initial X coordinate
 * @param y - Initial Y coordinate
 * @param vx - Initial X velocity
 * @param vy - Initial Y velocity
 * @param color - Hex/RGBA color code
 * @param radius - Visual particle radius
 * @param life - Lifetime in ticks
 * @param isGas - Whether particle is subject to thermodynamic pressure
 * @param mass - Gravitational mass of particle
 * @returns Particle entity
 */
export function createParticle(
  x: number, y: number,
  vx: number, vy: number,
  color: string,
  radius: number,
  life: number,
  isGas: boolean = false,
  mass: number = 0.005
): Particle {
  return {
    x, y, vx, vy, ax: 0, ay: 0,
    color, radius, life, maxLife: life, isGas, mass
  };
}

/**
 * Planetary Nebula gas ejection for low-to-intermediate mass stars (M < 8 M☉)
 */
export function createPlanetaryNebulaBurst(body: CelestialBody, particles: Particle[]) {
  sound.playNebulaBirth();
  const count = 75;
  // Spectral emission line colors: [O III] 500.7 nm (cyan/emerald), H-alpha 656.3 nm (rose/magenta), He I (gold)
  const colors = ['#38bdf8', '#34d399', '#67e8f9', '#f472b6', '#c084fc', '#fef08a'];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    // Moderate expansion velocity of planetary nebula envelopes (20-45 km/s)
    const speed = Math.random() * 3.8 + 1.2;
    const col = colors[Math.floor(Math.random() * colors.length)];
    particles.push(createParticle(
      body.x + Math.cos(angle) * (body.radius * 0.6),
      body.y + Math.sin(angle) * (body.radius * 0.6),
      body.vx + Math.cos(angle) * speed,
      body.vy + Math.sin(angle) * speed,
      col,
      Math.random() * 3.2 + 1.8,
      Math.random() * 140 + 80,
      true, // interstellar gas that can be captured into future accretion
      0.008
    ));
  }
}

/**
 * Supernova visual and particle shockwave creator with multi-layer relativistic ejecta
 */
export function createSupernovaBurst(body: CelestialBody, particles: Particle[], isHypernova: boolean = false) {
  sound.playSupernova();
  const count = isHypernova ? 260 : 180;
  const colors = isHypernova
    ? ['#ffffff', '#67e8f9', '#38bdf8', '#c084fc', '#e879f9', '#f43f5e', '#facc15']
    : ['#ffffff', '#fef08a', '#facc15', '#fb923c', '#f43f5e', '#c084fc', '#38bdf8'];

  const maxSpeed = isHypernova ? 16.0 : 11.0;

  // 1. Relativistic fast shockwave ejecta shell
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    // Multi-velocity shock front
    const velocityTier = Math.random();
    const speed = velocityTier < 0.25
      ? Math.random() * (maxSpeed * 0.4) + 2.0 // Dense inner remnant
      : velocityTier < 0.75
        ? Math.random() * (maxSpeed * 0.8) + maxSpeed * 0.3 // Main blast shell
        : Math.random() * maxSpeed + maxSpeed * 0.6; // High-energy relativistic lead front

    const col = colors[Math.floor(Math.random() * colors.length)];
    particles.push(createParticle(
      body.x + Math.cos(angle) * (body.radius * 0.5),
      body.y + Math.sin(angle) * (body.radius * 0.5),
      body.vx + Math.cos(angle) * speed,
      body.vy + Math.sin(angle) * speed,
      col,
      Math.random() * 5.5 + 2.2,
      Math.random() * 160 + 90,
      true, // interstellar gas that enriches space
      isHypernova ? 0.035 : 0.02
    ));
  }

  // 2. Collimated Relativistic Bipolar Jets for Hypernova (Gamma-Ray Burst - GRB)
  if (isHypernova) {
    const jetAngle = body.rotationAngle || Math.random() * Math.PI * 2;
    for (const jetDir of [jetAngle, jetAngle + Math.PI]) {
      for (let j = 0; j < 35; j++) {
        const spread = (Math.random() - 0.5) * 0.28;
        const beamAngle = jetDir + spread;
        const beamSpeed = Math.random() * 18.0 + 12.0;
        particles.push(createParticle(
          body.x,
          body.y,
          body.vx + Math.cos(beamAngle) * beamSpeed,
          body.vy + Math.sin(beamAngle) * beamSpeed,
          j % 2 === 0 ? '#ffffff' : '#67e8f9',
          Math.random() * 4.0 + 2.0,
          Math.random() * 80 + 40,
          false,
          0.008
        ));
      }
    }
  }
}

/**
 * Automatic Stellar Evolution: Low/Intermediate mass star (M < 8 M☉) -> Planetary Nebula + White Dwarf
 */
export function triggerPlanetaryNebula(
  b: CelestialBody,
  particles: Particle[],
  onNotification?: (title: string, body: string, type: 'supernova' | 'blackhole' | 'info') => void
) {
  b.hasExploded = true;
  createPlanetaryNebulaBurst(b, particles);

  b.remnantType = 'white_dwarf';
  b.isRemnant = true;
  b.evolutionStage = 'white_dwarf';
  b.name = 'Белый карлик ' + b.name.replace(/^(Звезда |Сверхгигант |Гигант |Желтый карлик |Красный карлик )/, '');
  b.mass = Math.min(1.4, Math.max(0.45, b.mass * 0.55));
  b.radius = 4.5;
  b.targetRadius = 4.5;
  b.Teff = 38000;
  b.Tcore = 40.0;
  b.composition = { H: 0.01, He: 0.04, C: 0.85, Fe: 0.10 };

  onNotification?.(
    '⚪ Рождение Белого карлика и туманности',
    `Звезда ${b.name} (< 8 M☉) исчерпала водород и гелий. Оболочка сброшена в космос как планетарная туманность, а углеродно-кислородное ядро стабилизировано давлением вырожденных электронов.`,
    'info'
  );
}

/**
 * Automatic Stellar Evolution: Massive star (8 M☉ <= M < 20 M☉) -> Supernova Type II + Pulsar
 */
export function triggerSupernovaTypeII(
  b: CelestialBody,
  particles: Particle[],
  onNotification?: (title: string, body: string, type: 'supernova' | 'blackhole' | 'info') => void
) {
  b.hasExploded = true;
  createSupernovaBurst(b, particles, false);

  b.remnantType = 'pulsar';
  b.isRemnant = true;
  b.evolutionStage = 'pulsar';
  b.name = 'Пульсар PSR-' + Math.floor(Math.random() * 8000 + 1000);
  b.mass = Math.max(1.4, Math.min(2.2, b.mass * 0.24));
  b.radius = 5.0;
  b.targetRadius = 5.0;
  b.spinRate = 0.35;
  b.Teff = 95000;
  b.Tcore = 120.0;
  b.composition = { H: 0.0, He: 0.0, C: 0.05, Fe: 0.95 };

  onNotification?.(
    '⚡ Вспышка Сверхновой (Тип II)',
    `Массивная звезда ${b.name} (${b.mass.toFixed(1)} M☉) завершила термоядерный цикл! Коллапс железного ядра остановлен давлением вырожденных нейтронов — рожден быстровращающийся Пульсар.`,
    'supernova'
  );
}

/**
 * Automatic Stellar Evolution: Supermassive star (M >= 20 M☉) -> Hypernova + Stellar Black Hole
 */
export function triggerHypernovaBlackHole(
  b: CelestialBody,
  particles: Particle[],
  onNotification?: (title: string, body: string, type: 'supernova' | 'blackhole' | 'info') => void
) {
  b.hasExploded = true;
  createSupernovaBurst(b, particles, true);

  b.remnantType = 'black_hole';
  b.isRemnant = true;
  b.evolutionStage = 'black_hole';
  b.name = 'Черная дыра BH-' + Math.floor(Math.random() * 8000 + 1000);
  b.mass = Math.max(3.2, b.mass * 0.58);
  const rs = (2 * 1.2 * b.mass * 12.0) / (SPEED_OF_LIGHT * SPEED_OF_LIGHT);
  b.radius = Math.max(6, rs * 4.0);
  b.targetRadius = b.radius;
  b.Teff = 0;
  b.Tcore = 0;
  b.composition = { H: 0.0, He: 0.0, C: 0.0, Fe: 1.0 };

  // Spawn relativistic swirling accretion ring around newly born black hole
  const diskColors = ['#38bdf8', '#c084fc', '#f43f5e', '#ffffff'];
  for (let d = 0; d < 35; d++) {
    const ringAngle = Math.random() * Math.PI * 2;
    const ringDist = b.radius * (1.6 + Math.random() * 2.2);
    const orbSpeed = Math.sqrt((1.2 * b.mass) / ringDist) * 1.1;
    particles.push(createParticle(
      b.x + Math.cos(ringAngle) * ringDist,
      b.y + Math.sin(ringAngle) * ringDist,
      b.vx - Math.sin(ringAngle) * orbSpeed,
      b.vy + Math.cos(ringAngle) * orbSpeed,
      diskColors[d % diskColors.length],
      Math.random() * 2.5 + 1.2,
      Math.random() * 160 + 90,
      true,
      0.012
    ));
  }

  sound.playTidalDisruption();

  onNotification?.(
    '🕳️ Коллапс в Черную дыру (Гиперновая)',
    `Сверхмассивная звезда ${b.name} (${b.mass.toFixed(1)} M☉) преодолела предел Оппенгеймера-Волкова (> 2.8 M☉)! Ядро бесконечно схлопнулось в гравитационную сингулярность с горизонтом событий.`,
    'blackhole'
  );
}

/**
 * Universal star collapse dispatcher (supports manual trigger and automatic evolution)
 */
export function triggerStarCollapse(
  b: CelestialBody,
  particles: Particle[],
  onNotification?: (title: string, body: string, type: 'supernova' | 'blackhole' | 'info') => void
) {
  if (b.mass < 8.0) {
    triggerPlanetaryNebula(b, particles, onNotification);
  } else if (b.mass < 20.0) {
    triggerSupernovaTypeII(b, particles, onNotification);
  } else {
    triggerHypernovaBlackHole(b, particles, onNotification);
  }
}

/**
 * Calculates relativistic tidal deformation (spaghettification strain) exerted on a body by a heavier attractor.
 * Deduplicated helper (Inspection NC-02 & NC-04).
 *
 * @param body - The celestial body experiencing tidal deformation
 * @param attractor - The massive companion or remnant exerting the gravitational gradient
 * @param dist - Euclidean distance between body centers
 * @param dx - Relative X displacement (attractor.x - body.x)
 * @param dy - Relative Y displacement (attractor.y - body.y)
 */
function computeSingleBodyTidalStretch(
  body: CelestialBody,
  attractor: CelestialBody,
  dist: number,
  dx: number,
  dy: number
): void {
  if (attractor.mass <= body.mass * 1.5 || dist >= body.radius * TIDAL_INTERACTION_ZONE_FACTOR) {
    return;
  }

  const tidalRadius = body.radius * Math.cbrt((2.8 * attractor.mass) / Math.max(0.1, body.mass));
  if (dist <= tidalRadius * 1.8) {
    const proximity = Math.max(0, (tidalRadius * 1.8 - dist) / (tidalRadius * 1.8));
    const stretchVal = 1.0 + Math.pow(proximity, 1.3) * (attractor.remnantType === 'black_hole' ? 5.5 : 2.2);
    const angleToAttractor = Math.atan2(dy, dx);
    if (!body.tidalStretch || stretchVal > body.tidalStretch.factor) {
      body.tidalStretch = {
        factor: Math.min(MAX_TIDAL_STRETCH_FACTOR, stretchVal),
        angle: angleToAttractor
      };
    }
  }
}

/**
 * Processes Tidal Disruption Event (TDE) when a star encounters the strong field of a black hole.
 * Handles continuous relativistic shredding, mass stripping, spaghettification, and accretion flares (NC-03).
 *
 * @param bh - The black hole singularity
 * @param victim - The star being shredded
 * @param dist - Center-to-center distance
 * @param dt - Simulation time delta
 * @param particles - Global particle system buffer for shredded plasma filaments
 * @param onRemoveBody - Callback when victim is completely consumed
 * @param onNotification - Callback for astrophysical events
 * @returns boolean - True if the victim was completely consumed and destroyed
 */
function handleTidalDisruptionEvent(
  bh: CelestialBody,
  victim: CelestialBody,
  dist: number,
  dt: number,
  particles: Particle[],
  onRemoveBody: (victim: CelestialBody) => void,
  onNotification?: (title: string, body: string, type: 'supernova' | 'blackhole' | 'info') => void
): boolean {
  // Hydrodynamic Tidal Radius (Roche Limit) RT = R* * (2.5 * M_BH / M*)^(1/3)
  const tidalRadius = victim.radius * Math.cbrt((2.5 * bh.mass) / Math.max(0.15, victim.mass));
  if (dist > tidalRadius) {
    return false;
  }

  // 1. Spaghettification - extreme tidal elongation along radial line to singularity
  const stretchFactor = Math.min(
    MAX_TIDAL_STRETCH_FACTOR,
    1.0 + ((tidalRadius - dist) / Math.max(10, tidalRadius)) * 5.2
  );
  const angleToBH = Math.atan2(bh.y - victim.y, bh.x - victim.x);

  victim.isDisrupting = true;
  victim.disruptedById = bh.id;
  victim.tidalStretch = { factor: stretchFactor, angle: angleToBH };

  // 2. Relativistic mass shredding & accretion stream
  const stripMass = Math.min(victim.mass * 0.45, (0.04 + 0.35 * (tidalRadius / (dist + 5))) * dt * 4.5);
  victim.mass = Math.max(0.01, victim.mass - stripMass);
  bh.mass += stripMass * ACCRETION_EFFICIENCY;

  victim.radius = Math.max(2.5, Math.pow(Math.max(0.04, victim.mass), 0.7) * 12);
  victim.Teff = Math.min(75000, victim.Teff + 450 * dt);

  // 3. Spawn shredded glowing relativistic plasma filaments curving into accretion disk
  const shredColors = ['#ffffff', '#fef08a', '#facc15', '#fb923c', '#ea580c'];
  const shredCount = Math.min(6, Math.ceil(stripMass * 30 + 1));
  for (let filamentIndex = 0; filamentIndex < shredCount; filamentIndex++) {
    const spread = (Math.random() - 0.5) * 0.5;
    const shredAngle = angleToBH + spread;
    const shredSpeed = Math.random() * 4.5 + 2.0;

    particles.push(createParticle(
      victim.x + Math.cos(shredAngle) * (victim.radius * 0.8),
      victim.y + Math.sin(shredAngle) * (victim.radius * 0.8),
      victim.vx * 0.6 + Math.cos(shredAngle) * shredSpeed,
      victim.vy * 0.6 + Math.sin(shredAngle) * shredSpeed,
      shredColors[Math.floor(Math.random() * shredColors.length)],
      Math.random() * 2.8 + 1.2,
      Math.random() * 40 + 20,
      true,
      FILAMENT_GRAVITY_DRAG
    ));
  }

  // 4. Complete Tidal Disruption: star core falls into event horizon or mass depleted
  const eventHorizon = bh.radius + 3.0;
  if (dist <= eventHorizon || victim.mass <= 0.07) {
    sound.playTidalDisruption();

    // Explosive TDE Flare: spawn relativistic plasma ring
    for (let flareIndex = 0; flareIndex < 45; flareIndex++) {
      const flareAngle = Math.random() * Math.PI * 2;
      const flareSpeed = Math.random() * 7.5 + 3.0;
      particles.push(createParticle(
        bh.x, bh.y,
        bh.vx + Math.cos(flareAngle) * flareSpeed,
        bh.vy + Math.sin(flareAngle) * flareSpeed,
        shredColors[flareIndex % shredColors.length],
        Math.random() * 3.5 + 1.8,
        Math.random() * 60 + 35,
        false,
        0.01
      ));
    }

    onNotification?.(
      '💥 Приливное разрушение (TDE)',
      `${victim.name} полностью спагеттифицирована и поглощена сингулярностью ${bh.name}! Масса перешла в релятивистский аккреционный диск.`,
      'blackhole'
    );

    onRemoveBody(victim);
    return true;
  }

  return false;
}

/**
 * Processes direct inelastic collision between two celestial bodies.
 * Conserves total linear momentum (P = const) and models shock-kinetic core heating (NC-03).
 *
 * @param bodyA - First colliding body
 * @param bodyB - Second colliding body
 * @param onRemoveBody - Callback to dispose of merged body
 * @param onNotification - Optional notification callback
 */
export function handleInelasticBodyCollision(
  bodyA: CelestialBody,
  bodyB: CelestialBody,
  particles: Particle[],
  onRemoveBody: (victim: CelestialBody) => void,
  onNotification?: (title: string, body: string, type: 'supernova' | 'blackhole' | 'info') => void
): void {
  if (bodyA.remnantType === 'black_hole' || bodyB.remnantType === 'black_hole') {
    const bh = bodyA.remnantType === 'black_hole' ? bodyA : bodyB;
    const victim = bh === bodyA ? bodyB : bodyA;
    bh.mass += victim.mass * DIRECT_COLLISION_BH_ACCRETION;
    sound.playTidalDisruption();
    onNotification?.('🕳️ Аккреция в Сингулярность', `${bh.name} поглотила ${victim.name}.`, 'blackhole');
    onRemoveBody(victim);
    return;
  }

  const primary = bodyA.mass >= bodyB.mass ? bodyA : bodyB;
  const secondary = primary === bodyA ? bodyB : bodyA;
  const totalMass = primary.mass + secondary.mass;

  // Law of Conservation of Linear Momentum: P_final = P1 + P2
  primary.vx = (primary.vx * primary.mass + secondary.vx * secondary.mass) / totalMass;
  primary.vy = (primary.vy * primary.mass + secondary.vy * secondary.mass) / totalMass;
  primary.mass = totalMass;
  primary.Tcore += IMPACT_KINETIC_HEATING_MK;

  // Stellar Incineration & Absorption (Star, White Dwarf, or Pulsar swallowing a planet/asteroid/moon)
  if (!primary.isPlanet) {
    const splashCount = Math.min(32, Math.max(12, Math.round(secondary.mass * 400 + 14)));
    const impactAngle = Math.atan2(secondary.y - primary.y, secondary.x - primary.x);
    for (let p = 0; p < splashCount; p++) {
      const spreadAngle = impactAngle + (Math.random() - 0.5) * 1.8;
      const speed = Math.random() * 4.5 + 2.0;
      particles.push(createParticle(
        primary.x + Math.cos(spreadAngle) * (primary.radius + 3.5),
        primary.y + Math.sin(spreadAngle) * (primary.radius + 3.5),
        primary.vx + Math.cos(spreadAngle) * speed,
        primary.vy + Math.sin(spreadAngle) * speed,
        p % 3 === 0 ? '#fef08a' : p % 3 === 1 ? '#f97316' : '#ef4444',
        Math.random() * 3.5 + 1.8,
        Math.random() * 45 + 30,
        false, // energetic plasma blast
        0.001
      ));
    }
    sound.playTidalDisruption();
    onNotification?.(
      '☀️ Поглощение звездой',
      `${primary.name} поглотила и испарила ${secondary.name} в раскаленной плазме!`,
      'info'
    );
  } else {
    // Planet-planet inelastic impact
    const debrisCount = 14;
    for (let p = 0; p < debrisCount; p++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.5 + 0.8;
      particles.push(createParticle(
        secondary.x,
        secondary.y,
        primary.vx + Math.cos(angle) * speed,
        primary.vy + Math.sin(angle) * speed,
        '#f59e0b',
        Math.random() * 2.0 + 1.0,
        15,
        true,
        0.001
      ));
    }
    sound.playMassPump();
    onNotification?.(
      '💥 Коллизия тел',
      `${primary.name} столкнулась с ${secondary.name} и поглотила её массу.`,
      'info'
    );
  }

  onRemoveBody(secondary);
}

/**
 * Compute pair-wise N-body accelerations, tidal disruption events (TDE), and spaghettification
 */
function computeAccelerations(
  bodies: CelestialBody[],
  G: number,
  eps: number,
  dt: number,
  particles: Particle[],
  onRemoveBody: (victim: CelestialBody) => void,
  onNotification?: (title: string, body: string, type: 'supernova' | 'blackhole' | 'info') => void
) {
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].ax = 0;
    bodies[i].ay = 0;
    // Reset momentary disruption state if not actively torn
    bodies[i].isDisrupting = false;
    bodies[i].tidalStretch = undefined;
  }

  for (let i = 0; i < bodies.length; i++) {
    const b1 = bodies[i];
    if (!b1) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      const b2 = bodies[j];
      if (!b2) continue;
      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      // Realistic Adaptive Plummer Softening:
      // Heavy stars (e.g. Sun, supergiants) have extended gravitational wells.
      // Host planets and their orbiting satellites use high-resolution local gravitational softening,
      // avoiding artificial tidal dispersion that would destabilize moon orbits.
      let effectiveEps = eps;
      if (b1.parentBodyId === b2.id || b2.parentBodyId === b1.id) {
        effectiveEps = Math.max(0.4, Math.min(eps, Math.min(b1.radius, b2.radius) * 0.35));
      } else if (b1.planetKey === 'sun' || b2.planetKey === 'sun' || (b1.mass >= 0.5 && b2.mass >= 0.5)) {
        effectiveEps = Math.min(eps, 6.0);
      } else if (b1.parentBodyId && b2.parentBodyId) {
        // Minor satellites of same or different planets: smooth out chaotic micro-disturbances
        effectiveEps = Math.max(eps, 16.0);
      }

      const denom = Math.pow(distSq + effectiveEps * effectiveEps, 1.5);

      const forceScalar = G / denom;
      b1.ax += forceScalar * b2.mass * dx;
      b1.ay += forceScalar * b2.mass * dy;
      b2.ax -= forceScalar * b1.mass * dx;
      b2.ay -= forceScalar * b1.mass * dy;

      // Deduplicated mutual tidal strain calculation (NC-02)
      computeSingleBodyTidalStretch(b1, b2, dist, dx, dy);
      computeSingleBodyTidalStretch(b2, b1, dist, -dx, -dy);

      // Check for Tidal Disruption Event (TDE) if one is a Black Hole and other is a normal body
      const isB1BH = b1.remnantType === 'black_hole';
      const isB2BH = b2.remnantType === 'black_hole';

      if ((isB1BH || isB2BH) && !(isB1BH && isB2BH)) {
        const bh = isB1BH ? b1 : b2;
        const victim = isB1BH ? b2 : b1;
        const consumed = handleTidalDisruptionEvent(bh, victim, dist, dt, particles, onRemoveBody, onNotification);
        if (consumed) {
          return;
        }
      }

      // Realistic inelastic collision & stellar incineration:
      // A star is a superheated incandescent sphere of plasma. Any planet, moon, or asteroid
      // that touches the stellar photosphere or falls inside is vaporized and swallowed into the star!
      let collisionDist = b1.radius + b2.radius;
      if (b1.parentBodyId === b2.id || b2.parentBodyId === b1.id) {
        // Satellite plunging directly into its own parent planet core
        collisionDist = (b1.radius + b2.radius) * 0.35;
      } else if (b1.parentBodyId && b2.parentBodyId && b1.parentBodyId === b2.parentBodyId) {
        // Co-orbiting sibling moons of the same parent
        collisionDist = Math.min(b1.radius, b2.radius) * 0.5;
      } else if (!b1.isPlanet && !b2.isPlanet) {
        // Star-star binary contact
        collisionDist = (b1.radius + b2.radius) * 0.5;
      } else if (!b1.isPlanet || !b2.isPlanet) {
        // Star swallowing a planet/comet/asteroid:
        // Any object touching the stellar envelope or falling inside is incinerated and absorbed!
        collisionDist = (b1.radius + b2.radius) * 0.95;
      } else {
        // Planet-to-planet solid impact
        collisionDist = (b1.radius + b2.radius) * 0.55;
      }

      if (distSq < collisionDist * collisionDist || (!b1.isPlanet && dist < b1.radius) || (!b2.isPlanet && dist < b2.radius)) {
        handleInelasticBodyCollision(b1, b2, particles, onRemoveBody, onNotification);
        return;
      }
    }
  }
}

/**
 * Visual reference velocity for Relativistic Doppler effect in 2D simulation coordinates
 * Scaled so orbital & high-speed flybys produce striking relativistic blueshift/redshift
 */
export const VISUAL_C_DOPPLER = 4.2;

/**
 * Calculates relativistic Doppler redshift/blueshift parameter z from line-of-sight velocity vx.
 *
 * @param vx - Line-of-sight velocity component (px/s)
 * @returns number - Doppler parameter z (z < 0: blueshift, z > 0: redshift)
 */
export function computeDopplerFromVx(vx: number): number {
  const beta = Math.max(-0.95, Math.min(0.95, vx / VISUAL_C_DOPPLER));
  const delta = Math.sqrt((1 - beta) / (1 + beta));
  return (1 / delta) - 1;
}

/**
 * Calculates relativistic Doppler beaming intensity factor (beaming ~ delta^3 to delta^4).
 * Approaching matter is significantly amplified in brightness; receding matter is dimmed.
 *
 * @param z - Doppler parameter z
 * @returns number - Beaming multiplier (0.3 to 2.8)
 */
export function getDopplerBeamingIntensity(z: number): number {
  const delta = 1 / (1 + z);
  return Math.max(0.3, Math.min(2.8, Math.pow(delta, 2.2)));
}

/**
 * Calculates relativistic Doppler redshift/blueshift parameters for a celestial body.
 *
 * @param body - Celestial body target
 * @returns number - Doppler redshift parameter z
 */
export function computeDopplerShift(body: CelestialBody): number {
  return computeDopplerFromVx(body.vx);
}

/**
 * Calculates remaining thermonuclear fuel percentage (0 - 100%) based on stellar composition.
 * As hydrogen burns into helium and helium into carbon/iron, this accurately decreases from 100% to 0%.
 *
 * @param b - Celestial body target
 * @returns number - Remaining fuel percentage [0..100]
 */
export function getRemainingFuelPercent(b: CelestialBody): number {
  if (b.remnantType || b.isPlanet) return 0;
  if (!b.composition) return 0;

  if (b.mass < 8.0) {
    // Low/intermediate mass star: H is primary fuel (1.0 weight), He is secondary fuel (0.35 weight).
    // Initial standard composition: H=0.74, He=0.24 => baseline = 0.74 + 0.35 * 0.24 = 0.824
    const weightedFuel = b.composition.H + 0.35 * b.composition.He;
    return Math.max(0, Math.min(100, Math.round((weightedFuel / 0.824) * 100)));
  } else {
    // Massive star (M >= 8 M☉): H (1.0), He (0.4), C (0.2). Fe is inert ash that cannot fuse exothermically.
    // Initial standard composition: 0.74 + 0.4*0.24 + 0.2*0.018 = 0.8396
    const weightedFuel = b.composition.H + 0.4 * b.composition.He + 0.2 * b.composition.C;
    return Math.max(0, Math.min(100, Math.round((weightedFuel / 0.84) * 100)));
  }
}

/**
 * Transforms an RGB/Hex/RGBA color by relativistic Doppler shift with striking visual contrast.
 * z < 0: Blueshift (shifts to electric cyan/violet/white-hot, boosting luminosity)
 * z > 0: Redshift (shifts to fiery amber/crimson/deep infrared, dimming luminosity)
 *
 * @param colorStr - Original color string (hex or rgba)
 * @param z - Doppler redshift parameter
 * @returns string - Shifted color representation
 */
export function applyDopplerToColor(colorStr: string, z: number): string {
  if (Math.abs(z) < 0.03) return colorStr;

  // Blueshift (Approaching matter with relativistic beaming)
  if (z < -0.03) {
    const shift = Math.min(1.0, Math.abs(z) * 2.2);
    if (colorStr.startsWith('rgba')) {
      return shift > 0.65 ? 'rgba(224, 242, 254, 0.98)' : shift > 0.35 ? 'rgba(56, 189, 248, 0.90)' : 'rgba(96, 165, 250, 0.85)';
    }
    if (shift > 0.70) return '#ffffff'; // blinding incandescent white-blue
    if (shift > 0.40) return '#38bdf8'; // electric cyan
    return '#60a5fa'; // brilliant azure
  }

  // Redshift (Receding matter with relativistic dimming)
  const shift = Math.min(1.0, z * 2.2);
  if (colorStr.startsWith('rgba')) {
    return shift > 0.65 ? 'rgba(127, 29, 29, 0.65)' : shift > 0.35 ? 'rgba(220, 38, 38, 0.75)' : 'rgba(245, 158, 11, 0.85)';
  }
  if (shift > 0.70) return '#7f1d1d'; // deep infrared ruby
  if (shift > 0.40) return '#ef4444'; // intense scarlet red
  return '#f59e0b'; // amber orange
}

/**
 * Integrates one discrete simulation time step using the Velocity Verlet symplectic algorithm.
 * Handles N-body gravitation, relativistic limits, Doppler calculations, nucleosynthesis, and collisions.
 *
 * @param bodies - Active array of celestial bodies in simulation
 * @param particles - Particle system buffer for gas and relativistic jets
 * @param settings - Global simulation parameters (G, softening, flags)
 * @param dt - Time step delta
 * @param onRemoveBody - Callback when a body is merged or destroyed
 * @param onNotification - Optional astrophysical event notifier callback
 */
export function stepPhysics(
  bodies: CelestialBody[],
  particles: Particle[],
  settings: SimulationSettings,
  dt: number,
  onRemoveBody: (victim: CelestialBody) => void,
  onNotification?: (title: string, body: string, type: 'supernova' | 'blackhole' | 'info') => void
) {
  const G = settings.G;
  const eps = settings.softening;

  // Step 1: Velocity Verlet position step + half-step velocity
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    b.x += b.vx * dt + 0.5 * b.ax * dt * dt;
    b.y += b.vy * dt + 0.5 * b.ay * dt * dt;

    // Calculate Doppler shift
    b.dopplerShift = computeDopplerShift(b);

    // Record trail
    if (settings.showTrails) {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 70) b.trail.shift();
    } else if (b.trail.length > 0) {
      b.trail.length = 0;
    }

    // Internal stellar physics
    updateStarInternalThermodynamics(b, dt, particles, settings, onNotification);
  }

  // Old accelerations
  const oldAccels = bodies.map(b => ({ ax: b.ax, ay: b.ay }));

  // Step 2: New accelerations at updated positions (with tidal disruption and shredding)
  computeAccelerations(bodies, G, eps, dt, particles, onRemoveBody, onNotification);

  // Step 3: Velocity Verlet second half-step with relativistic speed clamping
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    b.vx += 0.5 * (oldAccels[i].ax + b.ax) * dt;
    b.vy += 0.5 * (oldAccels[i].ay + b.ay) * dt;

    // Relativistic velocity clamping: v <= SPEED_OF_LIGHT (60.0 px/s)
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > SPEED_OF_LIGHT) {
      const factor = SPEED_OF_LIGHT / speed;
      b.vx *= factor;
      b.vy *= factor;
    }
  }

  // Step 3.5: Astrophysical Patched Conic Keplerian Moon Synchronization
  // For satellites bound to a parent planet (e.g. Moon orbiting Earth, Galilean moons orbiting Jupiter),
  // this maintains eternal Keplerian orbital stability against numerical accumulation errors.
  // If the parent body is removed, the satellite seamlessly decouples into an independent heliocentric orbit.
  const parentMap = new Map<string, CelestialBody>();
  for (let i = 0; i < bodies.length; i++) {
    parentMap.set(bodies[i].id, bodies[i]);
  }

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.parentBodyId) {
      const parent = parentMap.get(b.parentBodyId);
      if (parent) {
        if (b.orbitRadius === undefined) {
          const dx = b.x - parent.x;
          const dy = b.y - parent.y;
          b.orbitRadius = Math.max(parent.radius + b.radius + 1.2, Math.hypot(dx, dy));
          b.orbitAngle = Math.atan2(dy, dx);
          const dir = b.planetKey === 'triton' ? -1 : 1; // Triton is famous for retrograde orbit
          b.orbitAngularVelocity = dir * Math.sqrt((G * parent.mass) / Math.pow(b.orbitRadius, 3));
        }

        // Advance true anomaly along stable Keplerian orbit around parent
        b.orbitAngle = (b.orbitAngle ?? 0) + (b.orbitAngularVelocity ?? 0.02) * dt;
        b.x = parent.x + Math.cos(b.orbitAngle) * b.orbitRadius;
        b.y = parent.y + Math.sin(b.orbitAngle) * b.orbitRadius;

        const vOrb = (b.orbitAngularVelocity ?? 0.02) * b.orbitRadius;
        b.vx = parent.vx - Math.sin(b.orbitAngle) * vOrb;
        b.vy = parent.vy + Math.cos(b.orbitAngle) * vOrb;
        b.ax = parent.ax;
        b.ay = parent.ay;
      } else {
        // Parent was destroyed or deleted: release into free space
        b.parentBodyId = undefined;
        b.orbitRadius = undefined;
      }
    }
  }

  // Step 4: Particles and Gas accretion
  updateParticlesPhysics(particles, bodies, G, eps, dt, settings.maxParticles ?? 1000);
}

/**
 * Internal thermodynamics, nucleosynthesis (H -> He -> C -> Fe), and hydrostatic forces
 */
function updateStarInternalThermodynamics(
  b: CelestialBody,
  dt: number,
  particles: Particle[],
  settings: SimulationSettings,
  onNotification?: (title: string, body: string, type: 'supernova' | 'blackhole' | 'info') => void
) {
  // Planets do not undergo stellar nuclear fusion or collapse
  if (b.isPlanet) {
    return;
  }

  // Remnants check
  if (b.remnantType === 'black_hole') {
    // Continuous steady accretion from interstellar medium, radiation, and quantum vacuum
    const accretionRate = (0.008 + b.mass * 0.00035) * dt;
    b.mass += accretionRate;

    const rs = (2 * 1.2 * b.mass * 12.0) / (SPEED_OF_LIGHT * SPEED_OF_LIGHT);
    b.radius = Math.max(8.0, rs * 4.0);
    b.targetRadius = b.radius;
    b.Teff = 0;
    b.Tcore = 0;
    b.evolutionStage = 'black_hole';
    return;
  }

  if (b.remnantType === 'pulsar') {
    // Check TOV limit accretion: if neutron star accretes mass > 2.8 M☉, it collapses into a black hole
    if (b.mass > TOV_LIMIT) {
      triggerHypernovaBlackHole(b, particles, onNotification);
      return;
    }
    b.radius = 5.0;
    b.targetRadius = 5.0;
    b.rotationAngle += b.spinRate * dt * 25.0;
    b.evolutionStage = 'pulsar';
    return;
  }

  if (b.remnantType === 'white_dwarf') {
    // Check Chandrasekhar limit accretion: if white dwarf accretes mass > 1.44 M☉, it detonates as Supernova Ia
    if (b.mass > CHANDRASEKHAR_LIMIT) {
      b.hasExploded = true;
      createSupernovaBurst(b, particles, false);
      b.mass = Math.max(1.4, Math.min(2.1, b.mass * 0.28));
      b.remnantType = 'pulsar';
      b.evolutionStage = 'pulsar';
      b.radius = 5.0;
      b.spinRate = 0.35;
      b.name = 'Пульсар PSR-' + Math.floor(Math.random() * 8000 + 1000);
      onNotification?.(
        '💥 Сверхновая типа Ia (Термоядерный коллапс)',
        `Белый карлик ${b.name} превысил предел Чандрасекара (1.44 M☉)! Термоядерный взрыв сколлапсировал остаток в нейтронную звезду.`,
        'supernova'
      );
      return;
    }
    b.radius = 4.5;
    b.targetRadius = 4.5;
    b.Teff = Math.max(3000, b.Teff - 0.02 * dt); // slow secular cooling
    b.evolutionStage = 'white_dwarf';
    return;
  }

  // --- Active Star Physics & Automatic Evolution ---
  b.stellarAge = (b.stellarAge ?? 0) + dt;

  // Mass-dependent burn rate according to astrophysics (L ~ M^3.5, burn rate scales smoothly with mass)
  const massRatio = Math.max(0.35, b.mass);
  const massFactor = Math.pow(massRatio, 0.55);
  const evoMultiplier = settings.stellarEvolution !== false ? (settings.stellarEvolutionSpeed ?? 1.0) : 0;
  const burnRate = 0.00010 * massFactor * evoMultiplier * dt;

  // Internal core thermodynamics: core contraction heats the core as fuel is depleted
  const baseTcore = Math.max(14.0, 16.0 * Math.pow(massRatio, 0.40));
  const hDepleted = Math.max(0, 1.0 - (b.composition.H / 0.74));
  const heDepleted = Math.max(0, b.composition.C + b.composition.Fe);
  const feAccum = b.composition.Fe;

  let dynamicTcore = baseTcore * (1.0 + hDepleted * 1.5);
  // Helium burning core contraction: occurs as Hydrogen drops below 15%
  if (b.composition.H < 0.15) {
    dynamicTcore = Math.max(dynamicTcore, 120.0 * Math.pow(Math.max(0.6, b.mass), 0.25) * (1.0 + heDepleted * 1.8));
  }
  // Advanced carbon/silicon core collapse (M >= 8 M☉): occurs when Helium is depleted and carbon fuses
  if (b.mass >= 8.0 && b.composition.H < 0.05 && b.composition.He < 0.20) {
    dynamicTcore = Math.max(dynamicTcore, 550.0 * (1.0 + feAccum * 3.5));
  }

  if (b.mass < 8.0) {
    // Quantum electron degeneracy limits core temperature before carbon flash
    dynamicTcore = Math.min(280.0, dynamicTcore);
  }
  b.Tcore = dynamicTcore;

  let energyRelease = 0;

  // Step 1: Hydrogen Fusion (1H -> 4He) when Tcore >= 10.0 million K
  if (b.Tcore >= 10.0 && b.composition.H > 0.002) {
    const rateH = Math.min(b.composition.H, burnRate * Math.max(0.6, b.Tcore / 15.0));
    b.composition.H -= rateH;
    b.composition.He += rateH;
    energyRelease += rateH * 280.0;
    b.evolutionStage = 'main_sequence';
  }

  // Step 2: Helium Fusion (3-alpha 4He -> 12C) when Tcore >= 90.0 million K and H is depleted
  if (b.Tcore >= 90.0 && b.composition.He > 0.002 && b.composition.H < 0.15) {
    const rateHe = Math.min(b.composition.He, burnRate * 2.0 * Math.max(0.6, b.Tcore / 100.0));
    b.composition.He -= rateHe;
    b.composition.C += rateHe;
    energyRelease += rateHe * 450.0;
    b.evolutionStage = b.mass < 8.0 ? 'red_giant' : 'supergiant';
  }

  // Step 3: Carbon to Iron Fusion (12C -> 56Fe) when Tcore >= 450.0 million K (Only for M >= 8 M☉!)
  if (b.mass >= 8.0 && b.Tcore >= 450.0 && b.composition.C > 0.002 && b.composition.He < 0.20) {
    const rateC = Math.min(b.composition.C, burnRate * 2.8 * Math.max(0.6, b.Tcore / 500.0));
    b.composition.C -= rateC;
    b.composition.Fe += rateC;
    energyRelease += rateC * 160.0;
    b.evolutionStage = b.composition.Fe > 0.22 ? 'iron_crisis' : 'supergiant';
  }

  // Normalize composition fractions
  const totalComp = b.composition.H + b.composition.He + b.composition.C + b.composition.Fe;
  if (totalComp > 0) {
    b.composition.H /= totalComp;
    b.composition.He /= totalComp;
    b.composition.C /= totalComp;
    b.composition.Fe /= totalComp;
  }

  // Safe radius for envelope calculations
  const safeR = Math.max(3.0, b.radius);

  // --- Hydrostatic Balance & Envelope Dynamics ---
  // P_grav ~ M^2 / R^3.5
  b.P_grav = (b.mass * b.mass) / Math.pow(safeR / 10.0, 3.5);

  // P_gas ~ (M/R^2.5) * Tcore
  b.P_gas = (b.mass / Math.pow(safeR / 10.0, 2.5)) * (b.Tcore / 15.0) * 0.5;

  // P_rad: extinguished by iron buildup (fusion of Fe-56 is endothermic and drains energy)
  const ironDamping = Math.max(0, 1.0 - b.composition.Fe * 2.2);
  b.P_rad = (energyRelease * 8.5 + 0.55 * Math.pow(b.Tcore / 15.0, 3.5)) * ironDamping;

  const P_out = b.P_gas + b.P_rad;
  b.balanceRatio = P_out / Math.max(0.0001, b.P_grav);

  // Envelope Target Radius (Main sequence stability & Expansion in giant stages)
  const baseMsRadius = b.planetKey === 'sun' ? 36.0 : Math.max(10.0, Math.pow(b.mass, 0.5) * 16.0);
  if (b.evolutionStage === 'red_giant') {
    b.targetRadius = baseMsRadius * 1.85;
  } else if (b.evolutionStage === 'supergiant' || b.evolutionStage === 'iron_crisis') {
    b.targetRadius = baseMsRadius * 2.3;
  } else {
    b.targetRadius = baseMsRadius;
  }

  // Radial dynamic oscillation and envelope breathing
  const forceDelta = (P_out - b.P_grav);
  b.radialVelocity += forceDelta * 0.028 * dt;
  b.radialVelocity *= 0.86; // viscous damping
  b.radius += b.radialVelocity * dt;
  b.radius += (b.targetRadius - b.radius) * 0.025 * dt * 10;
  if (b.radius < 4.0) b.radius = 4.0;

  // Effective surface temperature & luminosity
  if (b.radius > 22.0) {
    b.Teff = 3200; // Red Giant / Supergiant cooling
  } else {
    b.Teff = Math.min(48000, 3000 + Math.pow(b.mass, 0.55) * 2800 * (15.0 / b.radius));
  }
  b.luminosity = Math.pow(b.radius / 10.0, 2) * Math.pow(b.Teff / 5800, 4);

  // --- AUTOMATED STELLAR LIFECYCLE COLLAPSE (The Core Law of Astrophysics) ---
  if (settings.stellarEvolution !== false && !b.hasExploded) {
    // 1. Low/Intermediate Mass (M < 8 M☉): Fuel exhausted -> Planetary Nebula + White Dwarf
    if (b.mass < 8.0 && b.composition.H <= 0.04 && b.composition.He <= 0.05) {
      triggerPlanetaryNebula(b, particles, onNotification);
      return;
    }

    // 2. Massive Stars (8 M☉ <= M < 20 M☉): Iron Crisis or Fuel Exhaustion -> Supernova II + Pulsar
    if (
      b.mass >= 8.0 &&
      b.mass < 20.0 &&
      (b.composition.Fe >= 0.38 || (b.composition.H + b.composition.He + b.composition.C < 0.06))
    ) {
      triggerSupernovaTypeII(b, particles, onNotification);
      return;
    }

    // 3. Supermassive Stars (M >= 20 M☉): Iron Crisis or Fuel Exhaustion -> Hypernova + Black Hole
    if (
      b.mass >= 20.0 &&
      (b.composition.Fe >= 0.38 || (b.composition.H + b.composition.He + b.composition.C < 0.06))
    ) {
      triggerHypernovaBlackHole(b, particles, onNotification);
      return;
    }
  }
}

/**
 * Particles and gas clouds physics with Relativistic Spaghettification & Tidal Splitting (Optimized O(N) In-Place Compaction)
 */
function updateParticlesPhysics(
  particles: Particle[],
  bodies: CelestialBody[],
  G: number,
  eps: number,
  dt: number,
  maxAllowedParticles: number = 1000
) {
  const newSplinterParticles: Particle[] = [];
  const epsSq = eps * eps;
  let writeIdx = 0;
  const numBodies = bodies.length;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    let maxTidalField = 0;
    let dominantBody: CelestialBody | null = null;
    let domDx = 0;
    let domDy = 0;
    let domDist = 999999;

    for (let j = 0; j < numBodies; j++) {
      const b = bodies[j];
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const distSq = dx * dx + dy * dy;

      // Inelastic capture / horizon plunge (using squared radius)
      if (distSq < b.radius * b.radius) {
        if (p.isGas) {
          b.mass += p.mass;
          b.composition.H = Math.min(0.95, b.composition.H + 0.0006);
        }
        p.life = -1; // absorbed into star or event horizon
        break;
      }

      const dist = Math.sqrt(distSq);
      const denom = Math.pow(distSq + epsSq, 1.5);
      const f = (G * b.mass) / denom;
      p.ax += f * dx;
      p.ay += f * dy;

      // Calculate tidal gradient ~ G * M / r^3
      const tidalGrad = (G * b.mass * (b.remnantType === 'black_hole' ? 18.0 : 4.5)) / Math.max(8.0, distSq * Math.sqrt(dist));
      if (tidalGrad > maxTidalField) {
        maxTidalField = tidalGrad;
        dominantBody = b;
        domDx = dx;
        domDy = dy;
        domDist = dist;
      }
    }

    if (p.life <= 0) {
      continue; // Dropped automatically during compaction
    }

    // --- Dynamic Tidal Spaghettification (Растяжение материи) ---
    if (dominantBody) {
      const isBH = dominantBody.remnantType === 'black_hole';
      const isPulsar = dominantBody.remnantType === 'pulsar';
      
      const proxRatio = dominantBody.radius / Math.max(dominantBody.radius * 0.8, domDist);
      
      let stretchCalc = 1.0;
      if (isBH) {
        stretchCalc = 1.0 + Math.pow(proxRatio, 1.7) * (dominantBody.mass * 0.85 + 4.5);
      } else if (isPulsar) {
        stretchCalc = 1.0 + Math.pow(proxRatio, 1.5) * 3.5;
      } else {
        stretchCalc = 1.0 + Math.pow(proxRatio, 1.3) * (dominantBody.mass * 0.35);
      }

      p.stretch = Math.max(1.0, Math.min(isBH ? 20.0 : 9.0, stretchCalc));

      // Stretch angle
      const angleToCenter = Math.atan2(domDy, domDx);
      const speedSq = p.vx * p.vx + p.vy * p.vy;
      if (speedSq > 0.01) {
        const velAngle = Math.atan2(p.vy, p.vx);
        p.stretchAngle = angleToCenter * 0.65 + velAngle * 0.35;
      } else {
        p.stretchAngle = angleToCenter;
      }

      p.intensity = Math.min(4.0, 1.0 + (p.stretch - 1.0) * (isBH ? 0.35 : 0.2));

      // --- Tidal Splitting / Shredding ---
      const splitThresholdDist = dominantBody.radius * (isBH ? 4.0 : 1.8);
      const splitCount = p.splitCount || 0;

      if (
        domDist < splitThresholdDist &&
        p.stretch > 2.8 &&
        splitCount < 2 &&
        particles.length + newSplinterParticles.length < maxAllowedParticles &&
        Math.random() < 0.06 * dt * 10
      ) {
        p.splitCount = splitCount + 1;
        p.radius = Math.max(0.8, p.radius * 0.68);
        p.mass *= 0.5;

        const invDist = 1 / domDist;
        const perpX = -domDy * invDist;
        const perpY = domDx * invDist;
        const kickMag = (Math.random() - 0.5) * (isBH ? 2.4 : 1.2);

        const splinterColor = isBH
          ? (Math.random() > 0.5 ? '#67e8f9' : '#c084fc')
          : (Math.random() > 0.5 ? '#f43f5e' : '#fef08a');

        newSplinterParticles.push({
          x: p.x + perpX * (p.radius * 2.2),
          y: p.y + perpY * (p.radius * 2.2),
          vx: p.vx + perpX * kickMag,
          vy: p.vy + perpY * kickMag,
          ax: 0,
          ay: 0,
          color: splinterColor,
          radius: Math.max(0.7, p.radius * 0.75),
          life: p.life * (0.6 + Math.random() * 0.4),
          maxLife: p.maxLife,
          isGas: p.isGas,
          mass: p.mass,
          stretch: p.stretch * 0.9,
          stretchAngle: p.stretchAngle + (Math.random() - 0.5) * 0.2,
          intensity: p.intensity,
          splitCount: splitCount + 1
        });
      }
    } else {
      p.stretch = 1.0;
      p.intensity = 1.0;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx += p.ax * dt;
    p.vy += p.ay * dt;
    p.ax = 0;
    p.ay = 0;

    if (!p.isGas) {
      p.life -= dt;
      p.radius *= (1 - 0.002 * dt);
    }

    if (p.life > 0) {
      particles[writeIdx++] = p;
    }
  }

  // Truncate array in O(1)
  particles.length = writeIdx;

  // Add shredded splinter particles up to maxAllowedParticles
  if (newSplinterParticles.length > 0) {
    const spaceLeft = Math.max(0, maxAllowedParticles - particles.length);
    if (spaceLeft > 0) {
      particles.push(...newSplinterParticles.slice(0, spaceLeft));
    }
  }
}

/**
 * Astrophysical Circumstellar Habitable Zone (Goldilocks Zone)
 * Calculates the inner (runaway greenhouse) and outer (maximum greenhouse / snowline)
 * boundaries based on Kopparapu et al. (2013) NASA Astrobiology models.
 */
export interface HabitableZone {
  innerRadius: number;  // in simulation pixels/world coordinates
  outerRadius: number;  // in simulation pixels/world coordinates
  innerAU: number;      // in Astronomical Units
  outerAU: number;      // in Astronomical Units
  luminosity: number;   // in Solar Luminosities L☉
}

export function calculateHabitableZone(star: CelestialBody): HabitableZone {
  // Remnants without active radiant thermonuclear fusion
  if (star.remnantType === 'black_hole') {
    return { innerRadius: 0, outerRadius: 0, innerAU: 0, outerAU: 0, luminosity: 0 };
  }

  // Calculate or estimate bolometric luminosity relative to Sun:
  // L/L_sun ~ M^3.5 for Main Sequence (or Stefan-Boltzmann: (R/R_sun)^2 * (T_eff / 5778)^4)
  let L = star.luminosity;
  if (!L || L <= 0) {
    if (star.mass >= 0.08) {
      if (star.mass < 0.43) {
        L = 0.23 * Math.pow(star.mass, 2.3);
      } else if (star.mass < 2.0) {
        L = Math.pow(star.mass, 4.0);
      } else if (star.mass < 20.0) {
        L = 1.5 * Math.pow(star.mass, 3.5);
      } else {
        L = 3200 * star.mass;
      }
    } else {
      L = 0.0001;
    }
  }

  // Kopparapu et al. (2013) Habitable Zone boundaries in AU:
  // Runaway greenhouse limit: S_eff ~ 1.08 => R_inner = sqrt(L / 1.08)
  // Maximum greenhouse limit (snowline): S_eff ~ 0.45 => R_outer = sqrt(L / 0.45)
  const innerAU = Math.sqrt(Math.max(0.0001, L / 1.08));
  const outerAU = Math.sqrt(Math.max(0.0001, L / 0.45));

  // Simulation spatial scale: 1 AU = 220 world units (calibrated to Solar System preset Earth distance)
  const AU_PIXELS = 220;
  const innerRadius = innerAU * AU_PIXELS;
  const outerRadius = outerAU * AU_PIXELS;

  return {
    innerRadius,
    outerRadius,
    innerAU,
    outerAU,
    luminosity: L
  };
}

/**
 * Planetary Climate & Insolation Assessment
 * Computes radiant flux, equilibrium surface temperature, and astrobiological status.
 */
export interface PlanetaryClimate {
  distanceAU: number;
  insolationPercent: number; // relative to Earth (100%)
  equilibriumTempK: number;  // surface temperature in Kelvin
  equilibriumTempC: number;  // surface temperature in Celsius
  status: 'runaway_greenhouse' | 'habitable_goldilocks' | 'frozen_cryosphere';
  statusTitle: string;
  statusDesc: string;
}

export function calculatePlanetaryClimate(planet: CelestialBody, star: CelestialBody): PlanetaryClimate {
  const dist = Math.hypot(planet.x - star.x, planet.y - star.y);
  const AU_PIXELS = 220;
  const distAU = Math.max(0.01, dist / AU_PIXELS);

  const hz = calculateHabitableZone(star);
  const L = Math.max(0.0001, hz.luminosity);

  // Stellar radiative flux relative to Earth: S = L / d^2
  const insolationPercent = (L / (distAU * distAU)) * 100;

  // Planetary Equilibrium Temperature:
  // T_eq = T_star * sqrt(R_star / (2 * D)) * (1 - A)^(1/4)
  const bondAlbedo = planet.planetKey === 'venus' ? 0.75 : planet.planetKey === 'mercury' ? 0.07 : 0.3;
  const starTemp = star.Teff || 5778;
  const starRadiusM = (Math.max(1, star.radius) / 32) * 696340000;
  const distM = distAU * 149597870700;

  const Teq = starTemp * Math.sqrt(starRadiusM / (2 * distM)) * Math.pow(1 - bondAlbedo, 0.25);

  // Natural greenhouse effect bonus
  const greenhouseBonus = planet.planetKey === 'venus' ? 460 : planet.planetKey === 'earth' ? 33 : planet.planetKey === 'mars' ? 5 : 12;
  const TsurfaceK = Math.max(3, Math.round(Teq + greenhouseBonus));
  const TsurfaceC = TsurfaceK - 273;

  let status: PlanetaryClimate['status'] = 'habitable_goldilocks';
  let statusTitle = 'ЗОНА ЗЛАТОВЛАСКИ (ЖИДКАЯ ВОДА)';
  let statusDesc = `Умеренная инсоляция (${insolationPercent.toFixed(0)}% от земной). Возможно существование жидких океанов и стабильной гидросферы.`;

  if (dist < hz.innerRadius) {
    status = 'runaway_greenhouse';
    statusTitle = 'СВЕРХКРИТИЧЕСКИЙ ПАРНИК';
    statusDesc = `Избыточная инсоляция (${insolationPercent.toFixed(0)}% от земной). Вода полностью испарена, атмосфера раскалена.`;
  } else if (dist > hz.outerRadius) {
    status = 'frozen_cryosphere';
    statusTitle = 'КРИОСФЕРА (ЛЕДЯНОЙ МИР)';
    statusDesc = `Слабая инсоляция (${insolationPercent.toFixed(0)}% от земной). Температура ниже точки замерзания, вечный лёд.`;
  }

  return {
    distanceAU: distAU,
    insolationPercent,
    equilibriumTempK: TsurfaceK,
    equilibriumTempC: TsurfaceC,
    status,
    statusTitle,
    statusDesc
  };
}
