/**
 * Astrophysics Engine: StellarGenesis
 * Velocity Verlet N-Body Gravitation, Hydrostatic Balance, Nucleosynthesis & Relativistic Collapse
 */

import { CelestialBody, Particle, RemnantType, SpectralClass, SimulationSettings } from '../types';
import { sound } from './audio';

export const SPEED_OF_LIGHT = 60.0;
export const CHANDRASEKHAR_LIMIT = 1.44; // M☉
export const TOV_LIMIT = 2.80;           // Tolman-Oppenheimer-Volkoff limit (M☉)

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

export function getSpectralClass(b: CelestialBody): SpectralClass {
  if (b.remnantType === 'black_hole') return 'BLACK_HOLE';
  if (b.remnantType === 'pulsar') return 'PULSAR';
  if (b.remnantType === 'white_dwarf') return 'WHITE_DWARF';
  if (b.radius > 24.0) return 'RED_GIANT';

  if (b.Teff >= 30000) return 'O';
  if (b.Teff >= 11000) return 'B';
  if (b.Teff >= 7500) return 'A';
  if (b.Teff >= 6000) return 'F';
  if (b.Teff >= 5000) return 'G';
  if (b.Teff >= 3500) return 'K';
  return 'M';
}

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
    trail: []
  };
}

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
  const n = bodies.length;
  for (let i = 0; i < n; i++) {
    bodies[i].ax = 0;
    bodies[i].ay = 0;
    // Reset momentary disruption state if not actively torn
    bodies[i].isDisrupting = false;
    bodies[i].tidalStretch = undefined;
  }

  for (let i = 0; i < n; i++) {
    const b1 = bodies[i];
    for (let j = i + 1; j < n; j++) {
      const b2 = bodies[j];
      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      const denom = Math.pow(distSq + eps * eps, 1.5);

      const f = G / denom;
      b1.ax += f * b2.mass * dx;
      b1.ay += f * b2.mass * dy;
      b2.ax -= f * b1.mass * dx;
      b2.ay -= f * b1.mass * dy;

      // --- Universal Mutual Tidal Strain Calculation ---
      // Tidal gradient = 2 * G * M_attractor / r^3
      // Tidal stretch threshold on lighter body by heavier body
      const m1 = b1.mass;
      const m2 = b2.mass;

      // Check b1 stretched by b2
      if (m2 > m1 * 1.5 && dist < b1.radius * 25.0) {
        const tidalRadius1 = b1.radius * Math.cbrt((2.8 * m2) / Math.max(0.1, m1));
        if (dist <= tidalRadius1 * 1.8) {
          const prox = Math.max(0, (tidalRadius1 * 1.8 - dist) / (tidalRadius1 * 1.8));
          const stretchVal = 1.0 + Math.pow(prox, 1.3) * (b2.remnantType === 'black_hole' ? 5.5 : 2.2);
          const angleToB2 = Math.atan2(dy, dx);
          if (!b1.tidalStretch || stretchVal > b1.tidalStretch.factor) {
            b1.tidalStretch = { factor: Math.min(6.5, stretchVal), angle: angleToB2 };
          }
        }
      }

      // Check b2 stretched by b1
      if (m1 > m2 * 1.5 && dist < b2.radius * 25.0) {
        const tidalRadius2 = b2.radius * Math.cbrt((2.8 * m1) / Math.max(0.1, m2));
        if (dist <= tidalRadius2 * 1.8) {
          const prox = Math.max(0, (tidalRadius2 * 1.8 - dist) / (tidalRadius2 * 1.8));
          const stretchVal = 1.0 + Math.pow(prox, 1.3) * (b1.remnantType === 'black_hole' ? 5.5 : 2.2);
          const angleToB1 = Math.atan2(-dy, -dx);
          if (!b2.tidalStretch || stretchVal > b2.tidalStretch.factor) {
            b2.tidalStretch = { factor: Math.min(6.5, stretchVal), angle: angleToB1 };
          }
        }
      }

      // Check for Tidal Disruption Event (TDE) if one is a Black Hole and other is a normal body
      const isB1BH = b1.remnantType === 'black_hole';
      const isB2BH = b2.remnantType === 'black_hole';

      if ((isB1BH || isB2BH) && !(isB1BH && isB2BH)) {
        const bh = isB1BH ? b1 : b2;
        const victim = isB1BH ? b2 : b1;

        // Hydrodynamic Tidal Radius (Roche Limit) RT = R* * (2.4 * M_BH / M*)^(1/3)
        const tidalRadius = victim.radius * Math.cbrt((2.5 * bh.mass) / Math.max(0.15, victim.mass));

        if (dist <= tidalRadius) {
          // 1. Spaghettification - extreme tidal elongation along radial line to singularity
          const stretchFactor = Math.min(6.5, 1.0 + ((tidalRadius - dist) / Math.max(10, tidalRadius)) * 5.2);
          const angleToBH = Math.atan2(bh.y - victim.y, bh.x - victim.x);

          victim.isDisrupting = true;
          victim.disruptedById = bh.id;
          victim.tidalStretch = { factor: stretchFactor, angle: angleToBH };

          // 2. Relativistic mass shredding & accretion stream
          const stripMass = Math.min(victim.mass * 0.45, (0.04 + 0.35 * (tidalRadius / (dist + 5))) * dt * 4.5);
          victim.mass = Math.max(0.01, victim.mass - stripMass);
          bh.mass += stripMass * 0.85; // 85% accreted into singularity

          victim.radius = Math.max(2.5, Math.pow(Math.max(0.04, victim.mass), 0.7) * 12);
          victim.Teff = Math.min(75000, victim.Teff + 450 * dt);

          // 3. Spawn shredded glowing relativistic plasma filaments curving into accretion disk in gold/orange/white
          const shredColors = ['#ffffff', '#fef08a', '#facc15', '#fb923c', '#ea580c'];
          const shredCount = Math.min(6, Math.ceil(stripMass * 30 + 1));
          for (let sc = 0; sc < shredCount; sc++) {
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
              0.012
            ));
          }

          // 4. Complete Tidal Disruption: star core falls into event horizon or mass depleted
          const eventHorizon = bh.radius + 3.0;
          if (dist <= eventHorizon || victim.mass <= 0.07) {
            sound.playTidalDisruption();

            // Explosive TDE Flare: spawn relativistic plasma ring
            for (let f = 0; f < 45; f++) {
              const flareAngle = Math.random() * Math.PI * 2;
              const flareSpeed = Math.random() * 7.5 + 3.0;
              particles.push(createParticle(
                bh.x, bh.y,
                bh.vx + Math.cos(flareAngle) * flareSpeed,
                bh.vy + Math.sin(flareAngle) * flareSpeed,
                shredColors[f % shredColors.length],
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
            return;
          }
        }
      }

      // Inelastic collision & ordinary accretion if not black hole disruption
      const collisionDist = b1.radius + b2.radius;
      if (distSq < collisionDist * collisionDist) {
        if (b1.remnantType === 'black_hole' || b2.remnantType === 'black_hole') {
          const bh = b1.remnantType === 'black_hole' ? b1 : b2;
          const victim = bh === b1 ? b2 : b1;
          bh.mass += victim.mass * 0.9;
          sound.playTidalDisruption();
          onNotification?.('🕳️ Аккреция в Сингулярность', `${bh.name} поглотила ${victim.name}.`, 'blackhole');
          onRemoveBody(victim);
          return;
        }

        const primary = b1.mass >= b2.mass ? b1 : b2;
        const secondary = primary === b1 ? b2 : b1;
        const totalMass = primary.mass + secondary.mass;
        primary.vx = (primary.vx * primary.mass + secondary.vx * secondary.mass) / totalMass;
        primary.vy = (primary.vy * primary.mass + secondary.vy * secondary.mass) / totalMass;
        primary.mass = totalMass;
        primary.Tcore += 12.0; // impact kinetic heating
        onRemoveBody(secondary);
        return;
      }
    }
  }
}

