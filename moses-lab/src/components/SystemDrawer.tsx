import React, { useEffect } from 'react';
import { SystemProject } from '../data/systems';

interface SystemDrawerProps {
  system: SystemProject | null;
  onClose: () => void;
}

export const SystemDrawer: React.FC<SystemDrawerProps> = ({ system, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (system) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [system, onClose]);

  if (!system) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside 
        className="drawer-panel" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="mono" style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>
                {system.code}
              </span>
              <span className="mono" style={{ 
                fontSize: '0.7rem', 
                padding: '2px 6px', 
                background: 'var(--accent-dim)', 
                border: '1px solid var(--accent-border)',
                color: 'var(--accent)',
                borderRadius: '2px'
              }}>
                {system.status}
              </span>
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>{system.title}</h2>
            <p className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
              {system.category}
            </p>
          </div>

          <button 
            className="drawer-close mono"
            onClick={onClose}
            aria-label="Close panel"
          >
            ESC ✕
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', lineHeight: 1.7 }}>
            {system.longDesc}
          </p>
        </div>

        <div className="drawer-section-title">SYSTEM ARCHITECTURE SCHEMATIC</div>
        <pre className="ascii-box">
          <code>{system.asciiDiagram}</code>
        </pre>

        <div className="drawer-section-title">THE PROBLEM SOLVED</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          {system.problemSolved}
        </p>

        <div className="drawer-section-title">ARCHITECTURAL HIGHLIGHTS</div>
        <ul className="drawer-list" style={{ marginBottom: '1.5rem' }}>
          {system.architecturalHighlights.map((highlight, index) => (
            <li key={index} className="drawer-list-item">
              <span>›</span>
              <span>{highlight}</span>
            </li>
          ))}
        </ul>

        <div className="drawer-section-title">TECHNOLOGY SUBSTRATE</div>
        <div className="card-tags" style={{ marginBottom: '2rem' }}>
          {system.technologies.map((tech, idx) => (
            <span key={idx} className="tech-tag">{tech}</span>
          ))}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {system.repoUrl && (
            <a 
              href={system.repoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="channel-btn primary mono"
              style={{ textDecoration: 'none' }}
            >
              <span>INSPECT REPOSITORY</span>
              <span>↗</span>
            </a>
          )}
          <button 
            className="channel-btn mono"
            onClick={onClose}
          >
            CLOSE TEARDOWN
          </button>
        </div>
      </aside>
    </div>
  );
};
