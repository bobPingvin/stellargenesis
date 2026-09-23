/**
 * QuickDock Component
 * Fast, bottom-anchored floating dock for immediate tool selection and direct object controls.
 * Eliminates the need to open menus to switch tools or perform quick manipulations on bodies.
 */

import React, { useState } from 'react';
import {
  MousePointer,
  Move,
  Sparkles,
  CloudDrizzle,
  Syringe,
  CircleDot,
  Crosshair,
  Zap,
  Flame,
  Trash2,
  Play,
  Pause,
  Sliders,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { ToolType, CelestialBody } from '../types';

interface QuickDockProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  selectedBody: CelestialBody | null;
  followingBody: CelestialBody | null;
  onToggleFollow: () => void;
  onPumpMass: () => void;
  onFeedBlackHole?: (amount: number) => void;
  onTriggerSupernova: () => void;
  onDeleteBody: () => void;
  spawnMass: number;
  onUpdateSpawnMass: (mass: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onOpenMenu?: () => void;
}

export const QuickDock: React.FC<QuickDockProps> = ({
  currentTool,
  onSelectTool,
  selectedBody,
  followingBody,
  onToggleFollow,
  onPumpMass,
  onFeedBlackHole,
  onTriggerSupernova,
  onDeleteBody,
  spawnMass,
  onUpdateSpawnMass,
  isPaused,
  onTogglePause,
  onOpenMenu
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showMassSlider, setShowMassSlider] = useState<boolean>(false);

  const tools: { id: ToolType; key: string; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'select',
      key: '1',
      label: 'Выбор',
      icon: <MousePointer size={15} />,
      color: 'text-cyan-400'
    },
    {
      id: 'move',
      key: '2',
      label: 'Захват',
      icon: <Move size={15} />,
      color: 'text-emerald-400'
    },
    {
      id: 'spawn_star',
      key: '3',
      label: 'Звезда',
      icon: <Sparkles size={15} />,
      color: 'text-amber-400'
    },
    {
      id: 'spawn_gas',
      key: '4',
      label: 'Водород',
      icon: <CloudDrizzle size={15} />,
      color: 'text-sky-400'
    },
    {
      id: 'pump_mass',
      key: '5',
      label: 'Накачка',
      icon: <Syringe size={15} />,
      color: 'text-rose-400'
    },
    {
      id: 'spawn_blackhole',
      key: '6',
      label: 'Дыра',
      icon: <CircleDot size={15} />,
      color: 'text-purple-400'
    }
  ];

  const quickMassOptions = [0.5, 1.0, 3.0, 8.0, 25.0];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none select-none max-w-[95vw]">
      {/* Mass adjustment popover if star or black hole is selected tool */}
      {(currentTool === 'spawn_star' || currentTool === 'spawn_blackhole' || showMassSlider) && (
        <div className="glass-panel px-3 py-1.5 rounded-2xl flex items-center gap-3 text-xs pointer-events-auto border border-amber-500/30 shadow-xl animate-fade-in">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-300">
            <span>Масса создания:</span>
            <span className="font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded-lg border border-amber-500/40">
              {spawnMass.toFixed(1)} M☉
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="35"
            step="0.2"
            value={spawnMass}
            onChange={(e) => onUpdateSpawnMass(parseFloat(e.target.value))}
            className="w-28 sm:w-36 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="hidden sm:flex items-center gap-1">
            {quickMassOptions.map((qm) => (
              <button
                key={qm}
                onClick={() => onUpdateSpawnMass(qm)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                  Math.abs(spawnMass - qm) < 0.1
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {qm}M
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Object Mini-Action Bar (appears directly above dock when an object is selected) */}
      {selectedBody && (
        <div className="glass-panel px-3 py-1.5 rounded-2xl flex items-center gap-2 pointer-events-auto border border-cyan-500/40 shadow-2xl animate-fade-in bg-slate-950/85">
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-slate-100 truncate max-w-[120px]">{selectedBody.name}</span>
            <span className="text-[10px] text-amber-400">({selectedBody.mass.toFixed(1)} M☉)</span>
          </div>

          {/* Follow Button */}
          <button
            onClick={onToggleFollow}
            title="Следить камерой [F]"
            className={`px-2 py-1 rounded-xl text-xs font-mono transition flex items-center gap-1 ${
              followingBody?.id === selectedBody.id
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Crosshair size={12} />
            <span className="text-[11px]">{followingBody?.id === selectedBody.id ? 'Слежение вкл' : 'Следить'}</span>
            <span className="text-[9px] opacity-60 ml-0.5">[F]</span>
          </button>

          {/* Quick Mass Pump */}
          {selectedBody.remnantType === 'black_hole' ? (
            <button
              onClick={() => onFeedBlackHole ? onFeedBlackHole(25) : onPumpMass()}
              title="Влить массу +25 M☉"
              className="px-2 py-1 rounded-xl bg-purple-950/80 border border-purple-500/50 text-purple-200 hover:bg-purple-900 text-xs font-mono transition flex items-center gap-1"
            >
              <Zap size={12} className="text-purple-400" />
              <span className="text-[11px]">+25 M☉</span>
            </button>
          ) : (
            <button
              onClick={onPumpMass}
              title="Накачать массу +2.0 M☉ [+]"
              className="px-2 py-1 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 hover:bg-amber-900 text-xs font-mono transition flex items-center gap-1"
            >
              <Zap size={12} className="text-amber-400" />
              <span className="text-[11px]">+2.0 M☉</span>
              <span className="text-[9px] opacity-60">[+]</span>
            </button>
          )}

          {/* Supernova for Stars */}
          {!selectedBody.isRemnant && (
            <button
              onClick={onTriggerSupernova}
              title="Вспышка Сверхновой"
              className="px-2 py-1 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 hover:bg-rose-900 text-xs font-mono transition flex items-center gap-1"
            >
              <Flame size={12} className="text-rose-400" />
              <span className="text-[11px]">Сверхновая</span>
            </button>
          )}

          {/* Delete Object */}
          <button
            onClick={onDeleteBody}
            title="Удалить объект [Del]"
            className="p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* Main Bottom Dock Bar */}
      <div className="glass-panel p-1.5 rounded-2xl flex items-center gap-1 pointer-events-auto shadow-2xl border border-slate-700/60 bg-slate-950/90 backdrop-blur-xl">
        {/* Toggle Pause Quick Button */}
        <button
          onClick={onTogglePause}
          title="Пауза / Старт [Пробел]"
          className={`p-2 rounded-xl transition flex items-center justify-center ${
            isPaused
              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold shadow-md shadow-amber-500/30'
              : 'bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          {isPaused ? <Play size={15} fill="currentColor" /> : <Pause size={15} fill="currentColor" />}
        </button>

        <div className="w-[1px] h-6 bg-slate-800 mx-1" />

        {/* Tool Action Buttons */}
        <div className="flex items-center gap-1">
          {tools.map((t) => {
            const isActive = currentTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelectTool(t.id)}
                title={`${t.label} [${t.key}]`}
                className={`relative px-2.5 py-1.5 rounded-xl text-xs font-mono transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-cyan-950/90 border border-cyan-400 text-cyan-200 font-bold shadow-lg shadow-cyan-950/60 scale-[1.03]'
                    : 'bg-slate-900/60 border border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <span className={isActive ? 'text-cyan-300' : t.color}>{t.icon}</span>
                <span className="hidden sm:inline text-[11px]">{t.label}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                    isActive ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-500 border border-slate-800'
                  }`}
                >
                  {t.key}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-[1px] h-6 bg-slate-800 mx-1" />

        {/* Drawer Menu Quick-Trigger */}
        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            title="Все сценарии, туманности и настройки симуляции"
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-800 text-xs font-mono transition flex items-center gap-1.5"
          >
            <Sliders size={13} className="text-cyan-400" />
            <span className="hidden md:inline text-[11px]">Меню</span>
          </button>
        )}
      </div>

      {/* Direct Dragging Helper Hint */}
      <div className="text-[10px] font-mono text-slate-400/80 px-3 py-0.5 rounded-full bg-slate-950/60 border border-slate-800/60 pointer-events-none backdrop-blur-md hidden sm:block">
        ✨ <span className="text-slate-200 font-semibold">Прямой захват:</span> хватайте и перетаскивайте любое тело сразу мышью без переключения!
      </div>
    </div>
  );
};
