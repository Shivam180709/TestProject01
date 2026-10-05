/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationEngine } from './three/simulationEngine';
import {
  CameraViewMode,
  AlertLevel,
  ShipState,
  CelestialTarget,
  ShipSubsystem,
  SolarSystem,
  TacticalLogEvent,
} from './types/simulation';
import { LCARSHeader } from './components/LCARSHeader';
import { FlightHUD } from './components/FlightHUD';
import { LCARSControls } from './components/LCARSControls';
import { ShipInspectionModal } from './components/ShipInspectionModal';
import { SensorScanner } from './components/SensorScanner';
import { NavigationConsole } from './components/NavigationConsole';
import { TacticalRadar } from './components/TacticalRadar';
import { ControlsHelpModal } from './components/ControlsHelpModal';
import { TacticalLogConsole, TacticalHUDTicker } from './components/TacticalLogConsole';
import { EnterpriseDestructionModal } from './components/EnterpriseDestructionModal';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SimulationEngine | null>(null);

  const [shipState, setShipState] = useState<ShipState | null>(null);
  const [currentView, setCurrentView] = useState<CameraViewMode>('chase');
  const [targets, setTargets] = useState<CelestialTarget[]>([]);
  const [subsystems, setSubsystems] = useState<ShipSubsystem[]>([]);
  const [solarSystems, setSolarSystems] = useState<SolarSystem[]>([]);
  const [enemies, setEnemies] = useState<any[]>([]);
  const [planets, setPlanets] = useState<any[]>([]);
  const [combatAssist, setCombatAssist] = useState<boolean>(true);

  // Real-time Tactical Combat Logs
  const [logs, setLogs] = useState<TacticalLogEvent[]>([
    {
      id: 'init_1',
      timestamp: new Date().toTimeString().split(' ')[0],
      stardate: 'SD 47120.4',
      category: 'TACTICAL',
      type: 'info',
      message: 'USS Enterprise NCC-1701 Systems Nominal',
      details: 'All main computer duotronic relays active. Multiphasic shields online.',
    },
    {
      id: 'init_2',
      timestamp: new Date().toTimeString().split(' ')[0],
      stardate: 'SD 47120.5',
      category: 'DEFENSE',
      type: 'success',
      message: 'Shields at 100%',
      details: 'Deflector array running at maximum harmonic efficiency.',
    },
  ]);

  // Modals state
  const [isInspectionOpen, setIsInspectionOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isNavigationOpen, setIsNavigationOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isLogConsoleOpen, setIsLogConsoleOpen] = useState<boolean>(false);
  const [isLogDocked, setIsLogDocked] = useState<boolean>(false);
  const [isRadarScannerOpen, setIsRadarScannerOpen] = useState<boolean>(true);

  // Initialize simulation engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new SimulationEngine(
      containerRef.current,
      (state) => {
        setShipState(state);
      },
      (event) => {
        setLogs((prev) => [event, ...prev.slice(0, 49)]);
      },
      () => {
        setIsLogConsoleOpen((prev) => !prev);
      }
    );
    engineRef.current = engine;

    setTargets(engine.getTargets());
    setSubsystems(engine.getSubsystems());
    setSolarSystems(engine.getSolarSystems());
    setPlanets(engine.getPlanets());
    setEnemies(engine.getEnemyFleet());

    // Update targets & enemies distance periodically
    const targetInterval = setInterval(() => {
      if (engineRef.current) {
        setTargets(engineRef.current.getTargets());
        setEnemies(engineRef.current.getEnemyFleet());
      }
    }, 600);

    const handleGlobalKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'l' || e.key === 'L') {
        setIsLogConsoleOpen((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        setIsRadarScannerOpen((prev) => !prev);
      } else if (e.key === 'g' || e.key === 'G') {
        engineRef.current?.cycleAlertLevel();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);

    return () => {
      window.removeEventListener('keydown', handleGlobalKey);
      clearInterval(targetInterval);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Handlers
  const handleSetAlert = useCallback((level: AlertLevel) => {
    engineRef.current?.setAlertLevel(level);
  }, []);

  const handleSetCameraView = useCallback((mode: CameraViewMode) => {
    setCurrentView(mode);
    engineRef.current?.setCameraView(mode);
  }, []);

  const handleSetThrottle = useCallback((percent: number) => {
    engineRef.current?.setThrottle(percent);
  }, []);

  const handleSetWarpFactor = useCallback((factor: number) => {
    engineRef.current?.setWarpFactor(factor);
  }, []);

  const handleToggleWarp = useCallback(() => {
    engineRef.current?.toggleWarp();
  }, []);

  const handleStartPhaser = useCallback(() => {
    engineRef.current?.startPhaserFiring();
  }, []);

  const handleStopPhaser = useCallback(() => {
    engineRef.current?.stopPhaserFiring();
  }, []);

  const handleFireTorpedo = useCallback(() => {
    engineRef.current?.firePhotonTorpedo();
  }, []);

  const handleTriggerBoost = useCallback(() => {
    engineRef.current?.triggerEvasiveBoost();
  }, []);

  const handleToggleShields = useCallback(() => {
    if (!shipState) return;
    engineRef.current?.setShields(!shipState.shieldsRaised);
  }, [shipState]);

  const handleToggleAutoPilot = useCallback(() => {
    engineRef.current?.toggleAutoPilot();
  }, []);

  const handleSelectTarget = useCallback((targetId: string) => {
    engineRef.current?.setSelectedTarget(targetId);
  }, []);

  const handleFocusSubsystem = useCallback((subsystemId: string) => {
    setCurrentView('orbit');
    engineRef.current?.focusSubsystem(subsystemId);
  }, []);

  // Course Plotting
  const handleSetCourse = useCallback((systemId: string, planetId?: string, warpFactor?: number) => {
    engineRef.current?.setCourseToSolarSystem(systemId, planetId, warpFactor);
    setIsNavigationOpen(false);
  }, []);

  const handleCancelCourse = useCallback(() => {
    engineRef.current?.cancelCourse();
  }, []);

  const handleTargetHostile = useCallback(() => {
    engineRef.current?.targetNextHostile();
  }, []);

  const handleEnterWarZone = useCallback(() => {
    engineRef.current?.enterWarZone();
  }, []);

  const handleSummonHostiles = useCallback(() => {
    engineRef.current?.summonHostileFleet();
  }, []);

  const handleRestartSimulation = useCallback((retryCurrentWave?: boolean) => {
    engineRef.current?.restartSimulation(retryCurrentWave);
    if (!retryCurrentWave) {
      setEnemies([]);
    } else if (engineRef.current) {
      setEnemies(engineRef.current.getEnemyFleet());
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    engineRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    engineRef.current?.zoomOut();
  }, []);

  const handleResetZoom = useCallback(() => {
    engineRef.current?.resetZoom();
  }, []);

  const handleToggleCombatAssist = useCallback(() => {
    engineRef.current?.toggleCombatAssist();
    setCombatAssist((prev) => !prev);
  }, []);

  const handleLockEnemy = useCallback((enemyId: string) => {
    engineRef.current?.setLockedEnemy(enemyId);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-slate-100 flex flex-col font-sans select-none">
      {/* 3D WebGL Canvas Layer */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 w-full h-full cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Top LCARS Navigation & Alert Status Bar */}
      <LCARSHeader
        shipState={shipState}
        onSetAlert={handleSetAlert}
        onToggleInspection={() => setIsInspectionOpen((prev) => !prev)}
        onToggleScanner={() => setIsScannerOpen((prev) => !prev)}
        onToggleNavigation={() => setIsNavigationOpen((prev) => !prev)}
        onToggleHelp={() => setIsHelpOpen((prev) => !prev)}
        onToggleLog={() => setIsLogConsoleOpen((prev) => !prev)}
        onToggleTacticalScanner={() => setIsRadarScannerOpen((prev) => !prev)}
        isInspectionOpen={isInspectionOpen}
        isScannerOpen={isScannerOpen}
        isNavigationOpen={isNavigationOpen}
        isLogOpen={isLogConsoleOpen}
        isTacticalScannerOpen={isRadarScannerOpen}
        logCount={logs.length}
      />

      {/* Floating Tactical HUD Real-Time Event Ticker (Adaptive margin when sensor panel is open) */}
      <TacticalHUDTicker
        recentLogs={logs}
        onOpenFullLog={() => setIsLogConsoleOpen(true)}
        isScannerOpen={isScannerOpen}
      />

      {/* In-Flight HUD & Reticle */}
      <FlightHUD
        shipState={shipState}
        currentView={currentView}
        targets={targets}
        onDisengageWarp={handleToggleWarp}
        onSummonNextWave={handleSummonHostiles}
      />

      {/* Real-time Tactical Astrometric Radar Scanner */}
      <TacticalRadar
        shipState={shipState}
        enemies={enemies}
        planets={planets}
        onLockEnemy={handleLockEnemy}
        onSelectPlanet={handleSelectTarget}
        isOpen={isRadarScannerOpen}
        onToggleOpen={() => setIsRadarScannerOpen((prev) => !prev)}
      />

      {/* Spacer to push controls to bottom */}
      <div className="flex-1 pointer-events-none" />

      {/* Bottom Tactical Flight & LCARS Controls */}
      <LCARSControls
        shipState={shipState}
        currentView={currentView}
        onSetCameraView={handleSetCameraView}
        onSetThrottle={handleSetThrottle}
        onSetWarpFactor={handleSetWarpFactor}
        onToggleWarp={handleToggleWarp}
        onStartPhaser={handleStartPhaser}
        onStopPhaser={handleStopPhaser}
        onFireTorpedo={handleFireTorpedo}
        onToggleShields={handleToggleShields}
        onToggleAutoPilot={handleToggleAutoPilot}
        onTargetHostile={handleTargetHostile}
        onEnterWarZone={handleEnterWarZone}
        onSummonHostiles={handleSummonHostiles}
        combatAssist={combatAssist}
        onToggleCombatAssist={handleToggleCombatAssist}
        onTriggerBoost={handleTriggerBoost}
        onToggleTacticalLog={() => setIsLogConsoleOpen((prev) => !prev)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
      />

      {/* Solar Systems & Auto-Course Navigation Console */}
      <NavigationConsole
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
        solarSystems={solarSystems}
        activeCoursePlot={shipState?.activeCoursePlot ?? null}
        currentSystemId={shipState?.currentSystemId ?? 'sol_system'}
        currentWarpFactor={shipState?.warpFactor ?? 6.0}
        onSetWarpFactor={handleSetWarpFactor}
        onSetCourse={handleSetCourse}
        onCancelCourse={handleCancelCourse}
      />

      {/* Subsystems & Deck-by-Deck 3D Inspection Drawer */}
      <ShipInspectionModal
        isOpen={isInspectionOpen}
        onClose={() => setIsInspectionOpen(false)}
        subsystems={subsystems}
        onFocusSubsystem={handleFocusSubsystem}
      />

      {/* Long-Range Sensor Scanner Drawer */}
      <SensorScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        targets={targets}
        selectedTargetId={shipState?.selectedTargetId ?? null}
        onSelectTarget={handleSelectTarget}
        autoPilot={shipState?.autoPilotToTarget ?? false}
        onToggleAutoPilot={handleToggleAutoPilot}
      />

      {/* Operations & Flight Manual Modal */}
      <ControlsHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Real-time Overlay Tactical Combat Log Console */}
      <TacticalLogConsole
        isOpen={isLogConsoleOpen}
        onClose={() => setIsLogConsoleOpen(false)}
        logs={logs}
        onClearLogs={() => setLogs([])}
        isDocked={isLogDocked}
        onToggleDock={() => setIsLogDocked((prev) => !prev)}
      />

      {/* Enterprise Catastrophic Destruction & Mission Restart Modal */}
      {shipState?.isDestroyed && (
        <EnterpriseDestructionModal
          defeatStats={shipState.defeatStats}
          progression={shipState.progression}
          onRestart={handleRestartSimulation}
        />
      )}
    </div>
  );
}
