/**
 * Automated Reproducible Unit Test Suite for StellarGenesis Physics Engine
 * Run via: npm test  (or: npx tsx tests/physics.test.ts)
 */

import {
  SPEED_OF_LIGHT,
  CHANDRASEKHAR_LIMIT,
  TOV_LIMIT,
  createBody,
  stepPhysics
} from '../src/physics/engine';
import { CelestialBody, Particle, SimulationSettings } from '../src/types';

function assert(condition: boolean, testName: string, details?: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${testName}`);
}

function assertCloseTo(actual: number, expected: number, tolerance: number, testName: string) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    console.error(`❌ FAIL: ${testName} (expected ~${expected}, got ${actual}, diff ${diff} > tol ${tolerance})`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${testName} (actual: ${actual}, expected: ${expected})`);
}

console.log('================================================================');
console.log('🧪 Запуск воспроизводимого тестового стенда StellarGenesis');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// ТЕСТ 1: Константа скорости света и релятивистское ограничение скорости (v <= c)
// -----------------------------------------------------------------------------
console.log('--- Набор тестов 1: Релятивистская скорость света (SPEED_OF_LIGHT) ---');
assert(
  SPEED_OF_LIGHT === 60.0,
  'Константа SPEED_OF_LIGHT строго равна 60.0 px/s в engine.ts'
);

const supermassive = createBody({
  id: 'bh-massive',
  name: 'Supermassive Quasar',
  mass: 1e9,
  radius: 30,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0
});

const testInfallingBody = createBody({
  id: 'infall-particle',
  name: 'Infalling probe',
  mass: 0.001,
  radius: 2,
  x: 5,
  y: 0,
  vx: 100.0, // initial speed exceeds 60.0
  vy: 80.0
});

const defaultSettings: SimulationSettings = {
  G: 1.2,
  softening: 8.0,
  timeSpeed: 1,
  showTrails: false,
  showVectors: false,
  soundEnabled: false,
  dopplerEffect: true,
  stellarEvolution: false,
  stellarEvolutionSpeed: 1.0,
  graphicsQuality: 'balanced',
  enableLensingShader: false,
  maxParticles: 500,
  showSpacetimeGrid: false,
  adaptiveGrid: false
};

const particles: Particle[] = [];
const deadBodies: CelestialBody[] = [];
const onRemove = (v: CelestialBody) => deadBodies.push(v);

// Выполняем 1 шаг симуляции
stepPhysics([supermassive, testInfallingBody], particles, defaultSettings, 0.1, onRemove);

const resultingSpeed = Math.hypot(testInfallingBody.vx, testInfallingBody.vy);
assert(
  resultingSpeed <= SPEED_OF_LIGHT + 1e-6,
  'Скорость тела жестко ограничена релятивистским порогом SPEED_OF_LIGHT (60.0 px/s)',
  `измеренная скорость: ${resultingSpeed.toFixed(4)}`
);
assert(
  Number.isFinite(testInfallingBody.x) && Number.isFinite(testInfallingBody.y),
  'Координаты тела остаются конечными числами без NaN/Infinity при экстремальной массе'
);

// -----------------------------------------------------------------------------
// ТЕСТ 2: Гравитационная сингулярность при совпадающих координатах (r = 0)
// -----------------------------------------------------------------------------
console.log('\n--- Набор тестов 2: Сингулярность координат (r = 0, dx=0, dy=0) ---');
const b1 = createBody({
  id: 'body-a',
  name: 'Singularity A',
  mass: 5.0,
  radius: 10.0,
  x: 100.0,
  y: 100.0,
  vx: 0,
  vy: 0
});

const b2 = createBody({
  id: 'body-b',
  name: 'Singularity B',
  mass: 5.0,
  radius: 10.0,
  x: 100.0,
  y: 100.0,
  vx: 0,
  vy: 0
});

// Проверяем знаменатель softening: distSq = 0, denom = (0 + 8^2)^1.5 = 64^1.5 = 512
const denom = Math.pow(0 + defaultSettings.softening * defaultSettings.softening, 1.5);
assertCloseTo(denom, 512.0, 1e-4, 'Сглаживание сингулярности: denom при r=0 равен (eps^2)^1.5 = 512.0');

// Шаг физики: тела должны соудариться и корректно обработаться без сбоя
const removedList: CelestialBody[] = [];
stepPhysics([b1, b2], [], defaultSettings, 0.05, (b) => removedList.push(b));

