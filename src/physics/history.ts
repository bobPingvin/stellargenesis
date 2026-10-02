/**
 * StellarGenesis - State History & Undo/Redo Engine
 */

import { CelestialBody, Particle } from '../types';

/** Maximum particles persisted in single history snapshot to conserve memory and maintain 60 FPS (NC-01) */
export const MAX_SNAPSHOT_PARTICLES = 250;

export interface SimulationSnapshot {
  id: string;
  description: string;
  timestamp: number;
  bodies: CelestialBody[];
  particles: Particle[];
  selectedBodyId: string | null;
  followingBodyId: string | null;
}

/**
 * Deep clones a celestial body to isolate historical state from live physics mutations (NC-04, NC-05).
 *
 * @param body - The celestial body to clone
 * @returns CelestialBody - Isolated deep clone
 */
export function cloneBody(body: CelestialBody): CelestialBody {
  return {
    ...body,
    composition: {
      H: body.composition.H,
      He: body.composition.He,
      C: body.composition.C,
      Fe: body.composition.Fe
    },
    trail: body.trail ? body.trail.map(t => ({ x: t.x, y: t.y })) : []
  };
}

/**
 * Deep clones an array of celestial bodies.
 *
 * @param bodies - List of bodies to clone
 * @returns CelestialBody[] - New array of deep-cloned bodies
 */
export function cloneBodies(bodies: CelestialBody[]): CelestialBody[] {
  return bodies.map(cloneBody);
}

/**
 * Clones particles, capping to most recent MAX_SNAPSHOT_PARTICLES to keep memory low and transitions snappy.
 *
 * @param particles - Active particle buffer
 * @returns Particle[] - Capped array of cloned particles
 */
export function cloneParticles(particles: Particle[]): Particle[] {
  const slice = particles.length > MAX_SNAPSHOT_PARTICLES ? particles.slice(-MAX_SNAPSHOT_PARTICLES) : particles;
  return slice.map(p => ({ ...p }));
}

/**
 * Creates an immutable timestamped snapshot of simulation state.
 *
 * @param description - Human-readable label (e.g. "Перед взрывом Сверхновой")
 * @param bodies - Current celestial bodies
 * @param particles - Current gas/jet particles
 * @param selectedBodyId - Currently selected body ID
 * @param followingBodyId - Currently camera-tracked body ID
 * @returns SimulationSnapshot - Complete snapshot record
 */
export function createSnapshot(
  description: string,
  bodies: CelestialBody[],
  particles: Particle[],
  selectedBodyId: string | null = null,
  followingBodyId: string | null = null
): SimulationSnapshot {
  return {
    id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    description,
    timestamp: Date.now(),
    bodies: cloneBodies(bodies),
    particles: cloneParticles(particles),
    selectedBodyId,
    followingBodyId
  };
}
