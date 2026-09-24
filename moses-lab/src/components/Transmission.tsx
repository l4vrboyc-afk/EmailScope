import React, { useState } from 'react';
import { Copy, Check, ArrowUpRight, ArrowUp } from 'lucide-react';
import { PROFILE_DATA } from '../data/profile';

export const Transmission: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(PROFILE_DATA.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="connect-section" id="contact">
      {/* Top Header Row */}
      <div className="connect-header-grid">
        <h2 className="connect-title">Let's connect</h2>
        <p className="connect-subtitle">
          Always open to connecting with fellow students, developers, and anyone interested in tech, 
          machine interfaces, or security.
        </p>
      </div>

      {/* Direct Email Display with Copy Button */}
      <div className="connect-email-box">
        <span className="connect-email-label mono">Direct Email</span>
        <div className="connect-email-row">
          <a 
            href={`mailto:${PROFILE_DATA.email}`}
            className="connect-email-address"
          >
            {PROFILE_DATA.email}
          </a>
          <button 
            className="connect-copy-btn mono"
            onClick={handleCopyEmail}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'copied!' : 'copy address'}</span>
          </button>
        </div>
        <p className="connect-email-hint">
          Click to compose in your mail client or copy the address.
        </p>
      </div>

      {/* Socials & Cursive Signature Row (Exact Match to Screenshot 2) */}
      <div className="connect-socials-sig-row">
        {/* Left: Social Columns */}
        <div className="connect-social-cols">
          {/* GitHub */}
          <a 
            href={PROFILE_DATA.github} 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-col-item"
          >
            <div className="social-col-top">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <ArrowUpRight className="w-3.5 h-3.5 text-secondary" />
            </div>
            <span className="social-label">GitHub</span>
            <span className="social-value">Moses-Egbunike</span>
          </a>

          {/* X (formerly Twitter) */}
          <a 
            href="https://x.com/moses_egbunike" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-col-item"
          >
            <div className="social-col-top">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <ArrowUpRight className="w-3.5 h-3.5 text-secondary" />
            </div>
            <span className="social-label">X (formerly Twitter)</span>
            <span className="social-value">@moses_egbunike</span>
          </a>

          {/* Telegram / Comms */}
          <a 
            href="https://t.me/moses_egbunike" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-col-item"
          >
            <div className="social-col-top">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              <ArrowUpRight className="w-3.5 h-3.5 text-secondary" />
            </div>
            <span className="social-label">Telegram</span>
            <span className="social-value">@moses_egbunike</span>
          </a>
        </div>

        {/* Right: The Handwritten Cursive Signature (Screenshot 2 Match) */}
        <div className="connect-signature-box">
          <span 
            className="connect-signature-text"
            style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: '4.2rem',
              color: '#ffffff',
              letterSpacing: '0.02em',
              userSelect: 'none'
            }}
          >
            .Jupiter...
          </span>
        </div>
      </div>

      {/* Bottom Legal / Navigation Bar */}
      <div className="connect-bottom-bar">
        <span className="connect-copyright">
          Moses Egbunike · Babcock University, Nigeria
        </span>
        <div className="connect-bottom-right">
          <span>© 2026</span>
          <button 
            className="back-to-top-btn mono"
            onClick={scrollToTop}
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
