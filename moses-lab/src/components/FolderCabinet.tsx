import React, { useState } from 'react';
import { Folder, Terminal, ShieldCheck, Activity } from 'lucide-react';
import { SYSTEMS_DATA, SystemProject } from '../data/systems';

interface FolderCabinetProps {
  onSelectSystem: (system: SystemProject) => void;
}

export const FolderCabinet: React.FC<FolderCabinetProps> = ({ onSelectSystem }) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const current = SYSTEMS_DATA[activeTab];

  return (
    <section className="section-wrapper" id="folder-cabinet">
      <div className="section-header">
        <div>
          <span className="section-code">// 01. WORKSTATION ARCHIVE</span>
          <h2 className="section-heading" style={{ fontSize: '2rem' }}>
            SYSTEMS DOSSIER BINDER
          </h2>
        </div>
        <p className="section-desc">
          Compact technical binder with full topology dataflow and specs for primary builds.
        </p>
      </div>

      {/* Compact Engineering Folder Container */}
      <div className="folder-compact-wrapper spotlight-card">
        {/* Compact Folder Tabs */}
        <div className="folder-tabs-header">
          {SYSTEMS_DATA.map((sys, idx) => {
            const isActive = activeTab === idx;
            return (
              <button
                key={sys.id}
                className={`folder-tab-btn mono ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(idx)}
              >
                <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-accent' : ''}`} />
                <span>{sys.code.split(' // ')[0]}_{idx + 1}</span>
                <span className="tab-title-text">{sys.title}</span>
                {isActive && <span className="tab-active-dot"></span>}
              </button>
            );
          })}
        </div>

        {/* Compact Folder Content */}
        <div className="folder-compact-body">
          <div className="folder-compact-grid">
            {/* Left Column: Metadata & Brief */}
            <div className="folder-compact-left">
              <div className="folder-file-meta mono" style={{ marginBottom: '12px' }}>
                <div className="meta-row">
                  <span className="meta-k">FILE:</span>
                  <span className="meta-v text-accent">{current.code} // {current.id}.spec</span>
                </div>
                <div className="meta-row">
                  <span className="meta-k">STATUS:</span>
                  <span className="meta-v" style={{ color: 'var(--status-nominal)' }}>
                    ● {current.status}
                  </span>
                </div>
              </div>

              <h3 className="folder-compact-title">{current.title}</h3>
              <p className="folder-compact-desc">{current.shortDesc}</p>

              <div className="folder-compact-problem">
                <div className="problem-label mono">
                  <ShieldCheck className="w-3 h-3 text-accent" />
                  <span>PROBLEM ADDRESSED</span>
                </div>
                <p className="problem-text" style={{ fontSize: '0.82rem' }}>
                  {current.problemSolved}
                </p>
              </div>

              <button
                className="channel-btn primary mono"
                onClick={() => onSelectSystem(current)}
                style={{ padding: '8px 16px', fontSize: '0.78rem' }}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>DECONSTRUCT BLUEPRINT</span>
                <span>→</span>
              </button>
            </div>

            {/* Right Column: Compact Topology & Specs */}
            <div className="folder-compact-right">
              <div className="schematic-header mono">
                <div className="schematic-title">
                  <Terminal className="w-3 h-3 text-accent" />
                  <span>TOPOLOGY // DATAFLOW</span>
                </div>
                <span className="schematic-live-pill" style={{ fontSize: '0.62rem' }}>RENDERED</span>
              </div>

              <pre className="folder-compact-ascii mono">
                <code>{current.asciiDiagram}</code>
              </pre>

              <div className="folder-tech-row" style={{ paddingTop: '10px' }}>
                <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>STACK:</span>
                {current.technologies.map((t, idx) => (
                  <span key={idx} className="tech-tag mono" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
