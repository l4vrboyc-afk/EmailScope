/**
 * ThreatMap — Cyber Geolocation & Infrastructure Correlation HUD.
 *
 * Visualizes IP infrastructure geographically with cyber-cartographic styling:
 *  - Color-coded node types (VPN/Proxy in Amber, Datacenter in Cyan, Residential in Emerald)
 *  - Concentric radar pulse ripples on target IP
 *  - Grid crosshairs & coordinate indicators
 *  - Floating glassmorphic telemetry cards
 */
import { useState } from 'react';
import { Globe, Radio, Maximize2, Minimize2, X, Target } from 'lucide-react';

function project(lat, lng) {
  const x = ((lng + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return { x, y };
}

const RISK_STYLES = {
  proxy: {
    fill: '#ffffff',
    glow: 'rgba(255, 255, 255, 0.4)',
    label: 'VPN/Proxy/Tor',
    dash: true,
  },
  datacenter: {
    fill: '#d4d4d4',
    glow: 'rgba(255, 255, 255, 0.25)',
    label: 'Cloud/Datacenter',
    dash: false,
  },
  normal: {
    fill: '#a3a3a3',
    glow: 'rgba(255, 255, 255, 0.2)',
    label: 'ISP/Residential',
    dash: false,
  },
  unknown: {
    fill: '#737373',
    glow: 'rgba(255, 255, 255, 0.1)',
    label: 'Unknown',
    dash: false,
  },
};

function getRiskStyle(node) {
  if (node.metadata?.is_proxy || node.metadata?.connection_type === 'proxy') return RISK_STYLES.proxy;
  if (node.metadata?.is_datacenter || node.metadata?.connection_type === 'datacenter') return RISK_STYLES.datacenter;
  if (node.metadata?.latitude != null) return RISK_STYLES.normal;
  return RISK_STYLES.unknown;
}

export default function ThreatMap({
  graphData,
  targetSeed,
  isExpanded = false,
  onToggleExpand,
  onClose,
}) {
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!graphData) return null;

  const geoNodes = (graphData.nodes || []).filter(
    (n) => n.metadata?.latitude != null && n.metadata?.longitude != null
  );

  const primaryNode = geoNodes[0] || null;

  return (
    <div className="relative w-full h-full bg-[#000000] overflow-hidden flex flex-col select-none rounded-xl border border-white/10 shadow-2xl">
      {/* Top Header Strip */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 z-10 bg-[#080808] border-b border-white/10">
        <div className="flex items-center gap-2 flex-1 overflow-hidden whitespace-nowrap min-w-0">
          <Globe className="w-3.5 h-3.5 text-white flex-shrink-0" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white truncate">
            Threat Cartography
          </span>
          {targetSeed && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[8px] font-mono bg-white/5 border border-white/15 px-2 py-0.5 rounded-full text-neutral-300 truncate max-w-[130px]">
              <Target className="w-2.5 h-2.5 text-white" />
              <span className="truncate">{targetSeed}</span>
            </span>
          )}
        </div>

        {/* Legend pills + Window controls */}
        <div className="flex items-center gap-2 flex-shrink-0 relative z-10 pointer-events-auto">
          <div className="hidden sm:flex items-center gap-2 text-[8px] font-mono uppercase tracking-wider mr-1">
            <span className="flex items-center gap-1 text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />Proxy
            </span>
            <span className="flex items-center gap-1 text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />Cloud
            </span>
            <span className="flex items-center gap-1 text-neutral-500">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />ISP
            </span>
          </div>

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider transition-all flex items-center gap-1 border cursor-pointer ${
                isExpanded
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-white/[0.04] text-neutral-300 border-white/15 hover:border-white/40 hover:text-white'
              }`}
              title={isExpanded ? 'Collapse map' : 'Expand map view'}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-2.5 h-2.5" />
                  <span>Shrink</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-2.5 h-2.5" />
                  <span>Expand</span>
                </>
              )}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-5 h-5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Close Map"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Map Graphic Area */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#05080e]">
        <svg
          viewBox="0 0 100 50"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top });
          }}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <pattern id="cyber-grid-threat" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="0.2" />
            </pattern>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width="100" height="50" fill="url(#cyber-grid-threat)" />

          {/* Equator & Meridian */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="0.25" strokeDasharray="1 1" />
          <line x1="50" y1="0"  x2="50"  y2="50" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="0.25" strokeDasharray="1 1" />

          {/* Geographic reference points / continents hint */}
          <g fill="rgba(255, 255, 255, 0.025)">
            <circle cx="25" cy="18" r="7" />
            <circle cx="30" cy="33" r="5" />
            <circle cx="52" cy="14" r="4.5" />
            <circle cx="53" cy="27" r="6" />
            <circle cx="72" cy="16" r="8" />
            <circle cx="82" cy="36" r="4" />
          </g>

          {/* Coordinate Marks */}
          <text x="2" y="27" fill="rgba(255,255,255,0.2)" fontSize="1.4" fontFamily="monospace">0° LAT</text>
          <text x="51" y="4" fill="rgba(255,255,255,0.2)" fontSize="1.4" fontFamily="monospace">0° LNG</text>

          {/* IP Pins */}
          {geoNodes.map((node, idx) => {
            const { x, y } = project(parseFloat(node.metadata.latitude), parseFloat(node.metadata.longitude));
            const style = getRiskStyle(node);
            const isHov = hovered?.canonical_id === node.canonical_id;
            const isTargetPrimary = idx === 0;

            return (
              <g
                key={node.canonical_id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(node)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Concentric radar pulse rings */}
                <circle cx={x} cy={y} r="1.5" fill={style.fill} fillOpacity="0.3">
                  <animate attributeName="r" from="1.2" to={isTargetPrimary ? "6" : "3.5"} dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="fill-opacity" from="0.4" to="0" dur="2.4s" repeatCount="indefinite" />
                </circle>

                {/* Reticle crosshair on primary target IP */}
                {isTargetPrimary && (
                  <g stroke="#38bdf8" strokeWidth="0.2">
                    <line x1={x - 3} y1={y} x2={x + 3} y2={y} />
                    <line x1={x} y1={y - 3} x2={x} y2={y + 3} />
                    <circle cx={x} cy={y} r="2.2" fill="none" strokeDasharray="0.5 0.5" />
                  </g>
                )}

                {/* Main Node Point with glow */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHov ? 2.0 : 1.3}
                  fill={style.fill}
                  style={{ filter: `drop-shadow(0 0 1px ${style.fill})`, transition: 'r 0.15s ease' }}
                />

                {/* Dashed ring for proxy hops */}
                {style.dash && (
                  <circle
                    cx={x}
                    cy={y}
                    r={isHov ? 3.2 : 2.4}
                    fill="none"
                    stroke={style.fill}
                    strokeWidth="0.25"
                    strokeDasharray="0.8 0.6"
                    style={{ transition: 'r 0.15s ease' }}
                  />
                )}

                {/* IP Label under point in expanded mode */}
                {isExpanded && (
                  <text
                    x={x}
                    y={y + 3.2}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize="1.6"
                    fontFamily="monospace"
                    className="font-bold"
                  >
                    {node.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {geoNodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 gap-1.5">
            <Radio className="w-5 h-5 text-neutral-600 animate-pulse" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
              No target geo-IPs resolved
            </span>
          </div>
        )}

        {/* Hover Tooltip */}
        {hovered && (
          <div
            className="pointer-events-none absolute z-30 bg-black/95 border border-white/20 rounded-lg p-2.5 text-[9px] font-mono shadow-2xl backdrop-blur-md"
            style={{
              left: mousePos.x + 10,
              top: mousePos.y + 10,
              maxWidth: 240,
              transform: mousePos.x > 180 ? 'translateX(-105%)' : undefined,
            }}
          >
            <div className="font-bold text-white mb-1 flex items-center justify-between gap-2 border-b border-white/10 pb-1">
              <span className="truncate">{hovered.label}</span>
              <span className="text-[8px] px-1.5 py-0.2 rounded-full font-bold uppercase bg-white text-black">
                {getRiskStyle(hovered).label}
              </span>
            </div>
            <div className="space-y-0.5 text-neutral-300 text-[8px]">
              {hovered.metadata?.city && (
                <div>
                  <span className="text-neutral-500">Location: </span>
                  <span className="text-white font-medium">
                    {hovered.metadata.city}
                    {hovered.metadata.region ? `, ${hovered.metadata.region}` : ''}
                    {hovered.metadata.country ? ` (${hovered.metadata.country})` : ''}
                  </span>
                </div>
              )}
              {hovered.metadata?.isp && (
                <div>
                  <span className="text-neutral-500">ISP: </span>
                  <span className="text-white font-medium">{hovered.metadata.isp}</span>
                </div>
              )}
              {hovered.metadata?.asn && (
                <div>
                  <span className="text-neutral-500">ASN: </span>
                  <span className="text-white font-mono">{hovered.metadata.asn}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Target Correlation Footer Bar */}
      <div className="flex-shrink-0 px-3 py-1.5 bg-[#080808] border-t border-white/10 flex items-center justify-between text-[8px] font-mono text-neutral-400">
        <div className="truncate flex items-center gap-1.5">
          <span className="text-neutral-500 uppercase tracking-wider">Correlation:</span>
          {primaryNode ? (
            <span className="text-white font-medium truncate">
              {primaryNode.label}{' '}
              {primaryNode.metadata?.city ? `(${primaryNode.metadata.city}, ${primaryNode.metadata.country || ''})` : ''}
            </span>
          ) : (
            <span className="text-neutral-500 italic">Awaiting IP resolution</span>
          )}
        </div>
        <span className="text-white font-bold pl-2 flex-shrink-0">
          {geoNodes.length} {geoNodes.length === 1 ? 'node' : 'nodes'} mapped
        </span>
      </div>
    </div>
  );
}
