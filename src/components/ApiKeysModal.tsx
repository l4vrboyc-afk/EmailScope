import { useState } from 'react';
import {
  X, KeyRound, CheckCircle2, Globe, Shield, Database, ExternalLink,
  Sparkles, RotateCcw, Eye, EyeOff
} from 'lucide-react';
import {
  loadThreatFeeds, saveCustomApiKey, resetAllApiKeys,
  type ThreatFeedConfig
} from '../utils/apiKeys';

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS = {
  breach: Shield,
  malware: Globe,
  infrastructure: Database,
  reputation: Sparkles,
};

export default function ApiKeysModal({ isOpen, onClose }: ApiKeysModalProps) {
  const [feeds, setFeeds] = useState<ThreatFeedConfig[]>(loadThreatFeeds);
  const [editingKey, setEditingKey] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleKeyChange = (feedId: string, val: string) => {
    setEditingKey((prev) => ({ ...prev, [feedId]: val }));
  };

  const handleSaveKey = (feedId: string) => {
    const keyVal = editingKey[feedId] ?? feeds.find((f) => f.id === feedId)?.customApiKey ?? '';
    const updated = saveCustomApiKey(feedId, keyVal);
    setFeeds(updated);
    setSavedNotice(`API key updated for ${feeds.find((f) => f.id === feedId)?.name}.`);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all API keys back to zero-config Community Defaults?')) {
      const reset = resetAllApiKeys();
      setFeeds(reset);
      setEditingKey({});
      setSavedNotice('All feeds restored to default community gateways.');
      setTimeout(() => setSavedNotice(null), 3000);
    }
  };

  const toggleReveal = (feedId: string) => {
    setRevealedKeys((prev) => ({ ...prev, [feedId]: !prev[feedId] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono text-white">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-3xl max-h-[88vh] bg-black border border-white/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 bg-white/5 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/30 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
                  Threat Feeds &amp; API Keys
                </h2>
                <span className="text-[9px] px-2 py-0.5 rounded bg-white text-black font-bold uppercase tracking-wider">
                  Zero-Config Ready
                </span>
              </div>
              <p className="text-[10px] text-white/50 tracking-wider">
                Pre-configured with public OSINT gateways — custom keys are strictly optional
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-white/25 flex items-center justify-center text-white/60 hover:text-white hover:border-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Zero-Config Philosophy Banner */}
        <div className="px-6 py-3.5 bg-white/8 border-b border-white/15 flex items-start space-x-3 flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-white uppercase tracking-wider">
              No API Keys Required To Investigate
            </p>
            <p className="text-[10px] text-white/65 leading-relaxed">
              ThreatScope is pre-configured out of the box with free community threat gateways (Shodan InternetDB, Public DNS/CT logs, and Gravatar). New users do not need to register for accounts. If you have personal or enterprise API tokens, enter them below to unlock higher rate limits.
            </p>
          </div>
        </div>

        {savedNotice && (
          <div className="px-6 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* Feeds List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {feeds.map((feed) => {
            const Icon = CATEGORY_ICONS[feed.category] || Shield;
            const currentVal = editingKey[feed.id] !== undefined ? editingKey[feed.id] : feed.customApiKey;
            const isRevealed = !!revealedKeys[feed.id];

            return (
              <div
                key={feed.id}
                className="p-4 rounded-xl border border-white/20 bg-white/5 space-y-3 hover:border-white/35 transition-colors"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg border border-white/25 bg-white/10 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-white/90" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block uppercase tracking-wider">
                        {feed.name}
                      </span>
                      <span className="text-[9px] text-white/45">
                        Provider: {feed.provider}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {feed.isCustomKeyActive ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-white text-black uppercase tracking-wider">
                        Custom Key Active
                      </span>
                    ) : (
                      <span className="text-[9px] px-2 py-0.5 rounded border border-white/30 bg-white/10 text-white/85 uppercase tracking-wider">
                        ● Community Default
                      </span>
                    )}
                    <a
                      href={feed.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded text-white/40 hover:text-white transition-colors"
                      title="View API Documentation"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <p className="text-[10px] text-white/60 leading-relaxed">
                  {feed.description}
                </p>

                {/* Default tier active indicator */}
                <div className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/3 text-[9px] text-white/70 flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>{feed.communityTierDescription}</span>
                </div>

                {/* Custom Key Input */}
                <div className="pt-1 flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      type={isRevealed ? 'text' : 'password'}
                      placeholder="Paste optional custom API key to override..."
                      value={currentVal}
                      onChange={(e) => handleKeyChange(feed.id, e.target.value)}
                      className="w-full bg-black border border-white/25 rounded-lg pl-3 pr-8 py-1.5 text-[10px] text-white placeholder-white/30 focus:outline-none focus:border-white/70 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => toggleReveal(feed.id)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      title={isRevealed ? 'Hide key' : 'Show key'}
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveKey(feed.id)}
                    className="px-3 py-1.5 rounded-lg border border-white/35 bg-white/10 hover:bg-white hover:text-black text-white text-[9px] font-bold uppercase tracking-wider transition-colors flex-shrink-0"
                  >
                    Save Key
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/15 bg-white/5 flex items-center justify-between flex-shrink-0 text-[10px]">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center space-x-1.5 text-white/50 hover:text-white transition-colors uppercase tracking-wider text-[9px]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset To Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-white text-black font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
