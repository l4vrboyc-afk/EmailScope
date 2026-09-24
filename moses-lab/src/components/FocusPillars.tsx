import React, { useState } from 'react';
import { Shield, Eye, Cpu } from 'lucide-react';

interface Pillar {
  id: string;
  code: string;
  title: string;
  icon: React.ReactNode;
  tagline: string;
  description: string;
  focusPoints: string[];
  metrics: { label: string; value: string }[];
  tags: string[];
}

export const FocusPillars: React.FC = () => {
  const [activeId, setActiveId] = useState<string>('pillar-1');

  const pillars: Pillar[] = [
    {
      id: 'pillar-1',
      code: 'CORE // 01',
      title: 'Offensive Security & Defense',
      icon: <Shield className="w-5 h-5 text-accent" />,
      tagline: 'Adversarial reconnaissance, perimeter audits & packet telemetry.',
      description: 'Investigating how systems break before adversaries do. Simulating enterprise DMZs in pfSense, mapping attack surfaces with Wireshark, and dissecting protocol vulnerabilities.',
      focusPoints: [
        'pfSense stateful filtering & anti-spoofing rule tuning',
        'Cisco Packet Tracer VLAN access-control & routing isolation',
        'OSINT reconnaissance & infrastructure asset attribution'
      ],
      metrics: [
        { label: 'LAB VANS', value: '4 Segments' },
        { label: 'AUDIT TOOL', value: 'Metasploit / Nmap' }
      ],
      tags: ['pfSense', 'Kali Linux', 'Wireshark', 'Metasploit', 'BGP']
    },
    {
      id: 'pillar-2',
      code: 'CORE // 02',
      title: 'Computer Vision & HCI',
      icon: <Eye className="w-5 h-5 text-accent" />,
      tagline: 'Eliminating peripheral barriers with gesture-driven machine control.',
      description: 'Designing zero-latency natural interfaces. Translating real-time webcam video frames into 21-point hand skeletal landmark coordinates that directly dispatch native OS kernel events.',
      focusPoints: [
        '21-point landmark mesh normalization under variable lighting',
        'Finite State Machine filtering accidental micro-jitters',
        'Direct system event injection bypassing physical mice'
      ],
      metrics: [
        { label: 'TRACKING FPS', value: '60 FPS Native' },
        { label: 'GESTURE FSM', value: '0 Latency' }
      ],
      tags: ['OpenCV', 'MediaPipe', 'Vector Calculus', 'Python', 'Pluto HCI']
    },
    {
      id: 'pillar-3',
      code: 'CORE // 03',
      title: 'Autonomous AI Architecture',
      icon: <Cpu className="w-5 h-5 text-accent" />,
      tagline: 'Symbiotic engineering with terminal agents & cognitive harnesses.',
      description: 'Orchestrating agentic workflows. Not passive prompt chatting, but commanding terminal-native agents (Claude Code, Antigravity) to explore codebases, simulate architecture, and ship resilient software.',
      focusPoints: [
        'Terminal CLI harness orchestration (Claude Code)',
        'Context-aware multi-modal pair programming (Antigravity)',
        'Genesis architecture: Probabilistic intelligence + Deterministic logic'
      ],
      metrics: [
        { label: 'CLI RUNTIME', value: 'Claude Code' },
        { label: 'IDE HARNESS', value: 'Antigravity' }
      ],
      tags: ['Claude Code', 'Google Antigravity', 'Genesis', 'Agentic Loops']
    }
  ];

  return (
    <section className="section-wrapper" id="focus">
      <div className="section-header">
        <div>
          <span className="section-code">// 00. SPECIALIZED FOCUS</span>
          <h2 className="section-heading">THREE CORE DISCIPLINES</h2>
        </div>
        <p className="section-desc">
          Hover or select a pillar to deconstruct the engineering priorities and daily lab workflows.
        </p>
      </div>

      <div className="pillars-container">
        {pillars.map((pillar) => {
          const isActive = activeId === pillar.id;
          return (
            <div
              key={pillar.id}
              className={`pillar-card spotlight-card ${isActive ? 'active' : ''}`}
              onMouseEnter={() => setActiveId(pillar.id)}
              onClick={() => setActiveId(pillar.id)}
            >
              <div className="pillar-header">
                <div className="pillar-icon-box">
                  {pillar.icon}
                </div>
                <span className="mono pillar-code">{pillar.code}</span>
              </div>

              <div className="pillar-content">
                <h3 className="pillar-title">{pillar.title}</h3>
                <p className="pillar-tagline">{pillar.tagline}</p>

                {/* Expanded Details */}
                <div className="pillar-expanded-view">
                  <p className="pillar-description">{pillar.description}</p>

                  <div className="pillar-metrics-row">
                    {pillar.metrics.map((m, idx) => (
                      <div key={idx} className="pillar-metric-chip">
                        <span className="metric-label mono">{m.label}</span>
                        <span className="metric-val mono">{m.value}</span>
                      </div>
                    ))}
                  </div>

                  <ul className="pillar-bullets">
                    {pillar.focusPoints.map((point, pIdx) => (
                      <li key={pIdx} className="pillar-bullet-item">
                        <span className="mono" style={{ color: 'var(--accent)' }}>›</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pillar-tags">
                    {pillar.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="tech-tag mono">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pillar-footer mono">
                <span>{isActive ? 'CURRENTLY ACTIVE' : 'CLICK TO EXPAND'}</span>
                <span className="pillar-arrow">
                  {isActive ? '●' : '→'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
