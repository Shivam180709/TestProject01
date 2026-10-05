import React, { useEffect } from 'react';
import { DefeatStats, PlayerProgression } from '../types/simulation';
import { AlertTriangle, RotateCcw, ShieldAlert, Award, Skull, Flame, Activity } from 'lucide-react';

interface EnterpriseDestructionModalProps {
  defeatStats?: DefeatStats;
  progression?: PlayerProgression;
  onRestart: (retryCurrentWave?: boolean) => void;
}

export const EnterpriseDestructionModal: React.FC<EnterpriseDestructionModalProps> = ({
  defeatStats,
  progression,
  onRestart,
}) => {
  // Listen for Enter or R key to immediately restart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
        onRestart(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRestart]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-red-600 rounded-2xl shadow-2xl shadow-red-950/80 overflow-hidden flex flex-col font-mono text-slate-200">
        
        {/* LCARS Top Red Alert Bar */}
        <div className="bg-red-600 px-6 py-3 flex items-center justify-between text-slate-950 font-bold tracking-widest font-trek uppercase">
          <div className="flex items-center gap-2 text-sm sm:text-base">
            <ShieldAlert className="w-5 h-5 animate-pulse text-white" />
            <span className="text-white">STARFLEET COMMAND // CASUALTY DISPATCH 10-A</span>
          </div>
          <span className="text-xs bg-slate-950/30 text-white px-2 py-0.5 rounded">CODE RED</span>
        </div>

        {/* Hero Alert Banner */}
        <div className="p-6 bg-gradient-to-b from-red-950/50 via-slate-900 to-slate-900 border-b border-red-900/40">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-900/40 border border-red-500 rounded-xl text-red-400">
              <Flame className="w-9 h-9 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-trek text-red-400 tracking-wider uppercase">
                USS Enterprise NCC-1701 Destroyed
              </h2>
              <p className="text-xs sm:text-sm text-red-300/80 font-mono mt-0.5">
                Catastrophic antimatter containment breach sustained in hostile action.
              </p>
            </div>
          </div>
        </div>

        {/* Battle Debrief Telemetry */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Officer Rank</span>
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1 mt-0.5 font-trek">
                <Award className="w-3.5 h-3.5" />
                {progression ? `${progression.rank} (Lvl ${progression.level})` : 'Commander'}
              </span>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Waves Survived</span>
              <span className="text-sm font-bold text-sky-400 mt-0.5 block font-mono-nums">
                Wave {defeatStats?.waveReached || 1}
              </span>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Hostiles Downed</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-0.5 font-mono-nums">
                <Skull className="w-3.5 h-3.5" />
                {defeatStats?.totalKills ?? progression?.totalEnemiesDestroyed ?? 0}
              </span>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Combat Rating</span>
              <span className="text-sm font-bold text-amber-300 mt-0.5 block font-mono-nums">
                {defeatStats?.combatRating || 100} ({defeatStats?.skillTier || 'Cadet'})
              </span>
            </div>
          </div>

          {/* Enemy Breakdown by Type */}
          <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 pb-1.5 font-trek uppercase tracking-wider">
              <span>Hostile Neutralization Breakdown</span>
              <span>Total Debris Field</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div className="text-center p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Scouts / Interceptors</span>
                <span className="text-base font-bold text-sky-400 font-mono-nums">
                  {defeatStats?.scoutsDestroyed ?? progression?.scoutsDestroyed ?? 0}
                </span>
              </div>
              <div className="text-center p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Heavy Cruisers / Warbirds</span>
                <span className="text-base font-bold text-orange-400 font-mono-nums">
                  {defeatStats?.cruisersDestroyed ?? progression?.cruisersDestroyed ?? 0}
                </span>
              </div>
              <div className="text-center p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Mothership Flagships</span>
                <span className="text-base font-bold text-red-400 font-mono-nums">
                  {defeatStats?.mothershipsDestroyed ?? progression?.mothershipsDestroyed ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Location & Log summary */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 bg-slate-950/50 rounded-lg text-xs text-slate-400 border border-slate-800/50">
            <span>Location: <strong className="text-slate-200">{defeatStats?.systemName || 'Sector 001'}</strong></span>
            <span>Torpedo Accuracy: <strong className="text-emerald-400 font-mono-nums">{defeatStats?.accuracyPercent || 80}%</strong></span>
            <span>Stardate: <strong className="text-amber-400 font-mono-nums">{defeatStats?.stardate || '45233.1'}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => onRestart(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold font-trek uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Wave {defeatStats?.waveReached || 1}</span>
          </button>

          <button
            onClick={() => onRestart(false)}
            className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs font-trek uppercase tracking-wider transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
            title="Reset Enterprise to 100% capacity and reset all XP, destroyed records, and ratings to starting baseline"
          >
            <Activity className="w-4 h-4" />
            <span>Restart & Clear All Progress [ENTER]</span>
          </button>
        </div>

      </div>
    </div>
  );
};
