import React, { useState, useMemo } from 'react';
import { SolarSystem, PlanetData, CoursePlot, ShipState } from '../types/simulation';
import { STAR_TREK_SOLAR_SYSTEMS } from '../three/solarSystems';
import { X, Navigation, Compass, Globe, CheckCircle2, Rocket, AlertTriangle, Shield, Anchor } from 'lucide-react';

interface NavigationConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  solarSystems: SolarSystem[];
  shipState?: ShipState | null;
  activeCoursePlot: CoursePlot | null;
  currentSystemId: string;
  currentWarpFactor?: number;
  onSetWarpFactor?: (factor: number) => void;
  onSetCourse: (systemId: string, planetId?: string, warpFactor?: number) => void;
  onCancelCourse: () => void;
}

export const NavigationConsole: React.FC<NavigationConsoleProps> = ({
  isOpen,
  onClose,
  solarSystems,
  shipState,
  activeCoursePlot,
  currentSystemId,
  currentWarpFactor = 6.0,
  onSetWarpFactor,
  onSetCourse,
  onCancelCourse,
}) => {
  const [selectedSystemId, setSelectedSystemId] = useState<string>(currentSystemId || 'sol_system');
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>('');
  const [selectedWarpFactor, setSelectedWarpFactor] = useState<number>(currentWarpFactor);
  const [navTerritory, setNavTerritory] = useState<'all' | 'federation' | 'klingon' | 'romulan' | 'cardassian' | 'frontier'>('all');

  const effectiveSolarSystems = useMemo(() => {
    return solarSystems && solarSystems.length > 0 ? solarSystems : STAR_TREK_SOLAR_SYSTEMS;
  }, [solarSystems]);

  const filteredSystems = useMemo(() => {
    return effectiveSolarSystems.filter((sys) => {
      if (navTerritory === 'federation') return sys.territory === 'federation';
      if (navTerritory === 'klingon') return sys.affiliation?.toLowerCase().includes('klingon') || sys.id === 'kronos_system';
      if (navTerritory === 'romulan') return sys.affiliation?.toLowerCase().includes('romulan') || sys.id === 'romulus_system';
      if (navTerritory === 'cardassian') return sys.affiliation?.toLowerCase().includes('cardassian') || sys.id === 'cardassia_system';
      if (navTerritory === 'frontier') return !sys.territory || (sys.territory !== 'federation' && !sys.affiliation?.toLowerCase().includes('klingon') && !sys.affiliation?.toLowerCase().includes('romulan') && !sys.affiliation?.toLowerCase().includes('cardassian'));
      return true;
    });
  }, [effectiveSolarSystems, navTerritory]);

  if (!isOpen) return null;

  const currentSystem =
    effectiveSolarSystems.find((s) => s.id === selectedSystemId) ||
    effectiveSolarSystems[0] ||
    STAR_TREK_SOLAR_SYSTEMS[0];

  const activePlanet = selectedPlanetId
    ? currentSystem?.planets?.find((p) => p.id === selectedPlanetId)
    : currentSystem?.planets?.[0];

  const handleSetCourse = () => {
    onSetCourse(currentSystem.id, activePlanet?.id, selectedWarpFactor);
    onClose();
  };

  const handleEmergencyEscape = (sysId: string, planetId?: string) => {
    onSetCourse(sysId, planetId, 9.9);
    onClose();
  };

  const isLowHealth =
    (shipState && ((shipState.shieldIntegrity < 50 && shipState.shieldsRaised) || !shipState.shieldsRaised || shipState.hullIntegrity < 65 || shipState.lockedEnemy)) ?? false;

  return (
    <div className="fixed inset-y-0 left-0 z-40 w-full sm:w-[500px] bg-slate-950/95 backdrop-blur-xl border-r border-sky-500/40 text-slate-100 shadow-2xl flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/70">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-6 bg-sky-400 rounded-sm" />
          <div>
            <h2 className="text-sm font-trek uppercase tracking-wider font-bold text-sky-400">
              Stellar Cartography & Course Plotter
            </h2>
            <p className="text-xs text-slate-400 font-mono-nums">Starfleet Automated Astrogation System</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close Navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active Warp Flight Status Banner */}
      {activeCoursePlot && (
        <div className="px-4 py-3 bg-gradient-to-r from-sky-950/90 to-blue-950/80 border-b border-sky-500/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-trek text-sky-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              Automated Warp Course Engaged
            </span>
            <span className="text-[10px] font-mono-nums px-2 py-0.5 rounded bg-sky-500/30 text-sky-200 border border-sky-400/50 uppercase font-semibold">
              {activeCoursePlot.phase.replace('_', ' ')}
            </span>
          </div>

          <div className="text-xs text-slate-200 mb-2">
            Target: <span className="font-semibold text-white">{activeCoursePlot.targetSystem.name}</span> ·{' '}
            <span className="text-amber-300">{activeCoursePlot.targetPlanet.name}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono-nums text-slate-300 mb-2">
            <span>Distance: {activeCoursePlot.distance.toLocaleString()} km</span>
            <span>ETA: ~{activeCoursePlot.etaSeconds}s</span>
          </div>

          <button
            onClick={onCancelCourse}
            className="w-full py-1 px-3 bg-red-600/80 hover:bg-red-500 text-white rounded text-xs font-trek uppercase font-bold tracking-wider transition-colors"
          >
            Disengage Course (All Stop)
          </button>
        </div>
      )}

      {/* Emergency Combat Evacuation Section (Especially Useful when Shields / Hull are Low to escape enemy ships) */}
      <div className={`px-4 py-3 border-b transition-colors ${
        isLowHealth
          ? 'bg-gradient-to-r from-red-950/90 via-amber-950/80 to-slate-900 border-red-500/70 shadow-lg shadow-red-950/50'
          : 'bg-slate-900/60 border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-trek uppercase font-bold text-amber-300">
            <AlertTriangle className={`w-3.5 h-3.5 ${isLowHealth ? 'text-red-400 animate-bounce' : 'text-amber-400'}`} />
            <span>Emergency Warp Escape Protocols</span>
          </div>
          {shipState && (
            <div className="flex items-center gap-2 text-[10px] font-mono-nums">
              <span className={shipState.shieldsRaised && shipState.shieldIntegrity >= 50 ? 'text-sky-300' : 'text-red-400 font-bold'}>
                Shields: {shipState.shieldsRaised ? `${shipState.shieldIntegrity}%` : 'DOWN'}
              </span>
              <span className="text-slate-600">|</span>
              <span className={shipState.hullIntegrity >= 60 ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                Hull: {shipState.hullIntegrity}%
              </span>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-300 mb-2 leading-tight">
          Instantly break hostile engagement and engage maximum warp (W9.9) towards safe Federation drydocks:
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleEmergencyEscape('sol_system', 'sol_spacedock')}
            className="py-1.5 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-trek font-bold text-[11px] uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 border border-sky-400"
            title="Emergency Warp to Earth Spacedock One at Warp 9.9"
          >
            <Anchor className="w-3.5 h-3.5 text-sky-200" />
            <span className="truncate">Earth Spacedock</span>
          </button>

          <button
            onClick={() => handleEmergencyEscape('andoria_system', 'andoria_starbase')}
            className="py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-trek font-bold text-[11px] uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 border border-blue-400"
            title="Emergency Warp to Starbase 11 at Warp 9.9"
          >
            <Shield className="w-3.5 h-3.5 text-blue-200" />
            <span className="truncate">Starbase 11</span>
          </button>

          <button
            onClick={() => handleEmergencyEscape('starbase74_sector', 'starbase_74_megadock')}
            className="py-1.5 px-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-trek font-bold text-[11px] uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 border border-cyan-400"
            title="Emergency Warp to Starbase 74 Mega-Spacedock at Warp 9.9"
          >
            <Anchor className="w-3.5 h-3.5 text-cyan-200" />
            <span className="truncate">Starbase 74</span>
          </button>

          <button
            onClick={() => handleEmergencyEscape('vulcan_system', 'vulcan_spacedock')}
            className="py-1.5 px-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-trek font-bold text-[11px] uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 border border-amber-400"
            title="Emergency Warp to Vulcan Orbital Complex at Warp 9.9"
          >
            <Shield className="w-3.5 h-3.5 text-amber-200" />
            <span className="truncate">Vulcan Dock</span>
          </button>
        </div>
      </div>

      {/* Territory Filter Strip */}
      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center gap-1 overflow-x-auto text-[11px] font-trek">
        {[
          { id: 'all', label: 'All Sectors' },
          { id: 'federation', label: 'Federation' },
          { id: 'klingon', label: 'Klingon' },
          { id: 'romulan', label: 'Romulan' },
          { id: 'cardassian', label: 'Cardassian' },
          { id: 'frontier', label: 'Deep Space' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setNavTerritory(t.id as any)}
            className={`px-2.5 py-1 rounded transition-colors uppercase font-bold whitespace-nowrap ${
              navTerritory === t.id
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Solar System Selection Strip */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/40 overflow-x-auto flex items-center gap-1.5">
        {filteredSystems.map((sys) => {
          const isSelected = sys.id === currentSystem.id;
          const isHere = sys.id === currentSystemId;
          const isFed = sys.territory === 'federation';
          return (
            <button
              key={sys.id}
              onClick={() => {
                setSelectedSystemId(sys.id);
                setSelectedPlanetId('');
              }}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>{sys.name.split('/')[0].trim()}</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold uppercase ${
                  isFed
                    ? isSelected ? 'bg-sky-900 text-sky-200' : 'bg-sky-950/80 text-sky-400 border border-sky-500/30'
                    : isSelected ? 'bg-amber-900 text-amber-200' : 'bg-red-950/80 text-red-400 border border-red-500/30'
                }`}
              >
                {isFed ? 'FED' : 'NON-FED'}
              </span>
              {isHere && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Current Location" />}
            </button>
          );
        })}
      </div>

      {/* Selected Solar System Overview */}
      <div className="p-4 bg-gradient-to-b from-slate-900/70 to-slate-950 border-b border-slate-800">
        {/* Jurisdiction / Territory Badge */}
        <div className="mb-2">
          {currentSystem.territory === 'federation' ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-950/80 border border-sky-400/50 text-[11px] font-trek font-bold uppercase tracking-wider text-sky-300 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span>FEDERATION TERRITORY</span>
              <span className="text-slate-400">·</span>
              <span className="text-sky-200 font-normal">{currentSystem.affiliation || 'United Federation of Planets'}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-500/60 text-[11px] font-trek font-bold uppercase tracking-wider text-red-300 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span>NON-FEDERATION / ALIEN TERRITORY</span>
              <span className="text-slate-400">·</span>
              <span className="text-amber-200 font-normal">{currentSystem.affiliation || 'Hostile Sovereign Space'}</span>
            </div>
          )}
        </div>

        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-[11px] font-mono-nums text-sky-400 uppercase tracking-wide">
              {currentSystem.quadrant} · {currentSystem.spectralType}
            </div>
            <h3 className="text-base font-trek font-bold text-white tracking-wide mt-0.5">
              {currentSystem.name}
            </h3>
          </div>
          <div className="text-right text-[11px] font-mono-nums text-slate-400">
            <div>Star: {currentSystem.primaryStar}</div>
            <div className="text-amber-400 font-semibold">{currentSystem.planets.length} Planetary Bodies</div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          {currentSystem.description}
        </p>

        {/* Warp Cruise Speed Selector */}
        <div className="flex items-center justify-between p-2 mb-3 bg-slate-950/70 rounded-lg border border-sky-500/30">
          <div className="flex items-center gap-1.5">
            <Rocket className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-xs font-trek text-sky-400 uppercase tracking-wide">Cruise Speed:</span>
            <span className="text-xs font-mono-nums font-bold text-white">Warp {selectedWarpFactor.toFixed(1)}</span>
          </div>

          <div className="flex items-center gap-1">
            {[4, 6, 8, 9, 9.9].map((wf) => (
              <button
                key={wf}
                onClick={() => {
                  setSelectedWarpFactor(wf);
                  onSetWarpFactor?.(wf);
                }}
                className={`px-2 py-0.5 text-[10px] font-mono-nums rounded border transition-colors ${
                  Math.abs(selectedWarpFactor - wf) < 0.15
                    ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-sm shadow-sky-500/40'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
                title={`Cruise at Warp Factor ${wf}`}
              >
                {wf === 9.9 ? 'MAX 9.9' : `W${wf}`}
              </button>
            ))}
          </div>
        </div>

        {/* Set Course & Engage Button */}
        <button
          onClick={handleSetCourse}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-trek font-bold text-xs uppercase tracking-widest rounded-lg shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
        >
          <Navigation className="w-4 h-4" />
          <span>Lay in Course to {activePlanet?.name || currentSystem.name} & Engage!</span>
        </button>
      </div>

      {/* Planetary Bodies List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-trek uppercase text-slate-400 pb-1">
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3 text-sky-400" /> System Bodies & Orbital Targets
          </span>
          <span className="font-mono-nums text-slate-500">{currentSystem.planets.length} objects</span>
        </div>

        {currentSystem.planets.map((planet) => {
          const isTarget = (activePlanet?.id === planet.id);
          return (
            <div
              key={planet.id}
              onClick={() => setSelectedPlanetId(planet.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                isTarget
                  ? 'bg-sky-500/20 border-sky-400/80 shadow-md shadow-sky-500/20'
                  : 'bg-slate-900/50 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{ backgroundColor: planet.textureColor }}
                  />
                  <h4 className="text-xs font-trek font-bold text-slate-100">
                    {planet.name}
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono-nums text-sky-300 uppercase">
                  <span>{planet.type.replace('_', ' ')}</span>
                  {planet.hasRings && <span className="text-amber-400">· Rings</span>}
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-snug line-clamp-2">
                {planet.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer Instructions */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] font-mono-nums text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Warp Navigation Auto-Pilot Ready
        </span>
        <span className="text-slate-500">Autonomous Orbit Lock</span>
      </div>
    </div>
  );
};
