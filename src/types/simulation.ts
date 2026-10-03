export type CameraViewMode = 
  | 'chase'            // Third-person trailing camera
  | 'bridge'           // Helm / bridge viewscreen POV
  | 'interior_bridge'  // Full 3D interior bridge cabin
  | 'cinematic'        // Sweeping cinematic flyby
  | 'saucer'           // Upper Saucer deck looking forward
  | 'nacelle'          // Mounted on starboard nacelle
  | 'deflector'        // Forward angle beneath deflector
  | 'orbit';           // Free 360° inspection orbit

export type AlertLevel = 'green' | 'yellow' | 'red';

export interface SolarSystem {
  id: string;
  name: string;
  quadrant: string;
  primaryStar: string;
  spectralType: string;
  centerCoordinates: [number, number, number];
  description: string;
  planets: PlanetData[];
  isWarZone?: boolean;
  territory?: 'federation' | 'non_federation';
  affiliation?: string;
}

export interface PlanetData {
  id: string;
  name: string;
  systemId: string;
  type: 'terran' | 'gas_giant' | 'desert' | 'ice' | 'volcanic' | 'starbase' | 'moon' | 'anomaly';
  radius: number;
  position: [number, number, number];
  textureColor: string;
  atmosphereColor?: string;
  hasRings?: boolean;
  ringInner?: number;
  ringOuter?: number;
  ringColor?: string;
  description: string;
  orbitalPeriod?: number;
}

export interface CoursePlot {
  targetSystem: SolarSystem;
  targetPlanet: PlanetData;
  destinationPos: [number, number, number];
  distance: number;
  etaSeconds: number;
  isEngaged: boolean;
  phase: 'aligning' | 'warping' | 'arrival' | 'standard_orbit';
}

export type EnemyFaction = 'klingon' | 'romulan' | 'gorn';

export interface EnemyShipState {
  id: string;
  name: string;
  faction: EnemyFaction;
  shipClass: string;
  position: [number, number, number];
  distanceToPlayer: number;
  shieldPercent: number;
  hullPercent: number;
  isAlive: boolean;
  isHostile: boolean;
  state: 'patrol' | 'engaging' | 'evading';
  isMothership?: boolean;
  rank?: string;
  isElite?: boolean;
  isCloaked?: boolean;
}

export interface AdaptiveCombatMetrics {
  combatRating: number;              // 0 to 250+ (100 baseline)
  playerSuccessRate: number;         // 0 to 100% computed success rate
  skillTier: 'Cadet' | 'Officer' | 'Veteran' | 'Ace' | 'Legendary';
  winStreak: number;
  totalKills: number;
  playerAccuracyPercent: number;     // e.g. 78%
  damageEfficiencyRatio: number;     // damage dealt / damage taken
  adaptiveDamageMultiplier: number;  // 1.0 to 2.4x
  fleetIntelligenceTier: 'Standard' | 'Tactical' | 'Coordinated' | 'Predictive' | 'Apex Swarm';
  fleetIntelligenceLevel: number;    // 1 to 5
  evasionEfficacyPercent: number;    // % of enemy torpedoes successfully avoided
  flankingAggression: number;        // 1.0 to 2.5x flanking speed
  predictiveLeadAim: boolean;        // Whether hostiles lead fire ahead of player
  averageTimeToKill: number;         // Seconds per enemy vessel
}

export interface PlayerProgression {
  level: number;
  rank: 'Ensign' | 'Lieutenant' | 'Lt Commander' | 'Commander' | 'Captain' | 'Fleet Captain' | 'Admiral';
  xp: number;
  nextLevelXp: number;
  totalEnemiesDestroyed: number;
  scoutsDestroyed: number;
  cruisersDestroyed: number;
  mothershipsDestroyed: number;
  activeThreatLevel: 'Standard' | 'Elevated' | 'Severe' | 'Critical' | 'Extreme' | 'Lethal';
}

export interface CombatWaveState {
  level: number;
  status: 'active' | 'cleared' | 'standby';
  activeFaction: EnemyFaction;
  countdown: number;
  totalEnemiesInWave: number;
  enemiesAlive: number;
  mothershipAlive: boolean;
  sectorStatusText: string;
  threatLevel: 'Standard' | 'Elevated' | 'Severe' | 'Critical' | 'Extreme' | 'Lethal';
  difficultyModifier: string;
  armorMultiplier: number;
  firepowerMultiplier: number;
  adaptiveDifficulty?: AdaptiveCombatMetrics;
  progression?: PlayerProgression;
}

export interface TacticalLogEvent {
  id: string;
  timestamp: string;
  stardate: string;
  category: 'WEAPONS' | 'DEFENSE' | 'TACTICAL' | 'NAVIGATION' | 'DAMAGE' | 'SECTOR';
  type: 'info' | 'warning' | 'critical' | 'success' | 'combat';
  message: string;
  details?: string;
}

export interface DefeatStats {
  waveReached: number;
  totalKills: number;
  scoutsDestroyed: number;
  cruisersDestroyed: number;
  mothershipsDestroyed: number;
  combatRating: number;
  skillTier: string;
  accuracyPercent: number;
  evasionPercent: number;
  stardate: string;
  systemName: string;
}

export interface ShipState {
  // Flight dynamics
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotation: { pitch: number; yaw: number; roll: number };
  speed: number;               // Current speed in km/s (impulse) or C multiplier (warp)
  targetSpeed: number;
  throttlePercent: number;     // 0 to 100%
  isWarping: boolean;
  warpFactor: number;          // 1.0 to 9.9
  warpCharge: number;          // 0 to 1 during jump sequence
  flightAssist: boolean;       // Active flight stabilization
  isBoostActive?: boolean;     // Evasive thruster overdrive
  boostDuration?: number;      // Seconds remaining on boost
  boostCharge?: number;        // 0 to 100% recharge
  
  // Tactical & health / damage
  alertLevel: AlertLevel;
  shieldsRaised: boolean;
  shieldIntegrity: number;     // 0 to 100%
  hullIntegrity: number;       // 0 to 100%
  isDestroyed?: boolean;       // True when catastrophic core breach occurs
  defeatStats?: DefeatStats;   // Summary for game-over / recommission screen
  warpCoreOutput: number;      // 0 to 100%
  impulsePower: number;        // 0 to 100%
  lastDamageTimestamp: number; // for screen shake and shield flare
  isUnderAttack: boolean;
  hasIncomingTorpedo?: boolean;
  
  // Weapons
  isFiringPhasers: boolean;
  torpedoCount: number;
  phaserEnergy: number;        // 0 to 100%
  
  // Navigation & Solar Systems
  currentSystemId: string;
  currentSystemName: string;
  selectedTargetId: string | null;
  lockedEnemy: EnemyShipState | null;
  activeCoursePlot: CoursePlot | null;
  autoPilotToTarget: boolean;
  combatWaveState?: CombatWaveState;
  adaptiveDifficulty?: AdaptiveCombatMetrics;
  progression?: PlayerProgression;
}

export interface CelestialTarget {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  distance: number;
  description: string;
  scanned: boolean;
}

export interface ShipSubsystem {
  id: string;
  name: string;
  deck: string;
  section: 'primary' | 'neck' | 'secondary' | 'nacelles';
  position: [number, number, number]; // Relative to ship center
  status: 'Nominal' | 'Active' | 'Standby';
  description: string;
  specs: string;
}
