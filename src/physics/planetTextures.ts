/**
 * High-Fidelity Planetary & Stellar Texture & Spherical Raycasting Engine
 * Generates photorealistic equirectangular planetary maps (Earth, Mars, Jupiter, Saturn,
 * Sun, Moon, Mercury, Venus, Neptune, Uranus, Pluto, Europa, Io, Titan, etc.)
 * with authentic geography, topography, oceans, continents, deserts, city lights,
 * dynamic clouds, and convective stellar granulation.
 *
 * Provides a universal 3D spherical raycasting renderer supporting Blender-style
 * Shading Modes: Wireframe, Solid (Studio Clay), Material Preview, and Rendered.
 */

import { CelestialBody, PlanetKey } from '../types';
import { fbm2D } from './perlinNoise';

export type ShadingMode = 'wireframe' | 'solid' | 'material' | 'rendered';

export interface PlanetaryTextureSet {
  surface: HTMLCanvasElement;
  nightLights?: HTMLCanvasElement;
  clouds?: HTMLCanvasElement;
  specular?: HTMLCanvasElement;
}

// In-memory cache for equirectangular textures
const textureCache = new Map<string, PlanetaryTextureSet>();

// Standard texture resolution (optimized for fast generation & crisp 3D projection)
const TEX_W = 1024;
const TEX_H = 512;

/**
 * Retrieves or generates the procedural texture set for any celestial body
 */
export function getCelestialTextureSet(planetKey: PlanetKey, body?: CelestialBody): PlanetaryTextureSet {
  const cacheKey = planetKey + (body?.id ? `_${body.id.slice(0, 6)}` : '');
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  let textures: PlanetaryTextureSet;
  switch (planetKey) {
    case 'earth':
      textures = generateEarthTextures();
      break;
    case 'mars':
      textures = generateMarsTextures();
      break;
    case 'jupiter':
      textures = generateJupiterTextures();
      break;
    case 'saturn':
      textures = generateSaturnTextures();
      break;
    case 'sun':
    case 'generic_star':
      textures = generateStarTextures(body);
      break;
    case 'moon':
    case 'mercury':
    case 'callisto':
      textures = generateCrateredRockyTextures(planetKey);
      break;
    case 'venus':
      textures = generateVenusTextures();
      break;
    case 'neptune':
    case 'uranus':
      textures = generateIceGiantTextures(planetKey === 'neptune');
      break;
    case 'pluto':
      textures = generatePlutoTextures();
      break;
    case 'europa':
      textures = generateEuropaTextures();
      break;
    case 'io':
      textures = generateIoTextures();
      break;
    case 'titan':
      textures = generateTitanTextures();
      break;
    default:
      textures = generateGenericPlanetTextures(planetKey);
      break;
  }

  textureCache.set(cacheKey, textures);
  return textures;
}

// Backward-compatible alias
export function getEarthTextures(): PlanetaryTextureSet {
  return getCelestialTextureSet('earth');
}

// ============================================================================
// 1. PROCEDURAL EQUIRECTANGULAR TEXTURE GENERATORS
// ============================================================================

/**
 * Earth: Continents, deserts, mountain chains, oceans, night city lights, and clouds
 */
function generateEarthTextures(): PlanetaryTextureSet {
  const surface = document.createElement('canvas');
  surface.width = TEX_W;
  surface.height = TEX_H;
  const sCtx = surface.getContext('2d')!;

  // Deep ocean background with latitudinal depth
  const oceanGrad = sCtx.createLinearGradient(0, 0, 0, TEX_H);
  oceanGrad.addColorStop(0, '#0c4a6e');
  oceanGrad.addColorStop(0.3, '#0369a1');
  oceanGrad.addColorStop(0.5, '#0284c7');
  oceanGrad.addColorStop(0.7, '#0369a1');
  oceanGrad.addColorStop(1, '#0c4a6e');
  sCtx.fillStyle = oceanGrad;
  sCtx.fillRect(0, 0, TEX_W, TEX_H);

  // Continental shelves (shallow azure waters)
  sCtx.fillStyle = '#0ea5e9';
  drawEarthContinents(sCtx, TEX_W, TEX_H, 14, '#0ea5e9');

  // Continents: Green vegetation
  drawEarthContinents(sCtx, TEX_W, TEX_H, 0, '#15803d');

  // Deserts (Sahara, Arabia, Gobi, Australian Outback)
  drawEarthDeserts(sCtx, TEX_W, TEX_H);

  // Mountain ridges (Himalayas, Andes, Rockies)
  drawEarthMountains(sCtx, TEX_W, TEX_H);

  // Polar Ice Sheets (Antarctica & Arctic/Greenland)
  sCtx.fillStyle = '#f8fafc';
  sCtx.beginPath();
  sCtx.rect(0, TEX_H * 0.84, TEX_W, TEX_H * 0.16); // Antarctica
  sCtx.fill();
  sCtx.beginPath();
  sCtx.ellipse(TEX_W * 0.42, TEX_H * 0.13, TEX_W * 0.05, TEX_H * 0.07, -0.2, 0, Math.PI * 2); // Greenland
  sCtx.fill();
  sCtx.beginPath();
  sCtx.rect(0, 0, TEX_W, TEX_H * 0.06); // Arctic ice pack
  sCtx.fill();

  // Night-side City Lights
  const nightLights = document.createElement('canvas');
  nightLights.width = TEX_W;
  nightLights.height = TEX_H;
  const nCtx = nightLights.getContext('2d')!;
  nCtx.fillStyle = '#000000';
  nCtx.fillRect(0, 0, TEX_W, TEX_H);
  drawEarthCityLights(nCtx, TEX_W, TEX_H);

  // Cloud Deck
  const clouds = document.createElement('canvas');
  clouds.width = TEX_W;
  clouds.height = TEX_H;
  const cCtx = clouds.getContext('2d')!;
  cCtx.clearRect(0, 0, TEX_W, TEX_H);
  drawEarthClouds(cCtx, TEX_W, TEX_H);

  return { surface, nightLights, clouds };
}

