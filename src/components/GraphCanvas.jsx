/**
 * GraphCanvas — WebGL/canvas force-directed entity graph.
 *
 * Cyber-SOC Visualization:
 *  - High-performance force-directed topology rendering
 *  - Radial glow halos for root seed and high-severity breach nodes
 *  - Category filtering highlighting
 *  - Electric-cyan directed link particles
 *  - Contextual radial pivot action menu
 */
import React, { useEffect, useRef, useState } from 'react';
import ForceGraph from 'force-graph';
import { forceCollide } from 'd3-force-3d';
import {
  Loader2, Network, Mail, Globe, Server, User, AlertTriangle,
  Building2, Phone, Fingerprint, Share2, MapPin, CircleDot, Link2,
} from 'lucide-react';

export const CATEGORY_META = {
  email:          { label: 'Email',          color: '#ffffff', icon: Mail },        // Seed target / anchor: Crisp pure white
  url:            { label: 'URL / Link',     color: '#f59e0b', icon: Link2 },       // Tactical Amber: URL / Link analysis
  domain:         { label: 'Domain',         color: '#818cf8', icon: Globe },       // Electric Indigo (DNS / web routing)
  ip:             { label: 'IP',             color: '#06b6d4', icon: Server },      // Cyber Cyan (telemetry / addresses)
  breach:         { label: 'Breach',         color: '#f43f5e', icon: AlertTriangle },// Signal Crimson (danger / threat)
  telephony:      { label: 'Telephony',      color: '#f59e0b', icon: Phone },       // Warm Amber (telecom / carrier)
  identity:       { label: 'Identity',       color: '#a78bfa', icon: Fingerprint }, // Electric Violet (person / actor)
  infrastructure: { label: 'Infrastructure', color: '#38bdf8', icon: Building2 },   // Sky Blue (mail servers, MX, routing)
  social:         { label: 'Social',         color: '#ec4899', icon: Share2 },      // Vibrant Pink (social footprint)
  geo:            { label: 'Geo',            color: '#10b981', icon: MapPin },      // Emerald (geographic coordinates)
  username:       { label: 'Username',       color: '#c084fc', icon: User },        // Lavender (handle / alias)
};

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.0;

function clampLabel(value) {
  const text = String(value ?? '');
  return text.length > 28 ? `${text.slice(0, 27)}…` : text;
}

