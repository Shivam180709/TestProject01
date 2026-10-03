import React, { useState, useEffect } from 'react';
import { AlertLevel, ShipState } from '../types/simulation';
import { soundEffects } from '../audio/soundEffects';
import { Shield, AlertTriangle, Volume2, VolumeX, Eye, HelpCircle, Compass, Radio } from 'lucide-react';

interface LCARSHeaderProps {
  shipState: ShipState | null;
  onSetAlert: (level: AlertLevel) => void;
  onToggleInspection: () => void;
  onToggleScanner: () => void;
  onToggleNavigation: () => void;
  onToggleHelp: () => void;
  onToggleLog?: () => void;
  onToggleTacticalScanner?: () => void;
  isInspectionOpen: boolean;
  isScannerOpen: boolean;
  isNavigationOpen: boolean;
  isLogOpen?: boolean;
  isTacticalScannerOpen?: boolean;
  logCount?: number;
}

export const LCARSHeader: React.FC<LCARSHeaderProps> = ({
  shipState,
  onSetAlert,
  onToggleInspection,
  onToggleScanner,
  onToggleNavigation,
  onToggleHelp,
  onToggleLog,
  onToggleTacticalScanner,
  isInspectionOpen,
  isScannerOpen,
  isNavigationOpen,
  isLogOpen,
  isTacticalScannerOpen = true,
  logCount,
}) => {
  const [stardate, setStardate] = useState('7412.4');
  const [isMuted, setIsMuted] = useState(soundEffects.getMuted());

  useEffect(() => {
    // Generate authentic Trek stardate based on real time
    const updateStardate = () => {
      const now = new Date();
      const year = now.getFullYear();
      const startOfYear = new Date(year, 0, 1).getTime();
      const fraction = (now.getTime() - startOfYear) / (365.25 * 24 * 3600 * 1000);
      const sd = ((year - 2000) * 100 + fraction * 1000).toFixed(1);
      setStardate(sd);
    };
    updateStardate();
    const interval = setInterval(updateStardate, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const nextMuted = !isMuted;
    soundEffects.setMuted(nextMuted);
    setIsMuted(nextMuted);
    if (!nextMuted) {
      soundEffects.playLcarsBeep(880, 0.05);
    }
  };

  const alertLevel = shipState?.alertLevel || 'green';

  return (
    <header className="relative z-20 flex items-center justify-between px-4 py-2 bg-slate-950/85 backdrop-blur-md border-b border-amber-500/30 text-slate-100 select-none">
      {/* Zone 1: Starfleet Flagship Brand */}
      <div className="flex items-center gap-3">
        {/* LCARS Elbow Accent */}
        <div className="hidden sm:flex items-center">
          <div className="w-10 h-7 rounded-tl-xl bg-amber-500 flex items-center justify-center text-slate-950 font-trek font-bold text-xs">
            1701
          </div>
          <div className="w-3 h-7 bg-amber-400 border-l border-slate-950" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-trek font-bold text-base tracking-wider text-amber-400 uppercase">
              USS Enterprise
            </h1>
            <span className="text-xs font-mono-nums text-slate-400">NCC-1701</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>Constitution Class Refit</span>
            <span aria-hidden="true">·</span>
            <span>Stardate {stardate}</span>
          </div>
        </div>
      </div>

      {/* Zone 2: Ship Tactical Status & Alert Level Selector */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Alert Level Segmented Controls */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
          <button
            onClick={() => onSetAlert('green')}
            className={`px-2.5 py-1 text-xs font-trek uppercase rounded transition-colors ${
              alertLevel === 'green'
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
            title="Condition Green - Standard Cruise"
          >
            Green
          </button>
          <button
            onClick={() => onSetAlert('yellow')}
            className={`px-2.5 py-1 text-xs font-trek uppercase rounded transition-colors ${
              alertLevel === 'yellow'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-amber-400'
            }`}
            title="Condition Yellow - Standby Alert"
          >
            Yellow
          </button>
          <button
            onClick={() => onSetAlert('red')}
            className={`px-2.5 py-1 text-xs font-trek uppercase rounded transition-colors flex items-center gap-1 ${
              alertLevel === 'red'
                ? 'bg-red-600 text-white font-semibold animate-pulse shadow-sm shadow-red-500/50'
                : 'text-slate-400 hover:text-red-400'
            }`}
            title="Condition Red - Battle Stations!"
          >
            <AlertTriangle className="w-3 h-3" />
            Red
          </button>
        </div>

        {/* Quick telemetry indicators */}
        <div className="hidden md:flex items-center gap-3 text-xs font-mono-nums px-3 py-1 bg-slate-900/80 rounded border border-slate-800">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Shields:</span>
            <span className={shipState?.shieldsRaised ? 'text-sky-300 font-semibold' : 'text-slate-500'}>
              {shipState?.shieldsRaised ? `${shipState?.shieldIntegrity}%` : 'DOWN'}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Hull:</span>
            <span className="text-emerald-400 font-semibold">{shipState?.hullIntegrity}%</span>
          </div>
        </div>
      </div>

      {/* Zone 3: Modal Actions & Sound Controls */}
      <div className="flex items-center gap-2">
        {/* Set Course / Star Chart */}
        <button
          onClick={onToggleNavigation}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
            isNavigationOpen
              ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-sm shadow-sky-500/30'
              : 'bg-sky-500/15 text-sky-300 border-sky-500/40 hover:bg-sky-500/25'
          }`}
          title="Stellar Cartography & Solar System Course Plotter"
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="font-trek uppercase tracking-wide">Set Course</span>
        </button>

        {/* Long Range Sensors */}
        <button
          onClick={onToggleScanner}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors border ${
            isScannerOpen
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
          title="Long Range Subspace Sensors"
        >
          <span className="hidden sm:inline">Sensors</span>
        </button>

        {/* Tactical Scanner Toggle */}
        {onToggleTacticalScanner && (
          <button
            onClick={onToggleTacticalScanner}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors border ${
              isTacticalScannerOpen
                ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-sm shadow-sky-500/30'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
            title="Toggle Astrometric Tactical Scanner [R]"
          >
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline font-trek uppercase">Radar [R]</span>
          </button>
        )}

        {/* Complete Ship Inspection */}
        <button
          onClick={onToggleInspection}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
            isInspectionOpen
              ? 'bg-amber-500 text-slate-950 font-semibold border-amber-400 shadow-sm shadow-amber-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
          }`}
          title="Ship Inspection: Decks & Subsystems"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="font-trek uppercase tracking-wide">Inspect Ship</span>
        </button>

        {/* Tactical Combat Log Console */}
        {onToggleLog && (
          <button
            onClick={onToggleLog}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors border ${
              isLogOpen
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm shadow-amber-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
            }`}
            title="Tactical Combat Telemetry Log Console"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-trek uppercase tracking-wide">Tactical Log</span>
            {logCount && logCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold font-mono">
                {logCount}
              </span>
            ) : null}
          </button>
        )}

        {/* Audio Mute Toggle */}
        <button
          onClick={toggleSound}
          className="p-1.5 bg-slate-900 border border-slate-800 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Help & Controls Keymap */}
        <button
          onClick={onToggleHelp}
          className="p-1.5 bg-slate-900 border border-slate-800 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Flight Manual & Keyboard Shortcuts"
          aria-label="Help"
        >
          <HelpCircle className="w-4 h-4 text-amber-400" />
        </button>
      </div>
    </header>
  );
};
