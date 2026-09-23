/**
 * StellarGenesis - General Relativity & Gravitational Lensing Engine
 * Implements Schwarzschild spacetime curvature, Einstein rings,
 * background star/galaxy ray deflection, and Interstellar (Gargantua) 3D relativistic visuals.
 */

import { CelestialBody, CameraState, SimulationSettings } from '../types';

export interface DeflectedPoint {
  x: number;
  y: number;
  magnification: number;
  isOccluded: boolean;
  mirrorX?: number;
  mirrorY?: number;
  hasMirror?: boolean;
}

/**
 * Calculates Einstein Gravitational Lensing deflection of a point (x, y)
 * caused by all active black holes in the vicinity.
 * Uses the exact Schwarzschild point-mass lens equation:
 * theta_image = (theta_source + sqrt(theta_source^2 + 4 * theta_E^2)) / 2
 */
export function calculateGravitationalDeflection(
  sourceX: number,
  sourceY: number,
  blackHoles: CelestialBody[]
): DeflectedPoint {
  if (blackHoles.length === 0) {
    return { x: sourceX, y: sourceY, magnification: 1.0, isOccluded: false };
  }

  let curX = sourceX;
  let curY = sourceY;
  let totalMag = 1.0;
  let isOccluded = false;
  let mirrorX: number | undefined;
  let mirrorY: number | undefined;
  let hasMirror = false;

  for (const bh of blackHoles) {
    const dx = curX - bh.x;
    const dy = curY - bh.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Event Horizon Shadow radius (r_s)
    const rs = Math.max(6, bh.radius);
    // Einstein Radius in world coordinates: r_E = 2.6 * r_s * sqrt(M/3)
    const rE = rs * (2.4 + Math.min(2.0, Math.sqrt(bh.mass * 0.15)));

    // If point is directly behind event horizon shadow, it is occluded
    if (dist < rs * 0.92) {
      isOccluded = true;
      break;
    }

    // Normalized impact parameter u = dist / rE
    const u = Math.max(0.01, dist / rE);

    // Primary image angle: theta+ = (u + sqrt(u^2 + 4)) / 2 * rE
    const primaryDist = ((u + Math.sqrt(u * u + 4)) * 0.5) * rE;

    // Unit direction from black hole to source
    const dirX = dist > 0.0001 ? dx / dist : 1;
    const dirY = dist > 0.0001 ? dy / dist : 0;

    // Deflect primary image outward around Einstein ring
    curX = bh.x + dirX * primaryDist;
    curY = bh.y + dirY * primaryDist;

    // Relativistic Gravitational Magnification factor:
    // mu = (u^2 + 2) / (2 * u * sqrt(u^2 + 4))
    const mag = Math.min(4.5, (u * u + 2) / (2 * u * Math.sqrt(u * u + 4)));
    totalMag *= mag;

    // Secondary (mirror) image on the opposite side of the horizon
    if (u < 1.4 && !hasMirror) {
      const secondaryDist = ((Math.sqrt(u * u + 4) - u) * 0.5) * rE;
      if (secondaryDist > rs * 1.05) {
        mirrorX = bh.x - dirX * secondaryDist;
        mirrorY = bh.y - dirY * secondaryDist;
        hasMirror = true;
      }
    }
  }

  return {
    x: curX,
    y: curY,
    magnification: Math.min(5.0, totalMag),
    isOccluded,
    mirrorX,
    mirrorY,
    hasMirror
  };
}

/**
 * Renders the Warped Spacetime Metric Fabric (Coordinate Grid)
 * displaying physical gravitational bending and Einstein funnel curvature with adaptive LOD.
 */
