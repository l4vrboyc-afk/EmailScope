import React from 'react';
import { SUBSTRATE_DATA } from '../data/substrate';

export const SubstrateGrid: React.FC = () => {
  return (
    <section className="section-wrapper" id="substrate">
      <div className="section-header">
        <div>
          <span className="section-code">// 02. INSTRUMENTATION & SUBSTRATES</span>
          <h2 className="section-heading">AGENTIC RUNTIMES & TOOLCHAINS</h2>
        </div>
        <p className="section-desc">
          Frontier AI agents and low-level software environments deployed as cognitive amplifiers and execution harnesses.
        </p>
      </div>

      <div className="substrate-grid">
        {SUBSTRATE_DATA.map((item, index) => (
          <div key={index} className="substrate-item">
            <span className="substrate-tag">{item.sector}</span>
            <h3 className="substrate-name">{item.name}</h3>
            <p className="substrate-role" style={{ marginBottom: '0.8rem' }}>{item.role}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {item.depth}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
