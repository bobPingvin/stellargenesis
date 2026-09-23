/**
 * Astrophysics Evolution Guide Modal
 * Clear, engaging, and structured guide explaining stellar nucleosynthesis,
 * hydrostatic balance, and relativistic deaths of stars.
 */

import React from 'react';
import { X, Sparkles, Flame, Orbit, BookOpen, ArrowRight } from 'lucide-react';
import { PresetId } from '../types';

interface EvolutionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchPreset: (id: PresetId) => void;
}

export const EvolutionGuideModal: React.FC<EvolutionGuideModalProps> = ({
  isOpen,
  onClose,
  onLaunchPreset
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[85vh] glass-panel rounded-3xl p-6 shadow-2xl flex flex-col overflow-hidden border border-cyan-500/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Астрофизический гид: Жизненный цикл звезд
              </h2>
              <p className="text-xs text-slate-400">
                Как гравитация, термоядерный синтез и квантовая физика управляют космосом
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto pr-1 my-4 flex flex-col gap-4 text-xs text-slate-300 leading-relaxed">
          {/* Phase 1: Birth */}
          <div className="glass-card rounded-2xl p-4 border-l-4 border-l-sky-400">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sky-300 text-sm flex items-center gap-2">
                <span>1. Рождение в облаке Джинса</span>
              </span>
              <button
                onClick={() => {
                  onLaunchPreset('jeans_cloud');
                  onClose();
                }}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1"
              >
                Запустить сценарий <ArrowRight size={12} />
              </button>
            </div>
            <p>
              Холодные диффузные облака водорода и гелия начинают сжиматься под действием взаимного тяготения (гравитационная неустойчивость Джинса). Падая к центру, частицы разгоняются и сталкиваются: температура ядра достигает миллионов градусов.
            </p>
          </div>

          {/* Phase 2: Main Sequence */}
          <div className="glass-card rounded-2xl p-4 border-l-4 border-l-amber-400">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <span>2. Главная последовательность: Водородный огонь</span>
              </span>
              <button
                onClick={() => {
                  onLaunchPreset('solar');
                  onClose();
                }}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1"
              >
                Сценарий: Солнце <ArrowRight size={12} />
              </button>
            </div>
            <p>
              Когда <span className="text-amber-300 font-mono">Tcore &gt; 10 млн К</span>, зажигается протон-протонный термоядерный синтез (<span className="text-sky-300 font-mono">¹H ➔ ⁴He</span>). Звезда вступает в <strong>гидростатическое равновесие</strong>: гравитационное сжатие уравновешивается давлением горячего газа и лучистым давлением квантов света. В этой фазе Солнце живет ~10 миллиардов лет.
            </p>
          </div>

          {/* Phase 3: Red Giant */}
          <div className="glass-card rounded-2xl p-4 border-l-4 border-l-rose-400">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-rose-300 text-sm flex items-center gap-2">
                <span>3. Красный гигант: Тройной гелиевый процесс</span>
              </span>
              <button
                onClick={() => {
                  onLaunchPreset('binary_accretion');
                  onClose();
                }}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1"
              >
                Сценарий: Гигант <ArrowRight size={12} />
              </button>
            </div>
            <p>
              Водород в ядре истощается. Тяготение сжимает ядро, разогревая его выше <span className="text-rose-300 font-mono">100 млн К</span>. Запускается горение гелия (<span className="text-amber-300 font-mono">⁴He ➔ ¹²C</span>). Колоссальная вспышка лучистого давления раздувает внешние слои звезды в 10–50 раз — звезда становится <strong>Красным гигантом</strong>.
            </p>
          </div>

          {/* Phase 4: Iron Catastrophe */}
          <div className="glass-card rounded-2xl p-4 border-l-4 border-l-purple-500 bg-purple-950/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-purple-300 text-sm flex items-center gap-2">
                <span>4. Железная катастрофа и неизбежный коллапс</span>
              </span>
              <button
                onClick={() => {
                  onLaunchPreset('massive_sn');
                  onClose();
                }}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1"
              >
                Сценарий: Сверхновая <ArrowRight size={12} />
              </button>
            </div>
            <p>
              В массивных звездах при <span className="text-purple-300 font-mono">Tcore &gt; 500 млн К</span> горит углерод, кремний и рождается Железо (<span className="text-rose-400 font-mono">⁵⁶Fe</span>). Железо имеет максимальную удельную энергию связи — его синтез не выделяет, а поглощает энергию! Лучевое давление мгновенно исчезает, и гравитация без сопротивления обрушивает ядро внутрь со скоростью в четверть скорости света.
            </p>
          </div>

          {/* Auto-evolution reminder banner */}
          <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/40 text-amber-200 flex items-center gap-2.5">
            <Flame size={18} className="text-amber-400 shrink-0" />
            <div className="text-[11px] leading-snug">
              <strong>Симулятор реальной физики:</strong> Все звезды эволюционируют и переходят в финал <em>полностью самостоятельно</em>. Вам не нужно нажимать кнопки — при исчерпании водорода и гелия звезда малой массы плавно сбросит оболочку в белый карлик, а массивная звезда выгорит до железного ядра и сама взорвется сверхновой или породит черную дыру.
            </div>
          </div>

          {/* Three Fates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="glass-card rounded-xl p-3 border border-slate-700">
              <div className="text-xs font-bold text-sky-300 mb-1">1. Белый карлик + Туманность</div>
              <div className="text-[10px] text-slate-400 font-mono mb-1.5">Масса до коллапса &lt; 8 M☉ (ядро &lt; 1.44 M☉)</div>
              <p className="text-[11px] text-slate-300">
                Спокойный сброс оболочки в виде разноцветной планетарной туманности. Горячее ядро сжимается и стабилизируется давлением вырожденного электронного газа.
              </p>
            </div>

            <div className="glass-card rounded-xl p-3 border border-cyan-600/50 bg-cyan-950/20">
              <div className="text-xs font-bold text-cyan-300 mb-1">2. Сверхновая II ➔ Пульсар</div>
              <div className="text-[10px] text-slate-400 font-mono mb-1.5">8 M☉ &le; M &lt; 20 M☉ (ядро 1.44 - 2.8 M☉)</div>
              <p className="text-[11px] text-slate-300">
                Катастрофический взрыв сверхновой с ударной волной. Электроны вдавливаются в протоны, рождая сверхплотную нейтронную звезду с мощными маяковыми лучами.
              </p>
            </div>

            <div className="glass-card rounded-xl p-3 border border-purple-600/50 bg-purple-950/20">
              <div className="text-xs font-bold text-purple-300 mb-1">3. Гиперновая ➔ Черная дыра</div>
              <div className="text-[10px] text-slate-400 font-mono mb-1.5">M &ge; 20 M☉ (ядро &gt; 2.8 M☉ TOV)</div>
              <p className="text-[11px] text-slate-300">
                Мощнейший гравитационный коллапс. Предел Оппенгеймера-Волкова преодолен — материя бесконечно схлопывается в сингулярность с горизонтом событий.
              </p>
            </div>
          </div>
        </div>

        {/* Footer & Hotkeys summary */}
        <div className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span>Горячие клавиши:</span>
            <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-amber-300">Ctrl+Z</span> Отмена
            <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-cyan-300">Ctrl+Y</span> Повтор
            <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">Space</span> Пауза
            <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">1-5</span> Орудия
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition ml-auto"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};
