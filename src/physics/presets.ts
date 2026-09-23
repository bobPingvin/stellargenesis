/**
 * Astronomical and Astrophysical Presets
 */

import { CelestialBody, Particle, PresetId, PresetInfo } from '../types';
import { createBody, createParticle } from './engine';

export const PRESETS_CATALOG: PresetInfo[] = [
  {
    id: 'solar',
    title: 'Солнечная система',
    shortDesc: 'Солнце 1.0 M☉ и 5 планет',
    fullDesc: 'Классическая стабильная планетная система с центральным желтым карликом класса G (Солнце) и планетами земной и юпитерианской групп на стабильных орбитах.',
    icon: '☀️',
    difficulty: 'Базовый'
  },
  {
    id: 'massive_sn',
    title: 'Сверхмассивная звезда ➔ Пульсар',
    shortDesc: '8.0 M☉ на грани коллапса',
    fullDesc: 'Сверхгигант с горячим ядром, в котором активно синтезируется углерод и железо. Вскоре произойдет коллапс в быстровращающийся Пульсар с релятивистскими лучами!',
    icon: '💥',
    difficulty: 'Продвинутый'
  },
  {
    id: 'hyper_bh',
    title: 'Коллапс в Черную Дыру',
    shortDesc: '25 M☉ выше предела Оппенгеймера-Волкова',
    fullDesc: 'Экстремально тяжелая звезда с компаньоном. При истощении топлива ядро схлопывается в гравитационную сингулярность с горизонтом событий и аккреционным диском.',
    icon: '🕳️',
    difficulty: 'Релятивистский'
  },
  {
    id: 'binary_accretion',
    title: 'Тесная бинарная система',
    shortDesc: 'Черная дыра + Красный гигант',
    fullDesc: 'Релятивистский компактный объект перетягивает вещество из раздутой оболочки звезды-донора, формируя раскаленный аккреционный диск с эффектом Доплера.',
    icon: '🪐',
    difficulty: 'Продвинутый'
  },
  {
    id: 'jeans_cloud',
    title: 'Протозвездное облако Джинса',
    shortDesc: 'Гравитационный коллапс 180 частиц газа',
    fullDesc: 'Моделирование конденсации диффузной протозвездной пыли и водорода в плотное звездное ядро под действием гравитационной неустойчивости Джинса.',
    icon: '✨',
    difficulty: 'Базовый'
  },
  {
    id: 'white_dwarf_test',
    title: 'Эволюция Солнца ➔ Белый карлик',
    shortDesc: 'Остаток маломассивной звезды (< 1.44 M☉)',
    fullDesc: 'Финальная стадия звезд типа Солнца. Оболочка сброшена, остывающее углеродно-кислородное ядро удерживается квантовым давлением вырожденных электронов.',
    icon: '⚪',
    difficulty: 'Базовый'
  }
];

