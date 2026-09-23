/**
 * Perlin Noise & Fractal Brownian Motion (FBM) Generator
 * High-performance 2D noise with curl-based fluidic turbulence
 * for astrophysically accurate interstellar gas nebulae generation.
 */

import { Particle, NebulaConfig, NebulaPresetType } from '../types';
import { createParticle } from './engine';

// Classic Ken Perlin 256 permutation table
const PERMUTATION = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
  140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
  247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
  57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
  74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
  60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
  65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
  200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
  52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
  207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
  119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
  129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
  218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
  81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
  184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
  222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
];

// Doubled permutation to eliminate modulo operations
const P = new Uint8Array(512);
for (let i = 0; i < 256; i++) {
  P[i] = PERMUTATION[i];
  P[256 + i] = PERMUTATION[i];
}

// 8 Normalized 2D Gradients
const GRADIENTS_2D: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.707106, 0.707106], [-0.707106, 0.707106],
  [0.707106, -0.707106], [-0.707106, -0.707106]
];

/**
 * Quintic Hermite interpolation curve for continuous 2nd derivative (no grid lines)
 */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function dotGrad2D(hash: number, x: number, y: number): number {
  const g = GRADIENTS_2D[hash & 7];
  return g[0] * x + g[1] * y;
}

/**
 * Single-octave 2D Perlin Noise, returning values in [-1, 1]
 */
export function perlin2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;

  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const A = P[X] + Y;
  const B = P[X + 1] + Y;

  const g00 = dotGrad2D(P[A], xf, yf);
  const g10 = dotGrad2D(P[B], xf - 1, yf);
  const g01 = dotGrad2D(P[A + 1], xf, yf - 1);
  const g11 = dotGrad2D(P[B + 1], xf - 1, yf - 1);

  const x1 = lerp(g00, g10, u);
  const x2 = lerp(g01, g11, u);

  return lerp(x1, x2, v);
}

/**
 * Multi-octave Fractal Brownian Motion (FBM)
 * Generates layered filaments, clumps, and wisps typical of deep space gas
 */
