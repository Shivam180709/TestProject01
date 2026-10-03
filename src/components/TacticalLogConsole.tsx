import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldAlert,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  Radio,
  Trash2,
  Filter,
  Maximize2,
  Minimize2,
  ChevronRight,
  Shield,
  Crosshair,
  Volume2,
} from 'lucide-react';
import { TacticalLogEvent } from '../types/simulation';
import { soundEffects } from '../audio/soundEffects';

interface TacticalLogConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  logs: TacticalLogEvent[];
  onClearLogs?: () => void;
  isDocked?: boolean;
  onToggleDock?: () => void;
}

export const TacticalLogConsole: React.FC<TacticalLogConsoleProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  isDocked = false,
  onToggleDock,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const logEndRef = useRef<HTMLDivElement>(null);

  // Play subtle chirp on opening
  useEffect(() => {
    if (isOpen) {
      soundEffects.playLcarsBeep(780, 0.05);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesCategory = filterCategory === 'ALL' || log.category === filterCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (category: TacticalLogEvent['category']) => {
    switch (category) {
      case 'WEAPONS':
        return 'text-amber-300 bg-amber-950/80 border-amber-500/50';
      case 'DEFENSE':
        return 'text-sky-300 bg-sky-950/80 border-sky-500/50';
      case 'DAMAGE':
        return 'text-red-300 bg-red-950/80 border-red-500/60';
      case 'SECTOR':
        return 'text-emerald-300 bg-emerald-950/80 border-emerald-500/50';
      case 'NAVIGATION':
        return 'text-purple-300 bg-purple-950/80 border-purple-500/50';
      case 'TACTICAL':
      default:
        return 'text-orange-300 bg-orange-950/70 border-orange-400/40';
    }
  };

  const getTypeIcon = (type: TacticalLogEvent['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />;
      case 'warning':
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />;
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'combat':
        return <Target className="w-3.5 h-3.5 text-red-400" />;
      case 'info':
      default:
        return <Zap className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <div
      className={`fixed z-50 flex flex-col text-slate-100 select-none shadow-2xl transition-all duration-200 ${
        isDocked
          ? 'bottom-20 right-4 w-96 max-h-[500px] rounded-2xl bg-slate-950/92 backdrop-blur-2xl border-2 border-amber-500/50'
          : 'inset-y-0 right-0 w-full sm:w-[490px] bg-slate-950/95 backdrop-blur-2xl border-l-2 border-amber-500/50'
      }`}
    >
      {/* LCARS Main Header Bar */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-8 bg-amber-500 rounded-sm shadow-sm shadow-amber-500/50" />
          <div>
            <h2 className="text-sm font-trek uppercase tracking-wider font-bold text-amber-400 flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
              Tactical Combat Log Overlay
            </h2>
            <p className="text-[11px] text-slate-400 font-mono-nums">
              USS Enterprise · Real-time Subspace Telemetry Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onToggleDock && (
            <button
              onClick={onToggleDock}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
              title={isDocked ? 'Expand to Full Drawer' : 'Dock as In-Flight Widget'}
            >
              {isDocked ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          )}

          {onClearLogs && (
            <button
              onClick={() => {
                onClearLogs();
                soundEffects.playLcarsBeep(520, 0.05);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title="Clear Log History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              soundEffects.playLcarsBeep(440, 0.05);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Tactical Log (Press L)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Category & Search Strip */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Filter className="w-3 h-3 text-slate-500 mr-0.5" />
          {['ALL', 'TACTICAL', 'WEAPONS', 'DEFENSE', 'DAMAGE', 'SECTOR'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setFilterCategory(cat);
                soundEffects.playLcarsBeep(820, 0.03);
              }}
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all whitespace-nowrap ${
                filterCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter telemetry..."
          className="w-28 sm:w-32 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-[10px] text-slate-200 focus:outline-none focus:border-amber-400"
        />
      </div>

      {/* Real-time Event Notification Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono-nums text-xs min-h-[220px]">
        {filteredLogs.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-slate-500">
            <Radio className="w-8 h-8 mb-2 opacity-35 animate-pulse text-amber-500" />
            <span className="font-trek uppercase tracking-wide text-xs">Tactical Event Buffer Nominal</span>
            <span className="text-[11px] text-slate-600 mt-1">Awaiting real-time telemetry events...</span>
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <div
              key={entry.id}
              className={`p-2.5 rounded-lg border transition-all ${
                entry.type === 'critical'
                  ? 'bg-red-950/70 border-red-500/70 text-red-100 shadow-md shadow-red-950/40'
                  : entry.type === 'warning'
                  ? 'bg-amber-950/60 border-amber-500/60 text-amber-100 shadow-md shadow-amber-950/30'
                  : entry.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-100 shadow-md shadow-emerald-950/30'
                  : entry.type === 'combat'
                  ? 'bg-orange-950/50 border-orange-500/50 text-orange-100'
                  : 'bg-slate-900/80 border-slate-800 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 border-b border-slate-800/60 pb-1">
                <div className="flex items-center gap-1.5">
                  {getTypeIcon(entry.type)}
                  <span className={`px-1.5 py-0.2 rounded border font-bold uppercase text-[9px] ${getCategoryColor(entry.category)}`}>
                    {entry.category}
                  </span>
                  <span className="text-slate-500">{entry.stardate}</span>
                </div>
                <span className="text-slate-400">{entry.timestamp}</span>
              </div>

              <div className="font-semibold text-xs leading-snug flex items-center justify-between">
                <span>{entry.message}</span>
                {entry.message.includes('Shields at 40%') && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 text-[9px] font-bold uppercase animate-pulse">
                    ALERT
                  </span>
                )}
                {entry.message.includes('Torpedo Lock Achieved') && (
                  <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 text-[9px] font-bold uppercase animate-pulse">
                    LOCKED
                  </span>
                )}
                {entry.message.includes('Enemy Wave Destroyed') && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 text-[9px] font-bold uppercase">
                    VICTORY
                  </span>
                )}
              </div>

              {entry.details && (
                <div className="text-[11px] text-slate-300 mt-1 pl-2 border-l-2 border-slate-700/80">
                  {entry.details}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>

      {/* LCARS Footer info */}
      <div className="px-4 py-2 bg-slate-900/70 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono-nums">
        <span>Recorded Telemetry: {logs.length} events</span>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-trek uppercase">Key: [L] Toggle Overlay</span>
        </div>
      </div>
    </div>
  );
};

// In-Flight HUD Real-Time Combat Event Ticker (Compact 2-alert stream)
export const TacticalHUDTicker: React.FC<{
  recentLogs: TacticalLogEvent[];
  onOpenFullLog: () => void;
  isScannerOpen?: boolean;
}> = ({ recentLogs, onOpenFullLog, isScannerOpen = false }) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Auto restore display when new critical or combat logs arrive
  useEffect(() => {
    setIsDismissed(false);
  }, [recentLogs.length > 0 ? recentLogs[0].id : null]);

  if (recentLogs.length === 0 || isDismissed) return null;

  const visibleAlerts = recentLogs.slice(0, 2);
  const remainingCount = recentLogs.length - visibleAlerts.length;

  return (
    <div
      className={`absolute top-[215px] z-40 flex flex-col items-start gap-1 pointer-events-auto max-w-[260px] select-none transition-all duration-300 animate-in fade-in slide-in-from-left-4 ${
        isScannerOpen ? 'left-4 sm:left-[436px]' : 'left-4'
      }`}
    >
      {/* Compact Stream Header */}
      <div className="flex items-center justify-between w-full px-2 py-0.5 text-[8.5px] font-trek uppercase tracking-wider text-amber-400 bg-slate-950/90 rounded border border-amber-500/30 backdrop-blur-md">
        <span className="flex items-center gap-1 font-bold">
          <Radio className="w-2.5 h-2.5 animate-pulse text-amber-400" />
          <span>Tactical Alerts ({visibleAlerts.length})</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenFullLog}
            className="hover:text-white text-slate-400 font-mono-nums hover:underline"
            title="Open Full Tactical Log Overlay [L]"
          >
            Log [L]
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="hover:text-red-400 text-slate-500 p-0.5"
            title="Dismiss alerts"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Maximum 2 Compact Alerts on Screen */}
      {visibleAlerts.map((log) => (
        <div
          key={log.id}
          onClick={onOpenFullLog}
          className={`p-1.5 px-2 rounded-lg backdrop-blur-md border shadow-lg cursor-pointer transition-all hover:scale-[1.01] flex items-start gap-1.5 w-full ${
            log.type === 'critical'
              ? 'bg-red-950/95 border-red-500 text-red-100 shadow-red-950/60 animate-pulse'
              : log.type === 'warning'
              ? 'bg-amber-950/95 border-amber-500 text-amber-100 shadow-amber-950/50'
              : log.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-emerald-950/50'
              : 'bg-slate-950/90 border-slate-700 text-slate-200'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {log.type === 'critical' ? (
              <AlertTriangle className="w-3 h-3 text-red-400 animate-ping" />
            ) : log.type === 'success' ? (
              <CheckCircle className="w-3 h-3 text-emerald-400" />
            ) : log.type === 'warning' ? (
              <ShieldAlert className="w-3 h-3 text-amber-400" />
            ) : log.type === 'combat' ? (
              <Target className="w-3 h-3 text-red-400" />
            ) : (
              <Zap className="w-3 h-3 text-sky-400" />
            )}
          </div>

          <div className="flex-1 min-w-0 font-mono-nums text-[10px] leading-tight">
            <div className="flex items-center justify-between text-[8px] uppercase font-bold text-slate-400">
              <span className="text-amber-400">[{log.category}]</span>
              <span>{log.timestamp}</span>
            </div>
            <div className="font-bold text-[10.5px] truncate text-white">{log.message}</div>
            {log.details && (
              <div className="text-[9px] text-slate-300 truncate opacity-85">
                {log.details}
              </div>
            )}
          </div>

          <ChevronRight className="w-3 h-3 text-slate-500 shrink-0 self-center" />
        </div>
      ))}

      {/* Rest of alerts accessible via Log Menu */}
      {remainingCount > 0 && (
        <button
          onClick={onOpenFullLog}
          className="w-full py-0.5 px-2 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-[8.5px] font-trek text-sky-400 uppercase tracking-wider text-center transition-colors flex items-center justify-center gap-1 shadow-sm"
        >
          <span>+{remainingCount} more in Log Menu [L]</span>
          <ChevronRight className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
};
