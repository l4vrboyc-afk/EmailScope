import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const LETTERS = 'THREATSCOPE'.split('');

/**
 * Professional two-beat cinematic intro.
 *
 * Beat 1 — "THREATSCOPE" stagger-reveals letter by letter
 *           with a blur-resolve + slide-up. Feels like a
 *           system decrypting its own identity.
 * Beat 2 — Thin rule draws left→right, then "Find the threat."
 *           fades up in monospace beneath it.
 * Exit    — Full overlay fades out.
 */
export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'letters' | 'rule' | 'tagline' | 'exiting' | 'done'>('letters');

  // Timing (ms)
  // Letters: 0 – ~1100 (last letter starts at 700ms, animates 400ms)
  // Rule:    1200 – 1700
  // Tagline: 1800 – 3200 (hold)
  // Exit:    3200 – 4100

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('rule'),    1200);
    const t2 = setTimeout(() => setPhase('tagline'), 1800);
    const t3 = setTimeout(() => setPhase('exiting'), 3300);
    const t4 = setTimeout(() => { setPhase('done'); onComplete(); }, 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  if (phase === 'done') return null;

  const showRule    = phase === 'rule' || phase === 'tagline' || phase === 'exiting';
  const showTagline = phase === 'tagline' || phase === 'exiting';

  return (
    <div
      className="splash-overlay"
      style={{ opacity: phase === 'exiting' ? 0 : 1 }}
      aria-hidden="true"
    >
      {/* ── Beat 1: Stagger letter reveal ── */}
      <div className="splash-wordmark" aria-label="THREATSCOPE">
        {LETTERS.map((char, i) => (
          <span
            key={i}
            className="splash-letter"
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            {char}
          </span>
        ))}
      </div>

      {/* ── Thin rule draws under the wordmark ── */}
      <div
        className="splash-rule"
        style={{ transform: showRule ? 'scaleX(1)' : 'scaleX(0)' }}
      />

      {/* ── Beat 2: Tagline ── */}
      <p
        className="splash-tagline"
        style={{
          opacity:   showTagline ? 1 : 0,
          transform: showTagline ? 'translateY(0)' : 'translateY(6px)',
        }}
      >
        Find the threat.
      </p>
    </div>
  );
}