function drawEarthContinents(ctx: CanvasRenderingContext2D, W: number, H: number, padding: number, color: string) {
  ctx.fillStyle = color;
  const blob = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
    ctx.beginPath();
    ctx.ellipse(cx * W, cy * H, rx * W + padding, ry * H + padding, rot, 0, Math.PI * 2);
    ctx.fill();
  };

  // North America
  blob(0.22, 0.28, 0.09, 0.09, -0.2);
  blob(0.24, 0.38, 0.07, 0.08, 0.1);
  blob(0.21, 0.47, 0.04, 0.05, 0.4);
  blob(0.28, 0.44, 0.02, 0.03, -0.3);

  // South America
  blob(0.33, 0.60, 0.06, 0.09, 0.3);
  blob(0.31, 0.73, 0.04, 0.09, 0.1);

  // Europe & Scandinavia
  blob(0.50, 0.28, 0.04, 0.05, 0.2);
  blob(0.54, 0.22, 0.03, 0.07, 0.3);
  blob(0.47, 0.27, 0.02, 0.03, 0.5);
  blob(0.48, 0.35, 0.03, 0.03, 0.0);
  blob(0.53, 0.34, 0.015, 0.04, 0.4);

  // Africa
  blob(0.53, 0.46, 0.08, 0.07, 0.1);
  blob(0.55, 0.62, 0.06, 0.09, -0.1);
  blob(0.64, 0.66, 0.015, 0.04, 0.4);

  // Asia
  blob(0.68, 0.25, 0.13, 0.10, 0.0);
  blob(0.72, 0.38, 0.09, 0.08, 0.1);
  blob(0.66, 0.46, 0.04, 0.06, -0.2);
  blob(0.59, 0.42, 0.04, 0.05, 0.3);
  blob(0.81, 0.35, 0.015, 0.06, 0.5);
  blob(0.76, 0.54, 0.05, 0.05, 0.4);

  // Australia & New Zealand
  blob(0.84, 0.70, 0.07, 0.06, 0.0);
  blob(0.92, 0.77, 0.015, 0.05, 0.6);
}

function drawEarthDeserts(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#b45309';
  const desertBlob = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
    ctx.beginPath();
    ctx.ellipse(cx * W, cy * H, rx * W, ry * H, rot, 0, Math.PI * 2);
    ctx.fill();
  };
  desertBlob(0.52, 0.44, 0.07, 0.04, 0.1); // Sahara
  desertBlob(0.59, 0.42, 0.035, 0.03, 0.3); // Arabia
  desertBlob(0.69, 0.34, 0.05, 0.03, 0.0); // Gobi
  desertBlob(0.83, 0.70, 0.045, 0.035, 0.0); // Australian Outback
  desertBlob(0.20, 0.40, 0.025, 0.03, 0.2); // Mojave / Sonoran
}

function drawEarthMountains(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.strokeStyle = '#78716c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W * 0.65, H * 0.38);
  ctx.lineTo(W * 0.72, H * 0.39); // Himalayas
  ctx.moveTo(W * 0.29, H * 0.53);
  ctx.lineTo(W * 0.32, H * 0.78); // Andes
  ctx.moveTo(W * 0.18, H * 0.24);
  ctx.lineTo(W * 0.22, H * 0.42); // Rockies
  ctx.stroke();
}

function drawEarthCityLights(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#fef08a';
  const city = (cx: number, cy: number, density: number, spread: number) => {
    for (let i = 0; i < density; i++) {
      const px = (cx + (Math.random() - 0.5) * spread) * W;
      const py = (cy + (Math.random() - 0.5) * spread * 0.5) * H;
      const sz = Math.random() * 1.5 + 0.5;
      ctx.globalAlpha = Math.random() * 0.7 + 0.3;
      ctx.fillRect(px, py, sz, sz);
    }
  };
  city(0.25, 0.38, 120, 0.07);
  city(0.18, 0.39, 45, 0.04);
  city(0.50, 0.29, 160, 0.06);
  city(0.54, 0.42, 40, 0.02);
  city(0.67, 0.44, 110, 0.06);
  city(0.76, 0.37, 140, 0.07);
  city(0.81, 0.35, 60, 0.03);
  city(0.35, 0.64, 45, 0.04);
  city(0.85, 0.72, 35, 0.04);
  ctx.globalAlpha = 1.0;
}

