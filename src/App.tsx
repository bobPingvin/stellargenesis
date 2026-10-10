/**
 * StellarGenesis - Main Application Entry
 * Full-scale interactive astrophysics sandbox with modular architecture.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CelestialBody, Particle, CameraState, ToolType, PresetId, SimulationSettings, ToastMessage, NebulaConfig } from './types';
import { buildPresetScenario } from './physics/presets';
import { triggerStarCollapse, createParticle, SPEED_OF_LIGHT } from './physics/engine';
import { sound } from './physics/audio';
import { createSnapshot, cloneBodies, cloneParticles, SimulationSnapshot } from './physics/history';
import { generatePerlinNebulaParticles, NEBULA_PRESETS } from './physics/perlinNoise';
import { Eye } from 'lucide-react';

import { CanvasViewport } from './components/CanvasViewport';
import { TopNavigation } from './components/TopNavigation';
import { FlyoutMenu } from './components/FlyoutMenu';
import { QuickDock } from './components/QuickDock';
import { StarInspector } from './components/StarInspector';
import { EvolutionGuideModal } from './components/EvolutionGuideModal';
import { NotificationToast } from './components/NotificationToast';
import { Celestial3DViewer } from './components/Celestial3DViewer';
import { MainMenuModal } from './components/MainMenuModal';

export default function App() {
  // Core simulation state
  const [bodies, setBodies] = useState<CelestialBody[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [liveSelectedBody, setLiveSelectedBody] = useState<CelestialBody | null>(null);
  const [followingBodyId, setFollowingBodyId] = useState<string | null>(null);
  const [is3DInspectorOpen, setIs3DInspectorOpen] = useState<boolean>(false);
  const [isMainMenuOpen, setIsMainMenuOpen] = useState<boolean>(true); // Launch into Main Menu on startup!
  const [hasStartedSimulation, setHasStartedSimulation] = useState<boolean>(false);

  // Live refs to current state for snapshot capturing
  const bodiesRef = useRef(bodies);
  bodiesRef.current = bodies;
  const particlesRef = useRef(particles);
  particlesRef.current = particles;
  const selectedBodyIdRef = useRef(selectedBodyId);
  selectedBodyIdRef.current = selectedBodyId;
  const followingBodyIdRef = useRef(followingBodyId);
  followingBodyIdRef.current = followingBodyId;
  const isMainMenuOpenRef = useRef(isMainMenuOpen);
  isMainMenuOpenRef.current = isMainMenuOpen;
  const is3DInspectorOpenRef = useRef(is3DInspectorOpen);
  is3DInspectorOpenRef.current = is3DInspectorOpen;

  // History Stacks (Undo / Redo)
  const undoStackRef = useRef<SimulationSnapshot[]>([]);
  const redoStackRef = useRef<SimulationSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [undoTooltip, setUndoTooltip] = useState<string>('');
  const [redoTooltip, setRedoTooltip] = useState<string>('');

  // LocalStorage Persistence
  const STORAGE_KEY = 'stellargenesis_custom_save_v1';
  const [hasSavedStorage, setHasSavedStorage] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('stellargenesis_custom_save_v1'));
    } catch {
      return false;
    }
  });

  // Viewport & Tools
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: 1.0 });
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [spawnMass, setSpawnMass] = useState<number>(1.0);
  const [isPaused, setIsPaused] = useState<boolean>(true); // Paused initially while user is in Main Menu
  const [currentPreset, setCurrentPreset] = useState<PresetId>('solar');
  const [fps, setFps] = useState<number>(60);

  // Settings
  const [settings, setSettings] = useState<SimulationSettings>({
    G: 1.2,
    softening: 8.0,
    timeSpeed: 1,
    showTrails: true,
    showVectors: false,
    soundEnabled: true,
    dopplerEffect: true,
    stellarEvolution: true,
    stellarEvolutionSpeed: 1.0,
    graphicsQuality: 'balanced',
    enableLensingShader: true,
    maxParticles: 800,
    showSpacetimeGrid: true,
    adaptiveGrid: true,
    showBarycenter: true,
    showProminences: true
  });

  // Cinematic / Clean Viewport Mode (Toggle with [H])
  const [isCinematicMode, setIsCinematicMode] = useState<boolean>(false);

  // Procedural Perlin Nebula Generator state
  const [nebulaConfig, setNebulaConfig] = useState<NebulaConfig>({
    type: 'emission_h2',
    radius: 260,
    particleDensity: 220,
    swirlVelocity: 0.85
  });
  const [nebulaSpawnMode, setNebulaSpawnMode] = useState<'perlin' | 'spray'>('perlin');

  const updateNebulaConfig = useCallback((newConfig: Partial<NebulaConfig>) => {
    setNebulaConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // UI Modals & Toasts
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const isGuideOpenRef = useRef(isGuideOpen);
  isGuideOpenRef.current = isGuideOpen;
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Add toast helper
  const addToast = useCallback((title: string, body: string, type: 'supernova' | 'blackhole' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev.slice(-3), { id, title, body, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  // Dismiss toast
  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  /**
   * Records a snapshot into the Undo stack
   */
  const pushSnapshot = useCallback((description: string, customBodies?: CelestialBody[], customParticles?: Particle[]) => {
    const b = customBodies || bodiesRef.current;
    const p = customParticles || particlesRef.current;

    const snapshot = createSnapshot(
      description,
      b,
      p,
      selectedBodyIdRef.current,
      followingBodyIdRef.current
    );

    undoStackRef.current = [...undoStackRef.current.slice(-25), snapshot];
    redoStackRef.current = []; // Clear redo stack on fresh user action
    setCanUndo(true);
    setCanRedo(false);
    setUndoTooltip(description);
    setRedoTooltip('');
  }, []);

  /**
   * Undo last action (Ctrl+Z)
   */
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;

    // Save current live snapshot to Redo stack
    const targetSnapshot = undoStackRef.current.pop()!;
    const redoSnapshot = createSnapshot(
      targetSnapshot.description,
      bodiesRef.current,
      particlesRef.current,
      selectedBodyIdRef.current,
      followingBodyIdRef.current
    );
    redoStackRef.current.push(redoSnapshot);

    // Apply reverted state
    setBodies(cloneBodies(targetSnapshot.bodies));
    setParticles(cloneParticles(targetSnapshot.particles));
    setSelectedBodyId(targetSnapshot.selectedBodyId);
    setFollowingBodyId(targetSnapshot.followingBodyId);

    // Update UI states
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    setRedoTooltip(targetSnapshot.description);
    setUndoTooltip(
      undoStackRef.current.length > 0
        ? undoStackRef.current[undoStackRef.current.length - 1].description
        : ''
    );

    sound.playUndo();
    addToast(
      '↩️ Отмена действия (Ctrl+Z)',
      targetSnapshot.description,
      'info'
    );
  }, [addToast]);

  /**
   * Redo reverted action (Ctrl+Y / Ctrl+Shift+Z)
   */
  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;

    // Pop from redo stack
    const targetSnapshot = redoStackRef.current.pop()!;

    // Save current snapshot to undo stack
    const undoSnapshot = createSnapshot(
      targetSnapshot.description,
      bodiesRef.current,
      particlesRef.current,
      selectedBodyIdRef.current,
      followingBodyIdRef.current
    );
    undoStackRef.current.push(undoSnapshot);

    // Apply target snapshot
    setBodies(cloneBodies(targetSnapshot.bodies));
    setParticles(cloneParticles(targetSnapshot.particles));
    setSelectedBodyId(targetSnapshot.selectedBodyId);
    setFollowingBodyId(targetSnapshot.followingBodyId);

    // Update UI states
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    setUndoTooltip(targetSnapshot.description);
    setRedoTooltip(
      redoStackRef.current.length > 0
        ? redoStackRef.current[redoStackRef.current.length - 1].description
        : ''
    );

    sound.playRedo();
    addToast(
      '↪️ Повтор действия (Ctrl+Y)',
      targetSnapshot.description,
      'info'
    );
  }, [addToast]);

  /**
   * Save current simulation to LocalStorage
   */
  const handleSaveStorage = useCallback(() => {
    try {
      const payload = {
        version: 1,
        timestamp: Date.now(),
        preset: currentPreset,
        bodies: bodiesRef.current,
        particles: particlesRef.current.slice(0, 300),
        camera,
        settings
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setHasSavedStorage(true);
      sound.playMassPump();
      addToast(
        '💾 Сохранено в LocalStorage',
        `Снимок системы (${payload.bodies.length} тел) успешно записан в браузерное хранилище.`,
        'info'
      );
    } catch (err: any) {
      addToast(
        '⚠️ Ошибка сохранения',
        `Не удалось сохранить данные: ${err?.message || 'Превышена квота хранилища'}`,
        'warning'
      );
    }
  }, [currentPreset, camera, settings, addToast]);

  /**
   * Load simulation from LocalStorage
   */
  const handleLoadStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        addToast('⚠️ Запись не найдена', 'В LocalStorage нет сохраненной симуляции.', 'warning');
        return;
      }
      const payload = JSON.parse(raw);
      if (!payload || !Array.isArray(payload.bodies)) {
        throw new Error('Некорректная структура файла');
      }

      pushSnapshot('Загрузка из LocalStorage');
      setBodies(cloneBodies(payload.bodies));
      if (Array.isArray(payload.particles)) {
        setParticles(cloneParticles(payload.particles));
      }
      if (payload.camera) {
        setCamera(payload.camera);
      }
      if (payload.settings) {
        setSettings(prev => ({ ...prev, ...payload.settings }));
      }
      setSelectedBodyId(null);
      setFollowingBodyId(null);

      const timeStr = payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString() : 'недавний';
      addToast(
        '📂 Загружено из LocalStorage',
        `Восстановлено ${payload.bodies.length} тел из снимка (${timeStr}).`,
        'info'
      );
    } catch (err: any) {
      addToast(
        '⚠️ Ошибка загрузки',
        `Сбой чтения LocalStorage: ${err?.message || 'Поврежденные данные'}`,
        'warning'
      );
    }
  }, [pushSnapshot, addToast]);

  // Actions ref to eliminate stale closures in global key listeners
  const actionsRef = useRef({
    handleUndo,
    handleRedo,
    handleSaveStorage,
    handleToggleFollow: () => {},
    handleStopVelocity: () => {},
    handleFeedBlackHole: (_amt: number) => {},
    handlePumpMass: () => {},
    handleReduceMass: () => {},
    handleDeleteBody: () => {},
    handleCloseMainMenu: () => {}
  });

  // Close Main Menu and start simulation if it's the initial launch
  const handleCloseMainMenu = useCallback(() => {
    setIsMainMenuOpen(false);
    if (!hasStartedSimulation) {
      setHasStartedSimulation(true);
      setIsPaused(false);
    }
  }, [hasStartedSimulation]);

  // Load preset scenario
  const loadPreset = useCallback((presetId: PresetId) => {
    if (bodiesRef.current.length > 0) {
      pushSnapshot(`Смена сценария на ${presetId}`);
    }
    const scenario = buildPresetScenario(presetId, settings.G);
    setBodies(scenario.bodies);
    setParticles(scenario.particles);
    setSelectedBodyId(scenario.selectedId);
    setFollowingBodyId(null);
    setCamera({ x: 0, y: 0, zoom: scenario.cameraZoom });
    setCurrentPreset(presetId);
    setHasStartedSimulation(true);
    setIsPaused(false);
    addToast(
      '🪐 Сценарий загружен',
      `Запущена симуляция: ${presetId}`,
      'info'
    );
  }, [settings.G, addToast, pushSnapshot]);

  // Initial load: setup solar system in background ready for entrance
  useEffect(() => {
    const scenario = buildPresetScenario('solar', settings.G);
    setBodies(scenario.bodies);
    setParticles(scenario.particles);
    setSelectedBodyId(scenario.selectedId);
    setFollowingBodyId(null);
    setCamera({ x: 0, y: 0, zoom: scenario.cameraZoom });
    setCurrentPreset('solar');
  }, [settings.G]);

  // Derive selected and following body with real-time live telemetry synchronization
  const selectedBody = (liveSelectedBody && liveSelectedBody.id === selectedBodyId)
    ? liveSelectedBody
    : (bodies.find(b => b.id === selectedBodyId) || null);
  const followingBody = bodies.find(b => b.id === followingBodyId) || null;

  const handleSetSelectedBody = (b: CelestialBody | null) => {
    setSelectedBodyId(b ? b.id : null);
    setLiveSelectedBody(b ? { ...b } : null);
  };

  const handleSyncSelectedBody = useCallback((live: CelestialBody | null) => {
    setLiveSelectedBody(live);
  }, []);

  const handleSetFollowingBody = (b: CelestialBody | null) => {
    setFollowingBodyId(b ? b.id : null);
  };

  // Toggle follow
  const handleToggleFollow = useCallback(() => {
    if (!selectedBody) return;
    if (followingBodyId === selectedBody.id) {
      setFollowingBodyId(null);
    } else {
      setFollowingBodyId(selectedBody.id);
    }
  }, [selectedBody, followingBodyId]);

  // Open 3D inspector from Main Menu
  const handleOpen3DFromMenu = useCallback((body?: CelestialBody) => {
    if (body) {
      setSelectedBodyId(body.id);
      setIs3DInspectorOpen(true);
    } else if (selectedBodyId) {
      setIs3DInspectorOpen(true);
    } else if (bodies.length > 0) {
      const sunOrStar = bodies.find(b => b.planetKey === 'sun' || b.planetKey === 'generic_star') || bodies[0];
      setSelectedBodyId(sunOrStar.id);
      setIs3DInspectorOpen(true);
    }
  }, [selectedBodyId, bodies]);

  // Pump mass into selected body (immutable update)
  const handlePumpMass = useCallback(() => {
    if (!selectedBody) return;
    pushSnapshot(`Накачка массы: ${selectedBody.name}`);
    const newMass = selectedBody.mass + 2.0;
    const newTcore = selectedBody.Tcore + 25.0;
    setBodies(prev => prev.map(b => (b.id === selectedBody.id ? { ...b, mass: newMass, Tcore: newTcore } : b)));
    sound.playMassPump();
    addToast(
      '⚡ Накачка массы',
      `В звезду ${selectedBody.name} закачано +2.0 M☉! Новая масса: ${newMass.toFixed(1)} M☉.`,
      'info'
    );
  }, [selectedBody, pushSnapshot, addToast]);

  // Feed mass & energy directly into black hole (immutable update)
  const handleFeedBlackHole = useCallback((amount: number) => {
    if (!selectedBody) return;
    pushSnapshot(`Поглощение энергии: ${selectedBody.name}`);
    const newMass = selectedBody.mass + amount;
    const rs = (2 * 1.2 * newMass * 12.0) / (SPEED_OF_LIGHT * SPEED_OF_LIGHT);
    const newRadius = Math.max(8.0, rs * 4.0);

    setBodies(prev => prev.map(b => (b.id === selectedBody.id ? { ...b, mass: newMass, radius: newRadius, targetRadius: newRadius } : b)));

    // Spawn infalling swirling relativistic matter particles around black hole
    const infallingCount = Math.min(60, amount * 2);
    const newMatter: Particle[] = [];
    for (let i = 0; i < infallingCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = newRadius * (1.8 + Math.random() * 2.4);
      const speed = Math.sqrt((newMass * 1.5) / dist) * 1.2;
      newMatter.push(createParticle(
        selectedBody.x + Math.cos(angle) * dist,
        selectedBody.y + Math.sin(angle) * dist,
        selectedBody.vx - Math.sin(angle) * speed,
        selectedBody.vy + Math.cos(angle) * speed,
        i % 2 === 0 ? '#fde047' : '#c084fc',
        Math.random() * 3.5 + 1.5,
        Math.random() * 100 + 50,
        true,
        0.02
      ));
    }
    setParticles(prev => [...prev, ...newMatter]);

    sound.playBlackHoleFeed();
    addToast(
      '🌀 Релятивистское поглощение',
      `В черную дыру ${selectedBody.name} влито +${amount} M☉ массы и энергии! Новая масса: ${newMass.toFixed(1)} M☉.`,
      'blackhole'
    );
  }, [selectedBody, pushSnapshot, addToast]);

  // Trigger supernova on selected body
  const handleTriggerSupernova = useCallback(() => {
    if (!selectedBody) return;
    pushSnapshot(`Взрыв сверхновой: ${selectedBody.name}`);
    const nextParticles = [...particlesRef.current];
    triggerStarCollapse(selectedBody, nextParticles, (title, text, type) => {
      addToast(title, text, type);
    });
    setParticles(nextParticles);
    setBodies(prev => prev.map(b => (b.id === selectedBody.id ? { ...b } : b)));
  }, [selectedBody, pushSnapshot, addToast]);

  // Delete selected body
  const handleDeleteBody = useCallback(() => {
    if (!selectedBody) return;
    pushSnapshot(`Удаление тела: ${selectedBody.name}`);
    setBodies(prev => prev.filter(b => b.id !== selectedBody.id));
    if (followingBodyId === selectedBody.id) setFollowingBodyId(null);
    setSelectedBodyId(null);
    setIs3DInspectorOpen(false);
  }, [selectedBody, followingBodyId, pushSnapshot]);

  // Stop velocity of selected body
  const handleStopVelocity = useCallback(() => {
    if (!selectedBody) return;
    pushSnapshot(`Остановка скорости: ${selectedBody.name}`);
    setBodies(prev => prev.map(b => (b.id === selectedBody.id ? { ...b, vx: 0, vy: 0 } : b)));
    sound.playUndo();
    addToast('🛑 Скорость обнулена', `Вектор скорости ${selectedBody.name} остановлен (v = 0).`, 'info');
  }, [selectedBody, pushSnapshot, addToast]);

  // Reduce mass on selected body
  const handleReduceMass = useCallback(() => {
    if (!selectedBody) return;
    if (selectedBody.mass <= 0.2) return;
    pushSnapshot(`Уменьшение массы: ${selectedBody.name}`);
    const newMass = Math.max(0.1, selectedBody.mass - 1.0);
    setBodies(prev => prev.map(b => (b.id === selectedBody.id ? { ...b, mass: newMass } : b)));
    sound.playMassPump();
    addToast('🔻 Снижение массы', `Масса ${selectedBody.name} теперь: ${newMass.toFixed(1)} M☉`, 'info');
  }, [selectedBody, pushSnapshot, addToast]);

  // Update actionsRef synchronously on render
  actionsRef.current = {
    handleUndo,
    handleRedo,
    handleSaveStorage,
    handleToggleFollow,
    handleStopVelocity,
    handleFeedBlackHole,
    handlePumpMass,
    handleReduceMass,
    handleDeleteBody,
    handleCloseMainMenu
  };

  // Clear all
  const handleClearAll = () => {
    if (bodies.length > 0 || particles.length > 0) {
      pushSnapshot('Очистка космоса');
    }
    setBodies([]);
    setParticles([]);
    setSelectedBodyId(null);
    setFollowingBodyId(null);
    addToast('Космос очищен', 'Все тела и туманности удалены.', 'info');
  };

  // Generate Perlin Gas Nebula
  const handleGenerateNebula = useCallback((customX?: number, customY?: number) => {
    const targetX = customX !== undefined ? customX : camera.x;
    const targetY = customY !== undefined ? customY : camera.y;

    const preset = NEBULA_PRESETS[nebulaConfig.type];
    pushSnapshot(`Генерация туманности: ${preset.title}`);

    const { particles: newParticles, info } = generatePerlinNebulaParticles(targetX, targetY, nebulaConfig);

    setParticles(prev => [...prev, ...newParticles]);
    sound.playNebulaBirth();
    addToast(
      `✨ ${info.title}`,
      `${info.subtitle}. Сгенерировано ${newParticles.length} частиц газа на основе шума Перлина.`,
      'info'
    );
  }, [camera.x, camera.y, nebulaConfig, pushSnapshot, addToast]);

  // Global Keyboard Shortcuts (Space, 1-6, F, M, X, Del, +, -, R, Esc, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in text input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const keyLower = e.key.toLowerCase();
      const code = e.code;

      // Check Undo: Ctrl+Z / Cmd+Z (supports English and Russian layout)
      const isZ = keyLower === 'z' || keyLower === 'я' || code === 'KeyZ';
      // Check Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z
      const isY = keyLower === 'y' || keyLower === 'н' || code === 'KeyY';

      if (isCtrlOrCmd && isZ && !e.shiftKey) {
        e.preventDefault();
        actionsRef.current.handleUndo();
        return;
      }

      if (isCtrlOrCmd && (isY || (isZ && e.shiftKey))) {
        e.preventDefault();
        actionsRef.current.handleRedo();
        return;
      }

      // Check Save: Ctrl+S / Cmd+S
      const isS = keyLower === 's' || keyLower === 'ы' || code === 'KeyS';
      if (isCtrlOrCmd && isS) {
        e.preventDefault();
        actionsRef.current.handleSaveStorage();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused(prev => {
          const next = !prev;
          if (next && bodiesRef.current.length > 0) {
            pushSnapshot('Пауза симуляции');
          }
          return next;
        });
      } else if (e.key === '1') {
        setCurrentTool('select');
      } else if (e.key === '2') {
        setCurrentTool('move');
      } else if (e.key === '3') {
        setCurrentTool('spawn_star');
      } else if (e.key === '4') {
        setCurrentTool('spawn_gas');
      } else if (e.key === '5') {
        setCurrentTool('pump_mass');
      } else if (e.key === '6') {
        setCurrentTool('spawn_blackhole');
      } else if (e.key === '7') {
        setCurrentTool('spawn_pulsar');
      } else if (e.code === 'KeyF' || keyLower === 'f' || keyLower === 'а') {
        actionsRef.current.handleToggleFollow();
      } else if (e.code === 'KeyM' || keyLower === 'm' || keyLower === 'ь') {
        setIsMainMenuOpen(prev => !prev);
      } else if (e.code === 'KeyV' || keyLower === 'v' || keyLower === 'м') {
        setCurrentTool('select');
      } else if (e.code === 'KeyX' || keyLower === 'x' || keyLower === 'ч') {
        actionsRef.current.handleStopVelocity();
      } else if (e.key === '+' || e.key === '=' || e.code === 'BracketRight') {
        if (selectedBodyIdRef.current) {
          const cur = bodiesRef.current.find(b => b.id === selectedBodyIdRef.current);
          if (cur?.remnantType === 'black_hole') {
            actionsRef.current.handleFeedBlackHole(25);
          } else {
            actionsRef.current.handlePumpMass();
          }
        }
      } else if (e.key === '-' || e.key === '_' || e.code === 'BracketLeft') {
        actionsRef.current.handleReduceMass();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        actionsRef.current.handleDeleteBody();
      } else if (e.code === 'KeyR' && !isCtrlOrCmd) {
        setCamera({ x: 0, y: 0, zoom: 1.0 });
        setFollowingBodyId(null);
      } else if (e.code === 'KeyH' || keyLower === 'h' || keyLower === 'р') {
        setIsCinematicMode(prev => {
          const next = !prev;
          addToast(
            next ? 'Кинематографический режим' : 'Интерфейс восстановлен',
            next ? 'Все панели скрыты. Нажмите [H] для возврата интерфейса.' : 'Все элементы управления активны.',
            'info'
          );
          return next;
        });
      } else if (e.code === 'Escape') {
        if (isMainMenuOpenRef.current) {
          actionsRef.current.handleCloseMainMenu();
        } else if (is3DInspectorOpenRef.current) {
          setIs3DInspectorOpen(false);
        } else if (isGuideOpenRef.current) {
          setIsGuideOpen(false);
        } else if (selectedBodyIdRef.current) {
          setSelectedBodyId(null);
        } else {
          setIsMainMenuOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pushSnapshot, is3DInspectorOpen]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Simulation Canvas Viewport */}
      <CanvasViewport
        bodies={bodies}
        setBodies={setBodies}
        particles={particles}
        setParticles={setParticles}
        selectedBody={selectedBody}
        setSelectedBody={handleSetSelectedBody}
        followingBody={followingBody}
        setFollowingBody={handleSetFollowingBody}
        camera={camera}
        setCamera={setCamera}
        currentTool={currentTool}
        spawnMass={spawnMass}
        settings={settings}
        isPaused={isPaused}
        nebulaConfig={nebulaConfig}
        nebulaSpawnMode={nebulaSpawnMode}
        onGenerateNebulaAt={handleGenerateNebula}
        onNotification={(title, body, type) => addToast(title, body, type)}
        onFpsUpdate={setFps}
        onSaveSnapshot={pushSnapshot}
        onFeedBlackHole={handleFeedBlackHole}
        onTriggerSupernova={handleTriggerSupernova}
        onDeleteBody={handleDeleteBody}
        onPumpMass={handlePumpMass}
        onStopVelocity={handleStopVelocity}
        onSelectTool={setCurrentTool}
        onInspect3D={(b) => {
          setSelectedBodyId(b.id);
          setIs3DInspectorOpen(true);
        }}
        onSyncSelectedBody={handleSyncSelectedBody}
        isCinematicMode={isCinematicMode}
      />

      {/* Slide-out Flyout Menu (Left drawer housing all tools, scenarios, nebula generator & settings) */}
      <div className={`fixed top-0 left-0 bottom-0 z-40 pointer-events-none transition-all duration-500 ease-in-out ${isCinematicMode ? 'opacity-0 -translate-x-full invisible' : 'opacity-100 translate-x-0'}`}>
        <FlyoutMenu
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          spawnMass={spawnMass}
          onUpdateSpawnMass={setSpawnMass}
          currentPreset={currentPreset}
          onSelectPreset={loadPreset}
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
          nebulaConfig={nebulaConfig}
          onUpdateNebulaConfig={updateNebulaConfig}
          nebulaSpawnMode={nebulaSpawnMode}
          onToggleNebulaSpawnMode={setNebulaSpawnMode}
          onGenerateNebula={() => handleGenerateNebula()}
          onClearAll={handleClearAll}
          onOpenGuide={() => setIsGuideOpen(true)}
          onResetCamera={() => {
            setCamera({ x: 0, y: 0, zoom: 1.0 });
            setFollowingBodyId(null);
          }}
          isCinematicMode={isCinematicMode}
          onOpenMainMenu={() => setIsMainMenuOpen(true)}
        />
      </div>

      {/* Top Floating Playback & Telemetry HUD */}
      <div className={`absolute top-0 left-0 right-0 z-30 pointer-events-none transition-all duration-500 ease-in-out ${isCinematicMode ? 'opacity-0 -translate-y-full invisible' : 'opacity-100 translate-y-0'}`}>
        <TopNavigation
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(prev => {
            const next = !prev;
            if (next && bodies.length > 0) {
              pushSnapshot('Пауза симуляции');
            }
            return next;
          })}
          onStepFrame={() => {
            setIsPaused(true);
            setIsPaused(false);
            setTimeout(() => setIsPaused(true), 35);
          }}
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
          currentPreset={currentPreset}
          onSelectPreset={loadPreset}
          onClearAll={handleClearAll}
          onOpenGuide={() => setIsGuideOpen(true)}
          onOpenMainMenu={() => setIsMainMenuOpen(true)}
          bodiesCount={bodies.length}
          particlesCount={particles.length}
          fps={fps}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          undoTooltip={undoTooltip}
          redoTooltip={redoTooltip}
          onSaveStorage={handleSaveStorage}
          onLoadStorage={handleLoadStorage}
          hasSavedStorage={hasSavedStorage}
          isCinematicMode={isCinematicMode}
          onToggleCinematic={() => {
            setIsCinematicMode(prev => {
              const next = !prev;
              addToast(
                next ? 'Кинематографический режим' : 'Интерфейс восстановлен',
                next ? 'Все панели скрыты. Нажмите [H] для возврата интерфейса.' : 'Все элементы управления активны.',
                'info'
              );
              return next;
            });
          }}
        />
      </div>

      {/* QuickDock: Fast Bottom Tool Switcher & Direct Object Action Bar */}
      <div className={`absolute bottom-0 left-0 right-0 z-30 pointer-events-none transition-all duration-500 ease-in-out ${isCinematicMode ? 'opacity-0 translate-y-full invisible' : 'opacity-100 translate-y-0'}`}>
        <QuickDock
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          selectedBody={selectedBody}
          followingBody={followingBody}
          onToggleFollow={handleToggleFollow}
          onPumpMass={handlePumpMass}
          onFeedBlackHole={handleFeedBlackHole}
          onTriggerSupernova={handleTriggerSupernova}
          onDeleteBody={handleDeleteBody}
          spawnMass={spawnMass}
          onUpdateSpawnMass={setSpawnMass}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(prev => !prev)}
          onOpenMenu={() => setIsMainMenuOpen(true)}
          onOpen3D={() => setIs3DInspectorOpen(true)}
          isCinematicMode={isCinematicMode}
          onToggleCinematic={() => {
            setIsCinematicMode(prev => {
              const next = !prev;
              addToast(
                next ? 'Кинематографический режим' : 'Интерфейс восстановлен',
                next ? 'Все панели скрыты. Нажмите [H] для возврата интерфейса.' : 'Все элементы управления активны.',
                'info'
              );
              return next;
            });
          }}
        />
      </div>

      {/* Detailed Star Inspector (Rendered ONLY when an object is selected) */}
      <div className={`absolute top-0 right-0 bottom-0 z-30 pointer-events-none transition-all duration-500 ease-in-out ${isCinematicMode ? 'opacity-0 translate-x-full invisible' : 'opacity-100 translate-x-0'}`}>
        <StarInspector
          selectedBody={selectedBody}
          followingBody={followingBody}
          evolutionSpeed={settings.stellarEvolutionSpeed ?? 1.0}
          onUpdateEvolutionSpeed={(spd) => setSettings(prev => ({ ...prev, stellarEvolutionSpeed: spd }))}
          onToggleFollow={handleToggleFollow}
          onPumpMass={handlePumpMass}
          onFeedBlackHole={handleFeedBlackHole}
          onTriggerSupernova={handleTriggerSupernova}
          onDeleteBody={handleDeleteBody}
          onClose={() => handleSetSelectedBody(null)}
          onOpen3D={() => setIs3DInspectorOpen(true)}
          isCinematicMode={isCinematicMode}
        />
      </div>

      {/* Cinematic Mode Exit Floating Trigger */}
      {isCinematicMode && (
        <button
          onClick={() => {
            setIsCinematicMode(false);
            addToast('Интерфейс восстановлен', 'Все элементы управления активны.', 'info');
          }}
          className="absolute top-4 right-4 z-50 bg-slate-900/70 hover:bg-slate-900/95 text-slate-300 hover:text-white border border-slate-700/50 hover:border-cyan-500/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2 shadow-2xl transition-all cursor-pointer group opacity-80 hover:opacity-100"
          title="Вернуть интерфейс (клавиша H)"
        >
          <Eye size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>Интерфейс</span>
          <kbd className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-700 rounded text-[10px] text-cyan-300 font-bold">H</kbd>
        </button>
      )}

      {/* 3D Celestial Inspection Fullscreen Overlay */}
      {is3DInspectorOpen && selectedBody && (
        <div className="absolute inset-0 z-40 animate-in fade-in duration-300">
          <Celestial3DViewer
            body={selectedBody}
            allBodies={bodies}
            onSelectBody={(b) => setSelectedBodyId(b.id)}
            onClose={() => setIs3DInspectorOpen(false)}
            isPaused={isPaused}
          />
        </div>
      )}

      {/* Educational Evolution Guide Modal */}
      <EvolutionGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onLaunchPreset={loadPreset}
      />

      {/* High-Fidelity Main Menu Modal */}
      <MainMenuModal
        isOpen={isMainMenuOpen}
        onClose={handleCloseMainMenu}
        onSelectPreset={loadPreset}
        onClearAll={handleClearAll}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpen3D={handleOpen3DFromMenu}
        currentPreset={currentPreset}
        bodies={bodies}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
        onSaveStorage={handleSaveStorage}
        onLoadStorage={handleLoadStorage}
        hasSavedStorage={hasSavedStorage}
        isInitialLaunch={!hasStartedSimulation}
      />

      {/* Notification Toasts */}
      <div className={`transition-all duration-500 ${isCinematicMode ? 'opacity-0 pointer-events-none translate-y-4 invisible' : 'opacity-100 pointer-events-auto'}`}>
        <NotificationToast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  );
}
