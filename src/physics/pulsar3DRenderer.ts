/**
 * 3D Relativistic Pulsar & Neutron Star Engine
 * High-fidelity rendering of super-dense neutron stars with:
 * - Magnetic dipole field axis tilted relative to spin axis (oblique rotator model)
 * - Powerful relativistic conical synchrotron emission beams (the famous pulsar jets/пучки)
 * - Oblique sweeping lighthouse beam effect with blinding lens flares & diffraction spikes
 * - Standing magnetohydrodynamic shock diamonds and helical field lines along the jets
 * - Glowing dipolar magnetic flux loops and equatorial pulsar wind torus
 */

export interface Pulsar3DParams {
  cx: number;
  cy: number;
  radius: number;          // Visual radius of the neutron core
  yaw: number;             // Camera orbit yaw
  pitch: number;           // Camera orbit pitch
  time: number;            // Animation timestamp
  spinRate?: number;       // Rotational frequency
  mass?: number;           // Mass in M☉
  name?: string;
}

// 3D vector helpers
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function rotateX(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: v.x,
    y: v.y * c - v.z * s,
    z: v.y * s + v.z * c
  };
}

function rotateY(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: v.x * c + v.z * s,
    y: v.y,
    z: -v.x * s + v.z * c
  };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Renders the 3D Relativistic Pulsar with sweeping magnetic jets and lighthouse optics
 */
