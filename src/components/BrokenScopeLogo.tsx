import React from 'react';

interface BrokenScopeLogoProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

/**
 * BrokenScopeLogo — ThreatScope 404 Broken Scope Vector
 *
 * An exact evolution of the live ThreatScope logo, blown up big, with:
 * - Spotting scope snapped and fractured in half
 * - Objective lens cracked and dangling
 * - Floating glass shards and fracture particles
 * - Glitching spark arcs and fragmented reticle
 * - Pure high-contrast tactical monochrome aesthetic
 */
export const BrokenScopeLogo: React.FC<BrokenScopeLogoProps> = ({
  className = '',
  size,
  animated = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={size != null ? { width: size, height: size } : undefined}
      title="404: Optical Scope Failure"
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        className="w-full h-full drop-shadow-[0_0_20px_rgba(255,255,255,0.18)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="esGlowBroken" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.9" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <style>{`
            .bg-plate-broken { fill: #000000; }
            .v-line { stroke: #ffffff; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; fill: none; }
            .v-thin { stroke: #ffffff; stroke-width: 1.1; stroke-linecap: round; stroke-linejoin: round; fill: none; }
            .v-fill { fill: #ffffff; }

            /* Broken Glitch Sparks */
            .spark-glitch {
              ${animated ? 'animation: sparkFlicker 1.8s steps(2, start) infinite;' : ''}
            }
            @keyframes sparkFlicker {
              0%   { opacity: 0; transform: translate(0, 0) scale(0.8); }
              20%  { opacity: 1; transform: translate(1px, -1px) scale(1.1); }
              35%  { opacity: 0; }
              60%  { opacity: 0.9; transform: translate(-1px, 2px) scale(1); }
              80%  { opacity: 0.2; }
              100% { opacity: 0; }
            }

            /* Floating Glass Shards */
            .shard-drift-1 {
              ${animated ? 'animation: shardDrift1 3.5s ease-in-out infinite alternate;' : ''}
            }
            @keyframes shardDrift1 {
              0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.9; }
              100% { transform: translate(3px, 5px) rotate(18deg); opacity: 0.4; }
            }

            .shard-drift-2 {
              ${animated ? 'animation: shardDrift2 4s ease-in-out infinite alternate;' : ''}
            }
            @keyframes shardDrift2 {
              0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.8; }
              100% { transform: translate(-4px, 6px) rotate(-22deg); opacity: 0.3; }
            }

            .shard-drift-3 {
              ${animated ? 'animation: shardDrift3 2.8s ease-in-out infinite alternate;' : ''}
            }
            @keyframes shardDrift3 {
              0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
              100% { transform: translate(2px, -3px) rotate(35deg); opacity: 0.5; }
            }

            /* Dangling Barrel Swing */
            .broken-barrel-hang {
              transform-origin: 51px 41px;
              ${animated ? 'animation: barrelDangle 4.2s ease-in-out infinite alternate;' : ''}
            }
            @keyframes barrelDangle {
              0%   { transform: rotate(18deg); }
              50%  { transform: rotate(24deg); }
              100% { transform: rotate(16deg); }
            }

            /* Broken Reticle Glitch */
            .reticle-fracture {
              transform-origin: 82px 38px;
              ${animated ? 'animation: reticleGlitch 4s ease-in-out infinite;' : ''}
            }
            @keyframes reticleGlitch {
              0%, 90% { transform: rotate(0deg); opacity: 0.4; }
              92%     { transform: rotate(15deg) scale(0.95); opacity: 0.8; }
              96%     { transform: rotate(-10deg) scale(1.05); opacity: 0.3; }
              100%    { transform: rotate(0deg); opacity: 0.4; }
            }
          `}</style>
        </defs>

        {/* Badge Base / Pitch Black Plate with Double Border */}
        <rect className="bg-plate-broken" width="100" height="100" rx="20" />
        <rect
          x="1"
          y="1"
          width="98"
          height="98"
          rx="19"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.35"
          strokeWidth="1.4"
        />

        {/* Tactical OSINT Grid Lines (Fractured in center) */}
        <line x1="12" y1="50" x2="44" y2="50" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.8" strokeDasharray="2 3" />
        <line x1="60" y1="50" x2="88" y2="50" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.8" strokeDasharray="2 3" />
        <line x1="50" y1="12" x2="50" y2="35" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.8" strokeDasharray="2 3" />
        <line x1="50" y1="65" x2="50" y2="88" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.8" strokeDasharray="2 3" />

        {/* GROUND REFERENCE LINE */}
        <line x1="12" y1="91" x2="88" y2="91" className="v-thin" strokeOpacity="0.3" />

        {/* TRIPOD STAND */}
        <rect x="44" y="42" width="7" height="4" rx="1.2" className="v-thin" fill="#000000" />
        <circle cx="47.5" cy="44" r="1.4" className="v-fill" />
        <line x1="44" y1="44.5" x2="35" y2="54" className="v-thin" />
        <polygon points="47.5,46 43,51 52,51" className="v-thin" fill="#000000" />

        {/* Tripod Legs */}
        <line x1="44" y1="51" x2="27" y2="91" className="v-line" />
        <line x1="47.5" y1="51" x2="47.5" y2="91" className="v-line" />
        <line x1="51" y1="51" x2="68" y2="91" className="v-line" />

        {/* Tripod Clamps */}
        <line x1="33" y1="71" x2="38.5" y2="71" className="v-thin" />
        <line x1="45" y1="72" x2="50" y2="72" className="v-thin" />
        <line x1="57" y1="71" x2="62.5" y2="71" className="v-thin" />

        {/* ── THE SCOPE: SNAPPED & BROKEN IN TWO ────────────────────── */}

        {/* 1. Base / Eyepiece Half (Attached to Mount, jagged break at end) */}
        <path d="M 33 32 L 38 37 L 42 35 L 37 30 Z" className="v-line" fill="#000000" />
        {/* Rubber Eye Cup */}
        <line x1="32" y1="31" x2="34" y2="33" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

        {/* Scope rear body with jagged snapped fracture edge */}
        <path
          d="M 38 37 L 44 42 L 50 41.5 L 48.5 38.5 L 51 36.5 L 47 35.5 L 42 35 Z"
          className="v-line"
          fill="#000000"
        />
        {/* Scope focus grip ring */}
        <line x1="43" y1="36" x2="44.5" y2="41.5" className="v-thin" />

        {/* Crack fracture lines on rear barrel */}
        <line x1="46" y1="37" x2="49" y2="36" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="1 1" />
        <line x1="44" y1="40" x2="48" y2="41" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="1 1" />

        {/* 2. Front Barrel Half (Snapped off, dangling down at an angle) */}
        <g className="broken-barrel-hang">
          {/* Snapped Front Tube dangling */}
          <path
            d="M 52 37 L 49.5 40 L 52.5 42 L 58 41 L 64 42.5 L 64 33.5 L 58 35 Z"
            className="v-line"
            fill="#000000"
          />
          {/* Cracked objective lens bezel */}
          <rect x="63" y="33" width="3" height="10" rx="0.8" className="v-fill" opacity="0.6" />

          {/* Radial spiderweb lens crack on front lens */}
          <line x1="62" y1="38" x2="66" y2="38" stroke="#000000" strokeWidth="1" />
          <line x1="63.5" y1="34" x2="65" y2="42" stroke="#000000" strokeWidth="0.8" />
          <line x1="63" y1="35.5" x2="66" y2="40.5" stroke="#000000" strokeWidth="0.8" />
        </g>

        {/* Broken Tube Gap Spark Arcs (Electrical fault / snapped optics) */}
        <g className="spark-glitch">
          <path d="M 49 39 L 52 37 L 50.5 42 L 54 40" stroke="#ffffff" strokeWidth="1.2" fill="none" filter="url(#esGlowBroken)" />
          <line x1="51" y1="35" x2="53" y2="34" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
          <line x1="48" y1="43" x2="51" y2="45" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
        </g>

        {/* ── FLOATING / FALLING GLASS SHARDS ────────────────────────── */}
        <g className="shard-drift-1">
          <polygon points="53,46 56,43 55,48" fill="#ffffff" filter="url(#esGlowBroken)" />
        </g>
        <g className="shard-drift-2">
          <polygon points="48,46 45,49 50,49" fill="#ffffff" opacity="0.85" />
        </g>
        <g className="shard-drift-3">
          <polygon points="56,38 59,36 58,40" fill="#ffffff" opacity="0.9" />
        </g>
        <polygon points="52,49 54,51 51,52" fill="#ffffff" opacity="0.75" />
        <polygon points="46,43 47,45 44,45" fill="#ffffff" opacity="0.6" />

        {/* ── BROKEN / FRACTURED TARGET RETICLE (ERR 404) ───────────── */}
        <g className="reticle-fracture">
          {/* Fragmented dashed circle */}
          <path d="M 76 32 A 9.5 9.5 0 0 1 88 32" className="v-thin" strokeDasharray="3 3" strokeOpacity="0.4" />
          <path d="M 88 44 A 9.5 9.5 0 0 1 76 44" className="v-thin" strokeDasharray="3 3" strokeOpacity="0.4" />

          {/* Snapped crosshairs */}
          <line x1="82" y1="25" x2="82" y2="30" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 2" />
          <line x1="82" y1="46" x2="82" y2="51" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 2" />

          {/* Lost Target Indicator "X" */}
          <line x1="79" y1="35" x2="85" y2="41" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="85" y1="35" x2="79" y2="41" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />

          {/* 404 Tiny Monospace Tag */}
          <text
            x="82"
            y="23"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="4.2"
            fontFamily="monospace"
            letterSpacing="0.8"
            opacity="0.85"
            fontWeight="bold"
          >
            404
          </text>
        </g>

        {/* ── INVESTIGATOR FIGURE ───────────────────────────────────── */}
        {/* Ponytail */}
        <path d="M 21 28 C 17 28 14 32 15 37 C 17.5 36 20 34 21 32" className="v-line" fill="#000000" />

        {/* Head & Hair */}
        <path
          d="M 21 32 C 19 28 21 21 27 19.5 C 33 18 36 22 36 26.5 C 36 28 35 30 34 31 C 32 32 30 31 29 29 C 27 29 26 31 26 33 Z"
          className="v-line"
          fill="#ffffff"
        />

        {/* Eye line looking into eyepiece */}
        <line x1="30.5" y1="27" x2="33" y2="28" stroke="#000000" strokeWidth="1.4" strokeLinecap="round" />

        {/* Nose & Face profile */}
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

export default BrokenScopeLogo;
