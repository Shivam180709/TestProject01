import React, { useState } from 'react';
import { CameraViewMode, ShipState, CelestialTarget } from '../types/simulation';
import {
  Target,
  Zap,
  Shield,
  Crosshair,
  CheckCircle,
  Flame,
  Activity,
  Cpu,
  TrendingUp,
  Award,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  X,
  Crosshair as CrosshairIcon
} from 'lucide-react';

interface FlightHUDProps {
  shipState: ShipState | null;
  currentView: CameraViewMode;
  targets: CelestialTarget[];
  onDisengageWarp?: () => void;
  onSummonNextWave?: () => void;
}

export const FlightHUD: React.FC<FlightHUDProps> = ({
  shipState,
  currentView,
  targets,
  onSummonNextWave,
}) => {
  const [showAdaptiveModal, setShowAdaptiveModal] = useState<boolean>(false);

  if (!shipState) return null;

  const isRedAlert = shipState.alertLevel === 'red';
  const selectedTarget = targets.find((t) => t.id === shipState.selectedTargetId);
  const wave = shipState.combatWaveState;
  const adaptive = wave?.adaptiveDifficulty || shipState.adaptiveDifficulty;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none">
      {/* Red Alert Screen Edge Warning Pulse */}
      {isRedAlert && (
        <div className="absolute inset-0 border-4 border-red-600/70 shadow-[inset_0_0_50px_rgba(220,38,38,0.35)] animate-pulse pointer-events-none" />
      )}

      {/* WAR LEVEL & WAVE TACTICAL HUD STRIP (Top-Center) */}
      {wave && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-auto z-20">
          <div className="flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/95 backdrop-blur-md border border-slate-700 shadow-xl font-mono-nums text-xs">
            {wave.status === 'standby' ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-trek font-bold text-sky-300 uppercase tracking-wider">
                  TERRITORY SECURE
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300 text-[11px] font-trek uppercase">Condition Green</span>
                {onSummonNextWave && (
                  <button
                    onClick={onSummonNextWave}
                    className="ml-1 px-2.5 py-0.5 rounded bg-red-600/80 hover:bg-red-500 text-white font-trek font-bold text-[10px] uppercase transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <span>⚔️</span>
                    <span>Engage Hostiles (Wave 1)</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Officer Rank & Level Badge */}
                {shipState.progression && (
                  <span className="px-2 py-0.5 rounded bg-sky-950/90 border border-sky-500/50 text-[10px] text-sky-300 font-trek font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Award className="w-3 h-3 text-amber-400" />
                    <span>Lvl {shipState.progression.level} {shipState.progression.rank}</span>
                  </span>
                )}

                <span className="font-trek font-bold text-amber-400 uppercase tracking-wider">
                  WAR LEVEL {wave.level}
                </span>
                <span className="text-slate-500">·</span>
                
                {/* Threat Level Badge */}
                <span className={`px-2 py-0.5 rounded text-[10px] font-trek uppercase font-bold ${
                  wave.threatLevel === 'Lethal' || wave.threatLevel === 'Extreme'
                    ? 'bg-red-600 text-white animate-pulse'
                    : wave.threatLevel === 'Critical'
                    ? 'bg-orange-600 text-white'
                    : wave.threatLevel === 'Severe'
                    ? 'bg-amber-600 text-slate-950'
                    : 'bg-slate-800 text-amber-300'
                }`}>
                  THREAT: {wave.threatLevel || 'STANDARD'}
                </span>

                <span className="text-slate-500">·</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-trek uppercase font-bold ${
                  wave.activeFaction === 'klingon' ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40' :
                  wave.activeFaction === 'romulan' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40' :
                  'bg-blue-900/60 text-cyan-300 border border-blue-500/40'
                }`}>
                  {wave.activeFaction} FLEET
                </span>

                {wave.status === 'active' ? (
                  <>
                    <span className="text-red-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      {wave.enemiesAlive} Hostiles Active
                    </span>

                    {/* Adaptive Difficulty & Fleet Intelligence Badge */}
                    {adaptive && (
                      <button
                        onClick={() => setShowAdaptiveModal(!showAdaptiveModal)}
                        className={`px-2.5 py-0.5 rounded border text-[10px] font-trek uppercase font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                          showAdaptiveModal
                            ? 'bg-sky-600 text-white border-sky-400 ring-2 ring-sky-400/50'
                            : 'bg-slate-900/90 hover:bg-slate-800 text-amber-300 border-amber-500/50 hover:border-amber-400'
                        }`}
                        title="Click to view Adaptive Fleet Intelligence Telemetry"
                      >
                        <Cpu className="w-3 h-3 text-amber-400 animate-pulse" />
                        <span>AI: {adaptive.fleetIntelligenceTier}</span>
                        <span className="text-slate-400 font-normal">·</span>
                        <span className="text-emerald-400">{adaptive.playerSuccessRate}% Success</span>
                        <span className="text-slate-400 font-normal">·</span>
                        <span className="text-orange-400">+{Math.round((adaptive.adaptiveDamageMultiplier - 1) * 100)}% Dmg</span>
                        {showAdaptiveModal ? (
                          <ChevronUp className="w-3 h-3 text-sky-300 ml-0.5" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-amber-300 ml-0.5" />
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      SECTOR SECURED · YOU ARE FREE
                    </span>
                    {onSummonNextWave && (
                      <button
                        onClick={onSummonNextWave}
                        className="px-2.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-trek font-bold text-[10px] uppercase transition-colors shadow-sm flex items-center gap-1"
                        title="Voluntarily face the next battlegroup challenge"
                      >
                        <span>⚔️</span>
                        <span>Engage Wave {wave.level + 1}</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mothership Boss Detected Warning */}
          {wave.status === 'active' && wave.mothershipAlive && (
            <div className="px-4 py-1 rounded-full bg-red-950/95 border-2 border-red-500 text-center animate-pulse shadow-lg shadow-red-900/50 flex items-center gap-2">
              <span className="text-[11px] font-trek font-bold text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                <span>👑</span> WARNING: ENEMY FLAGSHIP MOTHERSHIP DETECTED!
              </span>
              <span className="text-[10px] text-red-200 font-mono-nums">HEAVY ARMOR & PLASMA BATTERIES</span>
            </div>
          )}

          {/* Sector Cleared Freedom Banner */}
          {wave.status === 'cleared' && (
            <div className="px-4 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/80 text-center shadow-lg shadow-emerald-950/40 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-[11px] font-mono-nums text-emerald-200 font-semibold flex items-center gap-2">
                <span>🕊️</span>
                <span>Threats neutralized. You are free to explore or set course to other sectors.</span>
              </span>
            </div>
          )}

          {/* ADAPTIVE COMBAT TELEMETRY LCARS OVERLAY MODAL */}
          {showAdaptiveModal && adaptive && (
            <div className="mt-2 w-[440px] max-w-[95vw] rounded-xl bg-slate-950/95 backdrop-blur-xl border border-sky-500/60 shadow-2xl shadow-sky-950/70 p-3.5 text-left text-xs pointer-events-auto animate-in fade-in zoom-in-95 duration-150 z-30">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-sky-500/30">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="font-trek font-bold text-sky-400 uppercase tracking-widest text-[11px]">
                    ADAPTIVE DIFFICULTY ENGINE // LCARS 47
                  </span>
                </div>
                <button
                  onClick={() => setShowAdaptiveModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                  title="Close Telemetry"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Player Tactical Performance Section */}
              <div className="mb-3 p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-trek text-sky-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Player Success & Performance Rating
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-trek uppercase text-[10px] font-bold border border-amber-500/40">
                    Tier: {adaptive.skillTier}
                  </span>
                </div>

                {/* Success Rate Bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-[11px] font-mono-nums mb-1">
                    <span className="text-slate-300">Hostile Neutralization Success Rate:</span>
                    <span className="font-bold text-emerald-400">{adaptive.playerSuccessRate}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        adaptive.playerSuccessRate >= 80
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                          : adaptive.playerSuccessRate >= 60
                          ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                          : 'bg-gradient-to-r from-red-500 to-amber-500'
                      }`}
                      style={{ width: `${adaptive.playerSuccessRate}%` }}
                    />
                  </div>
                </div>

                {/* Sub-metrics Grid */}
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono-nums text-slate-300 pt-1 border-t border-slate-800/80">
                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                    <div className="text-slate-400 text-[9px] uppercase">Combat Rating</div>
                    <div className="text-amber-400 font-bold text-xs">{adaptive.combatRating} <span className="text-[9px] text-slate-500">/ 270</span></div>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                    <div className="text-slate-400 text-[9px] uppercase">Win Streak</div>
                    <div className="text-sky-300 font-bold text-xs">{adaptive.winStreak} waves</div>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                    <div className="text-slate-400 text-[9px] uppercase">Torpedo Accuracy</div>
                    <div className="text-emerald-400 font-bold text-xs">{adaptive.playerAccuracyPercent}%</div>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                    <div className="text-slate-400 text-[9px] uppercase">Torpedo Evasion</div>
                    <div className="text-cyan-300 font-bold text-xs">{adaptive.evasionEfficacyPercent}%</div>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                    <div className="text-slate-400 text-[9px] uppercase">Avg Time to Kill</div>
                    <div className="text-purple-300 font-bold text-xs">{adaptive.averageTimeToKill}s</div>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                    <div className="text-slate-400 text-[9px] uppercase">Damage Ratio</div>
                    <div className="text-amber-300 font-bold text-xs">{adaptive.damageEfficiencyRatio}x</div>
                  </div>
                </div>
              </div>

              {/* Hostile Fleet Dynamic Adaptation Section */}
              <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-trek text-red-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-red-400" />
                    Hostile Fleet AI Counter-Scaling
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-600/30 text-red-300 font-trek uppercase text-[10px] font-bold border border-red-500/50">
                    AI Level: {adaptive.fleetIntelligenceLevel} ({adaptive.fleetIntelligenceTier})
                  </span>
                </div>

                <div className="space-y-1.5 text-[10px]">
                  {/* Dynamic Firepower Output */}
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/70 border border-red-950">
                    <span className="text-slate-300 font-mono-nums">Dynamic Damage Output:</span>
                    <span className="font-mono-nums font-bold text-orange-400">
                      +{Math.round((adaptive.adaptiveDamageMultiplier - 1) * 100)}% Firepower ({adaptive.adaptiveDamageMultiplier}x)
                    </span>
                  </div>

                  {/* Predictive Lead Aiming */}
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/70 border border-red-950">
                    <span className="text-slate-300 font-mono-nums">Predictive Velocity Aiming:</span>
                    <span className={`font-mono-nums font-bold flex items-center gap-1 ${
                      adaptive.predictiveLeadAim ? 'text-red-400 animate-pulse' : 'text-slate-500'
                    }`}>
                      {adaptive.predictiveLeadAim ? '⚡ ACTIVE (Lead Intercept)' : 'STANDBY (Tier 4+)'}
                    </span>
                  </div>

                  {/* Coordinated Flanking Tactics */}
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/70 border border-red-950">
                    <span className="text-slate-300 font-mono-nums">Fleet Pincer & Flanking Tactics:</span>
                    <span className="font-mono-nums font-bold text-amber-400">
                      Tier {adaptive.fleetIntelligenceLevel} ({adaptive.flankingAggression}x banking speed)
                    </span>
                  </div>
                </div>

                {/* Tactical Explanation Footnote */}
                <div className="mt-2 pt-1.5 border-t border-red-900/40 text-[9px] text-slate-400 leading-relaxed font-mono-nums">
                  ℹ️ The simulation engine tracks your combat success rate and continuously recalibrates subsequent waves to guarantee escalating challenge.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CRITICAL ALERT: INCOMING HOSTILE TORPEDO (Centered, High Visibility, Unobstructed) */}
      {shipState.hasIncomingTorpedo && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-xl bg-red-600/95 border-2 border-amber-300 text-center shadow-[0_0_40px_rgba(239,68,68,0.9)] animate-bounce pointer-events-auto">
          <div className="flex items-center gap-2 text-white font-trek font-bold text-xs sm:text-sm uppercase tracking-widest">
            <span className="w-3 h-3 rounded-full bg-white animate-ping" />
            <span>⚠️ CRITICAL: INCOMING HEAVY TORPEDO!</span>
            <span className="px-2 py-0.5 rounded bg-black/40 text-[10px] text-amber-200 font-mono-nums">
              EVASIVE BOOST [SHIFT]
            </span>
          </div>
        </div>
      )}

      {/* DIRECT ATTACK WARNING (Centered, High Visibility, Never Blocked by Scanner) */}
      {shipState.isUnderAttack && !shipState.hasIncomingTorpedo && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 bg-red-950/95 border-2 border-red-500 rounded-full text-center shadow-[0_0_30px_rgba(220,38,38,0.7)] animate-pulse pointer-events-auto">
          <span className="text-xs font-trek text-red-200 font-bold uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>ALERT: UNDER DIRECT HOSTILE ATTACK! (SHIELDS: {shipState.shieldIntegrity}%)</span>
          </span>
        </div>
      )}

      {/* High-Impact Evasive Boost Visual Overdrive Vignette & Speed Flare */}
      {shipState.isBoostActive && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {/* Cyan screen perimeter glow and high-energy impulse edge vignette */}
          <div className="absolute inset-0 border-4 border-cyan-400/60 shadow-[inset_0_0_100px_rgba(6,182,212,0.45)] animate-pulse" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-cyan-500/25 via-cyan-900/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-cyan-500/25 via-cyan-900/10 to-transparent" />
          {/* Subtle impulse thruster warp streaks along flanks */}
          <div className="absolute left-0 inset-y-0 w-24 bg-gradient-to-r from-cyan-500/15 to-transparent" />
          <div className="absolute right-0 inset-y-0 w-24 bg-gradient-to-l from-cyan-500/15 to-transparent" />
        </div>
      )}

      {/* Evasive Boost Active Banner */}
      {shipState.isBoostActive && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-2xl bg-cyan-950/95 border-2 border-cyan-400 text-center shadow-[0_0_35px_rgba(6,182,212,0.85)] animate-pulse flex flex-col items-center gap-1 min-w-[320px]">
          <div className="text-xs font-trek text-cyan-200 font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span>⚡ EVASIVE OVERDRIVE [{Math.ceil(shipState.boostDuration ?? 13)}s]</span>
            <span className="text-cyan-400">·</span>
            <span>220 KM/S (IMPULSE BOOST)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-300 font-mono-nums">
            <span>75% Disruptor Deflection</span>
            <span>·</span>
            <span>2x Thruster Agility</span>
          </div>
          {/* Dynamic Depletion Bar */}
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-0.5">
            <div
              className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all duration-100"
              style={{ width: `${Math.max(0, Math.min(100, ((shipState.boostDuration ?? 13) / 13) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Bridge / Helm Viewscreen Targeting Crosshair */}
      {(currentView === 'bridge' || currentView === 'chase' || currentView === 'interior_bridge') && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-28 h-28 flex items-center justify-center opacity-70">
            {/* Center reticle */}
            <div className="w-2.5 h-2.5 rounded-full border border-sky-400/80 bg-sky-400/20" />
            
            {/* Crosshair ticks */}
            <div className="absolute top-0 w-0.5 h-4 bg-sky-400/60" />
            <div className="absolute bottom-0 w-0.5 h-4 bg-sky-400/60" />
            <div className="absolute left-0 w-4 h-0.5 bg-sky-400/60" />
            <div className="absolute right-0 w-4 h-0.5 bg-sky-400/60" />

            {/* Tactical brackets */}
            <div className={`absolute inset-0 border rounded-full transition-colors ${
              shipState.lockedEnemy ? 'border-red-500/80 animate-pulse' : 'border-sky-500/30'
            }`} />
            
            {/* Target vector cue if locked on planet */}
            {selectedTarget && !shipState.lockedEnemy && (
              <div className="absolute -bottom-8 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950/80 border border-sky-500/40 text-[10px] font-mono-nums text-sky-300">
                <Target className="w-3 h-3 text-sky-400" />
                <span>{selectedTarget.name}</span>
                <span className="text-slate-400">· {selectedTarget.distance}M km</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ENEMY TARGET LOCK BOX */}
      {shipState.lockedEnemy && (
        <div className={`absolute bottom-28 left-1/2 -translate-x-1/2 p-3 backdrop-blur-md rounded-xl shadow-2xl text-xs font-mono-nums min-w-[340px] pointer-events-auto ${
          shipState.lockedEnemy.isMothership
            ? 'bg-amber-950/90 border-2 border-amber-500 shadow-amber-900/50'
            : 'bg-red-950/85 border border-red-500/70'
        }`}>
          <div className="flex items-center justify-between border-b border-red-800/80 pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-trek font-bold text-red-200 uppercase tracking-wider">
                {shipState.lockedEnemy.isMothership ? '👑 FLAGSHIP:' : 'HOSTILE:'} {shipState.lockedEnemy.name}
              </span>
              {shipState.lockedEnemy.isElite && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded text-[9px] font-trek font-bold">
                  ELITE
                </span>
              )}
              {shipState.lockedEnemy.isCloaked && (
                <span className="px-1.5 py-0.2 bg-cyan-700 text-cyan-100 rounded text-[9px] font-mono animate-pulse">
                  CLOAKED
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {shipState.lockedEnemy.rank && (
                <span className="text-[10px] text-amber-300 font-mono">
                  [{shipState.lockedEnemy.rank}]
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded bg-red-900/60 text-[10px] uppercase font-semibold text-red-200">
                {shipState.lockedEnemy.faction}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 mb-2 flex items-center justify-between">
            <span className={shipState.lockedEnemy.isMothership ? 'text-amber-300 font-bold' : ''}>
              Class: {shipState.lockedEnemy.shipClass}
            </span>
            <span className="text-red-300 font-bold">{shipState.lockedEnemy.distanceToPlayer} km</span>
          </div>

          {/* Enemy Shields & Hull */}
          <div className="space-y-1 mb-2">
            <div>
              <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                <span>Shields</span>
                <span className="text-sky-300 font-bold">{shipState.lockedEnemy.shieldPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-100"
                  style={{ width: `${shipState.lockedEnemy.shieldPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                <span>Hull Integrity</span>
                <span className="text-red-400 font-bold">{shipState.lockedEnemy.hullPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-100"
                  style={{ width: `${shipState.lockedEnemy.hullPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-amber-300 font-mono-nums bg-slate-950/80 px-2 py-1 rounded border border-amber-500/30 mb-2">
            <span>⚡ Torpedo: <strong className="text-red-400">Antimatter Blast</strong> (-50% to -70% Shields)</span>
            <span>🔥 Phasers: <strong className="text-orange-400">58 DMG/s</strong></span>
          </div>

          <div className="text-[10px] text-center text-red-300 font-trek uppercase tracking-wide bg-red-900/40 py-1 rounded">
            Press <kbd className="px-1 bg-red-950 rounded">T</kbd> Launch Homing Torpedo · <kbd className="px-1 bg-red-950 rounded">Space</kbd> Phasers · <kbd className="px-1 bg-red-950 rounded">Tab</kbd> Next Target
          </div>
        </div>
      )}

      {/* Bridge Interior Look Indicator */}
      {currentView === 'interior_bridge' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-950/80 border border-amber-500/40 rounded-full text-center">
          <span className="text-[11px] font-mono-nums text-amber-300">
            MAIN BRIDGE INTERIOR · Drag to Look Around 360°
          </span>
        </div>
      )}

      {/* Upper-Left Flight Telemetry Hud */}
      <div className="absolute top-4 left-4 p-3 bg-slate-950/70 backdrop-blur-md rounded-lg border border-slate-800 text-xs font-mono-nums max-w-xs shadow-lg">
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80 text-[11px] font-trek text-amber-400 uppercase tracking-wide">
          <span>{shipState.currentSystemName || 'Sector 001'}</span>
          <span className="text-slate-400">{currentView.replace('_', ' ').toUpperCase()}</span>
        </div>

        {/* Speed / Propulsion Mode */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Drive:
            </span>
            <span className={`font-semibold ${shipState.isWarping ? 'text-sky-300 animate-pulse' : 'text-amber-300'}`}>
              {shipState.isWarping ? `WARP FACTOR ${shipState.warpFactor.toFixed(1)}` : 'IMPULSE DRIVE'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Velocity:</span>
            <span className="text-slate-100 font-semibold">
              {shipState.isWarping
                ? `${(Math.pow(shipState.warpFactor, 2.5) * 8.5).toFixed(1)} c (Lightspeed)`
                : `${shipState.speed.toLocaleString()} km/s`}
            </span>
          </div>

          {/* Throttle Gauge Bar */}
          <div className="pt-1">
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Throttle</span>
              <span>{shipState.throttlePercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  shipState.isWarping ? 'bg-sky-400' : 'bg-amber-400'
                }`}
                style={{ width: `${shipState.throttlePercent}%` }}
              />
            </div>
          </div>

          {/* Evasive Thruster Boost */}
          <div className="pt-1 border-t border-slate-800/80">
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-slate-400">⚡ Evasive Boost:</span>
              <span className={`font-semibold ${
                shipState.isBoostActive
                  ? 'text-cyan-300 animate-pulse font-bold'
                  : (shipState.boostCharge ?? 100) >= 100
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}>
                {shipState.isBoostActive
                  ? `OVERDRIVE (${shipState.boostDuration ?? 12}s)`
                  : (shipState.boostCharge ?? 100) >= 100
                  ? 'READY [SHIFT]'
                  : `${Math.round(shipState.boostCharge ?? 0)}%`}
              </span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  shipState.isBoostActive ? 'bg-cyan-400 animate-pulse' : 'bg-cyan-500'
                }`}
                style={{ width: `${shipState.isBoostActive ? 100 : (shipState.boostCharge ?? 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upper-Right Tactical Weapons Status */}
      <div className="absolute top-4 right-4 p-3 bg-slate-950/70 backdrop-blur-md rounded-lg border border-slate-800 text-xs font-mono-nums max-w-xs shadow-lg">
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80 text-[11px] font-trek text-amber-400 uppercase tracking-wide">
          <span>Tactical Ordnance</span>
          <span className={shipState.isFiringPhasers ? 'text-red-400 animate-pulse font-bold' : 'text-slate-400'}>
            {shipState.isFiringPhasers ? 'DISCHARGING' : 'ARMED'}
          </span>
        </div>

        <div className="space-y-1.5">
          {/* Phasers Energy */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span className="flex items-center gap-1">
                <Crosshair className="w-2.5 h-2.5 text-orange-400" /> Phaser Banks
              </span>
              <span className={shipState.phaserEnergy < 20 ? 'text-red-400 font-bold' : 'text-orange-300'}>
                {shipState.phaserEnergy}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-100"
                style={{ width: `${shipState.phaserEnergy}%` }}
              />
            </div>
          </div>

          {/* Photon Torpedo Count */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400">Photon Torpedoes:</span>
            <div className="flex items-center gap-1">
              <span className="text-red-400 font-bold">{shipState.torpedoCount}</span>
              <span className="text-slate-500 text-[10px]">/ 24</span>
            </div>
          </div>

          {/* Shields status */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Shield className="w-3 h-3 text-sky-400" /> Shields:
            </span>
            <span className={shipState.shieldsRaised ? 'text-sky-300 font-semibold' : 'text-slate-500'}>
              {shipState.shieldsRaised ? 'ACTIVE (100%)' : 'LOWERED'}
            </span>
          </div>
        </div>
      </div>

      {/* Warp Jump Visual Banner */}
      {shipState.isWarping && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-sky-950/80 border border-sky-400/60 rounded-full text-center shadow-[0_0_20px_rgba(56,189,248,0.4)]">
          <div className="text-xs font-trek text-sky-300 font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            WARP DRIVE ENGAGED · FACTOR {shipState.warpFactor.toFixed(1)}
          </div>
        </div>
      )}
    </div>
  );
};
