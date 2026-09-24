import React, { useState } from 'react';
import { Sun, Moon, ArrowUpRight } from 'lucide-react';
import { PROFILE_DATA } from '../data/profile';

interface NavbarProps {
  currentTheme: 'emerald' | 'amber' | 'titanium';
  onThemeToggle: () => void;
  onReplayIntro: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTheme,
  onThemeToggle,
  onReplayIntro
}) => {
  const [activeTab, setActiveTab] = useState<string>('focus');

  const navLinks = [
    { id: 'focus', label: 'Focus', href: '#focus' },
    { id: 'engineering', label: 'Engineering', href: '#folder-cabinet' },
    { id: 'tools', label: 'Tools', href: '#tools' },
    { id: 'about', label: 'About', href: '#about' },
    { id: 'contact', label: 'Contact', href: '#contact' }
  ];

  return (
    <header className="site-header-bar">
      <div className="header-bar-inner">
        {/* Left: Name and Course (Plain text on dark background, NOT in a pill) */}
        <div className="header-brand-wrap">
          <a 
            href="#overview" 
            className="header-brand-name"
            onClick={(e) => {
              if (onReplayIntro && window.scrollY < 60) {
                e.preventDefault();
                onReplayIntro();
              }
            }}
            title="Moses Egbunike — Click at top to replay signature"
          >
            Moses Egbunike
          </a>
          <span className="header-brand-slash">/</span>
          <span className="header-brand-role">cybersecurity</span>
        </div>

        {/* Center/Right: The Navigation Links Pill Container (Only the links are in a pill) */}
        <div className="header-actions-wrap">
          <nav className="nav-links-pill-container" aria-label="Main navigation">
            {navLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  className={`nav-pill-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(link.id)}
                >
                  {link.label}
                </a>
              );
            })}

            {/* GitHub External Link */}
            <a
              href={PROFILE_DATA.github}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-pill-btn nav-pill-ext"
            >
              <span>GitHub</span>
              <ArrowUpRight className="w-3 h-3 text-muted" />
            </a>
          </nav>

          {/* Theme Toggle Button (Separate Pill) */}
          <button 
            className="theme-toggle-pill"
            onClick={onThemeToggle}
            title={`Current theme: ${currentTheme}. Click to switch.`}
            aria-label="Toggle theme mode"
          >
            {currentTheme === 'emerald' ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
