import React, { useState } from 'react';
import { NOTEBOOK_ENTRIES } from '../data/notebook';

export const LabNotebook: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(NOTEBOOK_ENTRIES[0].id);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <section className="section-wrapper" id="dispatch">
      <div className="section-header">
        <div>
          <span className="section-code">// 03. LAB DISPATCHES</span>
          <h2 className="section-heading">FIRST-PRINCIPLES & PHILOSOPHY</h2>
        </div>
        <p className="section-desc">
          Notes on engineering under resource constraints, deconstructing systems, and the refusal to remain stagnant.
        </p>
      </div>

      <div className="notebook-entries">
        {NOTEBOOK_ENTRIES.map((entry) => {
          const isExpanded = expandedId === entry.id;
          return (
            <article 
              key={entry.id} 
              className="notebook-entry"
              style={{
                borderColor: isExpanded ? 'var(--border-active)' : 'var(--border-subtle)',
                cursor: 'pointer'
              }}
              onClick={() => toggleExpand(entry.id)}
            >
              <div className="entry-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="mono" style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>
                    {entry.index}
                  </span>
                  <h3 className="entry-title">{entry.title}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    {entry.theme}
                  </span>
                  <span className="entry-date">{entry.date}</span>
                  <span className="mono" style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>
                    {isExpanded ? '−' : '+'}
                  </span>
                </div>
              </div>

              <p className="entry-body" style={{ color: isExpanded ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {entry.excerpt}
              </p>

              {isExpanded && (
                <div style={{ 
                  marginTop: '1.2rem', 
                  paddingTop: '1.2rem', 
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  {entry.body.map((paragraph, pIdx) => (
                    <p key={pIdx} style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', lineHeight: 1.75 }}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};
