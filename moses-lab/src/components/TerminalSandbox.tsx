import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, CornerDownLeft, Play } from 'lucide-react';
import { PROFILE_DATA } from '../data/profile';

interface TerminalSandboxProps {
  onThemeChange: (theme: 'emerald' | 'amber' | 'titanium') => void;
}

export const TerminalSandbox: React.FC<TerminalSandboxProps> = ({ onThemeChange }) => {
  const [history, setHistory] = useState<Array<{ cmd: string; output: string | React.ReactNode }>>([
    {
      cmd: 'init --status',
      output: 'Lab session initialized. Welcome to Moses Egbunike\'s terminal sandbox. Type "help" or click suggested queries.'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const quickCommands = ['whoami', 'threatscope', 'pluto', 'philosophy', 'theme amber', 'clear'];

  const executeCommand = (rawCmd: string) => {
    const cmd = rawCmd.trim().toLowerCase();
    if (!cmd) return;

    if (cmd === 'clear') {
      setHistory([]);
      setInputVal('');
      return;
    }

    let out: string | React.ReactNode = '';

    switch (cmd) {
      case 'help':
        out = 'Available commands: whoami, threatscope, pluto, trading, labs, philosophy, theme <emerald|amber|titanium>, clear';
        break;
      case 'whoami':
        out = `${PROFILE_DATA.name} — ${PROFILE_DATA.level} at ${PROFILE_DATA.affiliation}. Location: ${PROFILE_DATA.location}. Relentless builder.`;
        break;
      case 'threatscope':
        out = `[ThreatScope v1.0] Desktop threat intelligence engine. Ingests IPs/domains, calculates risk matrices via Tauri & Python async lookups.`;
        break;
      case 'pluto':
        out = `[Pluto HCI] Computer vision gesture driver. Translates 21-point webcam hand skeletal landmarks into native OS mouse & click events.`;
        break;
      case 'trading':
        out = `[Quantitative Engine] Stateful event-driven execution system under millisecond drawdown constraints.`;
        break;
      case 'labs':
        out = `[Network Topologies] pfSense perimeter firewalling, Cisco Packet Tracer VLAN routing, and Kali Linux penetration testing.`;
        break;
      case 'philosophy':
        out = `"The worst possible state is inertia. When resources are tight, building is the only rational path forward. Master first principles."`;
        break;
      case 'theme amber':
        onThemeChange('amber');
        out = 'Switched telemetry spectrum to Amber (590nm).';
        break;
      case 'theme emerald':
        onThemeChange('emerald');
        out = 'Switched telemetry spectrum to Phosphor Emerald (520nm).';
        break;
      case 'theme titanium':
        onThemeChange('titanium');
        out = 'Switched telemetry spectrum to Stark Titanium Monochrome.';
        break;
      default:
        out = `Command not recognized: "${rawCmd}". Type "help" to see available instructions.`;
        break;
    }

    setHistory(prev => [...prev, { cmd: rawCmd, output: out }]);
    setInputVal('');
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <section className="section-wrapper" id="terminal-sandbox">
      <div className="section-header">
        <div>
          <span className="section-code">// 03. INTERACTIVE REPL</span>
          <h2 className="section-heading">LAB CLI SANDBOX</h2>
        </div>
        <p className="section-desc">
          Test interactive queries or execute system commands directly inside the sandbox environment.
        </p>
      </div>

      <div className="terminal-box spotlight-card">
        {/* Terminal Header */}
        <div className="terminal-topbar mono">
          <div className="terminal-buttons">
            <span className="term-dot close"></span>
            <span className="term-dot min"></span>
            <span className="term-dot max"></span>
          </div>
          <div className="term-title">
            <TerminalIcon className="w-3.5 h-3.5 text-accent" />
            <span>guest@moses-lab:~ (bash)</span>
          </div>
          <span className="term-status">ACTIVE TTY1</span>
        </div>

        {/* Terminal Output */}
        <div className="terminal-output-area mono">
          {history.map((item, idx) => (
            <div key={idx} className="terminal-line-group">
              <div className="term-input-line">
                <span className="term-prompt">moses@lab:~$</span>
                <span className="term-cmd-text">{item.cmd}</span>
              </div>
              <div className="term-response-text">{item.output}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="terminal-quick-pills mono">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>RUN SUGGESTION:</span>
          {quickCommands.map((qCmd, idx) => (
            <button
              key={idx}
              className="quick-cmd-chip"
              onClick={() => executeCommand(qCmd)}
            >
              <span>{qCmd}</span>
              <Play className="w-2.5 h-2.5 text-accent" />
            </button>
          ))}
        </div>

        {/* Terminal Input Form */}
        <form
          className="terminal-input-bar mono"
          onSubmit={(e) => {
            e.preventDefault();
            executeCommand(inputVal);
          }}
        >
          <span className="term-prompt">moses@lab:~$</span>
          <input
            type="text"
            className="term-input-field"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type 'help', 'threatscope', 'philosophy', or 'theme amber'..."
          />
          <button type="submit" className="term-submit-btn" aria-label="Run command">
            <CornerDownLeft className="w-4 h-4" />
          </button>
        </form>
      </div>
    </section>
  );
};
