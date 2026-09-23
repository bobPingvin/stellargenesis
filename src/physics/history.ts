/**
 * StellarGenesis - State History & Undo/Redo Engine
 */

import { CelestialBody, Particle } from '../types';

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
 * Deep clones a celestial body to isolate historical state from live mutations
 */
export function cloneBody(b: CelestialBody): CelestialBody {
  return {
    ...b,
    composition: {
      H: b.composition.H,
      He: b.composition.He,
      C: b.composition.C,
      Fe: b.composition.Fe
    },
    trail: b.trail ? b.trail.map(t => ({ x: t.x, y: t.y })) : []
  };
}

/**
 * Deep clones the array of celestial bodies
 */
export function cloneBodies(bodies: CelestialBody[]): CelestialBody[] {
  return bodies.map(cloneBody);
}

/**
 * Clones particles, capping to most recent 250 to keep memory low and transitions snappy
 */
export function cloneParticles(particles: Particle[]): Particle[] {
  const slice = particles.length > 250 ? particles.slice(-250) : particles;
  return slice.map(p => ({ ...p }));
}

/**
 * Creates a timestamped snapshot
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