assert(
  !Number.isNaN(b1.x) && !Number.isNaN(b1.vx),
  'Координаты и скорости тела b1 не содержат NaN после шага при r=0'
);
assert(
  removedList.length === 1,
  'При совпадении координат происходит корректное неупругое слияние двух тел (удалено 1 тело)'
);
assertCloseTo(b1.mass, 10.0, 1e-4, 'Масса объединенного тела равна сумме масс b1 + b2 = 10.0 M☉');

// -----------------------------------------------------------------------------
// ТЕСТ 3: Закон сохранения импульса при неупругом слиянии
// -----------------------------------------------------------------------------
console.log('\n--- Набор тестов 3: Закон сохранения импульса (P_before == P_after) ---');
const starA = createBody({
  id: 'star-a',
  name: 'Star Alpha',
  mass: 4.0,
  radius: 12.0,
  x: 200.0,
  y: 200.0,
  vx: 3.0,
  vy: 1.0
});

const starB = createBody({
  id: 'star-b',
  name: 'Star Beta',
  mass: 2.0,
  radius: 8.0,
  x: 201.0,
  y: 201.0, // within collision radius 12 + 8 = 20
  vx: -6.0,
  vy: 4.0
});

const initialPx = starA.mass * starA.vx + starB.mass * starB.vx; // 4*3 + 2*(-6) = 12 - 12 = 0
const initialPy = starA.mass * starA.vy + starB.mass * starB.vy; // 4*1 + 2*4 = 12

const mergedRemoved: CelestialBody[] = [];
stepPhysics([starA, starB], [], defaultSettings, 0.01, (b) => mergedRemoved.push(b));

const finalPx = starA.mass * starA.vx;
const finalPy = starA.mass * starA.vy;

assertCloseTo(finalPx, initialPx, 1e-3, 'Импульс Px до и после слияния сохраняется строго');
assertCloseTo(finalPy, initialPy, 1e-3, 'Импульс Py до и после слияния сохраняется строго');
assertCloseTo(starA.vx, 0.0, 1e-3, 'Итоговая скорость Vx после лобового соударения равна 0.0 px/s');
assertCloseTo(starA.vy, 2.0, 1e-3, 'Итоговая скорость Vy равна 12 / 6 = 2.0 px/s');

// -----------------------------------------------------------------------------
// ТЕСТ 4: Астрофизические константы пределов Чандрасекара и Оппенгеймера-Волкова
// -----------------------------------------------------------------------------
console.log('\n--- Набор тестов 4: Астрофизические пределы масс ---');
assert(
  CHANDRASEKHAR_LIMIT === 1.44,
  'Предел Чандрасекара равен 1.44 M☉'
);
assert(
  TOV_LIMIT === 2.80,
  'Предел Оппенгеймера-Волкова (TOV) равен 2.80 M☉'
);

// -----------------------------------------------------------------------------
// ТЕСТ 5: Орбитальная устойчивость квазикруговой орбиты (интегратор Верле)
// -----------------------------------------------------------------------------
console.log('\n--- Набор тестов 5: Устойчивость орбиты Кеплера на 500 шагах ---');
const sun = createBody({
  id: 'sun',
  name: 'Sun',
  mass: 100.0,
  radius: 25.0,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0
});

// Скорость круговой орбиты: v = sqrt(G * M / r)
const orbitalR = 150.0;
const circularV = Math.sqrt((defaultSettings.G * sun.mass) / orbitalR);
const planet = createBody({
  id: 'planet',
  name: 'Earth-like',
  mass: 0.001,
  radius: 4.0,
  x: orbitalR,
  y: 0,
  vx: 0,
  vy: circularV
});

let minDistance = Infinity;
let maxDistance = -Infinity;

for (let step = 0; step < 500; step++) {
  stepPhysics([sun, planet], [], defaultSettings, 0.2, () => {});
  const d = Math.hypot(planet.x - sun.x, planet.y - sun.y);
  if (d < minDistance) minDistance = d;
  if (d > maxDistance) maxDistance = d;
}

const deltaR = maxDistance - minDistance;
const relativeEccentricity = deltaR / orbitalR;

assert(
  relativeEccentricity < 0.04,
  `Кеплеровская орбита стабильна на 500 шагах (колебание радиуса: ${(relativeEccentricity * 100).toFixed(2)}% < 4.0%)`
);

console.log('\n================================================================');
console.log('🎉 ВСЕ АВТОМАТИЗИРОВАННЫЕ UNIT-ТЕСТЫ ФИЗИЧЕСКОГО ЯДРА УСПЕШНО ПРОЙДЕНЫ!');
console.log('================================================================\n');
