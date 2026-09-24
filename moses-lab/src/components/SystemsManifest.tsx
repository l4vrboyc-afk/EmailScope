import React from 'react';
import { SYSTEMS_DATA, SystemProject } from '../data/systems';

interface SystemsManifestProps {
  onSelectSystem: (system: SystemProject) => void;
}

export const SystemsManifest: React.FC<SystemsManifestProps> = ({ onSelectSystem }) => {
  return (
    <section className="section-wrapper" id="systems">
      <div className="section-header">
        <div>
          <span className="section-code">// 01. SYSTEMS MANIFEST</span>
          <h2 className="section-heading">ENGINEERED WORKSTATIONS</h2>
        </div>
        <p className="section-desc">
          Custom software, machine interaction systems, and adversarial testing topologies built under concrete functional constraints.
        </p>
      </div>

      <div className="systems-grid">
        {SYSTEMS_DATA.map((sys) => (
          <article 
            key={sys.id} 
            className="system-card"
            onClick={() => onSelectSystem(sys)}
            style={{ cursor: 'pointer' }}
          >
            <div>
              <div className="card-top">
                <span className="card-index mono">{sys.code}</span>
                <span className="card-status mono">{sys.status}</span>
              </div>

              <h3 className="card-title">{sys.title}</h3>
              <div className="card-subtitle">{sys.category}</div>
              <p className="card-desc">{sys.shortDesc}</p>
            </div>

            <div>
              <div className="card-tags">
                {sys.technologies.slice(0, 4).map((tech, idx) => (
                  <span key={idx} className="tech-tag">{tech}</span>
                ))}
              </div>

              <div className="card-action">
                <span className="mono" style={{ color: 'var(--text-muted)' }}>
                  {sys.liveStatus}
                </span>
                <span className="action-inspect mono">
                  <span>DECONSTRUCT</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
