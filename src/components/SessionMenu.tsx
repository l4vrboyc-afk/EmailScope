import { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal, Database, Trash2, Shield, FolderArchive, BookmarkPlus, KeyRound
} from 'lucide-react';

interface SessionMenuProps {
  persistEnabled: boolean;
  onTogglePersist: () => void;
  onClearSession: () => void;
  hasSession: boolean;
  // Feature 1: OpSec Mode
  opsecEnabled: boolean;
  onToggleOpsec: () => void;
  // Feature 2: Case Vault
  onOpenCaseVault: () => void;
  onSaveCurrentCase: () => void;
  caseCount: number;
  // Feature 3: Threat Feeds & API Keys
  onOpenApiKeys: () => void;
  // Feature 5: Engine Mode
  onOpenEngineMode?: () => void;
  isNative?: boolean;
}

export default function SessionMenu({
  persistEnabled,
  onTogglePersist,
  onClearSession,
  hasSession,
  opsecEnabled,
  onToggleOpsec,
  onOpenCaseVault,
  onSaveCurrentCase,
  caseCount,
  onOpenApiKeys,
  onOpenEngineMode,
  isNative = false,
}: SessionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      {/* Three-dot trigger with active badge if OpSec or Persist is ON */}
      <button
        type="button"
        id="session-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        className={`relative w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
          open
            ? 'bg-white/15 border-white/50 text-white'
            : 'bg-white/8 border-white/25 text-white/60 hover:border-white/45 hover:text-white'
        }`}
        title="Settings & Workstation Features"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="w-4 h-4" />
        {opsecEnabled && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-pulse" />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />

          <div
            role="menu"
            className="absolute right-0 top-full mt-2 z-30 w-72 bg-black/95 border border-white/25 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="px-3.5 py-2.5 border-b border-white/12 flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">
                Workstation Settings
              </span>
              {onOpenEngineMode ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenEngineMode();
                    setOpen(false);
                  }}
                  className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border text-[8px] font-mono uppercase tracking-wider transition-all ${
                    isNative
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-white/10 border-white/25 text-white/70 hover:border-white/50 hover:text-white'
                  }`}
                  title="Click to view engine execution mode status"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isNative ? 'bg-black' : 'bg-white animate-pulse'}`} />
                  <span>{isNative ? 'Native' : 'Browser'}</span>
                </button>
              ) : (
                <span className="text-[8px] font-mono uppercase tracking-wider text-white/50 bg-white/10 px-1.5 py-0.5 rounded border border-white/20">
                  ThreatScope OSINT
                </span>
              )}
            </div>

            {/* FEATURE 1: OpSec / Presentation Redaction Guard */}
            <div className="px-3.5 py-3 border-b border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Shield className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
                    <span className="text-[10px] font-mono text-white/95 uppercase tracking-wider font-bold">
                      OpSec Redaction Shield
                    </span>
                  </div>
                  <p className="text-[9px] font-mono text-white/45 leading-relaxed">
                    Live PII sanitization. Masks target emails, IPs, usernames &amp; labels for leak-proof screen sharing and presentations.
                  </p>
                </div>

                {/* OpSec Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={opsecEnabled}
                  onClick={onToggleOpsec}
                  className={`relative flex-shrink-0 w-9 h-5 rounded-full border transition-all duration-200 focus:outline-none mt-0.5 ${
                    opsecEnabled
                      ? 'bg-white border-white'
                      : 'bg-white/10 border-white/30 hover:border-white/50'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      opsecEnabled
                        ? 'translate-x-4 bg-black'
                        : 'translate-x-0 bg-white/60'
                    }`}
                  />
                </button>
              </div>

              {/* Status indicator */}
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    opsecEnabled ? 'bg-white animate-pulse' : 'bg-white/20'
                  }`}
                />
                <span className="text-[9px] font-mono text-white/50">
                  {opsecEnabled ? 'Shield Active — PII Sanitized' : 'Shield Inactive — Full Data'}
                </span>
              </div>
            </div>

            {/* FEATURE 2: Investigation Case Vault */}
            <div className="px-3.5 py-2.5 border-b border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FolderArchive className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-[10px] font-mono text-white/90 uppercase tracking-wider font-bold">
                    Case Vault
                  </span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/15 border border-white/30 text-white/80">
                  {caseCount} SAVED
                </span>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onOpenCaseVault();
                    setOpen(false);
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-lg border border-white/30 bg-white/10 text-[9px] font-mono text-white uppercase tracking-wider hover:bg-white hover:text-black transition-colors text-center font-bold"
                >
                  Open Vault
                </button>

                <button
                  type="button"
                  disabled={!hasSession}
                  onClick={() => {
                    onSaveCurrentCase();
                    setOpen(false);
                  }}
                  className="py-1.5 px-2.5 rounded-lg border border-white/25 text-[9px] font-mono text-white/70 uppercase tracking-wider hover:border-white/50 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                  title="Save current investigation to Case Vault"
                >
                  <BookmarkPlus className="w-3 h-3" />
                  <span>Snapshot</span>
                </button>
              </div>
            </div>

            {/* FEATURE 3: Threat Feeds & API Credentials */}
            <div className="px-3.5 py-2.5 border-b border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-[10px] font-mono text-white/95 uppercase tracking-wider font-bold">
                    API Keys
                  </span>
                </div>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white text-black font-bold uppercase tracking-wider">
                  Zero-Config
                </span>
              </div>
              <p className="text-[9px] font-mono text-white/45 leading-relaxed">
                Configure custom API credentials for HIBP, Shodan &amp; DNS intelligence.
              </p>
              <button
                type="button"
                onClick={() => {
                  onOpenApiKeys();
                  setOpen(false);
                }}
                className="w-full py-1.5 px-2.5 rounded-lg border border-white/30 bg-white/10 text-[9px] font-mono text-white hover:bg-white hover:text-black uppercase tracking-wider transition-colors text-center font-bold flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3 h-3" />
                <span>Configure API Keys</span>
              </button>
            </div>

            {/* FEATURE 4: Persist Session Toggle */}
            <div className="px-3.5 py-3 border-b border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Database className="w-3 h-3 text-white/60 flex-shrink-0" />
                    <span className="text-[10px] font-mono text-white/90 uppercase tracking-wider">
                      Persist Session
                    </span>
                  </div>
                  <p className="text-[9px] font-mono text-white/40 leading-relaxed">
                    Saves your investigation across page refreshes. Reloading restores graph &amp; cards.
                  </p>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={persistEnabled}
                  onClick={onTogglePersist}
                  className={`relative flex-shrink-0 w-9 h-5 rounded-full border transition-all duration-200 focus:outline-none mt-0.5 ${
                    persistEnabled
                      ? 'bg-white border-white'
                      : 'bg-white/10 border-white/30 hover:border-white/50'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      persistEnabled
                        ? 'translate-x-4 bg-black'
                        : 'translate-x-0 bg-white/60'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Clear Session */}
            <button
              type="button"
              role="menuitem"
              disabled={!hasSession}
              onClick={() => {
                onClearSession();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left font-mono transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white/65 hover:bg-white/8 hover:text-white"
            >
              <Trash2 className="w-3.5 h-3.5 flex-shrink-0 text-white/50" />
              <span>
                <span className="block text-[10px] uppercase tracking-wider text-white/80">
                  Clear Workspace
                </span>
                <span className="block text-[8px] text-white/40">
                  Resets current graph and intelligence cards
                </span>
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
