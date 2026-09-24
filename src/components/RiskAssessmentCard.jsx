/**
 * RiskAssessmentCard — High-Precision Monochrome Cyber-SOC Threat Telemetry.
 */
import { useMemo } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, ShieldAlert, Zap } from 'lucide-react';

export default function RiskAssessmentCard({ risk = {}, onToggleNetwork }) {
  const score = Math.min(Math.max(risk.score ?? 0, 0), 100);
  const level = (risk.level || 'LOW').toUpperCase();

  // Semantic Cyber-SOC threat telemetry styling
  const riskTheme = useMemo(() => {
    switch (level) {
      case 'CRITICAL':
        return {
          badge: 'bg-rose-950/80 text-rose-300 font-black border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.25)]',
          stroke: '#f43f5e',
          text: 'text-rose-400',
          track: 'rgba(244, 63, 94, 0.15)',
          glow: 'rgba(244, 63, 94, 0.4)',
          factorBorder: 'border-rose-500/25 bg-rose-950/20',
          iconText: 'text-rose-400',
        };
      case 'HIGH':
        return {
          badge: 'bg-amber-950/80 text-amber-300 font-bold border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
          stroke: '#f59e0b',
          text: 'text-amber-400',
          track: 'rgba(245, 158, 11, 0.15)',
          glow: 'rgba(245, 158, 11, 0.35)',
          factorBorder: 'border-amber-500/25 bg-amber-950/20',
          iconText: 'text-amber-400',
        };
      case 'MEDIUM':
        return {
          badge: 'bg-yellow-950/60 text-yellow-300 font-semibold border border-yellow-500/40',
          stroke: '#eab308',
          text: 'text-yellow-400',
          track: 'rgba(234, 179, 8, 0.12)',
          glow: 'rgba(234, 179, 8, 0.25)',
          factorBorder: 'border-yellow-500/20 bg-yellow-950/15',
          iconText: 'text-yellow-400',
        };
      case 'LOW':
      default:
        return {
          badge: 'bg-emerald-950/60 text-emerald-300 font-semibold border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
          stroke: '#10b981',
          text: 'text-emerald-400',
          track: 'rgba(16, 185, 129, 0.12)',
          glow: 'rgba(16, 185, 129, 0.25)',
          factorBorder: 'border-emerald-500/20 bg-emerald-950/15',
          iconText: 'text-emerald-400',
        };
    }
  }, [level]);

  // SVG Gauge calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 240 / 360;
  const arcLength = circumference * arcFraction;
  const strokeDashoffset = arcLength - (score / 100) * arcLength;

  return (
    <div className="rounded-xl border border-white/10 bg-[#080808] p-4 font-mono shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <button
          type="button"
          onClick={onToggleNetwork}
          className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white transition-all text-left ${
            onToggleNetwork ? 'cursor-pointer hover:text-neutral-300 group' : 'cursor-default'
          }`}
          title={onToggleNetwork ? 'Click to toggle Target ISP & Network HUD' : undefined}
        >
          <BarChart3 className="w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform" />
          <span>Risk Assessment</span>
          {onToggleNetwork && (
            <span className="text-[7.5px] px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-neutral-400 group-hover:text-white group-hover:border-white/40 transition-all font-mono">
              ⇄ Toggle ISP HUD
            </span>
          )}
        </button>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${riskTheme.badge} shadow-sm`}
        >
          {level}
        </span>
      </div>

      {/* Circular HUD Gauge & Score Display */}
      <div className="flex items-center gap-4 py-2 border-b border-white/10 relative z-10">
        <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background Track Arc */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={riskTheme.track}
              strokeWidth="6"
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeLinecap="round"
              className="origin-center rotate-[150deg]"
            />
            {/* Filled Progress Arc */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={riskTheme.stroke}
              strokeWidth="6"
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="origin-center rotate-[150deg] transition-all duration-700 ease-out"
              style={{ filter: `drop-shadow(0 0 6px ${riskTheme.glow})` }}
            />
          </svg>

          {/* Centered Score Number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-black text-white tracking-tight leading-none">
              {score}
            </span>
            <span className="text-[8px] uppercase tracking-widest text-neutral-500 mt-0.5">
              / 100
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-neutral-400 uppercase tracking-wider">Verdict</span>
            <span className={`font-bold ${riskTheme.text}`}>{level} Risk</span>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-neutral-400 uppercase tracking-wider">Confidence</span>
            <span className="text-white font-mono">
              {risk.confidence_delta ? `${Math.round(risk.confidence_delta * 100)}%` : 'Standard'}
            </span>
          </div>

          {/* Velocity Badge */}
          {risk.velocity_badge && (
            <div className="pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/20 bg-white/5 text-[9px] font-mono text-white">
                <Zap className="w-2.5 h-2.5 text-white" />
                <span className="truncate">{risk.velocity_badge}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Triggered rules */}
      {risk.triggered_rules && risk.triggered_rules.length > 0 && (
        <div className="mt-3 relative z-10">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-300">
              <ShieldAlert className="w-3 h-3 text-white" />
              <span>Triggered Risk Factors</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-white font-mono">
              {risk.triggered_rules.length}
            </span>
          </div>

          <div className="space-y-1.5">
            {risk.triggered_rules.slice(0, 4).map((rule, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 p-2 rounded-lg ${riskTheme.factorBorder} border text-[10px] text-neutral-300 hover:text-white transition-colors`}
              >
                <AlertTriangle className={`w-3 h-3 ${riskTheme.iconText} flex-shrink-0 mt-0.5`} />
                <span className="leading-snug break-words">{rule}</span>
              </div>
            ))}
            {risk.triggered_rules.length > 4 && (
              <p className="text-[9px] text-neutral-500 text-right pr-1">
                +{risk.triggered_rules.length - 4} additional signals detected
              </p>
            )}
          </div>
        </div>
      )}

      {/* Key findings — raw engine telemetry as key:value rows */}
      {risk.raw_findings && Object.keys(risk.raw_findings).length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10 relative z-10">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3 h-3 text-white" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">
              Telemetry Findings
            </span>
          </div>
          <div className="space-y-1">
            {Object.entries(risk.raw_findings).slice(0, 5).map(([key, value]) => (
              <div
                key={key}
                className="flex items-start justify-between gap-2 text-[10px] py-1 border-b border-white/[0.06] last:border-0"
              >
                <span className="text-neutral-400 break-all font-mono">{key}:</span>
                <span className="text-white text-right break-all font-mono font-medium">
                  {typeof value === 'boolean' ? (
                    value ? (
                      <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[9px]">TRUE</span>
                    ) : (
                      <span className="text-neutral-500 font-bold px-1 rounded text-[9px]">FALSE</span>
                    )
                  ) : (
                    String(value)
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
