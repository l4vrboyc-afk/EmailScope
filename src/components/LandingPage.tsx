import React, { useEffect, useRef, useState } from 'react';
import {
  Shield,
  ArrowRight,
  Database,
  Network,
  Globe2,
  AlertOctagon,
  Cpu,
  Fingerprint,
  ChevronRight,
  Archive,
  Lock,
  Zap,
  Download,
  CheckCircle,
  X,
} from 'lucide-react';
import ContactModal, {
  DISCORD_ID,
  GMAIL_ADDRESS,
  GITHUB_URL,
  DiscordIcon,
  GmailIcon,
  GitHubIcon,
} from './ContactModal';

interface LandingPageProps {
  onLaunchWorkspace: () => void;
  onOpenCaseVault?: () => void;
  caseCount?: number;
  isNative?: boolean;
}

const RECENT_BREACHES = [
  {
    name: 'ComboList Public Leak Collection',
    date: 'Cataloged in Core',
    count: 'Standard OSINT DB',
    tags: ['Passwords', 'Email Addresses', 'Hash Salts'],
    status: 'ACTIVE MONITOR',
  },
  {
    name: 'Stealer Log Threat Artifacts',
    date: 'Signature Library',
    count: 'Local Heuristics',
    tags: ['Session Tokens', 'Autofill Data', 'IP Artifacts'],
    status: 'ACTIVE MONITOR',
  },
  {
    name: 'Disposable Mail Blocklist',
    date: '10,000+ Domains',
    count: 'Local Catalog',
    tags: ['Burner Inboxes', 'Temp Mail', 'Forwarders'],
    status: 'FILTER LOADED',
  },
  {
    name: 'Social Network Scrape Targets',
    date: 'API & Web Profiles',
    count: 'Cross-Platform',
    tags: ['Usernames', 'Profile Links', 'Avatars'],
    status: 'CORRELATED',
  },
];

const CAPABILITIES = [
  {
    icon: Database,
    title: 'Breach & Credential Radar',
    desc: 'Cross-reference targets against public breach sources, hash exposures, and compromised accounts.',
    tag: 'Breach Forensics',
  },
  {
    icon: Shield,
    title: 'Domain & Spoofing Defense',
    desc: 'Deep verification of SPF, DKIM, DMARC enforcement, MX records, and WHOIS registrar history.',
    tag: 'DNS Intelligence',
  },
  {
    icon: Network,
    title: 'Interactive Entity Graph',
    desc: 'WebGL force-directed canvas linking emails, domains, phone numbers, and shared identities.',
    tag: 'Graph Visualizer',
  },
  {
    icon: Globe2,
    title: 'Global Threat GeoIP Map',
    desc: 'Trace mail relay paths, physical server nodes, ASN routing, and identify anonymizing proxies.',
    tag: 'GeoIP Routing',
  },
  {
    icon: Fingerprint,
    title: 'Digital Footprint & Persona',
    desc: 'Discover public traces across GitHub, Gravatar, domain registries, and platform aliases.',
    tag: 'OSINT Recon',
  },
  {
    icon: Cpu,
    title: 'AI Narrative & Risk Scoring',
    desc: 'Synthesize complex technical findings into plain-language executive summaries and risk verdicts.',
    tag: 'Risk Verdict',
  },
];

/** Simple hook: returns true once the element enters the viewport */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

type OSType = 'windows' | 'macos' | 'linux';

const PLATFORMS: { id: OSType; label: string; ext: string; note: string; icon: React.ReactNode }[] = [
  {
    id: 'windows',
    label: 'Windows',
    ext: '.exe installer',
    note: 'Windows 10 / 11 · 64-bit',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="dl-os-icon">
        <path d="M3 5.6L10.5 4.54v7.03H3V5.6zm0 12.8L10.5 19.46v-7.03H3v5.97zm8.5 1.2L21 21V12.43h-9.5V19.6zm0-15.2v7.17H21V3L11.5 4.4z"/>
      </svg>
    ),
  },
  {
    id: 'macos',
    label: 'macOS',
    ext: '.dmg disk image',
    note: 'macOS 11+ · Apple Silicon & Intel',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="dl-os-icon">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
  {
    id: 'linux',
    label: 'Linux',
    ext: '.AppImage',
    note: 'Ubuntu 20.04+ · Debian · Fedora',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="dl-os-icon">
        <path d="M12.504 0C6 0 1.5 5.373 1.5 12c0 5.477 3.516 10.154 8.438 11.613.616.113.84-.267.84-.594 0-.294-.011-1.073-.017-2.107-3.43.745-4.153-1.653-4.153-1.653-.561-1.426-1.37-1.806-1.37-1.806-1.12-.765.085-.75.085-.75 1.237.087 1.888 1.27 1.888 1.27 1.1 1.884 2.888 1.34 3.59 1.025.11-.796.43-1.34.783-1.648-2.738-.312-5.616-1.369-5.616-6.09 0-1.346.48-2.447 1.268-3.31-.127-.311-.55-1.565.12-3.262 0 0 1.034-.331 3.39 1.265a11.82 11.82 0 013.088-.416c1.048.005 2.104.142 3.09.416 2.352-1.596 3.384-1.265 3.384-1.265.672 1.697.25 2.951.123 3.262.79.863 1.266 1.964 1.266 3.31 0 4.733-2.882 5.774-5.628 6.079.443.381.837 1.132.837 2.282 0 1.648-.015 2.976-.015 3.381 0 .329.22.713.847.592C19.491 22.147 23 17.474 23 12 23 5.373 18.53 0 12.504 0z"/>
      </svg>
    ),
  },
];

