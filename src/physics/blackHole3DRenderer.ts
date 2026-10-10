/**
 * 3D Relativistic Black Hole & Gravitational Lensing Engine
 * Implements Einstein gravitational deflection of background starfield,
 * Interstellar-style curved accretion disk with relativistic Doppler beaming,
 * razor-sharp photon ring caustics, and event horizon shadow.
 */

import { CelestialBody } from '../types';

export interface BlackHole3DParams {
  cx: number;
  cy: number;
  radius: number; // visual horizon radius
  yaw: number;
  pitch: number;
  time: number;
  mass: number;
}

/**
 * Calculates Einstein gravitational deflection for a background ray/star
 * Given unlensed 2D offset (dx, dy) from black hole center:
 * Returns the lensed position (lx, ly) deflected outward around the shadow.
 */
export function calculateEinsteinLensing(
  dx: number,
  dy: number,
  rShadow: number
): { x: number; y: number; factor: number; insideShadow: boolean } {
  const dist = Math.hypot(dx, dy);
  const rE = rShadow * 1.55; // Einstein ring radius

  // If directly behind within critical impact parameter, rays are bent to the Einstein ring
  // Lens equation: theta_image = 0.5 * (theta_source + sqrt(theta_source^2 + 4 * theta_E^2))
  const lensedDist = 0.5 * (dist + Math.sqrt(dist * dist + 4 * rE * rE));

  // If ray falls inside apparent event horizon shadow
  if (lensedDist < rShadow * 1.02) {
    return { x: 0, y: 0, factor: 0, insideShadow: true };
  }

  const angle = Math.atan2(dy, dx);
  const shearFactor = Math.min(3.5, 1.0 + (rShadow / (dist + 0.1 * rShadow)));

  return {
    x: Math.cos(angle) * lensedDist,
    y: Math.sin(angle) * lensedDist,
    factor: shearFactor,
    insideShadow: false
  };
}

/**
 * Renders the full 3D Relativistic Black Hole with Interstellar accretion disk & gravitational lensing
 */
export function render3DBlackHole(
  ctx: CanvasRenderingContext2D,
  params: BlackHole3DParams
) {
  const { cx, cy, radius, yaw, pitch, time } = params;

  const rShadow = radius * 1.15; // Event horizon shadow radius (Schwarzschild shadow)
  const rISCO = rShadow * 1.35;   // Innermost stable circular orbit
  const rDiskOuter = rShadow * 3.8; // Accretion disk outer radius

  ctx.save();

  // 1. RELATIVISTIC BIPOLAR MAGNETIC JETS (Along rotation axis)
  renderRelativisticJets(ctx, cx, cy, rShadow, pitch, yaw, time);

  // 2. GRAVITATIONALLY LENSED UPPER ACCRETION HALO (Arching over the top of horizon)
  // Because gravity curves light from the back of the disk over the top of the black hole
  renderLensedBackDisk(ctx, cx, cy, rShadow, rDiskOuter, pitch, yaw, time, true);

  // 3. GRAVITATIONALLY LENSED LOWER ACCRETION HALO (Arching under the bottom of horizon)
  renderLensedBackDisk(ctx, cx, cy, rShadow, rDiskOuter, pitch, yaw, time, false);

  // 4. MAIN IN-PLANE ACCRETION DISK (Foreground passing across the front)
  renderFrontAccretionDisk(ctx, cx, cy, rShadow, rISCO, rDiskOuter, pitch, yaw, time);

  // 5. CAUSTIC PHOTON RINGS (Unstable photon orbits just outside horizon)
  renderPhotonRings(ctx, cx, cy, rShadow);

  // 6. ABSOLUTE INK-BLACK EVENT HORIZON SHADOW (FINAL PASS)
  // Perfectly lightless singularity shadow absorbing 100% of photons
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(cx, cy, rShadow, 0, Math.PI * 2);
  ctx.fill();

  // Razor-sharp shadow rim to eliminate any subpixel bleeding
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, rShadow, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/**
 * Renders the gravitationally lensed back of the accretion disk arching above / below the shadow
 */
function renderLensedBackDisk(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rShadow: number,
  rDiskOuter: number,
  pitch: number,
  yaw: number,
  time: number,
  isTop: boolean
) {
  ctx.save();
  ctx.translate(cx, cy);

  // Clip to upper or lower half
  ctx.beginPath();
  if (isTop) {
    ctx.rect(-rDiskOuter * 1.5, -rDiskOuter * 1.5, rDiskOuter * 3, rDiskOuter * 1.5);
  } else {
    ctx.rect(-rDiskOuter * 1.5, 0, rDiskOuter * 3, rDiskOuter * 1.5);
  }
  ctx.clip();

  // The lensed image forms a semi-circular arc hugging the horizon
  const tiltFac = Math.max(0.2, Math.abs(Math.sin(pitch + 0.3)));
  const innerR = rShadow * 1.08;
  const outerR = rShadow * (1.35 + tiltFac * 0.9);

  // Radial plasma temperature gradient
  const grad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);

  // Relativistic Doppler beaming on approaching vs receding side
  // Left side is approaching (rotating counter-clockwise), right side receding
  grad.addColorStop(0, '#ffffff'); // White-hot inner caustic
  grad.addColorStop(0.2, 'rgba(224, 242, 254, 0.95)'); // Cyan approach
  grad.addColorStop(0.5, 'rgba(251, 146, 60, 0.85)');  // Solar gold
  grad.addColorStop(0.8, 'rgba(225, 29, 72, 0.4)');    // Redshifted crimson
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
  ctx.fill();

  // Relativistic Doppler Beaming intensity overlay:
  // Smooth continuous transition from approaching blueshifted matter to receding dimmed matter
  const beamGrad = ctx.createLinearGradient(-outerR, 0, outerR, 0);
  beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)'); // Luminous sapphire/cyan
  beamGrad.addColorStop(0.35, 'rgba(224, 242, 254, 0.20)');
  beamGrad.addColorStop(0.65, 'rgba(245, 158, 11, 0.15)'); // Mild reddish amber
  beamGrad.addColorStop(1, 'rgba(15, 23, 42, 0.40)');    // Gentle dimming

  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
  ctx.fill();

  ctx.restore();
}

