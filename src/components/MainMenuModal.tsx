/**
 * MainMenuModal Component
 * Full-scale, high-fidelity Main Menu for StellarGenesis.
 * Provides intuitive scenario browsing, 3D observatory launcher, physics & graphics config,
 * stellar lifecycle guide, and control cheatsheets with atmospheric cosmic visuals.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  RotateCcw,
  Sparkles,
  Orbit,
  BookOpen,
  Sliders,
  Settings,
  Sun,
  Eye,
  Keyboard,
  Save,
  FolderDown,
  Volume2,
  VolumeX,
  HelpCircle,
  Zap,
  Flame,
  CircleDot,
  Compass,
  Layers,
  ChevronRight,
  Database
} from 'lucide-react';
import { CelestialBody, PresetId, SimulationSettings, PresetInfo } from '../types';
import { PRESETS_CATALOG } from '../physics/presets';
import { sound } from '../physics/audio';

interface MainMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (id: PresetId) => void;
  onClearAll: () => void;
  onOpenGuide: () => void;
  onOpen3D: (body?: CelestialBody) => void;
  currentPreset: PresetId;
  bodies: CelestialBody[];
  settings: SimulationSettings;
  onUpdateSettings: (newSettings: Partial<SimulationSettings>) => void;
  onSaveStorage?: () => void;
  onLoadStorage?: () => void;
  hasSavedStorage?: boolean;
  isInitialLaunch?: boolean;
}

type MainMenuTab = 'presets' | 'observatory' | 'settings' | 'guide' | 'controls' | 'storage';
type PresetFilter = 'all' | 'solar' | 'relativity' | 'orbits';

export const MainMenuModal: React.FC<MainMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  onClearAll,
  onOpenGuide,
  onOpen3D,
  currentPreset,
  bodies,
  settings,
  onUpdateSettings,
  onSaveStorage,
  onLoadStorage,
  hasSavedStorage = false,
  isInitialLaunch = false
}) => {
  const [activeTab, setActiveTab] = useState<MainMenuTab>('presets');
  const [presetFilter, setPresetFilter] = useState<PresetFilter>('all');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 500, y: 300 });

  // Background animated cosmic starfield with subtle mouse parallax
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    let time = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generate multi-spectral stars for backdrop
    const numStars = 180;
    const stars: Array<{
      x: number;
      y: number;
      size: number;
      baseAlpha: number;
      speed: number;
      color: string;
      layer: number;
    }> = [];
    
    // Stellar classification spectral colors (O, B, A, F, G, K, M)
    const spectralColors = [
      '#93c5fd', // O/B: Electric Blue
      '#e0f2fe', // A: Pure White-Blue
      '#fef08a', // F/G: Warm Solar Yellow
      '#fed7aa', // K: Soft Amber
      '#fca5a5', // M: Red Dwarf
      '#c084fc'  // Relativistic Pulsar Violet
    ];

    for (let i = 0; i < numStars; i++) {
      const layer = Math.random() < 0.2 ? 3 : Math.random() < 0.5 ? 2 : 1;
      stars.push({
        x: Math.random() * 1200,
        y: Math.random() * 800,
        size: layer === 3 ? Math.random() * 2.2 + 1.2 : layer === 2 ? Math.random() * 1.4 + 0.8 : Math.random() * 0.9 + 0.4,
        baseAlpha: Math.random() * 0.6 + 0.25,
        speed: Math.random() * 0.006 + 0.002,
        color: spectralColors[Math.floor(Math.random() * spectralColors.length)],
        layer
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      time += 0.015;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Deep space atmospheric multi-radial nebula wash
      const mx = (mousePosRef.current.x / w - 0.5) * 40;
      const my = (mousePosRef.current.y / h - 0.5) * 40;

      // Indigo/Cyan Nebula Core
      const grad1 = ctx.createRadialGradient(
        w * 0.3 + mx * 0.5,
        h * 0.25 + my * 0.5,
        40,
        w * 0.35,
        h * 0.35,
        w * 0.65
      );
      grad1.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
      grad1.addColorStop(0.3, 'rgba(14, 116, 144, 0.25)');
      grad1.addColorStop(0.7, 'rgba(30, 27, 75, 0.18)');
      grad1.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, w, h);

      // Warm Amber Stellar Nursery Wash
      const grad2 = ctx.createRadialGradient(
        w * 0.8 - mx * 0.3,
        h * 0.75 - my * 0.3,
        30,
        w * 0.75,
        h * 0.7,
        w * 0.55
      );
      grad2.addColorStop(0, 'rgba(180, 83, 9, 0.22)');
      grad2.addColorStop(0.5, 'rgba(88, 28, 135, 0.15)');
      grad2.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, w, h);

      // Stars with soft twinkling and parallax depth
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const twinkle = Math.sin(time * 2.8 + i * 1.5) * 0.3 + 0.7;
        const parallaxX = (mx * s.layer * 0.15);
        const parallaxY = (my * s.layer * 0.15);

        const sx = ((s.x + time * s.speed * 20) % 1200) / 1200 * w + parallaxX;
        const sy = (s.y / 800) * h + parallaxY;

        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.min(1.0, s.baseAlpha * twinkle);
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fill();

        // Subtle diffraction spikes on brightest stars
        if (s.size > 2.0 && twinkle > 0.8) {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(sx - s.size * 2.5, sy);
          ctx.lineTo(sx + s.size * 2.5, sy);
          ctx.moveTo(sx, sy - s.size * 2.5);
          ctx.lineTo(sx, sy + s.size * 2.5);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1.0;

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isOpen]);

  // Keyboard shortcut to close [Escape]
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Find featured celestial bodies from the current simulation for 3D inspection
  const primarySun = bodies.find(b => b.planetKey === 'sun' || b.planetKey === 'generic_star') || bodies[0];
  const earthBody = bodies.find(b => b.planetKey === 'earth');
  const saturnBody = bodies.find(b => b.planetKey === 'saturn');
  const marsBody = bodies.find(b => b.planetKey === 'mars');
  const blackHoleBody = bodies.find(b => b.remnantType === 'black_hole' || b.planetKey === 'black_hole');
  const pulsarBody = bodies.find(b => b.remnantType === 'pulsar' || b.planetKey === 'pulsar');

  const handleLaunchPreset = (id: PresetId) => {
    sound.playRedo();
    onSelectPreset(id);
    onClose();
  };

  const handleInspectBody = (b?: CelestialBody) => {
    sound.playRedo();
    onOpen3D(b);
    onClose();
  };

  const handleInspectSpecificWonder = (type: 'sun' | 'earth' | 'saturn' | 'mars' | 'black_hole' | 'pulsar') => {
    sound.playRedo();
    if (type === 'sun') {
      if (primarySun) {
        handleInspectBody(primarySun);
      } else {
        onSelectPreset('solar');
        onClose();
      }
    } else if (type === 'earth') {
      if (earthBody) {
        handleInspectBody(earthBody);
      } else {
        onSelectPreset('solar');
        onClose();
      }
    } else if (type === 'saturn') {
      if (saturnBody) {
        handleInspectBody(saturnBody);
      } else {
        onSelectPreset('solar');
        onClose();
      }
    } else if (type === 'mars') {
      if (marsBody) {
        handleInspectBody(marsBody);
      } else {
        onSelectPreset('solar');
        onClose();
      }
    } else if (type === 'black_hole') {
      if (blackHoleBody) {
        handleInspectBody(blackHoleBody);
      } else {
        onSelectPreset('hyper_bh');
        onClose();
      }
    } else if (type === 'pulsar') {
      if (pulsarBody) {
        handleInspectBody(pulsarBody);
      } else {
        onSelectPreset('crab_pulsar');
        onClose();
      }
    }
  };

  const currentPresetInfo = PRESETS_CATALOG.find(p => p.id === currentPreset);

  // Filtered presets
  const filteredPresets = PRESETS_CATALOG.filter(preset => {
    if (presetFilter === 'solar') return preset.id === 'solar';
    if (presetFilter === 'relativity') return ['crab_pulsar', 'massive_sn', 'hyper_bh', 'binary_accretion'].includes(preset.id);
    if (presetFilter === 'orbits') return ['solar', 'binary_accretion', 'jeans_cloud'].includes(preset.id);
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-2xl animate-fade-in select-none">
      {/* Central Dialog Container */}
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-700/80 bg-slate-900/90 shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_80px_rgba(6,182,212,0.12)] overflow-hidden">
        {/* Animated Background Canvas */}
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className="absolute inset-0 w-full h-full pointer-events-none opacity-70"
        />

        {/* ------------------------------------------------------------------ */}
        {/* Top Header: Brand Identity, Live Telemetry, Primary CTA, Close */}
        {/* ------------------------------------------------------------------ */}
        <header className="relative z-10 px-6 py-5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-950/50 backdrop-blur-md">
          {/* Brand Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-amber-400 p-0.5 shadow-xl shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles size={22} className="text-cyan-300 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight font-sans">
                  StellarGenesis
                </h1>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  Астрофизика & Симуляция
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Эволюция звезд · Релятивистская гравитация N-тел · Фотореалистичная 3D обсерватория
              </p>
            </div>
          </div>

          {/* Right Header Action: Resume Simulation & Close */}
          <div className="flex items-center gap-2.5 self-end md:self-auto">
            <button
              onClick={() => {
                sound.playUiClick();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 hover:from-cyan-400 hover:to-emerald-300 shadow-lg shadow-cyan-500/25 active:scale-95 cursor-pointer"
              title={isInitialLaunch ? 'Войти в симуляцию космоса [ESC]' : 'Вернуться к текущей симуляции [ESC]'}
            >
              <Play size={14} fill="currentColor" />
              <span>{isInitialLaunch ? 'Войти в симуляцию' : 'Продолжить симуляцию'}</span>
              <kbd className="px-1.5 py-0.5 bg-slate-950/30 rounded text-[10px] text-slate-950 font-bold">ESC</kbd>
            </button>

            <button
              onClick={() => {
                sound.playUiClick();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800 transition cursor-pointer"
              title="Закрыть меню"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* Navigation Category Switcher Tabs */}
        {/* ------------------------------------------------------------------ */}
        <nav className="relative z-10 px-6 py-2.5 border-b border-slate-800/60 bg-slate-950/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              sound.playUiClick();
              setActiveTab('presets');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Orbit size={15} />
            <span>Сценарии симуляции</span>
          </button>

          <button
            onClick={() => {
              sound.playUiClick();
              setActiveTab('observatory');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'observatory'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Eye size={15} />
            <span>3D Обсерватория</span>
          </button>

          <button
            onClick={() => {
              sound.playUiClick();
              setActiveTab('settings');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders size={15} />
            <span>Параметры физики</span>
          </button>

          <button
            onClick={() => {
              sound.playUiClick();
              setActiveTab('guide');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen size={15} />
            <span>Атлас эволюции звезд</span>
          </button>

          <button
            onClick={() => {
              sound.playUiClick();
              setActiveTab('controls');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'controls'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Keyboard size={15} />
            <span>Горячие клавиши</span>
          </button>

          <button
            onClick={() => {
              sound.playUiClick();
              setActiveTab('storage');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database size={15} />
            <span>Сохранения & Песочница</span>
          </button>
        </nav>

        {/* ------------------------------------------------------------------ */}
        {/* Main Tab Content Area */}
        {/* ------------------------------------------------------------------ */}
        <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6">
          {/* ============================================================== */}
          {/* TAB 1: SCENARIOS & PRESETS */}
          {/* ============================================================== */}
          {activeTab === 'presets' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white font-sans">
                    Астрономические сценарии и модели
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Выберите готовую модель для мгновенного запуска с рассчитанными орбитами и параметрами массы
                  </p>
                </div>

                {/* Filter Segments */}
                <div className="flex items-center gap-1 p-1 bg-slate-950/70 border border-slate-800 rounded-xl self-start sm:self-auto">
                  <button
                    onClick={() => {
                      sound.playUiClick();
                      setPresetFilter('all');
                    }}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition cursor-pointer ${
                      presetFilter === 'all'
                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Все ({PRESETS_CATALOG.length})
                  </button>
                  <button
                    onClick={() => {
                      sound.playUiClick();
                      setPresetFilter('solar');
                    }}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition cursor-pointer ${
                      presetFilter === 'solar'
                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Солнечная
                  </button>
                  <button
                    onClick={() => {
                      sound.playUiClick();
                      setPresetFilter('relativity');
                    }}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition cursor-pointer ${
                      presetFilter === 'relativity'
                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ОТО & Реликты
                  </button>
                  <button
                    onClick={() => {
                      sound.playUiClick();
                      setPresetFilter('orbits');
                    }}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition cursor-pointer ${
                      presetFilter === 'orbits'
                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Орбиты
                  </button>
                </div>
              </div>

              {/* Scenarios Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPresets.map((preset) => {
                  const isActive = currentPreset === preset.id;
                  const isSolar = preset.id === 'solar';

                  return (
                    <div
                      key={preset.id}
                      className={`group relative rounded-2xl p-4 transition-all flex flex-col justify-between border ${
                        isActive
                          ? 'bg-slate-900/90 border-cyan-500/60 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        {/* Top Metadata Row */}
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span className="text-xl" role="img" aria-label={preset.title}>
                            {preset.icon}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono">
                            <span>{preset.difficulty}</span>
                            {isActive && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-cyan-400 font-bold">Активен</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {preset.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {preset.fullDesc}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                        <button
                          onClick={() => handleLaunchPreset(preset.id)}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            isActive
                              ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/35'
                              : 'bg-slate-800/80 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 border border-slate-700/60'
                          }`}
                        >
                          <Play size={12} fill="currentColor" />
                          <span>{isActive ? 'Перезапустить' : 'Запустить'}</span>
                        </button>

                        {isSolar && (
                          <button
                            onClick={() => handleInspectBody(primarySun)}
                            className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition text-xs font-mono flex items-center gap-1 cursor-pointer"
                            title="Открыть 3D вид Солнечной системы"
                          >
                            <Sun size={14} />
                            <span className="text-[10px] font-bold">3D</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: 3D OBSERVATORY SHOWCASE */}
          {/* ============================================================== */}
          {activeTab === 'observatory' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white font-sans">
                  Фотореалистичная 3D Обсерватория
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Исследуйте небесные тела в пространственном 3D-просмотрщике с честным освещением, грануляцией Солнца, кольцами Сатурна и тенями
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Солнце */}
                <div className="rounded-2xl p-4 bg-slate-950/60 border border-amber-500/30 hover:border-amber-400/60 transition flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="text-2xl">☀️</span>
                      <span className="text-[11px] font-mono text-amber-400">Желтый карлик G2V</span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      Солнце
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Бесшовная фотосфера, конвективные ячейки Бенара, протуберанцы, хромосферное излучение и жаровое марево с честным излучением 360°.
                    </p>
                  </div>
                  <button
                    onClick={() => handleInspectSpecificWonder('sun')}
                    className="mt-4 w-full py-2 px-3 rounded-xl text-xs font-mono font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-amber-950/40"
                  >
                    <Eye size={13} />
                    <span>Осмотреть Солнце в 3D</span>
                  </button>
                </div>

                {/* 2. Земля */}
                <div className="rounded-2xl p-4 bg-slate-950/60 border border-sky-500/30 hover:border-sky-400/60 transition flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="text-2xl">🌍</span>
                      <span className="text-[11px] font-mono text-sky-400">Планета земной группы</span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                      Земля и Луна
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Океанический спекуляр, континентальный рельеф, облачный покров с дифференциальным дрейфом и огни ночных городов.
                    </p>
                  </div>
                  <button
                    onClick={() => handleInspectSpecificWonder('earth')}
                    className="mt-4 w-full py-2 px-3 rounded-xl text-xs font-mono font-bold bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:bg-sky-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-sky-950/40"
                  >
                    <Eye size={13} />
                    <span>Осмотреть Землю в 3D</span>
                  </button>
                </div>

                {/* 3. Сатурн */}
                <div className="rounded-2xl p-4 bg-slate-950/60 border border-yellow-500/30 hover:border-yellow-400/60 transition flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="text-2xl">🪐</span>
                      <span className="text-[11px] font-mono text-yellow-300">Газовый гигант с кольцами</span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-yellow-300 transition-colors">
                      Сатурн и Кольца
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Кольца А, B, C с делением Кассини, 3D ориентация с наклоном оси, честная тень Сатурна на кольца и тени колец на облака.
                    </p>
                  </div>
                  <button
                    onClick={() => handleInspectSpecificWonder('saturn')}
                    className="mt-4 w-full py-2 px-3 rounded-xl text-xs font-mono font-bold bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-yellow-950/40"
                  >
                    <Eye size={13} />
                    <span>Осмотреть Сатурн в 3D</span>
                  </button>
                </div>

                {/* 4. Марс */}
                <div className="rounded-2xl p-4 bg-slate-950/60 border border-rose-500/30 hover:border-rose-400/60 transition flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="text-2xl">🔴</span>
                      <span className="text-[11px] font-mono text-rose-400">Красная планета</span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                      Марс
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Вулкан Олимп, каньоны Долины Маринер, оксидно-железные пустыни и полярные ледяные шапки.
                    </p>
                  </div>
                  <button
                    onClick={() => handleInspectSpecificWonder('mars')}
                    className="mt-4 w-full py-2 px-3 rounded-xl text-xs font-mono font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-rose-950/40"
                  >
                    <Eye size={13} />
                    <span>Осмотреть Марс в 3D</span>
                  </button>
                </div>

                {/* 5. Черная дыра */}
                <div className="rounded-2xl p-4 bg-slate-950/60 border border-purple-500/30 hover:border-purple-400/60 transition flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="text-2xl">🕳️</span>
                      <span className="text-[11px] font-mono text-purple-400">Сингулярность ОТО</span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                      Черная дыра
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Тень Шварцшильда, кольцо Эйнштейна, гравитационное линзирование фоновых звезд и раскаленный аккреционный диск.
                    </p>
                  </div>
                  <button
                    onClick={() => handleInspectSpecificWonder('black_hole')}
                    className="mt-4 w-full py-2 px-3 rounded-xl text-xs font-mono font-bold bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-purple-950/40"
                  >
                    <Eye size={13} />
                    <span>Осмотреть Черную дыру</span>
                  </button>
                </div>

                {/* 6. Пульсар */}
                <div className="rounded-2xl p-4 bg-slate-950/60 border border-indigo-500/30 hover:border-indigo-400/60 transition flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="text-2xl">⚡</span>
                      <span className="text-[11px] font-mono text-indigo-400">Нейтронная звезда</span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      Пульсар
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Сверхплотное ядро, вращение 30 об/с, магнитные полюса и синхротронные релятивистские лучи излучения.
                    </p>
                  </div>
                  <button
                    onClick={() => handleInspectSpecificWonder('pulsar')}
                    className="mt-4 w-full py-2 px-3 rounded-xl text-xs font-mono font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-950/40"
                  >
                    <Eye size={13} />
                    <span>Осмотреть Пульсар</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: PHYSICS & GRAPHICS SETTINGS */}
          {/* ============================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white font-sans">
                  Параметры гравитации, оптики и симуляции
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Настройте фундаментальные константы гравитации, скорость звездной эволюции и графические эффекты
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Physics Constants */}
                <div className="rounded-2xl p-5 bg-slate-950/60 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                    <Sliders size={14} />
                    <span>Фундаментальная физика</span>
                  </h3>

                  {/* Gravity G Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Гравитационная постоянная (G):</span>
                      <span className="text-cyan-400 font-bold">{settings.G.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="5.0"
                      step="0.05"
                      value={settings.G}
                      onChange={(e) => onUpdateSettings({ G: Number(e.target.value) })}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>0.1 (Слабая)</span>
                      <span>1.2 (Стандарт)</span>
                      <span>5.0 (Сверхтяготение)</span>
                    </div>
                  </div>

                  {/* Softening epsilon Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Гравитационное смягчение (ε):</span>
                      <span className="text-cyan-400 font-bold">{settings.softening.toFixed(1)} px</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="25.0"
                      step="0.5"
                      value={settings.softening}
                      onChange={(e) => onUpdateSettings({ softening: Number(e.target.value) })}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500">
                      Предотвращает сингулярности деления на ноль при близких гравитационных сближениях
                    </p>
                  </div>

                  {/* Stellar Evolution Speed */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Скорость звездной эволюции:</span>
                      <span className="text-amber-400 font-bold">{(settings.stellarEvolutionSpeed ?? 1.0).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="5.0"
                      step="0.1"
                      value={settings.stellarEvolutionSpeed ?? 1.0}
                      onChange={(e) => onUpdateSettings({ stellarEvolutionSpeed: Number(e.target.value) })}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500">
                      Ускоряет термоядерное выгорание водорода, гелия и переход к сверхновым
                    </p>
                  </div>
                </div>

                {/* Graphics & Relativistic Visuals */}
                <div className="rounded-2xl p-5 bg-slate-950/60 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                    <Eye size={14} />
                    <span>Визуализация и оптика</span>
                  </h3>

                  <div className="space-y-2.5">
                    {/* Einstein Lensing Toggle */}
                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-900 transition">
                      <div className="pr-2">
                        <span className="text-xs font-bold text-slate-200 block">Гравитационное линзирование ОТО</span>
                        <span className="text-[11px] text-slate-500">Искривление лучей света фоновых звезд вокруг черных дыр</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.enableLensingShader}
                        onChange={(e) => onUpdateSettings({ enableLensingShader: e.target.checked })}
                        className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                      />
                    </label>

                    {/* Orbit Trails */}
                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-900 transition">
                      <div className="pr-2">
                        <span className="text-xs font-bold text-slate-200 block">Траектории орбит (Шлейфы)</span>
                        <span className="text-[11px] text-slate-500">Отображение Кеплеровых кривых и гравитационных трасс</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.showTrails}
                        onChange={(e) => onUpdateSettings({ showTrails: e.target.checked })}
                        className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                      />
                    </label>

                    {/* Spacetime Grid */}
                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-900 transition">
                      <div className="pr-2">
                        <span className="text-xs font-bold text-slate-200 block">Сетка пространства-времени</span>
                        <span className="text-[11px] text-slate-500">Гравитационная воронка прогиба метрики массы</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.showSpacetimeGrid}
                        onChange={(e) => onUpdateSettings({ showSpacetimeGrid: e.target.checked })}
                        className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                      />
                    </label>

                    {/* Sound toggle */}
                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-900 transition">
                      <div className="pr-2">
                        <span className="text-xs font-bold text-slate-200 block">Аудиоэффекты космоса</span>
                        <span className="text-[11px] text-slate-500">Синтез радиопульсаров, грохот сверхновых и аккреция</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.soundEnabled}
                        onChange={(e) => {
                          onUpdateSettings({ soundEnabled: e.target.checked });
                          sound.setEnabled(e.target.checked);
                        }}
                        className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: STELLAR EVOLUTION GUIDE */}
          {/* ============================================================== */}
          {activeTab === 'guide' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white font-sans">
                    Атлас звездной эволюции
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Диаграмма Герцшпрунга — Рассела, стадии ядерного синтеза и конечные продукты гравитационного коллапса
                  </p>
                </div>
                <button
                  onClick={() => {
                    sound.playUiClick();
                    onOpenGuide();
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-500/20 self-start sm:self-auto"
                >
                  <BookOpen size={14} />
                  <span>Открыть полный атлас</span>
                </button>
              </div>

              {/* Evolution Lifecycle Stages Flow */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-cyan-400 font-bold">01. Протозвезда</div>
                  <h4 className="text-sm font-bold text-white">Молекулярное облако</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Неустойчивость Джинса сжимает водород и гелий. Температура ядра возрастает до 10 млн Кельвинов.
                  </p>
                  <div className="text-[10px] font-mono text-cyan-300 pt-2 border-t border-slate-800/80">
                    Tcore: ~10·10⁶ K · Стадия сжатия
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-amber-400 font-bold">02. Главная последовательность</div>
                  <h4 className="text-sm font-bold text-white">Водородный синтез</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Протон-протонный цикл и CNO-цикл. Гидростатическое равновесие между давлением излучения и гравитацией.
                  </p>
                  <div className="text-[10px] font-mono text-amber-300 pt-2 border-t border-slate-800/80">
                    4 ¹H → ⁴He + 2e⁺ + 2νₑ + 26.7 МэВ
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-rose-400 font-bold">03. Красный сверхгигант</div>
                  <h4 className="text-sm font-bold text-white">Синтез гелия и углерода</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ядро исчерпало водород, оболочка раздувается в сотни раз. Тройная гелиевая реакция порождает углерод и кислород.
                  </p>
                  <div className="text-[10px] font-mono text-rose-300 pt-2 border-t border-slate-800/80">
                    3 ⁴He → ¹²C (3α-процесс)
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-purple-400 font-bold">04. Конечный реликт</div>
                  <h4 className="text-sm font-bold text-white">Коллапс ядра</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    В зависимости от массы: Белый карлик (&lt;1.4 M☉), Нейтронный пульсар (1.4–3 M☉) или Черная дыра (&gt;3 M☉).
                  </p>
                  <div className="text-[10px] font-mono text-purple-300 pt-2 border-t border-slate-800/80">
                    Предел Чандрасекара / Оппенгеймера
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: KEYBOARD & CONTROLS CHEATSHEET */}
          {/* ============================================================== */}
          {activeTab === 'controls' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white font-sans">
                  Горячие клавиши и управление песочницей
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Быстрое переключение скоростей, пауза, навигация в 3D и управление историей симуляции
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Simulation Hotkeys */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                    <Play size={13} />
                    <span>Управление симуляцией</span>
                  </h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-300">Пауза / Старт:</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-bold">Space</kbd>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-300">Главное меню:</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-bold">ESC / M</kbd>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-300">Кинематографический режим:</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-bold">H</kbd>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-300">Инструменты 1..6:</span>
                      <span className="text-slate-200">Выбор, Движение, Звезда, Водород, Накачка, Дыра</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-300">Накачка массы / Уменьшение:</span>
                      <span className="text-amber-300 font-bold">+ / -</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-300">Отмена / Повтор:</span>
                      <span className="text-cyan-300 font-bold">Ctrl+Z / Ctrl+Y</span>
                    </div>
                  </div>
                </div>

                {/* 3D Viewport Controls */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                    <Eye size={13} />
                    <span>3D Навигация (Blender-стандарт)</span>
                  </h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-300">Вращение камеры:</span>
                      <span className="text-slate-200">Зажатый ЛКМ / СКМ</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-300">Панорамирование (Pan):</span>
                      <span className="text-slate-200">Shift + ЛКМ</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-300">Плавное зуммирование:</span>
                      <span className="text-slate-200">Колесико мыши</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-300">Клик на планету в небе:</span>
                      <span className="text-amber-300 font-bold">Мгновенный перелет</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-300">Выход из 3D режима:</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-bold">ESC</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: STORAGE & SANDBOX MANAGEMENT */}
          {/* ============================================================== */}
          {activeTab === 'storage' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white font-sans">
                  Сохранение состояния и управление песочницей
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Сохраняйте созданные конфигурации тел в браузере или создавайте чистую пустую песочницу
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LocalStorage Slot */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                      <Save size={14} />
                      <span>Локальное сохранение</span>
                    </h3>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${hasSavedStorage ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-slate-900 text-slate-500'}`}>
                      {hasSavedStorage ? 'Слот занят' : 'Пустой слот'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Сохраняет точные координаты, векторы скоростей, звездные фазы и термодинамический состав всех {bodies.length} тел в LocalStorage вашего браузера.
                  </p>

                  <div className="flex items-center gap-2 pt-2">
                    {onSaveStorage && (
                      <button
                        onClick={() => {
                          sound.playUiClick();
                          onSaveStorage();
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs font-mono transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-950/40"
                      >
                        <Save size={14} />
                        <span>Сохранить текущую систему</span>
                      </button>
                    )}

                    {onLoadStorage && (
                      <button
                        onClick={() => {
                          sound.playUiClick();
                          onLoadStorage();
                          onClose();
                        }}
                        disabled={!hasSavedStorage}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-2 ${
                          hasSavedStorage
                            ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-md shadow-purple-950/40'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <FolderDown size={14} />
                        <span>Загрузить сохранение</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Reset Sandbox */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-rose-950/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-rose-400 font-bold flex items-center gap-1.5">
                      <RotateCcw size={14} />
                      <span>Очистка песочницы</span>
                    </h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Удаляет все существующие тела, газовые частицы и гравитационные трассы. Создает абсолютно пустое пространство для экспериментов с нуля.
                  </p>

                  <button
                    onClick={() => {
                      sound.playUiClick();
                      onClearAll();
                      onClose();
                    }}
                    className="w-full py-2 px-3 rounded-xl text-xs font-mono font-bold bg-rose-950/50 hover:bg-rose-900 border border-rose-500/50 text-rose-200 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-rose-950/40"
                  >
                    <RotateCcw size={14} />
                    <span>Очистить весь космос</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Footer Bar: Persistence, Quick Save/Load & Status */}
        {/* ------------------------------------------------------------------ */}
        <footer className="relative z-10 px-6 py-3.5 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span>Тел в симуляции: <strong className="text-cyan-400">{bodies.length}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Сценарий: <strong className="text-slate-200">{currentPresetInfo?.title || 'Пользовательский'}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Движок: <strong className="text-emerald-400">N-Body Verlet</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              Нажмите <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-300">ESC</kbd> или <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-300">M</kbd> для закрытия
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
