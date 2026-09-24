import React, { useState, useEffect } from 'react';
import { PROFILE_DATA } from '../data/profile';

interface TelemetryBarProps {
  currentTheme: 'emerald' | 'amber' | 'titanium';
  onThemeChange: (theme: 'emerald' | 'amber' | 'titanium') => void;
  onOpenCommand: () => void;
  onReplayIntro?: () => void;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  currentTheme,
  onThemeChange,
  onOpenCommand,
  onReplayIntro
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format to WAT/UTC+1 format: YYYY.MM.DD // HH:MM:SS WAT
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}:${seconds} WAT`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="telemetry-bar">
      <div className="app-container">
        <div className="telemetry-inner">
          <div className="telemetry-group">
            <div className="telemetry-item">
              <span className="telemetry-pulse"></span>
              <span className="mono" style={{ color: 'var(--text-pure)', fontWeight: 600 }}>
                {PROFILE_DATA.callsign}
              </span>
            </div>
            {onReplayIntro && (
              <div 
                className="telemetry-item" 
                onClick={onReplayIntro}
                title="Replay Jupiter Signature Intro"
                style={{ cursor: 'pointer', padding: '0 4px' }}
              >
                <span className="sig-branding">.Jupiter...</span>
              </div>
            )}
            <div className="telemetry-item">
              <span style={{ color: 'var(--text-muted)' }}>LOC:</span>
              <span className="mono">{PROFILE_DATA.coordinates}</span>
            </div>
            <div className="telemetry-item">
              <span style={{ color: 'var(--text-muted)' }}>TIME:</span>
              <span className="mono" style={{ color: 'var(--accent)' }}>{timeStr || '19:00:00 WAT'}</span>
            </div>
          </div>

          <div className="telemetry-group">
            <button 
              className="mono" 
              onClick={onOpenCommand}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                background: 'var(--bg-surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)'
              }}
              title="Open Navigation Palette"
            >
              <span>CMD</span>
              <kbd style={{ 
                background: 'var(--bg-surface-2)', 
                padding: '1px 4px', 
                borderRadius: '2px',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-pure)'
              }}>Ctrl+K</kbd>
            </button>

            <div className="theme-switcher" title="Telemetry Color Accent">
              <button
                className={`theme-btn ${currentTheme === 'emerald' ? 'active' : ''}`}
                data-color="emerald"
                onClick={() => onThemeChange('emerald')}
                aria-label="Phosphor Emerald Accent"
              />
              <button
                className={`theme-btn ${currentTheme === 'amber' ? 'active' : ''}`}
                data-color="amber"
                onClick={() => onThemeChange('amber')}
                aria-label="Amber Telemetry Accent"
              />
              <button
                className={`theme-btn ${currentTheme === 'titanium' ? 'active' : ''}`}
                data-color="titanium"
                onClick={() => onThemeChange('titanium')}
                aria-label="Titanium Monochrome Accent"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
