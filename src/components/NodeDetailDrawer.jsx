/**
 * NodeDetailDrawer — Cyber Contextual Entity Overlay.
 *
 * An absolute-positioned floating glassmorphic panel over the graph workspace.
 * Features:
 *  - Entity identification with copy action
 *  - Structured metadata (MX, SPF, DMARC, BIMI, registrar)
 *  - Privacy-preserving k-anonymity breach telemetry & status
 *  - Raw OSINT narrative block
 *  - Quick pivot and scan execution buttons
 */
import { useEffect, useState } from 'react';
import {
  X, Network, ShieldCheck, FileText, Database,
  Loader2, ScanSearch, Copy, Check,
} from 'lucide-react';
import { redactText } from '../utils/redaction';

const TABS = [
  { key: 'metadata', label: 'Metadata',  icon: Database },
  { key: 'breach',   label: 'Breach Telemetry', icon: ShieldCheck },
  { key: 'raw',      label: 'Raw OSINT', icon: FileText },
];

const RISK_STYLES = {
  CRITICAL:   'bg-rose-950/80 text-rose-300 border-rose-500/50 font-bold shadow-[0_0_10px_rgba(244,63,94,0.25)]',
  HIGH:       'bg-amber-950/80 text-amber-300 border-amber-500/50 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]',
  MEDIUM:     'bg-yellow-950/60 text-yellow-300 border-yellow-500/40 font-semibold',
  CLEAN:      'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 font-semibold shadow-[0_0_8px_rgba(16,185,129,0.15)]',
  INFO:       'bg-sky-950/60 text-sky-300 border-sky-500/30',
  UNVERIFIED: 'bg-white/[0.03] text-white/40 border-white/10',
};

function riskStyle(level) {
  return RISK_STYLES[level] || RISK_STYLES.INFO;
}

/** Single key/value metadata row */
function MetaRow({ label, value, mono = false, bright = false, opsec = false }) {
  if (value === undefined || value === null || value === '') return null;
  const rawDisplay = Array.isArray(value) ? value.join(', ') || '—' : String(value);
  const display = opsec ? redactText(rawDisplay, true) : rawDisplay;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-white/[0.06] last:border-0">
      <span className="text-[9px] font-mono text-white/45 uppercase tracking-widest flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className={`text-[10px] text-right break-all ${mono ? 'font-mono' : ''} ${bright ? 'text-white font-medium' : 'text-white/80'}`}>
        {display}
      </span>
    </div>
  );
}

/** Boolean posture row */
function BoolRow({ label, value, trueLabel = '✓ Present', falseLabel = '✗ Missing', warn = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-white/[0.06] last:border-0">
      <span className="text-[9px] font-mono text-white/45 uppercase tracking-widest flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-[10px] font-mono ${value ? 'text-emerald-400 font-bold' : warn ? 'text-rose-400 font-bold' : 'text-neutral-500'}`}>
        {value ? trueLabel : falseLabel}
      </span>
    </div>
  );
}

function MetadataTab({ data, opsecEnabled }) {
  const m = data?.metadata || {};
  const hasBool = (k) => typeof m[k] === 'boolean';
  const postureRows = ['has_spf', 'has_dmarc', 'has_bimi'].filter(hasBool);

  const genericRows = Object.entries(m).filter(
    ([k, v]) =>
      !['is_key_pivot_node', 'is_new_discovery', 'degree_centrality',
        'k_anonymity', 'breach_telemetry', 'has_spf', 'has_dmarc', 'has_bimi',
        'raw_text_description', 'raw_osint_text', 'style', 'data', 'risk_level'].includes(k) &&
      v !== undefined && v !== null && v !== '' &&
      !(Array.isArray(v) && v.length === 0)
  );

  return (
    <div className="space-y-0.5">
      {postureRows.map((k) => (
        <BoolRow
          key={k}
          label={k.replace(/^has_/, '').toUpperCase()}
          value={m[k]}
          warn={k === 'has_spf' || k === 'has_dmarc'}
        />
      ))}
      <MetaRow label="MX Records" value={m.mx_records} mono opsec={opsecEnabled} />
      <MetaRow label="MX Hosts" value={m.mx_host_details?.map((h) => h?.host || h).filter(Boolean)} mono opsec={opsecEnabled} />
      {genericRows.map(([k, v]) => (
        <MetaRow
          key={k}
          label={String(k).replace(/_/g, ' ')}
          value={typeof v === 'object' ? JSON.stringify(v) : v}
          opsec={opsecEnabled}
        />
      ))}
      {genericRows.length === 0 && postureRows.length === 0 && !m.mx_records && (
        <p className="text-[10px] text-white/40 font-mono py-2 italic">No structured metadata on this entity.</p>
      )}
    </div>
  );
}

