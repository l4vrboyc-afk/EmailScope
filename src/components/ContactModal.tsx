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

// Official SVG Icons for Brand Accuracy
export function DiscordIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Discord">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export function GmailIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="Gmail">
      <path
        d="M2 6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z"
        fill="#1e1e24"
        stroke="currentColor"
        strokeWidth="1.5"
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
        opacity="0.3"
      />
    </svg>
  );
}

export function GitHubIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="GitHub">
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
  const [clanTag, setClanTag] = useState<string>('YARR');

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
        if (data.clan?.tag) setClanTag(data.clan.tag);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0a0a0c]/95 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(88,101,242,0.15)] text-white backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Accent Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#5865F2] via-[#00f3ff] to-[#ea4335]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Profile Section */}
        <div className="px-6 pt-7 pb-5 border-b border-white/[0.08] flex items-center gap-4">
          {/* Avatar with Status Pulse */}
          <div className="relative flex-shrink-0 group">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_20px_rgba(88,101,242,0.3)] bg-[#121217]">
              <img
                src={avatarSrc}
                alt="Profile Avatar"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setAvatarSrc('https://github.com/l4vrboyc-afk.png')}
              />
            </div>
            {/* Online Pulse Dot */}
            <span
              className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#23a55a] border-2 border-[#0a0a0c] shadow-[0_0_8px_#23a55a]"
              title="Online / Available"
            />
          </div>

          {/* Profile Name & Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                {displayName}
                {clanTag && (
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.08] text-white/70 border border-white/10">
                    [{clanTag}]
                  </span>
                )}
              </h2>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            </div>
            <p className="text-xs font-mono text-white/50 mt-0.5">@{DISCORD_USERNAME}</p>
            <p className="text-[11px] text-white/70 mt-1 font-sans">
              Creator of <span className="text-cyan-300 font-medium">ThreatScope</span> · Developer &amp; Security Researcher
            </p>
          </div>
        </div>

        {/* Contact Channels Grid */}
        <div className="p-6 space-y-3.5">
          {/* 1. DISCORD */}
          <div className="group rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#5865F2]/40 transition-all p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#5865F2]/15 text-[#5865F2] flex items-center justify-center border border-[#5865F2]/30 flex-shrink-0 group-hover:scale-105 transition-transform">
                <DiscordIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">Discord</div>
                <div className="text-sm font-semibold text-white truncate flex items-center gap-1.5 font-mono">
                  {DISCORD_USERNAME}
                </div>
                <div className="text-[10px] font-mono text-white/40 truncate">ID: {DISCORD_ID}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => copyToClipboard(DISCORD_USERNAME, 'discord')}
                className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.05] hover:bg-white/10 text-xs font-mono text-white/80 hover:text-white transition-all flex items-center gap-1.5"
                title="Copy Discord username"
              >
                {copiedKey === 'discord' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <a
                href={`https://discord.com/users/${DISCORD_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-xs font-mono font-medium text-white transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(88,101,242,0.3)]"
              >
                <span>Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 2. GMAIL / EMAIL */}
          <div className="group rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#ea4335]/40 transition-all p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#ea4335]/15 text-[#ea4335] flex items-center justify-center border border-[#ea4335]/30 flex-shrink-0 group-hover:scale-105 transition-transform">
                <GmailIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">Email (Gmail)</div>
                <div className="text-sm font-semibold text-white truncate font-mono">
                  {GMAIL_ADDRESS}
                </div>
                <div className="text-[10px] font-mono text-white/40 truncate">Direct Inquiry</div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => copyToClipboard(GMAIL_ADDRESS, 'email')}
                className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.05] hover:bg-white/10 text-xs font-mono text-white/80 hover:text-white transition-all flex items-center gap-1.5"
                title="Copy email address"
              >
                {copiedKey === 'email' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <a
                href={`mailto:${GMAIL_ADDRESS}?subject=ThreatScope%20Inquiry`}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-mono font-medium text-white transition-all flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-[#ea4335]" />
                <span>Compose</span>
              </a>
            </div>
          </div>

          {/* 3. GITHUB */}
          <div className="group rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/30 transition-all p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                <GitHubIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">GitHub</div>
                <div className="text-sm font-semibold text-white truncate font-mono">
                  l4vrboyc-afk
                </div>
                <div className="text-[10px] font-mono text-white/40 truncate">Source &amp; Repositories</div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-white text-black hover:bg-gray-200 text-xs font-mono font-bold transition-all flex items-center gap-1.5"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-white/40">
          <span>Open for collaboration &amp; feedback</span>
          <span className="text-cyan-400">ThreatScope v0.1.0</span>
        </div>
      </div>
    </div>
  );
}
