/**
 * Top Navigation & Simulation Control Bar
 */

import React from 'react';
import { Play, Pause, SkipForward, Volume2, VolumeX, RotateCcw, BookOpen, Undo2, Redo2, Save, FolderDown, Film, Sparkles } from 'lucide-react';
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
  onSaveStorage?: () => void;
  onLoadStorage?: () => void;
  hasSavedStorage?: boolean;
  isCinematicMode?: boolean;
  onToggleCinematic?: () => void;
  onOpenMainMenu?: () => void;
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
  redoTooltip,
  onSaveStorage,
  onLoadStorage,
  hasSavedStorage = false,
  isCinematicMode = false,
  onToggleCinematic,
  onOpenMainMenu
}) => {
  const timeSpeeds = [0.5, 1, 5, 50, 1000];

  const handleToggleSound = () => {
    const next = sound.toggle();
    onUpdateSettings({ soundEnabled: next });
  };

  return (
    <header className="w-full flex items-center justify-center pointer-events-none pt-3 px-2 sm:px-4">
      {/* Central Floating Playback & Telemetry HUD */}
      <div className="glass-panel px-2.5 sm:px-3 py-1.5 rounded-2xl pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 shadow-2xl max-w-[98vw] overflow-x-auto">
        {/* Main Menu Button */}
        {onOpenMainMenu && (
          <button
            onClick={onOpenMainMenu}
            title="Главное меню (M / ESC)"
            className="px-2.5 sm:px-3 py-1.5 text-xs rounded-xl font-mono font-semibold transition flex items-center gap-1.5 bg-gradient-to-r from-slate-900 to-slate-950 hover:from-cyan-950 hover:to-slate-900 border border-cyan-500/30 hover:border-cyan-400/60 text-slate-200 hover:text-cyan-300 shadow-md active:scale-95 cursor-pointer shrink-0 group"
          >
            <Sparkles size={13} className="text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span className="font-bold">Меню</span>
            <kbd className="hidden sm:inline px-1 py-0.2 bg-slate-800 rounded text-[9px] text-cyan-300 font-mono border border-slate-700">M</kbd>
          </button>
        )}

        {/* Play/Pause & Step */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={onTogglePause}
            title="Пауза / Воспроизведение (Space)"
            className={`px-2.5 sm:px-3 py-1.5 text-xs rounded-lg font-mono font-semibold transition flex items-center gap-1.5 cursor-pointer ${
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
            className="p-1.5 text-xs rounded-lg transition text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Speed presets (0.5x, 1x, 5x, 50x, 1000x) - Always visible! */}
        <div className="flex items-center gap-0.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800 shrink-0">
          {timeSpeeds.map((sp) => {
            const isActive = settings.timeSpeed === sp;
            return (
              <button
                key={sp}
                onClick={() => onUpdateSettings({ timeSpeed: sp })}
                className={`px-1.5 sm:px-2 py-1 text-[11px] rounded-lg font-mono transition cursor-pointer ${
                  isActive
                    ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold shadow-sm shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-cyan-200 hover:bg-slate-900'
                }`}
                title={`Скорость симуляции: ${sp}x`}
              >
                {sp >= 1000 ? '1000x' : `${sp}x`}
              </button>
            );
          })}
        </div>

        {/* Undo / Redo History Controls */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 shrink-0">
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

        {/* LocalStorage Save / Load Controls */}
        <div className="hidden md:flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={onSaveStorage}
            title="Сохранить систему в LocalStorage (Ctrl+S)"
            className="px-2 py-1.5 text-xs rounded-lg font-mono font-medium transition flex items-center gap-1.5 text-slate-200 hover:text-emerald-400 hover:bg-slate-800 active:scale-95 cursor-pointer"
          >
            <Save size={13} className="text-emerald-400" />
            <span className="hidden lg:inline text-[11px]">Сохранить</span>
          </button>

          <button
            onClick={onLoadStorage}
            disabled={!hasSavedStorage}
            title={hasSavedStorage ? 'Загрузить сохраненную систему из LocalStorage' : 'В LocalStorage нет сохраненной системы'}
            className={`px-2 py-1.5 text-xs rounded-lg font-mono font-medium transition flex items-center gap-1.5 ${
              hasSavedStorage
                ? 'text-slate-200 hover:text-purple-300 hover:bg-slate-800 active:scale-95 cursor-pointer'
                : 'text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <FolderDown size={13} className={hasSavedStorage ? 'text-purple-400' : 'text-slate-600'} />
            <span className="hidden lg:inline text-[11px]">Загрузить</span>
          </button>
        </div>

        {/* Sound toggle */}
        <button
          onClick={handleToggleSound}
          title={settings.soundEnabled ? 'Выключить звук' : 'Включить звук'}
          className="p-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 hover:text-cyan-300 transition cursor-pointer shrink-0"
        >
          {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} className="text-slate-500" />}
        </button>

        {/* Cinematic mode toggle */}
        {onToggleCinematic && (
          <button
            onClick={onToggleCinematic}
            title={isCinematicMode ? 'Выйти из кинорежима (H)' : 'Кинематографический режим — скрыть интерфейс (H)'}
            className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              isCinematicMode
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-500/30'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-800'
            }`}
          >
            <Film size={14} className={isCinematicMode ? 'text-slate-950' : 'text-cyan-400'} />
            <span className="hidden xl:inline text-[11px] font-mono">Кино (H)</span>
          </button>
        )}

        {/* Telemetry counters */}
        <div className="hidden lg:flex items-center gap-2.5 text-[11px] font-mono border-l border-slate-800 pl-2.5 shrink-0">
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
