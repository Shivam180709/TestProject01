import React, { useState } from 'react';
import { ShipSubsystem } from '../types/simulation';
import { X, Eye, ShieldCheck, CheckCircle2, ChevronRight, Layers } from 'lucide-react';

interface ShipInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subsystems: ShipSubsystem[];
  onFocusSubsystem: (id: string) => void;
}

export const ShipInspectionModal: React.FC<ShipInspectionModalProps> = ({
  isOpen,
  onClose,
  subsystems,
  onFocusSubsystem,
}) => {
  const [selectedSubsystemId, setSelectedSubsystemId] = useState<string>('bridge');
  const [filterSection, setFilterSection] = useState<'all' | 'primary' | 'neck' | 'secondary' | 'nacelles'>('all');

  if (!isOpen) return null;

  const filteredSystems = subsystems.filter(
    (s) => filterSection === 'all' || s.section === filterSection
  );

  const activeSubsystem = subsystems.find((s) => s.id === selectedSubsystemId) || subsystems[0];

  const handleSelect = (id: string) => {
    setSelectedSubsystemId(id);
    onFocusSubsystem(id);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-30 w-full sm:w-[460px] bg-slate-950/95 backdrop-blur-xl border-l border-amber-500/40 text-slate-100 shadow-2xl flex flex-col select-none">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-6 bg-amber-400 rounded-sm" />
          <div>
            <h2 className="text-sm font-trek uppercase tracking-wider font-bold text-amber-400">
              Ship Inspection & Deck Schematics
            </h2>
            <p className="text-xs text-slate-400 font-mono-nums">USS Enterprise · NCC-1701</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close Inspection Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Section Filter Bar */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/80 flex items-center gap-1 overflow-x-auto">
        <span className="text-[11px] text-slate-500 font-trek uppercase mr-1">Section:</span>
        {(
          [
            { id: 'all', label: 'All Decks' },
            { id: 'primary', label: 'Primary Saucer' },
            { id: 'neck', label: 'Dorsal Neck' },
            { id: 'secondary', label: 'Secondary Hull' },
            { id: 'nacelles', label: 'Warp Nacelles' },
          ] as const
        ).map((sec) => (
          <button
            key={sec.id}
            onClick={() => setFilterSection(sec.id)}
            className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap ${
              filterSection === sec.id
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* Active Subsystem Detail Spotlight */}
      {activeSubsystem && (
        <div className="p-4 bg-gradient-to-b from-slate-900/90 to-slate-950 border-b border-slate-800/80">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-xs font-mono-nums text-amber-400 uppercase tracking-wide">
                {activeSubsystem.deck}
              </div>
              <h3 className="text-base font-trek font-bold text-white tracking-wide">
                {activeSubsystem.name}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[11px] text-emerald-300 font-medium font-mono-nums">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{activeSubsystem.status}</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            {activeSubsystem.description}
          </p>

          <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 text-[11px] font-mono-nums text-slate-300 mb-3 space-y-1">
            <div className="text-slate-500 uppercase text-[10px] tracking-wider">Specifications</div>
            <div>{activeSubsystem.specs}</div>
          </div>

          <button
            onClick={() => onFocusSubsystem(activeSubsystem.id)}
            className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-trek font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Eye className="w-4 h-4" />
            <span>Focus 3D Inspection Camera</span>
          </button>
        </div>
      )}

      {/* Subsystem List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-trek uppercase text-slate-400 pb-1">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-amber-400" /> Ship Subsystems & Decks
          </span>
          <span className="font-mono-nums text-slate-500">{filteredSystems.length} modules</span>
        </div>

        {filteredSystems.map((item) => {
          const isSelected = item.id === selectedSubsystemId;
          return (
            <div
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-amber-500/15 border-amber-500/50 shadow-sm'
                  : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[11px] font-mono-nums text-slate-400">
                    <span>{item.deck}</span>
                    <span aria-hidden="true">·</span>
                    <span className="uppercase text-amber-400/90">{item.section}</span>
                  </div>
                  <h4 className="text-xs font-trek font-semibold text-slate-100 mt-0.5">
                    {item.name}
                  </h4>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-[10px] font-mono-nums text-emerald-400">
                    {item.status}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3D Orbit Tip Footer */}
      <div className="p-3 bg-slate-950 border-t border-slate-800/80 text-[11px] font-mono-nums text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> 3D Viewport Controls:
        </span>
        <span className="text-slate-500">Drag to Orbit · Scroll to Zoom</span>
      </div>
    </div>
  );
};
