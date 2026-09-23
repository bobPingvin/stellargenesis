/**
 * Canvas Viewport Component
 * Infinite procedurally-generated cosmos with frustum culling,
 * interactive object moving/dragging, tidal disruption spaghettification,
 * and relativistic Doppler shift rendering.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CelestialBody, Particle, CameraState, ToolType, SimulationSettings, NebulaConfig } from '../types';
import {
  SPECTRAL_DATA,
  getSpectralClass,
  stepPhysics,
  createBody,
  createParticle,
  applyDopplerToColor,
  computeDopplerFromVx,
  SPEED_OF_LIGHT
} from '../physics/engine';
import { renderProceduralCosmos, SECTOR_SIZE } from '../physics/proceduralUniverse';
import { renderSpacetimeFabric, GLOBAL_ACCRETION_POOL } from '../physics/gravitationalLensing';
import { GravitationalLensingShader, BlackHoleScreenData } from '../physics/screenSpaceLensingShader';
import { sound } from '../physics/audio';
import {
  Crosshair,
  Zap,
  Flame,
  Trash2,
  Play,
  Pause,
  Sparkles,
  CircleDot,
  CloudDrizzle,
  Compass,
  Move,
  X,
  Target
} from 'lucide-react';

interface CanvasViewportProps {
  bodies: CelestialBody[];
  setBodies: React.Dispatch<React.SetStateAction<CelestialBody[]>>;
  particles: Particle[];
  setParticles: React.Dispatch<React.SetStateAction<Particle[]>>;
  selectedBody: CelestialBody | null;
  setSelectedBody: (body: CelestialBody | null) => void;
  followingBody: CelestialBody | null;
  setFollowingBody: (body: CelestialBody | null) => void;
  camera: CameraState;
  setCamera: React.Dispatch<React.SetStateAction<CameraState>>;
  currentTool: ToolType;
  spawnMass: number;
  settings: SimulationSettings;
  isPaused: boolean;
  nebulaConfig: NebulaConfig;
  nebulaSpawnMode: 'perlin' | 'spray';
  onGenerateNebulaAt?: (x: number, y: number) => void;
  onNotification: (title: string, body: string, type: 'supernova' | 'blackhole' | 'info') => void;
  onFpsUpdate: (fps: number) => void;
  onSaveSnapshot?: (description: string) => void;
  onFeedBlackHole?: (amount: number) => void;
  onTriggerSupernova?: () => void;
  onDeleteBody?: () => void;
  onPumpMass?: () => void;
  onStopVelocity?: () => void;
  onSelectTool?: (tool: ToolType) => void;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  bodies,
  setBodies,
  particles,
  setParticles,
  selectedBody,
  setSelectedBody,
  followingBody,
  setFollowingBody,
  camera,
  setCamera,
  currentTool,
  spawnMass,
  settings,
  isPaused,
  nebulaConfig,
  nebulaSpawnMode,
  onGenerateNebulaAt,
  onNotification,
  onFpsUpdate,
  onSaveSnapshot,
  onFeedBlackHole,
  onTriggerSupernova,
  onDeleteBody,
  onPumpMass,
  onStopVelocity,
  onSelectTool
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hovered celestial body state for instant grabbing & visual targeting indicator
  const [hoveredBody, setHoveredBody] = useState<CelestialBody | null>(null);

  // Right-click quick context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    worldPos: { x: number; y: number };
    body: CelestialBody | null;
  } | null>(null);

  // References for animation loop to access live states without re-binding loop
  const stateRef = useRef({
    bodies,
    particles,
    selectedBody,
    followingBody,
    hoveredBody,
    camera,
    currentTool,
    spawnMass,
    settings,
    isPaused,
    nebulaConfig,
    nebulaSpawnMode
  });

  stateRef.current.bodies = bodies;
  stateRef.current.particles = particles;
  stateRef.current.selectedBody = selectedBody;
  stateRef.current.followingBody = followingBody;
  stateRef.current.hoveredBody = hoveredBody;
  stateRef.current.camera = camera;
  stateRef.current.currentTool = currentTool;
  stateRef.current.spawnMass = spawnMass;
  stateRef.current.settings = settings;
  stateRef.current.isPaused = isPaused;
  stateRef.current.nebulaConfig = nebulaConfig;
  stateRef.current.nebulaSpawnMode = nebulaSpawnMode;

  useEffect(() => {
    stateRef.current = {
      bodies,
      particles,
      selectedBody,
      followingBody,
      hoveredBody,
      camera,
      currentTool,
      spawnMass,
      settings,
      isPaused,
      nebulaConfig,
      nebulaSpawnMode
    };
  }, [bodies, particles, selectedBody, followingBody, hoveredBody, camera, currentTool, spawnMass, settings, isPaused, nebulaConfig, nebulaSpawnMode]);

  // Drag vector state for star launching
  const [dragVector, setDragVector] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);
  
  // Hover cursor world position
  const hoverPosRef = useRef<{ x: number; y: number } | null>(null);
  
  // Object dragging state for "move" tool and direct positioning
  const draggedBodyRef = useRef<{
    id: string;
    startWorld: { x: number; y: number };
    offset: { x: number; y: number };
    hasMoved: boolean;
  } | null>(null);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(0);

  const isPumpingRef = useRef(false);
  const hasSavedGasSnapshotRef = useRef(false);
  const shockwavesRef = useRef<{
    id: string;
    x: number;
    y: number;
    startTime: number;
    duration: number;
    maxRadius: number;
    isHypernova: boolean;
    jetAngle: number;
  }[]>([]);
  const recordedExplosionsRef = useRef<Set<string>>(new Set());

  // Screen to world & world to screen transforms
  const screenToWorld = (sx: number, sy: number, cam: CameraState, w: number, h: number) => ({
    x: (sx - w / 2) / cam.zoom + cam.x,
    y: (sy - h / 2) / cam.zoom + cam.y
  });

  const worldToScreen = (wx: number, wy: number, cam: CameraState, w: number, h: number) => ({
    x: (wx - cam.x) * cam.zoom + w / 2,
    y: (wy - cam.y) * cam.zoom + h / 2
  });

  // Main 60 FPS Render & Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize WebGL screen-space gravitational lensing shader pipeline
    const lensingShader = new GravitationalLensingShader();
    const bgCanvas = document.createElement('canvas');

    let animId: number;
    let lastTime = performance.now();
    let lastHudUpdate = 0;
    let frameCounter = 0;

    const loop = (timestamp: number) => {
      animId = requestAnimationFrame(loop);

      frameCounter++;
      if (timestamp - lastTime >= 1000) {
        onFpsUpdate(frameCounter);
        frameCounter = 0;
        lastTime = timestamp;
      }

      const {
        bodies: curBodies,
        particles: curParticles,
        camera: curCamera,
        settings: curSettings,
        isPaused: curPaused,
        followingBody: curFollowing
      } = stateRef.current;

      const width = canvas.width;
      const height = canvas.height;

      // Ensure offscreen background canvas matches main viewport dimensions
      if (bgCanvas.width !== width || bgCanvas.height !== height) {
        bgCanvas.width = width;
        bgCanvas.height = height;
      }

      // 1. Step Physics if not paused
      if (!curPaused) {
        const baseDt = 0.035;
        const subSteps = Math.min(8, Math.ceil(curSettings.timeSpeed));
        const dt = (baseDt * curSettings.timeSpeed) / subSteps;

        for (let s = 0; s < subSteps; s++) {
          stepPhysics(
            curBodies,
            curParticles,
            curSettings,
            dt,
            (victim) => {
              stateRef.current.bodies = stateRef.current.bodies.filter(b => b.id !== victim.id);
              setBodies(prev => prev.filter(b => b.id !== victim.id));
              if (stateRef.current.selectedBody?.id === victim.id) {
                setSelectedBody(null);
              }
            },
            onNotification
          );
        }

        // Camera tracking (smooth in stateRef without triggering 60 React re-renders/sec)
        if (curFollowing) {
          const target = curBodies.find(b => b.id === curFollowing.id);
          if (target) {
            curCamera.x = target.x;
            curCamera.y = target.y;
            if (timestamp - lastHudUpdate > 250) {
              setCamera(prev => ({ ...prev, x: target.x, y: target.y }));
            }
          }
        }

        // Mass pump continuous action
        if (isPumpingRef.current && stateRef.current.selectedBody) {
          const sb = curBodies.find(b => b.id === stateRef.current.selectedBody?.id);
          if (sb && sb.remnantType !== 'black_hole') {
            sb.mass += 0.08 * dt * 5;
            sb.Tcore += 0.6 * dt * 5;
            sound.playMassPump();
            const angle = Math.random() * Math.PI * 2;
            curParticles.push(createParticle(
              sb.x + Math.cos(angle) * (sb.radius + 10),
              sb.y + Math.sin(angle) * (sb.radius + 10),
              -Math.cos(angle) * 3,
              -Math.sin(angle) * 3,
              '#f59e0b',
              2.5,
              18
            ));
          }
        }
      }

      // 2. Identify active black holes for screen-space spacetime curvature & gravitational lensing
      const blackHoles = curBodies.filter(b => b.remnantType === 'black_hole');

      // 3. Viewport Frustum Culling Bounding Box in World Coordinates
      const halfW = (width / 2) / curCamera.zoom;
      const halfH = (height / 2) / curCamera.zoom;
      const cullingMargin = 320; // Margin to avoid clipping halos, jets, and nebulae
      const minX = curCamera.x - halfW - cullingMargin;
      const maxX = curCamera.x + halfW + cullingMargin;
      const minY = curCamera.y - halfH - cullingMargin;
      const maxY = curCamera.y + halfH + cullingMargin;

      // Extract Black Holes in Screen-Space Coordinates for Shader
      const bhScreenData: BlackHoleScreenData[] = [];
      const useShader = curSettings.enableLensingShader !== false && curSettings.graphicsQuality !== 'performance';

      if (useShader) {
        for (const bh of blackHoles) {
          const scr = worldToScreen(bh.x, bh.y, curCamera, width, height);
          const rs = Math.max(3.5, bh.radius * curCamera.zoom);
          const rE = rs * (2.4 + Math.min(2.0, Math.sqrt(bh.mass * 0.15)));
          const margin = rE * 4.5;
          if (scr.x >= -margin && scr.x <= width + margin &&
              scr.y >= -margin && scr.y <= height + margin) {
            bhScreenData.push({
              screenX: scr.x,
              screenY: scr.y,
              screenRs: rs,
              screenEinsteinRadius: rE,
              mass: bh.mass,
              spin: bh.spinRate || 0.8
            });
          }
        }
      }

      const showFabric = curSettings.showSpacetimeGrid !== false;

      // 4. Render Background Cosmos & Apply Screen-Space Gravitational Lensing Shader Pass
      if (bhScreenData.length > 0) {
        const bgCtx = bgCanvas.getContext('2d');
        if (bgCtx) {
          bgCtx.fillStyle = '#020617';
          bgCtx.fillRect(0, 0, width, height);
          renderProceduralCosmos(bgCtx, curCamera, width, height, worldToScreen, blackHoles);
          if (showFabric) {
            renderSpacetimeFabric(bgCtx, curCamera, width, height, blackHoles, curBodies, worldToScreen, curSettings.adaptiveGrid !== false);
          }

          // Execute WebGL Screen-Space Gravitational Lensing Shader with Photon Ring & Ray Deflection
          const shaderSuccess = lensingShader.renderLensing(ctx, bgCanvas, bhScreenData, timestamp);
          if (!shaderSuccess) {
            ctx.drawImage(bgCanvas, 0, 0);
          }
        } else {
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, width, height);
          renderProceduralCosmos(ctx, curCamera, width, height, worldToScreen, blackHoles);
          if (showFabric) {
            renderSpacetimeFabric(ctx, curCamera, width, height, blackHoles, curBodies, worldToScreen, curSettings.adaptiveGrid !== false);
          }
        }
      } else {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);
        renderProceduralCosmos(ctx, curCamera, width, height, worldToScreen, []);
        if (showFabric) {
          renderSpacetimeFabric(ctx, curCamera, width, height, [], curBodies, worldToScreen, curSettings.adaptiveGrid !== false);
        }
      }

      // 6. Orbital Trails (Culled by viewport)
      if (curSettings.showTrails) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = Math.max(1, 1.2 * curCamera.zoom);
        for (const b of curBodies) {
          if (b.trail.length < 2) continue;

          // Frustum check for trail
          let isTrailVisible = false;
          for (let k = 0; k < b.trail.length; k += 4) {
            const pt = b.trail[k];
            if (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY) {
              isTrailVisible = true;
              break;
            }
          }
          if (!isTrailVisible) continue;

          ctx.beginPath();
          const start = worldToScreen(b.trail[0].x, b.trail[0].y, curCamera, width, height);
          ctx.moveTo(start.x, start.y);
          for (let j = 1; j < b.trail.length; j++) {
            const pt = worldToScreen(b.trail[j].x, b.trail[j].y, curCamera, width, height);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // 7. Particles (Gas, Accretion Matter & Supernova Remnants) with Doppler Shift & Batched Rendering
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const circularBatches = new Map<string, { x: number; y: number; r: number }[]>();

      for (let pIdx = 0; pIdx < curParticles.length; pIdx++) {
        const p = curParticles[pIdx];
        // Frustum culling: skip particles outside viewport
        if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) continue;

        const scr = worldToScreen(p.x, p.y, curCamera, width, height);
        const r = Math.max(0.9, p.radius * curCamera.zoom);
        const stretch = p.stretch || 1.0;
        const stretchAngle = p.stretchAngle || 0;
        const intensity = p.intensity || 1.0;

        // Apply Relativistic Doppler shift to particle color if enabled
        const partDoppler = curSettings.dopplerEffect !== false ? computeDopplerFromVx(p.vx) : 0;
        const pColor = curSettings.dopplerEffect !== false ? applyDopplerToColor(p.color, partDoppler) : p.color;

        if (stretch > 1.2) {
          // --- REAL TIDAL SPAGHETTIFICATION ---
          ctx.save();
          ctx.translate(scr.x, scr.y);
          ctx.rotate(stretchAngle);

          const stretchLen = Math.max(r * 2.0, r * stretch);
          const stretchThick = Math.max(0.6, r / Math.sqrt(Math.min(10.0, stretch)));

          const needleGrad = ctx.createLinearGradient(-stretchLen * 0.8, 0, stretchLen * 0.8, 0);
          needleGrad.addColorStop(0, 'rgba(0,0,0,0)');
          needleGrad.addColorStop(0.3, pColor);
          needleGrad.addColorStop(0.5, intensity > 1.8 ? '#ffffff' : pColor);
          needleGrad.addColorStop(0.7, pColor);
          needleGrad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = needleGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, stretchLen, stretchThick, 0, 0, Math.PI * 2);
          ctx.fill();

          if (intensity > 1.6) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.ellipse(0, 0, stretchLen * 0.4, stretchThick * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        } else {
          // Group standard circular particles for batched draw call
          let batch = circularBatches.get(pColor);
          if (!batch) {
            batch = [];
            circularBatches.set(pColor, batch);
          }
          batch.push({ x: scr.x, y: scr.y, r });
        }
      }

      // Draw all circular particles in single batched calls per color
      circularBatches.forEach((points, colorStr) => {
        ctx.fillStyle = colorStr;
        ctx.beginPath();
        for (let k = 0; k < points.length; k++) {
          const pt = points[k];
          ctx.moveTo(pt.x + pt.r, pt.y);
          ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        }
        ctx.fill();
      });

      ctx.restore();

      // 8. Celestial Bodies with Spaghettification, 3D Gargantua Black Hole & Doppler Beaming
      let inViewCount = 0;
      for (const b of curBodies) {
        const bodyMargin = Math.max(b.radius * 7, 220);
        // Frustum culling
        if (b.x + bodyMargin < minX || b.x - bodyMargin > maxX || b.y + bodyMargin < minY || b.y - bodyMargin > maxY) {
          continue;
        }
        inViewCount++;

        const scr = worldToScreen(b.x, b.y, curCamera, width, height);
        const r = Math.max(3.5, b.radius * curCamera.zoom);

        // Selection ring
        if (stateRef.current.selectedBody?.id === b.id) {
          ctx.save();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.arc(scr.x, scr.y, r + 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Active dragging tractor field indicator
        if (draggedBodyRef.current?.id === b.id) {
          ctx.save();
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(scr.x, scr.y, r + 14, 0, Math.PI * 2);
          ctx.stroke();

          // Dotted tether to starting world location
          const pStart = worldToScreen(draggedBodyRef.current.startWorld.x, draggedBodyRef.current.startWorld.y, curCamera, width, height);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(scr.x, scr.y);
          ctx.lineTo(pStart.x, pStart.y);
          ctx.stroke();
          ctx.restore();
        }

        // --- ASTROPHYSICAL BLACK HOLE RENDERING ---
        // (Circular accretion disk, Keplerian orbital flow, relativistic Doppler beaming, photon ring hugging event horizon)
        if (b.remnantType === 'black_hole') {
          const t = timestamp * 0.0012;
          const diskR = r * 4.2;         // Outer accretion disk radius
          const iscoR = r * 1.35;        // Innermost Stable Circular Orbit (ISCO)
          const photonR1 = r * 1.018;    // Primary razor-sharp photon ring on event horizon boundary
          const photonR2 = r * 1.055;    // Secondary caustic sub-ring

          ctx.save();

          // [LAYER 1] Spacetime Distortion Field & Gravitational Lensing Halo
          ctx.globalCompositeOperation = 'screen';
          const lensGlow = ctx.createRadialGradient(scr.x, scr.y, r * 0.9, scr.x, scr.y, diskR * 1.45);
          lensGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
          lensGlow.addColorStop(0.24, 'rgba(254, 240, 138, 0.35)'); // Incandescent solar gold
          lensGlow.addColorStop(0.55, 'rgba(249, 115, 22, 0.20)');  // Warm amber space curvature
          lensGlow.addColorStop(0.85, 'rgba(168, 85, 247, 0.12)'); // Gravitational redshift violet halo
          lensGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = lensGlow;
          ctx.beginPath();
          ctx.arc(scr.x, scr.y, diskR * 1.45, 0, Math.PI * 2);
          ctx.fill();

          // [LAYER 2] Main Circular Accretion Disk (Concentric Radial Plasma Gradient)
          const diskGrad = ctx.createRadialGradient(scr.x, scr.y, iscoR * 0.95, scr.x, scr.y, diskR);
          diskGrad.addColorStop(0, '#ffffff');                     // White-hot inner ISCO rim
          diskGrad.addColorStop(0.15, 'rgba(224, 242, 254, 0.90)'); // Electric cyan/white approach
          diskGrad.addColorStop(0.38, 'rgba(254, 240, 138, 0.85)'); // Solar gold
          diskGrad.addColorStop(0.65, 'rgba(245, 158, 11, 0.65)');  // Incandescent orange
          diskGrad.addColorStop(0.85, 'rgba(225, 29, 72, 0.35)');   // Redshifted outer rim
          diskGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = diskGrad;
          ctx.beginPath();
          ctx.arc(scr.x, scr.y, diskR, 0, Math.PI * 2);
          ctx.fill();

          // Doppler Beaming Asymmetry Overlay (Relativistic beaming on approaching side)
          if (curSettings.dopplerEffect !== false) {
            const dopplerOverlay = ctx.createLinearGradient(scr.x - diskR, scr.y, scr.x + diskR, scr.y);
            dopplerOverlay.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
            dopplerOverlay.addColorStop(0.4, 'rgba(254, 240, 138, 0.2)');
            dopplerOverlay.addColorStop(0.7, 'rgba(180, 83, 9, 0.0)');
            dopplerOverlay.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = dopplerOverlay;
            ctx.beginPath();
            ctx.arc(scr.x, scr.y, diskR, 0, Math.PI * 2);
            ctx.fill();
          }

          // [LAYER 3] High-Density Swirling Relativistic Accretion Particles in Circular Keplerian Orbits
          ctx.globalCompositeOperation = 'lighter';
          for (let pIdx = 0; pIdx < GLOBAL_ACCRETION_POOL.length; pIdx++) {
            const ap = GLOBAL_ACCRETION_POOL[pIdx];
            // Keplerian circular orbit angle: v ~ 1/sqrt(r)
            const curAngle = ap.angle + ap.speed * t * 1.8;
            const curR = iscoR + ap.radiusNorm * (diskR - iscoR);

            // Circular orbit coordinates
            const pX = scr.x + Math.cos(curAngle) * curR;
            const pY = scr.y + Math.sin(curAngle) * curR;

            // Relativistic Doppler Beaming factor: Left-moving hemisphere (sin > 0 or cos < 0)
            const isApproaching = Math.sin(curAngle) > 0;
            const dopplerFactor = curSettings.dopplerEffect !== false
              ? (isApproaching ? 1.0 + Math.abs(Math.sin(curAngle)) * 1.3 : Math.max(0.2, 1.0 - Math.abs(Math.sin(curAngle)) * 0.6))
              : 1.0;

            const pSize = Math.max(0.8, ap.size * curCamera.zoom * Math.sqrt(dopplerFactor));
            const pAlpha = Math.min(1.0, ap.brightness * dopplerFactor);

            // Plasma color gradient from inner white-hot to outer amber
            let pCol = '#fef08a';
            if (isApproaching && curSettings.dopplerEffect !== false) {
              pCol = ap.radiusNorm < 0.35 ? '#ffffff' : ap.radiusNorm < 0.65 ? '#bae6fd' : '#fde047';
            } else {
              pCol = ap.radiusNorm < 0.35 ? '#fef08a' : ap.radiusNorm < 0.65 ? '#f59e0b' : '#ea580c';
            }

            ctx.fillStyle = pCol;
            ctx.globalAlpha = pAlpha;
            ctx.beginPath();
            ctx.arc(pX, pY, pSize, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1.0;

          // Relativistic plasma circular concentric streak rings
          for (let s = 0; s < 5; s++) {
            const swirlR = iscoR + s * (diskR - iscoR) * 0.22;
            const swirlSpeed = (5.2 - s * 0.8);
            const swirlAngle = t * swirlSpeed;

            ctx.strokeStyle = s === 0 ? 'rgba(255, 255, 255, 0.9)' : s === 1 ? 'rgba(254, 240, 138, 0.7)' : 'rgba(249, 115, 22, 0.5)';
            ctx.lineWidth = Math.max(1.2, (3.2 - s * 0.5) * curCamera.zoom);
            ctx.setLineDash([20 + s * 14, 14 + s * 8]);
            ctx.lineDashOffset = -swirlAngle * 35;
            ctx.beginPath();
            ctx.arc(scr.x, scr.y, swirlR, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.setLineDash([]);

          // [LAYER 4] Razor-Sharp Photon Ring (Directly on the Event Horizon Boundary)
          ctx.globalCompositeOperation = 'screen';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(2.2, 3.0 * curCamera.zoom);
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(scr.x, scr.y, photonR1, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Secondary razor-thin caustic photon ring
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.95)';
          ctx.lineWidth = Math.max(1.2, 1.6 * curCamera.zoom);
          ctx.beginPath();
          ctx.arc(scr.x, scr.y, photonR2, 0, Math.PI * 2);
          ctx.stroke();

          // [LAYER 5] Absolute Pitch-Black Event Horizon (Горизонт событий / Тень сингулярности)
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(scr.x, scr.y, r, 0, Math.PI * 2);
          ctx.fill();

          // Sharp shadow border
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(scr.x, scr.y, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
          continue;
        }

        // --- UNIVERSAL TIDAL STRETCHING & SPAGHETTIFICATION (For any body approaching massive gravity) ---
        const hasTidalStretch = b.tidalStretch && b.tidalStretch.factor > 1.05;
        const stretchFac = hasTidalStretch ? b.tidalStretch!.factor : 1.0;
        const stretchAng = hasTidalStretch ? b.tidalStretch!.angle : 0;

        // --- NEUTRON STAR / PULSAR ---
        if (b.remnantType === 'pulsar') {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';

          // Relativistic rotating magnetic jets
          const beamLen = r * 14;
          const beamAngle = b.rotationAngle;

          ctx.save();
          ctx.translate(scr.x, scr.y);
          ctx.rotate(beamAngle);

          const jetGrad = ctx.createLinearGradient(0, -beamLen, 0, beamLen);
          jetGrad.addColorStop(0, 'rgba(0,0,0,0)');
          jetGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.85)');
          jetGrad.addColorStop(0.5, '#ffffff');
          jetGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.85)');
          jetGrad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = jetGrad;
          ctx.beginPath();
          ctx.moveTo(-r * 0.4, 0);
          ctx.lineTo(-r * 1.8, -beamLen);
          ctx.lineTo(r * 1.8, -beamLen);
          ctx.lineTo(r * 0.4, 0);
          ctx.lineTo(r * 1.8, beamLen);
          ctx.lineTo(-r * 1.8, beamLen);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // Pulsar core (with stretch if applicable)
          ctx.save();
          ctx.translate(scr.x, scr.y);
          if (hasTidalStretch) ctx.rotate(stretchAng);

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(0, 0, r * stretchFac, r / Math.sqrt(stretchFac), 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 1.8 * stretchFac, (r * 1.8) / Math.sqrt(stretchFac), 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
          ctx.restore();
          continue;
        }

        // --- STANDARD STAR / BODY WITH TIDAL STRETCHING & SPECTRAL EMISSION ---
        const specKey = getSpectralClass(b);
        const specInfo = SPECTRAL_DATA[specKey];

        // Apply Doppler color shift if enabled
        const starColor = curSettings.dopplerEffect
          ? applyDopplerToColor(specInfo.color, b.dopplerShift || 0)
          : specInfo.color;
        const starHalo = curSettings.dopplerEffect
          ? applyDopplerToColor(specInfo.halo, b.dopplerShift || 0)
          : specInfo.halo;

        ctx.save();
        ctx.translate(scr.x, scr.y);
        if (hasTidalStretch) {
          ctx.rotate(stretchAng);
        }

        // Atmospheric / Corona Glow
        ctx.globalCompositeOperation = 'lighter';
        const glowGrad = ctx.createRadialGradient(
          0, 0, r * 0.3,
          0, 0, r * 3.5 * Math.sqrt(stretchFac)
        );
        glowGrad.addColorStop(0, starColor);
        glowGrad.addColorStop(0.4, starHalo);
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 3.5 * stretchFac, (r * 3.5) / Math.sqrt(stretchFac), 0, 0, Math.PI * 2);
        ctx.fill();

        // Trailing plasma streamer when heavily stretched / spaghettified
        if (stretchFac > 1.8) {
          const streamerGrad = ctx.createLinearGradient(-r * stretchFac * 1.5, 0, r * stretchFac * 1.5, 0);
          streamerGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          streamerGrad.addColorStop(0.3, starHalo);
          streamerGrad.addColorStop(0.5, '#ffffff');
          streamerGrad.addColorStop(0.8, starColor);
          streamerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = streamerGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, r * stretchFac * 1.6, (r * 0.7) / Math.sqrt(stretchFac), 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Stellar Core Sphere / Ellipsoid
        const coreGrad = ctx.createRadialGradient(
          -r * 0.25 * stretchFac, -r * 0.25, r * 0.1,
          0, 0, r * Math.sqrt(stretchFac)
        );
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.65, starColor);
        coreGrad.addColorStop(1, starColor);

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * stretchFac, r / Math.sqrt(stretchFac), 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      if (timestamp - lastHudUpdate > 250) {
        setVisibleCount(inViewCount);
        lastHudUpdate = timestamp;
      }

      // --- 6.5. EPIC SUPERNOVA & HYPERNOVA RELATIVISTIC SHOCKWAVES ---
      // Detect newly exploded bodies
      for (const b of curBodies) {
        if (b.hasExploded && !recordedExplosionsRef.current.has(b.id)) {
          recordedExplosionsRef.current.add(b.id);
          const isHyper = b.mass > 25 || b.remnantType === 'black_hole';
          shockwavesRef.current.push({
            id: Math.random().toString(),
            x: b.x,
            y: b.y,
            startTime: timestamp,
            duration: isHyper ? 4800 : 3600,
            maxRadius: isHyper ? 550 : 380,
            isHypernova: isHyper,
            jetAngle: b.rotationAngle || Math.random() * Math.PI * 2
          });
        }
      }

      // Render active shockwaves
      const nowTime = timestamp;
      shockwavesRef.current = shockwavesRef.current.filter(sw => nowTime - sw.startTime < sw.duration);

      for (const sw of shockwavesRef.current) {
        const p = (nowTime - sw.startTime) / sw.duration; // 0..1
        const scr = worldToScreen(sw.x, sw.y, curCamera, width, height);
        const curRWorld = sw.maxRadius * (1 - Math.exp(-p * 3.8)) * (1 + p * 0.28);
        const rScr = curRWorld * curCamera.zoom;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // 1. Initial Detonation Nuclear Fireball Bloom (First 28% of life)
        if (p < 0.28) {
          const flashProg = p / 0.28;
          const flashAlpha = Math.pow(1 - flashProg, 1.4) * (sw.isHypernova ? 1.0 : 0.85);
          const flashRadius = Math.max(30, (sw.isHypernova ? 180 : 120) * curCamera.zoom * (1 + flashProg * 1.5));
          const flashGrad = ctx.createRadialGradient(scr.x, scr.y, 0, scr.x, scr.y, flashRadius);
          flashGrad.addColorStop(0, '#ffffff');
          flashGrad.addColorStop(0.22, sw.isHypernova ? 'rgba(103, 232, 249, 0.95)' : 'rgba(254, 240, 138, 0.95)');
          flashGrad.addColorStop(0.60, sw.isHypernova ? 'rgba(192, 132, 252, 0.60)' : 'rgba(244, 63, 94, 0.60)');
          flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = flashGrad;
          ctx.globalAlpha = flashAlpha;
          ctx.beginPath();
          ctx.arc(scr.x, scr.y, flashRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        const ringAlpha = Math.pow(1 - p, 1.25);

        // 2. Collimated Gamma-Ray Burst (GRB) Bipolar Laser Jets (For Hypernovas)
        if (sw.isHypernova && p < 0.85) {
          const jetAlpha = (1 - p / 0.85) * 0.9;
          const jetLen = rScr * 2.8;
          for (const jDir of [sw.jetAngle, sw.jetAngle + Math.PI]) {
            const cosJ = Math.cos(jDir);
            const sinJ = Math.sin(jDir);
            const jGrad = ctx.createLinearGradient(scr.x, scr.y, scr.x + cosJ * jetLen, scr.y + sinJ * jetLen);
            jGrad.addColorStop(0, '#ffffff');
            jGrad.addColorStop(0.25, 'rgba(103, 232, 249, 0.9)');
            jGrad.addColorStop(0.7, 'rgba(192, 132, 252, 0.4)');
            jGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.strokeStyle = jGrad;
            ctx.globalAlpha = jetAlpha;
            ctx.lineWidth = Math.max(3, 8 * (1 - p) * curCamera.zoom);
            ctx.beginPath();
            ctx.moveTo(scr.x, scr.y);
            ctx.lineTo(scr.x + cosJ * jetLen, scr.y + sinJ * jetLen);
            ctx.stroke();
          }
          ctx.globalAlpha = 1.0;
        }

        // 3. Multi-Shell Ionization Blast Waves
        // Wave 1: Fast Relativistic Leading Blast Front
        ctx.strokeStyle = sw.isHypernova
          ? `rgba(103, 232, 249, ${ringAlpha * 0.95})`
          : `rgba(254, 240, 138, ${ringAlpha * 0.95})`;
        ctx.lineWidth = Math.max(2.5, 6.0 * (1 - p) * curCamera.zoom);
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, rScr, 0, Math.PI * 2);
        ctx.stroke();

        // Wave 2: [O III] / H-alpha Ionization Secondary Shell
        ctx.strokeStyle = sw.isHypernova
          ? `rgba(232, 121, 249, ${ringAlpha * 0.8})`
          : `rgba(244, 63, 94, ${ringAlpha * 0.8})`;
        ctx.lineWidth = Math.max(1.8, 4.0 * (1 - p) * curCamera.zoom);
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, rScr * 0.82, 0, Math.PI * 2);
        ctx.stroke();

        // Wave 3: Inner Heavy Element Mantle
        ctx.strokeStyle = `rgba(251, 146, 60, ${ringAlpha * 0.6})`;
        ctx.lineWidth = Math.max(1.5, 3.0 * (1 - p) * curCamera.zoom);
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, rScr * 0.58, 0, Math.PI * 2);
        ctx.stroke();

        // 4. Filamentary Radial Ionization Spokes
        const numSpokes = sw.isHypernova ? 16 : 10;
        ctx.strokeStyle = sw.isHypernova
          ? `rgba(186, 230, 253, ${ringAlpha * 0.65})`
          : `rgba(254, 215, 170, ${ringAlpha * 0.65})`;
        ctx.lineWidth = Math.max(1.0, 2.0 * curCamera.zoom);
        for (let sp = 0; sp < numSpokes; sp++) {
          const spAngle = (sp / numSpokes) * Math.PI * 2 + p * 0.4;
          const innerR = rScr * 0.45;
          const outerR = rScr * (0.95 + Math.sin(sp * 3 + p * 8) * 0.08);
          ctx.beginPath();
          ctx.moveTo(scr.x + Math.cos(spAngle) * innerR, scr.y + Math.sin(spAngle) * innerR);
          ctx.lineTo(scr.x + Math.cos(spAngle) * outerR, scr.y + Math.sin(spAngle) * outerR);
          ctx.stroke();
        }

        ctx.restore();
      }

      // 7. Velocity Vectors
      if (curSettings.showVectors) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = '#38bdf8';
        ctx.lineWidth = 1.5;

        for (const b of curBodies) {
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (speed < 0.05) continue;
          const p1 = worldToScreen(b.x, b.y, curCamera, width, height);
          const p2 = { x: p1.x + b.vx * 16, y: p1.y + b.vy * 16 };

          // Frustum check for vector
          if (p1.x < -50 || p1.x > width + 50 || p1.y < -50 || p1.y > height + 50) continue;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(b.vy, b.vx);
          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(p2.x - 7 * Math.cos(angle - Math.PI / 6), p2.y - 7 * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(p2.x - 7 * Math.cos(angle + Math.PI / 6), p2.y - 7 * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // 8. Visual Targeting Halo & Grab Reticle for Hovered Celestial Body
      if (stateRef.current.hoveredBody && !draggedBodyRef.current) {
        const hb = stateRef.current.hoveredBody;
        const scr = worldToScreen(hb.x, hb.y, curCamera, width, height);
        const radius = Math.max(16, (hb.radius + 12) * curCamera.zoom);

        ctx.save();
        const pulse = 0.85 + 0.15 * Math.sin(performance.now() * 0.005);
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.75 * pulse})`;
        ctx.lineWidth = 1.8;

        // Outer corner brackets
        const bracketLen = Math.max(8, radius * 0.35);
        // Top-left
        ctx.beginPath();
        ctx.moveTo(scr.x - radius, scr.y - radius + bracketLen);
        ctx.lineTo(scr.x - radius, scr.y - radius);
        ctx.lineTo(scr.x - radius + bracketLen, scr.y - radius);
        // Top-right
        ctx.moveTo(scr.x + radius - bracketLen, scr.y - radius);
        ctx.lineTo(scr.x + radius, scr.y - radius);
        ctx.lineTo(scr.x + radius, scr.y - radius + bracketLen);
        // Bottom-left
        ctx.moveTo(scr.x - radius, scr.y + radius - bracketLen);
        ctx.lineTo(scr.x - radius, scr.y + radius);
        ctx.lineTo(scr.x - radius + bracketLen, scr.y + radius);
        // Bottom-right
        ctx.moveTo(scr.x + radius - bracketLen, scr.y + radius);
        ctx.lineTo(scr.x + radius, scr.y + radius);
        ctx.lineTo(scr.x + radius, scr.y + radius - bracketLen);
        ctx.stroke();

        // Target micro-label
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(`✋ Захват: ${hb.name}`, scr.x, scr.y + radius + 14);
        ctx.restore();
      }

      // 9. Nebula Placement Preview Reticle (when spawn_gas tool & perlin mode)
      if (
        stateRef.current.currentTool === 'spawn_gas' &&
        stateRef.current.nebulaSpawnMode === 'perlin' &&
        hoverPosRef.current
      ) {
        const scr = worldToScreen(hoverPosRef.current.x, hoverPosRef.current.y, curCamera, width, height);
        const radiusWorld = stateRef.current.nebulaConfig?.radius || 240;
        const scrRadius = radiusWorld * curCamera.zoom;

        ctx.save();
        const pulse = 0.82 + 0.18 * Math.sin(performance.now() * 0.0032);
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.5 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, Math.max(12, scrRadius), 0, Math.PI * 2);
        ctx.stroke();

        // Inner filament boundary
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.35 * pulse})`;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, Math.max(6, scrRadius * 0.5), 0, Math.PI * 2);
        ctx.stroke();

        // Crosshair center
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(scr.x - 9, scr.y);
        ctx.lineTo(scr.x + 9, scr.y);
        ctx.moveTo(scr.x, scr.y - 9);
        ctx.lineTo(scr.x, scr.y + 9);
        ctx.stroke();

        // Label above reticle
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(186, 230, 253, 0.85)';
        ctx.textAlign = 'center';
        ctx.fillText('✨ Облако Перлина (ЛКМ)', scr.x, scr.y - Math.max(16, scrRadius) - 8);
        ctx.restore();
      }
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      lensingShader.dispose();
    };
  }, [setBodies, setSelectedBody, setCamera, onFpsUpdate, onNotification]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Camera Pan state
  const panRef = useRef({ isPanning: false, lastX: 0, lastY: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, camera, w, h);

    // Close any open context menu
    if (contextMenu?.isOpen) {
      setContextMenu(null);
    }

    // Pan camera with Middle button, Right button, or Shift+LMB
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      panRef.current = { isPanning: true, lastX: e.clientX, lastY: e.clientY };
      return;
    }

    if (e.button === 0) {
      // 1. Universal Direct Body Interaction: check if clicking directly on any celestial body
      let clicked: CelestialBody | null = null;
      for (const b of bodies) {
        const dx = b.x - worldPos.x;
        const dy = b.y - worldPos.y;
        if (Math.sqrt(dx * dx + dy * dy) < Math.max(22, b.radius + 16)) {
          clicked = b;
          break;
        }
      }

      if (clicked) {
        setSelectedBody(clicked);
        if (currentTool === 'pump_mass') {
          onSaveSnapshot?.(`Накачка массы: ${clicked.name}`);
          isPumpingRef.current = true;
          if (onPumpMass) onPumpMass();
        } else {
          // Direct Grab & Move: Works universally across any tool mode!
          draggedBodyRef.current = {
            id: clicked.id,
            startWorld: { x: clicked.x, y: clicked.y },
            offset: { x: clicked.x - worldPos.x, y: clicked.y - worldPos.y },
            hasMoved: false
          };
          setActiveDragId(clicked.id);
          sound.playObjectMove();
        }
        return;
      }

      // 2. Clicked on empty space: Execute active tool
      if (currentTool === 'select' || currentTool === 'move') {
        setSelectedBody(null);
        panRef.current = { isPanning: true, lastX: e.clientX, lastY: e.clientY };
      } else if (currentTool === 'spawn_star' || currentTool === 'spawn_blackhole') {
        setDragVector({ start: worldPos, current: worldPos });
      } else if (currentTool === 'spawn_gas') {
        if (nebulaSpawnMode === 'perlin' && onGenerateNebulaAt) {
          onGenerateNebulaAt(worldPos.x, worldPos.y);
        } else {
          if (!hasSavedGasSnapshotRef.current) {
            onSaveSnapshot?.('Создание газового облака');
            hasSavedGasSnapshotRef.current = true;
          }
          sprayGas(worldPos.x, worldPos.y);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (panRef.current.isPanning) {
      const dx = (e.clientX - panRef.current.lastX) / camera.zoom;
      const dy = (e.clientY - panRef.current.lastY) / camera.zoom;
      setCamera(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
      panRef.current.lastX = e.clientX;
      panRef.current.lastY = e.clientY;
      return;
    }

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, camera, w, h);
    hoverPosRef.current = worldPos;

    // Detect hovered body for intuitive UI feedback
    let hovered: CelestialBody | null = null;
    for (const b of bodies) {
      const dx = b.x - worldPos.x;
      const dy = b.y - worldPos.y;
      if (Math.sqrt(dx * dx + dy * dy) < Math.max(22, b.radius + 16)) {
        hovered = b;
        break;
      }
    }
    setHoveredBody(hovered);

    // Active body dragging (Tractor move)
    if (draggedBodyRef.current) {
      const target = bodies.find(b => b.id === draggedBodyRef.current?.id);
      if (target) {
        target.x = worldPos.x + draggedBodyRef.current.offset.x;
        target.y = worldPos.y + draggedBodyRef.current.offset.y;
        target.vx = 0;
        target.vy = 0;
        draggedBodyRef.current.hasMoved = true;
      }
      return;
    }

    if (dragVector) {
      const currentPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, camera, w, h);
      setDragVector(prev => prev ? { ...prev, current: currentPos } : null);
    }

    if (currentTool === 'spawn_gas' && nebulaSpawnMode === 'spray' && e.buttons === 1) {
      if (!hasSavedGasSnapshotRef.current) {
        onSaveSnapshot?.('Создание газового облака');
        hasSavedGasSnapshotRef.current = true;
      }
      sprayGas(worldPos.x, worldPos.y);
    }
  };

  const handleMouseUp = () => {
    if (panRef.current.isPanning) {
      panRef.current.isPanning = false;
    }

    if (hasSavedGasSnapshotRef.current) {
      hasSavedGasSnapshotRef.current = false;
    }

    // Finish object move
    if (draggedBodyRef.current) {
      if (draggedBodyRef.current.hasMoved) {
        const movedBody = bodies.find(b => b.id === draggedBodyRef.current?.id);
        onSaveSnapshot?.(`Перемещение: ${movedBody?.name || 'тела'}`);
      }
      draggedBodyRef.current = null;
      setActiveDragId(null);
    }

    if (dragVector) {
      const vx = (dragVector.start.x - dragVector.current.x) * 0.05;
      const vy = (dragVector.start.y - dragVector.current.y) * 0.05;

      if (currentTool === 'spawn_star') {
        onSaveSnapshot?.('Создание новой звезды');
        const newStar = createBody({
          name: `Звезда SG-${Math.floor(Math.random() * 800 + 100)}`,
          x: dragVector.start.x,
          y: dragVector.start.y,
          vx,
          vy,
          mass: spawnMass
        });
        setBodies(prev => [...prev, newStar]);
        setSelectedBody(newStar);
        sound.playSpawn();
        onNotification(
          '🌟 Новая звезда создана',
          `${newStar.name} (${newStar.mass.toFixed(1)} M☉) успешно выведена на орбиту.`,
          'info'
        );
      } else if (currentTool === 'spawn_blackhole') {
        onSaveSnapshot?.('Создание черной дыры');
        const bh = createBody({
          name: `Черная дыра BH-${Math.floor(Math.random() * 800 + 100)}`,
          x: dragVector.start.x,
          y: dragVector.start.y,
          vx,
          vy,
          mass: Math.max(3.5, spawnMass),
          remnantType: 'black_hole',
          isRemnant: true
        });
        setBodies(prev => [...prev, bh]);
        setSelectedBody(bh);
        sound.playSpawn();
        onNotification(
          '🕳️ Черная дыра выведена в космос',
          `${bh.name} готова к гравитационному поглощению и спагеттификации материи.`,
          'blackhole'
        );
      }

      setDragVector(null);
    }

    if (isPumpingRef.current) {
      isPumpingRef.current = false;
    }
  };

  // Right Click Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, camera, w, h);

    let clicked: CelestialBody | null = null;
    for (const b of bodies) {
      const dx = b.x - worldPos.x;
      const dy = b.y - worldPos.y;
      if (Math.sqrt(dx * dx + dy * dy) < Math.max(22, b.radius + 16)) {
        clicked = b;
        break;
      }
    }

    if (clicked) {
      setSelectedBody(clicked);
    }

    setContextMenu({
      isOpen: true,
      x: Math.min(window.innerWidth - 230, Math.max(10, e.clientX)),
      y: Math.min(window.innerHeight - 320, Math.max(10, e.clientY)),
      worldPos,
      body: clicked
    });
  };

  const sprayGas = (x: number, y: number) => {
    const newGas: Particle[] = [];
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 25;
      const speed = Math.random() * 0.4;
      newGas.push(createParticle(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        '#38bdf8',
        Math.random() * 2.0 + 1.2,
        Infinity,
        true,
        0.015
      ));
    }
    setParticles(prev => [...prev, ...newGas]);
  };

  // Zoom on wheel (Expanded range from 0.008 to 8.0 for macro & deep cosmos)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const mouseBefore = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, camera, w, h);

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.max(0.008, Math.min(8.0, camera.zoom * zoomFactor));

    setCamera(prev => {
      const mouseAfter = {
        x: (e.clientX - rect.left - w / 2) / newZoom + prev.x,
        y: (e.clientY - rect.top - h / 2) / newZoom + prev.y
      };
      return {
        zoom: newZoom,
        x: prev.x + (mouseBefore.x - mouseAfter.x),
        y: prev.y + (mouseBefore.y - mouseAfter.y)
      };
    });
  };

  // Calculate current procedural sector for telemetry HUD
  const curSectorX = Math.floor(camera.x / SECTOR_SIZE);
  const curSectorY = Math.floor(camera.y / SECTOR_SIZE);

  // Dynamic cursor calculation
  const getCanvasCursorClass = () => {
    if (activeDragId) return 'cursor-grabbing';
    if (hoveredBody) return 'cursor-grab';
    if (currentTool === 'move') return 'cursor-grab active:cursor-grabbing';
    return 'cursor-crosshair';
  };

  return (
    <div className="relative w-full h-full overflow-hidden" onClick={() => contextMenu && setContextMenu(null)}>
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${getCanvasCursorClass()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { hoverPosRef.current = null; setHoveredBody(null); }}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />

      {/* Drag Vector Launch preview */}
      {dragVector && canvasRef.current && (
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-10">
          {(() => {
            const w = canvasRef.current.width;
            const h = canvasRef.current.height;
            const p1 = worldToScreen(dragVector.start.x, dragVector.start.y, camera, w, h);
            const p2 = worldToScreen(dragVector.current.x, dragVector.current.y, camera, w, h);
            return (
              <>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray="6,4"
                />
                <circle
                  cx={p1.x}
                  cy={p1.y}
                  r={Math.max(6, Math.pow(spawnMass, 0.6) * 10 * camera.zoom)}
                  fill="rgba(56, 189, 248, 0.4)"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <circle cx={p2.x} cy={p2.y} r="5" fill="#facc15" />
              </>
            );
          })()}
        </svg>
      )}

      {/* Right-Click Quick Context Menu */}
      {contextMenu?.isOpen && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="absolute z-50 min-w-[210px] glass-panel bg-slate-950/95 border border-cyan-500/40 rounded-2xl p-1.5 shadow-2xl backdrop-blur-2xl animate-fade-in text-xs font-mono select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.body ? (
            <>
              {/* Target Body Header */}
              <div className="px-2.5 py-1.5 border-b border-slate-800/80 mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-slate-100 truncate">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="truncate max-w-[130px]">{contextMenu.body.name}</span>
                </div>
                <span className="text-[10px] text-amber-400">{contextMenu.body.mass.toFixed(1)} M☉</span>
              </div>

              {/* Follow Camera */}
              <button
                onClick={() => {
                  setFollowingBody(followingBody?.id === contextMenu.body?.id ? null : contextMenu.body);
                  setContextMenu(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-cyan-300 flex items-center justify-between transition text-left"
              >
                <span className="flex items-center gap-2">
                  <Crosshair size={13} className="text-cyan-400" />
                  <span>{followingBody?.id === contextMenu.body.id ? 'Отвязать камеру' : 'Следить камерой'}</span>
                </span>
                <span className="text-[9px] text-slate-500">[F]</span>
              </button>

              {/* Mass Pump / Feed */}
              {contextMenu.body.remnantType === 'black_hole' ? (
                <button
                  onClick={() => {
                    if (onFeedBlackHole) onFeedBlackHole(25);
                    setContextMenu(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl hover:bg-purple-950/60 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition text-left"
                >
                  <Zap size={13} className="text-purple-400" />
                  <span>Влить +25 M☉ энергии</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (onPumpMass) onPumpMass();
                    setContextMenu(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl hover:bg-amber-950/60 text-amber-300 hover:text-amber-200 flex items-center justify-between transition text-left"
                >
                  <span className="flex items-center gap-2">
                    <Zap size={13} className="text-amber-400" />
                    <span>Накачать +2.0 M☉</span>
                  </span>
                  <span className="text-[9px] text-slate-500">[+]</span>
                </button>
              )}

              {/* Supernova Explosion for Stars */}
              {!contextMenu.body.isRemnant && (
                <button
                  onClick={() => {
                    if (onTriggerSupernova) onTriggerSupernova();
                    setContextMenu(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl hover:bg-rose-950/60 text-rose-300 hover:text-rose-200 flex items-center gap-2 transition text-left"
                >
                  <Flame size={13} className="text-rose-400" />
                  <span>Взрыв Сверхновой</span>
                </button>
              )}

              {/* Stop Velocity (v = 0) */}
              <button
                onClick={() => {
                  if (onStopVelocity) onStopVelocity();
                  setContextMenu(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between transition text-left"
              >
                <span className="flex items-center gap-2">
                  <Target size={13} className="text-emerald-400" />
                  <span>Остановить (v = 0)</span>
                </span>
                <span className="text-[9px] text-slate-500">[X]</span>
              </button>

              <div className="h-[1px] bg-slate-800/80 my-1" />

              {/* Delete Body */}
              <button
                onClick={() => {
                  if (onDeleteBody) onDeleteBody();
                  setContextMenu(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 flex items-center justify-between transition text-left"
              >
                <span className="flex items-center gap-2">
                  <Trash2 size={13} className="text-rose-400" />
                  <span>Удалить объект</span>
                </span>
                <span className="text-[9px] text-slate-500">[Del]</span>
              </button>
            </>
          ) : (
            <>
              {/* Space Context Menu Header */}
              <div className="px-2.5 py-1 border-b border-slate-800/80 mb-1 text-[10px] text-slate-400 uppercase tracking-wider">
                Координаты [{Math.round(contextMenu.worldPos.x)}, {Math.round(contextMenu.worldPos.y)}]
              </div>

              {/* Spawn Star Here */}
              <button
                onClick={() => {
                  onSaveSnapshot?.('Создание новой звезды');
                  const newStar = createBody({
                    name: `Звезда SG-${Math.floor(Math.random() * 800 + 100)}`,
                    x: contextMenu.worldPos.x,
                    y: contextMenu.worldPos.y,
                    vx: 0,
                    vy: 0,
                    mass: spawnMass
                  });
                  setBodies(prev => [...prev, newStar]);
                  setSelectedBody(newStar);
                  sound.playSpawn();
                  setContextMenu(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-amber-300 flex items-center gap-2 transition text-left"
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>Создать звезду здесь</span>
              </button>

              {/* Spawn Black Hole Here */}
              <button
                onClick={() => {
                  onSaveSnapshot?.('Создание черной дыры');
                  const bh = createBody({
                    name: `Черная дыра BH-${Math.floor(Math.random() * 800 + 100)}`,
                    x: contextMenu.worldPos.x,
                    y: contextMenu.worldPos.y,
                    vx: 0,
                    vy: 0,
                    mass: Math.max(3.5, spawnMass),
                    remnantType: 'black_hole',
                    isRemnant: true
                  });
                  setBodies(prev => [...prev, bh]);
                  setSelectedBody(bh);
                  sound.playSpawn();
                  setContextMenu(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-purple-950/60 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition text-left"
              >
                <CircleDot size={13} className="text-purple-400" />
                <span>Создать черную дыру</span>
              </button>

              {/* Spawn Gas Cloud Here */}
              <button
                onClick={() => {
                  if (onGenerateNebulaAt) {
                    onGenerateNebulaAt(contextMenu.worldPos.x, contextMenu.worldPos.y);
                  }
                  setContextMenu(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-sky-300 flex items-center gap-2 transition text-left"
              >
                <CloudDrizzle size={13} className="text-sky-400" />
                <span>Создать облако газа</span>
              </button>

              <div className="h-[1px] bg-slate-800/80 my-1" />

              {/* Reset Camera to Center */}
              <button
                onClick={() => {
                  setCamera({ x: 0, y: 0, zoom: 1.0 });
                  setContextMenu(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-between transition text-left"
              >
                <span className="flex items-center gap-2">
                  <Compass size={13} className="text-slate-400" />
                  <span>Центрировать камеру</span>
                </span>
                <span className="text-[9px] text-slate-500">[R]</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Deep Space Navigation & Frustum Culling HUD Badge */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none glass-panel rounded-xl px-3 py-1.5 flex items-center gap-3 text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-200 font-semibold">Сектор [{curSectorX}, {curSectorY}]</span>
        </span>
        <span className="text-slate-600">|</span>
        <span>X: {Math.round(camera.x)} Y: {Math.round(camera.y)}</span>
        <span className="text-slate-600">|</span>
        <span>Зум: {camera.zoom < 0.1 ? camera.zoom.toFixed(3) : camera.zoom.toFixed(2)}x</span>
        <span className="text-slate-600">|</span>
        <span className="text-cyan-300">В поле зрения: {visibleCount} / {bodies.length} тел</span>
      </div>
    </div>
  );
};