export default function GraphCanvas({
  graphData,
  onNodeSelect,
  onPivot,
  pivotingNode,
  onApiReady,
  filterCategory = null,
  legendOpen = true,
  isMinimized = false,
}) {
  const containerRef = useRef(null);
  const graphInstance = useRef(null);
  const nodesRef = useRef(new Map());
  const filterCategoryRef = useRef(filterCategory);
  filterCategoryRef.current = filterCategory;
  const legendOpenRef = useRef(legendOpen);
  legendOpenRef.current = legendOpen;
  const isMinimizedRef = useRef(isMinimized);
  isMinimizedRef.current = isMinimized;
  const cameraAnimRef = useRef(null);

  const [menuNode, setMenuNode] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const closeMenu = () => setMenuNode(null);

  const getCameraOffset = (zoomLevel = 1.0) => {
    if (isMinimizedRef.current) {
      return { x: 0, y: 0, screenShiftX: 0 };
    }
    const isLegendVisible = legendOpenRef.current;
    // Shift camera focus point rightwards in graph space so node cluster
    // appears shifted to the left on-screen, clear of the legend card.
    const screenShiftX = isLegendVisible ? 165 : 40;
    return {
      x: screenShiftX / Math.max(0.1, zoomLevel),
      y: 0,
      screenShiftX,
    };
  };

  const getNodesCenter = () => {
    const Graph = graphInstance.current;
    if (!Graph) return { x: 0, y: 0, width: 200, height: 200 };
    const nodes = (Graph.graphData()?.nodes || []).filter(
      (n) => Number.isFinite(n.x) && Number.isFinite(n.y)
    );
    if (!nodes.length) {
      return { x: 0, y: 0, width: 200, height: 200 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const nd of nodes) {
      const r = (nd.val || 5) * (nd.isRoot ? 2.5 : 1.6);
      if (nd.x - r < minX) minX = nd.x - r;
      if (nd.x + r > maxX) maxX = nd.x + r;
      if (nd.y - r < minY) minY = nd.y - r;
      if (nd.y + r > maxY) maxY = nd.y + r;
    }

    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      width: Math.max(80, maxX - minX),
      height: Math.max(80, maxY - minY),
    };
  };

  const animateCamera = (targetK, targetX, targetY, duration = 250) => {
    const Graph = graphInstance.current;
    if (!Graph) return;

    if (cameraAnimRef.current) {
      cancelAnimationFrame(cameraAnimRef.current);
      cameraAnimRef.current = null;
    }

    const clampedK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetK));

    if (!duration || duration <= 0) {
      Graph.zoom(clampedK, 0);
      Graph.centerAt(targetX, targetY, 0);
      return;
    }

    const startK = Graph.zoom() || 1.2;
    const currentCenter = Graph.centerAt() || { x: 0, y: 0 };
    const startX = Number.isFinite(currentCenter.x) ? currentCenter.x : targetX;
    const startY = Number.isFinite(currentCenter.y) ? currentCenter.y : targetY;
    const startTime = performance.now();

    const frame = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out
      const t = 1 - Math.pow(1 - progress, 3);

      const k = startK + (clampedK - startK) * t;
      const x = startX + (targetX - startX) * t;
      const y = startY + (targetY - startY) * t;

      Graph.zoom(k, 0);
      Graph.centerAt(x, y, 0);

      if (progress < 1) {
        cameraAnimRef.current = requestAnimationFrame(frame);
      } else {
        cameraAnimRef.current = null;
      }
    };

    cameraAnimRef.current = requestAnimationFrame(frame);
  };

  const fitToCenter = (duration = 350) => {
    const Graph = graphInstance.current;
    if (!Graph) return;
    const bounds = getNodesCenter();

    const containerW = containerRef.current?.clientWidth || 1000;
    const containerH = containerRef.current?.clientHeight || 600;

    const isLegendVisible = !isMinimizedRef.current && legendOpenRef.current;
    const paddingLeft = isMinimizedRef.current ? 20 : 60;
    const paddingRight = isLegendVisible ? 360 : (isMinimizedRef.current ? 20 : 80);
    const paddingY = isMinimizedRef.current ? 20 : 80;

    const availW = Math.max(120, containerW - paddingLeft - paddingRight);
    const availH = Math.max(120, containerH - paddingY * 2);

    const fitK = Math.min(availW / bounds.width, availH / bounds.height);
    const targetK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitK));

    const offset = getCameraOffset(targetK);
    animateCamera(targetK, bounds.x + offset.x, bounds.y, duration);
  };

  const zoomBy = (factor, duration = 200) => {
    const Graph = graphInstance.current;
    if (!Graph) return;
    const currentK = Graph.zoom() || 1.2;
    const nextK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentK * factor));
    const center = getNodesCenter();
    const offset = getCameraOffset(nextK);
    animateCamera(nextK, center.x + offset.x, center.y, duration);
  };

  const resetCamera = (duration = 300) => {
    const center = getNodesCenter();
    const targetK = Math.min(1.45, MAX_ZOOM);
    const offset = getCameraOffset(targetK);
    animateCamera(targetK, center.x + offset.x, center.y, duration);
  };

  // Center-anchored wheel zooming: locks zoom focal point strictly to the nodes centroid with legend offset
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const Graph = graphInstance.current;
      if (!Graph) return;

      if (cameraAnimRef.current) {
        cancelAnimationFrame(cameraAnimRef.current);
        cameraAnimRef.current = null;
      }

      const currentK = Graph.zoom() || 1.2;
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      const nextK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentK * factor));

      const center = getNodesCenter();
      const offset = getCameraOffset(nextK);
      // Instantly zoom and center on node centroid with left offset so nodes never hide behind legend
      Graph.zoom(nextK, 0);
      Graph.centerAt(center.x + offset.x, center.y, 0);
    };

    container.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const initW = containerRef.current.clientWidth || window.innerWidth;
    const initH = containerRef.current.clientHeight || 600;

    const Graph = ForceGraph()(containerRef.current)
      .width(initW)
      .height(initH)
      .backgroundColor('#000000')
      .minZoom(MIN_ZOOM)
      .maxZoom(MAX_ZOOM)
      .enableZoomInteraction(false)
      .nodeId('id')
      .nodeVal('val')
      .nodeColor('color')
      .nodeLabel(node => node.canvasLabel || node.label)
      .linkWidth(1.2)
      .linkColor(() => 'rgba(255, 255, 255, 0.14)')
      .linkDirectionalParticles(2)
      .linkDirectionalParticleWidth(1.8)
      .linkDirectionalParticleSpeed(0.006)
      .linkDirectionalParticleColor(link => (
        link.target?.category === 'breach' || link.source?.category === 'breach'
          ? 'rgba(244, 63, 94, 0.9)'
          : 'rgba(56, 189, 248, 0.85)'
      ))
      .onNodeClick(node => {
        if (onNodeSelect) onNodeSelect(node);
        try {
          const pos = Graph.graph2ScreenCoords(node.x, node.y);
          setMenuNode(node);
          setMenuPos(pos);
        } catch {
          setMenuNode(node);
          setMenuPos({ x: 0, y: 0 });
        }
      })
      .onBackgroundClick(() => closeMenu());

    // Configure D3 forces for ample node separation and collision prevention in normal state
    const linkForce = Graph.d3Force('link');
    if (linkForce) {
      linkForce.distance(link => (link.source?.isRoot || link.target?.isRoot ? 115 : 90));
    }
    const chargeForce = Graph.d3Force('charge');
    if (chargeForce) {
      chargeForce
        .strength(node => (node.isRoot ? -420 : -260))
        .distanceMax(800);
    }
    Graph.d3Force('collision', forceCollide(node => (node.val || 5) * 2.2 + 28));

    Graph.nodeCanvasObject((node, ctx, globalScale) => {
      const activeFilter = filterCategoryRef.current;
      const isFilteredOut = activeFilter && node.category !== activeFilter;
      const isFilterMatch = activeFilter && node.category === activeFilter;

      const label = node.canvasLabel || node.label;
      const fontSize = 11 / globalScale;
      const radius = node.val;

      ctx.save();
      if (isFilteredOut) {
        ctx.globalAlpha = 0.25;
      }

      // Halos for Breaches or Key Pivot Nodes
      if (node.category === 'breach' || node.isBreach) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 2.0, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.26)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 1.4, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
        ctx.fill();
      } else if (node.isRoot) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 2.2, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.fill();
      } else if (node.isPivot) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 1.6, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
        ctx.fill();
      }

      // Matching filter ring
      if (isFilterMatch) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 2.2, 0, 2 * Math.PI, false);
        ctx.strokeStyle = node.color || '#ffffff';
        ctx.lineWidth = 2.2 / globalScale;
        ctx.stroke();
      }

      // New discovery double-ring
      if (node.isNew) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 1.8, 0, 2 * Math.PI, false);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.lineWidth = 1.6 / globalScale;
        ctx.stroke();
      }

      // Main Node Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();

      // ── Render Node Title & Subheading with protective backdrops & generous vertical spacing ──
      const titleFontSize = 10.5 / globalScale;
      const badgeFontSize = 7.5 / globalScale;
      const titleY = node.y + radius + (5 / globalScale);
      const badgeGap = 4.5 / globalScale;
      const badgeY = titleY + titleFontSize + badgeGap;

      // 1. Title Label with protective glass backdrop
      ctx.font = `600 ${titleFontSize}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const titleWidth = ctx.measureText(label).width;
      const titlePadX = 5 / globalScale;
      const titlePadY = 1.8 / globalScale;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(
          node.x - titleWidth / 2 - titlePadX,
          titleY - titlePadY,
          titleWidth + titlePadX * 2,
          titleFontSize + titlePadY * 2,
          3 / globalScale
        );
      } else {
        ctx.rect(
          node.x - titleWidth / 2 - titlePadX,
          titleY - titlePadY,
          titleWidth + titlePadX * 2,
          titleFontSize + titlePadY * 2
        );
      }
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 0.8 / globalScale;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.fillText(label, node.x, titleY);

      // 2. Subheading (Category Micro-Pill)
      const rawBadge = (node.badge && node.badge.replace('•', '·'))
        || `${String(node.category || 'ENTITY').toUpperCase()}`;
      const badge = String(rawBadge);

      ctx.font = `700 ${badgeFontSize}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = 'top';

      const badgeWidth = ctx.measureText(badge).width;
      const badgePadX = 4.5 / globalScale;
      const badgePadY = 1.2 / globalScale;
      const badgePillW = badgeWidth + badgePadX * 2;
      const badgePillH = badgeFontSize + badgePadY * 2;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(
          node.x - badgePillW / 2,
          badgeY - badgePadY,
          badgePillW,
          badgePillH,
          2.5 / globalScale
        );
      } else {
        ctx.rect(
          node.x - badgePillW / 2,
          badgeY - badgePadY,
          badgePillW,
          badgePillH
        );
      }
      ctx.fillStyle = 'rgba(12, 12, 14, 0.92)';
      ctx.fill();
      ctx.strokeStyle = `${node.color || '#cbd5e1'}60`;
      ctx.lineWidth = 0.8 / globalScale;
      ctx.stroke();

      // Category color tint for badge text
      ctx.fillStyle = node.color || '#cbd5e1';
      ctx.fillText(badge, node.x, badgeY);

      ctx.restore();
    });

    graphInstance.current = Graph;

    if (onApiReady) {
      onApiReady({
        zoomIn: () => zoomBy(1.35, 200),
        zoomOut: () => zoomBy(1 / 1.35, 200),
        zoomToFit: () => fitToCenter(350),
        resetCamera: () => resetCamera(300),
      });
    }

    const resizeCanvas = () => {
      if (containerRef.current && graphInstance.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          graphInstance.current.width(w).height(h);
          const center = getNodesCenter();
          const currentK = graphInstance.current.zoom() || 1.2;
          const offset = getCameraOffset(currentK);
          graphInstance.current.centerAt(center.x + offset.x, center.y, 0);
        }
      }
    };
    resizeCanvas();

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener('resize', resizeCanvas);

    return () => {
      if (cameraAnimRef.current) {
        cancelAnimationFrame(cameraAnimRef.current);
        cameraAnimRef.current = null;
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      graphInstance.current = null;
      nodesRef.current = new Map();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update camera smoothly when legend is toggled or card is minimized/expanded
  useEffect(() => {
    legendOpenRef.current = legendOpen;
    isMinimizedRef.current = isMinimized;
    if (graphInstance.current && nodesRef.current.size > 0) {
      const Graph = graphInstance.current;
      const currentK = Graph.zoom() || 1.2;
      const center = getNodesCenter();
      const offset = getCameraOffset(currentK);
      animateCamera(currentK, center.x + offset.x, center.y, 250);
    }
  }, [legendOpen, isMinimized]);

  // Update filter on change
  useEffect(() => {
    filterCategoryRef.current = filterCategory;
    if (graphInstance.current) {
      graphInstance.current.refresh?.();
    }
  }, [filterCategory]);

  useEffect(() => {
    const Graph = graphInstance.current;
    if (!Graph || !graphData) return;

    const prevNodes = nodesRef.current;
    const nextNodes = (graphData.nodes || []).map(n => {
      const existing = prevNodes.get(n.canonical_id);
      if (existing) {
        if (existing.isNew) existing.isNew = false;
        return existing;
      }
      const isRoot = !!(n.metadata && n.metadata.is_root_seed);
      const isPivot = !!(n.metadata && n.metadata.is_key_pivot_node);
      const isBreach = n.category === 'breach';

      return {
        id: n.canonical_id,
        canonical_id: n.canonical_id,
        label: clampLabel(n.label),
        canvasLabel: clampLabel(n.canvasLabel || n.label),
        badge: n.badge,
        riskLevel: n.riskLevel,
        category: n.category,
        data: n.data,
        isRoot,
        isPivot,
        isBreach,
        isNew: !!(n.metadata && n.metadata.is_new_discovery),
        val: isRoot ? 9 : isPivot ? 7 : isBreach ? 6 : 4.5,
        color: CATEGORY_META[n.category]?.color || '#ffffff',
      };
    });

    const graphGrew = prevNodes.size > 0 && nextNodes.length > prevNodes.size;
    nodesRef.current = new Map(nextNodes.map(n => [n.id, n]));

    Graph.graphData({
      nodes: nextNodes,
      links: (graphData.edges || []).map(e => ({
        source: e.source_canonical_id,
        target: e.target_canonical_id,
        label: e.relationship,
      }))
    });

    if (prevNodes.size === 0 && nextNodes.length > 0) {
      setTimeout(() => {
        try { fitToCenter(600); } catch { /* noop */ }
      }, 700);
    }

    if (graphGrew) {
      setTimeout(() => {
        try { fitToCenter(700); } catch { /* noop */ }
      }, 900);
    }
  }, [graphData]);

  // Radial menu anchor loop
  useEffect(() => {
    if (!menuNode) return;
    let rafId;
    const tick = () => {
      const Graph = graphInstance.current;
      if (Graph && menuNode && Number.isFinite(menuNode.x) && Number.isFinite(menuNode.y)) {
        try {
          const pos = Graph.graph2ScreenCoords(menuNode.x, menuNode.y);
          setMenuPos(prev => (prev.x !== pos.x || prev.y !== pos.y ? pos : prev));
        } catch { /* noop */ }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [menuNode]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeMenu(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handlePivotClick = () => {
    const target = menuNode;
    closeMenu();
    if (target && onPivot) onPivot(target);
  };

  const HubIcon = menuNode
    ? (CATEGORY_META[menuNode.category]?.icon || CircleDot)
    : CircleDot;

  return (
    <div className="graph-container w-full h-full bg-[#000000] relative overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {/* Pivot-in-progress status chip */}
      {pivotingNode && (
        <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-black/95 backdrop-blur-md border border-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-mono shadow-2xl">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          <span>
            Pivoting on <span className="font-bold underline">{pivotingNode.canvasLabel || pivotingNode.label}</span>…
          </span>
        </div>
      )}

      {/* Radial Context Menu */}
      {menuNode && (
        <div
          className="absolute inset-0 z-30"
          onPointerDown={closeMenu}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="absolute es-menu-pop"
            style={{ left: menuPos.x, top: menuPos.y }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="relative w-48 h-48">
              <span className="absolute inset-10 rounded-full border border-white/20 es-pulse-ring" />
              <span
                className="absolute inset-14 rounded-full border border-white/10 es-pulse-ring"
                style={{ animationDelay: '0.9s' }}
              />

              <span className="absolute left-1/2 bottom-1/2 w-px h-[46px] bg-gradient-to-b from-white/60 to-transparent -translate-x-1/2" />

              {/* Hub */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full border-2 border-black shadow-xl shadow-black/80 flex items-center justify-center ring-2 ring-white/30"
                style={{ backgroundColor: menuNode.color || '#ffffff' }}
              >
                <span className="text-xs font-bold text-black">
                  <HubIcon className="w-4 h-4" />
                </span>
              </div>

              {/* Orbiting action */}
              <button
                type="button"
                disabled={!!pivotingNode}
                onClick={handlePivotClick}
                className="group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center focus:outline-none disabled:opacity-60 cursor-pointer"
                style={{ left: '50%', top: 'calc(50% - 76px)' }}
                title="Pivot deep OSINT investigation on this entity"
              >
                <span className="w-11 h-11 rounded-full bg-white text-black border border-white shadow-xl shadow-white/10 flex items-center justify-center transition-transform duration-150 group-hover:scale-110">
                  {pivotingNode ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Network className="w-5 h-5" strokeWidth={2.5} />
                  )}
                </span>
                <span className="mt-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-black border border-white/20 text-[10px] font-mono font-bold uppercase tracking-wider text-white shadow-xl">
                  Pivot Target
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
