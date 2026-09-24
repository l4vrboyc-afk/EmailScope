import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { IntroSignature } from './components/IntroSignature';
import { CursorSpotlight } from './components/CursorSpotlight';
import { HeroDossier } from './components/HeroDossier';
import { ThreeFocusCards } from './components/ThreeFocusCards';
import { PhysicalFolderPocket } from './components/PhysicalFolderPocket';
import { FolderCabinet } from './components/FolderCabinet';
import { TerminalSandbox } from './components/TerminalSandbox';
import { Transmission } from './components/Transmission';
import { CommandPalette } from './components/CommandPalette';
import { SystemDrawer } from './components/SystemDrawer';
import { SystemProject } from './data/systems';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'emerald' | 'amber' | 'titanium'>('emerald');
  const [activeSystem, setActiveSystem] = useState<SystemProject | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('moses_lab_theme') as 'emerald' | 'amber' | 'titanium' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: 'emerald' | 'amber' | 'titanium') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('moses_lab_theme', newTheme);
  };

  const cycleTheme = () => {
    const themes: Array<'emerald' | 'amber' | 'titanium'> = ['emerald', 'amber', 'titanium'];
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    handleThemeChange(next);
  };

  return (
    <>
      {/* 1. Cinematic Cursive Jupiter Signature (Auto-slides left, no button) */}
      {showIntro && (
        <IntroSignature onComplete={() => setShowIntro(false)} />
      )}

      {/* 2. Ambient Cursor Light */}
      <CursorSpotlight />

      {/* 3. Clean Minimalist Top Navbar (Match Screenshot 2) */}
      <Navbar 
        currentTheme={theme}
        onThemeToggle={cycleTheme}
        onReplayIntro={() => setShowIntro(true)}
      />

      {/* 4. Main Page Experience */}
      <main className="app-container">
        {/* Hero Section */}
        <HeroDossier onTagClick={() => {
          document.getElementById('focus')?.scrollIntoView({ behavior: 'smooth' });
        }} />

        {/* What I'm learning & interested in (3 Overlapping Cards Match Screenshots 3 & 4) */}
        <ThreeFocusCards />

        {/* Tools I work with right now (3D Physical Folder Pocket Match Screenshot 5) */}
        <PhysicalFolderPocket />

        {/* Systems Dossier Archive */}
        <FolderCabinet onSelectSystem={setActiveSystem} />

        {/* Interactive CLI REPL Terminal */}
        <TerminalSandbox onThemeChange={handleThemeChange} />

        {/* Connect & Footer with .Jupiter... Signature in bottom right (Match Screenshot 2) */}
        <Transmission />
      </main>

      {/* Blueprint Architecture Drawer */}
      <SystemDrawer 
        system={activeSystem} 
        onClose={() => setActiveSystem(null)} 
      />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette 
        isOpen={isCommandOpen} 
        onClose={() => setIsCommandOpen(false)} 
        onSelectSystem={setActiveSystem}
      />
    </>
  );
};