function drawEarthClouds(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  // ITCZ Belt
  for (let x = 0; x < W; x += 18) {
    const y = H * 0.5 + Math.sin(x * 0.025) * 14 + (Math.random() - 0.5) * 8;
    ctx.beginPath();
    ctx.ellipse(x, y, 24, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // Swirling Cyclones
  const cyclone = (cx: number, cy: number, r: number) => {
    for (let a = 0; a < Math.PI * 4; a += 0.3) {
      const cr = (a / (Math.PI * 4)) * r;
      const px = cx * W + Math.cos(a) * cr;
      const py = cy * H + Math.sin(a) * (cr * 0.6);
      ctx.beginPath();
      ctx.arc(px, py, Math.random() * 8 + 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  cyclone(0.38, 0.24, 45);
  cyclone(0.86, 0.26, 50);
  cyclone(0.25, 0.68, 48);
  cyclone(0.62, 0.72, 40);
}

/**
 * Mars: Rust-red oxidized iron terrain, Valles Marineris canyon, Olympus Mons caldera,
 * dark basaltic plains (Syrtis Major), and polar ice caps
 */
function generateMarsTextures(): PlanetaryTextureSet {
  const surface = document.createElement('canvas');
  surface.width = TEX_W;
  surface.height = TEX_H;
  const ctx = surface.getContext('2d')!;

  // 1. Base rust red gradient
  const bg = ctx.createLinearGradient(0, 0, 0, TEX_H);
  bg.addColorStop(0, '#7f1d1d');
  bg.addColorStop(0.2, '#991b1b');
  bg.addColorStop(0.5, '#b91c1c');
  bg.addColorStop(0.8, '#991b1b');
  bg.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // 2. Dark Basaltic Lowlands (Syrtis Major, Acidalia Planitia)
  ctx.fillStyle = '#450a0a';
  // Syrtis Major (distinct dark wedge)
  ctx.beginPath();
  ctx.moveTo(TEX_W * 0.70, TEX_H * 0.42);
  ctx.lineTo(TEX_W * 0.76, TEX_H * 0.48);
  ctx.lineTo(TEX_W * 0.71, TEX_H * 0.58);
  ctx.closePath();
  ctx.fill();

  // Acidalia Planitia & Sinus Meridiani
  ctx.beginPath();
  ctx.ellipse(TEX_W * 0.25, TEX_H * 0.32, TEX_W * 0.12, TEX_H * 0.08, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(TEX_W * 0.45, TEX_H * 0.54, TEX_W * 0.08, TEX_H * 0.05, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // 3. Valles Marineris (Colossal Grand Canyon System)
  ctx.strokeStyle = '#2d0606';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(TEX_W * 0.18, TEX_H * 0.53);
  ctx.bezierCurveTo(TEX_W * 0.28, TEX_H * 0.55, TEX_W * 0.35, TEX_H * 0.51, TEX_W * 0.42, TEX_H * 0.54);
  ctx.stroke();

  // 4. Olympus Mons & Tharsis Volcanoes
  // Olympus Mons shield caldera
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(TEX_W * 0.12, TEX_H * 0.40, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#450a0a';
  ctx.beginPath();
  ctx.arc(TEX_W * 0.12, TEX_H * 0.40, 6, 0, Math.PI * 2);
  ctx.fill();

  // Tharsis Montes chain
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(TEX_W * (0.20 + i * 0.03), TEX_H * (0.43 + i * 0.05), 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Polar Ice Caps (Water / CO2 ice)
  ctx.fillStyle = '#f8fafc';
  // North Polar Cap
  ctx.beginPath();
  ctx.rect(0, 0, TEX_W, TEX_H * 0.08);
  ctx.fill();
  // South Polar Cap
  ctx.beginPath();
  ctx.rect(0, TEX_H * 0.92, TEX_W, TEX_H * 0.08);
  ctx.fill();

  return { surface };
}

/**
 * Jupiter: Multi-band turbulent atmosphere with Great Red Spot,
 * Kelvin-Helmholtz billows, and white anticyclones
 */
function generateJupiterTextures(): PlanetaryTextureSet {
  const surface = document.createElement('canvas');
  surface.width = TEX_W;
  surface.height = TEX_H;
  const ctx = surface.getContext('2d')!;

  // 1. Band colors definition
  const bands = [
    { y: 0.00, h: 0.12, col: '#78350f' }, // North Polar Region
    { y: 0.12, h: 0.08, col: '#fed7aa' }, // North North Temperate Zone
    { y: 0.20, h: 0.09, col: '#9a3412' }, // North Temperate Belt
    { y: 0.29, h: 0.07, col: '#ffedd5' }, // North Tropical Zone
    { y: 0.36, h: 0.11, col: '#c2410c' }, // North Equatorial Belt (NEB)
    { y: 0.47, h: 0.09, col: '#fed7aa' }, // Equatorial Zone (EZ)
    { y: 0.56, h: 0.12, col: '#9a3412' }, // South Equatorial Belt (SEB)
    { y: 0.68, h: 0.08, col: '#ffedd5' }, // South Tropical Zone
    { y: 0.76, h: 0.08, col: '#c2410c' }, // South Temperate Belt
    { y: 0.84, h: 0.16, col: '#78350f' }, // South Polar Region
  ];

  bands.forEach(b => {
    ctx.fillStyle = b.col;
    ctx.fillRect(0, b.y * TEX_H, TEX_W, b.h * TEX_H);
  });

  // 2. Wave Shears / Turbulent Filaments on Belt Edges
  ctx.fillStyle = 'rgba(254, 215, 170, 0.45)';
  for (let x = 0; x < TEX_W; x += 12) {
    const waveY = TEX_H * 0.42 + Math.sin(x * 0.04) * 8;
    ctx.fillRect(x, waveY, 8, 4);
    const waveY2 = TEX_H * 0.62 + Math.cos(x * 0.035) * 10;
    ctx.fillRect(x, waveY2, 9, 5);
  }

  // 3. Great Red Spot (GRS) at ~22°S, longitude ~ 0.65
  const grsX = TEX_W * 0.65;
  const grsY = TEX_H * 0.64;
  const grsW = 55;
  const grsH = 28;

  // Dark brick-red outer storm ring
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.ellipse(grsX, grsY, grsW, grsH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Swirling salmon-pink core
  ctx.fillStyle = '#f87171';
  ctx.beginPath();
  ctx.ellipse(grsX, grsY, grsW * 0.6, grsH * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // White storm eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(grsX + 4, grsY - 2, 8, 5, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // 4. White Oval Anticyclones (String of Pearls)
  ctx.fillStyle = '#fef3c7';
  for (let i = 0; i < 6; i++) {
    const ox = ((i * 170 + 40) % TEX_W);
    const oy = TEX_H * 0.74;
    ctx.beginPath();
    ctx.ellipse(ox, oy, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return { surface };
}

/**
 * Saturn: Soft butter-gold banded atmosphere with polar hexagon
 */
function generateSaturnTextures(): PlanetaryTextureSet {
  const surface = document.createElement('canvas');
  surface.width = TEX_W;
  surface.height = TEX_H;
  const ctx = surface.getContext('2d')!;

  const saturnBands = [
    '#713f12', '#a16207', '#ca8a04', '#eab308',
    '#fef08a', '#fef9c3', '#fde047', '#eab308',
    '#ca8a04', '#a16207', '#713f12'
  ];
  const num = saturnBands.length;
  for (let i = 0; i < num; i++) {
    ctx.fillStyle = saturnBands[i];
    ctx.fillRect(0, (i / num) * TEX_H, TEX_W, (TEX_H / num) + 1);
  }

  // Hexagonal Polar Vortex at North Pole
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.arc(TEX_W * 0.5, TEX_H * 0.05, 30, 0, Math.PI * 2);
  ctx.fill();

  return { surface };
}

/**
 * Sun & Stars: Convective granulation cells & magnetic active sunspots
 */
function generateStarTextures(body?: CelestialBody): PlanetaryTextureSet {
  const surface = document.createElement('canvas');
  surface.width = TEX_W;
  surface.height = TEX_H;
  const ctx = surface.getContext('2d')!;

  const isSun = !body || body.planetKey === 'sun';
  const baseCol = isSun ? '#f97316' : '#38bdf8';
  const hotCol = isSun ? '#ffffff' : '#e0f2fe';

  // Base radiant convective plasma
  const grad = ctx.createLinearGradient(0, 0, 0, TEX_H);
  grad.addColorStop(0, isSun ? '#ea580c' : '#0284c7');
  grad.addColorStop(0.5, baseCol);
  grad.addColorStop(1, isSun ? '#ea580c' : '#0284c7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Boiling convective granulation cells
  ctx.fillStyle = hotCol;
  for (let i = 0; i < 450; i++) {
    const gx = Math.random() * TEX_W;
    const gy = Math.random() * TEX_H;
    const gw = Math.random() * 12 + 6;
    const gh = Math.random() * 8 + 4;
    ctx.globalAlpha = Math.random() * 0.45 + 0.2;
    ctx.beginPath();
    ctx.ellipse(gx, gy, gw, gh, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Active Bipolar Sunspots (dark umbra + fibrous penumbra)
  if (isSun) {
    const spotX = TEX_W * 0.42;
    const spotY = TEX_H * 0.44;
    // Penumbra
    ctx.fillStyle = '#9a3412';
    ctx.beginPath();
    ctx.ellipse(spotX, spotY, 24, 15, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Umbra
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.ellipse(spotX, spotY, 11, 7, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  return { surface };
}

/**
 * Moon / Mercury / Callisto: Basaltic Maria, rayed impact craters, and highlands
 */
function generateCrateredRockyTextures(planetKey: PlanetKey): PlanetaryTextureSet {
  const surface = document.createElement('canvas');
  surface.width = TEX_W;
  surface.height = TEX_H;
  const ctx = surface.getContext('2d')!;

  const isMercury = planetKey === 'mercury';
  // Base highland anorthosite
  ctx.fillStyle = isMercury ? '#64748b' : '#94a3b8';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Dark basaltic maria
  ctx.fillStyle = isMercury ? '#334155' : '#1e293b';
  // Oceanus Procellarum / Sea of Tranquillity
  ctx.beginPath();
  ctx.ellipse(TEX_W * 0.35, TEX_H * 0.42, TEX_W * 0.16, TEX_H * 0.18, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(TEX_W * 0.58, TEX_H * 0.38, TEX_W * 0.12, TEX_H * 0.14, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(TEX_W * 0.72, TEX_H * 0.34, TEX_W * 0.08, TEX_H * 0.09, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Impact craters with central peaks and radial ejecta rays
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1.2;
  for (let c = 0; c < 24; c++) {
    const cx = (c * 43) % TEX_W;
    const cy = ((c * 67 + 20) % (TEX_H * 0.8)) + TEX_H * 0.1;
    const cr = (c % 5) * 3 + 5;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Central peak
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Radial rays on prominent craters
    if (c === 7 || c === 14) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      for (let r = 0; r < 8; r++) {
        const ang = r * (Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * 90, cy + Math.sin(ang) * 90);
        ctx.stroke();
      }
    }
  }

  return { surface };
}

/**
 * Venus: Swirling sulfuric acid clouds with UV chevron patterns
 */
function generateVenusTextures(): PlanetaryTextureSet {
  const surface = document.createElement('canvas');
  surface.width = TEX_W;
  surface.height = TEX_H;
  const ctx = surface.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, TEX_H);
  grad.addColorStop(0, '#ca8a04');
  grad.addColorStop(0.3, '#facc15');
  grad.addColorStop(0.5, '#fef08a');
  grad.addColorStop(0.7, '#facc15');
  grad.addColorStop(1, '#ca8a04');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Chevron atmospheric wave patterns
  ctx.strokeStyle = 'rgba(161, 98, 7, 0.35)';
  ctx.lineWidth = 8;
  for (let y = 50; y < TEX_H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(TEX_W * 0.25, y + 30, TEX_W * 0.75, y - 30, TEX_W, y);
    ctx.stroke();
  }

  return { surface };
}

/**
 * Neptune & Uranus: Methane ice giants with cirrus storms and Great Dark Spot
 */
function generateIceGiantTextures(isNeptune: boolean): PlanetaryTextureSet {
  const surface = document.createElement('canvas');
  surface.width = TEX_W;
  surface.height = TEX_H;
  const ctx = surface.getContext('2d')!;

  const deepCol = isNeptune ? '#1e3a8a' : '#0891b2';
  const midCol = isNeptune ? '#0284c7' : '#22d3ee';
  const lightCol = isNeptune ? '#38bdf8' : '#a5f3fc';

  const grad = ctx.createLinearGradient(0, 0, 0, TEX_H);
  grad.addColorStop(0, deepCol);
  grad.addColorStop(0.5, midCol);
  grad.addColorStop(1, deepCol);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  if (isNeptune) {
    // Great Dark Spot
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(TEX_W * 0.62, TEX_H * 0.45, 45, 24, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // High-altitude white methane cirrus streaks
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) {
      const cx = (i * 120 + 30) % TEX_W;
      const cy = TEX_H * 0.40 + (i % 3) * 20;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 35, 4, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return { surface };
}

/**
 * Pluto: Tombaugh Regio bright nitrogen-ice heart & dark tholin Cthulhu Macula
 */
function generatePlutoTextures(): PlanetaryTextureSet {
  const surface = document.createElement('canvas');
  surface.width = TEX_W;
  surface.height = TEX_H;
  const ctx = surface.getContext('2d')!;

  ctx.fillStyle = '#78350f'; // Dark reddish tholins
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.rect(0, TEX_H * 0.15, TEX_W, TEX_H * 0.7);
  ctx.fill();

  // Tombaugh Regio white nitrogen ice heart
  const hx = TEX_W * 0.55;
  const hy = TEX_H * 0.48;
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(hx - 22, hy, 45, 55, -0.3, 0, Math.PI * 2);
  ctx.ellipse(hx + 22, hy, 45, 55, 0.3, 0, Math.PI * 2);
  ctx.fill();

  return { surface };
}

/**
 * Europa: Cracked ice shell over subsurface ocean with reddish-brown cycloid fractures
 */
function generateEuropaTextures(): PlanetaryTextureSet {
  const surface = document.createElement('canvas');
  surface.width = TEX_W;
  surface.height = TEX_H;
  const ctx = surface.getContext('2d')!;

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Reddish-brown fracture lines (lineae)
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 3;
  for (let l = 0; l < 12; l++) {
    const sx = (l * 85) % TEX_W;
    const sy = (l * 40) % TEX_H;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(sx + 100, sy + 60, sx + 200, sy - 40, sx + 300, sy + 80);
    ctx.stroke();
  }

  return { surface };
}

/**
 * Io: Vivid sulfur yellow/orange volcanic calderas & lava lakes
 */
function generateIoTextures(): PlanetaryTextureSet {
  const surface = document.createElement('canvas');
  surface.width = TEX_W;
  surface.height = TEX_H;
  const ctx = surface.getContext('2d')!;

  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Calderas (Loki Patera, Pele)
  for (let v = 0; v < 18; v++) {
    const vx = (v * 58) % TEX_W;
    const vy = (v * 42 + 25) % TEX_H;
    // White SO2 frost ring
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(vx, vy, 16, 0, Math.PI * 2);
    ctx.stroke();
    // Black lava caldera
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(vx, vy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  return { surface };
}

/**
 * Titan: Smooth orange photochemical smog with polar methane lakes
 */
function generateTitanTextures(): PlanetaryTextureSet {
  const surface = document.createElement('canvas');
  surface.width = TEX_W;
  surface.height = TEX_H;
  const ctx = surface.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, TEX_H);
  grad.addColorStop(0, '#ea580c');
  grad.addColorStop(0.5, '#fb923c');
  grad.addColorStop(1, '#ea580c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Polar liquid methane lakes (Kraken Mare)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(TEX_W * 0.45, TEX_H * 0.12, 35, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  return { surface };
}

/**
 * Generic Fallback Planet
 */
function generateGenericPlanetTextures(planetKey: PlanetKey): PlanetaryTextureSet {
  const surface = document.createElement('canvas');
  surface.width = TEX_W;
  surface.height = TEX_H;
  const ctx = surface.getContext('2d')!;

  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  return { surface };
}

// ============================================================================
// 2. UNIVERSAL 3D SPHERICAL RAYCASTING RENDERER (BLENDER SHADING MODES)
// ============================================================================

export interface RenderCelestial3DOptions {
  cx: number;
  cy: number;
  radius: number;
  yaw: number;
  pitch: number;
  time: number;
  lightDir: { x: number; y: number; z: number };
  planetKey: PlanetKey;
  body: CelestialBody;
  shadingMode: ShadingMode;
  isOrthographic?: boolean;
}

/**
 * Universal High-Fidelity 3D Spherical Raycaster for all celestial bodies
 */
export function renderPhotorealisticCelestialBody(
  ctx: CanvasRenderingContext2D,
  options: RenderCelestial3DOptions
) {
  const {
    cx,
    cy,
    radius,
    yaw,
    pitch,
    time,
    lightDir,
    planetKey,
    body,
    shadingMode,
    isOrthographic = false
  } = options;

  // 1. WIREFRAME MODE: Clean 3D polygonal UV wireframe mesh (Latitude/Longitude rings)
  if (shadingMode === 'wireframe') {
    render3DWireframeSphere(ctx, cx, cy, radius, yaw, pitch);
    return;
  }

  // 2. SOLID MODE: Studio MatCap clay shading with specular curvature
  if (shadingMode === 'solid') {
    render3DStudioSolid(ctx, cx, cy, radius, yaw, pitch, lightDir);
    return;
  }

  // 3 & 4. MATERIAL PREVIEW & RENDERED MODES:
  // Photorealistic equirectangular texture raycasting onto the 3D sphere!
  const textures = getCelestialTextureSet(planetKey, body);
  const W_tex = textures.surface.width;
  const H_tex = textures.surface.height;

  // Render on offscreen buffer matching diameter
  const diam = Math.max(128, Math.min(512, Math.ceil(radius * 2)));
  const sphereCanvas = document.createElement('canvas');
  sphereCanvas.width = diam;
  sphereCanvas.height = diam;
  const sCtx = sphereCanvas.getContext('2d')!;

  const imgData = sCtx.createImageData(diam, diam);
  const data = new Uint32Array(imgData.data.buffer);

  // Surface texture pixel buffer
  const surfData = new Uint32Array(
    textures.surface.getContext('2d')!.getImageData(0, 0, W_tex, H_tex).data.buffer
  );

  // Night lights pixel buffer (Earth / civilization)
  const nightData = textures.nightLights
    ? new Uint32Array(textures.nightLights.getContext('2d')!.getImageData(0, 0, W_tex, H_tex).data.buffer)
    : null;

  // Clouds pixel buffer
  const cloudData = textures.clouds
    ? new Uint32Array(textures.clouds.getContext('2d')!.getImageData(0, 0, W_tex, H_tex).data.buffer)
    : null;

  // Rotation angles
  const spinAngle = yaw + time * 0.12;
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const cosY = Math.cos(spinAngle);
  const sinY = Math.sin(spinAngle);

  // Cloud differential drift
  const cloudSpin = spinAngle + time * 0.04;
  const cosCY = Math.cos(cloudSpin);
  const sinCY = Math.sin(cloudSpin);

  // Precompute body-space light vector for exact 3D ring shadow raycasting
  const L_nx1 = lightDir.x;
  const L_ny1 = lightDir.y * cosP + lightDir.z * sinP;
  const L_nz1 = -lightDir.y * sinP + lightDir.z * cosP;
  const L_bx = L_nx1 * cosY - L_nz1 * sinY;
  const L_by = L_ny1;
  const L_bz = L_nx1 * sinY + L_nz1 * cosY;

  const halfDiam = diam / 2;
  const rSq = halfDiam * halfDiam;
  const invR = 1 / halfDiam;

  const isStar = planetKey === 'sun' || planetKey === 'generic_star';

  for (let py = 0; py < diam; py++) {
    const dy = py - halfDiam;
    const dySq = dy * dy;
    const rowOffset = py * diam;

    for (let px = 0; px < diam; px++) {
      const dx = px - halfDiam;
      const dSq = dx * dx + dySq;

      if (dSq > rSq) {
        data[rowOffset + px] = 0;
        continue;
      }

      // Normal on sphere in screen space (nx, ny, nz)
      const nx = dx * invR;
      const ny = -dy * invR;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));

      // 1. Inverse pitch (X-axis)
      const nx1 = nx;
      const ny1 = ny * cosP + nz * sinP;
      const nz1 = -ny * sinP + nz * cosP;

      // 2. Inverse yaw / diurnal spin (Y-axis)
      const bx = nx1 * cosY - nz1 * sinY;
      const by = ny1;
      const bz = nx1 * sinY + nz1 * cosY;

      // 3. Spherical coordinates -> Equirectangular UV
      const lat = Math.asin(Math.max(-1, Math.min(1, by)));
      const lon = Math.atan2(bx, bz);

      const u = (lon + Math.PI) / (Math.PI * 2);
      const v = (Math.PI * 0.5 - lat) / Math.PI;

      const tx = Math.floor(u * W_tex) % W_tex;
      const ty = Math.max(0, Math.min(H_tex - 1, Math.floor(v * H_tex)));
      const texIdx = ty * W_tex + (tx < 0 ? tx + W_tex : tx);

      // Sample day surface pixel
      const dayPixel = surfData[texIdx];
      let dr = dayPixel & 0xff;
      let dg = (dayPixel >> 8) & 0xff;
      let db = (dayPixel >> 16) & 0xff;

      // Blend clouds if present
      if (cloudData) {
        const c_bx = nx1 * cosCY - nz1 * sinCY;
        const c_bz = nx1 * sinCY + nz1 * cosCY;
        const c_lon = Math.atan2(c_bx, c_bz);
        const cu = (c_lon + Math.PI) / (Math.PI * 2);
        const ctxX = Math.floor(cu * W_tex) % W_tex;
        const cTexIdx = ty * W_tex + (ctxX < 0 ? ctxX + W_tex : ctxX);
        const cPixel = cloudData[cTexIdx];
        const cAlpha = (cPixel >> 24) & 0xff;

        if (cAlpha > 10) {
          const cFrac = (cAlpha / 255) * 0.85;
          dr = dr * (1 - cFrac) + 250 * cFrac;
          dg = dg * (1 - cFrac) + 252 * cFrac;
          db = db * (1 - cFrac) + 255 * cFrac;
        }
      }

      // -------------------------------------------------------------
      // SHADING MODE: MATERIAL PREVIEW (Flat ambient texture view)
      // -------------------------------------------------------------
      if (shadingMode === 'material') {
        // Mild curvature gradient for 3D depth, without dark shadow
        const ambientCurve = 0.85 + 0.15 * nz;
        data[rowOffset + px] =
          (255 << 24) |
          (Math.min(255, Math.floor(db * ambientCurve)) << 16) |
          (Math.min(255, Math.floor(dg * ambientCurve)) << 8) |
          Math.min(255, Math.floor(dr * ambientCurve));
        continue;
      }

      // -------------------------------------------------------------
      // SHADING MODE: RENDERED (Full physical lighting, terminator, glint)
      // -------------------------------------------------------------
      if (isStar) {
        // Stars emit their own radiant light! Eddington limb darkening:
        // I(mu) = I0 * (0.4 + 0.6 * mu)
        const limbDarkening = 0.45 + 0.55 * nz;
        data[rowOffset + px] =
          (255 << 24) |
          (Math.min(255, Math.floor(db * limbDarkening)) << 16) |
          (Math.min(255, Math.floor(dg * limbDarkening)) << 8) |
          Math.min(255, Math.floor(dr * limbDarkening));
        continue;
      }

      // Physical sun illumination dot product: dot(Normal, Light)
      const NdotL = nx * lightDir.x + ny * lightDir.y + nz * lightDir.z;
      let sunIllum = Math.max(0, Math.min(1, NdotL * 1.35 + 0.04));

      // Exact physical ring shadow cast onto planet sphere (Saturn & Uranus)
      if (body.hasRings && sunIllum > 0.02 && Math.abs(L_by) > 0.0001) {
        // Light ray from surface point (bx, by, bz) towards Sun: P + t * L_b, intersects ring plane by = 0
        const tRing = -by / L_by;
        if (tRing > 0.001) {
          const hitX = bx + tRing * L_bx;
          const hitZ = bz + tRing * L_bz;
          const rHit = Math.hypot(hitX, hitZ);

          // Authentic Saturn ring radii (in units of planet radius R):
          // C Ring: 1.23 to 1.52 (semi-transparent)
          // B Ring: 1.52 to 1.95 (dense opaque ice, deep dark shadow)
          // Cassini Division: 1.95 to 2.02 (transparent gap transmits sunlight!)
          // A Ring: 2.02 to 2.27 (moderately dense)
          if (rHit >= 1.23 && rHit <= 2.27) {
            if (rHit >= 1.95 && rHit <= 2.02) {
              sunIllum *= 0.88; // Sunlight streams through Cassini Division!
            } else if (rHit >= 1.52 && rHit <= 1.95) {
              sunIllum *= 0.06; // Dense B-ring dark shadow band
            } else if (rHit >= 2.02 && rHit <= 2.27) {
              sunIllum *= 0.20; // A-ring shadow band
            } else {
              sunIllum *= 0.65; // C-ring subtle shadow
            }
          }
        }
      }

      // Specular ocean sun reflection (Phong glint on Earth water)
      if (planetKey === 'earth' && db > dr + 15 && sunIllum > 0.1) {
        const Hx = lightDir.x;
        const Hy = lightDir.y;
        const Hz = lightDir.z + 1.0;
        const hLen = Math.hypot(Hx, Hy, Hz) || 1;
        const spec = Math.pow(Math.max(0, (nx * Hx + ny * Hy + nz * Hz) / hLen), 32);
        dr = Math.min(255, dr + spec * 220);
        dg = Math.min(255, dg + spec * 235);
        db = Math.min(255, db + spec * 255);
      }

      let outR = dr * sunIllum;
      let outG = dg * sunIllum;
      let outB = db * sunIllum;

      // Night-side glowing city lights (for Earth in the dark)
      if (nightData && sunIllum < 0.25) {
        const nightFrac = Math.pow(1 - sunIllum / 0.25, 1.8);
        const nightPixel = nightData[texIdx];
        const nr = nightPixel & 0xff;
        const ng = (nightPixel >> 8) & 0xff;
        const nb = (nightPixel >> 16) & 0xff;
        outR += nr * nightFrac * 1.4;
        outG += ng * nightFrac * 1.2;
        outB += nb * nightFrac * 0.6;
      }

      // Atmospheric limb Rayleigh scattering
      const rim = 1 - nz;
      if (rim > 0.6) {
        const rimFac = Math.pow((rim - 0.6) / 0.4, 2) * 0.42;
        const rimColor =
          planetKey === 'earth'
            ? [56, 189, 248]
            : planetKey === 'mars'
            ? [248, 113, 113]
            : planetKey === 'venus'
            ? [254, 240, 138]
            : [148, 163, 184];
        outR = outR * (1 - rimFac) + rimColor[0] * rimFac;
        outG = outG * (1 - rimFac) + rimColor[1] * rimFac;
        outB = outB * (1 - rimFac) + rimColor[2] * rimFac;
      }

      data[rowOffset + px] =
        (255 << 24) |
        (Math.min(255, Math.floor(outB)) << 16) |
        (Math.min(255, Math.floor(outG)) << 8) |
        Math.min(255, Math.floor(outR));
    }
  }

  sCtx.putImageData(imgData, 0, 0);

  // Draw rendered sphere onto destination canvas (smoothly scaled)
  ctx.drawImage(sphereCanvas, cx - radius, cy - radius, radius * 2, radius * 2);
}

// Backward-compatible wrapper
export function renderPhotorealisticEarth(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  yaw: number,
  pitch: number,
  time: number,
  lightDir: { x: number; y: number; z: number }
) {
  renderPhotorealisticCelestialBody(ctx, {
    cx,
    cy,
    radius,
    yaw,
    pitch,
    time,
    lightDir,
    planetKey: 'earth',
    body: {
      id: 'earth',
      name: 'Земля',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: 0.000003,
      radius: 6371,
      color: '#38bdf8',
      type: 'PLANET',
      Teff: 288,
      planetKey: 'earth'
    } as unknown as CelestialBody,
    shadingMode: 'rendered'
  });
}

// ============================================================================
// 3. BLENDER WIREFRAME & SOLID SHADING IMPLEMENTATIONS
// ============================================================================

/**
 * 3D UV Wireframe Mesh (Latitude/Longitude rings with depth cueing)
 */
export function render3DWireframeSphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  yaw: number,
  pitch: number
) {
  ctx.save();
  ctx.translate(cx, cy);

  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);

  // Transform 3D sphere coordinate to 2D screen
  const project = (lat: number, lon: number): { x: number; y: number; z: number } => {
    // Unit sphere
    const cosLat = Math.cos(lat);
    const x0 = cosLat * Math.sin(lon);
    const y0 = Math.sin(lat);
    const z0 = cosLat * Math.cos(lon);

    // 1. Rotate yaw (Y)
    const x1 = x0 * cosY + z0 * sinY;
    const y1 = y0;
    const z1 = -x0 * sinY + z0 * cosY;

    // 2. Rotate pitch (X)
    const x2 = x1;
    const y2 = y1 * cosP - z1 * sinP;
    const z2 = y1 * sinP + z1 * cosP;

    return {
      x: x2 * radius,
      y: -y2 * radius,
      z: z2
    };
  };

  // 1. Latitude Rings (from -75° to +75° every 15°)
  const latSteps = 11;
  for (let i = 1; i <= latSteps; i++) {
    const lat = -Math.PI * 0.45 + (i / (latSteps + 1)) * Math.PI * 0.9;
    ctx.beginPath();
    let first = true;
    for (let s = 0; s <= 64; s++) {
      const lon = (s / 64) * Math.PI * 2;
      const pt = project(lat, lon);
      if (pt.z >= -0.05) {
        if (first) {
          ctx.moveTo(pt.x, pt.y);
          first = false;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      } else {
        first = true;
      }
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Backface faint line
    ctx.beginPath();
    let bFirst = true;
    for (let s = 0; s <= 64; s++) {
      const lon = (s / 64) * Math.PI * 2;
      const pt = project(lat, lon);
      if (pt.z < -0.05) {
        if (bFirst) {
          ctx.moveTo(pt.x, pt.y);
          bFirst = false;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      } else {
        bFirst = true;
      }
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // 2. Longitude Rings (every 30° around the equator)
  const lonSteps = 12;
  for (let i = 0; i < lonSteps; i++) {
    const lon = (i / lonSteps) * Math.PI * 2;
    // Front half
    ctx.beginPath();
    let first = true;
    for (let s = 0; s <= 48; s++) {
      const lat = -Math.PI * 0.5 + (s / 48) * Math.PI;
      const pt = project(lat, lon);
      if (pt.z >= -0.05) {
        if (first) {
          ctx.moveTo(pt.x, pt.y);
          first = false;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      } else {
        first = true;
      }
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Back half
    ctx.beginPath();
    let bFirst = true;
    for (let s = 0; s <= 48; s++) {
      const lat = -Math.PI * 0.5 + (s / 48) * Math.PI;
      const pt = project(lat, lon);
      if (pt.z < -0.05) {
        if (bFirst) {
          ctx.moveTo(pt.x, pt.y);
          bFirst = false;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      } else {
        bFirst = true;
      }
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Outer silhouette rim
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * 3D Solid Mode (Blender Studio Clay / MatCap shading with directional curvature)
 */
export function render3DStudioSolid(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  yaw: number,
  pitch: number,
  lightDir: { x: number; y: number; z: number }
) {
  ctx.save();
  // Studio Clay Lighting Gradient
  const lightX = cx + lightDir.x * radius * 0.65;
  const lightY = cy - lightDir.y * radius * 0.65;

  const grad = ctx.createRadialGradient(
    lightX,
    lightY,
    radius * 0.05,
    cx,
    cy,
    radius * 1.05
  );
  grad.addColorStop(0, '#f8fafc'); // Key highlight
  grad.addColorStop(0.3, '#cbd5e1'); // Midtones
  grad.addColorStop(0.7, '#64748b'); // Shaded clay
  grad.addColorStop(0.92, '#334155'); // Deep shadow
  grad.addColorStop(1, '#0f172a');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle specular rim highlight
  ctx.globalCompositeOperation = 'screen';
  const rimGrad = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.02);
  rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.35)');
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ============================================================================
// 4. 3D RINGS RENDERING WITH SHADOWS (SATURN & URANUS)
// ============================================================================

/**
 * Renders authentic 3D planetary rings with Cassini division, physical orientation, and shadow casting
 */
export function render3DRingsWithShadows(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sphereRadius: number,
  pitch: number,
  yaw: number,
  isForeground: boolean,
  ringBaseColor: string = '#fef08a',
  lightDir?: { x: number; y: number; z: number }
) {
  const ringTilt = 0.47; // Saturn's axial tilt (~27 deg)
  const ringInner = sphereRadius * 1.35;
  const ringCassiniInner = sphereRadius * 1.88;
  const ringCassiniOuter = sphereRadius * 1.98;
  const ringOuter = sphereRadius * 2.45;

  // 3D Ring Normal in camera space:
  // Ring equatorial plane tilted by ringTilt
  const sinT = Math.sin(ringTilt);
  const cosT = Math.cos(ringTilt);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);

  // Normal vector of the ring plane in camera coordinates
  const nCamX = -sinT * sinY;
  const nCamY = cosT * cosP + sinT * cosY * sinP;
  const nCamZ = -cosT * sinP + sinT * cosY * cosP;

  // On-screen inclination angle (rotation of ring ellipse major axis)
  const ellipseAngle = Math.atan2(nCamX, nCamY);
  // Ellipse aspect ratio (thickness along minor axis = |nCamZ|)
  const ringHeight = Math.max(0.04, Math.abs(nCamZ));

  // Determine which side of the major axis is foreground (closer in Z)
  // When looking along minor axis, positive coordinate corresponds to z > 0 if nCamZ > 0
  const isFacingViewer = nCamZ > 0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-ellipseAngle);

  // Clip foreground vs background half along the ring ellipse major axis (Y=0 in local rotated frame)
  ctx.beginPath();
  if (isForeground) {
    if (isFacingViewer) {
      // Lower half is closer to camera
      ctx.rect(-ringOuter * 1.4, 0, ringOuter * 2.8, ringOuter * 1.4);
    } else {
      // Upper half is closer to camera
      ctx.rect(-ringOuter * 1.4, -ringOuter * 1.4, ringOuter * 2.8, ringOuter * 1.4);
    }
  } else {
    if (isFacingViewer) {
      // Upper half is behind the planet
      ctx.rect(-ringOuter * 1.4, -ringOuter * 1.4, ringOuter * 2.8, ringOuter * 1.4);
    } else {
      // Lower half is behind the planet
      ctx.rect(-ringOuter * 1.4, 0, ringOuter * 2.8, ringOuter * 1.4);
    }
  }
  ctx.clip();

  // Draw concentric ring bands
  // C Ring (Crepuscular faint inner veil)
  drawRingArc(ctx, sphereRadius * 1.20, ringInner, ringHeight, 'rgba(217, 201, 155, 0.28)');
  // B Ring (Dense & Bright inner ring, high albedo)
  drawRingArc(ctx, ringInner, ringCassiniInner, ringHeight, 'rgba(254, 240, 138, 0.88)');
  // Cassini Division (Dark clear space gap)
  drawRingArc(ctx, ringCassiniInner, ringCassiniOuter, ringHeight, 'rgba(2, 6, 23, 0.50)');
  // A Ring (Outer ring)
  drawRingArc(ctx, ringCassiniOuter, ringOuter, ringHeight, 'rgba(253, 224, 71, 0.65)');
  // F Ring (Delicate outer ring filament)
  drawRingArc(ctx, ringOuter * 1.01, ringOuter * 1.03, ringHeight, 'rgba(254, 240, 138, 0.45)');

  // --------------------------------------------------------------------------
  // PHYSICAL SPHERICAL SHADOW OF SATURN CAST ONTO THE RINGS
  // --------------------------------------------------------------------------
  // The sphere of Saturn blocks sunlight in direction opposite to lightDir
  const L = lightDir || { x: 0.7, y: 0.35, z: 0.6 };

  // Transform light vector into ring local rotated frame
  const cosRot = Math.cos(-ellipseAngle);
  const sinRot = Math.sin(-ellipseAngle);
  const L_localX = L.x * cosRot - L.y * sinRot;
  const L_localY = L.x * sinRot + L.y * cosRot;

  // Shadow projects in direction -L_local
  const shadowDirX = -L_localX;
  const shadowDirY = -L_localY;
  const sLen = Math.hypot(shadowDirX, shadowDirY) || 1;
  const sUx = shadowDirX / sLen;
  const sUy = shadowDirY / sLen;

  // The shadow is on the side away from the Sun.
  // In 3D: points behind the planet (L.z > 0) are in the background half;
  // points with L.z < 0 cast shadow towards the viewer into foreground.
  // When light has lateral angle, shadow sweeps across the rings.
  const shadowFallsOnBackground = L.z > -0.15;
  const shadowFallsOnForeground = L.z < 0.15;
  const shouldRenderShadow =
    (isForeground && shadowFallsOnForeground) || (!isForeground && shadowFallsOnBackground);

  if (shouldRenderShadow) {
    ctx.save();
    // Shadow cylinder cross-section perpendicular to shadow direction
    const pUx = -sUy;
    const pUy = sUx;
    const shadowR = sphereRadius * 1.04;
    const shadowReach = ringOuter * 1.35;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
    ctx.beginPath();
    ctx.moveTo(pUx * shadowR, pUy * shadowR * ringHeight);
    ctx.lineTo(
      sUx * shadowReach + pUx * shadowR * 1.12,
      (sUy * shadowReach + pUy * shadowR * 1.12) * ringHeight
    );
    ctx.lineTo(
      sUx * shadowReach - pUx * shadowR * 1.12,
      (sUy * shadowReach - pUy * shadowR * 1.12) * ringHeight
    );
    ctx.lineTo(-pUx * shadowR, -pUy * shadowR * ringHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawRingArc(
  ctx: CanvasRenderingContext2D,
  rIn: number,
  rOut: number,
  scaleY: number,
  color: string
) {
  ctx.save();
  ctx.scale(1.0, scaleY);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, rOut, 0, Math.PI * 2);
  ctx.arc(0, 0, rIn, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();
}