export function renderSpacetimeFabric(
  ctx: CanvasRenderingContext2D,
  camera: CameraState,
  viewWidth: number,
  viewHeight: number,
  blackHoles: CelestialBody[],
  massiveStars: CelestialBody[],
  worldToScreen: (x: number, y: number, c: CameraState, w: number, h: number) => { x: number; y: number },
  isAdaptive: boolean = true
) {
  const halfW = (viewWidth / 2) / camera.zoom;
  const halfH = (viewHeight / 2) / camera.zoom;

  const minX = camera.x - halfW;
  const maxX = camera.x + halfW;
  const minY = camera.y - halfH;
  const maxY = camera.y + halfH;

  // Grid step scaled with zoom to keep constant density on screen
  let baseStep = 120;
  if (camera.zoom < 0.25) baseStep = 480;
  else if (camera.zoom < 0.6) baseStep = 240;

  const startX = Math.floor((minX - 100) / baseStep) * baseStep;
  const endX = Math.ceil((maxX + 100) / baseStep) * baseStep;
  const startY = Math.floor((minY - 100) / baseStep) * baseStep;
  const endY = Math.ceil((maxY + 100) / baseStep) * baseStep;

  // Adaptive sampling interval along grid lines
  const sampleStep = isAdaptive
    ? Math.max(30, Math.round(45 / Math.max(0.15, camera.zoom)))
    : 35;

  ctx.save();
  ctx.lineWidth = Math.max(0.7, 1.0 * camera.zoom);

  // Filter massive bodies that are near or in the viewport
  const allGravMasses = [...blackHoles, ...massiveStars.filter(s => s.mass > 3.0)].filter(b => {
    const maxR = (b.remnantType === 'black_hole' ? b.radius * 7.5 : b.radius * 4.0) + 100;
    return b.x + maxR >= minX && b.x - maxR <= maxX && b.y + maxR >= minY && b.y - maxR <= maxY;
  });

  // Fast-path helper to calculate space-time warped coordinate
  const warpPoint = (wx: number, wy: number) => {
    if (allGravMasses.length === 0) {
      return worldToScreen(wx, wy, camera, viewWidth, viewHeight);
    }

    let warpedX = wx;
    let warpedY = wy;

    for (let i = 0; i < allGravMasses.length; i++) {
      const b = allGravMasses[i];
      const isBH = b.remnantType === 'black_hole';
      const dx = wx - b.x;
      const dy = wy - b.y;
      const distSq = dx * dx + dy * dy;

      const influenceR = isBH ? b.radius * 7.5 : b.radius * 4.0;
      const influenceRSq = influenceR * influenceR;

      if (distSq < influenceRSq && distSq > 1.0) {
        const dist = Math.sqrt(distSq);
        const factor = (1 - dist / influenceR);
        const pull = (isBH ? b.radius * 1.8 : b.radius * 0.7) * (factor * factor);
        const invDist = 1 / dist;

        warpedX -= (dx * invDist) * pull;
        warpedY -= (dy * invDist) * pull;
      }
    }

    return worldToScreen(warpedX, warpedY, camera, viewWidth, viewHeight);
  };

  // Batched draw of both vertical and horizontal grid lines
  ctx.beginPath();

  // Vertical Lines
  for (let gx = startX; gx <= endX; gx += baseStep) {
    let isFirst = true;
    for (let gy = startY; gy <= endY; gy += sampleStep) {
      const scr = warpPoint(gx, gy);
      if (isFirst) {
        ctx.moveTo(scr.x, scr.y);
        isFirst = false;
      } else {
        ctx.lineTo(scr.x, scr.y);
      }
    }
  }

  // Horizontal Lines
  for (let gy = startY; gy <= endY; gy += baseStep) {
    let isFirst = true;
    for (let gx = startX; gx <= endX; gx += sampleStep) {
      const scr = warpPoint(gx, gy);
      if (isFirst) {
        ctx.moveTo(scr.x, scr.y);
        isFirst = false;
      } else {
        ctx.lineTo(scr.x, scr.y);
      }
    }
  }

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.085)';
  ctx.stroke();

  // Draw Einstein Gravitational Concentric Contours around Black Holes
  if (blackHoles.length > 0) {
    for (let i = 0; i < blackHoles.length; i++) {
      const bh = blackHoles[i];
      const scr = worldToScreen(bh.x, bh.y, camera, viewWidth, viewHeight);
      const r = Math.max(3.5, bh.radius * camera.zoom);

      if (scr.x + r * 5 >= 0 && scr.x - r * 5 <= viewWidth && scr.y + r * 5 >= 0 && scr.y - r * 5 <= viewHeight) {
        for (let ring = 1; ring <= 3; ring++) {
          const ringR = r * (1.6 + ring * 0.9);
          ctx.beginPath();
          ctx.arc(scr.x, scr.y, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(168, 85, 247, ${0.16 - ring * 0.04})`;
          ctx.lineWidth = Math.max(0.7, 1.0 * camera.zoom);
          ctx.setLineDash([5, 5]);
          ctx.stroke();
        }
      }
    }
    ctx.setLineDash([]);
  }

  ctx.restore();
}

/**
 * Procedural Relativistic Accretion Plasma Particle
 */
export interface AccretionParticle {
  angle: number;
  radiusNorm: number; // 0.0 (ISCO) to 1.0 (outer disk)
  speed: number;
  size: number;
  temp: number; // 0.0 to 1.0 (inner is hotter / whiter)
  brightness: number;
  zOffset: number; // slight vertical fluffiness of disk
}

/**
 * Generates a stable deterministic pool of relativistic accretion particles
 * for rendering the high-density Interstellar plasma disk.
 */
export function createAccretionDiskParticles(count: number = 320): AccretionParticle[] {
  const list: AccretionParticle[] = [];
  for (let i = 0; i < count; i++) {
    // Clustered towards the inner edge (ISCO)
    const rNorm = Math.pow(Math.random(), 1.6);
    // Keplerian orbital velocity v ~ 1 / sqrt(r)
    const baseSpeed = 2.4 / Math.sqrt(0.3 + rNorm * 0.7);

    list.push({
      angle: Math.random() * Math.PI * 2,
      radiusNorm: rNorm,
      speed: baseSpeed * (0.9 + Math.random() * 0.2),
      size: Math.random() * 2.4 + 1.2,
      temp: Math.max(0, 1.0 - rNorm * 0.85),
      brightness: Math.random() * 0.4 + 0.6,
      zOffset: (Math.random() - 0.5) * 0.18
    });
  }
  return list;
}

// Global cached accretion particle pool
export const GLOBAL_ACCRETION_POOL = createAccretionDiskParticles(360);
