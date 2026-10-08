import React, { useState, useMemo } from 'react';
import { SolarSystem, PlanetData, ShipState, CoursePlot } from '../types/simulation';
import { STAR_TREK_SOLAR_SYSTEMS } from '../three/solarSystems';
import {
  X,
  Compass,
  Navigation,
  Globe,
  Radio,
  Rocket,
  Shield,
  Zap,
  CheckCircle,
  Search,
  Filter,
  Eye,
  Crosshair,
  Layers,
  MapPin,
  Anchor,
  Sparkles,
} from 'lucide-react';

interface StarSystemMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  solarSystems: SolarSystem[];
  shipState: ShipState | null;
  activeCoursePlot: CoursePlot | null;
  onSetCourse: (systemId: string, planetId?: string, warpFactor?: number) => void;
  onCancelCourse: () => void;
  onDock?: (stationId?: string) => void;
  onUndock?: () => void;
}

type MapTab = 'galaxy' | 'orbits' | 'manifest';
type FilterType =
  | 'all'
  | 'stations'
  | 'planets'
  | 'federation'
  | 'klingon'
  | 'romulan'
  | 'cardassian'
  | 'dominion'
  | 'delta_borg'
  | 'warzone';

export const StarSystemMapModal: React.FC<StarSystemMapModalProps> = ({
  isOpen,
  onClose,
  solarSystems,
  shipState,
  activeCoursePlot,
  onSetCourse,
  onCancelCourse,
  onDock,
  onUndock,
}) => {
  const [activeTab, setActiveTab] = useState<MapTab>('galaxy');
  const [selectedSystemId, setSelectedSystemId] = useState<string>(
    shipState?.currentSystemId || 'sol_system'
  );
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>('');
  const [selectedWarp, setSelectedWarp] = useState<number>(shipState?.warpFactor || 6.0);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Bulletproof fallback to predefined systems if solarSystems is empty or loading
  const effectiveSolarSystems = useMemo(() => {
    return solarSystems && solarSystems.length > 0 ? solarSystems : STAR_TREK_SOLAR_SYSTEMS;
  }, [solarSystems]);

  const currentSystem: SolarSystem = useMemo(() => {
    const found = effectiveSolarSystems.find((s) => s.id === selectedSystemId);
    if (found) return found;
    const currentShipSys = effectiveSolarSystems.find((s) => s.id === shipState?.currentSystemId);
    if (currentShipSys) return currentShipSys;
    return effectiveSolarSystems[0] || STAR_TREK_SOLAR_SYSTEMS[0];
  }, [effectiveSolarSystems, selectedSystemId, shipState?.currentSystemId]);

  const selectedPlanet: PlanetData | undefined = useMemo(() => {
    if (!currentSystem || !currentSystem.planets || currentSystem.planets.length === 0) {
      return undefined;
    }
    if (selectedPlanetId) {
      const found = currentSystem.planets.find((p) => p.id === selectedPlanetId);
      if (found) return found;
    }
    return currentSystem.planets[0];
  }, [currentSystem, selectedPlanetId]);

  // Galactic map coordinate bounds mapping for 2D schematic rendering
  // Coordinates span across Alpha, Beta, Gamma, and Delta Quadrants
  const mapSvgWidth = 640;
  const mapSvgHeight = 460;

  const mapCoordsToSvg = (x: number, z: number) => {
    // Normalization across the vast Milky Way Galaxy & Quadrants
    const minX = -12000;
    const maxX = 13500;
    const minZ = -16000;
    const maxZ = 1200;

    const normX = Math.max(0, Math.min(1, (x - minX) / (maxX - minX)));
    const normZ = Math.max(0, Math.min(1, (z - minZ) / (maxZ - minZ)));

    return {
      sx: 35 + normX * (mapSvgWidth - 70),
      sy: 30 + normZ * (mapSvgHeight - 60),
    };
  };

  const handleSelectSystem = (sysId: string) => {
    setSelectedSystemId(sysId);
    const sys = effectiveSolarSystems.find((s) => s.id === sysId);
    if (sys && sys.planets && sys.planets.length > 0) {
      // Default to first starbase in system or first planet
      const station = sys.planets.find((p) => p.type === 'starbase');
      setSelectedPlanetId(station ? station.id : sys.planets[0].id);
    } else {
      setSelectedPlanetId('');
    }
  };

  const handleSetCourseToSelected = () => {
    if (!currentSystem) return;
    onSetCourse(currentSystem.id, selectedPlanet?.id, selectedWarp);
    onClose();
  };

  const handleQuickEngage = (systemId: string, planetId?: string) => {
    onSetCourse(systemId, planetId, selectedWarp);
    onClose();
  };

  // Filtered planet list for current system or whole manifest
  const allCelestialBodies = useMemo(() => {
    const list: { system: SolarSystem; planet: PlanetData }[] = [];
    effectiveSolarSystems.forEach((sys) => {
      if (sys.planets) {
        sys.planets.forEach((p) => {
          list.push({ system: sys, planet: p });
        });
      }
    });
    return list;
  }, [effectiveSolarSystems]);

  const filteredManifest = useMemo(() => {
    return allCelestialBodies.filter(({ system, planet }) => {
      if (filterType === 'stations' && planet.type !== 'starbase') return false;
      if (filterType === 'planets' && planet.type === 'starbase') return false;
      if (filterType === 'federation' && system.territory !== 'federation') return false;
      if (filterType === 'warzone' && !system.isWarZone) return false;
      if (filterType === 'klingon' && system.id !== 'kronos_system' && !system.affiliation?.toLowerCase().includes('klingon')) return false;
      if (filterType === 'romulan' && system.id !== 'romulus_system' && !system.affiliation?.toLowerCase().includes('romulan')) return false;
      if (filterType === 'cardassian' && system.id !== 'cardassia_system' && !system.affiliation?.toLowerCase().includes('cardassian')) return false;
      if (filterType === 'dominion' && !system.quadrant.toLowerCase().includes('gamma') && !system.affiliation?.toLowerCase().includes('dominion')) return false;
      if (filterType === 'delta_borg' && !system.quadrant.toLowerCase().includes('delta') && !system.affiliation?.toLowerCase().includes('borg')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          planet.name.toLowerCase().includes(q) ||
          system.name.toLowerCase().includes(q) ||
          (planet.description && planet.description.toLowerCase().includes(q)) ||
          planet.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allCelestialBodies, filterType, searchQuery]);

  if (!isOpen) return null;

  const isCurrentShipSystem = shipState?.currentSystemId === currentSystem?.id;
  const isSelectedStation = selectedPlanet?.type === 'starbase';
  const isNearSelectedStation =
    isSelectedStation &&
    shipState?.canDockAtStation?.id === selectedPlanet?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[860px] bg-slate-950 border-2 border-sky-500/60 rounded-2xl shadow-2xl shadow-sky-950/80 flex flex-col overflow-hidden text-slate-100 font-trek">
        {/* LCARS Top Header Strip with Elbow Accent */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-r from-sky-950 via-slate-900 to-slate-950 border-b border-sky-500/50">
          <div className="flex items-center gap-3">
            {/* LCARS Orange Elbow Accent */}
            <div className="flex items-center">
              <div className="w-9 h-7 rounded-tl-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold text-xs">
                MAP
              </div>
              <div className="w-3 h-7 bg-amber-400 border-l border-slate-950" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-wider text-sky-400 uppercase">
                  ASTROMETRICS CARTOGRAPHY // SECTOR & PLANETARY MAP
                </h2>
                <span className="text-[11px] font-mono-nums px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase font-semibold">
                  LCARS 47
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono-nums flex items-center gap-2">
                <span>SECTOR: {shipState?.currentSystemName || 'Sector 001'}</span>
                <span>·</span>
                <span className="text-emerald-400">
                  {shipState?.isDocked
                    ? `⚓ MOORED AT ${shipState.dockedStationName}`
                    : 'FREE FLIGHT TRAJECTORY'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Dock / Undock Shortcut if near a station */}
            {shipState?.isDocked ? (
              <button
                onClick={onUndock}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-700/40"
                title="Release docking clamps and resume impulse cruise [X key]"
              >
                <Anchor className="w-3.5 h-3.5" />
                <span>Undock [X]</span>
              </button>
            ) : shipState?.canDockAtStation ? (
              <button
                onClick={() => onDock?.(shipState.canDockAtStation?.id)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase transition-colors flex items-center gap-1.5 animate-pulse shadow-md shadow-cyan-500/50"
                title="Dock starship for 100% hull repair and full photon torpedo reload [X key]"
              >
                <Anchor className="w-3.5 h-3.5" />
                <span>Dock & Repair [X]</span>
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-800"
              title="Close Astrometrics Map"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Mode Tabs & Global Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-800/80 bg-slate-900/60 font-trek">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('galaxy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                activeTab === 'galaxy'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Galactic Sector Grid</span>
            </button>

            <button
              onClick={() => setActiveTab('orbits')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                activeTab === 'orbits'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Planetary System Orbits ({currentSystem.name.split('/')[0].trim()})</span>
            </button>

            <button
              onClick={() => setActiveTab('manifest')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                activeTab === 'manifest'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Celestial Manifest ({allCelestialBodies.length})</span>
            </button>
          </div>

          {/* Quick Active Course Notice */}
          {activeCoursePlot && (
            <div className="flex items-center gap-2 text-xs font-mono-nums px-3 py-1 bg-sky-950/80 rounded-md border border-sky-400/40 text-sky-200">
              <Rocket className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span>
                En route to <strong className="text-white">{activeCoursePlot.targetPlanet.name}</strong>
              </span>
              <span className="text-slate-400">·</span>
              <span>ETA ~{activeCoursePlot.etaSeconds}s</span>
              <button
                onClick={onCancelCourse}
                className="ml-1 text-[10px] px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-500 text-white uppercase font-bold"
              >
                Disengage
              </button>
            </div>
          )}
        </div>

        {/* Main Content Split Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT: Interactive Map Canvas View / Manifest */}
          <div className="flex-1 flex flex-col bg-slate-950/60 p-3 sm:p-4 overflow-y-auto border-r border-slate-800">
            {activeTab === 'galaxy' && (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2 text-xs text-slate-400 font-mono-nums">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    <span>QUADRANT CARTOGRAPHY · SELECT A STAR SYSTEM TO VIEW PLANETS & DOCKS</span>
                  </span>
                  <span className="text-amber-400">CLICK ANY STAR TO INSPECT OR WARP</span>
                </div>

                {/* SVG Galactic Coordinate Sector Map */}
                <div className="flex-1 relative rounded-xl border border-sky-500/50 bg-slate-950 overflow-hidden min-h-[350px] flex items-center justify-center p-2 shadow-inner">
                  <svg
                    viewBox={`0 0 ${mapSvgWidth} ${mapSvgHeight}`}
                    className="w-full h-full max-h-[480px] drop-shadow-md select-none bg-slate-950"
                  >
                    {/* Background Grid Lines */}
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" opacity="0.6" />
                      </pattern>
                      <radialGradient id="solGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fde047" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="klingonGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="romulanGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    <rect width={mapSvgWidth} height={mapSvgHeight} fill="#020617" />
                    <rect width={mapSvgWidth} height={mapSvgHeight} fill="url(#grid)" />

                    {/* Background Star Speckles */}
                    <circle cx="80" cy="60" r="1" fill="#94a3b8" opacity="0.5" />
                    <circle cx="150" cy="120" r="0.8" fill="#e2e8f0" opacity="0.6" />
                    <circle cx="280" cy="50" r="1.2" fill="#38bdf8" opacity="0.7" />
                    <circle cx="510" cy="110" r="1" fill="#fde047" opacity="0.5" />
                    <circle cx="430" cy="380" r="0.8" fill="#94a3b8" opacity="0.6" />
                    <circle cx="210" cy="390" r="1.1" fill="#cbd5e1" opacity="0.7" />
                    <circle cx="340" cy="310" r="0.7" fill="#64748b" opacity="0.5" />
                    <circle cx="95" cy="290" r="1.3" fill="#38bdf8" opacity="0.6" />

                    {/* Sector Neutral Zone & Territory Boundaries */}
                    {/* The Great Galactic Barrier (Milky Way Rim) */}
                    <path
                      d="M 40 45 Q 320 20, 600 45"
                      fill="none"
                      stroke="#ec4899"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      opacity="0.85"
                    />
                    <text x="320" y="38" textAnchor="middle" fill="#f472b6" fontSize="10" fontWeight="bold" letterSpacing="1">
                      ⚡ THE GREAT GALACTIC BARRIER // MILKY WAY RIM
                    </text>

                    {/* United Federation of Planets boundary */}
                    <path
                      d="M 180 375 C 190 300, 375 295, 395 345 C 410 395, 375 435, 290 440 C 210 440, 175 420, 180 375 Z"
                      fill="rgba(2, 132, 199, 0.08)"
                      stroke="#0284c7"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                    <text x="210" y="425" fill="#38bdf8" fontSize="10" fontWeight="bold" opacity="0.8">
                      UNITED FEDERATION OF PLANETS
                    </text>

                    {/* Klingon Empire Zone (Qo'noS, Praxis, Rura Penthe, Boreth, Ty'Gokor, Mempa) */}
                    <path
                      d="M 355 290 C 370 230, 445 235, 465 270 C 470 315, 435 340, 380 330 C 350 325, 345 310, 355 290 Z"
                      fill="rgba(220, 38, 38, 0.09)"
                      stroke="#dc2626"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                    <text x="385" y="248" fill="#f87171" fontSize="10" fontWeight="bold" opacity="0.85">
                      KLINGON EMPIRE (Qo'noS)
                    </text>

                    {/* Romulan Star Empire Zone */}
                    <path
                      d="M 370 340 C 395 300, 470 305, 485 345 C 490 385, 450 405, 395 395 C 365 390, 360 365, 370 340 Z"
                      fill="rgba(5, 150, 105, 0.08)"
                      stroke="#059669"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                    <text x="420" y="375" fill="#34d399" fontSize="10" fontWeight="bold" opacity="0.8">
                      ROMULAN STAR EMPIRE
                    </text>

                    {/* Cardassian Union Zone */}
                    <path
                      d="M 95 350 C 110 300, 205 310, 225 355 C 225 405, 175 425, 120 415 C 85 405, 85 380, 95 350 Z"
                      fill="rgba(245, 158, 11, 0.08)"
                      stroke="#f59e0b"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                    <text x="115" y="335" fill="#fbbf24" fontSize="10" fontWeight="bold" opacity="0.8">
                      CARDASSIAN UNION
                    </text>

                    {/* Dominion / Gamma Quadrant (Via Wormhole) */}
                    <path
                      d="M 35 220 C 45 160, 120 170, 135 225 C 135 275, 85 285, 45 270 C 25 255, 25 235, 35 220 Z"
                      fill="rgba(168, 85, 247, 0.08)"
                      stroke="#a855f7"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                    <text x="45" y="195" fill="#c084fc" fontSize="9" fontWeight="bold" opacity="0.85">
                      DOMINION (GAMMA QUADRANT)
                    </text>

                    {/* Borg Collective & Delta Quadrant Frontier */}
                    <path
                      d="M 465 160 C 485 95, 580 85, 595 150 C 600 205, 550 230, 480 220 C 455 205, 455 180, 465 160 Z"
                      fill="rgba(34, 197, 94, 0.08)"
                      stroke="#22c55e"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                    <text x="475" y="112" fill="#4ade80" fontSize="9" fontWeight="bold" opacity="0.85">
                      BORG SPACE & DELTA FRONTIER
                    </text>

                    {/* Quadrant Legend Markers */}
                    <text x="120" y="445" fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="bold">
                      ◄ ALPHA QUADRANT
                    </text>
                    <text x="470" y="445" fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="bold">
                      BETA QUADRANT ►
                    </text>
                    <text x="45" y="175" fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="bold">
                      ▲ GAMMA QUADRANT
                    </text>
                    <text x="510" y="80" fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="bold">
                      ▲ DELTA QUADRANT
                    </text>

                    {/* Connecting Subspace Warp Corridors */}
                    {effectiveSolarSystems.map((sysA, i) => {
                      const posA = mapCoordsToSvg(sysA.centerCoordinates[0], sysA.centerCoordinates[2]);
                      return effectiveSolarSystems.slice(i + 1).map((sysB) => {
                        const posB = mapCoordsToSvg(sysB.centerCoordinates[0], sysB.centerCoordinates[2]);
                        const d = Math.hypot(posA.sx - posB.sx, posA.sy - posB.sy);
                        if (d < 160) {
                          return (
                            <line
                              key={`${sysA.id}-${sysB.id}`}
                              x1={posA.sx}
                              y1={posA.sy}
                              x2={posB.sx}
                              y2={posB.sy}
                              stroke="#334155"
                              strokeWidth="1"
                              strokeDasharray="3 3"
                            />
                          );
                        }
                        return null;
                      });
                    })}

                    {/* Systems as Interactive Star Nodes */}
                    {effectiveSolarSystems.map((sys) => {
                      const { sx, sy } = mapCoordsToSvg(sys.centerCoordinates[0], sys.centerCoordinates[2]);
                      const isSelected = sys.id === selectedSystemId;
                      const isHere = sys.id === shipState?.currentSystemId;
                      const hasDock = sys.planets?.some((p) => p.type === 'starbase');
                      const isFed = sys.territory === 'federation';

                      const starColor =
                        sys.id === 'sol_system'
                          ? '#fde047'
                          : sys.id === 'vulcan_system'
                          ? '#f97316'
                          : sys.id === 'andoria_system'
                          ? '#38bdf8'
                          : sys.id === 'kronos_system' || sys.id === 'mempa_system'
                          ? '#ef4444'
                          : sys.id === 'romulus_system' || sys.id === 'krios_system'
                          ? '#10b981'
                          : sys.id === 'cardassia_system' || sys.id === 'chintoka_system'
                          ? '#f59e0b'
                          : sys.id === 'gorn_sector' || sys.id === 'bolian_system'
                          ? '#60a5fa'
                          : sys.id === 'idran_system'
                          ? '#818cf8'
                          : sys.id === 'omarion_system'
                          ? '#f472b6'
                          : sys.id === 'delta_caretaker_system'
                          ? '#06b6d4'
                          : sys.id === 'borg_unicomplex_system'
                          ? '#22c55e'
                          : sys.id === 'galactic_barrier_sector'
                          ? '#ec4899'
                          : '#38bdf8';

                      return (
                        <g
                          key={sys.id}
                          className="cursor-pointer transition-transform"
                          onClick={() => handleSelectSystem(sys.id)}
                        >
                          {/* Selection aura */}
                          {isSelected && (
                            <circle
                              cx={sx}
                              cy={sy}
                              r="26"
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="1.8"
                              strokeDasharray="4 2"
                            >
                              <animateTransform
                                attributeName="transform"
                                type="rotate"
                                from={`0 ${sx} ${sy}`}
                                to={`360 ${sx} ${sy}`}
                                dur="8s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          )}

                          {/* Enterprise Player Location Marker */}
                          {isHere && (
                            <g>
                              <circle
                                cx={sx}
                                cy={sy}
                                r="34"
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="2"
                                opacity="0.8"
                              >
                                <animate
                                  attributeName="r"
                                  values="22;38;22"
                                  dur="2.5s"
                                  repeatCount="indefinite"
                                />
                                <animate
                                  attributeName="opacity"
                                  values="0.9;0.2;0.9"
                                  dur="2.5s"
                                  repeatCount="indefinite"
                                />
                              </circle>
                              <text
                                x={sx}
                                y={sy - 22}
                                textAnchor="middle"
                                fill="#38bdf8"
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                📍 YOU ARE HERE
                              </text>
                            </g>
                          )}

                          {/* Star Glow */}
                          <circle cx={sx} cy={sy} r="14" fill={starColor} opacity="0.3" />

                          {/* Central Star Core */}
                          <circle
                            cx={sx}
                            cy={sy}
                            r={isSelected ? '8' : '6.5'}
                            fill={starColor}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />

                          {/* Space Station / Drydock indicator icon */}
                          {hasDock && (
                            <g transform={`translate(${sx + 10}, ${sy - 14})`}>
                              <circle cx="5" cy="5" r="7" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
                              <text x="5" y="8" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                                ⚓
                              </text>
                            </g>
                          )}

                          {/* Mini planetary satellites for Klingon Homeworld / Selected system */}
                          {sys.planets && (isSelected || sys.id === 'kronos_system') && (
                            <g>
                              {sys.planets.slice(0, 4).map((p, pIdx) => {
                                const angle = pIdx * 1.57 + 0.3;
                                const dist = 16 + (pIdx % 2) * 5;
                                const px = sx + Math.cos(angle) * dist;
                                const py = sy + Math.sin(angle) * dist;
                                return (
                                  <circle
                                    key={p.id}
                                    cx={px}
                                    cy={py}
                                    r={p.type === 'starbase' ? 2.5 : 2}
                                    fill={p.textureColor || '#cbd5e1'}
                                    stroke="#0f172a"
                                    strokeWidth="0.5"
                                  />
                                );
                              })}
                            </g>
                          )}

                          {/* Label */}
                          <text
                            x={sx}
                            y={sy + 18}
                            textAnchor="middle"
                            fill={isSelected ? '#38bdf8' : sys.id === 'kronos_system' ? '#fca5a5' : '#f8fafc'}
                            fontSize="11"
                            fontWeight="bold"
                            letterSpacing="0.5"
                          >
                            {sys.id === 'kronos_system' ? "Qo'noS (Klingon Empire)" : sys.name.split('/')[0].trim()}
                          </text>

                          {/* Sub-label */}
                          <text
                            x={sx}
                            y={sy + 29}
                            textAnchor="middle"
                            fill={isFed ? '#7dd3fc' : '#fca5a5'}
                            fontSize="8"
                            fontFamily="monospace"
                          >
                            {isFed ? 'FEDERATION' : 'WAR ZONE'} · {sys.planets.length} BODIES
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Planetary Bodies in Selected Sector (e.g. Qo'noS Homeworld, Praxis, etc.) */}
                {currentSystem && currentSystem.planets && currentSystem.planets.length > 0 && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-trek uppercase font-bold text-sky-400">
                        <Globe className="w-3.5 h-3.5 text-sky-400" />
                        <span>Planetary Bodies in {currentSystem.name}:</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({currentSystem.planets.length} worlds & stations cataloged)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono-nums text-slate-400">
                        Select any world to plot course
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {currentSystem.planets.map((planet) => {
                        const isTarget = selectedPlanet?.id === planet.id;
                        const isStation = planet.type === 'starbase';
                        return (
                          <div
                            key={planet.id}
                            onClick={() => setSelectedPlanetId(planet.id)}
                            className={`p-2 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                              isTarget
                                ? 'bg-sky-950/80 border-sky-400 ring-1 ring-sky-400/50 shadow-md'
                                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <div
                                  className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                                  style={{ backgroundColor: planet.textureColor || '#38bdf8' }}
                                />
                                <span className="text-xs font-bold text-white truncate font-trek">
                                  {planet.name.split('(')[0].trim()}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono-nums truncate mb-1.5">
                                {isStation ? '⚓ Starbase' : `Type: ${planet.type}`}
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickEngage(currentSystem.id, planet.id);
                              }}
                              className="w-full py-1 px-1.5 rounded bg-sky-600/80 hover:bg-sky-500 text-white font-trek font-bold text-[10px] uppercase tracking-wide flex items-center justify-center gap-1 transition-colors"
                              title={`Engage course to ${planet.name} and exit map`}
                            >
                              <Rocket className="w-3 h-3" />
                              <span>Engage</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orbits' && (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2 text-xs text-slate-400 font-mono-nums">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>
                      ORBITAL SYSTEM VIEW: <strong className="text-white">{currentSystem.name}</strong>
                    </span>
                  </span>
                  <span className="text-sky-300">CLICK ANY PLANET OR SPACEDOCK TO SELECT</span>
                </div>

                {/* Concentric Orbital Plane Visualization */}
                <div className="flex-1 relative rounded-xl border border-sky-500/40 bg-slate-950 overflow-hidden min-h-[340px] flex items-center justify-center p-2">
                  <svg viewBox="0 0 600 420" className="w-full h-full max-h-[460px] select-none">
                    <defs>
                      <radialGradient id="starCore" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
                        <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Central Star */}
                    <circle cx="300" cy="210" r="48" fill="url(#starCore)" />
                    <circle cx="300" cy="210" r="18" fill="#fef08a" stroke="#ffffff" strokeWidth="2" />
                    <text x="300" y="242" textAnchor="middle" fill="#fde68a" fontSize="10" fontWeight="bold">
                      {currentSystem.primaryStar.split('(')[0].trim()}
                    </text>

                    {/* Concentric Planet Orbits */}
                    {currentSystem.planets.map((planet, index) => {
                      const orbitRadius = 60 + (index + 1) * 36;
                      const angle = (index * 1.35 + 0.4) * Math.PI;
                      const px = 300 + Math.cos(angle) * orbitRadius;
                      const py = 210 + Math.sin(angle) * (orbitRadius * 0.72); // Elliptical perspective
                      const isSelected = planet.id === selectedPlanet?.id;
                      const isStation = planet.type === 'starbase';

                      return (
                        <g
                          key={planet.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedPlanetId(planet.id)}
                        >
                          {/* Elliptical Orbit Track */}
                          <ellipse
                            cx="300"
                            cy="210"
                            rx={orbitRadius}
                            ry={orbitRadius * 0.72}
                            fill="none"
                            stroke={isSelected ? '#38bdf8' : '#334155'}
                            strokeWidth={isSelected ? '1.5' : '0.8'}
                            strokeDasharray={isStation ? '2 2' : 'none'}
                          />

                          {/* Selected Ring */}
                          {isSelected && (
                            <circle
                              cx={px}
                              cy={py}
                              r={isStation ? '18' : '15'}
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="2"
                              strokeDasharray="3 2"
                            >
                              <animateTransform
                                attributeName="transform"
                                type="rotate"
                                from={`0 ${px} ${py}`}
                                to={`360 ${px} ${py}`}
                                dur="6s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          )}

                          {/* Planet or Station Marker */}
                          {isStation ? (
                            <g>
                              {/* Glowing blue Starbase facility */}
                              <rect
                                x={px - 8}
                                y={py - 8}
                                width="16"
                                height="16"
                                rx="3"
                                fill="#0284c7"
                                stroke="#38bdf8"
                                strokeWidth="1.5"
                              />
                              <text x={px} y={py + 4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                                ⚓
                              </text>
                            </g>
                          ) : (
                            <circle
                              cx={px}
                              cy={py}
                              r={Math.max(6, Math.min(14, planet.radius * 0.25))}
                              fill={planet.textureColor || '#38bdf8'}
                              stroke="#f8fafc"
                              strokeWidth="1.2"
                            />
                          )}

                          {/* Label */}
                          <text
                            x={px}
                            y={py - 12}
                            textAnchor="middle"
                            fill={isSelected ? '#38bdf8' : '#e2e8f0'}
                            fontSize="9"
                            fontWeight="bold"
                          >
                            {planet.name.split('(')[0].trim()}
                          </text>

                          {isStation && (
                            <text
                              x={px}
                              y={py + 18}
                              textAnchor="middle"
                              fill="#38bdf8"
                              fontSize="8"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              [REPAIR DOCK]
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}

            {activeTab === 'manifest' && (
              <div className="flex-1 flex flex-col">
                {/* Search & Filter Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search planets, starbases, drydocks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-trek text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { id: 'all', label: 'All Bodies' },
                      { id: 'stations', label: '⚓ Starbases & Docks' },
                      { id: 'planets', label: '🪐 Worlds' },
                      { id: 'federation', label: 'Federation' },
                      { id: 'klingon', label: '⚔️ Klingon Empire' },
                      { id: 'romulan', label: '🦅 Romulan' },
                      { id: 'cardassian', label: '🏛️ Cardassian' },
                      { id: 'dominion', label: '🌌 Dominion (Gamma)' },
                      { id: 'delta_borg', label: '🟩 Delta / Borg' },
                      { id: 'warzone', label: 'War Zones' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFilterType(f.id as FilterType)}
                        className={`px-2.5 py-1 text-[11px] rounded transition-colors uppercase font-bold ${
                          filterType === f.id
                            ? 'bg-sky-500 text-slate-950 shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manifest Grid */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1">
                  {filteredManifest.map(({ system, planet }) => {
                    const isSelected = planet.id === selectedPlanet?.id;
                    const isStation = planet.type === 'starbase';
                    return (
                      <div
                        key={planet.id}
                        onClick={() => {
                          setSelectedSystemId(system.id);
                          setSelectedPlanetId(planet.id);
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-sky-950/80 border-sky-400 ring-1 ring-sky-400/50 shadow-md'
                            : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                          style={{
                            backgroundColor: planet.textureColor || '#334155',
                            borderColor: isStation ? '#38bdf8' : '#64748b',
                          }}
                        >
                          {isStation ? (
                            <span className="text-base text-sky-200">⚓</span>
                          ) : (
                            <span className="text-xs">🪐</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-white truncate">
                              {planet.name}
                            </h4>
                            {isStation && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-400 text-cyan-300 font-mono font-bold uppercase shrink-0">
                                Refit Dock
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono-nums truncate">
                            {system.name.split('/')[0].trim()} · Type: {planet.type}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {planet.description}
                          </p>

                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickEngage(system.id, planet.id);
                              }}
                              className="py-1 px-2.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-trek font-bold text-[10px] uppercase tracking-wide flex items-center gap-1 transition-colors"
                              title={`Lay in course and engage to ${planet.name}`}
                            >
                              <Rocket className="w-3 h-3" />
                              <span>Plot & Engage</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Detailed Inspector & Warp / Dock Actions Panel */}
          <div className="w-full md:w-[380px] bg-slate-900/80 p-4 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 md:border-l border-slate-800 font-trek">
            <div>
              {/* Selected Target Header */}
              <div className="flex items-start justify-between pb-3 mb-3 border-b border-slate-800">
                <div>
                  <div className="text-[10px] font-mono-nums text-sky-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    <Crosshair className="w-3 h-3 text-sky-400" />
                    <span>TARGET TELEMETRY</span>
                  </div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wide mt-0.5">
                    {selectedPlanet ? selectedPlanet.name : (currentSystem?.name || 'Sector View')}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono-nums">
                    System: <span className="text-amber-300">{currentSystem?.name || 'Local System'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      currentSystem?.territory === 'federation'
                        ? 'bg-sky-950 border-sky-500/50 text-sky-300'
                        : 'bg-red-950 border-red-500/50 text-red-300'
                    }`}
                  >
                    {currentSystem?.territory === 'federation' ? 'FEDERATION' : 'WAR ZONE'}
                  </span>
                </div>
              </div>

              {/* CRITICAL STARBASE REPAIR & REARM BADGE */}
              {isSelectedStation && (
                <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-cyan-950/80 to-blue-950/90 border-2 border-cyan-400 text-xs shadow-lg shadow-cyan-950/50 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2 mb-1.5 font-bold text-cyan-300 uppercase tracking-wide">
                    <Anchor className="w-4 h-4 text-cyan-400" />
                    <span>STARSHIP REPAIR & REARM FACILITY</span>
                  </div>
                  <p className="text-[11px] text-cyan-100/90 leading-relaxed font-mono-nums mb-2">
                    Docking slips certified for Constitution-class starships. Guarantees complete structural hull restoration and full replenishment of tactical photon torpedo ordnance.
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono-nums text-slate-300">
                    <div className="p-1 rounded bg-slate-900/80 border border-cyan-500/30 flex items-center gap-1">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Hull Refit: <strong>100%</strong></span>
                    </div>
                    <div className="p-1 rounded bg-slate-900/80 border border-cyan-500/30 flex items-center gap-1">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Shields: <strong>100%</strong></span>
                    </div>
                    <div className="p-1 rounded bg-slate-900/80 border border-cyan-500/30 flex items-center gap-1">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Torpedoes: <strong>30/30</strong></span>
                    </div>
                    <div className="p-1 rounded bg-slate-900/80 border border-cyan-500/30 flex items-center gap-1">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Thruster Overdrive</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Planet / System Specs Grid */}
              <div className="space-y-2 mb-4 text-xs font-mono-nums">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Classification:</span>
                  <span className="text-white font-semibold">
                    {selectedPlanet ? selectedPlanet.type.toUpperCase() : (currentSystem?.spectralType || 'STAR')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Primary Star:</span>
                  <span className="text-amber-300">{currentSystem?.primaryStar || 'Central Star'}</span>
                </div>
                {selectedPlanet && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Target Radius:</span>
                    <span className="text-white">{selectedPlanet.radius * 100} km</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Coordinates:</span>
                  <span className="text-slate-300">
                    {selectedPlanet
                      ? `[${selectedPlanet.position.join(', ')}]`
                      : `[${currentSystem?.centerCoordinates ? currentSystem.centerCoordinates.join(', ') : '0, 0, 0'}]`}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {selectedPlanet ? selectedPlanet.description : (currentSystem?.description || '')}
              </div>
            </div>

            {/* Bottom Actions Area: Warp Cruise Selector & Engagement */}
            <div className="space-y-2 pt-2 border-t border-slate-800 font-trek">
              {/* Warp Factor Speed Chooser */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-sky-400 uppercase font-bold">
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Warp Factor:</span>
                  <span className="text-white font-mono-nums">W{selectedWarp.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[4, 6, 8, 9, 9.9].map((w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedWarp(w)}
                      className={`px-2 py-0.5 text-[10px] font-mono-nums rounded border transition-colors ${
                        Math.abs(selectedWarp - w) < 0.15
                          ? 'bg-sky-500 text-slate-950 font-bold border-sky-400'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {w === 9.9 ? '9.9' : `W${w}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* ACTION: DOCK DIRECTLY IF IN PROXIMITY */}
              {isNearSelectedStation && (
                <button
                  onClick={() => onDock?.(selectedPlanet?.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold uppercase tracking-wider text-xs transition-all shadow-lg shadow-cyan-500/50 flex items-center justify-center gap-2 animate-pulse"
                >
                  <Anchor className="w-4 h-4" />
                  <span>Dock Starship Here (100% Repair & Reload) [X]</span>
                </button>
              )}

              {/* ACTION: SET COURSE / WARP TO TARGET */}
              <button
                onClick={handleSetCourseToSelected}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold uppercase tracking-wider text-xs transition-colors shadow-lg shadow-sky-900/40 flex items-center justify-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                <span>
                  Engage Course to {selectedPlanet ? selectedPlanet.name.split('(')[0].trim() : (currentSystem?.name ? currentSystem.name.split('/')[0].trim() : 'Destination')}
                </span>
              </button>

              {/* CANCEL COURSE IF ENGAGED */}
              {activeCoursePlot && (
                <button
                  onClick={onCancelCourse}
                  className="w-full py-1.5 px-3 rounded-lg bg-red-600/80 hover:bg-red-500 text-white font-bold uppercase tracking-wider text-xs transition-colors"
                >
                  Disengage Active Course (All Stop)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
