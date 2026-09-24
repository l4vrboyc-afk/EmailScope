import { X, Cpu, Globe, Terminal, CheckCircle2 } from 'lucide-react';

interface EngineModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNative: boolean;
}

export default function EngineModeModal({ isOpen, onClose, isNative }: EngineModeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono text-white">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg bg-black border border-white/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 bg-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/30 flex items-center justify-center">
              {isNative ? <Cpu className="w-4 h-4 text-white" /> : <Globe className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
                Engine Diagnostics
              </h2>
              <p className="text-[10px] text-white/50 tracking-wider">
                Execution Runtime &amp; Pipeline Status
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-white/25 flex items-center justify-center text-white/60 hover:text-white hover:border-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Mode Badge */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl border border-white/30 bg-white/8 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                Active Execution Mode
              </span>
              <span className={`text-[9px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                isNative
                  ? 'bg-white text-black'
                  : 'bg-white/20 border border-white/40 text-white'
              }`}>
                {isNative ? '⚡ Native OSINT Engine' : '🌐 Browser Simulation'}
              </span>
            </div>
            <p className="text-[11px] text-white/80 leading-relaxed">
              {isNative
                ? 'ThreatScope is running inside the Tauri native desktop shell with direct access to the compiled Python sidecar binary and live socket connections.'
                : 'ThreatScope is currently running inside your web browser. In browser mode, OSINT telemetry is intelligently synthesized so all graph physics, pivots, and threat analyses are fully interactive.'}
            </p>
          </div>

          {/* Instructions to switch */}
          {!isNative && (
            <div className="p-4 rounded-xl border border-white/20 bg-white/4 space-y-2.5">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-white/70" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                  Launch Native Live Desktop Shell
                </span>
              </div>
              <p className="text-[10px] text-white/60 leading-relaxed">
                To run live queries against real DNS servers, Certificate Transparency logs, and the compiled Python engine:
              </p>
              <div className="bg-black border border-white/25 rounded-lg p-2.5 text-[10px] font-mono text-white/90 select-all">
                npm run tauri dev
              </div>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-[9px] uppercase tracking-widest text-white/50 block">
              Feature Availability Matrix
            </span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center space-x-1.5 text-white/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>Force-Directed Graph</span>
              </div>
              <div className="flex items-center space-x-1.5 text-white/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>Interactive Pivoting</span>
              </div>
              <div className="flex items-center space-x-1.5 text-white/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>Risk Scoring Gauge</span>
              </div>
              <div className="flex items-center space-x-1.5 text-white/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>Threat Map View</span>
              </div>
              <div className="flex items-center space-x-1.5 text-white/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>OpSec Redaction</span>
              </div>
              <div className="flex items-center space-x-1.5 text-white/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>Multi-Case Vault</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/15 bg-white/5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-white text-black font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