export function buildPresetScenario(id: PresetId, G: number): {
  bodies: CelestialBody[];
  particles: Particle[];
  selectedId: string | null;
  cameraZoom: number;
} {
  const bodies: CelestialBody[] = [];
  const particles: Particle[] = [];
  let selectedId: string | null = null;
  let cameraZoom = 1.0;

  if (id === 'solar') {
    const sun = createBody({
      name: 'Солнце (G2V)',
      x: 0, y: 0, vx: 0, vy: 0,
      mass: 1.0,
      radius: 12.0,
      composition: { H: 0.74, He: 0.24, C: 0.02, Fe: 0.0 }
    });
    bodies.push(sun);
    selectedId = sun.id;

    const planets = [
      { name: 'Меркурий', r: 75, mass: 0.02, radius: 4.0 },
      { name: 'Венера', r: 120, mass: 0.04, radius: 5.0 },
      { name: 'Земля', r: 170, mass: 0.05, radius: 5.5 },
      { name: 'Марс', r: 230, mass: 0.03, radius: 4.5 },
      { name: 'Юпитер', r: 350, mass: 0.16, radius: 9.0 }
    ];

    for (const p of planets) {
      const v = Math.sqrt((G * sun.mass) / p.r);
      bodies.push(createBody({
        name: p.name,
        x: p.r, y: 0,
        vx: 0, vy: v,
        mass: p.mass,
        radius: p.radius,
        Tcore: 0.1,
        Teff: 300
      }));
    }
  } else if (id === 'massive_sn') {
    const star = createBody({
      name: 'Сверхгигант Бетельгейзе-X',
      x: 0, y: 0, vx: 0, vy: 0,
      mass: 8.5,
      radius: 25.0,
      Tcore: 480.0,
      composition: { H: 0.02, He: 0.14, C: 0.50, Fe: 0.34 }
    });
    bodies.push(star);
    selectedId = star.id;

    // Small planetary escort
    const v = Math.sqrt((G * star.mass) / 240);
    bodies.push(createBody({
      name: 'Экзопланета Кеплер-SG',
      x: 240, y: 0, vx: 0, vy: v,
      mass: 0.08, radius: 5.0, Tcore: 0.5, Teff: 400
    }));
  } else if (id === 'hyper_bh') {
    const hyperStar = createBody({
      name: 'Гипергигант Ригель-SG',
      x: 0, y: 0, vx: 0, vy: 0,
      mass: 25.0,
      radius: 34.0,
      Tcore: 580.0,
      composition: { H: 0.01, He: 0.06, C: 0.58, Fe: 0.35 }
    });
    bodies.push(hyperStar);
    selectedId = hyperStar.id;

    // Companion star
    const dist = 320;
    const v = Math.sqrt((G * hyperStar.mass) / dist);
    bodies.push(createBody({
      name: 'Компаньон B-класса',
      x: dist, y: 0, vx: 0, vy: v,
      mass: 4.0, radius: 11.0, Teff: 18000
    }));
  } else if (id === 'binary_accretion') {
    const dist = 150;
    const totalM = 4.5;
    const v = Math.sqrt((G * totalM) / (dist * 4));

    const bh = createBody({
      name: 'Сингулярность Лебедь X-1',
      x: -dist / 2, y: 0, vx: 0, vy: -v,
      mass: 3.2,
      radius: 8.0,
      remnantType: 'black_hole',
      isRemnant: true
    });

    const giant = createBody({
      name: 'Красный гигант Донор',
      x: dist / 2, y: 0, vx: 0, vy: v,
      mass: 1.5,
      radius: 22.0,
      composition: { H: 0.20, He: 0.70, C: 0.10, Fe: 0.0 }
    });

    bodies.push(bh, giant);
    selectedId = bh.id;
  } else if (id === 'jeans_cloud') {
    cameraZoom = 0.85;

    for (let i = 0; i < 180; i++) {
      const rad = Math.random() * 260 + 25;
      const theta = Math.random() * Math.PI * 2;
      const px = Math.cos(theta) * rad;
      const py = Math.sin(theta) * rad;
      const rotSpeed = 0.48;
      const vx = -Math.sin(theta) * rotSpeed * (rad / 260) + (Math.random() - 0.5) * 0.15;
      const vy = Math.cos(theta) * rotSpeed * (rad / 260) + (Math.random() - 0.5) * 0.15;

      particles.push(createParticle(
        px, py, vx, vy,
        Math.random() > 0.3 ? '#38bdf8' : '#fb923c',
        Math.random() * 2.5 + 1.2,
        Infinity,
        true,
        0.015
      ));
    }

    const seed = createBody({
      name: 'Протозвездный зародыш',
      x: 0, y: 0, vx: 0, vy: 0,
      mass: 0.35, radius: 7.0, Tcore: 5.0
    });
    bodies.push(seed);
    selectedId = seed.id;
  } else if (id === 'white_dwarf_test') {
    const wd = createBody({
      name: 'Белый карлик Сириус-B',
      x: 0, y: 0, vx: 0, vy: 0,
      mass: 0.95,
      radius: 4.5,
      Teff: 38000,
      Tcore: 40.0,
      remnantType: 'white_dwarf',
      isRemnant: true,
      composition: { H: 0.0, He: 0.05, C: 0.85, Fe: 0.10 }
    });
    bodies.push(wd);
    selectedId = wd.id;
  }

  return { bodies, particles, selectedId, cameraZoom };
}