export function render3DPulsar(
  ctx: CanvasRenderingContext2D,
  params: Pulsar3DParams
) {
  const { cx, cy, radius, yaw, pitch, time } = params;
  const spinRate = params.spinRate || 3.5;
  const coreRadius = Math.max(16, radius);

  // 1. ROTATIONAL DYNAMICS (Oblique Rotator Model)
  // Spin axis is fixed in space (tilted slightly, e.g., 20° tilt)
  const spinAxisTilt = 0.35; // ~20 degrees
  // Magnetic axis is tilted relative to spin axis by ~45 degrees (oblique rotator)
  const magDipoleTilt = 0.78; // ~45 degrees

  // Fast pulsar spin angle
  const spinPhase = time * spinRate * 4.0;

  // Unrotated magnetic dipole vector in pulsar local coordinates:
  // Precessing around the spin axis Z'
  const localMagX = Math.sin(magDipoleTilt) * Math.cos(spinPhase);
  const localMagY = Math.sin(magDipoleTilt) * Math.sin(spinPhase);
  const localMagZ = Math.cos(magDipoleTilt);

  // Apply spin axis tilt (tilt around X)
  let magAxisWorld: Vec3 = {
    x: localMagX,
    y: localMagY * Math.cos(spinAxisTilt) - localMagZ * Math.sin(spinAxisTilt),
    z: localMagY * Math.sin(spinAxisTilt) + localMagZ * Math.cos(spinAxisTilt)
  };

  // Now transform world magnetic axis into Camera Coordinates (using yaw & pitch)
  // Camera view direction: rotate by yaw around Y, then pitch around X
  let magCam = rotateY(magAxisWorld, -yaw);
  magCam = rotateX(magCam, -pitch);

  // Normalize
  const magLen = Math.hypot(magCam.x, magCam.y, magCam.z) || 1;
  const mX = magCam.x / magLen;
  const mY = magCam.y / magLen;
  const mZ = magCam.z / magLen; // Positive mZ points towards camera!

  // Alignment factor with camera line-of-sight (Z axis):
  // When either north (+mZ) or south (-mZ) pole points straight at the observer:
  const lineOfSightAlignment = Math.max(mZ, -mZ); // 0..1
  const isLighthouseFlash = lineOfSightAlignment > 0.78;
  const flashIntensity = isLighthouseFlash
    ? Math.pow((lineOfSightAlignment - 0.78) / 0.22, 2.5)
    : 0;

  ctx.save();

  // -------------------------------------------------------------
  // [LAYER 1] EQUATORIAL PULSAR WIND TORUS (Accretion & Relativistic Outflow)
  // -------------------------------------------------------------
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const torusR = coreRadius * 2.8;
  const torusTilt = Math.sin(pitch);
  const torusGrad = ctx.createRadialGradient(cx, cy, coreRadius * 1.2, cx, cy, torusR * 1.8);
  torusGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
  torusGrad.addColorStop(0.3, 'rgba(99, 102, 241, 0.35)');
  torusGrad.addColorStop(0.6, 'rgba(168, 85, 247, 0.18)');
  torusGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = torusGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, torusR * 1.6, Math.max(torusR * 0.35, Math.abs(torusR * torusTilt * 1.2)), yaw, 0, Math.PI * 2);
  ctx.fill();

  // Rotating relativistic wind spiral streaks in the torus
  for (let s = 0; s < 4; s++) {
    const swirlR = coreRadius * (1.6 + s * 0.45);
    const sAngle = time * (3.0 - s * 0.5) + (s * Math.PI) / 2;
    ctx.strokeStyle = s % 2 === 0 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(192, 132, 252, 0.35)';
    ctx.lineWidth = Math.max(1.2, 2.2 - s * 0.3);
    ctx.setLineDash([16 + s * 8, 12 + s * 6]);
    ctx.lineDashOffset = -sAngle * 25;
    ctx.beginPath();
    ctx.ellipse(cx, cy, swirlR, Math.max(swirlR * 0.25, Math.abs(swirlR * torusTilt)), yaw, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // -------------------------------------------------------------
  // [LAYER 2] DIPOLAR MAGNETIC FIELD LOOPS (CLOSED FLUX ARCS)
  // -------------------------------------------------------------
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const numLoops = 6;
  for (let l = 0; l < numLoops; l++) {
    const loopPhase = (l / numLoops) * Math.PI * 2 + spinPhase * 0.5;
    const loopWidth = coreRadius * (2.2 + 0.5 * Math.sin(loopPhase));
    const loopHeight = coreRadius * 3.2;

    // Angle of loop in screen plane aligned with projected magnetic axis
    const jetScreenAngle = Math.atan2(mY, mX);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(jetScreenAngle + Math.PI / 2);
    ctx.scale(Math.cos(loopPhase), 1);

    ctx.strokeStyle = l % 2 === 0 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(168, 85, 247, 0.2)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, loopWidth, loopHeight, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // -------------------------------------------------------------
  // [LAYER 3] RELATIVISTIC EMISSION JETS (ЗНАМЕНИТЫЕ ПУЧКИ ПУЛЬСАРА)
  // Two opposing collimated cones projecting from North and South magnetic poles
  // -------------------------------------------------------------
  const jetLength = coreRadius * 6.5;
  const jetHalfAngle = 0.16; // Conical opening angle (~9 degrees)

  // Draw both poles: pole = 1 (North), pole = -1 (South)
  // Sort so back jet is drawn first, then core, then front jet
  const poles = [1, -1].sort((a, b) => (a * mZ) - (b * mZ));

  for (const pole of poles) {
    const poleDirX = mX * pole;
    const poleDirY = mY * pole;
    const poleDirZ = mZ * pole; // > 0 means pointing towards camera!

    const jetAngle = Math.atan2(poleDirY, poleDirX);
    // Foreshortened 2D projected length based on inclination to camera
    const projLen = jetLength * Math.sqrt(poleDirX * poleDirX + poleDirY * poleDirY + 0.04);
    const endX = cx + Math.cos(jetAngle) * projLen;
    const endY = cy + Math.sin(jetAngle) * projLen;
    const coneRadius = projLen * Math.tan(jetHalfAngle) + 4;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Broad Synchrotron Sheath (Conical Glow)
    const coneGrad = ctx.createLinearGradient(cx, cy, endX, endY);
    coneGrad.addColorStop(0, '#ffffff');
    coneGrad.addColorStop(0.15, 'rgba(56, 189, 248, 0.95)');
    coneGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.6)');
    coneGrad.addColorStop(0.85, 'rgba(192, 132, 252, 0.35)');
    coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(jetAngle);

    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(0, -coreRadius * 0.45);
    ctx.lineTo(projLen, -coneRadius);
    ctx.lineTo(projLen + coreRadius * 0.8, 0);
    ctx.lineTo(projLen, coneRadius);
    ctx.lineTo(0, coreRadius * 0.45);
    ctx.closePath();
    ctx.fill();

    // 2. Ultra-Intense Core Laser Beam
    const coreBeamGrad = ctx.createLinearGradient(0, 0, projLen, 0);
    coreBeamGrad.addColorStop(0, '#ffffff');
    coreBeamGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.95)');
    coreBeamGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.85)');
    coreBeamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

    ctx.fillStyle = coreBeamGrad;
    ctx.beginPath();
    ctx.moveTo(0, -coreRadius * 0.2);
    ctx.lineTo(projLen * 1.1, -coneRadius * 0.35);
    ctx.lineTo(projLen * 1.1, coneRadius * 0.35);
    ctx.lineTo(0, coreRadius * 0.2);
    ctx.closePath();
    ctx.fill();

    // 3. Standing Magnetohydrodynamic Shock Diamonds (узлы сжатия в пучке)
    const numShocks = 5;
    for (let k = 1; k <= numShocks; k++) {
      // Flow pulse moves down the jet over time
      const shockPosNorm = (k / (numShocks + 1) + (time * 1.2) % (1 / numShocks));
      const shockX = projLen * shockPosNorm;
      const shockW = (coneRadius * shockPosNorm * 0.8) + 4;
      const shockH = shockW * 1.4;

      ctx.save();
      ctx.translate(shockX, 0);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-shockW * 0.5, 0);
      ctx.lineTo(0, -shockH * 0.5);
      ctx.lineTo(shockW * 0.5, 0);
      ctx.lineTo(0, shockH * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 4. Helical Magnetic Coils twisting around the jet
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const coilTurns = 6;
    for (let c = 0; c <= 40; c++) {
      const u = c / 40;
      const hx = u * projLen;
      const hRadius = u * coneRadius;
      const hPhase = u * coilTurns * Math.PI * 2 - time * 6.0;
      const hy = Math.sin(hPhase) * hRadius;
      if (c === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.stroke();

    ctx.restore(); // from jet translation
    ctx.restore(); // from jet save
  }

  // -------------------------------------------------------------
  // [LAYER 4] NEUTRON STAR ULTRA-DENSE CORE (СВЕРХПЛОТНОЕ ЯДРО)
  // -------------------------------------------------------------
  ctx.save();
  // Deep space relativistic magnetosphere aura
  const auraR = coreRadius * 2.5;
  const auraGrad = ctx.createRadialGradient(cx, cy, coreRadius * 0.7, cx, cy, auraR);
  auraGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  auraGrad.addColorStop(0.25, 'rgba(56, 189, 248, 0.8)');
  auraGrad.addColorStop(0.55, 'rgba(99, 102, 241, 0.45)');
  auraGrad.addColorStop(0.85, 'rgba(168, 85, 247, 0.2)');
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
  ctx.fill();

  // Solid Superconducting Neutron Core Sphere
  ctx.globalCompositeOperation = 'source-over';
  const coreGrad = ctx.createRadialGradient(
    cx - coreRadius * 0.25,
    cy - coreRadius * 0.25,
    coreRadius * 0.05,
    cx,
    cy,
    coreRadius
  );
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.35, '#e0f2fe');
  coreGrad.addColorStop(0.7, '#38bdf8');
  coreGrad.addColorStop(0.9, '#1e3a8a');
  coreGrad.addColorStop(1, '#0f172a');

  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  // Neutron Star Crust Magnetic Lattice / Hotspots at Magnetic Poles
  ctx.globalCompositeOperation = 'lighter';
  for (const pole of [1, -1]) {
    const spotX = cx + mX * coreRadius * 0.85 * pole;
    const spotY = cy + mY * coreRadius * 0.85 * pole;
    const spotZ = mZ * pole;

    if (spotZ > -0.2) {
      const spotR = coreRadius * 0.45 * Math.max(0.2, (spotZ + 1) * 0.5);
      const spotGrad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotR);
      spotGrad.addColorStop(0, '#ffffff');
      spotGrad.addColorStop(0.4, '#38bdf8');
      spotGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.arc(spotX, spotY, spotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Core sharp rim
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // -------------------------------------------------------------
  // [LAYER 5] BLINDING LIGHTHOUSE PULSAR FLASH & ANAMORPHIC FLARE
  // Triggers whenever a magnetic jet points straight into camera!
  // -------------------------------------------------------------
  if (flashIntensity > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // 1. Blinding White-Blue Central Flare
    const flareR = coreRadius * (3.0 + flashIntensity * 6.0);
    const flareGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flareR);
    flareGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    flareGrad.addColorStop(0.2, `rgba(224, 242, 254, ${0.9 * flashIntensity})`);
    flareGrad.addColorStop(0.45, `rgba(56, 189, 248, ${0.75 * flashIntensity})`);
    flareGrad.addColorStop(0.75, `rgba(99, 102, 241, ${0.4 * flashIntensity})`);
    flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = flareGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, flareR, 0, Math.PI * 2);
    ctx.fill();

    // 2. Anamorphic Horizontal Laser Flare Streak
    const streakW = coreRadius * (18.0 + flashIntensity * 28.0);
    const streakH = coreRadius * (0.8 + flashIntensity * 1.5);
    const streakGrad = ctx.createLinearGradient(cx - streakW, cy, cx + streakW, cy);
    streakGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    streakGrad.addColorStop(0.3, `rgba(56, 189, 248, ${0.5 * flashIntensity})`);
    streakGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.95 * flashIntensity})`);
    streakGrad.addColorStop(0.7, `rgba(56, 189, 248, ${0.5 * flashIntensity})`);
    streakGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

    ctx.fillStyle = streakGrad;
    ctx.fillRect(cx - streakW, cy - streakH / 2, streakW * 2, streakH);

    // 3. Multi-point Star Diffraction Spikes (4-point cross)
    const spikeLen = coreRadius * (10.0 + flashIntensity * 14.0);
    for (const angle of [Math.PI / 4, (3 * Math.PI) / 4]) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const spikeGrad = ctx.createLinearGradient(-spikeLen, 0, spikeLen, 0);
      spikeGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      spikeGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.85 * flashIntensity})`);
      spikeGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

      ctx.fillStyle = spikeGrad;
      ctx.fillRect(-spikeLen, -1.5, spikeLen * 2, 3);
      ctx.restore();
    }

    // 4. Concentric Halo Shockwaves (Pulse rings)
    for (let rIdx = 1; rIdx <= 2; rIdx++) {
      const ringR = coreRadius * (2.8 * rIdx + flashIntensity * 3.5);
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 * flashIntensity / rIdx})`;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}
