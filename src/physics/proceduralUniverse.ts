/**
 * StellarGenesis - Procedural Universe Engine
 * Deterministic generation of infinite cosmos, deep field galaxies, nebulas, and star sectors.
 */

import { CameraState, CelestialBody } from '../types';
import { calculateGravitationalDeflection } from './gravitationalLensing';

export const SECTOR_SIZE = 2600; // in world coordinates

export interface SectorStar {
  x: number;
  y: number;
  size: number;
  alpha: number;
  color: string;
}

export type DeepSpaceObjectType = 'spiral_galaxy' | 'elliptical_galaxy' | 'emission_nebula' | 'star_cluster';

export interface DeepSpaceObject {
  type: DeepSpaceObjectType;
  x: number;
  y: number;
  size: number;
  angle: number;
  primaryColor: string;
  secondaryColor: string;
  name: string;
}

export interface CosmicSector {
  gridX: number;
  gridY: number;
  stars: SectorStar[];
  deepSpaceObject: DeepSpaceObject | null;
}

/**
 * Deterministic fast 32-bit integer hash (Murmur3 / Wang-style)
 */
function hash2D(x: number, y: number, seed: number = 1337): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1013904223) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0);
}

/**
 * Pseudo-random generator in [0, 1) from hash
 */
function prng(seed: number, step: number): number {
  return ((hash2D(seed, step) % 1000000) / 1000000);
}

// Sector LRU Cache to avoid regenerating sector geometries each frame
const SECTOR_CACHE = new Map<string, CosmicSector>();
const MAX_CACHED_SECTORS = 300;

/**
 * Generates sector data deterministically based on grid coordinates (with LRU memoization)
 */
export function generateSector(gridX: number, gridY: number): CosmicSector {
  const key = `${gridX},${gridY}`;
  const cached = SECTOR_CACHE.get(key);
  if (cached) {
    return cached;
  }

  const seed = hash2D(gridX, gridY);
  const baseX = gridX * SECTOR_SIZE;
  const baseY = gridY * SECTOR_SIZE;

  // 1. Generate 30-45 background stars
  const starCount = Math.floor(prng(seed, 1) * 15 + 30);
  const stars: SectorStar[] = [];
  const starColors = [
    'rgba(248, 250, 252, ', // crisp white
    'rgba(186, 230, 253, ', // faint cyan
    'rgba(254, 240, 138, ', // faint yellow
    'rgba(254, 215, 170, ', // faint orange
    'rgba(233, 213, 255, '  // faint violet
  ];

  for (let i = 0; i < starCount; i++) {
    const sColor = starColors[Math.floor(prng(seed, 10 + i * 4) * starColors.length)];
    const alpha = prng(seed, 11 + i * 4) * 0.6 + 0.2;
    stars.push({
      x: baseX + prng(seed, 12 + i * 4) * SECTOR_SIZE,
      y: baseY + prng(seed, 13 + i * 4) * SECTOR_SIZE,
      size: prng(seed, 14 + i * 4) * 1.5 + 0.5,
      alpha,
      color: `${sColor}${alpha.toFixed(2)})`
    });
  }

  // 2. Generate Deep Space Object (~36% chance per sector)
  let deepSpaceObject: DeepSpaceObject | null = null;
  const objectRoll = prng(seed, 99);
  if (objectRoll < 0.36) {
    const typeRoll = prng(seed, 100);
    const objX = baseX + prng(seed, 101) * (SECTOR_SIZE * 0.7) + SECTOR_SIZE * 0.15;
    const objY = baseY + prng(seed, 102) * (SECTOR_SIZE * 0.7) + SECTOR_SIZE * 0.15;
    const size = prng(seed, 103) * 350 + 250;
    const angle = prng(seed, 104) * Math.PI * 2;

    const sectorCatalogNumber = Math.floor(prng(seed, 105) * 8000 + 100);

    if (typeRoll < 0.35) {
      // Spiral Galaxy
      deepSpaceObject = {
        type: 'spiral_galaxy',
        x: objX,
        y: objY,
        size,
        angle,
        primaryColor: 'rgba(56, 189, 248, 0.45)', // cyan arms
        secondaryColor: 'rgba(253, 224, 71, 0.65)', // golden core
        name: `NGC-${sectorCatalogNumber}`
      };
    } else if (typeRoll < 0.65) {
      // Emission Nebula
      deepSpaceObject = {
        type: 'emission_nebula',
        x: objX,
        y: objY,
        size: size * 1.3,
        angle,
        primaryColor: 'rgba(236, 72, 153, 0.35)', // pink/magenta
        secondaryColor: 'rgba(168, 85, 247, 0.30)', // violet
        name: `Туманность SG-${sectorCatalogNumber}`
      };
    } else if (typeRoll < 0.85) {
      // Elliptical Galaxy
      deepSpaceObject = {
        type: 'elliptical_galaxy',
        x: objX,
        y: objY,
        size: size * 0.9,
        angle,
        primaryColor: 'rgba(251, 146, 60, 0.35)',
        secondaryColor: 'rgba(254, 240, 138, 0.6)',
        name: `Галактика Мессье M-${(sectorCatalogNumber % 110) + 1}`
      };
    } else {
      // Star Cluster
      deepSpaceObject = {
        type: 'star_cluster',
        x: objX,
        y: objY,
        size: size * 0.8,
        angle,
        primaryColor: 'rgba(125, 211, 252, 0.6)',
        secondaryColor: 'rgba(255, 255, 255, 0.8)',
        name: `Скопление Звезд CL-${sectorCatalogNumber}`
      };
    }
  }

  const sector: CosmicSector = {
    gridX,
    gridY,
    stars,
    deepSpaceObject
  };

  if (SECTOR_CACHE.size >= MAX_CACHED_SECTORS) {
    const firstKey = SECTOR_CACHE.keys().next().value;
    if (firstKey) SECTOR_CACHE.delete(firstKey);
  }
  SECTOR_CACHE.set(key, sector);

  return sector;
}