// GitHub Releases base URL — update this when you publish your first release
const GH_RELEASE = 'https://github.com/threatscope/threatscope/releases/latest';
const DL_URLS: Record<OSType, string> = {
  windows: `${GH_RELEASE}/download/ThreatScope_x64-setup.exe`,
  macos:   `${GH_RELEASE}/download/ThreatScope_x64.dmg`,
  linux:   `${GH_RELEASE}/download/ThreatScope_x86_64.AppImage`,
};

export default function LandingPage({
  onLaunchWorkspace,
  onOpenCaseVault,
  caseCount = 0,
  isNative = false,
}: LandingPageProps) {
  const [heroVisible, setHeroVisible] = useState(false);
  const [detectedOS, setDetectedOS] = useState<OSType>('windows');
  const [contactOpen, setContactOpen] = useState(false);
  const breachSection  = useInView();
  const capSection     = useInView();
  const dlSection      = useInView();
  const ctaSection     = useInView();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    // Detect OS from userAgent
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac'))    setDetectedOS('macos');
    else if (ua.includes('linux')) setDetectedOS('linux');
    else                           setDetectedOS('windows');
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="lp-root">
      {/* ── Animated grid background ── */}
      <div className="lp-grid-bg" />
      <div className="lp-radial-fade" />

      {/* ══ TOP NAVIGATION ══════════════════════════════════════════ */}
      <header className="lp-header">
        <div className="lp-header-inner">
          {/* Brand */}
          <div
            className="lp-brand"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img src="/logo.png" alt="ThreatScope" className="lp-brand-logo" />
            <div className="lp-brand-text">
              <div className="lp-brand-name-row">
                <span className="lp-brand-name">ThreatScope</span>
                <span className="lp-version-badge">v0.1.0</span>
              </div>
              <div className="lp-engine-row">
                <span className="lp-engine-dot" />
                <span className="lp-engine-label">
                  {isNative ? 'Native Desktop Shell' : 'Web Engine Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Center nav */}
          <nav className="lp-nav">
            <a href="#breaches" className="lp-nav-link">Breach Radar</a>
            <a href="#capabilities" className="lp-nav-link">Capabilities</a>
            <a href="#download" className="lp-nav-link lp-nav-link-dl">
              <Download className="w-3 h-3" />
              Download
            </a>
            <button
              type="button"
              id="btn-nav-contact"
              onClick={() => setContactOpen(true)}
              className="lp-nav-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Contact
            </button>
          </nav>

          {/* CTA */}
          <button type="button" onClick={onLaunchWorkspace} className="lp-nav-cta">
            Workspace
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ══ HERO ════════════════════════════════════════════════════ */}
      <main className="lp-hero">
        <div className={`lp-hero-inner ${heroVisible ? 'lp-enter' : 'lp-enter-hidden'}`}>

          {/* Eyebrow */}
          <div className="lp-eyebrow" style={{ transitionDelay: '0ms' }}>
            <Shield className="w-3 h-3 text-white/70" />
            <span>Open-Source Intelligence &amp; Threat Investigation Platform</span>
          </div>

          {/* Display title */}
          <h1 className="lp-hero-title" style={{ transitionDelay: '80ms' }}>
            <span className="lp-title-dim">Find</span>
            {' '}
            <span className="lp-title-dim2">the</span>
            <br />
            <span className="lp-title-bright">Threat.</span>
          </h1>

          {/* Subtitle */}
          <p className="lp-hero-sub" style={{ transitionDelay: '160ms' }}>
            Investigate any email address, domain, or digital persona across
            open-source intelligence, compromised databases, and correlation graphs.
          </p>

          {/* CTA group */}
          <div className="lp-hero-cta-group" style={{ transitionDelay: '240ms' }}>
            <button
              type="button"
              id="hero-workspace-btn"
              onClick={() => onLaunchWorkspace()}
              className="lp-cta-primary group"
            >
              <span>Enter Workspace</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="lp-cta-note">
              <Lock className="w-3 h-3 opacity-50" />
              100% Client-Side · Zero telemetry · Local heuristics
            </p>
          </div>

          {/* Stats banner */}
          <div className="lp-stats-banner" style={{ transitionDelay: '320ms' }}>
            <div className="lp-stats-grid">
              <div className="lp-stat">
                <span className="lp-stat-num">14+</span>
                <span className="lp-stat-label">Integrated OSINT Engines</span>
                <span className="lp-stat-sub">DNS · CT Logs · GeoIP · Gravatar · Breach · Phone · WHOIS</span>
              </div>
              <div className="lp-stat-divider" />
              <div className="lp-stat">
                <span className="lp-stat-num">10,000+</span>
                <span className="lp-stat-label">Disposable Domains Filtered</span>
                <span className="lp-stat-sub">Local Temp Mail Blacklist · Real-time Heuristic Matching</span>
              </div>
            </div>
            <div className="lp-stats-footer">
              <div className="lp-stats-pill">
                <Zap className="w-3 h-3" />
                <span>0 Bytes Remote Logging</span>
              </div>
              <div className="lp-stats-pill">
                <Lock className="w-3 h-3" />
                <span>Local / Private Execution</span>
              </div>
              <div className="lp-stats-pill">
                <Network className="w-3 h-3" />
                <span>Real-Time WebGL Graph</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ══ BREACH RADAR ════════════════════════════════════════════ */}
      <section id="breaches" className="lp-section lp-section-dark">
        <div
          ref={breachSection.ref}
          className={`lp-section-inner ${breachSection.inView ? 'lp-enter' : 'lp-enter-hidden'}`}
        >
          <div className="lp-section-header">
            <div>
              <div className="lp-section-eyebrow">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>OSINT Breach Heuristics</span>
              </div>
              <h2 className="lp-section-title">Monitored Breach Vectors &amp; Sources</h2>
            </div>
            <p className="lp-section-aside">
              Cross-referenced on demand inside the Analyst Workspace
            </p>
          </div>

          <div className="lp-breach-grid">
            {RECENT_BREACHES.map((item, i) => (
              <div
                key={item.name}
                className="lp-breach-card"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="lp-breach-top">
                  <div>
                    <h3 className="lp-breach-name">{item.name}</h3>
                    <div className="lp-breach-meta">
                      <span>{item.date}</span>
                      <span className="lp-dot">·</span>
                      <span className="lp-breach-count">{item.count}</span>
                    </div>
                  </div>
                  <span className="lp-status-badge">{item.status}</span>
                </div>
                <div className="lp-breach-tags">
                  {item.tags.map((tag) => (
                    <span key={tag} className="lp-tag">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CAPABILITIES GRID ═══════════════════════════════════════ */}
      <section id="capabilities" className="lp-section lp-section-black">
        <div
          ref={capSection.ref}
          className={`lp-section-inner ${capSection.inView ? 'lp-enter' : 'lp-enter-hidden'}`}
        >
          <div className="lp-cap-header">
            <span className="lp-section-eyebrow-plain">Platform Architecture</span>
            <h2 className="lp-cap-title">End-to-End Investigation Toolkit</h2>
            <p className="lp-cap-sub">Explore the core analytical modules built into ThreatScope.</p>
          </div>

          <div className="lp-cap-grid">
            {CAPABILITIES.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="lp-cap-card group"
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  <div className="lp-cap-card-top">
                    <div className="lp-cap-icon-wrap group-hover:lp-cap-icon-active">
                      <Icon className="w-5 h-5 transition-transform group-hover:scale-110 group-hover:-translate-y-0.5 duration-200" />
                    </div>
                    <span className="lp-cap-tag">{cap.tag}</span>
                  </div>
                  <h3 className="lp-cap-name">{cap.title}</h3>
                  <p className="lp-cap-desc">{cap.desc}</p>
                  <div className="lp-cap-footer">
                    <span>Available in workspace</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                  {/* Hover sweep border glow */}
                  <div className="lp-cap-glow" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ DOWNLOAD SECTION ═══════════════════════════════════════ */}
      <section id="download" className="lp-section lp-section-dark">
        <div
          ref={dlSection.ref}
          className={`lp-section-inner ${dlSection.inView ? 'lp-enter' : 'lp-enter-hidden'}`}
        >
          {/* Header */}
          <div className="lp-cap-header">
            <span className="lp-section-eyebrow-plain">Native Desktop App</span>
            <h2 className="lp-cap-title">ThreatScope Desktop</h2>
            <p className="lp-cap-sub">
              Full power. Local execution. Zero telemetry. Download the native app for
              all 14+ OSINT engines running entirely on your machine.
            </p>
          </div>

          {/* Platform cards */}
          <div className="dl-platform-grid">
            {PLATFORMS.map((platform, i) => {
              const isDetected = platform.id === detectedOS;
              return (
                <div
                  key={platform.id}
                  className={`dl-platform-card dl-platform-card--${platform.id} ${isDetected ? 'dl-platform-card--detected' : ''}`}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  {isDetected && (
                    <div className="dl-detected-badge">
                      <span className="dl-detected-dot" />
                      Recommended for your system
                    </div>
                  )}

                  <div className="dl-platform-icon">{platform.icon}</div>
                  <h3 className="dl-platform-name">{platform.label}</h3>
                  <p className="dl-platform-ext">{platform.ext}</p>
                  <p className="dl-platform-note">{platform.note}</p>

                  <a
                    href={DL_URLS[platform.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`dl-btn ${isDetected ? 'dl-btn--primary' : 'dl-btn--secondary'}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isDetected ? `Download for ${platform.label}` : `Download`}
                  </a>
                </div>
              );
            })}
          </div>

          {/* Web vs Desktop comparison */}
          <div className="dl-compare">
            <div className="dl-compare-row dl-compare-header">
              <span className="dl-compare-feature">Feature</span>
              <span className="dl-compare-col">Web</span>
              <span className="dl-compare-col">Desktop</span>
            </div>
            {[
              ['All 14+ OSINT engines', false, true],
              ['Works in browser', true, false],
              ['Zero installation', true, false],
              ['Python sidecar (full power)', false, true],
              ['Zero telemetry', true, true],
              ['Offline capable', false, true],
              ['Case Vault (local)', true, true],
            ].map(([feat, web, desktop]) => (
              <div key={String(feat)} className="dl-compare-row">
                <span className="dl-compare-feature">{String(feat)}</span>
                <span className="dl-compare-col">
                  {web
                    ? <CheckCircle className="w-4 h-4 dl-check" />
                    : <X className="w-4 h-4 dl-cross" />}
                </span>
                <span className="dl-compare-col">
                  {desktop
                    ? <CheckCircle className="w-4 h-4 dl-check" />
                    : <X className="w-4 h-4 dl-cross" />}
                </span>
              </div>
            ))}
          </div>

          <p className="dl-release-note">
            View all releases and changelogs on&nbsp;
            <a href={GH_RELEASE} target="_blank" rel="noopener noreferrer" className="dl-gh-link">
              GitHub Releases →
            </a>
          </p>
        </div>
      </section>

      {/* ══ CTA SECTION ═════════════════════════════════════════════ */}
      <section className="lp-section lp-section-dark lp-cta-section">
        <div
          ref={ctaSection.ref}
          className={`lp-section-inner text-center ${ctaSection.inView ? 'lp-enter' : 'lp-enter-hidden'}`}
        >
          <h2 className="lp-cta-heading">Ready to Scope an Investigation?</h2>
          <p className="lp-cta-body">
            Launch the analyst workspace to explore interactive entity graphs, threat maps,
            pivot on connected nodes, and export incident reports.
          </p>
          <div className="lp-cta-btn-row">
            <button
              type="button"
              id="btn-launch-workspace-cta"
              onClick={() => onLaunchWorkspace()}
              className="lp-cta-primary group"
            >
              <span>Launch Analyst Workspace</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            {onOpenCaseVault && caseCount > 0 && (
              <button
                type="button"
                onClick={onOpenCaseVault}
                className="lp-cta-secondary"
              >
                <Archive className="w-4 h-4" />
                <span>Open Case Vault ({caseCount})</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src="/logo.png" alt="ThreatScope" className="lp-footer-logo" />
            <span className="lp-footer-name">ThreatScope OSINT Framework</span>
          </div>

          {/* Socials & Developer Contact */}
          <div className="lp-footer-contact-row">
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="lp-footer-contact-btn"
              title="Open Contact Card"
            >
              Contact Me
            </button>

            <div className="lp-footer-social-icons">
              <a
                href={`https://discord.com/users/${DISCORD_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-footer-social-link"
                title="Discord (@moses.exe)"
              >
                <DiscordIcon className="w-5 h-5" />
              </a>
              <a
                href={`mailto:${GMAIL_ADDRESS}?subject=ThreatScope%20Inquiry`}
                className="lp-footer-social-link"
                title="Send Email (l4vrboyc@gmail.com)"
              >
                <GmailIcon className="w-5 h-5" />
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-footer-social-link"
                title="GitHub Profile (l4vrboyc-afk)"
              >
                <GitHubIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="lp-footer-meta">
            <span>Client-Side Execution</span>
            <span className="lp-dot">·</span>
            <span>Zero Telemetry</span>
            <span className="lp-dot">·</span>
            <span>MIT License</span>
          </div>
        </div>
      </footer>

      {/* ══ CONTACT MODAL ══════════════════════════════════════════ */}
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