/**
 * Visual reference velocity for Relativistic Doppler effect in 2D simulation coordinates
 */
export const VISUAL_C_DOPPLER = 7.5;

/**
 * Calculates relativistic Doppler redshift/blueshift parameter z from line-of-sight velocity vx
 * z < 0: Blueshift (approaching / moving left relative to viewport)
 * z > 0: Redshift (receding / moving right relative to viewport)
 */
export function computeDopplerFromVx(vx: number): number {
  const beta = Math.max(-0.92, Math.min(0.92, vx / VISUAL_C_DOPPLER));
  const delta = Math.sqrt((1 - beta) / (1 + beta));
  return (1 / delta) - 1;
}

/**
 * Calculates relativistic Doppler redshift/blueshift parameters for a celestial body
 */
export function computeDopplerShift(b: CelestialBody): number {
  return computeDopplerFromVx(b.vx);
}

/**
 * Transforms an RGB/Hex/RGBA color by relativistic Doppler shift
 * z < 0: Blueshift (shifts to electric cyan/blue/white-hot, boosting luminosity)
 * z > 0: Redshift (shifts to warm amber/crimson/deep red, dimming luminosity)
 */
export function applyDopplerToColor(colorStr: string, z: number): string {
  if (Math.abs(z) < 0.04) return colorStr;

  // Blueshift (Approaching matter)
  if (z < -0.04) {
    const shift = Math.min(1.0, Math.abs(z) * 1.6);
    if (colorStr.startsWith('rgba')) {
      return shift > 0.6 ? 'rgba(147, 197, 253, 0.95)' : shift > 0.3 ? 'rgba(56, 189, 248, 0.85)' : 'rgba(96, 165, 250, 0.75)';
    }
    if (shift > 0.65) return '#e0f2fe'; // near-incandescent white-blue
    if (shift > 0.35) return '#38bdf8'; // electric cyan
    return '#60a5fa'; // brilliant azure
  }

  // Redshift (Receding matter)
  const shift = Math.min(1.0, z * 1.6);
  if (colorStr.startsWith('rgba')) {
    return shift > 0.6 ? 'rgba(185, 28, 28, 0.65)' : shift > 0.3 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(249, 115, 22, 0.85)';
  }
  if (shift > 0.65) return '#991b1b'; // deep relativistic crimson
  if (shift > 0.35) return '#ef4444'; // intense red
  return '#f97316'; // amber orange
}

