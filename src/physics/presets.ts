/**
 * Astronomical and Astrophysical Presets
 */

import { CelestialBody, Particle, PresetId, PresetInfo } from '../types';
import { createBody, createParticle } from './engine';
import { ASTRONOMICAL_RADII_KM } from './celestialScales';

export const PRESETS_CATALOG: PresetInfo[] = [
  {
    id: 'solar',
    title: 'Солнечная система',
    shortDesc: 'Солнце, все 8 планет, Плутон и спутники',
    fullDesc: 'Сверхреалистичная модель Солнечной системы: Солнце, все 8 планет (Меркурий, Венера, Земля с Луной, Марс со спутниками, Юпитер с 4 галилеевыми лунами, Сатурн с кольцами, Уран, Нептун с Тритоном) и Плутон с Хароном.',
    icon: '☀️',
    difficulty: 'Базовый'
  },
  {
    id: 'crab_pulsar',
    title: 'Крабовидный Пульсар & Пучки',
    shortDesc: 'Нейтронная звезда PSR B0531+21',
    fullDesc: 'Сверхплотная нейтронная звезда с бешеной скоростью вращения (30 об/с), колоссальным магнитным полем 10¹² Гс и знаменитыми релятивистскими пучками синхротронного излучения, пронизывающими окружающую туманность.',
    icon: '⚡',
    difficulty: 'Релятивистский'
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
    cameraZoom = 0.65;
    const sun = createBody({
      name: 'Солнце (G2V)',
      x: 0, y: 0, vx: 0, vy: 0,
      mass: 1.0,
      radius: 36.0,
      realRadiusKm: 696340.0,
      planetKey: 'sun',
      Tcore: 15.7,
      Teff: 5778,
      luminosity: 1.0,
      composition: { H: 0.74, He: 0.24, C: 0.018, Fe: 0.002 },
      customDescription: 'Желтый карлик класса G2V в центре Солнечной системы, содержащий 99.86% массы всей системы.'
    });
    bodies.push(sun);
    selectedId = sun.id;

    // Helper to spawn a planet and its orbiting moons with precise Keplerian velocities
    const spawnPlanetSystem = (planetConfig: {
      name: string;
      dist: number;
      mass: number;
      radius: number;
      realRadiusKm?: number;
      planetKey: import('../types').PlanetKey;
      hasRings?: boolean;
      ringInnerRadius?: number;
      ringOuterRadius?: number;
      ringColor?: string;
      axialTilt?: number;
      atmosphereColor?: string;
      customDescription?: string;
      moons?: Array<{
        name: string;
        dist: number;
        mass: number;
        radius: number;
        realRadiusKm?: number;
        planetKey: import('../types').PlanetKey;
        customDescription?: string;
      }>;
    }) => {
      // Planet orbit around Sun (counter-clockwise prograde)
      const vp = Math.sqrt((G * sun.mass) / planetConfig.dist);
      const px = planetConfig.dist;
      const py = 0;
      const pvx = 0;
      const pvy = vp;

      const planet = createBody({
        name: planetConfig.name,
        x: px, y: py,
        vx: pvx, vy: pvy,
        mass: planetConfig.mass,
        radius: planetConfig.radius,
        realRadiusKm: planetConfig.realRadiusKm || (planetConfig.planetKey ? ASTRONOMICAL_RADII_KM[planetConfig.planetKey] : undefined),
        planetKey: planetConfig.planetKey,
        isPlanet: true,
        hasRings: planetConfig.hasRings,
        ringInnerRadius: planetConfig.ringInnerRadius,
        ringOuterRadius: planetConfig.ringOuterRadius,
        ringColor: planetConfig.ringColor,
        axialTilt: planetConfig.axialTilt,
        atmosphereColor: planetConfig.atmosphereColor,
        customDescription: planetConfig.customDescription,
        Tcore: 0.05,
        Teff: Math.round(390 / Math.sqrt(planetConfig.dist / 100))
      });
      bodies.push(planet);

      // Moons orbiting parent planet
      if (planetConfig.moons && planetConfig.moons.length > 0) {
        planetConfig.moons.forEach((m, idx) => {
          // Stagger moon initial angular positions for visual aesthetics
          const angle = (idx * (Math.PI * 2 / planetConfig.moons!.length)) + 0.35;
          const mx = px + Math.cos(angle) * m.dist;
          const my = py + Math.sin(angle) * m.dist;

          // Moon velocity = Planet velocity + local orbital velocity around planet
          const vm = Math.sqrt((G * planet.mass) / m.dist);
          const mvx = pvx - Math.sin(angle) * vm;
          const mvy = pvy + Math.cos(angle) * vm;

          const moon = createBody({
            name: m.name,
            x: mx, y: my,
            vx: mvx, vy: mvy,
            mass: m.mass,
            radius: m.radius,
            realRadiusKm: m.realRadiusKm || (m.planetKey ? ASTRONOMICAL_RADII_KM[m.planetKey] : undefined),
            planetKey: m.planetKey,
            isPlanet: true,
            parentBodyId: planet.id,
            customDescription: m.customDescription,
            Tcore: 0.01,
            Teff: planet.Teff
          });
          bodies.push(moon);
        });
      }
    };

    // 1. Меркурий
    spawnPlanetSystem({
      name: 'Меркурий',
      dist: 65,
      mass: 0.003,
      radius: 2.7,
      realRadiusKm: 2439.7,
      planetKey: 'mercury',
      customDescription: 'Самая близкая к Солнцу планета. Покрыта бесчисленными древними кратерами, не имеет плотной атмосферы, перепады температур от -180°C до +430°C.'
    });

    // 2. Венера
    spawnPlanetSystem({
      name: 'Венера',
      dist: 105,
      mass: 0.008,
      radius: 6.6,
      realRadiusKm: 6051.8,
      planetKey: 'venus',
      atmosphereColor: '#fef08a',
      customDescription: '«Утренняя звезда» с чудовищным парниковым эффектом. Непрозрачная атмосфера из CO₂ с облаками из серной кислоты и температурой +465°C.'
    });

    // 3. Земля + Луна
    spawnPlanetSystem({
      name: 'Земля',
      dist: 155,
      mass: 0.012,
      radius: 7.0,
      realRadiusKm: 6371.0,
      planetKey: 'earth',
      atmosphereColor: '#38bdf8',
      axialTilt: 0.41,
      customDescription: 'Наш космический дом. Единственная известная планета с биосферой, жидкими океанами и защитной азотно-кислородной атмосферой.',
      moons: [
        {
          name: 'Луна',
          dist: 16,
          mass: 0.0006,
          radius: 1.9,
          realRadiusKm: 1737.4,
          planetKey: 'moon',
          customDescription: 'Естественный спутник Земли (радиус 1737 км, в 3.67 раза меньше Земли). Темные базальтовые моря и светлые древние анортозитовые материки.'
        }
      ]
    });

    // 4. Марс + Фобос + Деймос
    spawnPlanetSystem({
      name: 'Марс',
      dist: 220,
      mass: 0.006,
      radius: 3.7,
      realRadiusKm: 3389.5,
      planetKey: 'mars',
      atmosphereColor: '#fca5a5',
      axialTilt: 0.44,
      customDescription: 'Красная планета с высочайшим вулканом Олимп (26 км), гигантским каньоном Долины Маринер и полярными шапками из сухого и водяного льда.',
      moons: [
        {
          name: 'Фобос',
          dist: 8.5,
          mass: 0.0001,
          radius: 0.8,
          realRadiusKm: 11.3,
          planetKey: 'phobos',
          customDescription: 'Ближний крошечный спутник Марса неправильной формы (радиус 11 км).'
        },
        {
          name: 'Деймос',
          dist: 13.5,
          mass: 0.0001,
          radius: 0.6,
          realRadiusKm: 6.2,
          planetKey: 'deimos',
          customDescription: 'Внешний микро-спутник Марса (радиус 6 км), покрытый слоем реголита.'
        }
      ]
    });

    // 5. Пояс астероидов (Церера)
    spawnPlanetSystem({
      name: 'Церера (Пояс астероидов)',
      dist: 285,
      mass: 0.002,
      radius: 1.0,
      realRadiusKm: 469.7,
      planetKey: 'ceres',
      customDescription: 'Крупнейшая карликовая планета Главного пояса астероидов с загадочными соляными пятнами в кратере Оккатор.'
    });

    // 6. Юпитер + 4 Галилеевых спутника
    spawnPlanetSystem({
      name: 'Юпитер',
      dist: 390,
      mass: 0.085,
      radius: 25.0,
      realRadiusKm: 69911.0,
      planetKey: 'jupiter',
      atmosphereColor: '#fed7aa',
      customDescription: 'Колоссальный газовый гигант (радиус 69 911 км, в 11 раз больше Земли!), гравитационный щит Солнечной системы с вихревыми поясами и Большим Красным Пятном.',
      moons: [
        {
          name: 'Ио',
          dist: 32,
          mass: 0.0005,
          radius: 2.0,
          realRadiusKm: 1821.6,
          planetKey: 'io',
          customDescription: 'Самое вулканически активное тело Солнечной системы с извергающимися гейзерами серы и раскаленной лавы.'
        },
        {
          name: 'Европа',
          dist: 42,
          mass: 0.0004,
          radius: 1.7,
          realRadiusKm: 1560.8,
          planetKey: 'europa',
          customDescription: 'Ледяной спутник с растрескавшейся ледяной корой, скрывающей глобальный подледный океан жидкой воды.'
        },
        {
          name: 'Ганимед',
          dist: 54,
          mass: 0.0007,
          radius: 2.9,
          realRadiusKm: 2634.1,
          planetKey: 'ganymede',
          customDescription: 'Крупнейший спутник Солнечной системы (превосходит Меркурий) и единственный с собственным магнитным полем.'
        },
        {
          name: 'Каллисто',
          dist: 68,
          mass: 0.0005,
          radius: 2.65,
          realRadiusKm: 2410.3,
          planetKey: 'callisto',
          customDescription: 'Древний темный спутник, поверхность которого сплошь изрыта кратерами с гигантским кольцевым бассейном Вальхалла.'
        }
      ]
    });

    // 7. Сатурн + Кольца + Титан + Энцелад
    spawnPlanetSystem({
      name: 'Сатурн',
      dist: 540,
      mass: 0.045,
      radius: 21.0,
      realRadiusKm: 58232.0,
      planetKey: 'saturn',
      hasRings: true,
      ringInnerRadius: 26.0,
      ringOuterRadius: 48.0,
      ringColor: '#fef08a',
      atmosphereColor: '#fef9c3',
      axialTilt: 0.47,
      customDescription: 'Жемчужина Солнечной системы (радиус 58 232 км). Обладает грандиозной системой сияющих ледяных колец шириной 280 000 км с делением Кассини.',
      moons: [
        {
          name: 'Энцелад',
          dist: 28,
          mass: 0.0002,
          radius: 0.9,
          realRadiusKm: 252.1,
          planetKey: 'enceladus',
          customDescription: 'Ослепительно белый ледяной спутник с мощными криовулканическими гейзерами водяного пара на южном полюсе.'
        },
        {
          name: 'Титан',
          dist: 45,
          mass: 0.0007,
          radius: 2.8,
          realRadiusKm: 2574.7,
          planetKey: 'titan',
          customDescription: 'Спутник с плотной азотной атмосферой (крупнее Меркурия), реками, озерами и метановыми дождями.'
        }
      ]
    });

    // 8. Уран + Тонкие кольца + Титания
    spawnPlanetSystem({
      name: 'Уран',
      dist: 700,
      mass: 0.022,
      radius: 13.0,
      realRadiusKm: 25362.0,
      planetKey: 'uranus',
      hasRings: true,
      ringInnerRadius: 16.0,
      ringOuterRadius: 24.0,
      ringColor: '#a5f3fc',
      atmosphereColor: '#67e8f9',
      axialTilt: 1.71, // 98 degrees
      customDescription: 'Ледяной гигант бирюзового цвета (радиус 25 362 км, в 4 раза больше Земли), вращающийся «лежа на боку» с наклоном оси 98°.',
      moons: [
        {
          name: 'Титания',
          dist: 28,
          mass: 0.0003,
          radius: 1.5,
          realRadiusKm: 788.4,
          planetKey: 'titania',
          customDescription: 'Крупнейший спутник Урана с глубокими каньонами и ударными бассейнами в замерзшей силикатно-ледяной коре.'
        }
      ]
    });

    // 9. Нептун + Тритон
    spawnPlanetSystem({
      name: 'Нептун',
      dist: 860,
      mass: 0.025,
      radius: 12.8,
      realRadiusKm: 24622.0,
      planetKey: 'neptune',
      atmosphereColor: '#38bdf8',
      axialTilt: 0.49,
      customDescription: 'Глубокий ультрамариновый ледяной гигант (радиус 24 622 км) с Большим Темным Пятном и самыми сверхзвуковыми ветрами в Солнечной системе (до 2100 км/ч).',
      moons: [
        {
          name: 'Тритон',
          dist: 30,
          mass: 0.0004,
          radius: 1.5,
          realRadiusKm: 1353.4,
          planetKey: 'triton',
          customDescription: 'Захваченный карлик из пояса Койпера с ретроградным вращением, азотными гейзерами и характерным рельефом «дынной корки».'
        }
      ]
    });

    // 10. Плутон + Харон
    spawnPlanetSystem({
      name: 'Плутон',
      dist: 1020,
      mass: 0.003,
      radius: 1.3,
      realRadiusKm: 1188.3,
      planetKey: 'pluto',
      atmosphereColor: '#cbd5e1',
      axialTilt: 2.13,
      customDescription: 'Карликовая планета в поясе Койпера (радиус 1188 км) с азотно-метановыми ледниками и знаменитым светлым сердцем — равниной Спутник.',
      moons: [
        {
          name: 'Харон',
          dist: 16,
          mass: 0.0008,
          radius: 0.8,
          realRadiusKm: 606.0,
          planetKey: 'charon',
          customDescription: 'Крупный двойной компаньон Плутона (радиус 606 км) с темным регионом Мордор на северном полюсе.'
        }
      ]
    });
  } else if (id === 'crab_pulsar') {
    cameraZoom = 1.1;
    // Central hyperdense Crab Pulsar
    const pulsar = createBody({
      name: 'Пульсар в Крабе (PSR B0531+21)',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: 1.6, // Typical neutron star mass in M☉
      radius: 5.5,
      realRadiusKm: 12.0, // 12 km physical radius!
      remnantType: 'pulsar',
      isRemnant: true,
      evolutionStage: 'pulsar',
      spinRate: 0.55,
      Teff: 150000,
      Tcore: 180.0,
      composition: { H: 0.0, He: 0.0, C: 0.02, Fe: 0.98 },
      customDescription: 'Молодая нейтронная звезда, остаток сверхновой 1054 года. Вращается со скоростью 30 оборотов в секунду, испуская мощнейшие коллимированные пучки гамма-, рентгеновского и оптического излучения.'
    });
    bodies.push(pulsar);
    selectedId = pulsar.id;

    // Relativistic pulsar wind nebula (Crab Nebula filaments & torus)
    const nebulaColors = ['#38bdf8', '#818cf8', '#c084fc', '#f43f5e', '#fef08a'];
    for (let i = 0; i < 220; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 35 + Math.random() * 260;
      const speed = Math.sqrt((G * pulsar.mass) / dist) * (0.85 + Math.random() * 0.35);
      const vx = -Math.sin(angle) * speed + (Math.random() - 0.5) * 0.4;
      const vy = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.4;
      const pColor = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];

      particles.push(createParticle(
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
        vx,
        vy,
        pColor,
        Math.random() * 3.5 + 1.2,
        Math.random() * 1200 + 400,
        true,
        0.005
      ));
    }

    // Companion captured neutron star or dense stellar core in orbit
    const compAngle = 1.1;
    const compDist = 240;
    const compSpeed = Math.sqrt((G * pulsar.mass) / compDist) * 1.05;
    const companion = createBody({
      name: 'Компаньон PSR B0531+21 B',
      x: Math.cos(compAngle) * compDist,
      y: Math.sin(compAngle) * compDist,
      vx: -Math.sin(compAngle) * compSpeed,
      vy: Math.cos(compAngle) * compSpeed,
      mass: 0.85,
      radius: 4.0,
      realRadiusKm: 6500.0,
      remnantType: 'white_dwarf',
      isRemnant: true,
      evolutionStage: 'white_dwarf',
      Teff: 45000,
      Tcore: 30.0,
      composition: { H: 0.05, He: 0.15, C: 0.75, Fe: 0.05 },
      customDescription: 'Плотный белый карлик в гравитационном захвате у пульсара, проходящий через его релятивистский ветер.'
    });
    bodies.push(companion);
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
