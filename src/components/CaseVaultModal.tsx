import { useState, useRef } from 'react';
import {
  X, FolderArchive, Search, Upload, Download, Trash2, ArrowRight,
  Clock, Network, AlertCircle
} from 'lucide-react';
import type { InvestigationCase } from '../utils/caseVault';
import { exportCaseAsJson, parseImportedCase } from '../utils/caseVault';
import { redactText } from '../utils/redaction';

interface CaseVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: InvestigationCase[];
  onLoadCase: (caseItem: InvestigationCase) => void;
  onDeleteCase: (id: string) => void;
  onClearAllCases: () => void;
  onImportCase: (imported: InvestigationCase) => void;
  opsecEnabled: boolean;
}

const RISK_BADGE_STYLE: Record<string, string> = {
  LOW: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/50',
  MEDIUM: 'border-yellow-500/40 text-yellow-300 bg-yellow-950/50',
  HIGH: 'border-amber-500/50 text-amber-300 bg-amber-950/60 font-semibold shadow-[0_0_8px_rgba(245,158,11,0.2)]',
  CRITICAL: 'border-rose-500/60 text-rose-200 bg-rose-950/80 font-bold shadow-[0_0_10px_rgba(244,63,94,0.25)]',
};

export default function CaseVaultModal({
  isOpen,
  onClose,
  cases,
  onLoadCase,
  onDeleteCase,
  onClearAllCases,
  onImportCase,
  opsecEnabled,
}: CaseVaultModalProps) {
  const [search, setSearch] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredCases = cases.filter((c) =>
    c.targetValue.toLowerCase().includes(search.toLowerCase()) ||
    c.targetType.toLowerCase().includes(search.toLowerCase()) ||
    (c.tag && c.tag.toLowerCase().includes(search.toLowerCase()))
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseImportedCase(content);
      if (parsed) {
        onImportCase(parsed);
      } else {
        setImportError('Invalid ThreatScope case bundle file.');
      }
    };
    reader.onerror = () => setImportError('Failed to read file.');
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-4xl max-h-[85vh] bg-black border border-white/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-mono text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 bg-white/5 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/30 flex items-center justify-center">
              <FolderArchive className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
                  Investigation Case Vault
                </h2>
                <span className="text-[9px] px-2 py-0.5 rounded bg-white/15 border border-white/30 text-white/80">
                  {cases.length} {cases.length === 1 ? 'CASE' : 'CASES'}
                </span>
                {opsecEnabled && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 border border-white/40 text-white uppercase tracking-wider">
                    OpSec Active
                  </span>
                )}
              </div>
              <p className="text-[10px] text-white/50 tracking-wider">
                Multi-target investigation history, case switching &amp; bundle export
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-white/30 bg-white/8 text-[10px] uppercase tracking-wider text-white/80 hover:border-white hover:text-white transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Case</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-white/25 flex items-center justify-center text-white/60 hover:text-white hover:border-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Alerts */}
        <div className="px-6 py-3 border-b border-white/15 bg-white/2 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter cases by target seed, type, or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-lg pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-white/35 focus:outline-none focus:border-white/60"
            />
          </div>
        </div>

        {importError && (
          <div className="px-6 py-2 bg-white/10 border-b border-white/20 flex items-center space-x-2 text-[10px] text-white">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Cases List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredCases.length === 0 ? (
            <div className="py-16 text-center text-white/40 space-y-2">
              <FolderArchive className="w-10 h-10 mx-auto text-white/25" />
              <p className="text-xs uppercase tracking-widest text-white/60">No Cases in Vault</p>
              <p className="text-[10px] text-white/40 max-w-sm mx-auto">
                Completed investigations will automatically archive here, or you can manually snapshot investigations from the settings menu.
              </p>
            </div>
          ) : (
            filteredCases.map((item) => {
              const displayTarget = opsecEnabled
                ? redactText(item.targetValue, true)
                : item.targetValue;
              const badgeClass = RISK_BADGE_STYLE[item.riskLevel] || RISK_BADGE_STYLE.LOW;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/8 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/30 bg-white/10 text-white/90">
                        {item.targetType}
                      </span>
                      <span className="font-bold text-xs text-white truncate max-w-md">
                        {displayTarget}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded border ${badgeClass}`}>
                        {item.riskLevel} {item.riskScore}/100
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-[10px] text-white/50">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{item.dateStr}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Network className="w-3 h-3" />
                        <span>{item.nodeCount} entities • {item.edgeCount} edges</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onLoadCase(item);
                        onClose();
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white text-black font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity shadow"
                      title="Load this investigation into current workspace"
                    >
                      <span>Load Case</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => exportCaseAsJson(item)}
                      className="p-1.5 rounded-lg border border-white/25 text-white/70 hover:text-white hover:border-white transition-colors"
                      title="Export Case Bundle (.json)"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteCase(item.id)}
                      className="p-1.5 rounded-lg border border-white/25 text-white/50 hover:text-white hover:border-white/60 transition-colors"
                      title="Delete Case from Vault"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/15 bg-white/5 flex items-center justify-between text-[10px] text-white/50 flex-shrink-0">
          <span>
            {cases.length} stored case{cases.length === 1 ? '' : 's'} in vault
          </span>
          {cases.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all archived cases?')) {
                  onClearAllCases();
                }
              }}
              className="text-white/40 hover:text-white transition-colors uppercase tracking-widest text-[9px]"
            >
              Purge Vault
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