export function fbm2D(
  x: number,
  y: number,
  octaves: number = 4,
  lacunarity: number = 2.0,
  persistence: number = 0.5
): number {
  let total = 0;
  let frequency = 1.0;
  let amplitude = 1.0;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += perlin2D(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxValue; // Normalized in [-1, 1]
}

/**
 * Evaluates 2D Curl-Noise (divergence-free velocity field)
 * Produces fluid swirling eddies for the gas particles
 */
export function curlNoise2D(x: number, y: number, eps: number = 0.05): { vx: number; vy: number } {
  const nY1 = fbm2D(x, y + eps, 3);
  const nY2 = fbm2D(x, y - eps, 3);
  const nX1 = fbm2D(x + eps, y, 3);
  const nX2 = fbm2D(x - eps, y, 3);

  // Curl = (dn/dy, -dn/dx)
  const vx = (nY1 - nY2) / (2 * eps);
  const vy = -(nX1 - nX2) / (2 * eps);

  return { vx, vy };
}

export interface NebulaPresetInfo {
  type: NebulaPresetType;
  title: string;
  subtitle: string;
  description: string;
  palette: string[];
  baseRadius: number;
  density: number;
  massMultiplier: number;
}

export const NEBULA_PRESETS: Record<NebulaPresetType, NebulaPresetInfo> = {
  emission_h2: {
    type: 'emission_h2',
    title: 'Эмиссионная (H II)',
    subtitle: 'H-α и [O III] колыбель',
    description: 'Ионизированный водород (656 нм) и дважды ионизированный кислород. Место активного звездообразования.',
    palette: ['#f43f5e', '#ec4899', '#06b6d4', '#14b8a6', '#c084fc', '#f472b6'],
    baseRadius: 260,
    density: 220,
    massMultiplier: 1.0
  },
  reflection_blue: {
    type: 'reflection_blue',
    title: 'Отражательная',
    subtitle: 'Сапфировое звездное эхо',
    description: 'Холодное облако космической пыли и силикатов, рассеивающее коротковолновый свет ярких молодых звезд.',
    palette: ['#38bdf8', '#60a5fa', '#818cf8', '#93c5fd', '#c7d2fe', '#e0e7ff'],
    baseRadius: 240,
    density: 200,
    massMultiplier: 0.9
  },
  planetary_ring: {
    type: 'planetary_ring',
    title: 'Планетарная (Кольцо)',
    subtitle: 'Оболочка белого карлика',
    description: 'Расширяющаяся тороидальная оболочка, сброшенная проэволюционировавшим красным гигантом.',
    palette: ['#10b981', '#34d399', '#22d3ee', '#f43f5e', '#a855f7', '#fbbf24'],
    baseRadius: 220,
    density: 240,
    massMultiplier: 1.1
  },
  supernova_remnant: {
    type: 'supernova_remnant',
    title: 'Остаток Сверхновой',
    subtitle: 'Ударная волна с металлами',
    description: 'Турбулентные ударные фронты и филаменты, выброшенные при гравитационном коллапсе массивной звезды.',
    palette: ['#f59e0b', '#fbbf24', '#f97316', '#ef4444', '#a855f7', '#38bdf8'],
    baseRadius: 280,
    density: 260,
    massMultiplier: 1.3
  },
  proto_stellar: {
    type: 'proto_stellar',
    title: 'Молекулярное облако',
    subtitle: 'Коллапс Джинса (Протозвезды)',
    description: 'Сверхплотное холодное облако газа с высокой концентрацией массы. Готово к гравитационному коллапсу.',
    palette: ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#3b82f6'],
    baseRadius: 200,
    density: 280,
    massMultiplier: 2.2
  }
};

/**
 * Generates an array of physics-enabled gas particles using Perlin Noise
 * Optimized with rejection sampling and radial boundary envelope.
 */
export function generatePerlinNebulaParticles(
  centerX: number,
  centerY: number,
  config: NebulaConfig
): { particles: Particle[]; info: NebulaPresetInfo } {
  const preset = NEBULA_PRESETS[config.type] || NEBULA_PRESETS.emission_h2;
  const radius = config.radius || preset.baseRadius;
  const targetCount = config.particleDensity || preset.density;
  const swirlFactor = config.swirlVelocity !== undefined ? config.swirlVelocity : 0.85;

  const particles: Particle[] = [];
  const palette = preset.palette;

  // Random offset for unique seeds per nebula spawn
  const seedOffsetX = (Math.random() * 2000 - 1000);
  const seedOffsetY = (Math.random() * 2000 - 1000);
  const noiseScale = 0.0085; // Frequency tailored to world-space scale

  // Grid sampling over circular disc
  const candidateStep = Math.max(10, Math.sqrt((Math.PI * radius * radius) / (targetCount * 2.8)));
  const steps = Math.ceil((radius * 2) / candidateStep);

  for (let ix = -steps / 2; ix <= steps / 2; ix++) {
    for (let iy = -steps / 2; iy <= steps / 2; iy++) {
      // Jitter grid point slightly for organic feel
      const jx = (Math.random() - 0.5) * candidateStep * 0.7;
      const jy = (Math.random() - 0.5) * candidateStep * 0.7;

      const relX = ix * candidateStep + jx;
      const relY = iy * candidateStep + jy;
      const distFromCenter = Math.sqrt(relX * relX + relY * relY);

      if (distFromCenter > radius) continue;

      const normDist = distFromCenter / radius;

      // Radial envelope factor
      let radialEnvelope = Math.max(0, 1.0 - normDist * normDist);

      // Planetary nebula specific toroidal ring geometry
      if (config.type === 'planetary_ring') {
        const ringPeak = 0.65;
        const ringWidth = 0.32;
        const ringDist = Math.abs(normDist - ringPeak) / ringWidth;
        radialEnvelope = Math.max(0.05, 1.0 - ringDist * ringDist);
      }

      // Sample multi-octave Perlin FBM
      const worldSampleX = centerX + relX + seedOffsetX;
      const worldSampleY = centerY + relY + seedOffsetY;
      const nVal = fbm2D(worldSampleX * noiseScale, worldSampleY * noiseScale, 4, 2.0, 0.52);

      // Remap noise from [-1, 1] to [0, 1]
      const density = (nVal * 0.5 + 0.5) * radialEnvelope;

      // Threshold cut-off creates characteristic cosmic filaments & voids
      const threshold = config.type === 'proto_stellar' ? 0.32 : 0.28;
      if (density < threshold) continue;

      // Color mapping: select from palette based on density and noise
      const paletteIndex = Math.floor(Math.min(0.999, (density - threshold) / (1.0 - threshold)) * palette.length);
      const color = palette[paletteIndex % palette.length];

      // Physical size and particle mass
      const particleRadius = Math.max(1.2, density * 3.6);
      const particleMass = 0.015 * preset.massMultiplier * (0.8 + density * 0.8);

      // Dynamic velocity: combination of noise curl + subtle Keplerian orbital swirl
      const curl = curlNoise2D(worldSampleX * noiseScale, worldSampleY * noiseScale);
      
      // Tangential orbital swirl around nebula center
      const angle = Math.atan2(relY, relX);
      const orbitalSpeed = (swirlFactor * 0.45) * Math.sqrt(normDist);
      const swirlVx = -Math.sin(angle) * orbitalSpeed;
      const swirlVy = Math.cos(angle) * orbitalSpeed;

      // Final velocity vector
      const vx = curl.vx * swirlFactor * 0.4 + swirlVx;
      const vy = curl.vy * swirlFactor * 0.4 + swirlVy;

      particles.push(createParticle(
        centerX + relX,
        centerY + relY,
        vx,
        vy,
        color,
        particleRadius,
        Infinity, // Long-lived interstellar gas
        true,     // Can participate in Jeans gravitational collapse into stars
        particleMass
      ));

      if (particles.length >= targetCount * 1.5) break;
    }
    if (particles.length >= targetCount * 1.5) break;
  }

  return { particles, info: preset };
}
