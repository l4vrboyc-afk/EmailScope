/**
 * LegalFingerprintBadge — B&W, lighter edition.
 */
import { useState } from 'react';
import { ShieldCheck, Lock, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

function truncate(str, n = 16) {
  if (!str) return '—';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export default function LegalFingerprintBadge({ fingerprint }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!fingerprint || !fingerprint.evidence_sha256) return null;

  const isSealed = fingerprint.integrity_status === 'SEALED';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fingerprint.evidence_sha256);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${isSealed ? 'border-white/40 bg-white/8' : 'border-white/20 bg-white/4'}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left gap-2 hover:bg-white/8 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className={`w-4 h-4 flex-shrink-0 ${isSealed ? 'text-white' : 'text-white/45'}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${isSealed ? 'text-white' : 'text-white/50'}`}>
                {isSealed ? 'Evidence Sealed' : 'Integrity Unknown'}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse ${isSealed ? 'bg-white' : 'bg-white/40'}`} />
            </div>
            <span className="font-mono text-[9px] text-white/55 block truncate">
              SHA-256: {truncate(fingerprint.evidence_sha256, 24)}
            </span>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-white/45 flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-white/45 flex-shrink-0" />
        }
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-0 space-y-2.5 border-t border-white/15">
          {/* SHA-256 */}
          <div className="flex items-start gap-2 mt-2.5">
            <Lock className="w-3 h-3 text-white/45 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-mono text-white/45 block uppercase tracking-widest mb-0.5">SHA-256 Evidence Digest</span>
              <div className="flex items-center gap-1.5">
                <code className="font-mono text-[9px] text-white/85 break-all leading-relaxed flex-1">
                  {fingerprint.evidence_sha256}
                </code>
                <button type="button" onClick={handleCopy} title="Copy SHA-256"
                  className="flex-shrink-0 p-1 rounded hover:bg-white/15 text-white/50 hover:text-white transition-colors">
                  {copied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px] font-mono">
            <div>
              <span className="text-white/40 uppercase tracking-widest block">Evidence ID</span>
              <code className="text-white/75 break-all">{truncate(fingerprint.evidence_id, 18)}</code>
            </div>
            <div>
              <span className="text-white/40 uppercase tracking-widest block">Algorithm</span>
              <span className="text-white/75">{fingerprint.algorithm || '—'}</span>
            </div>
            <div>
              <span className="text-white/40 uppercase tracking-widest block">Timestamp UTC</span>
              <span className="text-white/75">
                {fingerprint.timestamp_utc ? new Date(fingerprint.timestamp_utc).toLocaleString() : '—'}
              </span>
            </div>
            <div>
              <span className="text-white/40 uppercase tracking-widest block">Classification</span>
              <span className={isSealed ? 'text-white' : 'text-white/50'}>
                {fingerprint.compliance_classification || '—'}
              </span>
            </div>
          </div>

          {/* Digest summary */}
          {fingerprint.digest_summary && (
            <div className="rounded-lg bg-white/8 border border-white/20 px-2.5 py-2 text-[9px] font-mono">
              <span className="text-white/45 uppercase tracking-widest block mb-1.5">Digest Summary</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/65">
                <span>target: <code className="text-white/90">{fingerprint.digest_summary.target}</code></span>
                <span>type: <code className="text-white/90">{fingerprint.digest_summary.target_type}</code></span>
                <span>entities: <code className="text-white/90">{fingerprint.digest_summary.entities_sealed}</code></span>
                <span>relations: <code className="text-white/90">{fingerprint.digest_summary.relationships_sealed}</code></span>
                <span>risk_score: <code className="text-white">{fingerprint.digest_summary.risk_score}</code></span>
              </div>
            </div>
          )}

          {/* Legal purpose */}
          <p className="text-[8px] font-mono text-white/35 leading-relaxed border-t border-white/12 pt-2">
            {fingerprint.legal_purpose}
          </p>
        </div>
      )}
    </div>
  );
}
