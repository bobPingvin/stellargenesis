/**
 * StellarGenesis - Core Types & Interfaces
 */

export type RemnantType = 'white_dwarf' | 'pulsar' | 'black_hole' | null;

export type StellarEvolutionStage =
  | 'main_sequence'     // Водородный огонь (H -> He)
  | 'red_giant'         // Раздувание оболочки, горение гелия (He -> C)
  | 'supergiant'        // Сверхгигант, горение углерода (C -> Fe)
  | 'iron_crisis'       // Железный кризис ядра, предколлапс
  | 'white_dwarf'       // Белый карлик
  | 'pulsar'            // Нейтронная звезда / Пульсар
  | 'black_hole';       // Черная дыра

export type SpectralClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M' | 'RED_GIANT' | 'WHITE_DWARF' | 'PULSAR' | 'BLACK_HOLE';

export interface ChemicalComposition {
  H: number;   // Hydrogen fraction (0..1)
  He: number;  // Helium fraction (0..1)
  C: number;   // Carbon/Oxygen fraction (0..1)
  Fe: number;  // Iron core fraction (0..1)
}

export interface TrailPoint {
  x: number;
  y: number;
}

export interface CelestialBody {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  mass: number;           // in Solar Masses M☉
  radius: number;         // visual simulation radius
  targetRadius: number;
  radialVelocity: number;
  Tcore: number;          // Core temperature in Millions Kelvin (10^6 K)
  Teff: number;           // Effective surface temperature in Kelvin
  luminosity: number;     // in Solar Luminosities L☉
  composition: ChemicalComposition;
  remnantType: RemnantType;
  isRemnant: boolean;
  spinRate: number;       // for pulsars & stars
  rotationAngle: number;
  hasExploded: boolean;
  
  // Stellar Evolution Tracking
  evolutionStage?: StellarEvolutionStage;
  initialMass?: number;
  stellarAge?: number;

  // Thermodynamic pressures
  P_grav: number;
  P_gas: number;
  P_rad: number;
  balanceRatio: number;   // P_out / P_grav

  // Tidal disruption & spaghettification state
  isDisrupting?: boolean;
  disruptingProgress?: number; // 0..1
  disruptedById?: string | null;
  tidalStretch?: { factor: number; angle: number };
  dopplerShift?: number; // relativistic redshift/blueshift z

  trail: TrailPoint[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
  isGas: boolean;
  mass: number;
  stretch?: number;       // Spaghettification factor (>= 1.0)
  stretchAngle?: number;  // Direction of tidal elongation
  intensity?: number;     // Luminous heating factor
  splitCount?: number;    // Number of times particle has fragmented
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export type ToolType = 'select' | 'move' | 'spawn_star' | 'spawn_gas' | 'pump_mass' | 'spawn_blackhole';

export type NebulaPresetType = 'emission_h2' | 'reflection_blue' | 'planetary_ring' | 'supernova_remnant' | 'proto_stellar';

export interface NebulaConfig {
  type: NebulaPresetType;
  radius: number;
  particleDensity: number;
  swirlVelocity: number;
}

export type PresetId = 
  | 'solar'
  | 'massive_sn'
  | 'hyper_bh'
  | 'binary_accretion'
  | 'jeans_cloud'
  | 'white_dwarf_test';

export interface PresetInfo {
  id: PresetId;
  title: string;
  shortDesc: string;
  fullDesc: string;
  icon: string;
  difficulty: 'Базовый' | 'Продвинутый' | 'Релятивистский';
}

export interface ToastMessage {
  id: string;
  title: string;
  body: string;
  icon?: string;
  type: 'info' | 'supernova' | 'blackhole' | 'fusion' | 'warning';
}

export interface SimulationSettings {
  G: number;               // Gravity constant
  softening: number;       // Softening factor epsilon
  timeSpeed: number;       // 0.5, 1, 5, 50, 1000
  showTrails: boolean;
  showVectors: boolean;
  soundEnabled: boolean;
  dopplerEffect: boolean;  // Relativistic Doppler spectral shift
  stellarEvolution: boolean;       // Automatic stellar lifecycle & collapse
  stellarEvolutionSpeed: number;   // Evolution speed multiplier (1x, 2x, 5x, 10x)
  graphicsQuality?: 'ultra' | 'balanced' | 'performance'; // Preset
  enableLensingShader?: boolean;   // WebGL screen-space lensing shader
  maxParticles?: number;           // Dynamic particle cap (300 - 2000)
  showSpacetimeGrid?: boolean;     // Einstein spacetime fabric coordinate grid
  adaptiveGrid?: boolean;          // Dynamic LOD grid sampling
}
