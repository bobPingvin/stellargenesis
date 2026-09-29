/**
 * Planetary & Stellar Astronomical Scales Engine
 * Accurate equatorial radii in kilometers (km), Earth-relative proportions (R⊕),
 * volumes (V⊕), and automatic visual scaling for 2D map and 3D inspection.
 */

import { CelestialBody, PlanetKey } from '../types';

export const EARTH_RADIUS_KM = 6371.0;
export const SUN_RADIUS_KM = 696340.0;
export const JUPITER_RADIUS_KM = 69911.0;

/**
 * Authentic NASA / IAU equatorial physical radii in kilometers
 */
export const ASTRONOMICAL_RADII_KM: Record<string, number> = {
  sun: 696340.0,
  mercury: 2439.7,
  venus: 6051.8,
  earth: 6371.0,
  moon: 1737.4,       // Exactly 27.27% of Earth
  mars: 3389.5,       // Exactly 53.20% of Earth
  phobos: 11.267,     // Martian moon
  deimos: 6.2,        // Martian moon
  ceres: 469.7,       // Dwarf planet
  vesta: 262.7,
  jupiter: 69911.0,   // 10.97x Earth
  io: 1821.6,         // 28.59% of Earth
  europa: 1560.8,     // 24.49% of Earth
  ganymede: 2634.1,   // 41.34% of Earth (larger than Mercury!)
  callisto: 2410.3,   // 37.83% of Earth
  saturn: 58232.0,    // 9.14x Earth
  titan: 2574.7,      // 40.41% of Earth (larger than Mercury!)
  enceladus: 252.1,   // 3.96% of Earth
  uranus: 25362.0,    // 3.98x Earth
  titania: 788.4,     // 12.37% of Earth
  neptune: 24622.0,   // 3.86x Earth
  triton: 1353.4,     // 21.24% of Earth
  pluto: 1188.3,      // 18.65% of Earth
  charon: 606.0,      // 9.51% of Earth
};

/**
 * Returns physical radius in kilometers for any celestial body
 */
export function getPhysicalRadiusKm(body: CelestialBody): number {
  if (body.realRadiusKm && body.realRadiusKm > 0) {
    return body.realRadiusKm;
  }

  const key = body.planetKey;
  if (key && ASTRONOMICAL_RADII_KM[key]) {
    return ASTRONOMICAL_RADII_KM[key];
  }

  // Name fallback check
  const lowerName = body.name.toLowerCase();
  for (const [k, km] of Object.entries(ASTRONOMICAL_RADII_KM)) {
    if (lowerName.includes(k)) return km;
  }
  if (lowerName.includes('луна') || lowerName.includes('moon')) return ASTRONOMICAL_RADII_KM.moon;
  if (lowerName.includes('земля') || lowerName.includes('earth')) return ASTRONOMICAL_RADII_KM.earth;
  if (lowerName.includes('солнце') || lowerName.includes('sun')) return ASTRONOMICAL_RADII_KM.sun;
  if (lowerName.includes('марс') || lowerName.includes('mars')) return ASTRONOMICAL_RADII_KM.mars;
  if (lowerName.includes('юпитер') || lowerName.includes('jupiter')) return ASTRONOMICAL_RADII_KM.jupiter;
  if (lowerName.includes('сатурн') || lowerName.includes('saturn')) return ASTRONOMICAL_RADII_KM.saturn;
  if (lowerName.includes('венера') || lowerName.includes('venus')) return ASTRONOMICAL_RADII_KM.venus;
  if (lowerName.includes('меркурий') || lowerName.includes('mercury')) return ASTRONOMICAL_RADII_KM.mercury;
  if (lowerName.includes('уран') || lowerName.includes('uranus')) return ASTRONOMICAL_RADII_KM.uranus;
  if (lowerName.includes('нептун') || lowerName.includes('neptune')) return ASTRONOMICAL_RADII_KM.neptune;
  if (lowerName.includes('плутон') || lowerName.includes('pluto')) return ASTRONOMICAL_RADII_KM.pluto;

  // Remnants:
  if (body.remnantType === 'black_hole') {
    // Schwarzschild radius Rs = 2GM / c^2 ≈ 2.95 km * (M / M_sun)
    return Math.max(3.0, 2.953 * body.mass);
  }
  if (body.remnantType === 'pulsar') {
    return 12.0; // Typical neutron star radius is ~11-13 km
  }
  if (body.remnantType === 'white_dwarf') {
    return 7000.0; // Approx Earth-sized (~7000 km)
  }

  // Stars:
  if (body.mass >= 0.05) {
    // R ~ M^0.7 for main sequence stars
    return SUN_RADIUS_KM * Math.pow(body.mass, 0.75);
  }

  // Generic planet fallback based on mass
  return EARTH_RADIUS_KM * Math.cbrt(Math.max(0.0001, body.mass * 333000));
}