/**
 * Step Physics Engine (Velocity Verlet)
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

  // Step 3: Velocity Verlet second half-step
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    b.vx += 0.5 * (oldAccels[i].ax + b.ax) * dt;
    b.vy += 0.5 * (oldAccels[i].ay + b.ay) * dt;
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

  // Mass-dependent burn rate according to astrophysics (L ~ M^3.5, burn rate ~ M^2.15)
  const massRatio = Math.max(0.35, b.mass);
  const massFactor = Math.pow(massRatio, 2.15);
  const evoMultiplier = settings.stellarEvolution !== false ? (settings.stellarEvolutionSpeed ?? 1.0) : 0;
  const burnRate = 0.00065 * massFactor * evoMultiplier * dt;

  // Adiabatic compression / core heating based on gravitational mass and core density
  const safeR = Math.max(3.0, b.radius);
  const compressionRatio = (b.mass * 12.0) / safeR;
  const fuelExhaustion = (1.0 - b.composition.H) * 4.5 + b.composition.C * 8.0 + b.composition.Fe * 16.0;
  let dynamicTcore = Math.max(10.0, compressionRatio * (1.0 + fuelExhaustion));

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
  if (b.Tcore >= 90.0 && b.composition.He > 0.002 && b.composition.H < 0.35) {
    const rateHe = Math.min(b.composition.He, burnRate * 1.6 * Math.max(0.6, b.Tcore / 100.0));
    b.composition.He -= rateHe;
    b.composition.C += rateHe;
    energyRelease += rateHe * 450.0;
    b.evolutionStage = b.mass < 8.0 ? 'red_giant' : 'supergiant';
  }

  // Step 3: Carbon to Iron Fusion (12C -> 56Fe) when Tcore >= 450.0 million K (Only for M >= 8 M☉!)
  if (b.mass >= 8.0 && b.Tcore >= 450.0 && b.composition.C > 0.002 && b.composition.He < 0.40) {
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

  // Envelope Target Radius (Expansion in giant stages)
  if (b.evolutionStage === 'red_giant') {
    b.targetRadius = Math.max(20.0, Math.pow(b.mass, 0.6) * 22.0);
  } else if (b.evolutionStage === 'supergiant' || b.evolutionStage === 'iron_crisis') {
    b.targetRadius = Math.max(24.0, Math.pow(b.mass, 0.65) * 16.0);
  } else {
    b.targetRadius = Math.max(7.0, Math.pow(b.mass, 0.7) * 12.0);
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
