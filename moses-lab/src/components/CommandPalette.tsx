import React, { useState, useEffect, useRef } from 'react';
import { SYSTEMS_DATA, SystemProject } from '../data/systems';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSystem: (system: SystemProject) => void;
}

interface CommandItem {
  id: string;
  category: string;
  label: string;
  sublabel: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectSystem
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          setQuery('');
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allCommands: CommandItem[] = [
    ...SYSTEMS_DATA.map(sys => ({
      id: `sys-${sys.id}`,
      category: 'SYSTEM BLUEPRINT',
      label: sys.title,
      sublabel: `${sys.code} · ${sys.category}`,
      action: () => {
        onClose();
        onSelectSystem(sys);
      }
    })),
    {
      id: 'nav-overview',
      category: 'NAVIGATION',
      label: 'Dossier Overview',
      sublabel: 'Jump to top coordinates & identity',
      action: () => {
        onClose();
        document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      id: 'nav-systems',
      category: 'NAVIGATION',
      label: 'Systems Manifest',
      sublabel: 'View all engineered workstations',
      action: () => {
        onClose();
        document.getElementById('systems')?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      id: 'nav-substrate',
      category: 'NAVIGATION',
      label: 'Agentic Runtimes & Substrates',
      sublabel: 'Claude Code, Antigravity & Toolchains',
      action: () => {
        onClose();
        document.getElementById('substrate')?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      id: 'nav-dispatch',
      category: 'NAVIGATION',
      label: 'Lab Dispatches',
      sublabel: 'First-principles essays & engineering notes',
      action: () => {
        onClose();
        document.getElementById('dispatch')?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      id: 'nav-comms',
      category: 'NAVIGATION',
      label: 'Initiate Transmission',
      sublabel: 'Direct email, PGP fingerprint, GitHub',
      action: () => {
        onClose();
        document.getElementById('comms')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  ];

  const filteredCommands = allCommands.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.sublabel.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '560px',
          margin: '10vh auto auto',
          background: 'var(--bg-surface-0)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span className="mono" style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>›_</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type command or jump to subsystem..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              color: 'var(--text-pure)'
            }}
          />
          <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>ESC TO CLOSE</span>
        </div>

        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '8px' }}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              NO MATCHING SUBSYSTEMS
            </div>
          ) : (
            filteredCommands.map(cmd => (
              <button
                key={cmd.id}
                onClick={cmd.action}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background var(--duration-fast)',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div style={{ color: 'var(--text-pure)', fontSize: '0.9rem', fontWeight: 500 }}>
                    {cmd.label}
                  </div>
                  <div className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>
                    {cmd.sublabel}
                  </div>
                </div>
                <span className="mono" style={{ 
                  color: 'var(--accent)', 
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent-border)',
                  borderRadius: '2px'
                }}>
                  {cmd.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
