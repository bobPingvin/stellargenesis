/**
 * God Toolbar Component
 * Creation modes, mass pump, gas clouds, and gravity tuning.
 */

import React from 'react';
import { Target, Move, Sparkles, CloudDrizzle, Syringe, CircleDot, Sliders, Info, Radio, Layers, Flame } from 'lucide-react';
import { ToolType, SimulationSettings, NebulaConfig } from '../types';
import { NEBULA_PRESETS } from '../physics/perlinNoise';

interface GodToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  spawnMass: number;
  onUpdateSpawnMass: (mass: number) => void;
  settings: SimulationSettings;
  onUpdateSettings: (newSettings: Partial<SimulationSettings>) => void;
  nebulaConfig: NebulaConfig;
  onUpdateNebulaConfig: (newConfig: Partial<NebulaConfig>) => void;
  nebulaSpawnMode: 'perlin' | 'spray';
  onToggleNebulaSpawnMode: (mode: 'perlin' | 'spray') => void;
  onGenerateNebula: () => void;
}

export const GodToolbar: React.FC<GodToolbarProps> = ({
  currentTool,
  onSelectTool,
  spawnMass,
  onUpdateSpawnMass,
  settings,
  onUpdateSettings,
  nebulaConfig,
  onUpdateNebulaConfig,
  nebulaSpawnMode,
  onToggleNebulaSpawnMode,
  onGenerateNebula
}) => {
  const tools = [
    {
      id: 'select' as ToolType,
      label: 'Инспектор & Слежение',
      subtext: 'Кликните на звезду [1]',
      icon: <Target size={17} className="text-cyan-400" />
    },
    {
      id: 'move' as ToolType,
      label: 'Перемещение тела',
      subtext: 'Зажмите и двигайте звезду [2]',
      icon: <Move size={17} className="text-emerald-400" />
    },
    {
      id: 'spawn_star' as ToolType,
      label: 'Создать звезду',
      subtext: 'Потяните вектор скорости [3]',
      icon: <Sparkles size={17} className="text-amber-400" />
    },
    {
      id: 'spawn_gas' as ToolType,
      label: 'Облако водорода',
      subtext: 'Зажмите ЛКМ для распыления [4]',
      icon: <CloudDrizzle size={17} className="text-sky-400" />
    },
    {
      id: 'pump_mass' as ToolType,
      label: 'Накачка массы (ЛКМ)',
      subtext: 'Вдуть массу для коллапса [5]',
      icon: <Syringe size={17} className="text-rose-400" />
    },
    {
      id: 'spawn_blackhole' as ToolType,
      label: 'Черная Дыра',
      subtext: 'Сингулярность с TDE [6]',
      icon: <CircleDot size={17} className="text-purple-400" />
    }
  ];

  const quickMassPresets = [
    { label: '0.5 M☉', val: 0.5, desc: 'Красный карлик' },
    { label: '1.0 M☉', val: 1.0, desc: 'Солнце' },
    { label: '3.0 M☉', val: 3.0, desc: 'Белая звезда' },
    { label: '8.0 M☉', val: 8.0, desc: 'Сверхгигант ➔ Пульсар' },
    { label: '25 M☉', val: 25.0, desc: '➔ Черная Дыра' }
  ];

  return (
    <aside className="absolute top-20 left-3 w-64 glass-panel rounded-2xl p-3 z-30 shadow-2xl flex flex-col gap-3 pointer-events-auto max-h-[calc(100vh-100px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Sliders size={13} className="text-cyan-400" /> Инструменты
        </span>
        <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30 font-mono">
          БОГ
        </span>
      </div>

      {/* Tool Selection Buttons */}
      <div className="flex flex-col gap-1.5">
        {tools.map((t) => {
          const isActive = currentTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className={`w-full px-3 py-2 rounded-xl text-left text-xs transition flex items-center gap-2.5 ${
                isActive
                  ? 'bg-cyan-950/90 border border-cyan-500 text-cyan-200 shadow-lg shadow-cyan-950/50'
                  : 'bg-slate-900/60 border border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="p-1 rounded-lg bg-slate-950/80 border border-slate-800">{t.icon}</div>
              <div className="truncate">
                <div className="font-semibold">{t.label}</div>
                <div className="text-[10px] text-slate-400 truncate">{t.subtext}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Spawn Mass Box (shown when spawning stars or black holes) */}
      {(currentTool === 'spawn_star' || currentTool === 'spawn_blackhole') && (
        <div className="glass-card rounded-xl p-2.5 flex flex-col gap-2 border border-cyan-500/30">
          <div className="text-[11px] font-mono font-semibold text-cyan-300 flex justify-between items-center">
            <span>Масса объекта:</span>
            <span className="text-amber-400 text-xs font-bold">{spawnMass.toFixed(1)} M☉</span>
          </div>

          <input
            type="range"
            min="0.1"
            max="40"
            step="0.1"
            value={spawnMass}
            onChange={(e) => onUpdateSpawnMass(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />

          <div className="grid grid-cols-3 gap-1 text-[10px] font-mono pt-1">
            {quickMassPresets.map((q) => (
              <button
                key={q.val}
                onClick={() => onUpdateSpawnMass(q.val)}
                className={`px-1.5 py-1 rounded text-center transition ${
                  Math.abs(spawnMass - q.val) < 0.1
                    ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
                title={q.desc}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Procedural Perlin Gas Nebula Generator Box */}
      {currentTool === 'spawn_gas' && (
        <div className="glass-card rounded-xl p-2.5 flex flex-col gap-2.5 border border-sky-500/40 shadow-lg shadow-sky-950/40">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-[11px] font-mono font-bold text-sky-300 flex items-center gap-1.5">
              <Sparkles size={13} className="text-sky-400" /> Туманности Перлина
            </span>
            <span className="text-[9px] bg-sky-950/90 text-sky-300 border border-sky-500/40 px-1.5 py-0.5 rounded font-mono">
              FBM Noise
            </span>
          </div>

          {/* Mode Switcher: Perlin Nebula vs Continuous Spray */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950/90 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => onToggleNebulaSpawnMode('perlin')}
              className={`py-1 rounded text-center transition ${
                nebulaSpawnMode === 'perlin'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ✨ Шум Перлина
            </button>
            <button
              onClick={() => onToggleNebulaSpawnMode('spray')}
              className={`py-1 rounded text-center transition ${
                nebulaSpawnMode === 'spray'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              💨 Распылитель
            </button>
          </div>

          {nebulaSpawnMode === 'perlin' ? (
            <div className="flex flex-col gap-2">
              {/* Preset Selector */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-mono">Тип туманности:</span>
                <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-0.5">
                  {Object.values(NEBULA_PRESETS).map((p) => {
                    const isSelected = nebulaConfig.type === p.type;
                    return (
                      <button
                        key={p.type}
                        onClick={() =>
                          onUpdateNebulaConfig({
                            type: p.type,
                            radius: p.baseRadius,
                            particleDensity: p.density
                          })
                        }
                        className={`p-1.5 rounded-lg text-left transition flex items-center justify-between border ${
                          isSelected
                            ? 'bg-sky-950/90 border-sky-400 text-sky-100 shadow'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold font-mono truncate">{p.title}</span>
                          <span className="text-[8px] text-slate-400 truncate">{p.subtitle}</span>
                        </div>
                        {/* Palette dots preview */}
                        <div className="flex items-center gap-0.5 shrink-0 ml-1">
                          {p.palette.slice(0, 3).map((c, i) => (
                            <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Radius slider */}
              <div className="flex flex-col gap-1 text-[10px] font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Радиус облака:</span>
                  <span className="text-sky-400 font-bold">{nebulaConfig.radius} px</span>
                </div>
                <input
                  type="range"
                  min="140"
                  max="420"
                  step="10"
                  value={nebulaConfig.radius}
                  onChange={(e) => onUpdateNebulaConfig({ radius: parseInt(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              {/* Particle Density slider */}
              <div className="flex flex-col gap-1 text-[10px] font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Плотность газа:</span>
                  <span className="text-sky-400 font-bold">{nebulaConfig.particleDensity} шт</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="320"
                  step="10"
                  value={nebulaConfig.particleDensity}
                  onChange={(e) => onUpdateNebulaConfig({ particleDensity: parseInt(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              {/* Swirl slider */}
              <div className="flex flex-col gap-1 text-[10px] font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Турбулентное вихревание:</span>
                  <span className="text-sky-400 font-bold">{(nebulaConfig.swirlVelocity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.8"
                  step="0.05"
                  value={nebulaConfig.swirlVelocity}
                  onChange={(e) => onUpdateNebulaConfig({ swirlVelocity: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              {/* Action Spawn Button */}
              <button
                onClick={onGenerateNebula}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:from-sky-400 hover:to-indigo-500 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-sky-950/60 active:scale-[0.98]"
              >
                <Sparkles size={13} /> Создать в центре экрана
              </button>

              <span className="text-[9px] text-slate-400 font-mono text-center leading-tight">
                Или кликните ЛКМ в любом месте космоса
              </span>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 font-mono flex flex-col gap-1 p-1">
              <span>Зажмите и водите ЛКМ по космосу для ручного распыления молекулярного водорода.</span>
            </div>
          )}
        </div>
      )}

      {/* Simulation Constants & Visual Options */}
      <div className="glass-card rounded-xl p-2.5 flex flex-col gap-2">
        <div className="text-[11px] font-mono font-semibold text-slate-300 flex items-center justify-between">
          <span>Физические параметры</span>
          <span className="text-[9px] text-slate-500">G & ε</span>
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
            <span>Гравитация (G):</span>
            <span className="text-cyan-300 font-bold">{settings.G.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="4.0"
            step="0.1"
            value={settings.G}
            onChange={(e) => onUpdateSettings({ G: parseFloat(e.target.value) })}
            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
            <span>Смягчение (ε):</span>
            <span className="text-cyan-300 font-bold">{settings.softening.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="2.0"
            max="25.0"
            step="0.5"
            value={settings.softening}
            onChange={(e) => onUpdateSettings({ softening: parseFloat(e.target.value) })}
            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showTrails}
                onChange={(e) => onUpdateSettings({ showTrails: e.target.checked })}
                className="accent-cyan-400 rounded"
              />
              <span>Хвосты орбит</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showVectors}
                onChange={(e) => onUpdateSettings({ showVectors: e.target.checked })}
                className="accent-cyan-400 rounded"
              />
              <span>Векторы</span>
            </label>
          </div>

          <label className="flex items-center justify-between pt-1 border-t border-slate-800/40 cursor-pointer text-slate-300">
            <span className="flex items-center gap-1">
              <Radio size={12} className="text-cyan-400" />
              <span>Эффект Допплера (z)</span>
            </span>
            <input
              type="checkbox"
              checked={settings.dopplerEffect}
              onChange={(e) => onUpdateSettings({ dopplerEffect: e.target.checked })}
              className="accent-cyan-400 rounded"
            />
          </label>

          {/* Automated Stellar Evolution & Collapse */}
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/40">
            <label className="flex items-center justify-between cursor-pointer text-slate-200">
              <span className="flex items-center gap-1 font-semibold text-amber-300">
                <Flame size={12} className="text-amber-400" />
                <span>Авто-эволюция звезд</span>
              </span>
              <input
                type="checkbox"
                checked={settings.stellarEvolution !== false}
                onChange={(e) => onUpdateSettings({ stellarEvolution: e.target.checked })}
                className="accent-amber-400 rounded"
              />
            </label>

            {settings.stellarEvolution !== false && (
              <div className="flex items-center justify-between text-[9px] text-slate-400 pl-4">
                <span>Скорость выгорания:</span>
                <div className="flex gap-1">
                  {[1, 2, 5, 10].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => onUpdateSettings({ stellarEvolutionSpeed: spd })}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition ${
                        (settings.stellarEvolutionSpeed ?? 1) === spd
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Navigation Hints */}
      <div className="text-[10px] text-slate-500 font-mono flex flex-col gap-1 border-t border-slate-800/80 pt-2">
        <div className="flex items-center gap-1">
          <Info size={11} className="text-cyan-400 shrink-0" />
          <span>Колесико: зум от макро до глубокого космоса</span>
        </div>
        <div className="flex items-center gap-1 pl-3.5">
          <span>Клавиши 1-6: выбор инструмента</span>
        </div>
        <div className="flex items-center gap-1 pl-3.5">
          <span>СКМ / Пробел: свободная панорама</span>
        </div>
      </div>
    </aside>
  );
};
