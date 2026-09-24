/**
 * EntityTopologyCard — Cyber-SOC Entity Topology Card (Monochrome High-Precision Edition).
 *
 * Full-stage WebGL topology canvas with:
 *  - High-precision monochrome camera controls (Zoom, Center, Zoom to Fit)
 *  - Collapsible HUD legend for filtering entity types
 *  - Edge & Node counter telemetry
 */
import { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import {
  Network, ZoomIn, ZoomOut, Maximize2, Minimize2, Crosshair, Filter,
} from 'lucide-react';
import GraphCanvas, { CATEGORY_META } from './GraphCanvas';

const LEGEND_ORDER = [
  'email', 'url', 'domain', 'ip', 'breach', 'telephony',
  'identity', 'infrastructure', 'social', 'geo', 'username',
];

function CtrlButton({ onClick, title, label, icon: Icon, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer
                  text-[10px] font-mono font-bold uppercase tracking-wider ${
                    active
                      ? 'bg-white text-black border-white shadow-sm'
                      : 'border-white/15 bg-white/[0.04] text-neutral-300 hover:bg-white/10 hover:text-white hover:border-white/30'
                  }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label && <span>{label}</span>}
    </button>
  );
}

export default function EntityTopologyCard({
  graphData,
  onNodeSelect,
  onPivot,
  pivotingNode,
  children = null,
  isMinimized: controlledMinimized,
  onToggleMinimize,
}) {
  const apiRef = useRef(null);
  const handleApiReady = useCallback((api) => { apiRef.current = api; }, []);

  const [internalMinimized, setInternalMinimized] = useState(false);
  const isMinimized = controlledMinimized !== undefined ? controlledMinimized : internalMinimized;

  const handleToggleMinimize = () => {
    if (onToggleMinimize) {
      onToggleMinimize();
    } else {
      setInternalMinimized((v) => !v);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        apiRef.current?.zoomToFit();
      } catch { /* noop */ }
    }, 220);
    return () => clearTimeout(timer);
  }, [isMinimized]);

  const [legendOpen, setLegendOpen] = useState(true);
  const [filterCategory, setFilterCategory] = useState(null);

  const nodeCount = graphData?.nodes?.length ?? 0;
  const edgeCount = graphData?.edges?.length ?? 0;

  // Category counts in current graph
  const categoryCounts = useMemo(() => {
    const counts = {};
    (graphData?.nodes || []).forEach((n) => {
      const cat = n.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [graphData]);

  return (
    <section
      className={`relative rounded-xl overflow-hidden border border-white/10 bg-[#000000] shadow-2xl transition-all duration-300 flex flex-col ${
        isMinimized
          ? 'w-[340px] h-[235px] flex-shrink-0'
          : 'flex-1 min-h-0 w-full h-full'
      }`}
    >
      {/* ── Card header ── */}
      <div className={`flex items-center justify-between gap-2 border-b border-white/10 bg-[#080808] flex-shrink-0 relative z-10 ${isMinimized ? 'px-2.5 py-1.5' : 'px-4 py-3'}`}>
        <div className="flex items-center gap-2 min-w-0 overflow-hidden whitespace-nowrap">
          <span className={`flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 font-mono font-bold uppercase tracking-widest text-white ${isMinimized ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'}`}>
            <Network className={`${isMinimized ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-white`} />
            <span>{isMinimized ? 'Topology' : 'Entity Topology'}</span>
          </span>
          <span
            className="px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.02] text-[9px] font-mono text-neutral-400"
            title={`${nodeCount} entities · ${edgeCount} connections`}
          >
            {nodeCount}e · {edgeCount}l
          </span>

          {!isMinimized && filterCategory && (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold border transition-all"
              style={{
                backgroundColor: `${CATEGORY_META[filterCategory]?.color || '#ffffff'}22`,
                borderColor: `${CATEGORY_META[filterCategory]?.color || '#ffffff'}66`,
                color: CATEGORY_META[filterCategory]?.color || '#ffffff',
              }}
            >
              <Filter className="w-2.5 h-2.5" />
              <span>Filtering: {CATEGORY_META[filterCategory]?.label || filterCategory}</span>
              <button
                type="button"
                onClick={() => setFilterCategory(null)}
                className="ml-1 hover:opacity-75 cursor-pointer font-black"
              >
                ×
              </button>
            </span>
          )}
        </div>

        {/* Camera Controls */}
        <div className="flex items-center gap-1 flex-shrink-0 relative z-10 pointer-events-auto">
          {!isMinimized && (
            <>
              <CtrlButton onClick={() => apiRef.current?.zoomIn()} title="Zoom in" icon={ZoomIn} />
              <CtrlButton onClick={() => apiRef.current?.zoomOut()} title="Zoom out" icon={ZoomOut} />
              <CtrlButton onClick={() => apiRef.current?.resetCamera()} title="Center target seed" label="Center" icon={Crosshair} />
            </>
          )}
          {isMinimized && (
            <CtrlButton onClick={() => apiRef.current?.resetCamera()} title="Center target seed" icon={Crosshair} />
          )}
          <CtrlButton
            onClick={handleToggleMinimize}
            title={isMinimized ? "Expand topology tab to full size" : "Minimize topology tab"}
            label={isMinimized ? "Expand" : "Fit"}
            icon={isMinimized ? Maximize2 : Minimize2}
            active={isMinimized}
          />
        </div>
      </div>

      {/* ── Canvas body ── */}
      <div className="flex-1 min-h-0 relative w-full h-full">
        <GraphCanvas
          graphData={graphData}
          onNodeSelect={onNodeSelect}
          onPivot={onPivot}
          pivotingNode={pivotingNode}
          onApiReady={handleApiReady}
          filterCategory={filterCategory}
          legendOpen={legendOpen}
          isMinimized={isMinimized}
        />

        {/* ── ENTITY LEGEND overlay ── */}
        {nodeCount > 0 && !isMinimized && (
          <div className="absolute bottom-3 right-3 z-20 rounded-xl border border-white/15 bg-black/95 backdrop-blur-xl px-4 py-3 shadow-2xl max-w-xs">
            <div className="flex items-center justify-between gap-6 mb-2.5 pb-1.5 border-b border-white/10">
              <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
                Entity Types
              </span>
              <div className="flex items-center gap-2">
                {filterCategory && (
                  <button
                    type="button"
                    onClick={() => setFilterCategory(null)}
                    className="text-[8px] font-mono uppercase tracking-wider text-white underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLegendOpen((v) => !v)}
                  className="text-[9px] font-mono uppercase tracking-widest text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  {legendOpen ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {legendOpen && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {LEGEND_ORDER.map((key) => {
                  const meta = CATEGORY_META[key];
                  if (!meta) return null;
                  const count = categoryCounts[key] || 0;
                  const isSelected = filterCategory === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilterCategory(prev => prev === key ? null : key)}
                      className={`flex items-center justify-between gap-2 text-[9px] font-mono px-2 py-1 rounded-md transition-all text-left cursor-pointer border ${
                        isSelected
                          ? 'bg-white text-black font-bold shadow-md border-white'
                          : 'border-transparent text-neutral-300 hover:text-white hover:bg-white/10'
                      }`}
                      style={isSelected ? { boxShadow: `0 0 10px ${meta.color}50` } : undefined}
                      title={`Filter by ${meta.label} (${count} present)`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20"
                          style={{ backgroundColor: meta.color, boxShadow: `0 0 6px ${meta.color}66` }}
                        />
                        <span className="truncate font-medium">{meta.label}</span>
                      </span>
                      {count > 0 && (
                        <span
                          className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                            isSelected ? 'bg-black text-white' : 'bg-white/10 text-neutral-300'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {children}
      </div>
    </section>
  );
}
