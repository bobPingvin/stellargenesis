# Обзор архитектурных, поведенческих и функциональных диаграмм проекта
**Проект:** Интерактивный симулятор релятивистской гравитации, гравитационного линзирования и звездной эволюции («AstroPhysics Engine»)  
**Дисциплина:** ПМ.02 «Осуществление интеграции программных модулей»  
**ГБПОУ НСО «НЭК», 2026 г.**

---

## Содержание
1. [Классификация диаграмм](#1-классификация-диаграмм)
2. [Структурные диаграммы (UML)](#2-структурные-диаграммы-uml)
   - 2.1. Диаграмма классов (Class Diagram)
   - 2.2. Диаграмма компонентов (Component Diagram)
   - 2.3. Диаграмма развертывания (Deployment Diagram)
3. [Поведенческие диаграммы (UML)](#3-поведенческие-диаграммы-uml)
   - 3.1. Диаграмма прецедентов (Use Case Diagram)
   - 3.2. Диаграмма деятельности (Activity Diagram)
   - 3.3. Диаграмма состояний (State Machine Diagram)
   - 3.4. Диаграмма последовательности / кооперации (Sequence Diagram)
4. [Функциональные диаграммы (IDEF0 и DFD)](#4-функциональные-диаграммы-idef0-и-dfd)
   - 4.1. IDEF0 A-0 (Контекстная диаграмма)
   - 4.2. IDEF0 A0 (Декомпозиция верхнего уровня)
   - 4.3. DFD Уровень 0 (Контекстная диаграмма потоков данных)
   - 4.4. DFD Уровень 1 (Декомпозиция потоков данных)

---

## 1. Классификация диаграмм

| № | Название диаграммы | Нотация / Стандарт | Тип | Назначение в проекте |
|---|-------------------|--------------------|-----|----------------------|
| 1 | Диаграмма классов | UML 2.5 | Структурная | Описание типов данных небесных тел, состояния физики, камеры и их отношений |
| 2 | Диаграмма компонентов | UML 2.5 | Структурная | Компонентная архитектура модулей UI, Physics Core, WebGL Shader, Web Audio |
| 3 | Диаграмма развертывания | UML 2.5 | Структурная | Физическая топология выполнения в среде Web Browser / V8 / WebGL GPU |
| 4 | Диаграмма Use Case | UML 2.5 | Поведенческая | Пользовательские сценарии исследователя, студента и астрофизика |
| 5 | Диаграмма деятельности | UML 2.5 | Поведенческая | Алгоритм расчета кадра симуляции (гравитация N-тел, слияния, коллапс, рендеринг) |
| 6 | Диаграмма состояний | UML 2.5 | Поведенческая | Жизненный цикл звездного объекта: Протозвезда -> ГП -> Сверхгигант -> Сверхновая -> Реликт |
| 7 | Диаграмма последовательности | UML 2.5 | Поведенческая | Взаимодействие CanvasViewport, PhysicsEngine, WebGLShader и SoundEngine |
| 8 | IDEF0 A-0 | IDEF0 | Функциональная | Контекст процесса «Моделирование астрофизических систем и ОТО» |
| 9 | IDEF0 A0 | IDEF0 | Функциональная | Декомпозиция на ввод параметров, расчет механики, термодинамику и визуализацию |
| 10 | DFD Уровень 0 | Gane-Sarson / Yourdon | Потоки данных | Контекстное движение данных от пользователя и времени к рендереру и аудио |
| 11 | DFD Уровень 1 | Gane-Sarson / Yourdon | Потоки данных | Детализация хранилищ тел, частиц, пресетов и матриц искривления пространства |

---

## 2. Структурные диаграммы (UML)

### 2.1. Диаграмма классов (Class Diagram)
Показывает логическую модель предметной области: сущности небесных тел, частицы аккреции, термодинамический состав и структуры настроек симулятора.

```mermaid
classDiagram
    class CelestialBody {
        +string id
        +string name
        +number x
        +number y
        +number vx
        +number vy
        +number mass
        +number radius
        +string color
        +string type
        +RemnantType remnantType
        +ChemicalComposition composition
        +number coreTemp
        +number coreDensity
        +number luminosity
        +number age
        +number spinRate
        +Point[] trail
        +boolean isLocked
        +number dopplerShift
        +calculateSchwarzschildRadius() number
        +calculatePhotonSphereRadius() number
    }

    class Particle {
        +number x
        +number y
        +number vx
        +number vy
        +number ax
        +number ay
        +number mass
        +number radius
        +number life
        +number maxLife
        +string color
        +boolean isGas
        +number stretch
        +number stretchAngle
        +number intensity
        +number splitCount
    }

    class ChemicalComposition {
        +number H
        +number He
        +number C
        +number O
        +number Si
        +number Fe
    }

    class SimulationSettings {
        +number G
        +number softening
        +number timeSpeed
        +boolean showTrails
        +boolean showVectors
        +boolean soundEnabled
        +boolean dopplerEffect
        +boolean stellarEvolution
        +number stellarEvolutionSpeed
        +string graphicsQuality
        +boolean enableLensingShader
        +number maxParticles
        +boolean showSpacetimeGrid
        +boolean adaptiveGrid
    }

    class CameraState {
        +number x
        +number y
        +number zoom
    }

    class BlackHoleScreenData {
        +number screenX
        +number screenY
        +number screenRs
        +number screenEinsteinRadius
        +number mass
        +number spin
    }

    CelestialBody "1" *-- "1" ChemicalComposition : содержит
    CelestialBody ..> Particle : порождает при разрыве / сверхновой
    CelestialBody ..> BlackHoleScreenData : транслируется в экранные координаты
    SimulationSettings ..> CelestialBody : управляет физикой
```

### 2.2. Диаграмма компонентов (Component Diagram)
Описывает архитектуру клиентского приложения, разделение на слои представления (React UI), физического ядра (Physics Engine), графического конвейера (WebGL Lensing Shader & 2D Canvas) и аудиодвижка (Web Audio API).

```mermaid
graph TD
    subgraph Presentation Layer [Уровень представления (UI)]
        App[App.tsx - Главный контейнер]
        HUD[HUDOverlay - Телеметрия и параметры]
        Flyout[FlyoutMenu - Панели настроек и пресетов]
        CanvasView[CanvasViewport - Контроллер полотна рендеринга]
    end

    subgraph Physics Engine Layer [Вычислительный слой физики]
        Engine[engine.ts - Интегратор ОТО и механики N-тел]
        Cosmos[proceduralUniverse.ts - Генератор секторов]
        LensingMath[gravitationalLensing.ts - Геодезические искривления]
    end

    subgraph Graphics & Rendering Layer [Графический конвейер]
        Canvas2D[HTML5 Canvas 2D Context - Тела и шлейфы]
        WebGLShader[screenSpaceLensingShader.ts - GLSL Шейдер гравилинз]
    end

    subgraph Audio Service Layer [Акустический слой]
        SoundSys[sound.ts - Синтезатор Web Audio API]
    end

    App --> CanvasView
    App --> HUD
    App --> Flyout
    CanvasView --> Engine
    CanvasView --> Cosmos
    CanvasView --> LensingMath
    CanvasView --> WebGLShader
    CanvasView --> Canvas2D
    Engine --> SoundSys
```

### 2.3. Диаграмма развертывания (Deployment Diagram)
Показывает бессерверную архитектуру (Single Page Application, SPA), где весь цикл симуляции исполняется на клиентском оборудовании с аппаратным ускорением GPU.

```mermaid
graph LR
    subgraph Client Workstation [Рабочая станция пользователя]
        subgraph Web Browser [Современный браузер с поддержкой HTML5/WebGL2]
            subgraph JavaScript Engine [V8 / SpiderMonkey Runtime]
                ReactApp[React 19 SPA Bundle]
                PhysicsWorker[Physics Simulation Loop 60 FPS]
                WebAudioContext[Web Audio AudioContext Node Graph]
            end
            subgraph Hardware Accelerated Rendering [GPU Context]
                CanvasDisplay[HTML5 Canvas Element]
                WebGLFragmentPipeline[GLSL Screen-Space Lensing Shader]
            end
        end
    end

    subgraph Hosting / CDN Infrastructure [Статический хостинг приложения]
        StaticServer[Static Web Server / Cloud Run CDN]
        Assets[HTML, CSS, JS Bundles, Audio Presets]
    end

    StaticServer -- "HTTPS / TLS 1.3 (Load bundle once)" --> WebBrowser
    ReactApp --> PhysicsWorker
    PhysicsWorker --> CanvasDisplay
    PhysicsWorker --> WebGLFragmentPipeline
    PhysicsWorker --> WebAudioContext
```

---

## 3. Поведенческие диаграммы (UML)

### 3.1. Диаграмма вариантов использования (Use Case)

```mermaid
graph TD
    User((Пользователь / Студент))
    
    UC1[Запуск и управление течением времени]
    UC2[Выбор астрофизического сценария / пресета]
    UC3[Создание и запуск небесного тела]
    UC4[Настройка физических параметров: G, сетка, линзирование]
    UC5[Наблюдение релятивистских эффектов: Доплер, спагеттификация, горизонт]
    UC6[Инициирование коллапса звезды и взрыва сверхновой]
    UC7[Экспорт/импорт конфигурации симулятора]

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7

    UC3 ..> |include| UC4
    UC6 ..> |extend| UC5
```

### 3.2. Диаграмма деятельности (Activity Diagram)
Отражает жизненный цикл единичного такта расчета кадра симуляции (Frame Step Loop).

```mermaid
flowchart TD
    Start([Старт такта requestAnimationFrame]) --> CheckPause{Симуляция на паузе?}
    CheckPause -- Да --> RenderScene[Рендеринг статической сцены]
    CheckPause -- Нет --> SubSteps[Разбиение dt на N суб-шагов интегратора]
    
    SubSteps --> CalcGravity[Расчет взаимных Ньютоновских сил O N^2 с softening]
    CalcGravity --> Integrator[Интегрирование скоростей и координат Верле]
    Integrator --> CheckCollision{Расстояние < Суммы радиусов?}
    
    CheckCollision -- Да --> ResolveMerge[Слияние тел с сохранением импульса и массы]
    CheckCollision -- Нет --> Accretion[Приливной захват частиц и спагеттификация]
    ResolveMerge --> StellarLife
    Accretion --> StellarLife[Термодинамический цикл нуклеосинтеза звезды]
    
    StellarLife --> CheckSupernova{Масса > Лимита и железо истощено?}
    CheckSupernova -- Да --> DetonateSN[Взрыв сверхновой, эмиссия ударной волны, рождение реликта]
    CheckSupernova -- Нет --> BackgroundRender
    DetonateSN --> BackgroundRender[Рендеринг звездного фона и сетки ОТО]
    
    BackgroundRender --> ShaderPass{Включен WebGL шейдер линзирования?}
    ShaderPass -- Да --> ApplyGLSL[GLSL пост-обработка лучей и кольца Эйнштейна]
    ShaderPass -- Нет --> DirectCanvas[Прямой 2D рендеринг]
    ApplyGLSL --> BodiesRender[Отрисовка тел с эффектом Доплера и дисков аккреции]
    DirectCanvas --> BodiesRender
    BodiesRender --> AudioTrigger[Генерация звуковых откликов Web Audio API]
    AudioTrigger --> End([Завершение кадра])
```

### 3.3. Диаграмма состояний (State Machine Diagram)
Описывает эволюционные стадии космического объекта.

```mermaid
stateDiagram-v2
    [*] --> ProtoStar : Создание протозвездного облака
    ProtoStar --> MainSequence : Гравитационный коллапс и запуск термоядерного синтеза H -> He
    
    state MainSequence {
        [*] --> BurningHydrogen
        BurningHydrogen --> HydrogenDepleted : Выгорание водородного ядра
    }

    MainSequence --> RedGiant : Расширение оболочки, запуск синтеза гелия
    
    state RedGiant {
        [*] --> HeliumFlash
        HeliumFlash --> CarbonOxygenCore
    }

    RedGiant --> WhiteDwarf : Масса < 1.44 M☉ (сброс планетарной туманности)
    RedGiant --> SupernovaExplosion : Масса > 8.0 M☉ (коллапс ядра из железа)

    state SupernovaExplosion {
        [*] --> ShockwaveEmission
        ShockwaveEmission --> EjectaDispersal
    }

    SupernovaExplosion --> NeutronStar_Pulsar : 1.44 M☉ <= Ореол <= 3.0 M☉ (Предел Оппенгеймера-Волкова)
    SupernovaExplosion --> StellarBlackHole : Масса ядра > 3.0 M☉

    StellarBlackHole --> IntermediateMassBlackHole : Аккреция материи и гравитационные слияния
    WhiteDwarf --> [*]
    NeutronStar_Pulsar --> [*]
    IntermediateMassBlackHole --> [*]
```

### 3.4. Диаграмма последовательности (Sequence Diagram)
Взаимодействие компонентов в процессе симуляции одного физического тика и отрисовки кадра с гравитационной линзой.

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Браузер (RAF)
    participant Viewport as CanvasViewport
    participant Engine as Physics Engine
    participant Shader as WebGL Lensing Shader
    participant Canvas as 2D Render Context
    participant Audio as Sound Engine

    Browser->>Viewport: triggerAnimationFrame(timestamp)
    Viewport->>Engine: updatePhysics(bodies, particles, settings, dt)
    activate Engine
    Engine->>Engine: calculatePairwiseForces()
    Engine->>Engine: integrateGeodesicsAndVelocities()
    Engine->>Engine: processThermodynamicsAndCollisions()
    Engine-->>Audio: playCollisionSound(mass, velocity)
    Engine-->>Viewport: updatedState(bodies, particles, events)
    deactivate Engine

    Viewport->>Canvas: clearRect(0, 0, width, height)
    Viewport->>Canvas: renderProceduralCosmos(bgStars, nebulae)
    Viewport->>Canvas: renderSpacetimeFabric(curvedGrid)

    alt В кадре есть черные дыры и включен WebGL
        Viewport->>Shader: renderLensing(targetCanvas, bgCanvas, blackHoleUniforms)
        activate Shader
        Shader->>Shader: executeRayBendingAndPhotonRings()
        Shader-->>Viewport: compositedLensedBuffer
        deactivate Shader
    end

    Viewport->>Canvas: drawAccretionDisksAndParticles()
    Viewport->>Canvas: drawCelestialBodiesWithDopplerShift()
    Viewport->>Canvas: renderSupernovaShockwaves()
    Viewport-->>Browser: frameComplete()
```

---

## 4. Функциональные диаграммы (IDEF0 и DFD)

### 4.1. IDEF0 A-0 (Контекстная диаграмма)

```mermaid
graph LR
    subgraph ВХОДЫ_I [Входы - Inputs]
        I1[Начальные координаты и векторы скоростей]
        I2[Параметры тел: масса, состав, радиус]
        I3[Действия пользователя: ввод мышью/тач, масштабирование]
    end

    subgraph УПРАВЛЕНИЕ_C [Управление - Controls]
        C1[Законы классической механики Ньютона]
        C2[Уравнения Эйнштейна ОТО и метрика Шварцшильда]
        C3[Пределы Чандрасекара и Оппенгеймера-Волкова]
        C4[Частота обновления экрана 60 FPS / Budget 16.6ms]
    end

    subgraph ПРОЦЕСС [Главный блок A0]
        MainBlock["А0: Моделирование релятивистских гравитационных систем и звездной эволюции"]
    end

    subgraph ВЫХОДЫ_O [Выходы - Outputs]
        O1[Кадры рендеринга на Canvas с эффектом гравилинзирования]
        O2[Интерактивная телеметрия: скорости, массы, спектры, FPS]
        O3[Акустические события Web Audio API: слияния, взрывы]
    end

    subgraph МЕХАНИЗМЫ_M [Механизмы - Mechanisms]
        M1[Вычислительный процессор CPU / Среда V8]
        M2[Графический ускоритель GPU / Шейдеры WebGL2]
        M3[Библиотека React 19 и HTML5 Canvas API]
    end

    I1 --> MainBlock
    I2 --> MainBlock
    I3 --> MainBlock

    C1 --> MainBlock
    C2 --> MainBlock
    C3 --> MainBlock
    C4 --> MainBlock

    MainBlock --> O1
    MainBlock --> O2
    MainBlock --> O3

    M1 --> MainBlock
    M2 --> MainBlock
    M3 --> MainBlock
```

### 4.2. IDEF0 A0 (Декомпозиция верхнего уровня)

```mermaid
graph TD
    subgraph A1 [A1: Сбор и валидация конфигурации]
        A1_Proc[Инициализация пресета или параметров спавна тел]
    end

    subgraph A2 [A2: Интегрирование гравитационной динамики]
        A2_Proc[Расчет сил O N^2, скоростей и столкновений Верле]
    end

    subgraph A3 [A3: Симуляция термоядерного нуклеосинтеза]
        A3_Proc[Расчет выгорания топлива, коллапса и детонаций]
    end

    subgraph A4 [A4: Синтез релятивистского изображения и аудио]
        A4_Proc[Построение деформированного пространства, GLSL линз и звука]
    end

    Inputs --> A1_Proc
    A1_Proc -- "Массив валидных тел и частиц" --> A2_Proc
    A2_Proc -- "Взаимные ускорения, плотность сжатия" --> A3_Proc
    A3_Proc -- "Обновленные массы, фазы звезд, триггеры взрывов" --> A4_Proc
    A2_Proc -- "Траектории, скорости и векторы" --> A4_Proc
    A4_Proc --> Outputs[Экранное изображение, телеметрия, звук]
```

### 4.3. DFD Уровень 0 (Контекстная диаграмма потоков данных)

```mermaid
graph LR
    subgraph Внешние_Сущности
        User[Астрофизик / Пользователь]
        Timer[Системный таймер requestAnimationFrame]
        Display[Видеоподсистема монитора]
        Speakers[Аудиосистема]
    end

    subgraph Процесс_Системы
        P0((0. Астрофизический симулятор AstroPhysics Engine))
    end

    User -- "Координаты клика, вектор запуска, выбор пресета" --> P0
    Timer -- "Временная метка dt, тактовый импульс" --> P0
    P0 -- "Графический буфер 60 FPS, искажение пространства" --> Display
    P0 -- "Цифровой аудиопоток синтезатора частот" --> Speakers
    P0 -- "Показатели телеметрии, спектральные сдвиги" --> User
```

### 4.4. DFD Уровень 1 (Декомпозиция потоков данных)

```mermaid
graph TD
    subgraph Внешние_Сущности
        User[Пользователь]
        RAF[Таймер браузера]
        Screen[Экран]
        AudioOut[Аудиоканал]
    end

    subgraph Хранилища_Данных
        D1[[(D1) Состояние тел BodiesState]]
        D2[[(D2) Частицы материи ParticlesState]]
        D3[[(D3) Глобальные константы SimulationSettings]]
        D4[[(D4) Каталог пресетов PresetsConfig]]
    end

    subgraph Подпроцессы
        P1((1.1 Управление сценой и ввод))
        P2((1.2 Расчет орбитальной механики))
        P3((1.3 Эволюция звездного состава))
        P4((1.4 Рендеринг метрики и линзирования))
        P5((1.5 Аудио-синтез))
    end

    User --> P1
    D4 --> P1
    P1 --> D1
    P1 --> D3

    RAF --> P2
    D1 <--> P2
    D2 <--> P2
    D3 --> P2

    P2 -- "Данные сжатия и кинетическая энергия" --> P3
    D1 <--> P3
    P3 -- "Эмиссия обломков" --> D2
    P3 -- "События взрывов" --> P5

    D1 --> P4
    D2 --> P4
    D3 --> P4
    P4 --> Screen

    P2 -- "Импульс соударений" --> P5
    P5 --> AudioOut
```

---
*Документ подготовлен для оформления курсового отчета и сдачи практической работы № 9.*
