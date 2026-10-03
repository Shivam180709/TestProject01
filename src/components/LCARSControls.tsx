import React, { useState } from 'react';
import { CameraViewMode, ShipState } from '../types/simulation';
import {
  Video,
  Zap,
  Crosshair,
  Shield,
  Rocket,
  Compass,
  ChevronUp,
  ShieldAlert,
  Target,
  Radio,
} from 'lucide-react';

interface LCARSControlsProps {
  shipState: ShipState | null;
  currentView: CameraViewMode;
  onSetCameraView: (view: CameraViewMode) => void;
  onSetThrottle: (throttle: number) => void;
  onSetWarpFactor: (factor: number) => void;
  onToggleWarp: () => void;
  onStartPhaser: () => void;
  onStopPhaser: () => void;
  onFireTorpedo: () => void;
  onToggleShields: () => void;
  onToggleAutoPilot: () => void;
  onOpenNavigation?: () => void;
  onTargetHostile?: () => void;
  onEnterWarZone?: () => void;
  onSummonHostiles?: () => void;
  combatAssist?: boolean;
  onToggleCombatAssist?: () => void;
  onTriggerBoost?: () => void;
  onToggleTacticalLog?: () => void;
  onToggleTacticalScanner?: () => void;
  isTacticalScannerOpen?: boolean;
}

