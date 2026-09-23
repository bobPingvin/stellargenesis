/**
 * Star Inspector Sidebar Component
 * Clear and intuitive telemetry, hydrostatic balance gauge, and nucleosynthesis engine breakdown.
 */

import React from 'react';
import { CelestialBody } from '../types';
import { SPECTRAL_DATA, getSpectralClass, SPEED_OF_LIGHT, VISUAL_C_DOPPLER } from '../physics/engine';
import { Eye, Flame, Trash2, Zap, HelpCircle, Activity, Sparkles, X, Orbit, Compass } from 'lucide-react';

interface StarInspectorProps {
  selectedBody: CelestialBody | null;
  followingBody: CelestialBody | null;
  onToggleFollow: () => void;
  onPumpMass: () => void;
  onFeedBlackHole?: (amount: number) => void;
  onTriggerSupernova: () => void;
  onDeleteBody: () => void;
  onClose?: () => void;
}

export const StarInspector: React.FC<StarInspectorProps> = ({
  selectedBody,
  followingBody,
  onToggleFollow,
  onPumpMass,
  onFeedBlackHole,
  onTriggerSupernova,
  onDeleteBody,
  onClose
}) => {
  // If no body is selected, don't show inspector to keep interface completely clean
  if (!selectedBody) {
    return null;
  }

  const b = selectedBody;
  const specKey = getSpectralClass(b);
  const specInfo = SPECTRAL_DATA[specKey];
  const isFollowed = followingBody?.id === b.id;

  // Schwarzschild radius
  const rsKm = ((2 * 1.2 * b.mass * 12.0) / (SPEED_OF_LIGHT * SPEED_OF_LIGHT) * 2.95).toFixed(2);

  // Hydrostatic balance ratio calculation
  const ratio = Math.max(0.1, Math.min(2.0, b.balanceRatio));
  const barPercent = Math.max(0, Math.min(100, ((ratio - 0.5) / 1.5) * 100));

  let equilTitle = 'СТАБИЛЬНОЕ РАВНОВЕСИЕ';
  let equilColor = 'text-emerald-400';
  let equilFillColor = '#10b981';
  let equilDesc = 'Гравитационное сжатие идеально уравновешено давлением излучения.';

  if (b.remnantType === 'black_hole') {
    equilTitle = 'ГРАВИТАЦИОННАЯ СИНГУЛЯРНОСТЬ';
    equilColor = 'text-purple-400';
    equilFillColor = '#c084fc';
    equilDesc = 'Гравитация безгранично преодолела все физические барьеры материи.';
  } else if (b.remnantType === 'pulsar') {
    equilTitle = 'ДАВЛЕНИЕ ВЫРОЖДЕННЫХ НЕЙТРОНОВ';
    equilColor = 'text-cyan-400';
    equilFillColor = '#38bdf8';
    equilDesc = 'Коллапс остановлен квантовым давлением вырожденного нейтронного газа.';
  } else if (b.remnantType === 'white_dwarf') {
    equilTitle = 'ДАВЛЕНИЕ ВЫРОЖДЕННЫХ ЭЛЕКТРОНОВ';
    equilColor = 'text-sky-300';
    equilFillColor = '#7dd3fc';
    equilDesc = 'Остаток звезды удерживается от коллапса квантовым принципом Паули.';
  } else if (ratio > 1.15) {
    equilTitle = 'ТЕРМИЧЕСКОЕ РАСШИРЕНИЕ';
    equilColor = 'text-amber-400';
    equilFillColor = '#f59e0b';
    equilDesc = 'Давление излучения превышает тяготение. Звезда раздувается в гиганта.';
  } else if (ratio < 0.85) {
    equilTitle = 'ГРАВИТАЦИОННОЕ СЖАТИЕ';
    equilColor = 'text-rose-400';
    equilFillColor = '#f43f5e';
    equilDesc = 'Тяготение побеждает. Ядро сжимается и адиабатически нагревается.';
  }

  return (
    <aside className="absolute top-16 right-3 w-80 glass-panel rounded-2xl p-4 z-30 shadow-2xl flex flex-col gap-3 pointer-events-auto max-h-[calc(100vh-80px)] overflow-y-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2 truncate">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: specInfo.color }}
          />
          <h2 className="text-sm font-bold text-slate-100 font-mono truncate">{b.name}</h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleFollow}
            className={`text-xs px-2 py-1 rounded-xl font-mono flex items-center gap-1 transition ${
              isFollowed
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'
            }`}
            title="Следовать камерой за этой звездой"
          >
            <Eye size={12} />
            <span>{isFollowed ? 'Слежение' : 'Следить'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Закрыть инспектор (Снять выделение)"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Spectral Banner */}
      <div
        className="rounded-xl p-3 border flex items-center justify-between transition-colors"
        style={{
          background: `linear-gradient(135deg, rgba(15, 23, 42, 0.9), ${specInfo.halo})`,
          borderColor: specInfo.color + '40'
        }}
      >
        <div>
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
            Спектральный класс
          </div>
          <div className="text-xs font-bold text-slate-100 mt-0.5">{specInfo.russianName}</div>
          <p className="text-[10px] text-slate-300 mt-1 leading-snug">{specInfo.description}</p>
        </div>
      </div>

      {/* Stellar Evolution & Fate Telemetry */}
      {(() => {
        let stageName = 'Главная последовательность';
        let stageColor = 'text-amber-300';
        let stageBadgeBg = 'bg-amber-500/20 border-amber-500/40 text-amber-300';
        let fateText = '';
        let fateIcon = '✨';

        if (b.remnantType === 'black_hole') {
          stageName = 'Черная дыра (Сингулярность)';
          stageColor = 'text-purple-400';
          stageBadgeBg = 'bg-purple-500/20 border-purple-500/40 text-purple-300';
          fateText = 'Гравитационный реликт (> 2.8 M☉)';
          fateIcon = '🕳️';
        } else if (b.remnantType === 'pulsar') {
          stageName = 'Пульсар (Нейтронная звезда)';
          stageColor = 'text-cyan-400';
          stageBadgeBg = 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300';
          fateText = 'Нейтронный реликт (1.4 - 2.8 M☉)';
          fateIcon = '⚡';
        } else if (b.remnantType === 'white_dwarf') {
          stageName = 'Белый карлик';
          stageColor = 'text-sky-300';
          stageBadgeBg = 'bg-sky-500/20 border-sky-500/40 text-sky-300';
          fateText = 'Электронно-вырожденный реликт (< 1.44 M☉)';
          fateIcon = '⚪';
        } else if (b.evolutionStage === 'iron_crisis' || b.composition.Fe > 0.25) {
          stageName = 'Железный кризис (Предколлапс)';
          stageColor = 'text-rose-400 animate-pulse';
          stageBadgeBg = 'bg-rose-500/20 border-rose-500/40 text-rose-300';
        } else if (b.evolutionStage === 'supergiant' || (b.mass >= 8.0 && (b.composition.He > 0.3 || b.composition.C > 0.15))) {
          stageName = 'Сверхгигант (Синтез ¹²C / ⁵⁶Fe)';
          stageColor = 'text-orange-400';
          stageBadgeBg = 'bg-orange-500/20 border-orange-500/40 text-orange-300';
        } else if (b.evolutionStage === 'red_giant' || (b.composition.He > 0.4 || b.composition.C > 0.1)) {
          stageName = 'Красный гигант (Синтез ⁴He ➔ ¹²C)';
          stageColor = 'text-rose-300';
          stageBadgeBg = 'bg-rose-500/20 border-rose-500/40 text-rose-300';
        } else {
          stageName = 'Главная последовательность (¹H ➔ ⁴He)';
          stageColor = 'text-emerald-400';
          stageBadgeBg = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
        }

        if (!b.remnantType) {
          if (b.mass < 8.0) {
            fateText = 'Белый карлик (< 1.44 M☉) + Туманность';
            fateIcon = '⚪';
          } else if (b.mass < 20.0) {
            fateText = 'Вспышка Сверхновой II ➔ Пульсар';
            fateIcon = '⚡';
          } else {
            fateText = 'Гиперновая ➔ Черная дыра (> 2.8 M☉)';
            fateIcon = '🕳️';
          }
        }

        const fuelPercent = Math.round((b.composition.H + b.composition.He + (b.mass >= 8 ? b.composition.C : 0)) * 100);

        return (
          <div className="glass-card rounded-xl p-3 flex flex-col gap-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider">Эволюционный статус</span>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${stageBadgeBg}`}>
                {b.remnantType ? 'Реликт' : 'Активная звезда'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400">Текущая фаза:</span>
              <span className={`text-[11px] font-bold ${stageColor}`}>{stageName}</span>
            </div>

            <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400">Судьба по массе ({b.mass.toFixed(1)} M☉):</span>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-200 font-semibold">
                <span>{fateIcon}</span>
                <span className="text-cyan-300">{fateText}</span>
              </div>
            </div>

            {!b.remnantType && (
              <div className="flex flex-col gap-1 pt-1 border-t border-slate-800/80">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Ядерное топливо:</span>
                  <span className={`font-bold ${fuelPercent < 15 ? 'text-rose-400' : fuelPercent < 45 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {fuelPercent}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      fuelPercent < 15 ? 'bg-rose-500' : fuelPercent < 45 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, fuelPercent))}%` }}
                  />
                </div>
                <p className="text-[9px] text-slate-500 leading-tight">
                  Коллапс произойдет автоматически по физическим законам при исчерпании топлива.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tidal Disruption Event Alert (when star is undergoing spaghettification) */}
      {b.isDisrupting && (
        <div className="rounded-xl p-2.5 bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs flex flex-col gap-1 shadow-lg shadow-rose-950/60 animate-pulse font-mono">
          <div className="flex items-center justify-between font-bold text-rose-300 text-[11px]">
            <span>⚠️ ПРИЛИВНОЙ РАЗРЫВ (TDE)</span>
            <span>{(b.tidalStretch?.factor || 1.0).toFixed(2)}x</span>
          </div>
          <p className="text-[10px] text-rose-200 leading-tight">
            Градиент тяготения сингулярности превзошел предел Роша! Звезда вытянута в спагетти и расщепляется на плазменные филаменты.
          </p>
        </div>
      )}

      {/* Relativistic Doppler Effect Telemetry */}
      {(() => {
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const speedPct = Math.min(99.9, (speed / VISUAL_C_DOPPLER) * 100).toFixed(1);
        const z = b.dopplerShift || 0;
        const isBlueshift = z < -0.01;
        const isRedshift = z > 0.01;

        return (
          <div className="glass-card rounded-xl p-2.5 flex flex-col gap-1.5 font-mono text-xs">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Эффект Допплера & v/c:</span>
              <span className={`font-bold ${isBlueshift ? 'text-sky-300' : isRedshift ? 'text-rose-400' : 'text-slate-300'}`}>
                {isBlueshift ? '🔵 Синий сдвиг' : isRedshift ? '🔴 Красный сдвиг' : '⚪ Нейтральный'}
              </span>
            </div>

            <div className="flex justify-between items-baseline text-[11px]">
              <span className="text-slate-400">Сдвиг z: <strong className="text-slate-200">{z > 0 ? `+${z.toFixed(3)}` : z.toFixed(3)}</strong></span>
              <span className="text-slate-400">Скорость: <strong className="text-cyan-300">{speedPct}% c</strong></span>
            </div>

            {/* Doppler visual spectrum bar */}
            <div className="relative w-full h-2 rounded-full overflow-hidden bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600 border border-slate-700">
              {/* Marker representing star's Doppler position */}
              {(() => {
                const markerPos = Math.max(5, Math.min(95, 50 + z * 50));
                return (
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-white border border-slate-950 rounded-full shadow"
                    style={{ left: `${markerPos}%`, transform: 'translateX(-50%)' }}
                  />
                );
              })()}
            </div>
            <div className="flex justify-between text-[8px] text-slate-500">
              <span>◄ 400nm (Синий/УФ)</span>
              <span>Линия H-α</span>
              <span>700nm (Красный/ИК) ►</span>
            </div>
          </div>
        );
      })()}

      {/* Black Hole Relativistic Optics & Spacetime Curvature Metrics */}
      {b.remnantType === 'black_hole' && (
        <div className="glass-card rounded-xl p-2.5 flex flex-col gap-2 font-mono text-xs border border-purple-500/30 bg-purple-950/20">
          <div className="flex items-center justify-between text-[11px] font-bold text-purple-300">
            <span className="flex items-center gap-1">🕳️ Оптика черной дыры (ОТО)</span>
            <span className="text-[10px] text-purple-400">Gargantua</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-purple-500/20">
              <span className="text-slate-400">Горизонт (rs):</span>
              <div className="font-bold text-slate-100">{rsKm} км</div>
            </div>
            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-yellow-500/20">
              <span className="text-yellow-400">Фотонная сфера:</span>
              <div className="font-bold text-yellow-200">{(parseFloat(rsKm) * 1.5).toFixed(1)} км</div>
            </div>
            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-amber-500/20">
              <span className="text-amber-400">Орбита ISCO:</span>
              <div className="font-bold text-amber-200">{(parseFloat(rsKm) * 3.0).toFixed(1)} км</div>
            </div>
            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-cyan-500/20">
              <span className="text-cyan-400">Линзирование:</span>
              <div className="font-bold text-cyan-200">Активно</div>
            </div>
          </div>

          <p className="text-[9px] text-purple-200/80 leading-tight">
            Гравитационное линзирование искривляет лучи света заднего плана и аккреционного диска, образуя замкнутое фотонное кольцо и верхнюю световую дугу.
          </p>
        </div>
      )}

      {/* Physics Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="glass-card rounded-xl p-2.5">
          <div className="text-[10px] text-slate-400">Масса (M):</div>
          <div className="text-sm font-bold text-slate-100 mt-0.5 flex items-baseline gap-1">
            <span>{b.mass.toFixed(2)}</span> <span className="text-[10px] text-slate-400">M☉</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-2.5">
          <div className="text-[10px] text-slate-400">Радиус (R):</div>
          <div className="text-sm font-bold text-slate-100 mt-0.5 flex items-baseline gap-1">
            <span>{(b.radius / 10.0).toFixed(2)}</span> <span className="text-[10px] text-slate-400">R☉</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-2.5">
          <div className="text-[10px] text-slate-400">Темп. ядра (Tc):</div>
          <div className="text-sm font-bold text-rose-400 mt-0.5 flex items-baseline gap-1">
            <span>{b.Tcore.toFixed(1)}</span> <span className="text-[10px] text-slate-400">млн K</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-2.5">
          <div className="text-[10px] text-slate-400">Поверхность (Teff):</div>
          <div className="text-sm font-bold text-amber-300 mt-0.5 flex items-baseline gap-1">
            <span>{Math.round(b.Teff).toLocaleString()}</span> <span className="text-[10px] text-slate-400">K</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-2.5 col-span-2 flex justify-between items-center">
          <div>
            <div className="text-[10px] text-slate-400">Светимость (L):</div>
            <div className="text-xs font-bold text-yellow-300 mt-0.5">
              {b.luminosity.toFixed(2)} L☉
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Радиус Шварцшильда:</div>
            <div className="text-xs font-bold text-purple-400 mt-0.5">
              {rsKm} км
            </div>
          </div>
        </div>
      </div>

      {/* Hydrostatic Balance Gauge */}
      <div className="glass-card rounded-xl p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-300 font-semibold flex items-center gap-1">
            <Flame size={12} className="text-amber-400" /> Гидростатический баланс
          </span>
          <span className={`text-[10px] font-bold ${equilColor}`}>{equilTitle}</span>
        </div>

        {/* Balance visual bar */}
        <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-700/80 my-1">
          {/* Middle mark */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-500 z-10" />
          {/* Dynamic Fill Indicator */}
          <div
            className="absolute top-0 bottom-0 transition-all duration-150 rounded-full"
            style={{
              left: `${Math.min(48, Math.max(0, barPercent))}%`,
              width: `${Math.max(4, Math.abs(barPercent - 50))}%`,
              backgroundColor: equilFillColor
            }}
          />
        </div>

        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
          <span className="text-rose-400">◄ Сжатие (P_grav)</span>
          <span className="text-cyan-400">Расширение (P_rad+P_gas) ►</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight pt-1">{equilDesc}</p>
      </div>

      {/* Dynamic Spectral Analysis & Real-Time Composition Graph Panel */}
      {(() => {
        const peakWavelengthNm = b.Teff > 0 ? Math.round(2898000 / Math.max(100, b.Teff)) : 0;
        const hPct = Math.round(b.composition.H * 100);
        const hePct = Math.round(b.composition.He * 100);
        const cPct = Math.round(b.composition.C * 100);
        const fePct = Math.round(b.composition.Fe * 100);

        return (
          <div className="glass-card rounded-xl p-3 flex flex-col gap-2.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 text-[11px] font-bold flex items-center gap-1.5">
                <Activity size={13} className="text-cyan-400" />
                <span>Спектральный анализ состава</span>
              </span>
              <span className="text-[9px] text-cyan-300/80 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                Реальное время
              </span>
            </div>

            {/* Dynamic Continuous Spectrum Bar with Fraunhofer Absorption Lines */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Оптический спектр:</span>
                <span className="text-amber-300 font-semibold">λ_max ≈ {peakWavelengthNm > 0 ? `${peakWavelengthNm} нм` : '—'}</span>
              </div>

              <div className="relative w-full h-5 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shadow-inner">
                {/* Continuous Rainbow Emission Spectrum */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-blue-500 via-emerald-400 via-yellow-400 via-orange-500 to-rose-600 opacity-90" />

                {/* Fraunhofer Hydrogen-Alpha (656.3 nm - Red) */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-950 shadow-sm transition-opacity duration-300"
                  style={{ left: '76%', opacity: Math.max(0.15, b.composition.H * 0.95) }}
                  title="H-α (656.3 нм) Водород"
                />

                {/* Fraunhofer Hydrogen-Beta (486.1 nm - Cyan) */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-950 shadow-sm transition-opacity duration-300"
                  style={{ left: '32%', opacity: Math.max(0.15, b.composition.H * 0.85) }}
                  title="H-β (486.1 нм) Водород"
                />

                {/* Fraunhofer Helium-I (587.6 nm - Yellow) */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-950 shadow-sm transition-opacity duration-300"
                  style={{ left: '57%', opacity: Math.max(0.1, b.composition.He * 0.95) }}
                  title="He-I (587.6 нм) Гелий"
                />

                {/* Fraunhofer Carbon/Oxygen (500.7 nm - Emerald) */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-950 shadow-sm transition-opacity duration-300"
                  style={{ left: '36%', opacity: Math.max(0.1, b.composition.C * 0.95) }}
                  title="C-IV / O-III (500.7 нм) Углерод"
                />

                {/* Fraunhofer Iron-E Line (527.0 nm - Green) */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-950 shadow-sm transition-opacity duration-300"
                  style={{ left: '43%', opacity: Math.max(0.1, b.composition.Fe * 0.95) }}
                  title="Fe-I (527.0 нм) Железо"
                />

                {/* Peak Wavelength Indicator Marker */}
                {peakWavelengthNm >= 380 && peakWavelengthNm <= 750 && (
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white border border-slate-950 shadow-md"
                    style={{ left: `${((peakWavelengthNm - 380) / (750 - 380)) * 100}%` }}
                    title={`Пик излучения по закону Вина: ${peakWavelengthNm} нм`}
                  />
                )}
              </div>

              <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                <span>380 нм (УФ)</span>
                <span className="text-cyan-400/80">H-β</span>
                <span className="text-emerald-400/80">Fe/C</span>
                <span className="text-amber-400/80">He-I</span>
                <span className="text-rose-400/80">H-α</span>
                <span>750 нм (ИК)</span>
              </div>
            </div>

            {/* Real-time Proportional Composition Breakdown Graph */}
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-800/80">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>График соотношения элементов:</span>
                <span className="text-slate-300 font-bold">100% ядра</span>
              </div>

              {/* Stacked Proportional Histogram Bar */}
              <div className="w-full h-3 rounded-lg overflow-hidden flex bg-slate-900 border border-slate-700/80 shadow-inner">
                {b.composition.H > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all duration-200"
                    style={{ width: `${b.composition.H * 100}%` }}
                    title={`Водород: ${hPct}%`}
                  />
                )}
                {b.composition.He > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-200"
                    style={{ width: `${b.composition.He * 100}%` }}
                    title={`Гелий: ${hePct}%`}
                  />
                )}
                {b.composition.C > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-200"
                    style={{ width: `${b.composition.C * 100}%` }}
                    title={`Углерод/Кислород: ${cPct}%`}
                  />
                )}
                {b.composition.Fe > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-200"
                    style={{ width: `${b.composition.Fe * 100}%` }}
                    title={`Железо/Тяжелые: ${fePct}%`}
                  />
                )}
              </div>

              {/* Interactive Legend Grid */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-sky-500/20">
                  <span className="flex items-center gap-1 text-sky-300">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span>¹H (Водород)</span>
                  </span>
                  <strong className="text-slate-100">{hPct}%</strong>
                </div>

                <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-amber-500/20">
                  <span className="flex items-center gap-1 text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>⁴He (Гелий)</span>
                  </span>
                  <strong className="text-slate-100">{hePct}%</strong>
                </div>

                <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-emerald-500/20">
                  <span className="flex items-center gap-1 text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>¹²C (Углерод)</span>
                  </span>
                  <strong className="text-slate-100">{cPct}%</strong>
                </div>

                <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-rose-500/20">
                  <span className="flex items-center gap-1 text-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>⁵⁶Fe (Железо)</span>
                  </span>
                  <strong className="text-slate-100">{fePct}%</strong>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Remnant / Black Hole Specific Telemetry OR Nucleosynthesis Engine */}
      {b.remnantType === 'black_hole' ? (
        <div className="glass-card rounded-xl p-3 flex flex-col gap-2.5 border-purple-500/30 bg-purple-950/20">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-purple-200 font-semibold flex items-center gap-1.5">
              <Sparkles size={12} className="text-purple-400" />
              Аккреция и Фотонное Кольцо
            </span>
            <span className="text-[9px] text-purple-300/80 font-mono">r_ph ≈ 1.02 r_s</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="bg-purple-900/30 p-2 rounded-lg border border-purple-800/40">
              <div className="text-purple-300/70 text-[9px]">Непрерывный рост:</div>
              <div className="text-purple-200 font-bold flex items-center gap-1 mt-0.5">
                <Activity size={10} className="text-emerald-400 animate-pulse" />
                +{(0.008 + b.mass * 0.00035 * 60).toFixed(3)} M☉/с
              </div>
            </div>
            <div className="bg-purple-900/30 p-2 rounded-lg border border-purple-800/40">
              <div className="text-purple-300/70 text-[9px]">Энергия покоя E=mc²:</div>
              <div className="text-amber-200 font-bold mt-0.5">
                {(b.mass * 1.79).toFixed(1)}·10⁴⁷ Дж
              </div>
            </div>
          </div>

          <div className="text-[9px] text-purple-200/70 flex items-start gap-1 pt-1 border-t border-purple-800/40">
            <HelpCircle size={12} className="text-purple-400 shrink-0 mt-0.5" />
            <span>Черная дыра непрерывно растет, поглощая фоновое излучение и межзвездный газ. Фотонное кольцо привязано к горизонту событий.</span>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-200 font-semibold">Термоядерный синтез ядра</span>
            <span className="text-[9px] text-slate-500 font-mono">H ➔ He ➔ C ➔ Fe</span>
          </div>

          {/* Hydrogen */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-sky-300">Водород (¹H ➔ ⁴He)</span>
              <span className="text-sky-300 font-bold">{Math.round(b.composition.H * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-all duration-200"
                style={{ width: `${b.composition.H * 100}%` }}
              />
            </div>
          </div>

          {/* Helium */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-amber-300">Гелий (⁴He ➔ ¹²C)</span>
              <span className="text-amber-300 font-bold">{Math.round(b.composition.He * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-200"
                style={{ width: `${b.composition.He * 100}%` }}
              />
            </div>
          </div>

          {/* Carbon */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-emerald-300">Углерод (¹²C ➔ ⁵⁶Fe)</span>
              <span className="text-emerald-300 font-bold">{Math.round(b.composition.C * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-200"
                style={{ width: `${b.composition.C * 100}%` }}
              />
            </div>
          </div>

          {/* Iron */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-rose-400 font-semibold">Железо (⁵⁶Fe Коллапс)</span>
              <span className="text-rose-400 font-bold">{Math.round(b.composition.Fe * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 transition-all duration-200"
                style={{ width: `${b.composition.Fe * 100}%` }}
              />
            </div>
          </div>

          <div className="text-[9px] text-slate-400 flex items-start gap-1 pt-1 border-t border-slate-800">
            <HelpCircle size={12} className="text-slate-500 shrink-0 mt-0.5" />
            <span>Синтез железа эндотермичен. При Fe &gt; 40% лучевое давление исчезает и ядро падает само в себя.</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-col gap-2 pt-1">
        {b.remnantType === 'black_hole' ? (
          <>
            <div className="text-[10px] font-mono font-semibold text-purple-300 flex items-center justify-between">
              <span>Питание черной дыры (Влить массу):</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onFeedBlackHole ? onFeedBlackHole(5) : onPumpMass()}
                className="py-1.5 px-2 rounded-xl bg-purple-600/30 border border-purple-500/50 text-purple-200 hover:bg-purple-600/50 text-[11px] font-mono font-semibold transition flex items-center justify-center gap-1 shadow-md"
              >
                +5 M☉
              </button>
              <button
                onClick={() => onFeedBlackHole ? onFeedBlackHole(25) : onPumpMass()}
                className="py-1.5 px-2 rounded-xl bg-purple-600/40 border border-purple-400/60 text-purple-100 hover:bg-purple-600/60 text-[11px] font-mono font-bold transition flex items-center justify-center gap-1 shadow-md"
              >
                +25 M☉
              </button>
              <button
                onClick={() => onFeedBlackHole ? onFeedBlackHole(100) : onPumpMass()}
                className="py-1.5 px-2 rounded-xl bg-amber-500/30 border border-amber-400/60 text-amber-200 hover:bg-amber-500/50 text-[11px] font-mono font-bold transition flex items-center justify-center gap-1 shadow-md"
              >
                +100 M☉
              </button>
            </div>

            <button
              onClick={onDeleteBody}
              className="w-full py-1.5 px-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-slate-700 text-xs font-mono transition flex items-center justify-center gap-1 mt-1"
            >
              <Trash2 size={12} /> Уничтожить черную дыру
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onPumpMass}
              className="w-full py-2 px-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30 text-xs font-mono font-semibold transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/40"
            >
              <Zap size={14} /> Вдуть +2.0 M☉ (Форсировать)
            </button>

            <div className="grid grid-cols-2 gap-2">
              {!b.isRemnant && (
                <button
                  onClick={onTriggerSupernova}
                  className="py-1.5 px-2.5 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-300 hover:bg-rose-900 text-xs font-mono transition flex items-center justify-center gap-1"
                >
                  <Flame size={12} /> Вспышка Сверхновой
                </button>
              )}

              <button
                onClick={onDeleteBody}
                className={`py-1.5 px-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-slate-700 text-xs font-mono transition flex items-center justify-center gap-1 ${b.isRemnant ? 'col-span-2' : ''}`}
              >
                <Trash2 size={12} /> Уничтожить
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
