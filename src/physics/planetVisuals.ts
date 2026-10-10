/**
 * Planet & Star Visual Shading Engine
 * Provides custom, authentic visual styles for each celestial body
 * in the Solar System and beyond (continents, rings, clouds, storms,
 * craters, solar granulation and corona).
 */

import { CelestialBody, SimulationSettings } from '../types';
import { getSpectralClass, SPECTRAL_DATA, applyDopplerToColor } from './engine';

export function renderDistinctCelestialBody(
  ctx: CanvasRenderingContext2D,
  b: CelestialBody,
  scr: { x: number; y: number },
  r: number,
  zoom: number,
  settings: SimulationSettings,
  time: number
) {
  const planetKey = b.planetKey || (b.isPlanet ? 'generic_planet' : undefined);
  const specKey = getSpectralClass(b);
  const specInfo = SPECTRAL_DATA[specKey];

  const starColor = settings.dopplerEffect
    ? applyDopplerToColor(specInfo.color, b.dopplerShift || 0)
    : specInfo.color;
  const starHalo = settings.dopplerEffect
    ? applyDopplerToColor(specInfo.halo, b.dopplerShift || 0)
    : specInfo.halo;

  const hasTidalStretch = b.tidalStretch && b.tidalStretch.factor > 1.05;
  const stretchFac = hasTidalStretch ? b.tidalStretch!.factor : 1.0;
  const stretchAng = hasTidalStretch ? b.tidalStretch!.angle : 0;

  ctx.save();
  ctx.translate(scr.x, scr.y);
  if (hasTidalStretch) {
    ctx.rotate(stretchAng);
  }

  // 1. PRE-RINGS (Behind planet globe)
  if (b.hasRings) {
    render2DRings(ctx, r, b.ringColor || '#fef08a', b.axialTilt || 0.45, false);
  }

  // 2. ATMOSPHERIC / CORONA GLOW
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (planetKey === 'sun') {
    // Majestic Multi-layer Sun Corona
    const coronaGrad = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 3.8);
    coronaGrad.addColorStop(0, '#fef08a');
    coronaGrad.addColorStop(0.25, 'rgba(249, 115, 22, 0.7)');
    coronaGrad.addColorStop(0.65, 'rgba(234, 88, 12, 0.25)');
    coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 3.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.atmosphereColor || planetKey === 'earth' || planetKey === 'venus') {
    // Delicate planetary atmospheric haze
    const atCol = b.atmosphereColor || (planetKey === 'earth' ? '#38bdf8' : '#fef08a');
    const atGrad = ctx.createRadialGradient(0, 0, r * 0.85, 0, 0, r * 1.55);
    atGrad.addColorStop(0, atCol + '66');
    atGrad.addColorStop(0.6, atCol + '33');
    atGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = atGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Standard Star Halo
    const glowGrad = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 3.2 * Math.sqrt(stretchFac));
    glowGrad.addColorStop(0, starColor);
    glowGrad.addColorStop(0.4, starHalo);
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 3.2 * stretchFac, (r * 3.2) / Math.sqrt(stretchFac), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 2.5. ANIMATED MAGNETIC STELLAR PROMINENCE LOOPS
  const isStarLike = !b.isPlanet && b.remnantType !== 'black_hole' && b.remnantType !== 'pulsar';
  if (isStarLike && settings.showProminences !== false) {
    renderStellarProminences(
      ctx,
      r,
      planetKey === 'sun' ? '#fed7aa' : starColor,
      planetKey === 'sun' ? 'rgba(249, 115, 22, 0.7)' : starHalo,
      time,
      b.mass,
      planetKey === 'sun'
    );
  }

  // 3. MAIN PLANET/STAR DISK SHADING
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * stretchFac, r / Math.sqrt(stretchFac), 0, 0, Math.PI * 2);
  ctx.clip();

  if (planetKey === 'sun') {
    // Sun Photosphere & Granulation
    const sunGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.35, '#fef08a');
    sunGrad.addColorStop(0.75, '#f97316');
    sunGrad.addColorStop(1, '#ea580c');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);

    // Dynamic convection spots
    ctx.fillStyle = 'rgba(194, 65, 12, 0.4)';
    for (let s = 0; s < 6; s++) {
      const sx = Math.sin(time + s) * r * 0.6;
      const sy = Math.cos(time * 0.8 + s * 1.5) * r * 0.6;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(1.5, r * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (planetKey === 'earth') {
    // Earth: Deep Blue Ocean with Green/Brown Continents and Swirling Clouds
    ctx.fillStyle = '#0284c7'; // Deep ocean blue
    ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);

    // Continents
    ctx.fillStyle = '#15803d'; // Green vegetation
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, -r * 0.1, r * 0.4, r * 0.3, 0.2, 0, Math.PI * 2);
    ctx.ellipse(r * 0.35, r * 0.15, r * 0.35, r * 0.25, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Sahara / Arid Desert
    ctx.fillStyle = '#a16207';
    ctx.beginPath();
    ctx.ellipse(-r * 0.15, -r * 0.15, r * 0.2, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Polar ice caps
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.85, r * 0.45, r * 0.15, 0, 0, Math.PI * 2);
    ctx.ellipse(0, r * 0.85, r * 0.4, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Translucent swirling clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.ellipse(r * 0.1, -r * 0.3, r * 0.5, r * 0.1, 0.2, 0, Math.PI * 2);
    ctx.ellipse(-r * 0.2, r * 0.3, r * 0.45, r * 0.12, -0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (planetKey === 'jupiter') {
    // Jupiter: Iconic banded structure & Great Red Spot
    const bands = ['#fed7aa', '#c2410c', '#ffedd5', '#9a3412', '#fdba74', '#7c2d12', '#fed7aa'];
    const h = (r * 2) / bands.length;
    for (let i = 0; i < bands.length; i++) {
      ctx.fillStyle = bands[i];
      ctx.fillRect(-r, -r + i * h, r * 2, h);
    }
    // Great Red Spot
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.ellipse(r * 0.25, r * 0.3, r * 0.3, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.ellipse(r * 0.25, r * 0.3, r * 0.14, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (planetKey === 'saturn') {
    // Saturn: Soft butter-golden banded globe
    const satBands = ['#fef08a', '#fde047', '#fef9c3', '#eab308', '#ca8a04'];
    const h = (r * 2) / satBands.length;
    for (let i = 0; i < satBands.length; i++) {
      ctx.fillStyle = satBands[i];
      ctx.fillRect(-r, -r + i * h, r * 2, h);
    }
  } else if (planetKey === 'mars') {
    // Mars: Rust-red terrain with white polar cap
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
    // Dark volcanic plateau
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, 0, r * 0.45, r * 0.3, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Polar ice cap
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.85, r * 0.35, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (planetKey === 'venus') {
    // Venus: Dense yellow sulfuric haze
    const venGrad = ctx.createLinearGradient(0, -r, 0, r);
    venGrad.addColorStop(0, '#fef9c3');
    venGrad.addColorStop(0.5, '#facc15');
    venGrad.addColorStop(1, '#ca8a04');
    ctx.fillStyle = venGrad;
    ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
  } else if (planetKey === 'moon' || planetKey === 'mercury' || planetKey === 'callisto') {
    // Moon & Mercury: Dark maria and cratered basalt
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, -r * 0.1, r * 0.35, r * 0.25, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.2, r * 0.2, r * 0.28, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (planetKey === 'neptune') {
    // Neptune: Deep azure with Great Dark Spot
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
    ctx.fillStyle = '#075985';
    ctx.beginPath();
    ctx.ellipse(r * 0.2, -r * 0.1, r * 0.3, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(r * 0.25, -r * 0.18, r * 0.2, r * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (planetKey === 'uranus') {
    // Uranus: Cyan ice giant
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
  } else if (planetKey === 'pluto') {
    // Pluto: Reddish terrain with Tombaugh Regio white heart
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(-r * 0.05, 0, r * 0.22, r * 0.28, -0.2, 0, Math.PI * 2);
    ctx.ellipse(r * 0.15, 0, r * 0.22, r * 0.28, 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Generic Star / Standard Celestial Shading
    const coreGrad = ctx.createRadialGradient(-r * 0.25 * stretchFac, -r * 0.25, r * 0.1, 0, 0, r * Math.sqrt(stretchFac));
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.65, starColor);
    coreGrad.addColorStop(1, starColor);
    ctx.fillStyle = coreGrad;
    ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
  }

  // Day/Night 3D shadow terminator across globe (Only for non-illuminating planets and moons)
  // Stars emit their own omnidirectional light and do NOT have an artificial white/black split!
  if (b.isPlanet && planetKey !== 'sun') {
    // Determine sun direction if in multi-body system, or standard soft spherical relief
    const termGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
    termGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)'); // Subtle specular highlight
    termGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    termGrad.addColorStop(0.85, 'rgba(2, 6, 23, 0.40)');    // Soft planetary terminator
    termGrad.addColorStop(1, 'rgba(2, 6, 23, 0.70)');
    ctx.fillStyle = termGrad;
    ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
  }

  ctx.restore();

  // 4. POST-RINGS (Front of planet globe)
  if (b.hasRings) {
    render2DRings(ctx, r, b.ringColor || '#fef08a', b.axialTilt || 0.45, true);
  }

  ctx.restore();
}

/**
 * Renders 2D rings with foreground and background split
 */
function render2DRings(
  ctx: CanvasRenderingContext2D,
  r: number,
  color: string,
  tilt: number,
  foregroundOnly: boolean
) {
  const rIn = r * 1.4;
  const rOut = r * 2.3;
  const scaleY = 0.35;

  ctx.save();
  ctx.rotate(tilt);

  ctx.beginPath();
  if (foregroundOnly) {
    ctx.rect(-rOut * 1.5, 0, rOut * 3, rOut * 1.5);
  } else {
    ctx.rect(-rOut * 1.5, -rOut * 1.5, rOut * 3, rOut * 1.5);
  }
  ctx.clip();

  ctx.scale(1.0, scaleY);
  ctx.fillStyle = color + '88';
  ctx.beginPath();
  ctx.arc(0, 0, rOut, 0, Math.PI * 2);
  ctx.arc(0, 0, rIn, 0, Math.PI * 2, true);
  ctx.fill();

  // Cassini Division
  ctx.fillStyle = 'rgba(2, 6, 23, 0.6)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.85, 0, Math.PI * 2);
  ctx.arc(0, 0, r * 1.75, 0, Math.PI * 2, true);
  ctx.fill();

  ctx.restore();
}

/**
 * Renders animated magnetic plasma prominence loops & coronal mass flares
 */
export function renderStellarProminences(
  ctx: CanvasRenderingContext2D,
  r: number,
  starColor: string,
  starHalo: string,
  time: number,
  mass: number = 1.0,
  isSun: boolean = false
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const numLoops = isSun ? 6 : Math.min(8, Math.max(4, Math.floor(mass * 3)));

  for (let i = 0; i < numLoops; i++) {
    // Each loop has its own rotational phase, base footprint span, and loop height
    const baseAngle = i * ((Math.PI * 2) / numLoops) + Math.sin(i * 13.7) * 0.35 + time * (0.08 + (i % 3) * 0.03);
    const spanAngle = 0.32 + Math.sin(time * 0.35 + i * 2.3) * 0.12;
    const theta1 = baseAngle - spanAngle * 0.5;
    const theta2 = baseAngle + spanAngle * 0.5;

    // Footprints on the stellar surface
    const p1x = Math.cos(theta1) * r * 0.96;
    const p1y = Math.sin(theta1) * r * 0.96;
    const p2x = Math.cos(theta2) * r * 0.96;
    const p2y = Math.sin(theta2) * r * 0.96;

    // Loop apex pulsating outwards along magnetic field line
    const loopHeightFactor = 1.25 + 0.42 * Math.sin(time * (1.2 + i * 0.4) + i * 1.7);
    const midAngle = baseAngle;

    // Control points for a curved magnetic dipole arch
    const cp1x = Math.cos(theta1 + 0.12) * r * (loopHeightFactor * 1.08);
    const cp1y = Math.sin(theta1 + 0.12) * r * (loopHeightFactor * 1.08);
    const cp2x = Math.cos(theta2 - 0.12) * r * (loopHeightFactor * 1.08);
    const cp2y = Math.sin(theta2 - 0.12) * r * (loopHeightFactor * 1.08);

    // Dynamic flare brightness pulsation
    const flarePulse = 0.55 + 0.45 * Math.sin(time * 2.2 + i * 3.1);

    // 1. Soft glowing outer magnetic tube
    ctx.lineWidth = Math.max(2.0, r * 0.09);
    ctx.strokeStyle = starHalo;
    ctx.globalAlpha = 0.45 * flarePulse;
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2x, p2y);
    ctx.stroke();

    // 2. Hot plasma core filament
    ctx.lineWidth = Math.max(1.2, r * 0.045);
    ctx.strokeStyle = starColor;
    ctx.globalAlpha = 0.85 * flarePulse;
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2x, p2y);
    ctx.stroke();

    // 3. Plasmoid bead circulating along the arch
    const beadPhase = (time * (0.6 + (i % 2) * 0.4) + i * 0.3) % 1.0;
    const u = 1 - beadPhase;
    const bx = u * u * u * p1x + 3 * u * u * beadPhase * cp1x + 3 * u * beadPhase * beadPhase * cp2x + beadPhase * beadPhase * beadPhase * p2x;
    const by = u * u * u * p1y + 3 * u * u * beadPhase * cp1y + 3 * u * beadPhase * beadPhase * cp2y + beadPhase * beadPhase * beadPhase * p2y;

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9 * flarePulse;
    ctx.beginPath();
    ctx.arc(bx, by, Math.max(1.5, r * 0.05), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
