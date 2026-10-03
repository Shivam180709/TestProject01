import React, { useState } from 'react';
import { EnemyShipState, PlanetData, ShipState } from '../types/simulation';
import { Radio, Crosshair, ChevronDown, ChevronUp, X, Eye, AlertTriangle, ShieldAlert } from 'lucide-react';

interface TacticalRadarProps {
  shipState: ShipState | null;
  enemies: EnemyShipState[];
  planets: PlanetData[];
  onLockEnemy: (id: string) => void;
  onSelectPlanet: (id: string) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

export const TacticalRadar: React.FC<TacticalRadarProps> = ({
  shipState,
  enemies,
  planets,
  onLockEnemy,
  onSelectPlanet,
  isOpen = true,
  onToggleOpen,
}) => {
  const [rangeScale, setRangeScale] = useState<number>(1800); // Radar range in km
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  if (!shipState) return null;

  const radarSize = 180;
  const center = radarSize / 2;
  const radius = center - 8;

  // Convert 3D world coordinates to 2D radar coordinates (X and Z relative to ship)
  const shipX = shipState.position.x;
  const shipZ = shipState.position.z;
  const shipHeading = shipState.rotation.yaw || 0;

  const projectToRadar = (worldX: number, worldZ: number) => {
    const dx = worldX - shipX;
    const dz = worldZ - shipZ;

    // Rotate relative to ship heading so top is always ship's forward
    const cos = Math.cos(shipHeading);
    const sin = Math.sin(shipHeading);
    const rx = dx * cos - dz * sin;
    const rz = dx * sin + dz * cos;

    const scale = radius / rangeScale;
    const screenX = center + rx * scale;
    const screenY = center + rz * scale; // in 3D Z forward is negative

    const dist = Math.sqrt(dx * dx + dz * dz);
    const isInside = dist <= rangeScale;

    return { screenX, screenY, isInside, dist: Math.round(dist) };
  };

  const aliveEnemies = enemies.filter((e) => e.isAlive);
  const wave = shipState.combatWaveState;

  // If dismissed or toggled off by user, show clean floating mini pill that won't block any view
  if (!isOpen || isDismissed) {
    return (
      <div className="absolute top-28 right-4 z-20 pointer-events-auto select-none">
        <button
          onClick={() => {
            setIsDismissed(false);
            onToggleOpen?.();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-trek uppercase tracking-wide backdrop-blur-md shadow-lg transition-all ${
            shipState.isUnderAttack || shipState.hasIncomingTorpedo
              ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse'
              : aliveEnemies.length > 0
              ? 'bg-amber-950/90 border-amber-500/70 text-amber-200'
              : 'bg-slate-950/85 border-sky-500/40 text-sky-300 hover:bg-slate-900'
          }`}
          title="Open Tactical Scanner [R]"
        >
          <Radio className="w-3.5 h-3.5 animate-pulse text-sky-400" />
          <span>Scanner</span>
          {aliveEnemies.length > 0 && (
            <span className="px-1.5 py-0.2 bg-red-600 text-white rounded text-[10px] font-mono-nums font-bold">
              {aliveEnemies.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-28 right-4 z-20 flex flex-col items-end select-none pointer-events-auto max-w-[215px]">
      {/* Radar Container */}
      <div className="bg-slate-950/90 backdrop-blur-md rounded-xl border border-sky-500/40 p-2 shadow-2xl shadow-sky-950/50 flex flex-col items-center w-full">
        {/* Radar Header */}
        <div className="w-full flex items-center justify-between pb-1 mb-1 border-b border-slate-800 text-[11px] font-trek text-sky-400 uppercase tracking-wider">
          <div className="flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="font-bold">Tactical Scanner</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Range Toggle */}
            <select
              value={rangeScale}
              onChange={(e) => setRangeScale(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-[9px] font-mono-nums text-slate-300 focus:outline-none"
              title="Scanner Range"
            >
              <option value={800}>800km</option>
              <option value={1800}>1.8k</option>
              <option value={5000}>5.0k</option>
            </select>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-0.5 hover:text-white text-slate-400"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>

            <button
              onClick={() => setIsDismissed(true)}
              className="p-0.5 hover:text-red-400 text-slate-400"
              title="Hide Scanner (Click or press R to restore)"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Embedded Scanner Alert Banner (Never Miss an Alert while watching radar!) */}
        {shipState.hasIncomingTorpedo ? (
          <div className="w-full py-0.5 px-1.5 mb-1 bg-red-600 text-white rounded text-[9px] font-trek font-bold uppercase tracking-wider text-center animate-bounce flex items-center justify-center gap-1 shadow-sm">
            <AlertTriangle className="w-3 h-3 animate-ping" />
            <span>CRITICAL: INCOMING TORPEDO</span>
          </div>
        ) : shipState.isUnderAttack ? (
          <div className="w-full py-0.5 px-1.5 mb-1 bg-red-950 border border-red-500 text-red-200 rounded text-[9px] font-trek font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span>UNDER ATTACK ({shipState.shieldIntegrity}%)</span>
          </div>
        ) : wave && wave.status === 'active' ? (
          <div className="w-full py-0.5 px-1.5 mb-1 bg-amber-950/80 border border-amber-500/40 text-amber-300 rounded text-[9px] font-mono-nums flex items-center justify-between">
            <span className="font-trek uppercase font-bold text-amber-400">LVL {wave.level}</span>
            <span className="text-red-400 font-semibold">{aliveEnemies.length} Hostiles</span>
          </div>
        ) : wave && wave.status === 'cleared' ? (
          <div className="w-full py-0.5 px-1.5 mb-1 bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 rounded text-[9px] font-trek font-bold uppercase text-center">
            <span>SECTOR SECURED</span>
          </div>
        ) : null}

        {!isCollapsed && (
          <>
            {/* 2D Circular Radar Display */}
            <div
              className="relative rounded-full border border-sky-500/50 bg-slate-950/90 overflow-hidden shadow-inner cursor-crosshair"
              style={{ width: radarSize, height: radarSize }}
            >
              {/* Concentric Range Rings */}
              <div className="absolute inset-[25%] rounded-full border border-sky-500/20 pointer-events-none" />
              <div className="absolute inset-[50%] rounded-full border border-sky-500/30 pointer-events-none" />
              <div className="absolute inset-[75%] rounded-full border border-sky-500/20 pointer-events-none" />

              {/* Crosshair Axes */}
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-sky-500/20 pointer-events-none" />
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-sky-500/20 pointer-events-none" />

              {/* Sweeping Radar Scanner Line */}
              <div className="absolute inset-0 rounded-full border-t border-sky-400/40 animate-spin pointer-events-none opacity-40 [animation-duration:4s]" />

              {/* Center: USS Enterprise Player Icon */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
                style={{ left: center, top: center }}
              >
                <div className="w-3 h-3 border-l-2 border-r-2 border-b-2 border-sky-400 rotate-180 flex items-center justify-center">
                  <div className="w-1 h-1 bg-sky-300 rounded-full" />
                </div>
              </div>

              {/* Celestial Planets / Starbases Blips */}
              {planets.map((planet) => {
                const { screenX, screenY, isInside, dist } = projectToRadar(
                  planet.position[0],
                  planet.position[2]
                );
                if (!isInside) return null;

                const isTarget = shipState.selectedTargetId === planet.id;

                return (
                  <button
                    key={planet.id}
                    onClick={() => onSelectPlanet(planet.id)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group z-0 p-1"
                    style={{ left: screenX, top: screenY }}
                    title={`${planet.name} (${dist} km)`}
                  >
                    <div
                      className={`rounded-full transition-transform ${
                        isTarget
                          ? 'w-3 h-3 ring-2 ring-amber-400'
                          : 'w-2 h-2 group-hover:scale-125'
                      }`}
                      style={{ backgroundColor: planet.textureColor || '#38bdf8' }}
                    />
                  </button>
                );
              })}

              {/* Hostile Enemy Ships Blips */}
              {enemies.map((enemy) => {
                if (!enemy.isAlive) return null;
                const { screenX, screenY, isInside, dist } = projectToRadar(
                  enemy.position[0],
                  enemy.position[2]
                );
                if (!isInside) return null;

                const isLocked = shipState.lockedEnemy?.id === enemy.id;

                return (
                  <button
                    key={enemy.id}
                    onClick={() => onLockEnemy(enemy.id)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 p-1"
                    style={{ left: screenX, top: screenY }}
                    title={`${enemy.name} [${enemy.faction.toUpperCase()}] · ${dist} km`}
                  >
                    <div
                      className={`flex items-center justify-center transition-all ${
                        isLocked
                          ? 'w-4 h-4 bg-red-600 rounded-sm ring-2 ring-red-400 animate-pulse'
                          : enemy.isMothership
                          ? 'w-3.5 h-3.5 bg-amber-500 rounded ring-1 ring-amber-300'
                          : 'w-2.5 h-2.5 bg-red-500 rounded-full group-hover:scale-150'
                      }`}
                    >
                      {isLocked && <Crosshair className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Scanner Telemetry Legend & Adaptive Fleet AI Status */}
            <div className="w-full mt-1.5 pt-1 border-t border-slate-800 text-[9px] font-mono-nums flex flex-col gap-1 text-slate-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>{aliveEnemies.length} Hostiles</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>USS 1701</span>
                </span>
              </div>

              {wave?.adaptiveDifficulty && (
                <div className="flex items-center justify-between pt-0.5 text-[8.5px] border-t border-slate-900">
                  <span className="text-amber-400 font-trek uppercase">
                    AI: {wave.adaptiveDifficulty.fleetIntelligenceTier}
                  </span>
                  {wave.adaptiveDifficulty.predictiveLeadAim ? (
                    <span className="text-red-400 font-bold animate-pulse">⚡ LEAD AIM</span>
                  ) : (
                    <span className="text-slate-500 font-mono-nums">x{wave.adaptiveDifficulty.adaptiveDamageMultiplier} DMG</span>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