/**
 * Renders the foreground equatorial accretion disk passing across the front of the black hole
 */
function renderFrontAccretionDisk(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rShadow: number,
  rISCO: number,
  rDiskOuter: number,
  pitch: number,
  yaw: number,
  time: number
) {
  ctx.save();
  ctx.translate(cx, cy);

  // Vertical disk compression based on camera pitch
  const diskTilt = Math.sin(pitch);
  const scaleY = Math.max(0.12, Math.abs(diskTilt));

  ctx.scale(1.0, scaleY);

  // Accretion disk multi-band radiant gradient
  const diskGrad = ctx.createRadialGradient(0, 0, rISCO, 0, 0, rDiskOuter);
  diskGrad.addColorStop(0, '#ffffff'); // Innermost Stable Circular Orbit (ISCO) is white-hot
  diskGrad.addColorStop(0.12, 'rgba(56, 189, 248, 0.95)'); // Electric cyan approach
  diskGrad.addColorStop(0.35, 'rgba(254, 240, 138, 0.9)'); // Gold
  diskGrad.addColorStop(0.65, 'rgba(249, 115, 22, 0.65)'); // Incandescent orange
  diskGrad.addColorStop(0.88, 'rgba(220, 38, 38, 0.3)');   // Deep red
  diskGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = diskGrad;
  ctx.beginPath();
  ctx.arc(0, 0, rDiskOuter, 0, Math.PI * 2);
  ctx.arc(0, 0, rISCO, 0, Math.PI * 2, true);
  ctx.fill();

  // Relativistic Doppler beaming on disk:
  // Smooth continuous transition from approaching matter to receding matter
  ctx.globalCompositeOperation = 'screen';
  const beamGrad = ctx.createLinearGradient(-rDiskOuter, 0, rDiskOuter, 0);
  beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');  // Smooth blueshift
  beamGrad.addColorStop(0.35, 'rgba(224, 242, 254, 0.25)');
  beamGrad.addColorStop(0.65, 'rgba(245, 158, 11, 0.15)'); // Soft redshift
  beamGrad.addColorStop(1, 'rgba(15, 23, 42, 0.35)');

  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.arc(0, 0, rDiskOuter, 0, Math.PI * 2);
  ctx.arc(0, 0, rISCO, 0, Math.PI * 2, true);
  ctx.fill();

  // Dynamic Keplerian orbital plasma ripples
  ctx.globalCompositeOperation = 'overlay';
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)';
  ctx.lineWidth = 2.5;
  for (let rip = 1; rip <= 3; rip++) {
    const ripR = rISCO + rip * ((rDiskOuter - rISCO) / 4);
    ctx.beginPath();
    ctx.arc(0, 0, ripR, time * (0.8 / rip), time * (0.8 / rip) + Math.PI * 1.4);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders the razor-sharp caustic photon rings around the event horizon shadow
 */
function renderPhotonRings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rShadow: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Primary razor-thin Photon Ring (n = 1 caustic)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.shadowColor = '#67e8f9';
  ctx.shadowBlur = 9;
  ctx.beginPath();
  ctx.arc(cx, cy, rShadow * 1.018, 0, Math.PI * 2);
  ctx.stroke();

  // Secondary sub-ring (n = 2 caustic)
  ctx.strokeStyle = 'rgba(192, 132, 252, 0.75)';
  ctx.lineWidth = 1.2;
  ctx.shadowColor = '#c084fc';
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, rShadow * 1.055, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders relativistic bipolar plasma jets along the rotational axis
 */
function renderRelativisticJets(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rShadow: number,
  pitch: number,
  yaw: number,
  time: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(cx, cy);

  const jetLen = rShadow * 5.2;
  const jetWidth = rShadow * 0.28;

  // Jet gradient: White-hot base fading into electric cyan and violet
  const jetGrad = ctx.createLinearGradient(0, -jetLen, 0, jetLen);
  jetGrad.addColorStop(0, 'rgba(103, 232, 249, 0)');
  jetGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.7)');
  jetGrad.addColorStop(0.48, '#ffffff');
  jetGrad.addColorStop(0.5, '#ffffff');
  jetGrad.addColorStop(0.52, '#ffffff');
  jetGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.7)');
  jetGrad.addColorStop(1, 'rgba(103, 232, 249, 0)');

  ctx.fillStyle = jetGrad;

  // Upper jet cone
  ctx.beginPath();
  ctx.moveTo(-jetWidth * 0.3, 0);
  ctx.lineTo(-jetWidth * 1.4, -jetLen);
  ctx.lineTo(jetWidth * 1.4, -jetLen);
  ctx.lineTo(jetWidth * 0.3, 0);
  ctx.closePath();
  ctx.fill();

  // Lower jet cone
  ctx.beginPath();
  ctx.moveTo(-jetWidth * 0.3, 0);
  ctx.lineTo(-jetWidth * 1.4, jetLen);
  ctx.lineTo(jetWidth * 1.4, jetLen);
  ctx.lineTo(jetWidth * 0.3, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
