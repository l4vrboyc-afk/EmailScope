import React from 'react';

interface ThreatScopeLogoProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

/**
 * ThreatScope Animated 2D Black & White Logo
 *
 * A stylized monochrome vector depicting an OSINT investigator looking through
 * a high-precision spotting scope on a tripod, complete with an animated
 * scanning cone, radar wave arcs, spinning reticle, and target lock.
 */
export const ThreatScopeLogo: React.FC<ThreatScopeLogoProps> = ({
  className = '',
  size = 40,
  animated = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none group cursor-pointer ${className}`}
      style={{ width: size, height: size }}
      title="ThreatScope OSINT"
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        className="w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.15)] transition-transform duration-300 group-hover:scale-105"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="esBeamReact" cx="0%" cy="50%" r="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <filter id="esGlowReact" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <style>{`
            .bg-plate { fill: #05070d; }
            .v-line { stroke: #ffffff; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; fill: none; }
            .v-thin { stroke: #ffffff; stroke-width: 1.1; stroke-linecap: round; stroke-linejoin: round; fill: none; }
            .v-fill { fill: #ffffff; }

            /* Scanning Beam */
            .scan-beam {
              fill: url(#esBeamReact);
              transform-origin: 64px 38px;
              ${animated ? 'animation: beamSweep 3s ease-in-out infinite alternate;' : ''}
            }
            @keyframes beamSweep {
              0% { transform: rotate(-6deg); opacity: 0.35; }
              50% { opacity: 0.75; }
              100% { transform: rotate(6deg); opacity: 0.35; }
            }

            /* Radar Wave Pulse */
            .wave-1 {
              transform-origin: 64px 38px;
              ${animated ? 'animation: wavePulse 2.4s cubic-bezier(0.1, 0.4, 0.8, 1) infinite;' : ''}
            }
            .wave-2 {
              transform-origin: 64px 38px;
              ${animated ? 'animation: wavePulse 2.4s cubic-bezier(0.1, 0.4, 0.8, 1) infinite 0.8s;' : ''}
            }
            .wave-3 {
              transform-origin: 64px 38px;
              ${animated ? 'animation: wavePulse 2.4s cubic-bezier(0.1, 0.4, 0.8, 1) infinite 1.6s;' : ''}
            }
            @keyframes wavePulse {
              0% { transform: scale(0.6); opacity: 0; }
              30% { opacity: 0.95; }
              80% { opacity: 0.4; }
              100% { transform: scale(1.4); opacity: 0; }
            }

            /* Reticle Spin */
            .reticle-spin {
              transform-origin: 82px 38px;
              ${animated ? 'animation: reticleRotate 7s linear infinite;' : ''}
            }
            .group:hover .reticle-spin {
              animation-duration: 2.5s;
            }
            @keyframes reticleRotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            /* Target Node Pulse */
            .target-pulse {
              ${animated ? 'animation: targetGlow 1.6s ease-in-out infinite alternate;' : ''}
            }
            @keyframes targetGlow {
              0% { opacity: 0.4; transform: scale(0.9); transform-origin: 82px 38px; }
              100% { opacity: 1; transform: scale(1.2); transform-origin: 82px 38px; }
            }

            /* Lens Gleam */
            .lens-gleam {
              ${animated ? 'animation: gleam 2s ease-in-out infinite alternate;' : ''}
            }
            @keyframes gleam {
              0% { opacity: 0.5; }
              100% { opacity: 1; }
            }
          `}</style>
        </defs>

        {/* Badge Base */}
        <rect className="bg-plate" width="100" height="100" rx="20" />
        <rect
          x="1"
          y="1"
          width="98"
          height="98"
          rx="19"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.2"
          strokeWidth="1.2"
          className="transition-all duration-300 group-hover:stroke-opacity-50"
        />

        {/* OSINT Grid Lines */}
        <line x1="12" y1="50" x2="88" y2="50" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.8" strokeDasharray="2 3" />
        <line x1="50" y1="12" x2="50" y2="88" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.8" strokeDasharray="2 3" />

        {/* SCANNING BEAM & RADAR WAVE */}
        <polygon points="64,38 96,18 96,58" className="scan-beam" />

        {/* Pulsing Radar Signal Arcs */}
        <path d="M 71 30 A 10 10 0 0 1 71 46" className="v-thin wave-1" strokeDasharray="2 2" />
        <path d="M 77 24 A 18 18 0 0 1 77 52" className="v-thin wave-2" strokeDasharray="3 2" />
        <path d="M 83 18 A 26 26 0 0 1 83 58" className="v-thin wave-3" strokeDasharray="4 3" />

        {/* TARGETING RETICLE */}
        <g className="reticle-spin">
          <circle cx="82" cy="38" r="9.5" className="v-thin" strokeDasharray="4 3" strokeOpacity="0.85" />
          <line x1="82" y1="25" x2="82" y2="28.5" className="v-thin" />
          <line x1="82" y1="47.5" x2="82" y2="51" className="v-thin" />
          <line x1="69" y1="38" x2="72.5" y2="38" className="v-thin" />
          <line x1="91.5" y1="38" x2="95" y2="38" className="v-thin" />
        </g>

        {/* Target Locked Entity */}
        <g className="target-pulse">
          <circle cx="82" cy="38" r="2.4" className="v-fill" filter="url(#esGlowReact)" />
          <circle cx="82" cy="38" r="5.2" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.65" fill="none" />
        </g>

        {/* GROUND REFERENCE LINE */}
        <line x1="12" y1="91" x2="88" y2="91" className="v-thin" strokeOpacity="0.25" />

        {/* TRIPOD */}
        <rect x="44" y="42" width="7" height="4" rx="1.2" className="v-thin" fill="#000000" />
        <circle cx="47.5" cy="44" r="1.4" className="v-fill" />
        <line x1="44" y1="44.5" x2="35" y2="54" className="v-thin" />

        <polygon points="47.5,46 43,51 52,51" className="v-thin" fill="#000000" />

        {/* Tripod Legs */}
        <line x1="44" y1="51" x2="27" y2="91" className="v-line" />
        <line x1="47.5" y1="51" x2="47.5" y2="91" className="v-line" />
        <line x1="51" y1="51" x2="68" y2="91" className="v-line" />

        {/* Leg Clamps */}
        <line x1="33" y1="71" x2="38.5" y2="71" className="v-thin" />
        <line x1="45" y1="72" x2="50" y2="72" className="v-thin" />
        <line x1="57" y1="71" x2="62.5" y2="71" className="v-thin" />

        {/* SPOTTING SCOPE */}
        <path d="M 33 32 L 38 37 L 42 35 L 37 30 Z" className="v-line" fill="#000000" />
        <line x1="32" y1="31" x2="34" y2="33" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

        <path d="M 38 37 L 44 42 L 56 41 L 63 42.5 L 63 33.5 L 56 35 L 42 35 Z" className="v-line" fill="#000000" />
        <line x1="50" y1="35.5" x2="50" y2="41.5" className="v-thin" />
        <line x1="52" y1="35.5" x2="52" y2="41.5" className="v-thin" />
        <rect x="62" y="33" width="3" height="10" rx="0.8" className="v-fill lens-gleam" filter="url(#esGlowReact)" />

        {/* INVESTIGATOR FIGURE (2D VECTOR SILHOUETTE) */}
        {/* Ponytail */}
        <path d="M 21 28 C 17 28 14 32 15 37 C 17.5 36 20 34 21 32" className="v-line" fill="#000000" />

        {/* Head & Hair */}
        <path
          d="M 21 32 C 19 28 21 21 27 19.5 C 33 18 36 22 36 26.5 C 36 28 35 30 34 31 C 32 32 30 31 29 29 C 27 29 26 31 26 33 Z"
          className="v-line"
          fill="#ffffff"
        />

        {/* Eye line gazing into eyepiece */}
        <line x1="30.5" y1="27" x2="33" y2="28" stroke="#000000" strokeWidth="1.4" strokeLinecap="round" />

        {/* Nose & Face contour */}
        <path d="M 33 26.5 L 34 29 L 32.5 31" stroke="#000000" strokeWidth="1" strokeLinecap="round" fill="none" />

        {/* Collar & Neck */}
        <path d="M 26 34 L 27 39 L 31.5 39" className="v-thin" />

        {/* Jacket Torso */}
        <path d="M 24 39 C 21 46 19 57 18 68 L 26 68 C 27 58 28.5 48 30.5 40" className="v-line" fill="#000000" />

        {/* Hand on Pan Handle */}
        <path d="M 28 41 C 30 46 33 50 35.5 54" className="v-line" />
        <circle cx="35.5" cy="54" r="1.8" className="v-fill" />

        {/* Lower Body */}
        <path d="M 18 68 L 17 88 L 25 88 L 26 68" className="v-line" fill="#000000" />
      </svg>
    </div>
  );
};

export default ThreatScopeLogo;
