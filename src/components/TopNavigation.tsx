/**
 * Top Navigation & Simulation Control Bar
 */

import React from 'react';
import { Play, Pause, SkipForward, Volume2, VolumeX, RotateCcw, BookOpen, Undo2, Redo2 } from 'lucide-react';
import { PresetId, SimulationSettings } from '../types';
import { PRESETS_CATALOG } from '../physics/presets';
import { sound } from '../physics/audio';

interface TopNavigationProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onStepFrame: () => void;
  settings: SimulationSettings;
  onUpdateSettings: (newSettings: Partial<SimulationSettings>) => void;
  currentPreset: PresetId;
  onSelectPreset: (id: PresetId) => void;
  onClearAll: () => void;
  onOpenGuide: () => void;
  bodiesCount: number;
  particlesCount: number;
  fps: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  undoTooltip?: string;
  redoTooltip?: string;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  isPaused,
  onTogglePause,
  onStepFrame,
  settings,
  onUpdateSettings,
  currentPreset,
  onSelectPreset,
  onClearAll,
  onOpenGuide,
  bodiesCount,
  particlesCount,
  fps,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  undoTooltip,
  redoTooltip
}) => {
  const timeSpeeds = [0.5, 1, 5, 50, 1000];

  const handleToggleSound = () => {
    const next = sound.toggle();
    onUpdateSettings({ soundEnabled: next });
  };

  return (
    <header className="absolute top-3 left-0 right-0 flex items-center justify-center pointer-events-none z-30 px-4">
      {/* Central Floating Playback & Telemetry HUD */}
      <div className="glass-panel px-3 py-1.5 rounded-2xl pointer-events-auto flex items-center gap-2.5 shadow-2xl">
        {/* Play/Pause & Step */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          <button
            onClick={onTogglePause}
            title="Пауза / Воспроизведение (Space)"
            className={`px-3 py-1.5 text-xs rounded-lg font-mono font-semibold transition flex items-center gap-1.5 ${
              isPaused
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/30'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/30'
            }`}
          >
            {isPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
            <span className="hidden sm:inline">{isPaused ? 'Старт' : 'Пауза'}</span>
          </button>

          <button
            onClick={onStepFrame}
            title="Шаг на 1 кадр вперед"
            className="p-1.5 text-xs rounded-lg transition text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Undo / Redo History Controls */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title={undoTooltip ? `Отменить: ${undoTooltip} (Ctrl+Z)` : 'Отменить последнее действие (Ctrl+Z)'}
            className={`px-2 py-1.5 text-xs rounded-lg font-mono font-medium transition flex items-center gap-1.5 ${
              canUndo
                ? 'text-slate-200 hover:text-amber-300 hover:bg-slate-800 active:scale-95 cursor-pointer'
                : 'text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <Undo2 size={13} className={canUndo ? 'text-amber-400' : 'text-slate-600'} />
            <span className="hidden md:inline text-[11px]">Отмена</span>
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            title={redoTooltip ? `Повторить: ${redoTooltip} (Ctrl+Y)` : 'Повторить действие (Ctrl+Y)'}
            className={`px-2 py-1.5 text-xs rounded-lg font-mono font-medium transition flex items-center gap-1.5 ${
              canRedo
                ? 'text-slate-200 hover:text-cyan-300 hover:bg-slate-800 active:scale-95 cursor-pointer'
                : 'text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <Redo2 size={13} className={canRedo ? 'text-cyan-400' : 'text-slate-600'} />
            <span className="hidden md:inline text-[11px]">Повтор</span>
          </button>
        </div>

        {/* Speed presets */}
        <div className="hidden sm:flex items-center gap-0.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          {timeSpeeds.map((sp) => {
            const isActive = settings.timeSpeed === sp;
            return (
              <button
                key={sp}
                onClick={() => onUpdateSettings({ timeSpeed: sp })}
                className={`px-2 py-1 text-[11px] rounded-lg font-mono transition ${
                  isActive
                    ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-cyan-200'
                }`}
              >
                {sp >= 1000 ? '1000x' : `${sp}x`}
              </button>
            );
          })}
        </div>

        {/* Sound toggle */}
        <button
          onClick={handleToggleSound}
          title={settings.soundEnabled ? 'Выключить звук' : 'Включить звук'}
          className="p-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 hover:text-cyan-300 transition"
        >
          {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} className="text-slate-500" />}
        </button>

        {/* Telemetry counters */}
        <div className="hidden md:flex items-center gap-2.5 text-[11px] font-mono border-l border-slate-800 pl-2.5">
          <div>
            <span className="text-slate-500">Тел:</span>{' '}
            <span className="text-cyan-400 font-bold">{bodiesCount}</span>
          </div>
          <div>
            <span className="text-slate-500">Газ:</span>{' '}
            <span className="text-amber-400 font-bold">{particlesCount}</span>
          </div>
          <div>
            <span className="text-slate-500">FPS:</span>{' '}
            <span className="text-emerald-400 font-bold">{fps}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
