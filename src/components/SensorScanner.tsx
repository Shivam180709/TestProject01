import React from 'react';
import { CelestialTarget } from '../types/simulation';
import { X, Target, Radio, Compass, AlertCircle } from 'lucide-react';

interface SensorScannerProps {
  isOpen: boolean;
  onClose: () => void;
  targets: CelestialTarget[];
  selectedTargetId: string | null;
  onSelectTarget: (id: string) => void;
  autoPilot: boolean;
  onToggleAutoPilot: () => void;
}

export const SensorScanner: React.FC<SensorScannerProps> = ({
  isOpen,
  onClose,
  targets,
  selectedTargetId,
  onSelectTarget,
  autoPilot,
  onToggleAutoPilot,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-30 w-full sm:w-[420px] bg-slate-950/95 backdrop-blur-xl border-r border-sky-500/40 text-slate-100 shadow-2xl flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-6 bg-sky-400 rounded-sm" />
          <div>
            <h2 className="text-sm font-trek uppercase tracking-wider font-bold text-sky-400">
              Long-Range Subspace Sensors
            </h2>
            <p className="text-xs text-slate-400 font-mono-nums">Sector 001 · Local Grid</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close Sensors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sensor sweep visual banner */}
      <div className="px-4 py-2.5 bg-sky-950/40 border-b border-sky-900/50 flex items-center justify-between text-xs font-mono-nums">
        <div className="flex items-center gap-2 text-sky-300">
          <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
          <span>Active Sensor Sweep Active</span>
        </div>
        <span className="text-slate-400">{targets.length} Contacts</span>
      </div>

      {/* Target List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {targets.map((target) => {
          const isSelected = target.id === selectedTargetId;
          return (
            <div
              key={target.id}
              onClick={() => onSelectTarget(target.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-sky-500/15 border-sky-400/80 shadow-md shadow-sky-500/20'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono-nums text-slate-400">
                    <span className="uppercase text-sky-400">{target.type.replace('_', ' ')}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-400 font-semibold">{target.distance} km</span>
                  </div>
                  <h3 className="text-sm font-trek font-bold text-white mt-0.5">
                    {target.name}
                  </h3>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTarget(target.id);
                  }}
                  className={`p-1.5 rounded transition-colors ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Lock Navigational Vector"
                >
                  <Target className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
                {target.description}
              </p>

              {isSelected && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAutoPilot();
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded text-xs font-trek uppercase tracking-wide font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      autoPilot
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-sky-600 hover:bg-sky-500 text-white'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>{autoPilot ? 'Auto-Pilot Active' : 'Engage Auto-Pilot'}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer warning */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] font-mono-nums text-slate-400 flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        <span>Weapons system auto-slaves targeting to locked contact.</span>
      </div>
    </div>
  );
};
