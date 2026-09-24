import React, { useState, useEffect, useRef } from 'react';

interface NotFoundPageProps {
  onBack: () => void;
}

/**
 * ThreatScope 404 page.
 *
 * Inspired by iyo.ai/404 — a full-bleed dark canvas with animated concentric
 * radar rings that fade radially from centre → edges, the ThreatScope wordmark
 * centred over the rings, and a single paragraph of monospace copy beneath.
 */
export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onBack }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [reconnecting, setReconnecting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  /* ── Connectivity listeners ── */
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setTimeout(() => onBack(), 1200);
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [onBack]);

  /* ── ESC to dismiss ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onBack]);

  /* ── Animated concentric rings on canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.54;

      /* Number of rings — dense like iyo */
      const totalRings = 28;

      for (let i = 0; i < totalRings; i++) {
        const progress = i / (totalRings - 1); // 0 → 1
        const r = progress * maxR;

        /* Rings pulse outward slowly */
        const shift = (t * 0.18) % (maxR / totalRings);
        const rr = r + shift;
        if (rr > maxR) continue;

        /* Fade: bright at centre, invisible at edges (matches iyo mask) */
        const edgeFade = 1 - (rr / maxR) ** 1.6;
        const alpha = edgeFade * 0.55;

        /* Each ring is drawn as dashed arcs (segmented like iyo) */
        const dashLen = 2 * Math.PI * rr / (i * 0.8 + 3); // arc length per dash
        const gap = dashLen * 0.45;

        /* Rotate offset per ring + animate */
        const rotOffset = i * 0.31 + t * (i % 2 === 0 ? 0.004 : -0.003);

        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, 2 * Math.PI);
        ctx.setLineDash([dashLen, gap]);
        ctx.lineDashOffset = -rotOffset * rr;
        ctx.strokeStyle = `rgba(180,180,190,${alpha})`;
        ctx.lineWidth = i < 4 ? 0.7 : 0.85;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      /* Tiny solid core dot */
      ctx.beginPath();
      ctx.arc(cx, cy, 2.2, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(200,200,210,0.4)';
      ctx.fill();

      t += 1;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleRetry = () => {
    setReconnecting(true);
    setTimeout(() => {
      setReconnecting(false);
      if (navigator.onLine) onBack();
    }, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0a0a0b] flex flex-col items-center justify-center overflow-hidden select-none"
    >
      {/* ── Animated ring canvas ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      />

      {/* ── Radial mask: centre opaque → edges transparent (iyo technique) ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 50% 50%, transparent 0%, transparent 42%, #0a0a0b 100%)',
        }}
      />

      {/* ── Centered content — sits on top of canvas ── */}
      <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center" style={{ marginTop: '-2vh' }}>

        {/* WordMark — ThreatScope in same spirit as iyo logo treatment */}
        <button
          type="button"
          onClick={onBack}
          className="group cursor-pointer focus:outline-none"
          aria-label="Return to ThreatScope"
        >
          {/* Wordmark — Inter 800, matches splash screen + landing page brand */}
          <span
            style={{
              display: 'block',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(22px, 4vw, 32px)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#ffffff',
              transition: 'opacity 0.3s ease',
            }}
            className="group-hover:opacity-50"
          >
            ThreatScope
          </span>
        </button>

        {/* Body copy — iyo style: muted grey, small, centered */}
        <p
          className="max-w-xs leading-relaxed"
          style={{
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            fontSize: '12px',
            color: 'rgba(200,200,210,0.55)',
            letterSpacing: '0.02em',
          }}
        >
          Signal lost. This scope has no target to lock on to.{' '}
          {isOnline ? (
            <>
              Return to{' '}
              <button
                type="button"
                onClick={onBack}
                className="underline underline-offset-2 transition-colors"
                style={{ color: 'rgba(220,220,230,0.85)' }}
              >
                home
              </button>{' '}
              and re-acquire the target.
            </>
          ) : (
            <>
              No network link detected. Re-establish comms and{' '}
              <button
                type="button"
                onClick={handleRetry}
                className="underline underline-offset-2 transition-colors"
                style={{ color: reconnecting ? 'rgba(200,200,210,0.4)' : 'rgba(220,220,230,0.85)' }}
                disabled={reconnecting}
              >
                {reconnecting ? 'probing…' : 'retry'}
              </button>
              .
            </>
          )}
        </p>

        {/* Tiny status / error code */}
        <div
          className="flex items-center gap-3 mt-1"
          style={{
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            fontSize: '9px',
            color: 'rgba(150,150,160,0.35)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          <span>ERR · 0x404</span>
          <span className="w-px h-3 bg-white/10" />
          <span>NO_SIGNAL</span>
          <span className="w-px h-3 bg-white/10" />
          <span
            className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500/60' : 'bg-white/20 animate-pulse'}`}
          />
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
