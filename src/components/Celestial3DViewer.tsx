/**
 * Celestial 3D Viewer Component
 * High-fidelity 3D sphere ray-casting & orbit camera inspection mode.
 * As the user orbits the camera around the celestial body with the mouse,
 * the 3D cosmic background (starfield, nebulae, Milky Way) rotates synchronously
 * in true perspective parallax.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CelestialBody, PlanetKey } from '../types';
import { renderPhotorealisticEarth } from '../physics/planetTextures';
import { render3DBlackHole, calculateEinsteinLensing } from '../physics/blackHole3DRenderer';
import { render3DPulsar } from '../physics/pulsar3DRenderer';
import { getDopplerBeamingIntensity } from '../physics/engine';
import {
  calculate3DViewerSphereRadius,
  formatRadiusKm,
  getRadiusRatioToEarth,
  getPhysicalRadiusKm
} from '../physics/celestialScales';
import {
  X,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Compass,
  Info,
  Layers,
  Sparkles,
  Maximize2
} from 'lucide-react';

interface Celestial3DViewerProps {
  body: CelestialBody;
  allBodies: CelestialBody[];
  onSelectBody: (body: CelestialBody) => void;
  onClose: () => void;
  isPaused: boolean;
}

// 3D Star definition in celestial sphere
interface SkyStar {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  twinkleOffset: number;
}

export const Celestial3DViewer: React.FC<Celestial3DViewerProps> = ({
  body,
  allBodies,
  onSelectBody,
  onClose,
  isPaused: globalPaused
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera Spherical Coordinates around the body
  // yaw (horizontal orbit angle), pitch (vertical elevation angle), distance (zoom)
  const [cameraOrbit, setCameraOrbit] = useState({
    yaw: 0.8,
    pitch: 0.25,
    distance: 2.6
  });

  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [rotationSpeed, setRotationSpeed] = useState<number>(1.0);
  const [showTelemetry, setShowTelemetry] = useState<boolean>(true);
  const [scaleMode, setScaleMode] = useState<'real' | 'focus'>('real');

  // Refs for animation loop
  const orbitRef = useRef(cameraOrbit);
  orbitRef.current = cameraOrbit;

  const scaleModeRef = useRef(scaleMode);
  scaleModeRef.current = scaleMode;

  const dragRef = useRef<{
    isDragging: boolean;
    lastX: number;
    lastY: number;
    button: number;
  }>({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    button: 0
  });

  // Inertial orbit rotation velocity damping for smooth momentum
  const velocityRef = useRef({ yawVel: 0, pitchVel: 0 });

  // Background 3D Starfield precomputed on unit sphere
  const starsRef = useRef<SkyStar[]>([]);
  useEffect(() => {
    const stars: SkyStar[] = [];
    const starColors = ['#ffffff', '#bae6fd', '#fef08a', '#fed7aa', '#fca5a5'];
    for (let i = 0; i < 900; i++) {
      // Uniform point distribution on sphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const sinPhi = Math.sin(phi);

      stars.push({
        x: sinPhi * Math.cos(theta),
        y: Math.cos(phi),
        z: sinPhi * Math.sin(theta),
        size: Math.random() * 1.8 + 0.6,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
    starsRef.current = stars;
  }, []);

  // Main 3D Render Loop
  useEffect(() => {
    let animId: number;
    let localTime = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;

      if (isRotating && !globalPaused) {
        localTime += 0.015 * rotationSpeed;
      }

      // Smooth inertial camera damping when user is not dragging
      if (!dragRef.current.isDragging) {
        if (Math.abs(velocityRef.current.yawVel) > 0.00005 || Math.abs(velocityRef.current.pitchVel) > 0.00005) {
          orbitRef.current.yaw += velocityRef.current.yawVel;
          orbitRef.current.pitch = Math.max(-1.48, Math.min(1.48, orbitRef.current.pitch + velocityRef.current.pitchVel));
          velocityRef.current.yawVel *= 0.92;
          velocityRef.current.pitchVel *= 0.92;
        }
      }

      const yaw = orbitRef.current.yaw;
      const pitch = orbitRef.current.pitch;
      const dist = orbitRef.current.distance;

      // Camera orientation basis vectors
      // Eye position in body space
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);

      // Camera position on sphere
      const camX = dist * cosP * sinY;
      const camY = dist * sinP;
      const camZ = dist * cosP * cosY;

      // Camera coordinate frame (Forward, Right, Up)
      // Forward = from cam towards origin (0, 0, 0)
      const fwd = { x: -camX / dist, y: -camY / dist, z: -camZ / dist };
      // World Up = (0, 1, 0)
      let right = {
        x: -fwd.z,
        y: 0,
        z: fwd.x
      };
      const rLen = Math.hypot(right.x, right.z) || 1;
      right.x /= rLen;
      right.z /= rLen;

      // Up = Right x Forward
      const up = {
        x: right.y * fwd.z - right.z * fwd.y,
        y: right.z * fwd.x - right.x * fwd.z,
        z: right.x * fwd.y - right.y * fwd.x
      };

      // 1. CLEAR BACKGROUND WITH DEEP SPACE NEBULA GRADIENT
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Subtle Galactic Dust / Nebula Glow in perspective
      const nebGrad = ctx.createRadialGradient(
        width * 0.5 + Math.sin(yaw) * 120,
        height * 0.5 - Math.sin(pitch) * 90,
        50,
        width * 0.5,
        height * 0.5,
        width * 0.8
      );
      nebGrad.addColorStop(0, 'rgba(30, 27, 75, 0.45)');
      nebGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.6)');
      nebGrad.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
      ctx.fillStyle = nebGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. 3D CELESTIAL SPHERE PROJECTION SETUP
      const fov = 500;
      const cx = width / 2;
      const cy = height / 2;
      // Proportional astronomical scale: In 'real' mode, Moon is accurately 3.67x smaller than Earth
      const sphereRadius = calculate3DViewerSphereRadius(body, width, height, dist, scaleModeRef.current);
      const isBlackHole = body.remnantType === 'black_hole' || body.planetKey === 'black_hole';
      const isPulsar = body.remnantType === 'pulsar' || body.planetKey === 'pulsar';
      const planetKey = isBlackHole
        ? 'black_hole'
        : isPulsar
        ? 'pulsar'
        : (body.planetKey || 'generic_star');
      const isStar = (planetKey === 'sun' || planetKey === 'generic_star') && !isBlackHole && !isPulsar;

      // 2. RENDER 3D BACKGROUND STARS (TRANSFORMED BY CAMERA ORIENTATION + GRAVITATIONAL LENSING)
      // Stars rotate in 3D as camera rotates!
      const stars = starsRef.current;

      ctx.save();
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        // Project 3D star direction into camera space
        const sx = s.x * right.x + s.y * right.y + s.z * right.z;
        const sy = s.x * up.x + s.y * up.y + s.z * up.z;
        const sz = s.x * fwd.x + s.y * fwd.y + s.z * fwd.z;

        // In front of camera?
        if (sz > 0.05) {
          let px = cx + (sx / sz) * fov;
          let py = cy - (sy / sz) * fov;

          // Einstein Gravitational Lensing of background stars around black hole
          let isLensed = false;
          let shearFactor = 1.0;
          if (isBlackHole) {
            const unlensedDx = px - cx;
            const unlensedDy = py - cy;
            const lens = calculateEinsteinLensing(unlensedDx, unlensedDy, sphereRadius * 1.15);
            if (lens.insideShadow) {
              continue; // Light ray absorbed by event horizon!
            }
            px = cx + lens.x;
            py = cy + lens.y;
            shearFactor = lens.factor;
            isLensed = true;
          }

          if (px >= 0 && px <= width && py >= 0 && py <= height) {
            const twinkle = 0.7 + 0.3 * Math.sin(localTime * 2.5 + s.twinkleOffset);
            ctx.fillStyle = isLensed && shearFactor > 1.8 ? '#e0f2fe' : s.color;
            ctx.globalAlpha = Math.min(1.0, Math.max(0.2, sz * twinkle * (isLensed ? Math.min(2.0, shearFactor) : 1.0)));
            ctx.beginPath();
            if (isLensed && shearFactor > 1.4) {
              // Tangential relativistic gravitational arc around black hole
              const angle = Math.atan2(py - cy, px - cx) + Math.PI / 2;
              ctx.ellipse(px, py, s.size * shearFactor * 1.7, s.size * 0.7, angle, 0, Math.PI * 2);
            } else {
              ctx.arc(px, py, s.size * (sz > 0.7 ? 1.1 : 0.8), 0, Math.PI * 2);
            }
            ctx.fill();
          }
        }
      }
      ctx.restore();

      // Light vector from the Sun (or from top-left if inspecting Sun itself)
      let lightDir = { x: 0.7, y: 0.35, z: 0.6 };
      if (!isStar && !isBlackHole) {
        // Light comes from central star (body position relative to 0,0)
        const lx = -body.x;
        const ly = -body.y;
        const lDist = Math.hypot(lx, ly) || 1;
        // Transform light into camera space
        const worldLx = lx / lDist;
        const worldLz = ly / lDist;
        lightDir = {
          x: worldLx * right.x + worldLz * right.z,
          y: 0.25,
          z: worldLx * fwd.x + worldLz * fwd.z
        };
        const len = Math.hypot(lightDir.x, lightDir.y, lightDir.z) || 1;
        lightDir.x /= len;
        lightDir.y /= len;
        lightDir.z /= len;
      }

      // --- 4. PRE-SPHERE BACKGROUND RINGS (For Saturn & Uranus) ---
      if (body.hasRings) {
        render3DRings(ctx, cx, cy, sphereRadius, pitch, yaw, false, body.ringColor || '#fef08a');
      }

      // --- 5. RENDER THE 3D CELESTIAL SPHERE ---
      if (isBlackHole) {
        // Full Interstellar-style Relativistic 3D Black Hole with Gravitational Lensing & Photon Rings
        render3DBlackHole(ctx, {
          cx,
          cy,
          radius: sphereRadius,
          yaw,
          pitch,
          time: localTime,
          mass: body.mass
        });
      } else if (isPulsar) {
        // Full 3D Relativistic Pulsar & Neutron Star with Precessing Magnetic Jets, Shock Diamonds & Lighthouse Flash
        render3DPulsar(ctx, {
          cx,
          cy,
          radius: sphereRadius,
          yaw,
          pitch,
          time: localTime,
          spinRate: body.spinRate || 3.5,
          mass: body.mass,
          name: body.name
        });
      } else if (planetKey === 'earth') {
        // High-Fidelity Photorealistic Earth (authentic continents, oceans, clouds, and night-side glowing city lights)
        renderPhotorealisticEarth(ctx, cx, cy, sphereRadius, yaw, pitch, localTime, lightDir);
      } else if (isStar) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, sphereRadius, 0, Math.PI * 2);
        ctx.clip();
        render3DStarSphere(ctx, cx, cy, sphereRadius, localTime, body);
        ctx.restore();
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, sphereRadius, 0, Math.PI * 2);
        ctx.clip();
        render3DPlanetSphere(ctx, cx, cy, sphereRadius, lightDir, localTime, body, planetKey, yaw, pitch);
        ctx.restore();
      }

      // --- 6. POST-SPHERE FOREGROUND RINGS (For Saturn & Uranus) ---
      if (body.hasRings) {
        render3DRings(ctx, cx, cy, sphereRadius, pitch, yaw, true, body.ringColor || '#fef08a');
      }

      // --- 7. ATMOSPHERIC LIMB GLOW & SPECULAR CORONA ---
      ctx.save();
      if (isStar && !isBlackHole && !isPulsar) {
        // Multi-layer glowing solar corona
        ctx.globalCompositeOperation = 'lighter';
        const coronaR = sphereRadius * 1.85;
        const starGrad = ctx.createRadialGradient(cx, cy, sphereRadius * 0.95, cx, cy, coronaR);
        const col = planetKey === 'sun' ? 'rgba(251, 146, 60, 0.65)' : 'rgba(56, 189, 248, 0.65)';
        const rimCol = planetKey === 'sun' ? '#fef08a' : '#ffffff';
        starGrad.addColorStop(0, rimCol);
        starGrad.addColorStop(0.3, col);
        starGrad.addColorStop(0.7, 'rgba(234, 88, 12, 0.2)');
        starGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = starGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coronaR, 0, Math.PI * 2);
        ctx.fill();

        // Solar flares / Prominences leaping off the surface
        if (planetKey === 'sun') {
          for (let f = 0; f < 6; f++) {
            const fAngle = (f * 1.05) + localTime * 0.2;
            const fDist = sphereRadius + 14 + Math.sin(localTime * 2.0 + f) * 8;
            const fx = cx + Math.cos(fAngle) * fDist;
            const fy = cy + Math.sin(fAngle) * fDist;
            ctx.fillStyle = 'rgba(254, 215, 170, 0.85)';
            ctx.beginPath();
            ctx.arc(fx, fy, 4.5 + Math.sin(f) * 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (body.atmosphereColor || planetKey === 'earth' || planetKey === 'venus') {
        // Delicate planetary atmosphere limb scattering (Rayleigh effect)
        ctx.globalCompositeOperation = 'screen';
        const atmosCol = body.atmosphereColor || (planetKey === 'earth' ? '#38bdf8' : '#fef08a');
        const atmosR = sphereRadius * 1.08;
        const atGrad = ctx.createRadialGradient(cx, cy, sphereRadius * 0.92, cx, cy, atmosR);
        atGrad.addColorStop(0, 'rgba(0,0,0,0)');
        atGrad.addColorStop(0.7, atmosCol + '55');
        atGrad.addColorStop(0.9, atmosCol + 'aa');
        atGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = atGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, atmosR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Visual scale watermark when observing in 1:1 astronomical proportion
      if (scaleModeRef.current === 'real') {
        const ratio = getRadiusRatioToEarth(body);
        ctx.save();
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
        ctx.textAlign = 'right';
        ctx.fillText(`Астрономический масштаб: 1:1 к Земле (R⊕ = 6 371 км)`, width - 24, height - 38);
        ctx.fillStyle = ratio < 0.9 || ratio > 1.1 ? '#38bdf8' : '#e2e8f0';
        ctx.fillText(
          `${body.name}: R = ${formatRadiusKm(body)} (${ratio.toFixed(2)} R⊕ · в ${(ratio >= 1 ? ratio : 1 / ratio).toFixed(2)}x ${ratio >= 1 ? 'больше' : 'меньше'} Земли)`,
          width - 24,
          height - 22
        );
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [body, isRotating, rotationSpeed, globalPaused, scaleMode]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse & Orbit Camera Controls
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      isDragging: true,
      lastX: e.clientX,
      lastY: e.clientY,
      button: e.button
    };
    velocityRef.current = { yawVel: 0, pitchVel: 0 };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;

    // Orbit camera angles:
    // Dragging left/right orbits azimuth (yaw)
    // Dragging up/down tilts elevation (pitch)
    const rotSpeed = 0.0075;
    const newYaw = orbitRef.current.yaw + dx * rotSpeed;
    const newPitch = Math.max(-1.48, Math.min(1.48, orbitRef.current.pitch + dy * rotSpeed));

    orbitRef.current.yaw = newYaw;
    orbitRef.current.pitch = newPitch;
    velocityRef.current.yawVel = dx * 0.0035;
    velocityRef.current.pitchVel = dy * 0.0035;

    setCameraOrbit(prev => ({
      ...prev,
      yaw: newYaw,
      pitch: newPitch
    }));
  };

  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
  };

  // Touch handlers for mobile & touchscreens
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      dragRef.current = {
        isDragging: true,
        lastX: e.touches[0].clientX,
        lastY: e.touches[0].clientY,
        button: 0
      };
      velocityRef.current = { yawVel: 0, pitchVel: 0 };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragRef.current.lastX;
    const dy = e.touches[0].clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.touches[0].clientX;
    dragRef.current.lastY = e.touches[0].clientY;

    const rotSpeed = 0.0075;
    const newYaw = orbitRef.current.yaw + dx * rotSpeed;
    const newPitch = Math.max(-1.48, Math.min(1.48, orbitRef.current.pitch + dy * rotSpeed));

    orbitRef.current.yaw = newYaw;
    orbitRef.current.pitch = newPitch;
    velocityRef.current.yawVel = dx * 0.0035;
    velocityRef.current.pitchVel = dy * 0.0035;

    setCameraOrbit(prev => ({
      ...prev,
      yaw: newYaw,
      pitch: newPitch
    }));
  };

  const handleTouchEnd = () => {
    dragRef.current.isDragging = false;
  };

  // Zoom camera distance on wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.92 : 1.08;
    setCameraOrbit(prev => ({
      ...prev,
      distance: Math.max(1.25, Math.min(6.5, prev.distance * zoomFactor))
    }));
  };

  // Previous and next planet cycling
  const currentIndex = allBodies.findIndex(b => b.id === body.id);
  const handlePrevBody = () => {
    if (allBodies.length === 0) return;
    const prevIdx = (currentIndex - 1 + allBodies.length) % allBodies.length;
    onSelectBody(allBodies[prevIdx]);
  };
  const handleNextBody = () => {
    if (allBodies.length === 0) return;
    const nextIdx = (currentIndex + 1) % allBodies.length;
    onSelectBody(allBodies[nextIdx]);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950 font-sans">
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Top Header Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Planet Identification Badge */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-3 border border-cyan-500/30 shadow-2xl backdrop-blur-xl">
            <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-500/50" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white font-mono uppercase tracking-wider">{body.name}</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono">
                  {formatRadiusKm(body)}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-mono">
                  {getRadiusRatioToEarth(body).toFixed(2)} R⊕
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm truncate">
                {body.customDescription || 'Астрономический объект Солнечной системы'}
              </p>
            </div>
          </div>

          {/* Quick cycle buttons */}
          <div className="glass-panel p-1 rounded-2xl flex items-center gap-1 border border-slate-700/60 backdrop-blur-xl">
            <button
              onClick={handlePrevBody}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Предыдущая планета [←]"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-1">
              {currentIndex + 1} / {allBodies.length}
            </span>
            <button
              onClick={handleNextBody}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Следующая планета [→]"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Right: Scale mode toggle, Camera Reset & Exit 3D View */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Automatic real vs focus scale toggle */}
          <button
            onClick={() => setScaleMode(prev => prev === 'real' ? 'focus' : 'real')}
            className={`glass-panel px-3 py-2 rounded-2xl flex items-center gap-1.5 text-xs transition border ${
              scaleMode === 'real'
                ? 'border-emerald-500/60 text-emerald-300 bg-emerald-950/50 shadow-lg shadow-emerald-950/50'
                : 'border-amber-500/60 text-amber-300 bg-amber-950/50'
            }`}
            title={scaleMode === 'real' ? 'Включен реальный физический масштаб 1:1 к Земле. Нажмите для перехода в крупный план (автофокус).' : 'Включен крупный план (фокус). Нажмите для возврата к реальному астрономическому масштабу 1:1.'}
          >
            <Maximize2 size={14} />
            <span className="hidden sm:inline font-mono font-semibold">
              {scaleMode === 'real' ? '⚖️ 1:1 Реальный размер' : '🔍 Крупный план'}
            </span>
          </button>

          <button
            onClick={() => setCameraOrbit({ yaw: 0.8, pitch: 0.25, distance: 2.6 })}
            className="glass-panel px-3 py-2 rounded-2xl flex items-center gap-1.5 text-xs text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 transition border border-slate-700/60"
            title="Сбросить угол камеры"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline font-mono">Сброс</span>
          </button>

          <button
            onClick={() => setShowTelemetry(prev => !prev)}
            className={`glass-panel px-3 py-2 rounded-2xl flex items-center gap-1.5 text-xs transition border ${
              showTelemetry
                ? 'border-cyan-500/50 text-cyan-300 bg-cyan-950/40'
                : 'border-slate-700/60 text-slate-400 hover:text-white'
            }`}
            title="Переключить карточку телеметрии"
          >
            <Info size={14} />
            <span className="hidden sm:inline font-mono">Инфо</span>
          </button>

          <button
            onClick={onClose}
            className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 shadow-xl transition"
            title="Вернуться к 2D орбитальной карте [ESC]"
          >
            <X size={15} />
            <span className="font-mono">В 2D космос</span>
          </button>
        </div>
      </div>

      {/* Floating 3D Navigation Guide Tip */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none glass-panel px-4 py-2 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-xl flex items-center gap-4 text-xs font-mono text-slate-300">
        <span className="flex items-center gap-1.5">
          <Compass size={14} className="text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span>Зажмите ЛКМ / колесико для 3D вращения камеры</span>
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">Колесико: зум камеры</span>
        <span className="text-slate-600">|</span>
        <span className="text-amber-400">Космос вращается синхронно</span>
      </div>

      {/* Planet Telemetry Card Overlay */}
      {showTelemetry && (
        <aside className="absolute bottom-20 left-4 z-20 glass-panel rounded-2xl p-4 w-72 border border-slate-700/60 shadow-2xl backdrop-blur-2xl text-xs font-mono text-slate-300 animate-fade-in pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-[10px] uppercase text-cyan-400 tracking-wider">Параметры тела</span>
            <span className="text-[10px] text-slate-400">ID: {body.id.slice(0, 8)}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Масса:</span>
              <span className="text-slate-100 font-semibold">{body.mass >= 0.01 ? `${body.mass.toFixed(3)} M☉` : `${(body.mass * 333000).toFixed(1)} M⊕`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Реальный радиус:</span>
              <span className="text-emerald-400 font-semibold">{formatRadiusKm(body)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Размер к Земле:</span>
              <span className="text-cyan-300 font-semibold">
                {getRadiusRatioToEarth(body).toFixed(3)} R⊕ {getRadiusRatioToEarth(body) < 0.99 ? `(1 : ${(1 / getRadiusRatioToEarth(body)).toFixed(2)})` : getRadiusRatioToEarth(body) > 1.01 ? `(${getRadiusRatioToEarth(body).toFixed(1)}x)` : '(1:1)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Объем к Земле:</span>
              <span className="text-slate-200">
                {Math.pow(getRadiusRatioToEarth(body), 3) < 0.01
                  ? `${(Math.pow(getRadiusRatioToEarth(body), 3) * 100).toFixed(2)}% V⊕`
                  : `${Math.pow(getRadiusRatioToEarth(body), 3).toFixed(2)} V⊕`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Температура поверхности:</span>
              <span className="text-amber-300 font-semibold">{body.Teff} K ({Math.round(body.Teff - 273)}°C)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Орбитальная скорость:</span>
              <span className="text-cyan-300 font-semibold">{Math.hypot(body.vx, body.vy).toFixed(2)} км/с</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Режим масштаба:</span>
              <span className={scaleMode === 'real' ? 'text-emerald-400' : 'text-amber-300'}>
                {scaleMode === 'real' ? '1:1 Физический' : 'Крупный план'}
              </span>
            </div>
            {body.dopplerShift !== undefined && (
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Эффект Допплера:</span>
                <span className={`font-semibold font-mono ${body.dopplerShift < -0.02 ? 'text-sky-400' : body.dopplerShift > 0.02 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {body.dopplerShift < -0.02
                    ? `z = ${body.dopplerShift.toFixed(3)} (Синее, ${(getDopplerBeamingIntensity(body.dopplerShift)).toFixed(1)}x ярче)`
                    : body.dopplerShift > 0.02
                    ? `z = +${body.dopplerShift.toFixed(3)} (Красное, затухание)`
                    : 'z ≈ 0 (Статично)'}
                </span>
              </div>
            )}
            {body.remnantType === 'black_hole' && (
              <div className="flex justify-between items-center text-[10px] text-purple-300 bg-purple-950/40 px-2 py-1 rounded-lg border border-purple-500/30">
                <span>Гравит. линзирование:</span>
                <span className="font-bold text-cyan-300">Кольцо Эйнштейна</span>
              </div>
            )}
            {body.hasRings && (
              <div className="flex justify-between text-yellow-300">
                <span>Кольцевая система:</span>
                <span>Активна (3D деление)</span>
              </div>
            )}
            {body.parentBodyId && (
              <div className="flex justify-between text-sky-300">
                <span>Родительское тело:</span>
                <span>{allBodies.find(b => b.id === body.parentBodyId)?.name || 'Планета'}</span>
              </div>
            )}
          </div>

          {/* Quick Rotation Play/Pause */}
          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setIsRotating(prev => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              {isRotating ? <Pause size={12} className="text-amber-400" /> : <Play size={12} className="text-emerald-400" />}
              <span>{isRotating ? 'Остановить спин' : 'Вращать планету'}</span>
            </button>

            <span className="text-[10px] text-slate-500">
              Зум: {(1 / cameraOrbit.distance * 2.6).toFixed(1)}x
            </span>
          </div>
        </aside>
      )}
    </div>
  );
};

// ============================================================================
// REALISTIC 3D CELESTIAL RENDERING SUBROUTINES
// ============================================================================

/**
 * Renders high-fidelity 3D Saturn / Uranus rings with true perspective
 */
function render3DRings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sphereRadius: number,
  pitch: number,
  yaw: number,
  foregroundOnly: boolean,
  ringBaseColor: string
) {
  const ringTilt = 0.48; // Axial tilt of rings
  const ringInner = sphereRadius * 1.35;
  const ringOuter = sphereRadius * 2.45;
  const ringCassiniInner = sphereRadius * 1.88;
  const ringCassiniOuter = sphereRadius * 1.98;

  // Vertical compression based on camera pitch
  const cosTilt = Math.sin(pitch + ringTilt);
  const ringHeight = Math.max(4, Math.abs(cosTilt));

  ctx.save();
  ctx.translate(cx, cy);

  // If foreground only, clip only the lower or upper half depending on tilt
  if (foregroundOnly) {
    ctx.beginPath();
    if (cosTilt > 0) {
      ctx.rect(-ringOuter * 1.2, 0, ringOuter * 2.4, ringOuter * 1.2);
    } else {
      ctx.rect(-ringOuter * 1.2, -ringOuter * 1.2, ringOuter * 2.4, ringOuter * 1.2);
    }
    ctx.clip();
  } else {
    // Background half
    ctx.beginPath();
    if (cosTilt > 0) {
      ctx.rect(-ringOuter * 1.2, -ringOuter * 1.2, ringOuter * 2.4, ringOuter * 1.2);
    } else {
      ctx.rect(-ringOuter * 1.2, 0, ringOuter * 2.4, ringOuter * 1.2);
    }
    ctx.clip();
  }

  // Draw concentric rings with Cassini division gap
  // Ring B (Bright inner)
  drawRingBand(ctx, ringInner, ringCassiniInner, ringHeight, 'rgba(254, 240, 138, 0.65)');
  // Cassini Division gap (Dark space gap)
  drawRingBand(ctx, ringCassiniInner, ringCassiniOuter, ringHeight, 'rgba(15, 23, 42, 0.4)');
  // Ring A (Translucent outer)
  drawRingBand(ctx, ringCassiniOuter, ringOuter, ringHeight, 'rgba(253, 224, 71, 0.45)');

  ctx.restore();
}

function drawRingBand(
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

/**
 * Renders 3D Star Sphere with boiling granulation and radiant convection
 */
function render3DStarSphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  time: number,
  body: CelestialBody
) {
  const isSun = body.planetKey === 'sun';
  const baseColor = isSun ? '#f97316' : '#38bdf8';
  const coreColor = isSun ? '#ffffff' : '#e0f2fe';
  const rimColor = isSun ? '#ea580c' : '#0284c7';

  // Base spherical radiant gradient
  const starGrad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
  starGrad.addColorStop(0, coreColor);
  starGrad.addColorStop(0.55, baseColor);
  starGrad.addColorStop(0.88, rimColor);
  starGrad.addColorStop(1, '#000000');

  ctx.fillStyle = starGrad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // Dynamic turbulent convective granulation cells
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  for (let ring = 1; ring <= 4; ring++) {
    const rDist = (radius / 4.5) * ring;
    const count = ring * 6;
    for (let c = 0; c < count; c++) {
      const angle = (c * (Math.PI * 2 / count)) + time * (0.2 / ring);
      const px = cx + Math.cos(angle) * rDist;
      const py = cy + Math.sin(angle) * rDist;
      const pSize = 7 + Math.sin(time * 3.0 + c) * 3;

      ctx.fillStyle = c % 2 === 0 ? '#fef08a' : '#c2410c';
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Renders Realistic 3D Planet Sphere with day/night terminator, custom surface features,
 * oceans, clouds, and city lights!
 */
function render3DPlanetSphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  lightDir: { x: number; y: number; z: number },
  time: number,
  body: CelestialBody,
  planetKey: PlanetKey,
  yaw: number = 0,
  pitch: number = 0
) {
  // If Earth, use the photorealistic 3D equirectangular raycasting engine
  if (planetKey === 'earth') {
    renderPhotorealisticEarth(ctx, cx, cy, radius, yaw, pitch, time, lightDir);
    return;
  }

  // 1. BASE PLANETARY SPHERE MATERIAL
  const colors = getPlanetPalette(planetKey);

  // Spherical normal lighting gradient
  const lightX = cx + lightDir.x * radius * 0.75;
  const lightY = cy - lightDir.y * radius * 0.75;

  const sphereGrad = ctx.createRadialGradient(
    lightX,
    lightY,
    radius * 0.05,
    cx,
    cy,
    radius * 1.05
  );
  sphereGrad.addColorStop(0, colors.highlight);
  sphereGrad.addColorStop(0.35, colors.primary);
  sphereGrad.addColorStop(0.7, colors.secondary);
  sphereGrad.addColorStop(0.95, colors.shadow);
  sphereGrad.addColorStop(1, '#020617');

  ctx.fillStyle = sphereGrad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // 2. DETAILED SURFACE FEATURES ACCORDING TO PLANET IDENTITY
  ctx.save();

  if (planetKey === 'jupiter') {
    // --- JUPITER: ALTERNATING BELTS, ZONES & GREAT RED SPOT ---
    renderJupiterBands(ctx, cx, cy, radius, lightDir, time, yaw, pitch);
  } else if (planetKey === 'saturn') {
    // --- SATURN: SOFT BUTTER-GOLDEN ATMOSPHERIC BANDS ---
    renderSaturnBands(ctx, cx, cy, radius, lightDir, time, yaw, pitch);
  } else if (planetKey === 'mars') {
    // --- MARS: RUST DESERT, CRATERS & POLAR ICE CAPS ---
    renderMarsSurface(ctx, cx, cy, radius, lightDir, time, yaw, pitch);
  } else if (planetKey === 'venus') {
    // --- VENUS: SWIRLING SULFURIC ACID CLOUDS ---
    renderVenusClouds(ctx, cx, cy, radius, lightDir, time);
  } else if (planetKey === 'moon' || planetKey === 'mercury' || planetKey === 'callisto') {
    // --- CRATERED ROCKY BODIES: MARIA & BASALT IMPACT CRATERS ---
    renderCrateredMoonSurface(ctx, cx, cy, radius, lightDir, time, planetKey, yaw, pitch);
  } else if (planetKey === 'neptune' || planetKey === 'uranus') {
    // --- ICE GIANTS: METHANE CIRRUS STORMS & GREAT DARK SPOT ---
    renderIceGiantBands(ctx, cx, cy, radius, lightDir, time, planetKey);
  } else if (planetKey === 'pluto') {
    // --- PLUTO: TOMBAUGH REGIO WHITE HEART & RED THOLINS ---
    renderPlutoSurface(ctx, cx, cy, radius, lightDir, time);
  } else if (planetKey === 'io') {
    // --- IO: VOLCANIC SULFUR CALDERAS ---
    renderIoSurface(ctx, cx, cy, radius, lightDir, time);
  } else if (planetKey === 'europa') {
    // --- EUROPA: CRACKED ICE CRUST OVER OCEAN ---
    renderEuropaSurface(ctx, cx, cy, radius, lightDir, time);
  }

  // 3. DAY / NIGHT TERMINATOR SHADOW
  // Realistic shadow mask over unlit hemisphere
  const termGrad = ctx.createLinearGradient(
    cx - lightDir.x * radius,
    cy + lightDir.y * radius,
    cx + lightDir.x * radius,
    cy - lightDir.y * radius
  );
  termGrad.addColorStop(0, 'rgba(2, 6, 23, 0.94)');
  termGrad.addColorStop(0.48, 'rgba(2, 6, 23, 0.85)');
  termGrad.addColorStop(0.55, 'rgba(2, 6, 23, 0.15)');
  termGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
  termGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = termGrad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.restore();
}

/**
 * Earth custom realistic continents, clouds and ocean glint
 */
function renderEarthSurface(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  lightDir: { x: number; y: number; z: number },
  time: number
) {
  // Continents in spherical rotation
  ctx.save();
  const spinOffset = (time * 0.45) % (Math.PI * 2);

  // Eurasian & American landmass representations
  const landColor = '#15803d'; // Green vegetation
  const aridColor = '#a16207'; // Desert Sahara / Central Asia

  for (let c = 0; c < 5; c++) {
    const lon = spinOffset + c * 1.35;
    // Calculate if continent is on front-facing hemisphere
    const cosLon = Math.cos(lon);
    if (cosLon > -0.2) {
      const px = cx + Math.sin(lon) * r * 0.78;
      const py = cy + (c === 0 ? -r * 0.2 : c === 1 ? r * 0.1 : c === 2 ? -r * 0.35 : r * 0.25);
      const cw = r * 0.42 * Math.max(0.2, cosLon);
      const ch = r * 0.32;

      ctx.fillStyle = c === 1 ? aridColor : landColor;
      ctx.beginPath();
      ctx.ellipse(px, py, cw, ch, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Polar ice caps (North & South Poles)
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.88, r * 0.45, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.88, r * 0.42, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dynamic swirling cloud deck with transparency
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#ffffff';
  const cloudSpin = (time * 0.55) % (Math.PI * 2);
  for (let k = 0; k < 6; k++) {
    const cLon = cloudSpin + k * 1.1;
    if (Math.cos(cLon) > -0.2) {
      const cpx = cx + Math.sin(cLon) * r * 0.82;
      const cpy = cy + Math.sin(k * 1.7) * r * 0.5;
      ctx.beginPath();
      ctx.ellipse(cpx, cpy, r * 0.38, r * 0.12, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1.0;

  ctx.restore();
}

/**
 * Jupiter banded atmosphere with Great Red Spot
 */
function renderJupiterBands(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  lightDir: { x: number; y: number; z: number },
  time: number,
  yaw: number = 0,
  pitch: number = 0
) {
  ctx.save();
  const bandColors = [
    '#fed7aa', // Light zone
    '#c2410c', // Dark rust belt
    '#ffedd5', // White zone
    '#9a3412', // Deep brown belt
    '#fdba74',
    '#7c2d12',
    '#fed7aa'
  ];

  // Alternating turbulent horizontal bands with pitch curve
  const numBands = 9;
  const pitchCurve = Math.sin(pitch) * 15;
  for (let i = 0; i < numBands; i++) {
    const y0 = cy - r + (i * (r * 2 / numBands)) + pitchCurve;
    const h = (r * 2 / numBands);
    ctx.fillStyle = bandColors[i % bandColors.length];
    ctx.fillRect(cx - r, y0, r * 2, h);
  }

  // Great Red Spot (GRS) at southern temperate belt rotating with yaw
  const grsSpin = (yaw + time * 0.38) % (Math.PI * 2);
  const grsCos = Math.cos(grsSpin);
  if (grsCos > -0.25) {
    const grsX = cx + Math.sin(grsSpin) * r * 0.72;
    const grsY = cy + r * 0.28 + pitchCurve * 0.7;
    const grsW = r * 0.32 * Math.max(0.2, grsCos);
    const grsH = r * 0.16;

    // Outer vortex
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.ellipse(grsX, grsY, grsW, grsH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner storm core
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.ellipse(grsX, grsY, grsW * 0.5, grsH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Saturn soft banded atmosphere
 */
function renderSaturnBands(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  lightDir: { x: number; y: number; z: number },
  time: number,
  yaw: number = 0,
  pitch: number = 0
) {
  ctx.save();
  const saturnBands = ['#fef08a', '#fde047', '#fef9c3', '#eab308', '#ca8a04'];
  const numBands = 8;
  const pitchCurve = Math.sin(pitch) * 12;
  for (let i = 0; i < numBands; i++) {
    const y0 = cy - r + (i * (r * 2 / numBands)) + pitchCurve;
    ctx.fillStyle = saturnBands[i % saturnBands.length];
    ctx.fillRect(cx - r, y0, r * 2, (r * 2 / numBands));
  }
  ctx.restore();
}

/**
 * Mars rust surface and white polar ice caps
 */
function renderMarsSurface(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  lightDir: { x: number; y: number; z: number },
  time: number,
  yaw: number = 0,
  pitch: number = 0
) {
  ctx.save();
  // Dark basalt plateau (Syrtis Major)
  const spin = (yaw + time * 0.3) % (Math.PI * 2);
  const cosSpin = Math.cos(spin);
  if (cosSpin > -0.2) {
    ctx.fillStyle = '#7f1d1d';
    const sx = cx + Math.sin(spin) * r * 0.65;
    const sy = cy + Math.sin(pitch) * r * 0.3;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * 0.42 * Math.max(0.2, cosSpin), r * 0.28, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Polar ice caps (North & South) tilted by pitch
  ctx.fillStyle = '#f8fafc';
  const poleTilt = Math.sin(pitch) * r * 0.4;
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.88 + poleTilt, r * 0.35, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.88 + poleTilt, r * 0.3, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Venus thick creamy sulfuric acid clouds
 */
function renderVenusClouds(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  lightDir: { x: number; y: number; z: number },
  time: number
) {
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#fef9c3';
  for (let i = 0; i < 5; i++) {
    const y = cy - r + i * (r * 0.45);
    ctx.beginPath();
    ctx.ellipse(cx, y, r * 0.95, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Moon / Mercury / Callisto impact craters & dark maria
 */
function renderCrateredMoonSurface(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  lightDir: { x: number; y: number; z: number },
  time: number,
  planetKey: PlanetKey,
  yaw: number = 0,
  pitch: number = 0
) {
  ctx.save();
  // Dark lunar maria (Sea of Tranquillity, etc.) rotating with yaw
  const spin = (yaw + time * 0.3) % (Math.PI * 2);
  const pitchOffset = Math.sin(pitch) * r * 0.35;
  if (Math.cos(spin) > -0.25) {
    const mx = cx + Math.sin(spin) * r * 0.55;
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(mx - r * 0.15, cy - r * 0.1 + pitchOffset, r * 0.32, r * 0.22, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(mx + r * 0.18, cy + r * 0.15 + pitchOffset, r * 0.25, r * 0.18, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Impact craters with highlighted rims
  for (let c = 0; c < 7; c++) {
    const angle = c * 0.95;
    const dist = r * 0.45;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Neptune & Uranus ice giant features
 */
function renderIceGiantBands(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  lightDir: { x: number; y: number; z: number },
  time: number,
  planetKey: PlanetKey
) {
  if (planetKey === 'neptune') {
    // Great Dark Spot & white methane cirrus streaks
    const spin = (time * 0.42) % (Math.PI * 2);
    if (Math.cos(spin) > -0.2) {
      const gx = cx + Math.sin(spin) * r * 0.65;
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.ellipse(gx, cy - r * 0.15, r * 0.28, r * 0.16, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // High-altitude cirrus clouds
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(gx + 12, cy - r * 0.15 - 8, r * 0.15, r * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Pluto Tombaugh Regio white heart
 */
function renderPlutoSurface(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  lightDir: { x: number; y: number; z: number },
  time: number
) {
  const spin = (time * 0.35) % (Math.PI * 2);
  if (Math.cos(spin) > -0.2) {
    const hx = cx + Math.sin(spin) * r * 0.55;
    ctx.fillStyle = '#f8fafc'; // Nitrogen ice heart
    ctx.beginPath();
    ctx.ellipse(hx - 8, cy, r * 0.22, r * 0.28, -0.2, 0, Math.PI * 2);
    ctx.ellipse(hx + 8, cy, r * 0.22, r * 0.28, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Io sulfur volcanoes
 */
function renderIoSurface(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  lightDir: { x: number; y: number; z: number },
  time: number
) {
  ctx.save();
  for (let v = 0; v < 5; v++) {
    const px = cx + Math.cos(v * 1.3) * r * 0.5;
    const py = cy + Math.sin(v * 1.3) * r * 0.5;
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Europa cracked ice crust
 */
function renderEuropaSurface(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  lightDir: { x: number; y: number; z: number },
  time: number
) {
  ctx.save();
  ctx.strokeStyle = '#92400e'; // Reddish-brown fracture lines
  ctx.lineWidth = 1.5;
  for (let l = 0; l < 4; l++) {
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6 + l * 20, cy - r * 0.4);
    ctx.bezierCurveTo(cx - r * 0.2, cy, cx + r * 0.3, cy - r * 0.2, cx + r * 0.6, cy + r * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Returns color palette for each planet
 */
function getPlanetPalette(planetKey: PlanetKey) {
  switch (planetKey) {
    case 'mercury':
      return { highlight: '#cbd5e1', primary: '#94a3b8', secondary: '#475569', shadow: '#1e293b' };
    case 'venus':
      return { highlight: '#fef08a', primary: '#facc15', secondary: '#ca8a04', shadow: '#713f12' };
    case 'earth':
      return { highlight: '#38bdf8', primary: '#0284c7', secondary: '#0369a1', shadow: '#082f49' };
    case 'moon':
      return { highlight: '#f1f5f9', primary: '#cbd5e1', secondary: '#64748b', shadow: '#1e293b' };
    case 'mars':
      return { highlight: '#fca5a5', primary: '#ef4444', secondary: '#b91c1c', shadow: '#450a0a' };
    case 'jupiter':
      return { highlight: '#fed7aa', primary: '#fb923c', secondary: '#c2410c', shadow: '#431407' };
    case 'saturn':
      return { highlight: '#fef9c3', primary: '#fef08a', secondary: '#eab308', shadow: '#713f12' };
    case 'uranus':
      return { highlight: '#a5f3fc', primary: '#38bdf8', secondary: '#0284c7', shadow: '#082f49' };
    case 'neptune':
      return { highlight: '#38bdf8', primary: '#0284c7', secondary: '#1d4ed8', shadow: '#172554' };
    case 'pluto':
      return { highlight: '#f1f5f9', primary: '#cbd5e1', secondary: '#78350f', shadow: '#27272a' };
    case 'io':
      return { highlight: '#fef08a', primary: '#eab308', secondary: '#b45309', shadow: '#451a03' };
    case 'europa':
      return { highlight: '#f8fafc', primary: '#e2e8f0', secondary: '#94a3b8', shadow: '#334155' };
    case 'titan':
      return { highlight: '#fed7aa', primary: '#f97316', secondary: '#c2410c', shadow: '#431407' };
    default:
      return { highlight: '#e2e8f0', primary: '#94a3b8', secondary: '#475569', shadow: '#0f172a' };
  }
}
