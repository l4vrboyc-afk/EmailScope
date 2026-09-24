/**
 * IntelligenceSummaryCard — High-Precision Monochrome Cyber Forensic Brief.
 */
import { useState } from 'react';
import {
  ChevronDown, ChevronRight, Shield, ShieldAlert, Check, Copy, FileText, Lightbulb
} from 'lucide-react';

export default function IntelligenceSummaryCard({ summary = {} }) {
  const [expandedSections, setExpandedSections] = useState({
    key_findings: true,
    pivot_opportunities: false,
    remediation_steps: true,
  });
  const [copied, setCopied] = useState(false);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCopySummary = () => {
    const text = `THREATSCOPE INTELLIGENCE BRIEFING
Target OpSec Awareness: ${summary.target_opsec_awareness || 'Unknown'}

EXECUTIVE SUMMARY:
${summary.executive_summary || 'N/A'}

KEY FINDINGS:
${(summary.key_findings || []).map(f => `• ${f}`).join('\n')}

RECOMMENDED ACTIONS:
${(summary.remediation_steps || []).map(s => `• ${s}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#080808] p-4 font-mono space-y-3.5 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white">
          <FileText className="w-3.5 h-3.5 text-white" />
          <span>Intelligence Brief</span>
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/15 bg-white/[0.04] text-[9px] text-neutral-300 hover:text-white hover:border-white/40 transition-all cursor-pointer"
            title="Copy brief to clipboard"
          >
            {copied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <span className="px-2 py-0.5 rounded-full border border-white/20 bg-white/5 text-[9px] font-bold text-neutral-300 whitespace-nowrap">
            OpSec: <span className="capitalize text-white">{summary.target_opsec_awareness || 'Standard'}</span>
          </span>
        </div>
      </div>

      {/* Executive Summary Card */}
      {summary.executive_summary && (
        <div className="rounded-lg border border-white/15 bg-neutral-900/60 p-3.5 relative">
          <p className="text-xs text-neutral-200 leading-relaxed font-sans font-normal">
            {summary.executive_summary}
          </p>
        </div>
      )}

      {/* Sections */}
      <CollapsibleSection
        title="Key Threat Findings"
        icon={ShieldAlert}
        items={summary.key_findings}
        isExpanded={expandedSections.key_findings}
        onToggle={() => toggleSection('key_findings')}
      />

      <CollapsibleSection
        title="Actionable Remediation"
        icon={Shield}
        items={summary.remediation_steps}
        isExpanded={expandedSections.remediation_steps}
        onToggle={() => toggleSection('remediation_steps')}
        priorityBadges
      />

      <CollapsibleSection
        title="Pivot Opportunities"
        icon={Lightbulb}
        items={summary.pivot_opportunities}
        isExpanded={expandedSections.pivot_opportunities}
        onToggle={() => toggleSection('pivot_opportunities')}
      />
    </div>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  items,
  isExpanded,
  onToggle,
  priorityBadges = false,
}) {
  const list = Array.isArray(items) ? items : [];

  return (
    <div className="rounded-lg border border-white/10 bg-neutral-900/30 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Icon className="w-3 h-3 text-white" />
          <span>{title}</span>
          <span className="text-[8px] text-white bg-white/10 px-1.5 py-0.2 rounded-full font-mono">
            {list.length}
          </span>
        </span>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-2.5 pt-1 space-y-1.5 border-t border-white/10">
          {list.length === 0 ? (
            <p className="text-[10px] text-neutral-500 py-1 italic">No records in this category.</p>
          ) : (
            list.map((item, idx) => {
              const priority = idx === 0 ? 'P1' : idx === 1 ? 'P2' : 'P3';
              const pStyle =
                priority === 'P1'
                  ? 'bg-white text-black border-white'
                  : priority === 'P2'
                  ? 'bg-neutral-800 text-neutral-200 border-white/20'
                  : 'bg-neutral-900 text-neutral-400 border-white/10';

              return (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2 rounded-lg bg-black border border-white/10 text-[11px] text-neutral-300"
                >
                  {priorityBadges && (
                    <span
                      className={`text-[8px] px-1.5 py-0.2 rounded border font-mono font-bold flex-shrink-0 mt-0.5 ${pStyle}`}
                    >
                      {priority}
                    </span>
                  )}
                  <span className="leading-snug break-words font-sans">{item}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
