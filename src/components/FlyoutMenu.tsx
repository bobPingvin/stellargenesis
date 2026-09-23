/**
 * FlyoutMenu Component
 * Comprehensive slide-out drawer housing all tools, presets, nebula generator, physics settings, and guide.
 * Opens upon clicking or hovering the side button, keeping the canvas clean and uncluttered.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  X,
  Pin,
  PinOff,
  MousePointer,
  Move,
  Sun,
  Cloud,
  Flame,
  CircleDot,
  Play,
  RotateCcw,
  BookOpen,
  Sliders,
  Sparkles,
  Layers,
  Volume2,
  VolumeX,
  Compass,
  Gauge
} from 'lucide-react';
import {
  ToolType,
  PresetId,
  SimulationSettings,
  NebulaConfig,
  NebulaPresetType
} from '../types';
import { PRESETS_CATALOG } from '../physics/presets';
import { NEBULA_PRESETS } from '../physics/perlinNoise';
import { sound } from '../physics/audio';

interface FlyoutMenuProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  spawnMass: number;
  onUpdateSpawnMass: (mass: number) => void;
  currentPreset: PresetId;
  onSelectPreset: (id: PresetId) => void;
  settings: SimulationSettings;
  onUpdateSettings: (newSettings: Partial<SimulationSettings>) => void;
  nebulaConfig: NebulaConfig;
  onUpdateNebulaConfig: (config: Partial<NebulaConfig>) => void;
  nebulaSpawnMode: 'perlin' | 'spray';
  onToggleNebulaSpawnMode: (mode: 'perlin' | 'spray') => void;
  onGenerateNebula: () => void;
  onClearAll: () => void;
  onOpenGuide: () => void;
  onResetCamera: () => void;
}

type TabKey = 'tools' | 'presets' | 'nebula' | 'physics';

export const FlyoutMenu: React.FC<FlyoutMenuProps> = ({
  currentTool,
  onSelectTool,
  spawnMass,
  onUpdateSpawnMass,
  currentPreset,
  onSelectPreset,
  settings,
  onUpdateSettings,
  nebulaConfig,
  onUpdateNebulaConfig,
  nebulaSpawnMode,
  onToggleNebulaSpawnMode,
  onGenerateNebula,
  onClearAll,
  onOpenGuide,
  onResetCamera
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabKey>('tools');
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Quick mass presets for star spawner
  const quickMasses = [
    { label: '0.2 M☉ Карлик', mass: 0.2 },
    { label: '1.0 M☉ Солнце', mass: 1.0 },
    { label: '3.5 M☉ Сириус', mass: 3.5 },
    { label: '12 M☉ Гигант', mass: 12.0 },
    { label: '30 M☉ Сверхгигант', mass: 30.0 }
  ];

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 450);
  };

  const handleToggleOpen = () => {
    setIsOpen(prev => !prev);
  };

  const handleTogglePin = () => {
    setIsPinned(prev => !prev);
    if (!isPinned) setIsOpen(true);
  };

  // Close with Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isPinned) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPinned]);

  const toolsList: { id: ToolType; label: string; icon: React.ReactNode; desc: string; key: string }[] = [
    {
      id: 'select',
      label: 'Выбор и Инспектор',
      icon: <MousePointer size={15} />,
      desc: 'Выбор небесного тела и просмотр его термоядерного спектра',
      key: '1'
    },
    {
      id: 'move',
      label: 'Гравитационный захват',
      icon: <Move size={15} />,
      desc: 'Перемещение звезд и планет лучом тяготения',
      key: '2'
    },
    {
      id: 'spawn_star',
      label: 'Создать звезду',
      icon: <Sun size={15} />,
      desc: 'Запуск новой звезды с вектором начальной орбитальной скорости',
      key: '3'
    },
    {
      id: 'spawn_gas',
      label: 'Облако газа (Туманность)',
      icon: <Cloud size={15} />,
      desc: 'Спавн протозвездного водородного облака для аккреции',
      key: '4'
    },
    {
      id: 'pump_mass',
      label: 'Накачка массы',
      icon: <Flame size={15} />,
      desc: 'Впрыск водородного топлива для провокации коллапса',
      key: '5'
    },
    {
      id: 'spawn_blackhole',
      label: 'Черная дыра (Сингулярность)',
      icon: <CircleDot size={15} />,
      desc: 'Создать релятивистскую черную дыру с аккреционным диском',
      key: '6'
    }
  ];

  return (
    <div
      className="fixed top-0 left-0 bottom-0 z-40 pointer-events-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Floating Trigger Button (Top-Left) */}
      <div className="absolute top-3 left-3 pointer-events-auto">
        <button
          onClick={handleToggleOpen}
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl transition-all duration-200 shadow-2xl ${
            isOpen
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-cyan-500/30'
              : 'glass-panel text-slate-200 hover:text-white hover:border-cyan-500/50 hover:bg-slate-900/90'
          }`}
          title="Открыть главное меню и инструменты (Tab / 1-6)"
        >
          <Menu size={16} className={isOpen ? 'text-slate-950' : 'text-cyan-400'} />
          <span className="text-xs font-mono font-medium tracking-wide">
            {isOpen ? 'Панель управления' : 'Меню & Инструменты'}
          </span>
          {!isOpen && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-mono">
              1-6
            </span>
          )}
        </button>
      </div>

      {/* Flyout Slide-out Drawer */}
      <div
        ref={drawerRef}
        className={`pointer-events-auto absolute top-0 left-0 bottom-0 w-88 max-w-[90vw] bg-slate-950/95 backdrop-blur-2xl border-r border-slate-800/80 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 via-amber-400 to-rose-500 flex items-center justify-center p-0.5">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-cyan-400 text-xs font-bold">
                ✦
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm tracking-wider uppercase text-cyan-300">
                  StellarGenesis
                </h1>
                <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-mono">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Эволюция звезд & гравитационный коллапс
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleTogglePin}
              className={`p-1.5 rounded-lg text-xs transition ${
                isPinned
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={isPinned ? 'Открепить авто-скрытие меню' : 'Закрепить меню открытым'}
            >
              {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Закрыть меню (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-slate-950/60 border-b border-slate-800/80">
          <button
            onClick={() => setActiveTab('tools')}
            className={`py-1.5 text-[11px] font-mono rounded-lg flex flex-col items-center gap-1 transition ${
              activeTab === 'tools'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sliders size={13} />
            <span>Орудия</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-1.5 text-[11px] font-mono rounded-lg flex flex-col items-center gap-1 transition ${
              activeTab === 'presets'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers size={13} />
            <span>Сценарии</span>
          </button>
          <button
            onClick={() => setActiveTab('nebula')}
            className={`py-1.5 text-[11px] font-mono rounded-lg flex flex-col items-center gap-1 transition ${
              activeTab === 'nebula'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sparkles size={13} />
            <span>Перлин</span>
          </button>
          <button
            onClick={() => setActiveTab('physics')}
            className={`py-1.5 text-[11px] font-mono rounded-lg flex flex-col items-center gap-1 transition ${
              activeTab === 'physics'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Gauge size={13} />
            <span>Физика</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: GOD TOOLS */}
          {activeTab === 'tools' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono flex items-center justify-between">
                  <span>Инструменты взаимодействия</span>
                  <span className="text-[10px] text-slate-500">Клавиши 1–6</span>
                </h3>
                <div className="space-y-1.5">
                  {toolsList.map(tool => {
                    const isSelected = currentTool === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => onSelectTool(tool.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition flex items-start gap-3 ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-500/60 text-white shadow-lg shadow-cyan-950/40'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {tool.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium font-mono">{tool.label}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                              {tool.key}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                            {tool.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Star Mass Configuration (Active when spawn_star is selected) */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200">Масса создаваемой звезды</span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {spawnMass.toFixed(1)} M☉
                  </span>
                </div>

                <input
                  type="range"
                  min="0.1"
                  max="40"
                  step="0.1"
                  value={spawnMass}
                  onChange={e => onUpdateSpawnMass(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />

                {/* Quick mass chips */}
                <div className="flex flex-wrap gap-1">
                  {quickMasses.map(qm => (
                    <button
                      key={qm.mass}
                      onClick={() => onUpdateSpawnMass(qm.mass)}
                      className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition ${
                        Math.abs(spawnMass - qm.mass) < 0.1
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {qm.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRESETS / SCENARIOS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Готовые астрофизические сценарии
              </h3>
              <div className="space-y-2">
                {PRESETS_CATALOG.map(p => {
                  const isActive = currentPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onSelectPreset(p.id)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                        isActive
                          ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-950/40'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{p.title}</span>
                          {isActive && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500 text-slate-950 font-bold font-mono">
                              АКТИВНО
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{p.shortDesc}</p>
                      </div>
                      <Play size={14} className={isActive ? 'text-cyan-400 shrink-0' : 'text-slate-600 shrink-0'} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PROCEDURAL PERLIN NEBULA GENERATOR */}
          {activeTab === 'nebula' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                  Тип туманности (Шум Перлина)
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(NEBULA_PRESETS) as NebulaPresetType[]).map(typeKey => {
                    const preset = NEBULA_PRESETS[typeKey];
                    const isSelected = nebulaConfig.type === typeKey;
                    return (
                      <button
                        key={typeKey}
                        onClick={() => onUpdateNebulaConfig({ type: typeKey })}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-md'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-xs font-semibold block">{preset.title}</span>
                        <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {preset.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Радиус облака газа</span>
                    <span className="font-mono text-cyan-400">{nebulaConfig.radius} px</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="500"
                    step="10"
                    value={nebulaConfig.radius}
                    onChange={e => onUpdateNebulaConfig({ radius: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Количество частиц</span>
                    <span className="font-mono text-cyan-400">{nebulaConfig.particleDensity}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="450"
                    step="10"
                    value={nebulaConfig.particleDensity}
                    onChange={e => onUpdateNebulaConfig({ particleDensity: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Скорость вихря (Swirl)</span>
                    <span className="font-mono text-cyan-400">{nebulaConfig.swirlVelocity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.05"
                    value={nebulaConfig.swirlVelocity}
                    onChange={e => onUpdateNebulaConfig({ swirlVelocity: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Action */}
              <button
                onClick={onGenerateNebula}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs font-mono shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition"
              >
                <Sparkles size={14} />
                <span>Сгенерировать в центре экрана</span>
              </button>
            </div>
          )}

          {/* TAB 4: PHYSICS & SIMULATION SETTINGS */}
          {activeTab === 'physics' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Параметры гравитации & рендеринга
              </h3>

              {/* Performance & Graphics Presets */}
              <div className="space-y-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-300 font-semibold">Качество графики & FPS</span>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase">
                    {settings.graphicsQuality || 'balanced'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'performance', label: '60+ FPS', desc: 'Быстро' },
                    { id: 'balanced', label: 'Баланс', desc: 'Стандарт' },
                    { id: 'ultra', label: 'Ультра', desc: 'Эффекты' }
                  ].map(q => {
                    const isQActive = (settings.graphicsQuality || 'balanced') === q.id;
                    return (
                      <button
                        key={q.id}
                        onClick={() => onUpdateSettings({
                          graphicsQuality: q.id as 'performance' | 'balanced' | 'ultra',
                          maxParticles: q.id === 'performance' ? 350 : q.id === 'balanced' ? 800 : 1500,
                          enableLensingShader: q.id !== 'performance'
                        })}
                        className={`py-1.5 px-2 rounded-lg border text-center transition ${
                          isQActive
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-[11px] leading-none">{q.label}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{q.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Лимит частиц материи</span>
                    <span className="font-mono text-cyan-400">{settings.maxParticles ?? 800}</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="1500"
                    step="50"
                    value={settings.maxParticles ?? 800}
                    onChange={e => onUpdateSettings({ maxParticles: parseInt(e.target.value, 10) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Гравитационная постоянная (G)</span>
                    <span className="font-mono text-cyan-400">{settings.G.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={settings.G}
                    onChange={e => onUpdateSettings({ G: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Смягчение сингулярности (Softening)</span>
                    <span className="font-mono text-cyan-400">{settings.softening.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={settings.softening}
                    onChange={e => onUpdateSettings({ softening: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Скорость звездной эволюции</span>
                    <span className="font-mono text-cyan-400">{settings.stellarEvolutionSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="5.0"
                    step="0.2"
                    value={settings.stellarEvolutionSpeed}
                    onChange={e => onUpdateSettings({ stellarEvolutionSpeed: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Сетка метрики пространства-времени</span>
                  <input
                    type="checkbox"
                    checked={settings.showSpacetimeGrid !== false}
                    onChange={e => onUpdateSettings({ showSpacetimeGrid: e.target.checked })}
                    className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>WebGL шейдер гравитационного линзирования</span>
                  <input
                    type="checkbox"
                    checked={settings.enableLensingShader !== false}
                    onChange={e => onUpdateSettings({ enableLensingShader: e.target.checked })}
                    className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Звездная эволюция и нуклеосинтез</span>
                  <input
                    type="checkbox"
                    checked={settings.stellarEvolution}
                    onChange={e => onUpdateSettings({ stellarEvolution: e.target.checked })}
                    className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Следы орбит (Orbital Trails)</span>
                  <input
                    type="checkbox"
                    checked={settings.showTrails}
                    onChange={e => onUpdateSettings({ showTrails: e.target.checked })}
                    className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Векторы скоростей тел</span>
                  <input
                    type="checkbox"
                    checked={settings.showVectors}
                    onChange={e => onUpdateSettings({ showVectors: e.target.checked })}
                    className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Эффект Доплера (Спектральный сдвиг)</span>
                  <input
                    type="checkbox"
                    checked={settings.dopplerEffect}
                    onChange={e => onUpdateSettings({ dopplerEffect: e.target.checked })}
                    className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 space-y-2">
          <button
            onClick={onOpenGuide}
            className="w-full py-2 px-3 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/80 text-xs font-mono flex items-center justify-center gap-2 transition"
          >
            <BookOpen size={14} />
            <span>Гид по эволюции звезд</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onResetCamera}
              className="py-1.5 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center justify-center gap-1.5 transition"
              title="Сбросить масштаб и положение камеры (R)"
            >
              <Compass size={13} />
              <span>Центр (R)</span>
            </button>
            <button
              onClick={onClearAll}
              className="py-1.5 px-2 rounded-xl bg-rose-950/60 border border-rose-500/40 hover:bg-rose-900/60 text-rose-300 text-[11px] font-mono flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw size={13} />
              <span>Очистить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