/**
 * Returns visible sector grid coordinates for the current viewport
 */
export function getVisibleSectorCoords(
  cam: CameraState,
  viewWidth: number,
  viewHeight: number
): { minGX: number; maxGX: number; minGY: number; maxGY: number } {
  // Parallax scaling for cosmic background: moves at 0.25x camera speed
  const parallaxX = cam.x * 0.25;
  const parallaxY = cam.y * 0.25;

  const halfW = (viewWidth / 2) / Math.max(0.1, cam.zoom);
  const halfH = (viewHeight / 2) / Math.max(0.1, cam.zoom);

  const minX = parallaxX - halfW;
  const maxX = parallaxX + halfW;
  const minY = parallaxY - halfH;
  const maxY = parallaxY + halfH;

  const centerGX = Math.floor(parallaxX / SECTOR_SIZE);
  const centerGY = Math.floor(parallaxY / SECTOR_SIZE);

  // Clamp radius around center to prevent exponential sector explosion when zoomed out
  const rawMinGX = Math.floor(minX / SECTOR_SIZE);
  const rawMaxGX = Math.floor(maxX / SECTOR_SIZE);
  const rawMinGY = Math.floor(minY / SECTOR_SIZE);
  const rawMaxGY = Math.floor(maxY / SECTOR_SIZE);

  return {
    minGX: Math.max(centerGX - 4, rawMinGX),
    maxGX: Math.min(centerGX + 4, rawMaxGX),
    minGY: Math.max(centerGY - 4, rawMinGY),
    maxGY: Math.min(centerGY + 4, rawMaxGY)
  };
}

/**
 * Renders procedural deep-space objects and sector starfields with parallax & batching
 */