export const LCARSControls: React.FC<LCARSControlsProps> = ({
  shipState,
  currentView,
  onSetCameraView,
  onSetThrottle,
  onSetWarpFactor,
  onToggleWarp,
  onStartPhaser,
  onStopPhaser,
  onFireTorpedo,
  onToggleShields,
  onToggleAutoPilot,
  onOpenNavigation,
  onTargetHostile,
  onEnterWarZone,
  onSummonHostiles,
  combatAssist = true,
  onToggleCombatAssist,
  onTriggerBoost,
  onToggleTacticalLog,
  onToggleTacticalScanner,
  isTacticalScannerOpen = true,
}) => {
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState<boolean>(false);

  const cameraModes: { id: CameraViewMode; label: string; icon: string }[] = [
    { id: 'chase', label: 'Chase View', icon: '🚀' },
    { id: 'interior_bridge', label: 'Bridge Interior (3D)', icon: '🏛️' },
    { id: 'bridge', label: 'Helm Viewscreen', icon: '👁️' },
    { id: 'cinematic', label: 'Cinematic Flyby', icon: '🎬' },
    { id: 'saucer', label: 'Saucer Deck 1', icon: '🛸' },
    { id: 'nacelle', label: 'Warp Nacelle', icon: '⚡' },
    { id: 'deflector', label: 'Deflector Bow', icon: '🌀' },
    { id: 'orbit', label: '360° Free Orbit', icon: '🔄' },
  ];

  const currentCam = cameraModes.find((c) => c.id === currentView) || cameraModes[0];
  const isWarping = shipState?.isWarping ?? false;
  const currentWarp = shipState?.warpFactor ?? 4.0;
  const throttle = shipState?.throttlePercent ?? 25;
  const shieldsRaised = shipState?.shieldsRaised ?? true;

  return (
    <div className="relative z-30 flex flex-col p-2.5 bg-slate-950/90 backdrop-blur-xl border-t border-amber-500/40 text-slate-100 select-none shadow-2xl">
      {/* Floating Camera POV Pop-up Menu */}
      {isCameraMenuOpen && (
        <div className="absolute bottom-16 left-4 z-50 bg-slate-950 border border-amber-500/50 rounded-xl p-1.5 shadow-2xl shadow-black/80 flex flex-col gap-1 min-w-[200px]">
          <div className="px-2 py-1 text-[10px] font-trek text-amber-400 uppercase tracking-wider border-b border-slate-800">
            Select Camera Perspective
          </div>
          {cameraModes.map((cam) => (
            <button
              key={cam.id}
              onClick={() => {
                onSetCameraView(cam.id);
                setIsCameraMenuOpen(false);
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors font-medium text-left ${
                currentView === cam.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{cam.icon}</span>
              <span>{cam.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Streamlined Single-Tier LCARS Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Section: Camera Popup Button & Flight Assist */}
        <div className="flex items-center gap-2">
          {/* Camera POV Dropdown Button */}
          <button
            onClick={() => setIsCameraMenuOpen(!isCameraMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-amber-500/40 text-xs font-medium text-amber-300 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
            title="Switch Camera POV"
          >
            <Video className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-trek uppercase tracking-wide">{currentCam.label}</span>
            <ChevronUp className="w-3 h-3 text-slate-400" />
          </button>

          {/* Combat Auto-Aim / Tracking Assist */}
          {onToggleCombatAssist && (
            <button
              onClick={onToggleCombatAssist}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-trek uppercase transition-colors ${
                combatAssist
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Automatically guides ship and phaser weapons towards locked hostile"
            >
              <Target className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dogfight Assist: {combatAssist ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>

        {/* Center Section: Compact Impulse & Warp Controls */}
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          {/* Impulse Presets */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-trek text-amber-400 mr-1 hidden md:inline">Impulse:</span>
            {[
              { label: 'Stop', val: 0 },
              { label: '1/4', val: 25 },
              { label: '1/2', val: 50 },
              { label: 'Full', val: 100 },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => onSetThrottle(p.val)}
                className={`px-2 py-0.5 text-[10px] font-mono-nums rounded border transition-colors ${
                  throttle === p.val
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="w-[1px] h-4 bg-slate-800 mx-1" />

          {/* Small Warp Factor Selector */}
          <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-md border border-sky-500/30">
            <span className="text-[10px] font-trek text-sky-400 uppercase tracking-wider hidden sm:inline">Factor:</span>
            <div className="hidden sm:flex items-center gap-0.5">
              {[
                { f: 1, label: '1' },
                { f: 2, label: '2' },
                { f: 4, label: '4' },
                { f: 6, label: '6' },
                { f: 8, label: '8' },
                { f: 9, label: '9' },
                { f: 9.9, label: '9.9' },
              ].map(({ f, label }) => {
                const isSelected = Math.abs(currentWarp - f) < 0.15;
                return (
                  <button
                    key={f}
                    onClick={() => onSetWarpFactor(f)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono-nums rounded border transition-colors ${
                      isSelected
                        ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-sm shadow-sky-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-sky-200'
                    }`}
                    title={`Set Warp Factor ${f}${f === 9.9 ? ' (Maximum Cruising Velocity)' : ''}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Steppers for fine tuning */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onSetWarpFactor(Math.max(1.0, Math.round((currentWarp - 0.5) * 10) / 10))}
                className="w-4 h-4 flex items-center justify-center text-[10px] font-mono-nums text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded border border-slate-800"
                title="Decrease Warp Factor (-0.5)"
              >
                -
              </button>
              <span className="sm:hidden text-[10px] font-mono-nums text-sky-300 font-bold px-1">
                W{currentWarp.toFixed(1)}
              </span>
              <button
                onClick={() => onSetWarpFactor(Math.min(9.9, Math.round((currentWarp + 0.5) * 10) / 10))}
                className="w-4 h-4 flex items-center justify-center text-[10px] font-mono-nums text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded border border-slate-800"
                title="Increase Warp Factor (+0.5)"
              >
                +
              </button>
            </div>
          </div>

          {/* Warp Engage Toggle Button */}
          <button
            onClick={onToggleWarp}
            className={`px-3 py-1 rounded text-xs font-trek uppercase tracking-wider font-bold transition-all shadow-md flex items-center gap-1.5 ${
              isWarping
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/40 animate-pulse'
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-500/30'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>{isWarping ? 'DROP WARP' : `WARP ${currentWarp.toFixed(1)}`}</span>
          </button>

          {onOpenNavigation && (
            <button
              onClick={onOpenNavigation}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded text-xs font-trek uppercase border border-sky-500/30 transition-colors"
              title="Set course to any solar system"
            >
              Set Course
            </button>
          )}
        </div>

        {/* Right Section: Compact Tactical Weapons & War Zone */}
        <div className="flex items-center gap-1.5">
          {/* Fire Phasers */}
          <button
            onMouseDown={onStartPhaser}
            onMouseUp={onStopPhaser}
            onTouchStart={onStartPhaser}
            onTouchEnd={onStopPhaser}
            className={`py-1.5 px-3 rounded-lg text-xs font-trek uppercase tracking-wider font-bold border transition-colors flex items-center gap-1.5 ${
              shipState?.isFiringPhasers
                ? 'bg-orange-600 text-white border-orange-400 shadow-md shadow-orange-500/50'
                : 'bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30'
            }`}
            title="Fire continuous phasers (Spacebar)"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Phasers</span>
          </button>

          {/* Fire Torpedo */}
          <button
            onClick={onFireTorpedo}
            disabled={(shipState?.torpedoCount ?? 0) <= 0}
            className="py-1.5 px-3 rounded-lg text-xs font-trek uppercase tracking-wider font-bold border transition-colors bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30 disabled:opacity-40 flex items-center gap-1.5"
            title="Launch photon torpedo (T key)"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Torpedo ({shipState?.torpedoCount ?? 0})</span>
          </button>

          {/* Target Hostile Lock */}
          {onTargetHostile && (
            <button
              onClick={onTargetHostile}
              className="py-1.5 px-2.5 rounded-lg text-xs font-trek uppercase bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/50 transition-colors flex items-center gap-1"
              title="Target Next Hostile Ship (Tab)"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Target (Tab)</span>
            </button>
          )}

          {/* Shields Toggle */}
          <button
            onClick={onToggleShields}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-trek uppercase font-semibold border transition-colors flex items-center gap-1 ${
              shieldsRaised
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle Deflector Shields"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{shieldsRaised ? 'Shields UP' : 'Shields DN'}</span>
          </button>

          {/* Evasive Thruster Boost */}
          {onTriggerBoost && (
            <button
              onClick={onTriggerBoost}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-trek uppercase font-bold border transition-all flex items-center gap-1 ${
                shipState?.isBoostActive
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/50 animate-pulse'
                  : (shipState?.boostCharge ?? 100) >= 100
                  ? 'bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-900 text-slate-500 border-slate-800 opacity-60'
              }`}
              title="Engage emergency evasive thruster boost [Shift Key]"
            >
              <span>⚡</span>
              <span className="hidden sm:inline">Boost</span>
            </button>
          )}

          {/* Tactical Log Overlay Toggle */}
          {onToggleTacticalLog && (
            <button
              onClick={onToggleTacticalLog}
              className="py-1.5 px-2.5 rounded-lg text-xs font-trek uppercase bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 transition-colors flex items-center gap-1"
              title="Toggle Tactical Telemetry Event Log Overlay [L Key]"
            >
              <span>📜</span>
              <span className="hidden sm:inline">Log</span>
            </button>
          )}

          {/* Tactical Radar Scanner Toggle */}
          {onToggleTacticalScanner && (
            <button
              onClick={onToggleTacticalScanner}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-trek uppercase border transition-colors flex items-center gap-1 ${
                isTacticalScannerOpen
                  ? 'bg-sky-500/25 hover:bg-sky-500/40 text-sky-300 border-sky-400'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
              title="Toggle Tactical Astrometric Radar Scanner [R Key]"
            >
              <Radio className="w-3 h-3 text-sky-400" />
              <span className="hidden sm:inline">Scanner</span>
            </button>
          )}

          {/* War Zone Jump & Hostile Reinforcements */}
          <div className="flex items-center gap-1">
            {onEnterWarZone && (
              <button
                onClick={onEnterWarZone}
                className="py-1.5 px-2.5 rounded-lg text-xs font-trek uppercase bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 transition-colors font-bold whitespace-nowrap"
                title="Jump directly to Klingon / Romulan Combat War Zone"
              >
                ⚔️ War Zone
              </button>
            )}

            {onSummonHostiles && (
              <button
                onClick={onSummonHostiles}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-trek uppercase border transition-colors font-bold whitespace-nowrap ${
                  shipState?.combatWaveState?.status === 'cleared'
                    ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border-emerald-500/50'
                    : 'bg-red-600/30 hover:bg-red-600/50 text-red-200 border-red-500/50'
                }`}
                title={
                  shipState?.combatWaveState?.status === 'cleared'
                    ? `Voluntarily initiate Wave ${(shipState.combatWaveState?.level ?? 1) + 1}`
                    : 'Call hostile battlegroup wave'
                }
              >
                {shipState?.combatWaveState?.status === 'cleared'
                  ? `⚔️ Wave ${(shipState.combatWaveState?.level ?? 1) + 1}`
                  : '+ Wave'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
