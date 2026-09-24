import React, { useState } from 'react';
import { Terminal, ArrowRight, Shield, Eye, Cpu, Compass } from 'lucide-react';

interface HeroDossierProps {
  onTagClick?: (tag: string) => void;
}

export const HeroDossier: React.FC<HeroDossierProps> = ({ onTagClick }) => {
  const [activeChip, setActiveChip] = useState<string | null>(null);

  const interactiveChips = [
    { label: 'OSINT & Threat Maps', icon: <Shield className="w-3.5 h-3.5 text-accent" />, target: 'SYS-01' },
    { label: '21-Point Gesture HCI', icon: <Eye className="w-3.5 h-3.5 text-accent" />, target: 'SYS-02' },
    { label: 'Quant Trading Logic', icon: <Compass className="w-3.5 h-3.5 text-accent" />, target: 'SYS-03' },
    { label: 'Claude Code & Terminal AI', icon: <Terminal className="w-3.5 h-3.5 text-accent" />, target: 'AGENT-01' },
    { label: 'Google Antigravity Workflows', icon: <Cpu className="w-3.5 h-3.5 text-accent" />, target: 'AGENT-02' }
  ];

  const handleChipClick = (label: string) => {
    setActiveChip(label);
    if (onTagClick) onTagClick(label);
    setTimeout(() => setActiveChip(null), 2500);
  };

  return (
    <section className="hero-dossier" id="overview">
      <div className="dossier-meta-tag">
        <span className="telemetry-pulse" />
        <span>WELCOME TO THE WORKSHOP // 2026.09</span>
      </div>

      <h1 className="hero-title">
        MOSES EGBUNIKE
      </h1>

      <p className="hero-lead">
        Hey, I'm <strong style={{ color: 'var(--text-pure)' }}>Moses</strong>. I'm an undergraduate cybersecurity 
        student at <strong style={{ color: 'var(--text-pure)' }}>Babcock University</strong> and a systems builder. 
        I deconstruct how software breaks, build machine interfaces that respond to physical human movement, 
        and orchestrate terminal AI agents to prototype resilient systems—driven by first-principles and an outright 
        refusal to remain stagnant.
      </p>

      {/* Interactive Floating Skill Badges */}
      <div className="hero-chips-container">
        <span className="chips-label mono">INTERACTIVE SPECIALIZATIONS:</span>
        <div className="hero-chips-row">
          {interactiveChips.map((chip, idx) => {
            const isSelected = activeChip === chip.label;
            return (
              <button
                key={idx}
                className={`hero-chip-btn mono ${isSelected ? 'active' : ''}`}
                onClick={() => handleChipClick(chip.label)}
                title="Click to interact"
              >
                {chip.icon}
                <span>{chip.label}</span>
                {isSelected && <span className="chip-sparkle">✦</span>}
              </button>
            );
          })}
        </div>
        {activeChip && (
          <div className="chip-feedback-toast mono">
            <span>FILTER ENGAGED:</span> <strong>{activeChip}</strong> — Explore in the Dossier Cabinet below ↓
          </div>
        )}
      </div>

      {/* Lab Coordinates Grid */}
      <div className="hero-specs-grid spotlight-card">
        <div className="spec-cell">
          <span className="spec-label">CAMPUS & DEPT</span>
          <span className="spec-value">Babcock Dept. of Cybersecurity (200L)</span>
        </div>
        <div className="spec-cell">
          <span className="spec-label">PRIMARY BUILD TOOLS</span>
          <span className="spec-value">Python · Tauri (Rust) · Linux · pfSense</span>
        </div>
        <div className="spec-cell">
          <span className="spec-label">AGENTIC COGNITIVE ENGINE</span>
          <span className="spec-value">Claude Code CLI · Google Antigravity</span>
        </div>
        <div className="spec-cell">
          <span className="spec-label">CORE PHILOSOPHY</span>
          <span className="spec-value">First Principles · Never Stagnant</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
        <a 
          href="#folder-cabinet" 
          className="channel-btn primary mono"
          style={{ textDecoration: 'none' }}
        >
          <span>EXPLORE SYSTEMS FOLDER</span>
          <ArrowRight className="w-4 h-4" />
        </a>
        <a 
          href="#terminal-sandbox" 
          className="channel-btn mono"
          style={{ textDecoration: 'none' }}
        >
          <Terminal className="w-4 h-4" />
          <span>LAUNCH LAB TERMINAL</span>
        </a>
      </div>
    </section>
  );
};
