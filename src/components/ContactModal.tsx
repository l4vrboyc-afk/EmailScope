import { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, Mail } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DISCORD_ID = '1497601305185882174';
export const DISCORD_USERNAME = 'moses.exe';
export const GMAIL_ADDRESS = 'l4vrboyc@gmail.com';
export const GITHUB_URL = 'https://github.com/l4vrboyc-afk';
export const DISCORD_FALLBACK_AVATAR = `https://cdn.discordapp.com/avatars/${DISCORD_ID}/e0bee3a64b651ee712ca1d7f876751d3.png`;

// Official Icons — Only the icons and pfp retain brand colors
export function DiscordIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="#5865F2" className={className} aria-label="Discord">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export function GmailIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="Gmail">
      <path
        d="M2 6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z"
        fill="#1a1a1a"
        stroke="#ffffff"
        strokeWidth="1"
      />
      <path
        d="M2.5 6.5L12 13.5L21.5 6.5"
        stroke="#ea4335"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 19V8L12 14.5L21 8V19"
        stroke="#ea4335"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
      />
    </svg>
  );
}

export function GitHubIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="#ffffff" className={className} aria-label="GitHub">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string>(DISCORD_FALLBACK_AVATAR);
  const [displayName, setDisplayName] = useState<string>('JUPITER');

  // Attempt to fetch fresh profile details from API
  useEffect(() => {
    let mounted = true;
    fetch(`https://japi.rest/discord/v1/user/${DISCORD_ID}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!mounted || !payload?.data) return;
        const data = payload.data;
        if (data.avatarURL) setAvatarSrc(data.avatarURL);
        if (data.global_name) setDisplayName(data.global_name);
      })
      .catch(() => {
        // Fallback to static avatar URL
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Keyboard escape handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container — Strict ThreatScope Stealth Theme */}
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-white/[0.12] bg-[#0c0c0e] shadow-2xl text-white backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — Clean "Contact Me" Title */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-mono tracking-wider text-white uppercase">
              Contact Me
            </h2>
            <p className="text-[11px] font-mono text-white/40 mt-0.5">
              Direct channels &amp; developer communications
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Developer Profile Card (Unadorned, PFP has its natural colors) */}
        <div className="px-6 pt-5 pb-1">
          <div className="p-3.5 rounded-lg border border-white/[0.08] bg-white/[0.02] flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 bg-black flex-shrink-0">
              <img
                src={avatarSrc}
                alt="Profile Avatar"
                className="w-full h-full object-cover"
                onError={() => setAvatarSrc('https://github.com/l4vrboyc-afk.png')}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-mono text-white truncate">
                  {displayName}
                </span>
                <span className="text-[10px] font-mono text-white/40 uppercase">
                  @{DISCORD_USERNAME}
                </span>
              </div>
              <p className="text-xs text-white/50 font-mono mt-0.5">
                Developer &amp; Security Researcher
              </p>
            </div>
          </div>
        </div>

        {/* Channels List */}
        <div className="p-6 space-y-3">
          {/* 1. DISCORD */}
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                <DiscordIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                  Discord
                </div>
                <div className="text-sm font-semibold text-white font-mono truncate">
                  {DISCORD_USERNAME}
                </div>
                <div className="text-[10px] font-mono text-white/40 truncate">
                  ID: {DISCORD_ID}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => copyToClipboard(DISCORD_USERNAME, 'discord')}
                className="px-2.5 py-1.5 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-xs font-mono text-white/80 hover:text-white transition-all flex items-center gap-1.5"
                title="Copy Discord username"
              >
                {copiedKey === 'discord' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-white/60" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <a
                href={`https://discord.com/users/${DISCORD_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded border border-white/10 bg-white/[0.08] hover:bg-white/[0.15] text-xs font-mono font-medium text-white transition-all flex items-center gap-1.5"
              >
                <span>Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-white/60" />
              </a>
            </div>
          </div>

          {/* 2. GMAIL / EMAIL */}
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                <GmailIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                  Email (Gmail)
                </div>
                <div className="text-sm font-semibold text-white font-mono truncate">
                  {GMAIL_ADDRESS}
                </div>
                <div className="text-[10px] font-mono text-white/40 truncate">
                  Direct Contact
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => copyToClipboard(GMAIL_ADDRESS, 'email')}
                className="px-2.5 py-1.5 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-xs font-mono text-white/80 hover:text-white transition-all flex items-center gap-1.5"
                title="Copy email address"
              >
                {copiedKey === 'email' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-white/60" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <a
                href={`mailto:${GMAIL_ADDRESS}?subject=ThreatScope%20Inquiry`}
                className="px-3 py-1.5 rounded border border-white/10 bg-white/[0.08] hover:bg-white/[0.15] text-xs font-mono font-medium text-white transition-all flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-white/60" />
                <span>Compose</span>
              </a>
            </div>
          </div>

          {/* 3. GITHUB */}
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                <GitHubIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                  GitHub
                </div>
                <div className="text-sm font-semibold text-white font-mono truncate">
                  l4vrboyc-afk
                </div>
                <div className="text-[10px] font-mono text-white/40 truncate">
                  Source &amp; Repositories
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded border border-white/10 bg-white/[0.08] hover:bg-white/[0.15] text-xs font-mono font-medium text-white transition-all flex items-center gap-1.5"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3.5 h-3.5 text-white/60" />
              </a>
            </div>
          </div>
        </div>

        {/* Modal Bottom / Footer Note */}
        <div className="px-6 py-3.5 bg-white/[0.01] border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-white/35">
          <span>ThreatScope Framework</span>
          <span>v0.1.0</span>
        </div>
      </div>
    </div>
  );
}
