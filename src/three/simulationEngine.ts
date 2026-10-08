import * as THREE from 'three';
import {
  CameraViewMode,
  AlertLevel,
  ShipState,
  CelestialTarget,
  ShipSubsystem,
  SolarSystem,
  PlanetData,
  CoursePlot,
  EnemyShipState,
  TacticalLogEvent,
  DefeatStats,
} from '../types/simulation';
import { buildEnterpriseModel, EnterpriseComponents } from './shipModel';
import { buildSpaceEnvironment, SpaceEnvironment } from './spaceScene';
import { buildBridgeInterior, BridgeInteriorComponents } from './bridgeInterior';
import { WarZoneCombatManager } from './enemyShips';
import { soundEffects } from '../audio/soundEffects';

export class SimulationEngine {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private enterprise: EnterpriseComponents;
  private bridgeInterior: BridgeInteriorComponents;
  private space: SpaceEnvironment;
  private combatManager: WarZoneCombatManager;

  // Camera State
  private viewMode: CameraViewMode = 'chase';
  private targetCameraPos: THREE.Vector3 = new THREE.Vector3();
  private targetLookAt: THREE.Vector3 = new THREE.Vector3();
  private orbitAngle: { theta: number; phi: number; radius: number } = {
    theta: 0.35,
    phi: 0.35,
    radius: 54,
  };
  private bridgeLookAngle = { yaw: 0, pitch: 0 };
  private isPointerDown: boolean = false;
  private lastPointerPos = { x: 0, y: 0 };
  private focusedSubsystemKey: string | null = null;
  private screenShakeIntensity: number = 0;

  // Ship Flight Dynamics (Smooth & Stable)
  private position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private orientation: THREE.Quaternion = new THREE.Quaternion();
  private forwardVector: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  private upVector: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private rightVector: THREE.Vector3 = new THREE.Vector3(1, 0, 0);

  // Rotation rates with stable inertial damping
  private pitchRate: number = 0;
  private yawRate: number = 0;
  private rollRate: number = 0;
  private flightAssist: boolean = true;
  private combatAssist: boolean = true;
  private cameraZoom: number = 1.0; // 0.4 (close) to 2.5 (wide tactical overview)

  // Engine & Warp State
  private throttlePercent: number = 25; // Default 1/4 impulse
  private isWarping: boolean = false;
  private warpFactor: number = 4.0;
  private warpChargeProgress: number = 0;

  // Tactical & Health Damage System
  private alertLevel: AlertLevel = 'green';
  private shieldsRaised: boolean = true;
  private shieldIntegrity: number = 100;
  private hullIntegrity: number = 100;
  private isDestroyed: boolean = false;
  private defeatStats?: DefeatStats;
  private lastDamageTime: number = 0;
  private isUnderAttack: boolean = false;
  private isFiringPhasers: boolean = false;
  private phaserEnergy: number = 100;
  private torpedoCount: number = 24;
  private torpedoRechargeTimer: number = 0;
  private lastBroadcastTime: number = 0;

  // Target locking system
  private lockedEnemyId: string | null = null;
  private currentSystemId: string = 'sol_system';
  private selectedTargetId: string | null = 'sol_earth';
  private activeCoursePlot: CoursePlot | null = null;
  private autoPilot: boolean = false;
  private lastLoggedShieldBracket: number = 100;

  // Evasive Thrusters Boost System
  private isBoostActive: boolean = false;
  private boostDuration: number = 0;
  private boostCharge: number = 100;

  // Space Station Docking & Starship Repair / Rearm System
  private isDocked: boolean = false;
  private dockedStationId: string | null = null;
  private dockedStationName: string | null = null;
  private canDockAtStation: { id: string; name: string; distance: number; systemName?: string } | null = null;
  private undockCooldown: number = 0;

  // Keyboard input states
  private keysPressed: { [key: string]: boolean } = {};

  // Animation frame request ID
  private animFrameId: number | null = null;
  private onStateChangeCallback?: (state: ShipState) => void;
  private onLogEventCallback?: (event: TacticalLogEvent) => void;
  private onToggleLogConsoleCallback?: () => void;

  constructor(
    container: HTMLDivElement,
    onStateChange?: (state: ShipState) => void,
    onLogEvent?: (event: TacticalLogEvent) => void,
    onToggleLogConsole?: () => void
  ) {
    this.container = container;
    this.onStateChangeCallback = onStateChange;
    this.onLogEventCallback = onLogEvent;
    this.onToggleLogConsoleCallback = onToggleLogConsole;

    // 1. Scene & Renderer setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617);

    const width = Math.max(container.clientWidth || window.innerWidth || 800, 320);
    const height = Math.max(container.clientHeight || window.innerHeight || 600, 240);

    this.camera = new THREE.PerspectiveCamera(54, width / height, 0.8, 52000);
    this.camera.position.set(0, 12, 38);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    // 2. Initialize 3D Enterprise, Bridge Interior, Space & Combat Fleet
    this.enterprise = buildEnterpriseModel();
    this.scene.add(this.enterprise.root);

    this.bridgeInterior = buildBridgeInterior();
    this.scene.add(this.bridgeInterior.root);
    this.bridgeInterior.root.visible = false;

    this.space = buildSpaceEnvironment(this.scene);

    // War Zone Combat Fleet with War Levels and Single-Faction territory enforcement
    this.combatManager = new WarZoneCombatManager(this.scene, this.space.explosionManager);
    this.combatManager.onLogEvent = (cat, type, msg, det) => {
      this.addLogEvent(cat, type, msg, det);
    };
    // Sol system starts peaceful and secure - no unwanted immediate enemy attacks
    this.combatManager.waveStatus = 'standby';
    this.combatManager.sectorStatusText = 'Sector 001 Earth · Territory Secure';

    // Initial shield visibility
    (this.enterprise.shieldBubble.material as THREE.MeshStandardMaterial).opacity = 0.25;

    // 3. Attach Event Listeners
    this.bindEvents();

    // Start background sound
    soundEffects.startImpulseHum();

    // 4. Start Render Loop
    this.animate = this.animate.bind(this);
    this.animFrameId = requestAnimationFrame(this.animate);

    // Initial broadcast
    this.broadcastState();
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    this.container.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    this.container.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.container.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.container.removeEventListener('wheel', this.handleWheel);

    this.combatManager.dispose();
    this.space.explosionManager.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }

  private handleResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    this.keysPressed[e.key.toLowerCase()] = true;
    this.keysPressed[e.code] = true;

