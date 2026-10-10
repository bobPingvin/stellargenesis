/**
 * Celestial 3D Viewer Component
 * Professional Blender-Grade 3D Viewport & Photorealistic Celestial Body Inspection Mode.
 *
 * Features:
 * - 4 Blender Shading Modes: Wireframe (UV mesh), Solid (Studio Clay/MatCap), Material Preview, and Rendered.
 * - Interactive 3D Orientation Gizmo (XYZ triad in top-right with clickable axes +X, -X, +Y, -Y, +Z, -Z).
 * - Full Blender Navigation: Orbit (LMB/MMB drag), Pan (Shift + LMB/MMB drag), Smooth Zoom (Wheel / Ctrl+drag).
 * - Direction-following rotation: dragging mouse rotates object directly in the dragged direction.
 * - Perspective & Orthographic projection modes (Numpad 5).
 * - Frame / Center Selected Object (Numpad . / F).
 * - Clean cosmic viewport: no distracting floor grid or ground plane lines.
 * - Interactive Sun Light Angle Controller for custom day/night terminator inspection.
 * - Photorealistic 3D Raycasting with authentic topography, oceans, continents, deserts,
 *   convective stellar granulation, 3D rings with shadows, night city lights, and relativistic black holes/pulsars.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CelestialBody, PlanetKey } from '../types';
import {
  renderPhotorealisticCelestialBody,
  render3DRingsWithShadows,
  ShadingMode
} from '../physics/planetTextures';
import { render3DBlackHole, calculateEinsteinLensing } from '../physics/blackHole3DRenderer';
import { render3DPulsar } from '../physics/pulsar3DRenderer';
import { render3DMagicalSun } from '../physics/sun3DRenderer';
import { getDopplerBeamingIntensity } from '../physics/engine';
import {
  calculate3DViewerSphereRadius,
  formatRadiusKm,
  getRadiusRatioToEarth
} from '../physics/celestialScales';
import {
  X,
  RotateCcw,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Info,
  Maximize2,
  Box,
  Circle,
  Eye,
  Sun,
  Move,
  ZoomIn,
  Target,
  Compass,
  Orbit
} from 'lucide-react';

export const SOLAR_ORDER: Record<string, number> = {
  sun: 0,
  mercury: 1,
  venus: 2,
  earth: 3,
  mars: 4,
  jupiter: 5,
  saturn: 6,
  uranus: 7,
  neptune: 8,
  pluto: 9
};

export const PLANET_SYMBOLS: Record<string, string> = {
  sun: '☀️',
  mercury: '☿',
  venus: '♀',
  earth: '⊕',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇'
};

export const PLANET_PALETTE: Record<string, string> = {
  sun: '#fde047',
  mercury: '#94a3b8',
  venus: '#fef08a',
  earth: '#38bdf8',
  moon: '#cbd5e1',
  mars: '#f87171',
  jupiter: '#fed7aa',
  saturn: '#fde047',
  uranus: '#67e8f9',
  neptune: '#60a5fa',
  pluto: '#d6d3d1'
};

export const ASTRONOMICAL_AU: Record<string, number> = {
  sun: 0.0,
  mercury: 0.39,
  venus: 0.72,
  earth: 1.0,
  mars: 1.52,
  jupiter: 5.2,
  saturn: 9.58,
  uranus: 19.2,
  neptune: 30.1,
  pluto: 39.5
};

interface Celestial3DViewerProps {
  body: CelestialBody;
  allBodies: CelestialBody[];
  onSelectBody: (body: CelestialBody) => void;
  onClose: () => void;
  isPaused: boolean;
}

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

  // --------------------------------------------------------------------------
  // Camera & Navigation State (Blender Coordinates)
  // --------------------------------------------------------------------------
  const [cameraOrbit, setCameraOrbit] = useState({
    yaw: 0.8,
    pitch: 0.25,
    distance: 2.6
  });

  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isOrthographic, setIsOrthographic] = useState<boolean>(false);
  const [shadingMode, setShadingMode] = useState<ShadingMode>('rendered');
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'body' | 'system'>('body'); // Single body close-up vs Entire Solar System in 3D
  const [sunAngle, setSunAngle] = useState<number>(45); // Sun azimuth in degrees
  const [useRealSunPosition, setUseRealSunPosition] = useState<boolean>(true); // Real astronomical Sun lighting
  const [showOrbits, setShowOrbits] = useState<boolean>(true); // Solar System orbits in 3D background
  const [activeNavTool, setActiveNavTool] = useState<'orbit' | 'pan' | 'zoom'>('orbit');

  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [rotationSpeed, setRotationSpeed] = useState<number>(1.0);
  const [showTelemetry, setShowTelemetry] = useState<boolean>(true);
  const [scaleMode, setScaleMode] = useState<'real' | 'focus'>('real');

  // Animation Refs
  const orbitRef = useRef(cameraOrbit);
  orbitRef.current = cameraOrbit;

  const panRef = useRef(panOffset);
  panRef.current = panOffset;

  const isOrthoRef = useRef(isOrthographic);
  isOrthoRef.current = isOrthographic;

  const shadingModeRef = useRef(shadingMode);
  shadingModeRef.current = shadingMode;

  const showOverlaysRef = useRef(showOverlays);
  showOverlaysRef.current = showOverlays;

  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const sunAngleRef = useRef(sunAngle);
  sunAngleRef.current = sunAngle;

  const useRealSunRef = useRef(useRealSunPosition);
  useRealSunRef.current = useRealSunPosition;

  const showOrbitsRef = useRef(showOrbits);
  showOrbitsRef.current = showOrbits;

  const scaleModeRef = useRef(scaleMode);
  scaleModeRef.current = scaleMode;

  // Clickable interactive planet targets on canvas
  const clickablePlanetsRef = useRef<
    Array<{ body: CelestialBody; x: number; y: number; radius: number }>
  >([]);

  // Filter and sort primary bodies strictly in canonical Solar System order
  const sortedPlanets = React.useMemo(() => {
    return allBodies
      .filter(b => !b.parentBodyId)
      .sort((a, b) => {
        const ordA = SOLAR_ORDER[a.planetKey || ''] ?? 99;
        const ordB = SOLAR_ORDER[b.planetKey || ''] ?? 99;
        return ordA - ordB;
      });
  }, [allBodies]);

  const isViewedBodySun =
    body.planetKey === 'sun' ||
    body.name.toLowerCase().includes('солнце') ||
    body.name.toLowerCase().includes('sun');

  const [infoTab, setInfoTab] = useState<'radar' | 'telemetry'>('radar');

  const currentPlanetIdx = sortedPlanets.findIndex(
    b => b.id === body.id || b.planetKey === body.planetKey
  );

  const handlePrevBody = useCallback(() => {
    if (sortedPlanets.length === 0) return;
    const prevIdx =
      (currentPlanetIdx - 1 + sortedPlanets.length) % sortedPlanets.length;
    onSelectBody(sortedPlanets[prevIdx]);
  }, [currentPlanetIdx, sortedPlanets, onSelectBody]);

  const handleNextBody = useCallback(() => {
    if (sortedPlanets.length === 0) return;
    const nextIdx = (currentPlanetIdx + 1) % sortedPlanets.length;
    onSelectBody(sortedPlanets[nextIdx]);
  }, [currentPlanetIdx, sortedPlanets, onSelectBody]);

  // Drag interaction tracker
  const dragRef = useRef<{
    isDragging: boolean;
    dragType: 'orbit' | 'pan' | 'zoom' | 'gizmo';
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    button: number;
  }>({
    isDragging: false,
    dragType: 'orbit',
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    button: 0
  });

  // Inertia momentum
  const velocityRef = useRef({ yawVel: 0, pitchVel: 0 });

  // Camera animation target for smooth transitions (e.g. clicking gizmo axes)
  const animTargetRef = useRef<{
    targetYaw: number;
    targetPitch: number;
    animating: boolean;
  }>({ targetYaw: 0, targetPitch: 0, animating: false });

  // Precomputed background 3D Starfield
  const starsRef = useRef<SkyStar[]>([]);
  useEffect(() => {
    const stars: SkyStar[] = [];
    const starColors = ['#ffffff', '#bae6fd', '#fef08a', '#fed7aa', '#fca5a5'];
    for (let i = 0; i < 900; i++) {
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

  // --------------------------------------------------------------------------
  // Camera Actions & Blender Hotkeys
  // --------------------------------------------------------------------------
  const snapToView = useCallback((yaw: number, pitch: number) => {
    animTargetRef.current = {
      targetYaw: yaw,
      targetPitch: pitch,
      animating: true
    };
    velocityRef.current = { yawVel: 0, pitchVel: 0 };
  }, []);

  const frameObject = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
    setCameraOrbit(prev => ({ ...prev, distance: 2.6 }));
    velocityRef.current = { yawVel: 0, pitchVel: 0 };
  }, []);

  const resetCamera = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
    setCameraOrbit({ yaw: 0.8, pitch: 0.25, distance: 2.6 });
    velocityRef.current = { yawVel: 0, pitchVel: 0 };
  }, []);

  // Hotkey event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Numpad1':
        case 'Digit1':
          e.preventDefault();
          snapToView(0, 0); // Front view
          break;
        case 'Numpad3':
        case 'Digit3':
          e.preventDefault();
          snapToView(Math.PI * 0.5, 0); // Right side view
          break;
        case 'Numpad7':
        case 'Digit7':
          e.preventDefault();
          snapToView(0, -Math.PI * 0.5 + 0.001); // Top view
          break;
        case 'Numpad9':
        case 'Digit9':
          e.preventDefault();
          snapToView(orbitRef.current.yaw + Math.PI, -orbitRef.current.pitch); // Invert view
          break;
        case 'Numpad5':
        case 'Digit5':
          e.preventDefault();
          setIsOrthographic(prev => !prev);
          break;
        case 'NumpadDecimal':
        case 'Period':
        case 'KeyF':
          e.preventDefault();
          frameObject();
          break;
        case 'KeyZ':
          e.preventDefault();
          setShadingMode(prev => {
            if (prev === 'wireframe') return 'solid';
            if (prev === 'solid') return 'material';
            if (prev === 'material') return 'rendered';
            return 'wireframe';
          });
          break;
        case 'Space':
          e.preventDefault();
          setIsRotating(prev => !prev);
          break;
        case 'KeyH':
          e.preventDefault();
          setShowOverlays(prev => !prev);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [snapToView, frameObject, onClose]);

  // --------------------------------------------------------------------------
  // Main 3D Render Loop
  // --------------------------------------------------------------------------
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

      // Smooth camera snap interpolation
      if (animTargetRef.current.animating) {
        const tYaw = animTargetRef.current.targetYaw;
        const tPitch = animTargetRef.current.targetPitch;
        orbitRef.current.yaw += (tYaw - orbitRef.current.yaw) * 0.15;
        orbitRef.current.pitch += (tPitch - orbitRef.current.pitch) * 0.15;

        if (
          Math.abs(tYaw - orbitRef.current.yaw) < 0.001 &&
          Math.abs(tPitch - orbitRef.current.pitch) < 0.001
        ) {
          orbitRef.current.yaw = tYaw;
          orbitRef.current.pitch = tPitch;
          animTargetRef.current.animating = false;
        }
        setCameraOrbit({ ...orbitRef.current });
      } else if (!dragRef.current.isDragging) {
        // Inertial damping
        if (
          Math.abs(velocityRef.current.yawVel) > 0.00005 ||
          Math.abs(velocityRef.current.pitchVel) > 0.00005
        ) {
          orbitRef.current.yaw += velocityRef.current.yawVel;
          orbitRef.current.pitch = Math.max(
            -1.48,
            Math.min(1.48, orbitRef.current.pitch + velocityRef.current.pitchVel)
          );
          velocityRef.current.yawVel *= 0.92;
          velocityRef.current.pitchVel *= 0.92;
          setCameraOrbit({ ...orbitRef.current });
        }
      }

      const yaw = orbitRef.current.yaw;
      const pitch = orbitRef.current.pitch;
      const dist = orbitRef.current.distance;

      // Camera orientation basis vectors
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);

      const camX = dist * cosP * sinY;
      const camY = dist * sinP;
      const camZ = dist * cosP * cosY;

      const fwd = { x: -camX / dist, y: -camY / dist, z: -camZ / dist };
      let right = { x: -fwd.z, y: 0, z: fwd.x };
      const rLen = Math.hypot(right.x, right.z) || 1;
      right.x /= rLen;
      right.z /= rLen;

      const up = {
        x: right.y * fwd.z - right.z * fwd.y,
        y: right.z * fwd.x - right.x * fwd.z,
        z: right.x * fwd.y - right.y * fwd.x
      };

      // 1. CLEAR VIEWPORT
      const isWire = shadingModeRef.current === 'wireframe';
      const isSolid = shadingModeRef.current === 'solid';
      ctx.fillStyle = isWire ? '#030712' : isSolid ? '#090d16' : '#020617';
      ctx.fillRect(0, 0, width, height);

      // Deep Space background gradient in rendered & material modes
      if (!isWire && !isSolid) {
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
      }

      // Camera target center (with Pan Offset)
      const cx = width / 2 + panRef.current.x;
      const cy = height / 2 + panRef.current.y;
      const fov = isOrthoRef.current ? 800 : 500;

      // Physical scale
      const sphereRadius = calculate3DViewerSphereRadius(
        body,
        width,
        height,
        dist,
        scaleModeRef.current
      );

      const isBlackHole = body.remnantType === 'black_hole' || body.planetKey === 'black_hole';
      const isPulsar = body.remnantType === 'pulsar' || body.planetKey === 'pulsar';
      const planetKey = (
        isBlackHole
          ? 'black_hole'
          : isPulsar
          ? 'pulsar'
          : body.planetKey || 'generic_star'
      ) as PlanetKey;
      const isStar = (planetKey === 'sun' || planetKey === 'generic_star') && !isBlackHole && !isPulsar;

      // 2. 3D BACKGROUND STARFIELD (Oriented with camera, lensed around black holes)
      if (!isWire && !isSolid) {
        const stars = starsRef.current;
        ctx.save();
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          const sx = s.x * right.x + s.y * right.y + s.z * right.z;
          const sy = s.x * up.x + s.y * up.y + s.z * up.z;
          const sz = s.x * fwd.x + s.y * fwd.y + s.z * fwd.z;

          if (sz > 0.05) {
            let px = cx + (sx / sz) * fov;
            let py = cy - (sy / sz) * fov;

            let isLensed = false;
            let shearFactor = 1.0;
            if (isBlackHole) {
              const lens = calculateEinsteinLensing(px - cx, py - cy, sphereRadius * 1.15);
              if (lens.insideShadow) continue;
              px = cx + lens.x;
              py = cy + lens.y;
              shearFactor = lens.factor;
              isLensed = true;
            }

            if (px >= 0 && px <= width && py >= 0 && py <= height) {
              const twinkle = 0.7 + 0.3 * Math.sin(localTime * 2.5 + s.twinkleOffset);
              ctx.fillStyle = isLensed && shearFactor > 1.8 ? '#e0f2fe' : s.color;
              ctx.globalAlpha = Math.min(
                1.0,
                Math.max(0.2, sz * twinkle * (isLensed ? Math.min(2.0, shearFactor) : 1.0))
              );
              ctx.beginPath();
              ctx.arc(px, py, s.size * (sz > 0.7 ? 1.1 : 0.8), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        ctx.restore();
      }

      // 3. PHYSICAL SOLAR SYSTEM LIGHT VECTOR CALCULATION
      // Find the primary star in the solar system
      const primaryStar =
        allBodies.find(
          b =>
            b.planetKey === 'sun' ||
            b.planetKey === 'generic_star' ||
            b.name.toLowerCase().includes('солнце') ||
            b.name.toLowerCase().includes('sun')
        ) || (allBodies.length > 0 ? allBodies[0] : null);

      const isViewedBodySun =
        body.id === primaryStar?.id || body.planetKey === 'sun' || planetKey === 'sun';

      // Vector from planet to Sun in the solar system orbital plane
      const toSunX = primaryStar ? primaryStar.x - body.x : 1000;
      const toSunZ = primaryStar ? primaryStar.y - body.y : 0;
      const sunDistReal = Math.hypot(toSunX, toSunZ) || 1;

      // World light direction
      let worldLightDir = { x: 1, y: 0.05, z: 0 };
      if (useRealSunRef.current && !isViewedBodySun) {
        worldLightDir = {
          x: toSunX / sunDistReal,
          y: 0.04,
          z: toSunZ / sunDistReal
        };
      } else {
        const sunRad = (sunAngleRef.current * Math.PI) / 180;
        worldLightDir = {
          x: Math.cos(sunRad),
          y: 0.25,
          z: Math.sin(sunRad)
        };
      }
      const wlLen =
        Math.hypot(worldLightDir.x, worldLightDir.y, worldLightDir.z) || 1;
      worldLightDir.x /= wlLen;
      worldLightDir.y /= wlLen;
      worldLightDir.z /= wlLen;

      // Transform world light vector into camera screen space:
      // lx = worldLight . right
      // ly = worldLight . up
      // lz = worldLight . (-fwd)  (positive towards camera, illuminated face)
      let lightDirCam = {
        x:
          worldLightDir.x * right.x +
          worldLightDir.y * right.y +
          worldLightDir.z * right.z,
        y:
          worldLightDir.x * up.x +
          worldLightDir.y * up.y +
          worldLightDir.z * up.z,
        z:
          worldLightDir.x * (-fwd.x) +
          worldLightDir.y * (-fwd.y) +
          worldLightDir.z * (-fwd.z)
      };
      const lLen =
        Math.hypot(lightDirCam.x, lightDirCam.y, lightDirCam.z) || 1;
      lightDirCam.x /= lLen;
      lightDirCam.y /= lLen;
      lightDirCam.z /= lLen;

      // ----------------------------------------------------------------------
      // 3.5. SOLAR SYSTEM BACKGROUND: ORBITS, DISTANT SUN & PLANETS IN 3D SKY
      // ----------------------------------------------------------------------
      let sunScreenPos: { x: number; y: number } | null = null;
      clickablePlanetsRef.current = [];

      if (!isWire && !isSolid) {
        // A. Keplerian Planetary Orbits in 3D Perspective
        if (showOrbitsRef.current && primaryStar) {
          ctx.save();
          // Sun center in world coordinates relative to inspected body
          const sunRelX = primaryStar.x - body.x;
          const sunRelZ = primaryStar.y - body.y;

          for (let bIdx = 0; bIdx < sortedPlanets.length; bIdx++) {
            const ob = sortedPlanets[bIdx];
            if (ob.id === primaryStar.id || ob.parentBodyId) continue;

            const orbR = Math.hypot(ob.x - primaryStar.x, ob.y - primaryStar.y);
            if (orbR < 25) continue;

            const isCurrentPlanetOrbit = ob.id === body.id;
            ctx.strokeStyle = isCurrentPlanetOrbit
              ? 'rgba(56, 189, 248, 0.45)'
              : 'rgba(148, 163, 184, 0.20)';
            ctx.lineWidth = isCurrentPlanetOrbit ? 1.5 : 1.0;

            ctx.beginPath();
            let firstPoint = true;
            const segments = 72;

            for (let seg = 0; seg <= segments; seg++) {
              const th = (seg / segments) * Math.PI * 2;
              const ptWorldX = sunRelX + Math.cos(th) * orbR;
              const ptWorldY = 0;
              const ptWorldZ = sunRelZ + Math.sin(th) * orbR;

              const Px = ptWorldX * right.x + ptWorldY * right.y + ptWorldZ * right.z;
              const Py = ptWorldX * up.x + ptWorldY * up.y + ptWorldZ * up.z;
              const Pz = ptWorldX * fwd.x + ptWorldY * fwd.y + ptWorldZ * fwd.z;

              if (Pz > 0.08) {
                const scrX = cx + (Px / Pz) * fov;
                const scrY = cy - (Py / Pz) * fov;
                if (firstPoint) {
                  ctx.moveTo(scrX, scrY);
                  firstPoint = false;
                } else {
                  ctx.lineTo(scrX, scrY);
                }
              } else {
                firstPoint = true;
              }
            }
            ctx.stroke();
          }
          ctx.restore();
        }

        // B. Distant Sun in 3D Sky (Illuminating the whole solar system)
        if (!isViewedBodySun) {
          const Sx =
            worldLightDir.x * right.x +
            worldLightDir.y * right.y +
            worldLightDir.z * right.z;
          const Sy =
            worldLightDir.x * up.x +
            worldLightDir.y * up.y +
            worldLightDir.z * up.z;
          const Sz =
            worldLightDir.x * fwd.x +
            worldLightDir.y * fwd.y +
            worldLightDir.z * fwd.z;

          if (Sz > 0.05) {
            const sunScrX = cx + (Sx / Sz) * fov;
            const sunScrY = cy - (Sy / Sz) * fov;
            const distFromCenter = Math.hypot(sunScrX - cx, sunScrY - cy);
            sunScreenPos = { x: sunScrX, y: sunScrY };

            // Render when not fully occluded by planet sphere
            if (
              distFromCenter > sphereRadius * 0.95 &&
              sunScrX >= -300 &&
              sunScrX <= width + 300 &&
              sunScrY >= -300 &&
              sunScrY <= height + 300
            ) {
              ctx.save();
              ctx.globalCompositeOperation = 'screen';

              const auDist = Math.max(0.3, sunDistReal / 1000);
              const sunDiscR = Math.max(6, Math.min(26, 16 / Math.sqrt(auDist)));
              const sunHaloR = sunDiscR * 8.5;

              // Radiant golden-white corona halo
              const sGrad = ctx.createRadialGradient(
                sunScrX,
                sunScrY,
                sunDiscR * 0.2,
                sunScrX,
                sunScrY,
                sunHaloR
              );
              sGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
              sGrad.addColorStop(0.12, 'rgba(254, 240, 138, 0.95)');
              sGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.50)');
              sGrad.addColorStop(0.70, 'rgba(234, 88, 12, 0.18)');
              sGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

              ctx.fillStyle = sGrad;
              ctx.beginPath();
              ctx.arc(sunScrX, sunScrY, sunHaloR, 0, Math.PI * 2);
              ctx.fill();

              // Anamorphic horizontal lens flare ray across the viewport
              const flareGrad = ctx.createLinearGradient(
                sunScrX - 320,
                sunScrY,
                sunScrX + 320,
                sunScrY
              );
              flareGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
              flareGrad.addColorStop(0.5, 'rgba(254, 215, 170, 0.7)');
              flareGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
              ctx.fillStyle = flareGrad;
              ctx.fillRect(sunScrX - 320, sunScrY - 2, 640, 4);

              // 4-point camera diffraction spikes
              ctx.strokeStyle = 'rgba(254, 240, 138, 0.55)';
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(sunScrX, sunScrY - sunHaloR * 0.75);
              ctx.lineTo(sunScrX, sunScrY + sunHaloR * 0.75);
              ctx.moveTo(sunScrX - sunHaloR * 0.75, sunScrY);
              ctx.lineTo(sunScrX + sunHaloR * 0.75, sunScrY);
              ctx.stroke();

              // Core incandescent disc
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(sunScrX, sunScrY, sunDiscR, 0, Math.PI * 2);
              ctx.fill();

              // Subtle Sun label with AU distance
              if (showOverlaysRef.current && primaryStar) {
                ctx.restore();
                ctx.save();
                ctx.fillStyle = 'rgba(254, 240, 138, 0.95)';
                ctx.font = 'bold 11px monospace';
                ctx.fillText('☀️ Солнце (Центр)', sunScrX + sunDiscR + 8, sunScrY + 4);
                clickablePlanetsRef.current.push({
                  body: primaryStar,
                  x: sunScrX,
                  y: sunScrY,
                  radius: Math.max(24, sunDiscR * 1.5)
                });
              } else {
                ctx.restore();
              }
            }
          }
        }

        // C. ALL Planets of the Solar System in Correct Astronomical Order
        for (let bIdx = 0; bIdx < sortedPlanets.length; bIdx++) {
          const otherBody = sortedPlanets[bIdx];
          if (otherBody.id === body.id) continue;
          if (isViewedBodySun && otherBody.id === primaryStar?.id) continue;
          if (!isViewedBodySun && otherBody.id === primaryStar?.id) continue;

          // Planetary position relative to current camera target
          const relX = otherBody.x - body.x;
          const relZ = otherBody.y - body.y;
          const relDist = Math.hypot(relX, relZ);
          if (relDist < 0.1) continue;

          const dirX = relX / relDist;
          const dirZ = relZ / relDist;

          const Px = dirX * right.x + dirZ * right.z;
          const Py = dirX * up.x + dirZ * up.z;
          const Pz = dirX * fwd.x + dirZ * fwd.z;

          if (Pz > 0.05) {
            const bScrX = cx + (Px / Pz) * fov;
            const bScrY = cy - (Py / Pz) * fov;
            const distFromCenter = Math.hypot(bScrX - cx, bScrY - cy);

            if (
              distFromCenter > sphereRadius * 1.05 &&
              bScrX >= 25 &&
              bScrX <= width - 25 &&
              bScrY >= 25 &&
              bScrY <= height - 25
            ) {
              ctx.save();
              const pKey = otherBody.planetKey || '';
              const orderNum = SOLAR_ORDER[pKey] !== undefined ? SOLAR_ORDER[pKey] : bIdx;
              const pSymbol = PLANET_SYMBOLS[pKey] || '🪐';
              const pCol =
                PLANET_PALETTE[pKey] ||
                otherBody.atmosphereColor ||
                otherBody.ringColor ||
                '#94a3b8';

              // Register interactive hit region for click-to-focus
              clickablePlanetsRef.current.push({
                body: otherBody,
                x: bScrX,
                y: bScrY,
                radius: 22
              });

              // Subtle glowing halo
              const pGrad = ctx.createRadialGradient(bScrX, bScrY, 0, bScrX, bScrY, 14);
              pGrad.addColorStop(0, pCol);
              pGrad.addColorStop(0.4, pCol);
              pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = pGrad;
              ctx.beginPath();
              ctx.arc(bScrX, bScrY, 14, 0, Math.PI * 2);
              ctx.fill();

              // Core brilliant planetary body
              ctx.fillStyle = pCol;
              ctx.beginPath();
              ctx.arc(bScrX, bScrY, 3.5, 0, Math.PI * 2);
              ctx.fill();

              // Bright center point
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(bScrX, bScrY, 1.6, 0, Math.PI * 2);
              ctx.fill();

              // Miniature 3D ring for Saturn / Uranus
              if (otherBody.hasRings) {
                ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
                ctx.lineWidth = 1.0;
                ctx.beginPath();
                ctx.ellipse(bScrX, bScrY, 7.5, 2.5, 0.45, 0, Math.PI * 2);
                ctx.stroke();
              }

              // Prominent label with astronomical order & name
              if (showOverlaysRef.current) {
                const auVal = ASTRONOMICAL_AU[pKey];
                const auText = auVal !== undefined ? ` (${auVal.toFixed(1)} AU)` : '';

                // Background pill for crisp text readability
                const labelText = `${orderNum > 0 ? `${orderNum}. ` : ''}${pSymbol} ${otherBody.name}${auText}`;
                ctx.font = '500 11px monospace';
                const textWidth = ctx.measureText(labelText).width;

                ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
                ctx.fillRect(bScrX + 8, bScrY - 11, textWidth + 8, 16);
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
                ctx.lineWidth = 1;
                ctx.strokeRect(bScrX + 8, bScrY - 11, textWidth + 8, 16);

                ctx.fillStyle = '#f8fafc';
                ctx.fillText(labelText, bScrX + 12, bScrY + 1);
              }
              ctx.restore();
            }
          }
        }
      }

      // 4. BACKGROUND RINGS (For Saturn & Uranus)
      if (body.hasRings && shadingModeRef.current !== 'wireframe') {
        render3DRingsWithShadows(
          ctx,
          cx,
          cy,
          sphereRadius,
          pitch,
          yaw,
          false,
          body.ringColor || '#fef08a',
          lightDirCam
        );
      }

      // 5. RENDER CELESTIAL BODY SPHERE (RAYTRACED ACCORDING TO SHADING MODE)
      if (isBlackHole) {
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
      } else if (isStar && (shadingModeRef.current === 'rendered' || shadingModeRef.current === 'material')) {
        // High-Fidelity 3D Magical Sun with micro-scale granulation, heat haze, and flares
        render3DMagicalSun(ctx, {
          cx,
          cy,
          radius: sphereRadius,
          yaw,
          pitch,
          time: localTime,
          Teff: body.Teff,
          name: body.name,
          mass: body.mass,
          isSun: planetKey === 'sun'
        });
      } else {
        renderPhotorealisticCelestialBody(ctx, {
          cx,
          cy,
          radius: sphereRadius,
          yaw,
          pitch,
          time: localTime,
          lightDir: lightDirCam,
          planetKey,
          body,
          shadingMode: shadingModeRef.current,
          isOrthographic: isOrthoRef.current
        });
      }

      // 6. FOREGROUND RINGS (For Saturn & Uranus)
      if (body.hasRings && shadingModeRef.current !== 'wireframe') {
        render3DRingsWithShadows(
          ctx,
          cx,
          cy,
          sphereRadius,
          pitch,
          yaw,
          true,
          body.ringColor || '#fef08a',
          lightDirCam
        );
      }

      // 7. ATMOSPHERIC ECLIPSE / DIAMOND-RING REFRACTION GLINT
      if (sunScreenPos && !isViewedBodySun && !isWire && !isSolid) {
        const dLimb = Math.hypot(sunScreenPos.x - cx, sunScreenPos.y - cy);
        if (dLimb <= sphereRadius * 1.06 && dLimb >= sphereRadius * 0.90) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const glintGrad = ctx.createRadialGradient(
            sunScreenPos.x,
            sunScreenPos.y,
            0,
            sunScreenPos.x,
            sunScreenPos.y,
            sphereRadius * 0.45
          );
          glintGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          glintGrad.addColorStop(0.2, 'rgba(254, 240, 138, 0.8)');
          glintGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.3)');
          glintGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glintGrad;
          ctx.beginPath();
          ctx.arc(sunScreenPos.x, sunScreenPos.y, sphereRadius * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 8. INTERACTIVE 3D ORIENTATION GIZMO (Blender Navigation Axis Triad)
      if (showOverlaysRef.current) {
        renderBlenderOrientationGizmo(ctx, width - 68, 76, 38, yaw, pitch);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    body,
    isRotating,
    rotationSpeed,
    globalPaused,
    scaleMode,
    shadingMode,
    showOverlays,
    sunAngle,
    isOrthographic,
    useRealSunPosition,
    showOrbits,
    allBodies
  ]);

  // Handle Resize
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

  // --------------------------------------------------------------------------
  // Mouse & Touch Interaction (Direction-following rotation)
  // --------------------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check if clicked inside the 3D Orientation Gizmo in the top-right corner
    const gizmoX = canvas.width - 68;
    const gizmoY = 76;
    const distToGizmo = Math.hypot(mx - gizmoX, my - gizmoY);

    if (distToGizmo <= 42) {
      const clickedAxis = getClickedGizmoAxis(
        mx - gizmoX,
        my - gizmoY,
        orbitRef.current.yaw,
        orbitRef.current.pitch,
        38
      );
      if (clickedAxis) {
        switch (clickedAxis) {
          case '+Y': snapToView(0, 0); break; // Front
          case '-Y': snapToView(Math.PI, 0); break; // Back
          case '+X': snapToView(Math.PI * 0.5, 0); break; // Right
          case '-X': snapToView(-Math.PI * 0.5, 0); break; // Left
          case '+Z': snapToView(0, -Math.PI * 0.5 + 0.001); break; // Top
          case '-Z': snapToView(0, Math.PI * 0.5 - 0.001); break; // Bottom
        }
        return;
      }
      dragRef.current = {
        isDragging: true,
        dragType: 'orbit',
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        button: e.button
      };
      return;
    }

    let dragType: 'orbit' | 'pan' | 'zoom' = activeNavTool;
    if (e.shiftKey || (e.button === 1 && e.shiftKey)) {
      dragType = 'pan';
    } else if (e.ctrlKey) {
      dragType = 'zoom';
    } else if (e.button === 1 || e.button === 0) {
      dragType = activeNavTool;
    }

    dragRef.current = {
      isDragging: true,
      dragType,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      button: e.button
    };
    velocityRef.current = { yawVel: 0, pitchVel: 0 };
    animTargetRef.current.animating = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.isDragging) return;

    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;

    if (dragRef.current.dragType === 'pan') {
      setPanOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
    } else if (dragRef.current.dragType === 'zoom') {
      const zoomDelta = 1 - dy * 0.008;
      setCameraOrbit(prev => ({
        ...prev,
        distance: Math.max(1.15, Math.min(8.0, prev.distance * zoomDelta))
      }));
    } else {
      // Direct drag rotation:
      // Moving mouse RIGHT (dx > 0) -> rotates object RIGHT
      // Moving mouse DOWN (dy > 0) -> rotates object DOWN
      const rotSpeed = 0.007;
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
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current.isDragging) {
      const distMoved = Math.hypot(
        e.clientX - dragRef.current.startX,
        e.clientY - dragRef.current.startY
      );
      // Clean click (not a drag)
      if (distMoved < 6 && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Check if user clicked any celestial beacon in the 3D sky
        const clicked = clickablePlanetsRef.current.find(cp => {
          return Math.hypot(cp.x - clickX, cp.y - clickY) <= cp.radius;
        });

        if (clicked && clicked.body.id !== body.id) {
          onSelectBody(clicked.body);
        }
      }
    }
    dragRef.current.isDragging = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      dragRef.current = {
        isDragging: true,
        dragType: activeNavTool,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        lastX: e.touches[0].clientX,
        lastY: e.touches[0].clientY,
        button: 0
      };
      velocityRef.current = { yawVel: 0, pitchVel: 0 };
      animTargetRef.current.animating = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragRef.current.lastX;
    const dy = e.touches[0].clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.touches[0].clientX;
    dragRef.current.lastY = e.touches[0].clientY;

    if (dragRef.current.dragType === 'pan') {
      setPanOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
    } else {
      const rotSpeed = 0.007;
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
    }
  };

  const handleTouchEnd = () => {
    dragRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.92 : 1.08;
    setCameraOrbit(prev => ({
      ...prev,
      distance: Math.max(1.15, Math.min(8.0, prev.distance * zoomFactor))
    }));
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950 font-sans">
      {/* 3D Viewport Canvas */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${
          activeNavTool === 'pan'
            ? 'cursor-move'
            : activeNavTool === 'zoom'
            ? 'cursor-ns-resize'
            : 'cursor-grab active:cursor-grabbing'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onContextMenu={e => e.preventDefault()}
      />

      {/* -------------------------------------------------------------------- */}
      {/* Top Header Bar (Planet Badge, Shading Modes, Controls) */}
      {/* -------------------------------------------------------------------- */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Identification & Planet Switcher */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-3 border border-cyan-500/30 shadow-2xl backdrop-blur-xl">
            <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-500/50" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  {body.name}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono">
                  {formatRadiusKm(body)}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-mono">
                  {getRadiusRatioToEarth(body).toFixed(2)} R⊕
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate">
                {body.customDescription || 'Астрономический объект Солнечной системы'}
              </p>
            </div>
          </div>

          {/* Quick cycle buttons */}
          <div className="glass-panel p-1 rounded-2xl flex items-center gap-1 border border-slate-700/60 backdrop-blur-xl">
            <button
              onClick={handlePrevBody}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Предыдущее тело [←]"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-1">
              {currentPlanetIdx + 1} / {sortedPlanets.length}
            </span>
            <button
              onClick={handleNextBody}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Следующее тело [→]"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Center: Blender Viewport Shading Modes Header */}
        <div className="pointer-events-auto hidden md:flex items-center gap-1 glass-panel p-1 rounded-2xl border border-slate-700/60 shadow-2xl backdrop-blur-xl">
          <button
            onClick={() => setShadingMode('wireframe')}
            className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono transition ${
              shadingMode === 'wireframe'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Сетка UV-сферы (Wireframe) [Z]"
          >
            <Box size={14} />
            <span>Сетка</span>
          </button>
          <button
            onClick={() => setShadingMode('solid')}
            className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono transition ${
              shadingMode === 'solid'
                ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Студийная глина (Solid MatCap) [Z]"
          >
            <Circle size={14} />
            <span>Глина</span>
          </button>
          <button
            onClick={() => setShadingMode('material')}
            className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono transition ${
              shadingMode === 'material'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Просмотр текстур без теней (Material Preview) [Z]"
          >
            <Eye size={14} />
            <span>Текстуры</span>
          </button>
          <button
            onClick={() => setShadingMode('rendered')}
            className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono transition ${
              shadingMode === 'rendered'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Фотореалистичный физический рендер с солнцем и терминатором (Rendered) [Z]"
          >
            <Sun size={14} />
            <span>Рендер</span>
          </button>
        </div>

        {/* Right: Exit, Frame, Scale & Overlays */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Real scale vs Focus scale toggle */}
          <button
            onClick={() => setScaleMode(prev => (prev === 'real' ? 'focus' : 'real'))}
            className={`glass-panel px-3 py-2 rounded-2xl flex items-center gap-1.5 text-xs transition border ${
              scaleMode === 'real'
                ? 'border-emerald-500/60 text-emerald-300 bg-emerald-950/50 shadow-lg shadow-emerald-950/50'
                : 'border-amber-500/60 text-amber-300 bg-amber-950/50'
            }`}
            title={
              scaleMode === 'real'
                ? 'Реальный масштаб 1:1 к Земле. Нажмите для автофокуса.'
                : 'Крупный план. Нажмите для 1:1 к Земле.'
            }
          >
            <Maximize2 size={14} />
            <span className="hidden lg:inline font-mono font-semibold">
              {scaleMode === 'real' ? '1:1 Размер' : 'Автофокус'}
            </span>
          </button>

          {/* Perspective / Orthographic toggle (Numpad 5) */}
          <button
            onClick={() => setIsOrthographic(prev => !prev)}
            className={`glass-panel px-3 py-2 rounded-2xl flex items-center gap-1.5 text-xs transition border ${
              isOrthographic
                ? 'border-indigo-500/60 text-indigo-300 bg-indigo-950/50'
                : 'border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Переключить проекцию: Перспектива / Ортография [5]"
          >
            <span className="font-mono text-[11px] font-bold">
              {isOrthographic ? 'Орто' : 'Персп'}
            </span>
          </button>

          {/* Overlays toggle */}
          <button
            onClick={() => setShowOverlays(prev => !prev)}
            className={`glass-panel p-2 rounded-2xl transition border ${
              showOverlays
                ? 'border-cyan-500/50 text-cyan-300 bg-cyan-950/40'
                : 'border-slate-700/60 text-slate-400 hover:text-white'
            }`}
            title="Вкл/Выкл оверлеи (гизмо ориентации, подсказки) [H]"
          >
            <Compass size={15} />
          </button>

          {/* Frame selected / Center camera (Numpad .) */}
          <button
            onClick={frameObject}
            className="glass-panel p-2 rounded-2xl text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 transition border border-slate-700/60"
            title="Центрировать объект [.] / [F]"
          >
            <Target size={15} />
          </button>

          {/* Exit 3D View */}
          <button
            onClick={onClose}
            className="glass-panel px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 shadow-xl transition"
            title="Вернуться к 2D орбитальной карте [ESC]"
          >
            <X size={15} />
            <span className="font-mono hidden sm:inline">В 2D космос</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Solar System Planetary Order Strip (Canonical Astronomical Sequence) */}
      {/* -------------------------------------------------------------------- */}
      <div className="absolute top-[4.5rem] left-16 right-4 z-20 pointer-events-auto flex items-center justify-start overflow-hidden">
        <div className="glass-panel px-3 py-1.5 rounded-2xl border border-slate-700/60 shadow-2xl backdrop-blur-xl flex items-center gap-1.5 overflow-x-auto max-w-full">
          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-cyan-400 shrink-0 pr-1.5 border-r border-slate-700/60">
            <Orbit size={13} />
            <span className="hidden sm:inline">Порядок:</span>
          </div>

          {sortedPlanets.map((p, idx) => {
            const isSelected = p.id === body.id || p.planetKey === body.planetKey;
            const pKey = p.planetKey || '';
            const symbol = PLANET_SYMBOLS[pKey] || '🪐';
            const paletteColor = PLANET_PALETTE[pKey] || p.atmosphereColor || '#94a3b8';
            const au = ASTRONOMICAL_AU[pKey];
            const orderNum = SOLAR_ORDER[pKey] !== undefined ? SOLAR_ORDER[pKey] : idx;

            return (
              <button
                key={p.id}
                onClick={() => onSelectBody(p)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono transition border shrink-0 ${
                  isSelected
                    ? 'bg-cyan-500/25 border-cyan-400 text-white shadow-md shadow-cyan-950/60 font-semibold'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
                title={`${orderNum > 0 ? `#${orderNum} ` : ''}${p.name} ${au !== undefined ? `(${au.toFixed(2)} AU)` : ''} — Нажмите для перехода в 3D`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm transition group-hover:scale-125"
                  style={{
                    backgroundColor: paletteColor,
                    boxShadow: isSelected ? `0 0 8px ${paletteColor}` : 'none'
                  }}
                />
                <span className="text-xs">{symbol}</span>
                <span className="text-[11px] whitespace-nowrap">
                  {orderNum > 0 ? `${orderNum}. ` : ''}
                  {p.name.split(' ')[0]}
                </span>
                {au !== undefined && (
                  <span className="text-[9px] text-slate-500 hidden xl:inline">
                    {au > 0 ? `${au.toFixed(1)}AU` : 'Центр'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Floating Blender Left Toolbar (Orbit, Pan, Zoom, Reset) */}
      {/* -------------------------------------------------------------------- */}
      <div className="absolute left-4 top-24 z-20 flex flex-col gap-1.5 pointer-events-auto glass-panel p-1.5 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-2xl">
        <button
          onClick={() => setActiveNavTool('orbit')}
          className={`p-2 rounded-xl transition ${
            activeNavTool === 'orbit'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Вращение камеры (Orbit) [ЛКМ / СКМ]"
        >
          <Compass size={16} />
        </button>
        <button
          onClick={() => setActiveNavTool('pan')}
          className={`p-2 rounded-xl transition ${
            activeNavTool === 'pan'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Панорамирование (Pan) [Shift + ЛКМ]"
        >
          <Move size={16} />
        </button>
        <button
          onClick={() => setActiveNavTool('zoom')}
          className={`p-2 rounded-xl transition ${
            activeNavTool === 'zoom'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Плавный зум (Zoom) [Колесико / Ctrl + ЛКМ]"
        >
          <ZoomIn size={16} />
        </button>
        <div className="w-full h-px bg-slate-800 my-1" />
        <button
          onClick={resetCamera}
          className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
          title="Сбросить угол и зум камеры"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Interactive Sun Light & Solar System View Controls (Bottom Right) */}
      {/* -------------------------------------------------------------------- */}
      {shadingMode === 'rendered' && (
        <div className="absolute bottom-20 right-4 z-20 pointer-events-auto glass-panel px-4 py-2.5 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-xl flex items-center gap-3 text-xs font-mono text-slate-300">
          <Sun size={15} className="text-amber-400" />
          {isViewedBodySun ? (
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-300 text-[11px]">
                ☀️ Источник света системы
              </span>
              <span className="text-[10px] text-amber-400/80 hidden sm:inline">
                Собственное излучение (360°)
              </span>
            </div>
          ) : (
            <>
              <button
                onClick={() => setUseRealSunPosition(prev => !prev)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition border ${
                  useRealSunPosition
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="Переключить между физическим положением Солнца в системе и ручным углом"
              >
                {useRealSunPosition ? '☀️ Солнце системы (Синхр.)' : 'Ручной угол'}
              </button>
              {!useRealSunPosition ? (
                <>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={sunAngle}
                    onChange={e => setSunAngle(Number(e.target.value))}
                    className="w-24 accent-amber-400 cursor-pointer"
                    title="Вращайте угол освещения Солнцем для осмотра терминатора дня/ночи"
                  />
                  <span className="w-9 text-right text-amber-300 font-bold">{sunAngle}°</span>
                </>
              ) : (
                <span className="text-[11px] text-amber-300/80 hidden sm:inline">Орбитальная привязка</span>
              )}
            </>
          )}
          <div className="w-px h-4 bg-slate-700/80 mx-0.5" />
          <button
            onClick={() => setShowOrbits(prev => !prev)}
            className={`p-1.5 rounded-xl transition border ${
              showOrbits
                ? 'border-cyan-500/50 text-cyan-300 bg-cyan-950/40'
                : 'border-slate-700/60 text-slate-500 hover:text-slate-300'
            }`}
            title="Показать / скрыть орбиты планет в 3D пространстве"
          >
            <Orbit size={14} />
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Bottom Blender Navigation Guide Tip */}
      {/* -------------------------------------------------------------------- */}
      {showOverlays && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none glass-panel px-4 py-2 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-xl flex items-center gap-4 text-xs font-mono text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="text-cyan-400 font-bold">ЛКМ / СКМ:</span>
            <span>Вращение</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            <span className="text-indigo-400 font-bold">Shift+ЛКМ:</span>
            <span>Панорама</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">Колесико:</span>
            <span>Зум</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span>[1] Спереди · [3] Сбоку · [7] Сверху · [.] Центр · [Z] Шейдинг</span>
          </span>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Planet Telemetry & Solar System Radar Card Overlay */}
      {/* -------------------------------------------------------------------- */}
      {showTelemetry && showOverlays && (
        <aside className="absolute bottom-20 left-4 z-20 glass-panel rounded-2xl p-3.5 w-76 border border-slate-700/60 shadow-2xl backdrop-blur-2xl text-xs font-mono text-slate-300 animate-fade-in pointer-events-auto">
          {/* Tabs: Radar vs Telemetry */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setInfoTab('radar')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                  infoTab === 'radar'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🪐 Радар системы
              </button>
              <button
                onClick={() => setInfoTab('telemetry')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                  infoTab === 'telemetry'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📊 Данные
              </button>
            </div>
            <span className="text-[10px] text-slate-400">ID: {body.id.slice(0, 8)}</span>
          </div>

          {infoTab === 'radar' ? (
            <SolarSystemRadarCanvas
              allBodies={allBodies}
              currentBody={body}
              cameraYaw={cameraOrbit.yaw}
              onSelectBody={onSelectBody}
            />
          ) : (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Масса:</span>
                <span className="text-slate-100 font-semibold">
                  {body.mass >= 0.01
                    ? `${body.mass.toFixed(3)} M☉`
                    : `${(body.mass * 333000).toFixed(1)} M⊕`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Реальный радиус:</span>
                <span className="text-emerald-400 font-semibold">{formatRadiusKm(body)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Размер к Земле:</span>
                <span className="text-cyan-300 font-semibold">
                  {getRadiusRatioToEarth(body).toFixed(3)} R⊕{' '}
                  {getRadiusRatioToEarth(body) < 0.99
                    ? `(1 : ${(1 / getRadiusRatioToEarth(body)).toFixed(2)})`
                    : getRadiusRatioToEarth(body) > 1.01
                    ? `(${getRadiusRatioToEarth(body).toFixed(1)}x)`
                    : '(1:1)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Температура:</span>
                <span className="text-amber-300 font-semibold">
                  {body.Teff} K ({Math.round(body.Teff - 273)}°C)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Режим шейдинга:</span>
                <span className="text-sky-300 font-semibold uppercase">{shadingMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Проекция:</span>
                <span className="text-indigo-300 font-semibold">
                  {isOrthographic ? 'Ортографическая' : 'Перспективная'}
                </span>
              </div>
            </div>
          )}

          {/* Quick Rotation Play/Pause */}
          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setIsRotating(prev => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              {isRotating ? (
                <Pause size={12} className="text-amber-400" />
              ) : (
                <Play size={12} className="text-emerald-400" />
              )}
              <span>{isRotating ? 'Остановить' : 'Вращать'}</span>
            </button>

            <span className="text-[10px] text-slate-500">
              Зум: {((1 / cameraOrbit.distance) * 2.6).toFixed(1)}x
            </span>
          </div>
        </aside>
      )}
    </div>
  );
};

// ============================================================================
// SOLAR SYSTEM INTERACTIVE RADAR (TOP-DOWN REAL-TIME ASTRONOMICAL MAP)
// ============================================================================

const SolarSystemRadarCanvas: React.FC<{
  allBodies: CelestialBody[];
  currentBody: CelestialBody;
  cameraYaw: number;
  onSelectBody: (body: CelestialBody) => void;
}> = ({ allBodies, currentBody, cameraYaw, onSelectBody }) => {
  const radarRef = useRef<HTMLCanvasElement | null>(null);

  const primaryStar = React.useMemo(() => {
    return (
      allBodies.find(
        b =>
          b.planetKey === 'sun' ||
          b.planetKey === 'generic_star' ||
          b.name.toLowerCase().includes('солнце') ||
          b.name.toLowerCase().includes('sun')
      ) || (allBodies.length > 0 ? allBodies[0] : null)
    );
  }, [allBodies]);

  const planets = React.useMemo(() => {
    return allBodies
      .filter(b => !b.parentBodyId && b.id !== primaryStar?.id)
      .sort((a, b) => {
        const ordA = SOLAR_ORDER[a.planetKey || ''] ?? 99;
        const ordB = SOLAR_ORDER[b.planetKey || ''] ?? 99;
        return ordA - ordB;
      });
  }, [allBodies, primaryStar]);

  const radarHitsRef = useRef<Array<{ body: CelestialBody; x: number; y: number; r: number }>>([]);

  useEffect(() => {
    const canvas = radarRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    radarHitsRef.current = [];

    // Subtle dark circular background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Grid circles
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    [25, 45, 65, 85].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.beginPath();
    ctx.moveTo(cx - 90, cy);
    ctx.lineTo(cx + 90, cy);
    ctx.moveTo(cx, cy - 65);
    ctx.lineTo(cx, cy + 65);
    ctx.stroke();

    // Scale distances so Mercury to Neptune fit nicely in radar bounds
    const maxRealDist = 1050;
    const getRadarRadius = (dist: number) => {
      return 14 + Math.pow(Math.max(10, dist) / maxRealDist, 0.55) * 60;
    };

    // Draw orbits
    planets.forEach(p => {
      const realD = primaryStar ? Math.hypot(p.x - primaryStar.x, p.y - primaryStar.y) : p.x;
      const rRadar = getRadarRadius(realD);
      const isCurrent = p.id === currentBody.id;

      ctx.beginPath();
      ctx.arc(cx, cy, rRadar, 0, Math.PI * 2);
      ctx.strokeStyle = isCurrent ? 'rgba(56, 189, 248, 0.45)' : 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = isCurrent ? 1.5 : 0.8;
      ctx.stroke();
    });

    // Draw Sun at center
    ctx.save();
    const sunGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 9);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.3, '#fde047');
    sunGrad.addColorStop(0.7, '#f59e0b');
    sunGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();

    if (primaryStar) {
      radarHitsRef.current.push({ body: primaryStar, x: cx, y: cy, r: 12 });
      if (currentBody.id === primaryStar.id) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Draw planets
    planets.forEach((p, idx) => {
      const pKey = p.planetKey || '';
      const orderNum = SOLAR_ORDER[pKey] ?? (idx + 1);
      const col = PLANET_PALETTE[pKey] || p.atmosphereColor || '#94a3b8';
      const realX = primaryStar ? p.x - primaryStar.x : p.x;
      const realY = primaryStar ? p.y - primaryStar.y : p.y;
      const realD = Math.hypot(realX, realY) || 1;
      const angle = Math.atan2(realY, realX);

      const rRadar = getRadarRadius(realD);
      const px = cx + Math.cos(angle) * rRadar;
      const py = cy + Math.sin(angle) * rRadar;

      const isCurrent = p.id === currentBody.id;

      radarHitsRef.current.push({ body: p, x: px, y: py, r: 10 });

      // If current body, draw targeting reticle and camera line of sight cone
      if (isCurrent) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 6.5, 0, Math.PI * 2);
        ctx.stroke();

        // Camera viewing cone
        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.beginPath();
        ctx.moveTo(px, py);
        const fovHalf = 0.45;
        ctx.arc(px, py, 20, cameraYaw - fovHalf, cameraYaw + fovHalf);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Planet dot
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(px, py, isCurrent ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Number badge
      ctx.fillStyle = isCurrent ? '#38bdf8' : 'rgba(203, 213, 225, 0.7)';
      ctx.font = '8px monospace';
      ctx.fillText(String(orderNum), px + 4, py - 3);
    });
  }, [allBodies, currentBody, cameraYaw, primaryStar, planets]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = radarRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const hit = radarHitsRef.current.find(h => Math.hypot(h.x - mx, h.y - my) <= h.r);
    if (hit) {
      onSelectBody(hit.body);
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={radarRef}
        width={256}
        height={140}
        onClick={handleClick}
        className="w-full rounded-xl cursor-pointer block border border-slate-800"
        title="Интерактивный радар Солнечной системы. Кликните по любой планете!"
      />
      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 px-1">
        <span>Клик по планете — переход</span>
        <span className="text-cyan-400">1..9 по порядку</span>
      </div>
    </div>
  );
};

// ============================================================================
// BLENDER VIEWPORT HELPERS (3D ORIENTATION GIZMO)
// ============================================================================

/**
 * Renders Blender's iconic 3D Orientation Gizmo (XYZ Axis Triad with clickable bubbles)
 */
function renderBlenderOrientationGizmo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  yaw: number,
  pitch: number
) {
  ctx.save();
  ctx.translate(cx, cy);

  // Background glass circle
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, size + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);

  // Project 3D vector to gizmo screen space matching sphere forward rotation:
  // 1. Rotate yaw (Y)
  // 2. Rotate pitch (X)
  const projectVec = (vx: number, vy: number, vz: number) => {
    const x1 = vx * cosY + vz * sinY;
    const y1 = vy;
    const z1 = -vx * sinY + vz * cosY;

    const x2 = x1;
    const y2 = y1 * cosP - z1 * sinP;
    const z2 = y1 * sinP + z1 * cosP;

    return { x: x2 * size, y: -y2 * size, z: z2 };
  };

  // 6 canonical axes
  const axes = [
    { name: '+X', col: '#ef4444', pt: projectVec(1, 0, 0) },
    { name: '-X', col: '#b91c1c', pt: projectVec(-1, 0, 0), neg: true },
    { name: '+Y', col: '#22c55e', pt: projectVec(0, 0, 1) },
    { name: '-Y', col: '#15803d', pt: projectVec(0, 0, -1), neg: true },
    { name: '+Z', col: '#3b82f6', pt: projectVec(0, 1, 0) },
    { name: '-Z', col: '#1d4ed8', pt: projectVec(0, -1, 0), neg: true }
  ];

  // Sort axes by depth (Z)
  axes.sort((a, b) => a.pt.z - b.pt.z);

  for (const ax of axes) {
    if (ax.neg) {
      // Negative axis: subtle ring dot
      ctx.fillStyle = ax.col;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(ax.pt.x, ax.pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Positive axis: Line from origin + labeled circle
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = ax.col;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ax.pt.x, ax.pt.y);
      ctx.stroke();

      ctx.fillStyle = ax.col;
      ctx.beginPath();
      ctx.arc(ax.pt.x, ax.pt.y, 8.5, 0, Math.PI * 2);
      ctx.fill();

      // Axis label text (X, Y, Z)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ax.name[1], ax.pt.x, ax.pt.y);
    }
  }

  ctx.restore();
}

/**
 * Checks if the click in Gizmo coordinate space hit any axis bubble
 */
function getClickedGizmoAxis(
  gx: number,
  gy: number,
  yaw: number,
  pitch: number,
  size: number
): string | null {
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);

  const projectVec = (vx: number, vy: number, vz: number) => {
    const x1 = vx * cosY + vz * sinY;
    const y1 = vy;
    const z1 = -vx * sinY + vz * cosY;
    const x2 = x1;
    const y2 = y1 * cosP - z1 * sinP;
    return { x: x2 * size, y: -y2 * size };
  };

  const axes = [
    { name: '+X', pt: projectVec(1, 0, 0) },
    { name: '-X', pt: projectVec(-1, 0, 0) },
    { name: '+Y', pt: projectVec(0, 0, 1) },
    { name: '-Y', pt: projectVec(0, 0, -1) },
    { name: '+Z', pt: projectVec(0, 1, 0) },
    { name: '-Z', pt: projectVec(0, -1, 0) }
  ];

  for (const ax of axes) {
    if (Math.hypot(gx - ax.pt.x, gy - ax.pt.y) <= 12) {
      return ax.name;
    }
  }
  return null;
}
