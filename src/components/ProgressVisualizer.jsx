import React from 'react';
import { Loader2, Terminal, Layers, ShieldCheck, FileText, Check } from 'lucide-react';

const STAGES = [
  {
    id: 'fetching_osint',
    step: '01',
    label: 'Collecting OSINT Telemetry',
    detail: 'DNS, MX, SPF/DMARC, GeoIP, Breaches, Keybase',
    icon: Terminal,
  },
  {
    id: 'deduplicating_graph',
    step: '02',
    label: 'Correlating & Synthesizing Graph',
    detail: 'Entity canonicalization & relationship clustering',
    icon: Layers,
  },
  {
    id: 'assessing_risk',
    step: '03',
    label: 'Computing Threat Verdict',
    detail: 'k-Anonymity breach evaluation & risk scoring',
    icon: ShieldCheck,
  },
  {
    id: 'generating_narrative',
    step: '04',
    label: 'Compiling Forensic Brief',
    detail: 'Executive summary & prioritized remediation',
    icon: FileText,
  },
];

/**
 * @param {{ stages?: string[], currentStage?: string | null }} props
 */
export default function ProgressVisualizer({ stages = /** @type {string[]} */ ([]), currentStage = null }) {
  const completedStages = stages.filter(s => s !== currentStage);
  const activeIndex = STAGES.findIndex(s => s.id === currentStage);
  const completedCount = completedStages.length;
  const progressPercent = Math.min(100, Math.round(((completedCount + (currentStage ? 0.6 : 0)) / STAGES.length) * 100));

  return (
    <div className="w-full bg-[#050505] border border-white/15 rounded-2xl p-6 font-mono text-white shadow-2xl relative overflow-hidden">
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg border border-white/20 bg-white/5 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-white">
                Investigation Active
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white text-black font-bold uppercase">
                Live
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              Executing client-side OSINT forensic pipeline
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-lg font-black text-white">{progressPercent}%</span>
          <span className="text-[9px] text-neutral-500 block uppercase tracking-wider">
            {completedCount}/{STAGES.length} Complete
          </span>
        </div>
      </div>

      {/* Sleek Monochrome Progress Bar */}
      <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-white transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Pipeline List */}
      <div className="space-y-2">
        {STAGES.map((stage, idx) => {
          const isComplete = completedStages.includes(stage.id);
          const isActive = stage.id === currentStage;
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                isComplete
                  ? 'bg-neutral-900/60 border-white/20 text-neutral-200'
                  : isActive
                  ? 'bg-white/10 border-white/40 text-white shadow-sm'
                  : 'bg-transparent border-transparent text-neutral-600'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <span className="text-[10px] text-neutral-500 w-5">
                  [{stage.step}]
                </span>
                <div
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                    isComplete
                      ? 'bg-white text-black border-white'
                      : isActive
                      ? 'bg-white/20 text-white border-white/40'
                      : 'border-white/10 text-neutral-600'
                  }`}
                >
                  {isComplete ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[11px] truncate">{stage.label}</div>
                  <div className="text-[9px] text-neutral-500 truncate">{stage.detail}</div>
                </div>
              </div>

              <div className="flex-shrink-0 ml-3">
                {isComplete ? (
                  <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-wider">
                    Done
                  </span>
                ) : isActive ? (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-white text-black font-bold uppercase tracking-wider animate-pulse">
                    Scanning
                  </span>
                ) : (
                  <span className="text-[9px] text-neutral-600 uppercase tracking-wider">
                    Queued
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
