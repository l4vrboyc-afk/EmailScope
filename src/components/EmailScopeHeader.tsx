/**
 * ThreatScopeHeader — Cyber-SOC command bar.
 *
 * Layout: logo/brand + engine status | view switcher (Workbench / Threat Radar)
 * | centered target input + search | MAP toggle, EXPORT dropdown, "···" session menu.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Search, RefreshCw, FileDown, FileJson, Printer, MapPin,
  X, Archive
} from 'lucide-react';
import SeedTypeDropdown from './SeedTypeDropdown';
import SessionMenu from './SessionMenu';
import { engineMode } from '../api/engine';
import type { SeedType } from '../api/types';

interface ThreatScopeHeaderProps {
  seedValue: string;
  onSeedValueChange: (v: string) => void;
  seedType: SeedType;
  onSeedTypeChange: (v: SeedType) => void;
  onRunInvestigation: () => void;
  onCancel: () => void;
  loading: boolean;
  hasSession: boolean;
  showMap: boolean;
  onToggleMap: () => void;
  onExportJson: () => void;
  onExportPdf: () => void;
  // Session menu passthroughs
  opsecEnabled: boolean;
  onToggleOpsec: () => void;
  persistEnabled: boolean;
  onTogglePersist: () => void;
  onClearSession: () => void;
  onOpenCaseVault: () => void;
  onSaveCurrentCase: () => void;
  caseCount: number;
  onOpenApiKeys: () => void;
  // View mode switcher
  activeView?: 'workbench' | 'radar';
  onViewChange?: (view: 'workbench' | 'radar') => void;
}

export default function ThreatScopeHeader({
  seedValue, onSeedValueChange, seedType, onSeedTypeChange,
  onRunInvestigation, onCancel, loading, hasSession, showMap, onToggleMap,
  onExportJson, onExportPdf,
  opsecEnabled, onToggleOpsec, persistEnabled, onTogglePersist,
  onClearSession, onOpenCaseVault, onSaveCurrentCase, caseCount, onOpenApiKeys,
  activeView = 'workbench', onViewChange,
}: ThreatScopeHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    if (exportOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportOpen]);

  // Global shortcut: Ctrl+K or Cmd+K focuses search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onRunInvestigation();
  };

  return (
    <header className="h-[72px] flex-shrink-0 border-b border-white/[0.1] bg-[#000000]/95 backdrop-blur-xl px-4 flex items-center justify-between gap-4 z-30 shadow-lg shadow-black/60">
      {/* Left: Brand + Engine status badge */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative group cursor-pointer" onClick={() => onViewChange?.('radar')}>
          <img
            src="/logo.png"
            alt="ThreatScope"
            className="w-10 h-10 rounded-xl object-contain border border-white/20 bg-black/60 p-1 transition-transform group-hover:scale-105"
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-mono font-black text-sm tracking-[0.18em] uppercase text-white truncate">
              ThreatScope
            </h1>
            <span
              className="flex-shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/20 bg-white/[0.04] text-[9px] font-mono tracking-wider text-white/80"
              title={engineMode === 'native'
                ? 'Native engine: Local Python sidecar backend active'
                : 'Browser engine: Web client OSINT'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
              <span className="capitalize">{engineMode === 'native' ? 'Core' : 'Browser'}</span>
            </span>
          </div>
          <p className="text-[9px] font-mono tracking-[0.16em] text-white/40 uppercase">
            OSINT & Threat Intelligence Workstation
          </p>
        </div>

      </div>

      {/* Center: target seed form */}
      <form onSubmit={submit} className="flex items-center gap-2 flex-1 max-w-xl justify-center">
        <SeedTypeDropdown value={seedType} onChange={onSeedTypeChange} />

        <div className="relative flex-1 min-w-0 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none group-focus-within:text-white transition-colors" />
          <input
            ref={inputRef}
            type="text"
            placeholder={
              seedType === 'url'
                ? 'Check malicious URL / link — e.g. https://phishing-site.xyz/login...'
                : seedType === 'domain'
                ? 'Target domain — e.g. example.com...'
                : seedType === 'ip'
                ? 'Target IP address — e.g. 192.0.2.1...'
                : seedType === 'phone'
                ? 'Phone number — e.g. +1 555 000 0000...'
                : seedType === 'username'
                ? 'Target username / alias — e.g. cyber_analyst...'
                : 'Target seed email — e.g. target@example.com...'
            }
            value={seedValue}
            onChange={(e) => onSeedValueChange(e.target.value)}
            className="w-full bg-[#080808] border border-white/20 rounded-lg pl-9 pr-14 py-2 text-xs
                       font-mono text-white placeholder-white/30 focus:outline-none focus:border-white
                       focus:ring-1 focus:ring-white/20 transition-all shadow-inner shadow-black/50"
          />
          {seedValue ? (
            <button
              type="button"
              onClick={() => onSeedValueChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:flex items-center">
              <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-white/40">
                ⌘K
              </kbd>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !seedValue.trim()}
          className="bg-white hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:border-neutral-800 disabled:cursor-not-allowed
                     text-black font-mono font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-lg
                     transition-all flex-shrink-0 flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white active:scale-95"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
              <span>Scanning</span>
            </>
          ) : (
            <span>Investigate</span>
          )}
        </button>

        {loading && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/25 font-mono font-bold text-[10px]
                       uppercase tracking-widest px-3 py-2.5 rounded-lg transition-colors flex-shrink-0"
          >
            Cancel
          </button>
        )}
      </form>

      {/* Right: Case Vault / MAP / EXPORT / session menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onOpenCaseVault}
          title="Open Case Vault"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 bg-white/[0.03]
                     text-[10px] font-mono font-bold uppercase tracking-widest text-white/75
                     hover:border-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
        >
          <Archive className="w-3.5 h-3.5 text-white/80" />
          <span>Case Vault</span>
          {caseCount > 0 && (
            <span className="bg-white text-black text-[9px] px-1.5 py-0.2 rounded-full font-bold leading-tight">
              {caseCount}
            </span>
          )}
        </button>

        {activeView === 'workbench' && (
          <button
            type="button"
            onClick={onToggleMap}
            title={showMap ? 'Hide Geo-Map widget' : 'Show Geo-Map widget'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-mono font-bold
                        uppercase tracking-widest transition-all ${
                          showMap
                            ? 'bg-white text-black border-white shadow-sm'
                            : 'bg-white/[0.03] text-white/70 border-white/15 hover:border-white/40 hover:text-white'
                        }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
        )}

        <div className="relative" ref={exportRef}>
          <button
            type="button"
            onClick={() => setExportOpen((v) => !v)}
            disabled={!hasSession}
            title={hasSession ? 'Export incident report' : 'Run an investigation first'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 bg-white/[0.03]
                       text-[10px] font-mono font-bold uppercase tracking-widest text-white/75
                       hover:border-white/40 hover:text-white transition-all
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {exportOpen && (
            <div className="absolute right-0 top-full mt-2 z-40 w-64 bg-[#080808]/98 border border-white/20
                            rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl divide-y divide-white/[0.08]">
              <div className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-widest text-white/40">
                Incident Report Format
              </div>
              <button
                type="button"
                onClick={() => { onExportJson(); setExportOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white/85
                           hover:bg-white/[0.08] transition-colors text-left"
              >
                <FileJson className="w-4 h-4 text-white/80 flex-shrink-0" />
                <div>
                  <span className="font-bold block text-[10px] uppercase tracking-wider text-white">JSON Report</span>
                  <span className="text-white/40 text-[9px]">Structured, machine-readable format</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { onExportPdf(); setExportOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white/85
                           hover:bg-white/[0.08] transition-colors text-left"
              >
                <Printer className="w-4 h-4 text-white/80 flex-shrink-0" />
                <div>
                  <span className="font-bold block text-[10px] uppercase tracking-wider text-white">Print / PDF Brief</span>
                  <span className="text-white/40 text-[9px]">Print-ready incident summary</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Workstation session menu */}
        <SessionMenu
          hasSession={hasSession}
          opsecEnabled={opsecEnabled}
          onToggleOpsec={onToggleOpsec}
          persistEnabled={persistEnabled}
          onTogglePersist={onTogglePersist}
          onClearSession={onClearSession}
          onOpenCaseVault={onOpenCaseVault}
          onSaveCurrentCase={onSaveCurrentCase}
          caseCount={caseCount}
          onOpenApiKeys={onOpenApiKeys}
        />
      </div>
    </header>
  );
}