export function renderProceduralCosmos(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  width: number,
  height: number,
  worldToScreen: (x: number, y: number, c: CameraState, w: number, h: number) => { x: number; y: number },
  blackHoles: CelestialBody[] = []
) {
  const { minGX, maxGX, minGY, maxGY } = getVisibleSectorCoords(cam, width, height);

  // Fake camera for parallax 0.25x
  const bgCam: CameraState = {
    x: cam.x * 0.25,
    y: cam.y * 0.25,
    zoom: cam.zoom
  };

  ctx.save();

  // Draw Deep Space Objects first
  for (let gx = minGX; gx <= maxGX; gx++) {
    for (let gy = minGY; gy <= maxGY; gy++) {
      const sector = generateSector(gx, gy);

      // Render Deep Space Object if present
      if (sector.deepSpaceObject) {
        const obj = sector.deepSpaceObject;
        
        let objX = obj.x;
        let objY = obj.y;
        let isOccluded = false;
        let mag = 1.0;

        if (blackHoles.length > 0) {
          const def = calculateGravitationalDeflection(obj.x, obj.y, blackHoles);
          if (def.isOccluded) isOccluded = true;
          else {
            objX = def.x;
            objY = def.y;
            mag = def.magnification;
          }
        }

        if (!isOccluded) {
          const scr = worldToScreen(objX, objY, bgCam, width, height);
          const scrR = obj.size * bgCam.zoom * Math.sqrt(mag);

          if (scr.x + scrR >= 0 && scr.x - scrR <= width && scr.y + scrR >= 0 && scr.y - scrR <= height) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(scr.x, scr.y);
            ctx.rotate(obj.angle);

            if (obj.type === 'spiral_galaxy') {
              const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, scrR * 0.4);
              coreGrad.addColorStop(0, obj.secondaryColor);
              coreGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.25)');
              coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = coreGrad;
              ctx.beginPath();
              ctx.arc(0, 0, scrR * 0.4, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = obj.primaryColor;
              ctx.lineWidth = Math.max(1.2, 2.5 * bgCam.zoom);
              for (let arm = 0; arm < 2; arm++) {
                ctx.beginPath();
                const offsetAngle = arm * Math.PI;
                for (let t = 0; t <= Math.PI * 2.2; t += 0.2) {
                  const r = (t / (Math.PI * 2.2)) * scrR * 0.75;
                  const a = t + offsetAngle;
                  const px = Math.cos(a) * r;
                  const py = Math.sin(a) * r * 0.55;
                  if (t === 0) ctx.moveTo(px, py);
                  else ctx.lineTo(px, py);
                }
                ctx.stroke();
              }
            } else if (obj.type === 'emission_nebula') {
              const nebGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, scrR);
              nebGrad.addColorStop(0, obj.primaryColor);
              nebGrad.addColorStop(0.4, obj.secondaryColor);
              nebGrad.addColorStop(0.8, 'rgba(99, 102, 241, 0.12)');
              nebGrad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = nebGrad;
              ctx.beginPath();
              ctx.ellipse(0, 0, scrR, scrR * 0.65, obj.angle, 0, Math.PI * 2);
              ctx.fill();
            } else if (obj.type === 'elliptical_galaxy') {
              const ellGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, scrR * 0.6);
              ellGrad.addColorStop(0, obj.secondaryColor);
              ellGrad.addColorStop(0.5, obj.primaryColor);
              ellGrad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = ellGrad;
              ctx.beginPath();
              ctx.ellipse(0, 0, scrR * 0.6, scrR * 0.35, 0, 0, Math.PI * 2);
              ctx.fill();
            } else if (obj.type === 'star_cluster') {
              const clusterGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, scrR * 0.5);
              clusterGrad.addColorStop(0, obj.secondaryColor);
              clusterGrad.addColorStop(0.6, obj.primaryColor);
              clusterGrad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = clusterGrad;
              ctx.beginPath();
              ctx.arc(0, 0, scrR * 0.5, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
          }
        }
      }
    }
  }

  // Draw background starfield with high-performance batching
  // Group stars by their color string
  const starBatches: Map<string, { x: number; y: number; r: number }[]> = new Map();

  for (let gx = minGX; gx <= maxGX; gx++) {
    for (let gy = minGY; gy <= maxGY; gy++) {
      const sector = generateSector(gx, gy);

      for (const s of sector.stars) {
        let posX = s.x;
        let posY = s.y;
        let starSize = s.size;
        let isOccluded = false;

        if (blackHoles.length > 0) {
          const def = calculateGravitationalDeflection(s.x, s.y, blackHoles);
          if (def.isOccluded) {
            isOccluded = true;
          } else {
            posX = def.x;
            posY = def.y;
            starSize = s.size * Math.sqrt(def.magnification);
          }
        }

        if (isOccluded) continue;

        const scr = worldToScreen(posX, posY, bgCam, width, height);
        if (scr.x >= -10 && scr.x <= width + 10 && scr.y >= -10 && scr.y <= height + 10) {
          let batch = starBatches.get(s.color);
          if (!batch) {
            batch = [];
            starBatches.set(s.color, batch);
          }
          batch.push({ x: scr.x, y: scr.y, r: starSize });
        }
      }
    }
  }

  // Single fill call per unique color bucket
  for (const [color, points] of starBatches.entries()) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      ctx.moveTo(pt.x + pt.r, pt.y);
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  ctx.restore();
}