    if (e.code === 'Space') {
      this.startPhaserFiring();
    } else if (e.code === 'KeyT') {
      this.firePhotonTorpedo();
    } else if (e.code === 'KeyC') {
      this.cycleCameraView();
    } else if (e.code === 'KeyG') {
      this.cycleAlertLevel();
    } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      this.zoomIn();
    } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      this.zoomOut();
    } else if (e.code === 'Digit0' || e.code === 'Numpad0') {
      this.resetZoom();
    } else if (e.code === 'Tab') {
      e.preventDefault();
      this.targetNextHostile();
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyB') {
      this.triggerEvasiveBoost();
    } else if (e.code === 'KeyX' || e.code === 'KeyU') {
      if (this.isDocked) {
        this.undockFromStation();
      } else {
        this.dockAtStation();
      }
    } else if (e.code === 'KeyL') {
      this.onToggleLogConsoleCallback?.();
    } else if (e.code === 'KeyR' && e.shiftKey) {
      this.setAlertLevel(this.alertLevel === 'red' ? 'green' : 'red');
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysPressed[e.key.toLowerCase()] = false;
    this.keysPressed[e.code] = false;

    if (e.code === 'Space') {
      this.stopPhaserFiring();
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.isPointerDown = true;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.isPointerDown) return;
    const dx = e.clientX - this.lastPointerPos.x;
    const dy = e.clientY - this.lastPointerPos.y;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };

    if (this.viewMode === 'orbit') {
      this.orbitAngle.theta -= dx * 0.008;
      this.orbitAngle.phi = Math.max(0.05, Math.min(Math.PI * 0.95, this.orbitAngle.phi - dy * 0.008));
    } else if (this.viewMode === 'interior_bridge') {
      this.bridgeLookAngle.yaw -= dx * 0.005;
      this.bridgeLookAngle.pitch = Math.max(-0.9, Math.min(0.9, this.bridgeLookAngle.pitch - dy * 0.005));
    } else {
      // Stable steering with damped sensitivity
      this.yawRate = THREE.MathUtils.clamp(this.yawRate - dx * 0.00018, -0.6, 0.6);
      this.pitchRate = THREE.MathUtils.clamp(this.pitchRate - dy * 0.00018, -0.6, 0.6);
    }
  };

  private handlePointerUp = () => {
    this.isPointerDown = false;
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (this.viewMode === 'orbit') {
      this.orbitAngle.radius = Math.max(14, Math.min(240, this.orbitAngle.radius + e.deltaY * 0.08));
    } else {
      // Smooth POV Camera Zoom In / Zoom Out
      const zoomStep = Math.sign(e.deltaY) * 0.08;
      this.setCameraZoom(this.cameraZoom + zoomStep);
    }
  };

  // --- Flight & Engine Logic ---
  public setThrottle(percent: number) {
    this.throttlePercent = Math.max(0, Math.min(100, percent));
    soundEffects.updateImpulseHum(this.throttlePercent, this.isWarping);
    soundEffects.playLcarsBeep(720, 0.04);
    this.broadcastState();
  }

  public setWarpFactor(factor: number) {
    this.warpFactor = Math.max(1.0, Math.min(9.9, Math.round(factor * 10) / 10));
    soundEffects.playLcarsBeep(880, 0.05);
    this.broadcastState();
  }

  public toggleWarp() {
    this.isWarping = !this.isWarping;
    if (this.isWarping) {
      soundEffects.playWarpEngage();
      this.warpChargeProgress = 0;
    } else {
      soundEffects.playLcarsAcknowledge();
    }
    soundEffects.updateImpulseHum(this.throttlePercent, this.isWarping);
    this.broadcastState();
  }

  public setAlertLevel(level: AlertLevel) {
    this.alertLevel = level;
    if (level === 'red') {
      soundEffects.startRedAlert();
      this.setShields(true);
    } else {
      soundEffects.stopRedAlert();
      soundEffects.playLcarsAcknowledge();
    }
    this.broadcastState();
  }

  // Cycles alert condition: Green -> Yellow -> Red -> Green [G key]
  public cycleAlertLevel() {
    let nextLevel: AlertLevel = 'green';
    if (this.alertLevel === 'green') {
      nextLevel = 'yellow';
    } else if (this.alertLevel === 'yellow') {
      nextLevel = 'red';
    } else {
      nextLevel = 'green';
    }
    this.setAlertLevel(nextLevel);
    this.addLogEvent(
      'DEFENSE',
      nextLevel === 'red' ? 'critical' : (nextLevel === 'yellow' ? 'warning' : 'info'),
      `Alert Status Set: Condition ${nextLevel.toUpperCase()}`,
      nextLevel === 'red' ? 'Battle stations! Multiphasic shields raised, weapons armed.' :
      nextLevel === 'yellow' ? 'Yellow alert. Defensive grid and warp core on standby.' :
      'Condition Green. Standard exploration posture nominal.'
    );
  }

  // Camera POV Zoom In / Zoom Out methods
  public setCameraZoom(zoom: number) {
    this.cameraZoom = THREE.MathUtils.clamp(zoom, 0.4, 2.5);
    this.broadcastState();
  }

  public zoomIn(amount: number = 0.15) {
    this.setCameraZoom(this.cameraZoom - amount);
  }

  public zoomOut(amount: number = 0.15) {
    this.setCameraZoom(this.cameraZoom + amount);
  }

  public resetZoom() {
    this.setCameraZoom(1.0);
  }

  public getCameraZoom(): number {
    return this.cameraZoom;
  }

  public setShields(raised: boolean) {
    this.shieldsRaised = raised;
    soundEffects.playShieldToggle(raised);
    const shieldMat = this.enterprise.shieldBubble.material as THREE.MeshStandardMaterial;
    shieldMat.opacity = raised ? 0.32 : 0.0;
    this.broadcastState();
  }

  public setCameraView(mode: CameraViewMode) {
    this.viewMode = mode;
    this.focusedSubsystemKey = null;

    if (mode === 'interior_bridge') {
      this.bridgeInterior.root.visible = true;
      this.enterprise.root.visible = false;
      this.bridgeLookAngle = { yaw: 0, pitch: 0 };
    } else {
      this.bridgeInterior.root.visible = false;
      this.enterprise.root.visible = true;
    }

    soundEffects.playLcarsBeep(980, 0.04);
    this.broadcastState();
  }

  public cycleCameraView() {
    const modes: CameraViewMode[] = [
      'chase',
      'interior_bridge',
      'bridge',
      'cinematic',
      'saucer',
      'nacelle',
      'deflector',
      'orbit',
    ];
    const currentIndex = modes.indexOf(this.viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setCameraView(modes[nextIndex]);
  }

  public focusSubsystem(subsystemId: string) {
    this.viewMode = 'orbit';
    this.focusedSubsystemKey = subsystemId;
    this.bridgeInterior.root.visible = false;
    this.enterprise.root.visible = true;
    soundEffects.playLcarsAcknowledge();
    this.broadcastState();
  }

  public setOnLogEvent(callback: (event: TacticalLogEvent) => void) {
    this.onLogEventCallback = callback;
  }

  public addLogEvent(
    category: TacticalLogEvent['category'],
    type: TacticalLogEvent['type'],
    message: string,
    details?: string
  ) {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const stardate = `SD ${(47000 + (now.getTime() % 100000) / 100).toFixed(1)}`;
    const event: TacticalLogEvent = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: timeStr,
      stardate,
      category,
      type,
      message,
      details,
    };
    this.onLogEventCallback?.(event);
  }

  // --- TARGETING SYSTEM ---
  public targetNextHostile() {
    const aliveEnemies = this.combatManager.enemyShips.filter((e) => e.isAlive);
    if (aliveEnemies.length === 0) return;

    if (!this.lockedEnemyId) {
      this.lockedEnemyId = aliveEnemies[0].id;
    } else {
      const idx = aliveEnemies.findIndex((e) => e.id === this.lockedEnemyId);
      const nextIdx = (idx + 1) % aliveEnemies.length;
      this.lockedEnemyId = aliveEnemies[nextIdx].id;
    }

    const enemy = this.combatManager.enemyShips.find((e) => e.id === this.lockedEnemyId);
    if (enemy && enemy.isAlive) {
      const dist = Math.round(enemy.mesh.position.distanceTo(this.position));
      this.addLogEvent(
        'WEAPONS',
        'combat',
        'Torpedo Lock Achieved',
        `Locked on ${enemy.name} (${enemy.shipClass}) - Range: ${dist} km`
      );
    }

    soundEffects.playTargetLock();
    soundEffects.playTargetLockAchieved();
    this.broadcastState();
  }

  public setLockedEnemy(enemyId: string | null) {
    this.lockedEnemyId = enemyId;
    if (enemyId) {
      soundEffects.playTargetLock();
      soundEffects.playTargetLockAchieved();
      const enemy = this.combatManager.enemyShips.find((e) => e.id === enemyId);
      if (enemy && enemy.isAlive) {
        const dist = Math.round(enemy.mesh.position.distanceTo(this.position));
        this.addLogEvent(
          'WEAPONS',
          'combat',
          'Torpedo Lock Achieved',
          `Locked on ${enemy.name} (${enemy.shipClass}) - Range: ${dist} km`
        );
      }
    }
    this.broadcastState();
  }

  public triggerEvasiveBoost() {
    if (this.isWarping || this.isBoostActive || this.boostCharge < 35) return;
    this.isBoostActive = true;
    this.boostDuration = 13.0;
    this.boostCharge = 0;
    this.screenShakeIntensity = 0.35;
    soundEffects.playEvasiveBoost();
    this.addLogEvent(
      'DEFENSE',
      'info',
      'Evasive Thrusters Overdrive Engaged',
      'Impulse manifold capacitors discharged! 13s speed surge, 220 km/s, 75% disruptor deflection active.'
    );
    this.broadcastState(true);
  }

  public setSelectedTarget(targetId: string | null) {
    this.selectedTargetId = targetId;
    soundEffects.playLcarsBeep(650, 0.05);
    this.broadcastState();
  }

  public toggleAutoPilot() {
    this.autoPilot = !this.autoPilot;
    soundEffects.playLcarsAcknowledge();
    this.broadcastState();
  }

  public toggleCombatAssist() {
    this.combatAssist = !this.combatAssist;
    soundEffects.playLcarsAcknowledge();
    this.broadcastState();
  }

  public getCombatAssist(): boolean {
    return this.combatAssist;
  }

  // --- SPACE STATION DOCKING, REPAIR & TORPEDO REFILL SYSTEM ---
  public dockAtStation(stationId?: string): boolean {
    if (this.undockCooldown > 0) {
      return false;
    }

    let targetPlanet = stationId
      ? this.space.planets.find((p) => p.id === stationId && p.type === 'starbase')
      : null;

    if (!targetPlanet && this.canDockAtStation) {
      targetPlanet = this.space.planets.find((p) => p.id === this.canDockAtStation?.id);
    }

    if (!targetPlanet) {
      // Find closest starbase within 300 units
      let closest: typeof this.space.planets[0] | null = null;
      let minD = 300;
      for (const p of this.space.planets) {
        if (p.type === 'starbase') {
          const mesh = this.space.targetMeshes.get(p.id);
          const pos = mesh ? mesh.position : new THREE.Vector3(...p.position);
          const d = this.position.distanceTo(pos);
          if (d < minD) {
            minD = d;
            closest = p;
          }
        }
      }
      targetPlanet = closest;
    }

    if (!targetPlanet) {
      this.addLogEvent('NAVIGATION', 'warning', 'No space station or orbital dock in docking range.', 'Navigate within 260 km of an orbital starbase.');
      return false;
    }

    this.isDocked = true;
    this.dockedStationId = targetPlanet.id;
    this.dockedStationName = targetPlanet.name;
    this.isWarping = false;
    this.setThrottle(0);
    this.velocity.set(0, 0, 0);

    // Position starship securely alongside spacedock mooring rings
    const mesh = this.space.targetMeshes.get(targetPlanet.id);
    const stationPos = mesh ? mesh.position : new THREE.Vector3(...targetPlanet.position);
    const offsetDir = this.position.clone().sub(stationPos).normalize();
    if (offsetDir.lengthSq() < 0.1) offsetDir.set(0, 0, 1);
    this.position.copy(stationPos).add(offsetDir.multiplyScalar(targetPlanet.radius + 32));
    this.orientation.setFromUnitVectors(new THREE.Vector3(0, 0, -1), offsetDir.clone().negate());

    // Complete Hull Restoration, Shield Recalibration, and Full Torpedo Rearm
    const prevHull = Math.round(this.hullIntegrity);
    this.hullIntegrity = 100;
    this.shieldIntegrity = 100;
    this.torpedoCount = 30; // Refill to full standard Starfleet magazine!
    this.phaserEnergy = 100;
    this.boostCharge = 100;
    this.alertLevel = 'green';
    this.isUnderAttack = false;
    this.combatManager.hasIncomingTorpedo = false;

    soundEffects.stopRedAlert();
    soundEffects.playLcarsAcknowledge();
    soundEffects.playLcarsBeep(980, 0.25);

    this.addLogEvent(
      'DEFENSE',
      'success',
      `Docked securely at ${targetPlanet.name}. Hull restored from ${prevHull}% to 100%, shields recharged, and photon torpedo magazines fully rearmed (30/30).`,
      'Spacedock maintenance crews report all primary & secondary systems fully certified for frontline combat operations.'
    );

    this.broadcastState(true);
    return true;
  }

  public undockFromStation(): void {
    if (!this.isDocked) return;
    const name = this.dockedStationName || 'Starbase';
    const stationId = this.dockedStationId;

    this.isDocked = false;
    this.dockedStationId = null;
    this.dockedStationName = null;
    this.undockCooldown = 5.0; // 5-second cooldown to guarantee ship does not instantly re-dock
    this.canDockAtStation = null;

    // Determine outward trajectory pointing cleanly away from the station center
    let stationPos: THREE.Vector3 | null = null;
    let stationRadius = 24;
    if (stationId) {
      const pData = this.space.planets.find((p) => p.id === stationId);
      if (pData) {
        stationRadius = pData.radius;
        const mesh = this.space.targetMeshes.get(stationId);
        stationPos = mesh ? mesh.position.clone() : new THREE.Vector3(...pData.position);
      }
    }

    let outward: THREE.Vector3;
    if (stationPos) {
      outward = this.position.clone().sub(stationPos).normalize();
      if (outward.lengthSq() < 0.1) outward.set(0, 0, 1);
      // Place ship comfortably outside docking mooring ring
      this.position.copy(stationPos).add(outward.clone().multiplyScalar(stationRadius + 95));
    } else {
      outward = this.forwardVector.clone();
      this.position.add(outward.clone().multiplyScalar(85));
    }

    // Orient starship heading outward into free space
    this.orientation.setFromUnitVectors(new THREE.Vector3(0, 0, -1), outward);
    this.forwardVector.copy(outward);

    // Separation impulse burn away from spacedock
    this.velocity.copy(outward).multiplyScalar(42);
    this.setThrottle(25);

    soundEffects.playLcarsAcknowledge();
    soundEffects.playLcarsBeep(640, 0.12);

    this.addLogEvent(
      'NAVIGATION',
      'info',
      `Mooring clamps released from ${name}. Separation thrusters engaged.`,
      'All umbilicals detached. Ship is safely clear of station perimeter and under manual helm control.'
    );

    this.broadcastState(true);
  }

  public isShipDocked(): boolean {
    return this.isDocked;
  }

  // --- DAMAGE & IMPACT SYSTEM ---
  public applyDamageToEnterprise(amount: number) {
    if (this.isDestroyed) return;

    // Evasive Thrusters Overdrive deflection chance (75% deflection)
    if (this.isBoostActive && Math.random() < 0.75) {
      soundEffects.playShieldToggle(true);
      this.addLogEvent('DEFENSE', 'success', 'Evasive Overdrive Deflection', 'Hostile fire deflected by high-frequency impulse wake!');
      return;
    }

    const effectiveAmount = this.isBoostActive ? amount * 0.35 : amount;

    this.lastDamageTime = performance.now();
    this.screenShakeIntensity = Math.min(0.8, this.screenShakeIntensity + 0.35);
    this.isUnderAttack = true;

    // Track combat telemetry for adaptive hostile scaling
    this.combatManager.adaptiveTracker.recordDamageTaken(effectiveAmount);

    // Automatic red alert when taking unexpected fire
    if (this.alertLevel !== 'red') {
      this.setAlertLevel('red');
    }

    if (this.shieldsRaised && this.shieldIntegrity > 0) {
      const prevShield = this.shieldIntegrity;
      // Enterprise Heavy Multiphasic Shields absorb hits with flagship resilience
      this.shieldIntegrity = Math.max(0, this.shieldIntegrity - effectiveAmount * 0.65);
      soundEffects.playShieldHit();

      // Shield flare visual
      const shieldMat = this.enterprise.shieldBubble.material as THREE.MeshStandardMaterial;
      shieldMat.opacity = 0.7;

      // Real-time Tactical Notifications on Shield Thresholds
      if (prevShield > 40 && this.shieldIntegrity <= 40 && this.shieldIntegrity > 20) {
        this.addLogEvent('DEFENSE', 'critical', 'Shields at 40%', 'Warning: Deflector shield capacity reduced to 40%');
      } else if (prevShield > 20 && this.shieldIntegrity <= 20 && this.shieldIntegrity > 0) {
        this.addLogEvent('DEFENSE', 'critical', 'Shields Critical at 20%!', 'Deflector grid near total failure!');
      }

      if (this.shieldIntegrity <= 0) {
        this.shieldIntegrity = 0;
        soundEffects.playShieldToggle(false);
        this.addLogEvent('DEFENSE', 'critical', 'Shields Down!', 'Multiphasic shielding collapsed! Hull taking direct fire!');
      }
    } else {
      // Direct hull hit
      this.hullIntegrity = Math.max(0, this.hullIntegrity - effectiveAmount * 0.85);
      soundEffects.playHullImpact();
      this.space.triggerExplosion(this.position, 1.2);
      this.addLogEvent('DAMAGE', 'critical', 'Direct Hull Impact', `Structural integrity at ${Math.round(this.hullIntegrity)}%`);

      if (this.hullIntegrity <= 0) {
        this.hullIntegrity = 0;
        this.isDestroyed = true;
        this.isFiringPhasers = false;
        this.space.stopPhasers();
        this.throttlePercent = 0;
        this.velocity.set(0, 0, 0);

        // Critical defeat recorded in adaptive system
        this.combatManager.adaptiveTracker.recordPlayerDefeat((cat, type, msg, det) => {
          this.addLogEvent(cat, type, msg, det);
        });

        // Massive catastrophic explosion VFX and Core Breach Alarm
        this.space.triggerExplosion(this.position, 6.0);
        soundEffects.playExplosion(this.position);
        soundEffects.playCoreBreachAlarm();

        const currentSys = this.space.systems.find((s) => s.id === this.currentSystemId);
        const tracker = this.combatManager.adaptiveTracker;
        const accuracy = tracker.torpedoesFired > 0
          ? Math.min(100, Math.round((tracker.torpedoesHit / tracker.torpedoesFired) * 100))
          : 80;
        const evasion = tracker.enemyTorpedoesSpawned > 0
          ? Math.min(100, Math.round((tracker.enemyTorpedoesDodged / tracker.enemyTorpedoesSpawned) * 100))
          : 85;

        this.defeatStats = {
          waveReached: this.combatManager.combatWave,
          totalKills: tracker.totalKills,
          scoutsDestroyed: tracker.scoutsDestroyed,
          cruisersDestroyed: tracker.cruisersDestroyed,
          mothershipsDestroyed: tracker.mothershipsDestroyed,
          combatRating: tracker.combatRating,
          skillTier: tracker.skillTier,
          accuracyPercent: accuracy,
          evasionPercent: evasion,
          stardate: (45000 + (performance.now() / 10000)).toFixed(1),
          systemName: currentSys ? currentSys.name : 'Unknown Sector',
        };

        this.addLogEvent('DAMAGE', 'critical', 'CATASTROPHIC CORE BREACH', 'USS Enterprise NCC-1701 lost in action.');
      }
    }

    this.broadcastState();
  }

  public restartSimulation(retryCurrentWave: boolean = false) {
    this.isDestroyed = false;
    this.defeatStats = undefined;
    this.hullIntegrity = 100;
    this.shieldIntegrity = 100;
    this.shieldsRaised = true;
    this.torpedoCount = 24;
    this.phaserEnergy = 100;
    this.isBoostActive = false;
    this.boostDuration = 0;
    this.boostCharge = 100;
    this.throttlePercent = 25; // Original starting throttle (1/4 impulse)
    this.isWarping = false;
    this.warpFactor = 4.0;
    this.velocity.set(0, 0, 0);
    this.position.set(0, 0, 0);
    this.orientation.identity();
    this.forwardVector.set(0, 0, -1);
    this.upVector.set(0, 1, 0);
    this.rightVector.set(1, 0, 0);
    this.pitchRate = 0;
    this.yawRate = 0;
    this.rollRate = 0;
    this.lockedEnemyId = null;
    this.selectedTargetId = 'sol_earth';
    this.currentSystemId = 'sol_system';
    this.activeCoursePlot = null;
    this.autoPilot = false;
    this.cameraZoom = 1.0;

    // Completely wipe all hostile ships and projectiles from 3D scene
    this.combatManager.clearAllHostiles();

    if (retryCurrentWave) {
      this.combatManager.retryWave();
      this.combatManager.spawnWave(this.position, this.currentSystemId, this.combatManager.combatWave);
      this.setAlertLevel('red');
    } else {
      // Complete reset to original starting state: 0 enemies, territory secure in Sol System, all progress (XP, Destroyed, ranks) reset
      this.combatManager.resetToInitialStandby();
      this.setAlertLevel('green');
    }

    soundEffects.stopRedAlert();
    soundEffects.playLcarsAcknowledge();
    soundEffects.playWarpEngage();
    this.addLogEvent(
      'SECTOR',
      'success',
      'USS Enterprise Re-Commissioned',
      retryCurrentWave
        ? `Systems restored. Re-engaging Wave ${this.combatManager.combatWave}!`
        : 'All systems, XP, and hostile casualty telemetry reset to initial Starfleet exploration status at Sector 001 Earth.'
    );
    this.broadcastState(true);
  }

  // --- PLANETARY COLLISION CHECK ---
  private checkPlanetaryCollisions() {
    for (const [id, tMesh] of this.space.targetMeshes) {
      // Find actual planet data if available for precise collision radius
      const planetData = this.space.planets.find((p) => p.id === id);
      let boundRadius = 32;

      if (planetData) {
        boundRadius = planetData.radius + 6;
      } else if (id.includes('earth') || id.includes('giant') || id.includes('kronos') || id.includes('vulcan')) {
        boundRadius = 55;
      } else if (id.includes('spacedock') || id.includes('outpost') || id.includes('station')) {
        boundRadius = 24;
      } else if (id.includes('asteroid')) {
        boundRadius = 26;
      }

      const dist = this.position.distanceTo(tMesh.position);

      // Proximity warp drop safety: If warping close to any celestial body's danger zone, emergency drop from warp before collision
      if (this.isWarping && dist < boundRadius + 80) {
        this.isWarping = false;
        this.velocity.multiplyScalar(0.05);
        if (this.activeCoursePlot && this.activeCoursePlot.isEngaged) {
          this.activeCoursePlot.isEngaged = false;
          this.activeCoursePlot.phase = 'standard_orbit';
        }
        soundEffects.playLcarsBeep(440, 0.15);
        soundEffects.updateImpulseHum(0, false);
      }

      // Starbase / Spacedock Proximity Buffer (Protective tractor buffer prevents collision damage, no auto-dock)
      if (planetData?.type === 'starbase' || id.includes('spacedock') || id.includes('station') || id.includes('dock')) {
        if (dist < boundRadius) {
          const repulsion = this.position.clone().sub(tMesh.position);
          if (repulsion.lengthSq() < 0.1) repulsion.set(0, 0, 1);
          repulsion.normalize();
          this.position.copy(tMesh.position).add(repulsion.clone().multiplyScalar(boundRadius + 6));
          this.velocity.multiplyScalar(0.2);
        }
        continue;
      }

      if (dist < boundRadius) {
        // Physical crash into planet
        const repulsion = this.position.clone().sub(tMesh.position);
        if (repulsion.lengthSq() < 0.1) {
          repulsion.set(0, 1, 0);
        }
        repulsion.normalize();
        
        // Push ship safely out of the planet surface
        this.position.copy(tMesh.position).add(repulsion.clone().multiplyScalar(boundRadius + 15));

        // Bounce velocity
        this.velocity.reflect(repulsion).multiplyScalar(0.25);

        // Crash damage
        soundEffects.playPlanetCollision();
        this.applyDamageToEnterprise(25);
        this.space.triggerExplosion(this.position, 2.0);

        // Drop out of warp immediately
        if (this.isWarping) {
          this.isWarping = false;
          this.setThrottle(0);
        }
        break;
      }
    }
  }

  // --- AUTOMATED COURSE PLOTTER TO ANY SOLAR SYSTEM ---
  public setCourseToSolarSystem(systemId: string, planetId?: string, preferredWarpFactor?: number) {
    const system = this.space.systems.find((s) => s.id === systemId);
    if (!system) return;

    const targetPlanet = planetId
      ? system.planets.find((p) => p.id === planetId) || system.planets[0]
      : system.planets[0];

    const planetCenter = new THREE.Vector3(...targetPlanet.position);

    // Calculate safe approach vector from current ship position towards the planet
    let offsetFromPlanet = this.position.clone().sub(planetCenter);
    if (offsetFromPlanet.lengthSq() < 100) {
      // Ship is already at or near planet center, default offset along +Z with elevation
      offsetFromPlanet.set(0, 0.25, 1);
    }
    offsetFromPlanet.normalize();

    // Ensure comfortable elevation angle (+y) for majestic planetary vista
    if (Math.abs(offsetFromPlanet.y) < 0.15) {
      offsetFromPlanet.y = 0.22;
      offsetFromPlanet.normalize();
    }

    // Determine safe orbital standoff distance so the ship NEVER arrives inside atmosphere or rings
    const planetRadius = targetPlanet.radius || 45;
    const ringRadius = (targetPlanet.hasRings && targetPlanet.ringOuter) ? targetPlanet.ringOuter : 0;
    // Generous standoff distance ensuring safe orbit in clear space outside planet collision boundary
    const safeOrbitRadius = Math.max(planetRadius * 3.2 + 80, ringRadius + 110, 240);

    const safeDestPos = planetCenter.clone().add(offsetFromPlanet.multiplyScalar(safeOrbitRadius));
    const destPos: [number, number, number] = [safeDestPos.x, safeDestPos.y, safeDestPos.z];

    const currentDist = this.position.distanceTo(safeDestPos);

    // Set or preserve warp factor
    if (preferredWarpFactor !== undefined && preferredWarpFactor >= 1.0 && preferredWarpFactor <= 9.9) {
      this.warpFactor = Math.round(preferredWarpFactor * 10) / 10;
    } else if (this.warpFactor < 3.0) {
      this.warpFactor = 6.0;
    }

    const estimatedSpeed = Math.pow(this.warpFactor, 2.6) * 95;

    this.activeCoursePlot = {
      targetSystem: system,
      targetPlanet,
      destinationPos: destPos,
      distance: Math.round(currentDist),
      etaSeconds: Math.max(2, Math.round(currentDist / Math.max(estimatedSpeed * 0.7, 100))),
      isEngaged: true,
      phase: 'aligning',
    };

    this.selectedTargetId = targetPlanet.id;
    this.currentSystemId = system.id;

    soundEffects.playLcarsAcknowledge();
    soundEffects.playWarpEngage();

    // Territory-based alien spawning: Klingons in Kronos, Romulans in Romulus, Gorns in Gorn Sector
    if (system.isWarZone || system.territory === 'non_federation') {
      this.combatManager.spawnWave(this.position, system.id, 1);
    }

    this.broadcastState(true);
  }

  public cancelCourse() {
    if (this.activeCoursePlot) {
      this.activeCoursePlot = null;
      if (this.isWarping) {
        this.toggleWarp();
      }
      soundEffects.playLcarsBeep(600, 0.08);
      this.broadcastState();
    }
  }

  // Enter War Zone instantly (Klingon Qo'noS frontier)
  public enterWarZone() {
    this.setCourseToSolarSystem('kronos_system');
  }

  // Summon next hostile wave immediately
  public summonHostileFleet() {
    this.combatManager.spawnWave(this.position, this.currentSystemId, this.combatManager.combatWave + 1);
    this.broadcastState(true);
  }

  public getCombatWave(): number {
    return this.combatManager.combatWave;
  }

  public getTotalHostilesDestroyed(): number {
    return this.combatManager.totalHostilesDestroyed;
  }

  public getSectorStatus(): string {
    return this.combatManager.sectorStatusText;
  }

  // Weapons actions with 3D Spatial Audio
  public startPhaserFiring() {
    if (this.phaserEnergy <= 5) return;
    this.isFiringPhasers = true;
    const leftP = this.enterprise.phaserOriginLeft.clone().applyQuaternion(this.orientation).add(this.position);
    soundEffects.playPhaserBeam(leftP);
    this.broadcastState();
  }

  public stopPhaserFiring() {
    this.isFiringPhasers = false;
    this.space.stopPhasers();
    this.broadcastState();
  }

  public firePhotonTorpedo() {
    if (this.torpedoCount <= 0) return;
    this.torpedoCount -= 1;

    // Track combat telemetry for player accuracy and success metrics
    this.combatManager.adaptiveTracker.recordTorpedoFired();

    const launchPos = this.enterprise.torpedoOrigin.clone().applyQuaternion(this.orientation).add(this.position);
    soundEffects.playPhotonTorpedo(launchPos);

    let targetDir = this.forwardVector.clone();
    let targetEnemyId: string | null = null;
    let targetStaticPos: THREE.Vector3 | null = null;

    // Autonomous Warhead Guidance: if no hostile is locked, auto-acquire closest hostile in forward firing arc
    if (!this.lockedEnemyId) {
      const aliveEnemies = this.combatManager.enemyShips.filter((e) => e.isAlive);
      if (aliveEnemies.length > 0) {
        let bestEnemy: typeof aliveEnemies[0] | null = null;
        let bestScore = -Infinity;
        for (const enemy of aliveEnemies) {
          const toEnemy = enemy.mesh.position.clone().sub(launchPos);
          const dist = toEnemy.length();
          const dir = toEnemy.clone().normalize();
          const dot = this.forwardVector.dot(dir);
          // Score prioritizing forward firing cone and closer range
          const score = dot * 3.5 - (dist / 1400);
          if (score > bestScore) {
            bestScore = score;
            bestEnemy = enemy;
          }
        }
        if (bestEnemy) {
          this.lockedEnemyId = bestEnemy.id;
        }
      }
    }

    if (this.lockedEnemyId) {
      const enemy = this.combatManager.enemyShips.find((e) => e.id === this.lockedEnemyId);
      if (enemy && enemy.isAlive) {
        targetEnemyId = enemy.id;
        targetDir = enemy.mesh.position.clone().sub(launchPos).normalize();
      }
    } else if (this.selectedTargetId) {
      const targetObj = this.space.targetMeshes.get(this.selectedTargetId);
      if (targetObj) {
        targetStaticPos = targetObj.position;
        targetDir = targetObj.position.clone().sub(launchPos).normalize();
      }
    }

    this.space.launchTorpedo(launchPos, targetDir, targetEnemyId, targetStaticPos);
    this.addLogEvent(
      'WEAPONS',
      'info',
      'Photon Torpedo Launched',
      targetEnemyId ? 'Antimatter warhead tracking locked hostile' : 'Direct fire ballistic trajectory'
    );
    this.broadcastState(true);
  }

  // --- Main Animation Loop ---
  private animate() {
    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (this.isDestroyed) {
      this.updateCamera(delta, this.clock.getElapsedTime());
      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(this.animate);
      return;
    }

    // Torpedo automated replicator replenishment (1 torpedo every 6.5s up to 24)
    this.torpedoRechargeTimer += delta;
    if (this.torpedoRechargeTimer >= 6.5) {
      this.torpedoRechargeTimer = 0;
      if (this.torpedoCount < 24) {
        this.torpedoCount += 1;
        this.broadcastState();
      }
    }

    // Countdown undock cooldown timer
    if (this.undockCooldown > 0) {
      this.undockCooldown = Math.max(0, this.undockCooldown - delta);
    }

    // Evasive Thrusters Boost duration & capacitor recharge
    if (this.isBoostActive) {
      this.boostDuration -= delta;
      if (this.boostDuration <= 0) {
        this.isBoostActive = false;
        this.boostDuration = 0;
        this.broadcastState(true);
      }
    } else {
      this.boostCharge = Math.min(100, this.boostCharge + delta * 24);
    }

    // Auto stand-down to yellow alert when all hostiles in wave are eliminated
    if (this.combatManager.waveStatus === 'cleared' && this.alertLevel === 'red') {
      this.setAlertLevel('yellow');
    }

    // 1. Passive Shield Recharge (faster recovery when disengaged for 2.2s)
    const now = performance.now();
    if (now - this.lastDamageTime > 2200) {
      this.isUnderAttack = false;
      if (this.shieldsRaised && this.shieldIntegrity < 100) {
        const prev = this.shieldIntegrity;
        this.shieldIntegrity = Math.min(100, this.shieldIntegrity + delta * 12.0);
        if (prev < 100 && this.shieldIntegrity >= 100) {
          this.addLogEvent('DEFENSE', 'success', 'Shields at 100%', 'Multiphasic shield grid recharged to nominal status.');
          this.lastLoggedShieldBracket = 100;
        }
      }
    }

    // Combat Assist Dogfight Auto-Alignment:
    // When enabled and engaging a hostile, smoothly steers ship towards target so you don't lose the enemy in empty space
    if (this.combatAssist && this.lockedEnemyId && !this.isWarping && !this.activeCoursePlot) {
      const enemy = this.combatManager.enemyShips.find((e) => e.id === this.lockedEnemyId);
      if (enemy && enemy.isAlive) {
        const toEnemy = enemy.mesh.position.clone().sub(this.position).normalize();
        const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), toEnemy);
        const steerStrength = this.isFiringPhasers ? 2.8 : 1.4;
        this.orientation.slerp(targetQuat, delta * steerStrength);
      }
    }

    // Decay screen shake
    this.screenShakeIntensity = Math.max(0, this.screenShakeIntensity - delta * 2.5);

    // 2. Automatic Course Navigation Flight Logic
    if (this.activeCoursePlot && this.activeCoursePlot.isEngaged) {
      const dest = new THREE.Vector3(...this.activeCoursePlot.destinationPos);
      const toDest = dest.clone().sub(this.position);
      const dist = toDest.length();
      this.activeCoursePlot.distance = Math.round(dist);

      const desiredDir = toDest.clone().normalize();
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), desiredDir);

      if (this.activeCoursePlot.phase === 'aligning') {
        this.orientation.slerp(targetQuat, delta * 3.0);
        const forwardDot = this.forwardVector.dot(desiredDir);

        if (forwardDot > 0.97) {
          this.activeCoursePlot.phase = 'warping';
          this.isWarping = true;
          // Maintain user's chosen warp factor
          this.warpChargeProgress = 0;
          soundEffects.playWarpEngage();
          soundEffects.updateImpulseHum(this.throttlePercent, true);
        }
      } else if (this.activeCoursePlot.phase === 'warping') {
        this.orientation.slerp(targetQuat, delta * 2.8);
        const estSpeed = Math.max(this.velocity.length(), Math.pow(this.warpFactor, 2.6) * 60);
        this.activeCoursePlot.etaSeconds = Math.max(1, Math.round(dist / Math.max(estSpeed, 100)));

        // Step movement distance
        const stepDist = this.velocity.length() * delta;

        // Arrival detection: reached safe orbit standoff distance in space
        if (dist <= Math.max(75, stepDist * 1.1) || toDest.dot(this.forwardVector) < 0) {
          // Drop out of warp cleanly into standard orbit in space!
          this.activeCoursePlot.phase = 'standard_orbit';
          this.activeCoursePlot.isEngaged = false;
          this.activeCoursePlot.distance = 0;
          this.activeCoursePlot.etaSeconds = 0;

          this.isWarping = false;
          this.throttlePercent = 0;
          this.velocity.set(0, 0, 0);
          this.position.copy(dest);

          // Turn Enterprise to face planet directly in standard orbit
          const planetCenter = new THREE.Vector3(...this.activeCoursePlot.targetPlanet.position);
          const toPlanet = planetCenter.clone().sub(dest).normalize();
          if (toPlanet.lengthSq() > 0.01) {
            this.orientation.setFromUnitVectors(new THREE.Vector3(0, 0, -1), toPlanet);
          }

          this.currentSystemId = this.activeCoursePlot.targetSystem.id;

          soundEffects.playLcarsAcknowledge();
          soundEffects.updateImpulseHum(0, false);
          this.broadcastState();
        }
      }
    }

    // 3. Update Space Station & Docking Proximity (Only when not docked and cooldown expired)
    let nearestStation: { id: string; name: string; distance: number; systemName?: string } | null = null;
    if (!this.isDocked && this.undockCooldown <= 0) {
      let minStationDist = Infinity;
      const currentSys = this.space.systems.find((s) => s.id === this.currentSystemId);

      for (const p of this.space.planets) {
        if (p.type === 'starbase') {
          const mesh = this.space.targetMeshes.get(p.id);
          const pos = mesh ? mesh.position : new THREE.Vector3(...p.position);
          const dist = this.position.distanceTo(pos);
          if (dist <= 260 && dist < minStationDist) {
            minStationDist = dist;
            nearestStation = {
              id: p.id,
              name: p.name,
              distance: Math.round(dist),
              systemName: currentSys?.name,
            };
          }
        }
      }
    }
    this.canDockAtStation = nearestStation;

    // 4. Stable Flight Steering Model & Combat Dogfight Assist
    if (!this.activeCoursePlot || !this.activeCoursePlot.isEngaged) {
      // Dogfight Combat Assist: if locked on enemy, smoothly assist alignment
      if (this.combatAssist && this.lockedEnemyId) {
        const enemy = this.combatManager.enemyShips.find((e) => e.id === this.lockedEnemyId);
        if (enemy && enemy.isAlive) {
          const toEnemy = enemy.mesh.position.clone().sub(this.position).normalize();
          const enemyQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), toEnemy);
          this.orientation.slerp(enemyQuat, delta * 2.8);
        }
      }

      // Smooth keyboard steering rates - tuned for responsive, engaging playability
      const targetPitch = (this.keysPressed['w'] || this.keysPressed['arrowup'])
        ? -0.65
        : (this.keysPressed['s'] || this.keysPressed['arrowdown'])
        ? 0.65
        : 0;

      const targetYaw = (this.keysPressed['a'] || this.keysPressed['arrowleft'])
        ? 0.65
        : (this.keysPressed['d'] || this.keysPressed['arrowright'])
        ? -0.65
        : 0;

      const targetRoll = this.keysPressed['q'] ? 0.75 : this.keysPressed['e'] ? -0.75 : targetYaw * 0.35;

      // Stable damping (enhanced agility during evasive thruster overdrive)
      const steerSpeed = this.isBoostActive ? 10.0 : 5.2;
      this.pitchRate = THREE.MathUtils.lerp(this.pitchRate, targetPitch, delta * steerSpeed);
      this.yawRate = THREE.MathUtils.lerp(this.yawRate, targetYaw, delta * steerSpeed);
      this.rollRate = THREE.MathUtils.lerp(this.rollRate, targetRoll, delta * steerSpeed);

      // Flight assist auto-leveling
      if (this.flightAssist && targetPitch === 0 && targetYaw === 0 && targetRoll === 0) {
        this.pitchRate = THREE.MathUtils.lerp(this.pitchRate, 0, delta * 7);
        this.yawRate = THREE.MathUtils.lerp(this.yawRate, 0, delta * 7);
        this.rollRate = THREE.MathUtils.lerp(this.rollRate, 0, delta * 7);
      }
    }

    // Apply Rotations stably
    const deltaQuat = new THREE.Quaternion();
    const rotEuler = new THREE.Euler(this.pitchRate * delta, this.yawRate * delta, this.rollRate * delta, 'YXZ');
    deltaQuat.setFromEuler(rotEuler);
    this.orientation.multiply(deltaQuat);
    this.orientation.normalize();

    // Update coordinate axes
    this.forwardVector.set(0, 0, -1).applyQuaternion(this.orientation);
    this.upVector.set(0, 1, 0).applyQuaternion(this.orientation);
    this.rightVector.set(1, 0, 0).applyQuaternion(this.orientation);

    // 5. Flight Speed & Velocity Update
    let currentSpeed = 0;
    if (this.isWarping) {
      this.warpChargeProgress = Math.min(1.0, this.warpChargeProgress + delta * 1.5);
      let warpSpeed = Math.pow(this.warpFactor, 2.6) * 115;

      // Deceleration curve when approaching target in active course
      if (this.activeCoursePlot && this.activeCoursePlot.isEngaged) {
        const dest = new THREE.Vector3(...this.activeCoursePlot.destinationPos);
        const remDist = this.position.distanceTo(dest);
        if (remDist < 3500) {
          const ratio = Math.max(0.04, remDist / 3500);
          const decel = Math.pow(ratio, 1.25);
          warpSpeed = Math.max(80, warpSpeed * decel);
        }
      }

      currentSpeed = warpSpeed * this.warpChargeProgress;
    } else if (this.isDocked) {
      currentSpeed = 0;
    } else {
      const effectiveThrottle = this.isBoostActive ? Math.max(this.throttlePercent, 90) : this.throttlePercent;
      currentSpeed = (effectiveThrottle / 100) * (this.isBoostActive ? 260 : 85);
    }

    const desiredVelocity = this.forwardVector.clone().multiplyScalar(currentSpeed);
    this.velocity.lerp(desiredVelocity, delta * (this.isBoostActive ? 10.0 : (this.isDocked ? 12.0 : 5.5)));
    if (this.isDocked) {
      this.velocity.set(0, 0, 0);
    }
    this.position.addScaledVector(this.velocity, delta);

    // Planetary collision check!
    this.checkPlanetaryCollisions();

    // Apply position & rotation to 3D Enterprise root & Bridge Interior root
    this.enterprise.root.position.copy(this.position);
    this.enterprise.root.quaternion.copy(this.orientation);

    this.bridgeInterior.root.position.copy(this.position);
    this.bridgeInterior.root.quaternion.copy(this.orientation);

    // 5. Enterprise Engine & Visuals Update
    const time = this.clock.getElapsedTime();
    const warpIntensity = this.isWarping ? 2.6 + Math.sin(time * 18) * 0.8 : 1.0;

    const bussardPulse = 1.8 + Math.sin(time * 6) * 0.4;
    (this.enterprise.bussardLeft.material as THREE.MeshStandardMaterial).emissiveIntensity = bussardPulse * warpIntensity;
    (this.enterprise.bussardRight.material as THREE.MeshStandardMaterial).emissiveIntensity = bussardPulse * warpIntensity;
    this.enterprise.bussardGlowLeft.intensity = 2.4 * warpIntensity;
    this.enterprise.bussardGlowRight.intensity = 2.4 * warpIntensity;

    const coilIntensity = this.isWarping ? 3.8 + Math.sin(time * 24) * 1.2 : 1.2;
    (this.enterprise.warpCoilsLeft.material as THREE.MeshStandardMaterial).emissiveIntensity = coilIntensity;
    (this.enterprise.warpCoilsRight.material as THREE.MeshStandardMaterial).emissiveIntensity = coilIntensity;

    const deflectorPulse = 2.4 + Math.sin(time * 4) * 0.3;
    (this.enterprise.deflectorDish.material as THREE.MeshStandardMaterial).emissiveIntensity = deflectorPulse * warpIntensity;
    this.enterprise.deflectorGlow.intensity = 3.2 * warpIntensity;

    const impulseGlowAmount = (this.throttlePercent / 100) * 2.8;
    (this.enterprise.impulseEngine.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + impulseGlowAmount;
    this.enterprise.impulseGlow.intensity = 0.5 + impulseGlowAmount;

    // Shield Bubble visual ripple
    if (this.shieldsRaised) {
      const shieldMat = this.enterprise.shieldBubble.material as THREE.MeshStandardMaterial;
      const baseOpacity = 0.22 * (this.shieldIntegrity / 100);
      shieldMat.opacity = THREE.MathUtils.lerp(shieldMat.opacity, baseOpacity, delta * 3);
      if (this.alertLevel === 'red' || this.isUnderAttack) {
        shieldMat.emissive.setHex(0xef4444);
        shieldMat.color.setHex(0xf87171);
      } else {
        shieldMat.emissive.setHex(0x0284c7);
        shieldMat.color.setHex(0x38bdf8);
      }
    }

    this.bridgeInterior.update(delta, this.alertLevel === 'red', this.isWarping);

    // 6. Combat AI & Enemy Fleet Update with full 3D velocity vector for predictive lead-aiming
    this.combatManager.update(delta, this.position, this.velocity, this.currentSystemId, (damage) => {
      this.applyDamageToEnterprise(damage);
    });

    // 7. Tactical Weapons Fire targeting enemy ships or objects
    let targetWorldPos: THREE.Vector3 | null = null;

    if (this.lockedEnemyId) {
      const enemy = this.combatManager.enemyShips.find((e) => e.id === this.lockedEnemyId);
      if (enemy && enemy.isAlive) {
        targetWorldPos = enemy.mesh.position;
      } else {
        this.lockedEnemyId = null;
      }
    } else if (this.selectedTargetId) {
      const targetObj = this.space.targetMeshes.get(this.selectedTargetId);
      if (targetObj) targetWorldPos = targetObj.position;
    }

    if (this.isFiringPhasers && this.phaserEnergy > 0) {
      this.phaserEnergy = Math.max(0, this.phaserEnergy - delta * 14);
      const leftP = this.enterprise.phaserOriginLeft.clone().applyQuaternion(this.orientation).add(this.position);
      const rightP = this.enterprise.phaserOriginRight.clone().applyQuaternion(this.orientation).add(this.position);
      this.space.firePhasers(leftP, rightP, targetWorldPos, this.forwardVector);

      // Heavy Flagship Phaser beam damage against locked hostile
      if (this.lockedEnemyId) {
        const destroyed = this.combatManager.hitEnemy(this.lockedEnemyId, delta * 58);
        if (destroyed) {
          this.lockedEnemyId = null;
          this.broadcastState(true);
        }
      }

      if (this.phaserEnergy <= 0) {
        this.stopPhaserFiring();
      }
    } else {
      this.phaserEnergy = Math.min(100, this.phaserEnergy + delta * 16);
    }

    // 8. Camera Choreography (Stable, No High-Frequency Jitter)
    this.updateCamera(delta, time);

    // 9. Update Space Environment with swept torpedo hit detection against enemy warships!
    this.space.update(
      delta,
      this.isWarping,
      this.warpFactor,
      this.position,
      (torpedoPos, prevPos) => {
        const hitRes = this.combatManager.checkTorpedoHits(torpedoPos, prevPos, 80);
        if (hitRes.hit) {
          // If player did not have a target locked, immediately lock onto the hit enemy so their shield gauge is visible!
          if (!this.lockedEnemyId && hitRes.enemyId) {
            this.lockedEnemyId = hitRes.enemyId;
          }
          if (hitRes.destroyed && hitRes.enemyId === this.lockedEnemyId) {
            this.lockedEnemyId = null;
          }
          this.broadcastState(true);
          return true;
        }
        return false;
      },
      (enemyId, currentPos) => {
        if (enemyId) {
          const enemy = this.combatManager.enemyShips.find((e) => e.id === enemyId && e.isAlive);
          if (enemy) return enemy.mesh.position;
        }
        // Autonomous proximity seeking for torpedoes without explicit target or if target is dead:
        if (currentPos) {
          const aliveEnemies = this.combatManager.enemyShips.filter((e) => e.isAlive);
          let closest: typeof aliveEnemies[0] | null = null;
          let minDist = 850;
          for (const e of aliveEnemies) {
            const d = e.mesh.position.distanceTo(currentPos);
            if (d < minDist) {
              minDist = d;
              closest = e;
            }
          }
          if (closest) return closest.mesh.position;
        }
        return null;
      }
    );

    // 10. Throttled UI State Broadcast (15 Hz - Eliminates React render lag!)
    this.broadcastState();

    // 11. Render with runtime protection
    try {
      this.renderer.render(this.scene, this.camera);
    } catch (renderErr) {
      console.warn('Frame render error caught:', renderErr);
    }

    this.animFrameId = requestAnimationFrame(this.animate);
  }

  private updateCamera(delta: number, time: number) {
    const shipPos = this.position;
    const forward = this.forwardVector;
    const up = this.upVector;
    const right = this.rightVector;

    const targetFov = this.isWarping ? 74 : (this.isBoostActive ? 65 : 54);
    // For cockpit/bridge views, zooming adjusts the field of view smoothly
    const effectiveFov = (this.viewMode === 'bridge' || this.viewMode === 'interior_bridge')
      ? THREE.MathUtils.clamp(targetFov * this.cameraZoom, 26, 85)
      : targetFov;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, effectiveFov, delta * (this.isBoostActive ? 4.5 : 3.0));
    this.camera.updateProjectionMatrix();

    switch (this.viewMode) {
      case 'interior_bridge': {
        const bridgeLocalEye = new THREE.Vector3(0, 2.2, 0.4);
        const bridgeWorldEye = bridgeLocalEye.clone().applyQuaternion(this.orientation).add(shipPos);
        this.targetCameraPos.copy(bridgeWorldEye);

        const baseLookLocal = new THREE.Vector3(
          Math.sin(this.bridgeLookAngle.yaw),
          Math.sin(this.bridgeLookAngle.pitch),
          -Math.cos(this.bridgeLookAngle.yaw)
        );
        const lookWorld = baseLookLocal.applyQuaternion(this.orientation);
        this.targetLookAt.copy(bridgeWorldEye).add(lookWorld.multiplyScalar(40));
        break;
      }

      case 'chase': {
        // High-stability chase camera with smooth zoom in and out
        const dist = 38 * this.cameraZoom;
        const height = 10.5 * Math.max(0.6, Math.sqrt(this.cameraZoom));
        const offset = forward.clone().multiplyScalar(-dist).add(up.clone().multiplyScalar(height));
        this.targetCameraPos.copy(shipPos).add(offset);
        this.targetLookAt.copy(shipPos).add(forward.clone().multiplyScalar(25));
        break;
      }

      case 'bridge': {
        const bridgeOffset = up.clone().multiplyScalar(4.1).add(forward.clone().multiplyScalar(4.5));
        this.targetCameraPos.copy(shipPos).add(bridgeOffset);
        this.targetLookAt.copy(shipPos).add(bridgeOffset).add(forward.clone().multiplyScalar(200));
        break;
      }

      case 'cinematic': {
        const cinRadius = 55 * this.cameraZoom;
        const angle = time * 0.15;
        const cx = Math.sin(angle) * cinRadius;
        const cz = Math.cos(angle) * cinRadius;
        const cy = (Math.sin(time * 0.2) * 14 + 6) * Math.sqrt(this.cameraZoom);
        this.targetCameraPos.set(shipPos.x + cx, shipPos.y + cy, shipPos.z + cz);
        this.targetLookAt.copy(shipPos);
        break;
      }

      case 'saucer': {
        const saucerOffset = up.clone().multiplyScalar(3.2 * Math.sqrt(this.cameraZoom)).add(forward.clone().multiplyScalar(-6.0 * this.cameraZoom));
        this.targetCameraPos.copy(shipPos).add(saucerOffset);
        this.targetLookAt.copy(shipPos).add(forward.clone().multiplyScalar(40));
        break;
      }

      case 'nacelle': {
        const nacelleOffset = right.clone().multiplyScalar(10.5 * Math.sqrt(this.cameraZoom)).add(up.clone().multiplyScalar(4.5 * Math.sqrt(this.cameraZoom))).add(forward.clone().multiplyScalar(-16 * this.cameraZoom));
        this.targetCameraPos.copy(shipPos).add(nacelleOffset);
        this.targetLookAt.copy(shipPos).add(forward.clone().multiplyScalar(60));
        break;
      }

      case 'deflector': {
        const deflOffset = forward.clone().multiplyScalar(22 * this.cameraZoom).add(up.clone().multiplyScalar(-7.5 * Math.sqrt(this.cameraZoom)));
        this.targetCameraPos.copy(shipPos).add(deflOffset);
        this.targetLookAt.copy(shipPos).add(forward.clone().multiplyScalar(6));
        break;
      }

      case 'orbit': {
        let centerPoint = shipPos.clone();

        if (this.focusedSubsystemKey && this.enterprise.subsystemNodes.has(this.focusedSubsystemKey)) {
          const localNode = this.enterprise.subsystemNodes.get(this.focusedSubsystemKey)!;
          const worldNode = localNode.clone().applyQuaternion(this.orientation).add(shipPos);
          centerPoint.copy(worldNode);
          this.orbitAngle.radius = Math.min(this.orbitAngle.radius, 32);
        }

        const r = this.orbitAngle.radius * this.cameraZoom;
        const ox = r * Math.sin(this.orbitAngle.phi) * Math.sin(this.orbitAngle.theta);
        const oy = r * Math.cos(this.orbitAngle.phi);
        const oz = r * Math.sin(this.orbitAngle.phi) * Math.cos(this.orbitAngle.theta);

        this.targetCameraPos.copy(centerPoint).add(new THREE.Vector3(ox, oy, oz));
        this.targetLookAt.copy(centerPoint);
        break;
      }
    }

    // Apply subtle screen shake if damaged
    if (this.screenShakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity * 1.5;
      const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity * 1.5;
      this.targetCameraPos.x += shakeX;
      this.targetCameraPos.y += shakeY;
    }

    // Smooth stable camera dampening
    const dampSpeed = this.viewMode === 'interior_bridge' ? 16 : 8.0;
    this.camera.position.lerp(this.targetCameraPos, delta * dampSpeed);
    this.camera.lookAt(this.targetLookAt);

    // Update 3D Positional Spatial Audio listener orientation & thruster sound
    soundEffects.updateListener(this.camera.position, this.forwardVector, this.upVector);
    soundEffects.updateImpulseHum(this.throttlePercent, this.isWarping);
  }

  private broadcastState(force: boolean = false) {
    if (!this.onStateChangeCallback) return;

    const now = performance.now();
    // Throttle React state updates to 15 Hz unless forced
    if (!force && now - this.lastBroadcastTime < 60) {
      return;
    }
    this.lastBroadcastTime = now;

    let displaySpeed = 0;
    if (this.isWarping) {
      displaySpeed = Math.round(this.warpFactor * 10) / 10;
    } else if (this.isDocked) {
      displaySpeed = 0;
    } else if (this.isBoostActive) {
      // Evasive boost surges impulse velocity by over 3.3x up to ~247,000 km/s!
      const boostThrottle = Math.max(this.throttlePercent, 90);
      displaySpeed = Math.round((boostThrottle / 100) * 74948 * 3.3);
    } else {
      displaySpeed = Math.round((this.throttlePercent / 100) * 74948);
    }

    const currentSys = this.space.systems.find((s) => s.id === this.currentSystemId);
    const lockedEnemy = this.lockedEnemyId
      ? this.combatManager.enemyShips.find((e) => e.id === this.lockedEnemyId)?.toState(this.position) || null
      : null;

    const state: ShipState = {
      position: { x: Math.round(this.position.x), y: Math.round(this.position.y), z: Math.round(this.position.z) },
      velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z },
      rotation: { pitch: this.pitchRate, yaw: this.yawRate, roll: this.rollRate },
      speed: displaySpeed,
      targetSpeed: this.throttlePercent,
      throttlePercent: this.throttlePercent,
      isWarping: this.isWarping,
      warpFactor: this.warpFactor,
      warpCharge: this.warpChargeProgress,
      flightAssist: this.flightAssist,
      cameraZoom: Number(this.cameraZoom.toFixed(2)),
      isBoostActive: this.isBoostActive,
      boostDuration: Number(this.boostDuration.toFixed(1)),
      boostCharge: Math.round(this.boostCharge),
      alertLevel: this.alertLevel,
      shieldsRaised: this.shieldsRaised,
      shieldIntegrity: Math.round(this.shieldIntegrity),
      hullIntegrity: Math.round(this.hullIntegrity),
      isDestroyed: this.isDestroyed,
      defeatStats: this.defeatStats,
      warpCoreOutput: this.isWarping ? 96 : 45,
      impulsePower: this.throttlePercent,
      lastDamageTimestamp: this.lastDamageTime,
      isUnderAttack: this.isUnderAttack,
      hasIncomingTorpedo: this.combatManager.hasIncomingTorpedo,
      isFiringPhasers: this.isFiringPhasers,
      torpedoCount: this.torpedoCount,
      phaserEnergy: Math.round(this.phaserEnergy),
      currentSystemId: this.currentSystemId,
      currentSystemName: currentSys?.name || 'Sol System (Sector 001)',
      selectedTargetId: this.selectedTargetId,
      lockedEnemy,
      activeCoursePlot: this.activeCoursePlot,
      autoPilotToTarget: this.autoPilot,
      combatWaveState: this.combatManager.getCombatWaveState(),
      adaptiveDifficulty: this.combatManager.adaptiveTracker.getMetrics(),
      progression: this.combatManager.adaptiveTracker.getProgression(),
      isDocked: this.isDocked,
      dockedStationId: this.dockedStationId || undefined,
      dockedStationName: this.dockedStationName || undefined,
      canDockAtStation: this.canDockAtStation,
    };

    this.onStateChangeCallback(state);
  }

  public getSolarSystems(): SolarSystem[] {
    return this.space.systems;
  }

  public getPlanets(): PlanetData[] {
    return this.space.planets;
  }

  public getEnemyFleet(): EnemyShipState[] {
    return this.combatManager.getEnemyStates(this.position);
  }

  public getTargets(): CelestialTarget[] {
    return this.space.planets.map((p) => {
      const mesh = this.space.targetMeshes.get(p.id);
      const dist = mesh ? Math.round(this.position.distanceTo(mesh.position)) : 0;
      return {
        id: p.id,
        name: p.name,
        type: p.type === 'starbase' ? 'starbase' : p.type === 'gas_giant' ? 'gas_giant' : 'planet',
        position: p.position,
        distance: dist,
        description: p.description,
        scanned: true,
      };
    });
  }

  public getSubsystems(): ShipSubsystem[] {
    return [
      {
        id: 'bridge',
        name: 'Main Bridge & Command Module',
        deck: 'Deck 1',
        section: 'primary',
        position: [0, 4.1, 4.2],
        status: 'Nominal',
        description: 'Command center with Captain chair, dual helm navigation station, and circumference LCARS displays.',
        specs: 'Duotronic computer core uplink, emergency blast shielding, 3D bridge interior view active.',
      },
      {
        id: 'phaser_banks',
        name: 'Type VI Heavy Phaser Banks',
        deck: 'Deck 7',
        section: 'primary',
        position: [0, 3.4, 10.4],
        status: this.phaserEnergy > 20 ? 'Active' : 'Standby',
        description: 'Collimated high-energy nadion particle emitters with target tracking and particle burst ignition.',
        specs: 'Output: 2.8 Terawatts per emitter, 360° spherical coverage array.',
      },
      {
        id: 'sensor_array',
        name: 'Primary Planetary Sensor Dome',
        deck: 'Deck 11 (Ventral)',
        section: 'primary',
        position: [0, 0.15, 4.2],
        status: 'Nominal',
        description: 'High-resolution subspace optical, graviton, and spectral sensor scanners.',
        specs: 'Range: 8.5 Light Years, active multi-system astronomical cartography.',
      },
      {
        id: 'impulse_engines',
        name: 'Dual Fusion Impulse Drive',
        deck: 'Decks 7-8 (Aft)',
        section: 'primary',
        position: [0, 2.25, -9.0],
        status: this.throttlePercent > 0 ? 'Active' : 'Standby',
        description: 'Deuterium fusion reactor driving magnetoplasmadynamic thrust manifolds.',
        specs: 'Max Sublight Acceleration: 0.25c (74,948 km/s), inertial damper linkage.',
      },
      {
        id: 'torpedo_bay',
        name: 'Forward Photon Torpedo Launchers',
        deck: 'Dorsal Neck (Deck 13)',
        section: 'neck',
        position: [0, -0.35, 4.4],
        status: this.torpedoCount > 0 ? 'Nominal' : 'Standby',
        description: 'Magnetic acceleration tubes firing matter-antimatter warheads producing high-yield particle explosions.',
        specs: `Magazine: ${this.torpedoCount} Torpedoes loaded. High-density spark/shockwave payload.`,
      },
      {
        id: 'deflector_dish',
        name: 'Navigational Deflector & Subspace Emitter',
        deck: 'Secondary Hull Bow',
        section: 'secondary',
        position: [0, -2.4, 7.8],
        status: 'Active',
        description: 'Classic copper and amber parabolic dish fixture mounted at the front nose of the secondary hull with central emitter spike.',
        specs: 'Copper-bronze bezel housing, subspace particle clearing array, warm amber graviton emitter field.',
      },
      {
        id: 'warp_core',
        name: 'Matter / Antimatter Warp Reactor',
        deck: 'Main Engineering (Deck 14)',
        section: 'secondary',
        position: [0, -2.4, -3.2],
        status: 'Nominal',
        description: 'Dilithium crystal intermix chamber powering interplanetary and interstellar transit.',
        specs: 'Output: 5.2 Exawatts, automated multi-system course navigation lock.',
      },
      {
        id: 'shuttlebay',
        name: 'Main Flight Deck & Shuttlebay',
        deck: 'Secondary Hull Aft (Deck 16)',
        section: 'secondary',
        position: [0, -2.0, -12.4],
        status: 'Nominal',
        description: 'Hangar and maintenance bay with runway approach illumination and atmospheric force field.',
        specs: 'Capacity for Class F shuttlecraft and orbital workpods.',
      },
      {
        id: 'port_nacelle',
        name: 'Port Warp Nacelle & Bussard Ramscoop',
        deck: 'Nacelle Pylon Port',
        section: 'nacelles',
        position: [-9.0, 4.4, 0],
        status: this.isWarping ? 'Active' : 'Standby',
        description: 'Features glowing red Bussard ramscoop collector and radiant blue warp coil grilles.',
        specs: 'Hydrogen ramscoop collector with internal spinning intake plasma blades.',
      },
      {
        id: 'starboard_nacelle',
        name: 'Starboard Warp Nacelle & Bussard Ramscoop',
        deck: 'Nacelle Pylon Starboard',
        section: 'nacelles',
        position: [9.0, 4.4, 0],
        status: this.isWarping ? 'Active' : 'Standby',
        description: 'Synchronized warp field generator maintaining warp bubble stability during factor 1-9 transit.',
        specs: 'Hydrogen ramscoop collector with internal spinning intake plasma blades.',
      },
      {
        id: 'shields',
        name: 'Deflector Shield Grid',
        deck: 'Hull Plating Grid',
        section: 'primary',
        position: [0, 1.0, -1.0],
        status: this.shieldsRaised ? 'Active' : 'Standby',
        description: 'Multiphasic energy barrier protecting hull against weapon impacts and spatial radiation.',
        specs: `Integrity: ${this.shieldIntegrity}%, harmonic modulation grid.`,
      },
    ];
  }
}
