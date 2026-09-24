import React, { useState, useEffect } from 'react';

interface IntroSignatureProps {
  onComplete: () => void;
}

export const IntroSignature: React.FC<IntroSignatureProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'drawing' | 'sliding'>('drawing');

  useEffect(() => {
    // Automatically trigger slide-left after signature draws (2.0s)
    const slideTimer = setTimeout(() => {
      triggerExit();
    }, 2200);

    return () => clearTimeout(slideTimer);
  }, []);

  const triggerExit = () => {
    setStage('sliding');
    setTimeout(() => {
      onComplete();
    }, 750); // duration of slide-left animation
  };

  return (
    <div 
      className={`intro-screen ${stage === 'sliding' ? 'slide-left' : ''}`}
      onClick={triggerExit}
      style={{ cursor: 'pointer' }}
    >
      <div className="intro-content">
        {/* Animated Signature */}
        <div className="signature-container">
          <svg viewBox="0 0 540 180" className="signature-svg">
            <defs>
              <linearGradient id="sigGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="var(--accent)" />
              </linearGradient>
            </defs>
            <text
              x="50%"
              y="62%"
              textAnchor="middle"
              className="signature-text"
              fontFamily="'Great Vibes', cursive"
              fontSize="115"
            >
              .Jupiter...
            </text>
          </svg>
          <div className="signature-laser-dot" />
        </div>

        {/* Sub-label */}
        <div className="intro-meta mono">
          <div className="intro-status-pill">
            <span className="telemetry-pulse" />
            <span>MOSES EGBUNIKE // BABCOCK UNIVERSITY</span>
          </div>
          <p className="intro-tagline">
            SYSTEMS · MACHINE INTERFACES · ADVERSARIAL TOPOLOGIES
          </p>
        </div>
      </div>

      <div className="intro-footer-hint mono">
        CLICK ANYWHERE TO SKIP
      </div>
    </div>
  );
};