function BreachTab({ data }) {
  const ka = data?.kAnonymityStatus;
  if (!ka) {
    return (
      <p className="text-[10px] text-white/40 font-mono py-3 italic">
        No k-anonymity breach telemetry attached to this node. Run a scan to query HIBP hash prefixes.
      </p>
    );
  }
  const verified = ka.status === 'verified';
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 py-1.5 border-b border-white/[0.06]">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest border ${riskStyle(ka.threat_level)}`}>
          {String(ka.threat_level).toUpperCase()}
        </span>
        <span className={`text-[9px] font-mono uppercase tracking-widest ${verified ? 'text-white' : 'text-white/45'}`}>
          {verified ? 'k-Anonymity Verified' : 'Unverified (grace state)'}
        </span>
      </div>
      <MetaRow label="Compromised" value={verified ? (ka.compromised ? 'YES (Exposure Confirmed)' : 'NO') : 'UNKNOWN'} bright={verified && ka.compromised} mono />
      <MetaRow label="Pwned Occurrences" value={verified ? `${ka.pwned_count} sources` : '—'} mono bright={verified && ka.pwned_count > 0} />
      <MetaRow label="k-Prefix Range Bucket" value={ka.k_anonymity_bucket_size ? `${ka.k_anonymity_bucket_size} hashes` : '—'} mono />
      <MetaRow label="Local Cache Hit" value={ka.cache_hit ? 'YES (prefix LRU)' : 'NO'} mono />
      {ka.reason && <MetaRow label="Telemetry Note" value={ka.reason} />}
    </div>
  );
}

function RawTab({ data, opsecEnabled }) {
  const raw = data?.rawOSINTText;
  const text = opsecEnabled && raw ? redactText(raw, true) : raw;
  if (!text) {
    return (
      <p className="text-[10px] text-white/40 font-mono py-2 italic">
        No raw OSINT narrative stored on this node.
      </p>
    );
  }
  return (
    <pre className="whitespace-pre-wrap break-words text-[10px] font-mono text-white/80 leading-relaxed py-1 max-h-32 overflow-y-auto pr-1 bg-black/40 p-2.5 rounded-lg border border-white/[0.04]">
      {text}
    </pre>
  );
}

export default function NodeDetailDrawer({
  node,
  onClose,
  onPivot,
  onKAnonymityScan,
  opsecEnabled = false,
  pivoting = false,
}) {
  const [activeTab, setActiveTab] = useState('metadata');
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (node) setActiveTab('metadata');
  }, [node?.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!node) return null;

  const displayLabel = opsecEnabled ? redactText(node.label, true) : node.label;
  const level = node.riskLevel || 'INFO';

  const handleCopy = () => {
    navigator.clipboard.writeText(node.label || node.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleKAnonymityScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      if (onKAnonymityScan) await onKAnonymityScan(node);
      setActiveTab('breach');
    } finally {
      setTimeout(() => setScanning(false), 450);
    }
  };

  const handlePivot = () => {
    if (onPivot && !pivoting) onPivot(node);
  };

  return (
    <div
      className="w-full h-full flex flex-col flex-shrink-0
                 bg-[#080808] border border-white/15 rounded-xl
                 shadow-2xl overflow-hidden font-mono"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-white/[0.08] flex-shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-widest border flex-shrink-0 ${riskStyle(level)}`}
          >
            {node.badge?.includes('•') ? node.badge : `${(node.category || 'identity').toUpperCase()} • INFO`}
          </span>
          <span className="text-[12px] font-mono font-bold text-white truncate" title={node.id}>
            {displayLabel}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="Copy identifier"
          >
            {copied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
          </button>
          {node.relationship && (
            <span className="hidden sm:inline text-[9px] font-mono text-white/60 truncate max-w-[220px]">
              linked via {node.relationship}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors flex-shrink-0"
          title="Reset to target seed"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Tab strip ── */}
      <div className="flex items-center gap-1 px-4 pt-1.5 flex-shrink-0 border-b border-white/[0.04] bg-black/20">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-all border-b-2 ${
              activeTab === key
                ? 'text-white border-white bg-white/10 font-bold'
                : 'text-white/40 border-transparent hover:text-white/80 hover:bg-white/[0.03]'
            }`}
          >
            <Icon className="w-3 h-3" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2.5">
        {activeTab === 'metadata' && <MetadataTab data={node.data} opsecEnabled={opsecEnabled} />}
        {activeTab === 'breach'   && <BreachTab data={node.data} />}
        {activeTab === 'raw'      && <RawTab data={node.data} opsecEnabled={opsecEnabled} />}
      </div>

      {/* ── Action bar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-white/[0.08] flex-shrink-0 bg-white/[0.02]">
        <button
          type="button"
          onClick={handlePivot}
          disabled={pivoting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-[9px]
                     font-mono font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed shadow-md border border-white active:scale-95"
          title="Pivot deep OSINT investigation on this entity"
        >
          {pivoting ? <Loader2 className="w-3 h-3 animate-spin text-black" /> : <Network className="w-3 h-3" />}
          <span>Pivot Target</span>
        </button>

        <button
          type="button"
          onClick={handleKAnonymityScan}
          disabled={scanning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-white
                     text-[9px] font-mono font-bold uppercase tracking-widest hover:bg-white/10
                     transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white/5"
          title="Run privacy-preserving k-anonymity breach verification"
        >
          {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanSearch className="w-3 h-3" />}
          <span>Run k-Anonymity Scan</span>
        </button>

        <span className="ml-auto flex items-center gap-1 text-[8px] font-mono text-white/35 uppercase tracking-widest">
          Node Telemetry Inspector
        </span>
      </div>
    </div>
  );
}