/**
 * Returns ratio of radius relative to Earth (R / R⊕)
 */
export function getRadiusRatioToEarth(body: CelestialBody): number {
  return getPhysicalRadiusKm(body) / EARTH_RADIUS_KM;
}

/**
 * Formats physical radius in kilometers with Russian localization
 */
export function formatRadiusKm(body: CelestialBody): string {
  const km = getPhysicalRadiusKm(body);
  if (km >= 10000) {
    return `${Math.round(km).toLocaleString('ru-RU')} км`;
  }
  if (km >= 100) {
    return `${km.toFixed(1).replace('.', ',')} км`;
  }
  return `${km.toFixed(2).replace('.', ',')} км`;
}

/**
 * Calculates 3D sphere viewport radius in pixels for Celestial3DViewer.
 * In 'real' mode, Earth is the standard benchmark (~155px) and Moon is ~42px,
 * reflecting authentic 1:3.67 size ratio!
 */
export function calculate3DViewerSphereRadius(
  body: CelestialBody,
  width: number,
  height: number,
  distance: number,
  scaleMode: 'real' | 'focus' = 'real'
): number {
  const minDim = Math.min(width, height);
  const baseScreenRadius = (minDim * 0.35) / (distance * 0.42);

  if (scaleMode === 'focus') {
    // Fullscreen auto-focus for inspecting fine details
    return baseScreenRadius;
  }

  // Real Astronomical Proportion Mode:
  const ratio = getRadiusRatioToEarth(body);
  const isBlackHole = body.remnantType === 'black_hole' || body.planetKey === 'black_hole';
  const isPulsar = body.remnantType === 'pulsar' || body.planetKey === 'pulsar';
  const isStar = (body.planetKey === 'sun' || (body.mass >= 0.1 && !body.isPlanet)) && !isBlackHole && !isPulsar;
  const isGasGiant = body.planetKey === 'jupiter' || body.planetKey === 'saturn';
  const isIceGiant = body.planetKey === 'uranus' || body.planetKey === 'neptune';

  if (isBlackHole) {
    // Event horizon shadow & accretion disk
    return Math.min(minDim * 0.35, baseScreenRadius * 1.25);
  }

  if (isPulsar) {
    // Ultra-dense neutron star core
    return Math.min(minDim * 0.3, baseScreenRadius * 1.05);
  }

  if (isStar) {
    // Stars are 109x Earth; scaled logarithmically so they fit the screen without blowing up
    return Math.min(minDim * 0.46, baseScreenRadius * 1.55);
  }

  if (isGasGiant) {
    // Jupiter (11x Earth) & Saturn (9x Earth): comfortably dominant
    return Math.min(minDim * 0.44, baseScreenRadius * (1.65 + Math.log10(ratio) * 0.35));
  }

  if (isIceGiant) {
    // Uranus & Neptune (4x Earth)
    return baseScreenRadius * 1.35;
  }

  // Terrestrial planets & Moons:
  // Earth (ratio = 1.0) -> baseScreenRadius * 0.95 (~147px)
  // Moon (ratio = 0.2727) -> baseScreenRadius * 0.95 * 0.2727 (~40px)
  // Mars (ratio = 0.532) -> baseScreenRadius * 0.95 * 0.532 (~78px)
  // Mercury (ratio = 0.383) -> baseScreenRadius * 0.95 * 0.383 (~56px)
  const earthPixelR = baseScreenRadius * 0.95;
  const scaledR = earthPixelR * ratio;

  // Tiny moons like Phobos (11 km) get a minimum visible floor of 12px
  return Math.max(12, Math.min(minDim * 0.45, scaledR));
}
