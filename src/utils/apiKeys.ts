/**
 * ThreatScope API Key & Threat Feed Configuration
 *
 * Pre-configured with zero-config Community Tiers so new users can
 * investigate immediately without registering for external API accounts.
 * Pro users can supply custom keys for higher rate limits.
 */

export interface ThreatFeedConfig {
  id: string;
  name: string;
  provider: string;
  category: 'breach' | 'malware' | 'infrastructure' | 'reputation';
  description: string;
  communityTierDescription: string;
  hasDefaultCommunityAccess: boolean;
  apiKeyRequiredForPro: boolean;
  customApiKey: string;
  isCustomKeyActive: boolean;
  docsUrl: string;
}

const STORAGE_KEY = 'es_threat_api_keys_v1';

export const DEFAULT_FEEDS: ThreatFeedConfig[] = [
  {
    id: 'hibp',
    name: 'HaveIBeenPwned (HIBP)',
    provider: 'Troy Hunt / HIBP v3',
    category: 'breach',
    description: 'Account breach exposure & compromised credential indices.',
    communityTierDescription: 'Pre-configured Passive Public Index (No key required for public collections).',
    hasDefaultCommunityAccess: true,
    apiKeyRequiredForPro: true,
    customApiKey: '',
    isCustomKeyActive: false,
    docsUrl: 'https://haveibeenpwned.com/API/Key',
  },
  {
    id: 'virustotal',
    name: 'VirusTotal Intelligence',
    provider: 'Google Chronicle',
    category: 'malware',
    description: 'Domain, IP, and file hash reputation across 70+ antivirus engines.',
    communityTierDescription: 'Pre-configured Public Community Gateway (4 req/min standard quota).',
    hasDefaultCommunityAccess: true,
    apiKeyRequiredForPro: true,
    customApiKey: '',
    isCustomKeyActive: false,
    docsUrl: 'https://developers.virustotal.com/reference',
  },
  {
    id: 'shodan',
    name: 'Shodan InternetDB',
    provider: 'Shodan.io',
    category: 'infrastructure',
    description: 'Open ports, discovered vulnerabilities (CVEs), and CPE tags on IP hosts.',
    communityTierDescription: 'Pre-configured Live Free InternetDB Feed (Zero authentication required).',
    hasDefaultCommunityAccess: true,
    apiKeyRequiredForPro: true,
    customApiKey: '',
    isCustomKeyActive: false,
    docsUrl: 'https://internetdb.shodan.io',
  },
  {
    id: 'emailrep',
    name: 'EmailRep Reputation Engine',
    provider: 'Sublime Security',
    category: 'reputation',
    description: 'Deliverability, spoofability, spam history, and domain credential health.',
    communityTierDescription: 'Pre-configured Free Community Lookup Tier.',
    hasDefaultCommunityAccess: true,
    apiKeyRequiredForPro: true,
    customApiKey: '',
    isCustomKeyActive: false,
    docsUrl: 'https://emailrep.io',
  },
];

export function loadThreatFeeds(): ThreatFeedConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FEEDS;
    const stored = JSON.parse(raw) as Record<string, string>;
    return DEFAULT_FEEDS.map((feed) => {
      const customKey = stored[feed.id] || '';
      return {
        ...feed,
        customApiKey: customKey,
        isCustomKeyActive: customKey.trim().length > 0,
      };
    });
  } catch {
    return DEFAULT_FEEDS;
  }
}

export function saveCustomApiKey(feedId: string, apiKey: string): ThreatFeedConfig[] {
  try {
    const current = loadThreatFeeds();
    const updatedMap: Record<string, string> = {};
    const updatedFeeds = current.map((feed) => {
      if (feed.id === feedId) {
        const trimmed = apiKey.trim();
        updatedMap[feed.id] = trimmed;
        return {
          ...feed,
          customApiKey: trimmed,
          isCustomKeyActive: trimmed.length > 0,
        };
      }
      if (feed.customApiKey) {
        updatedMap[feed.id] = feed.customApiKey;
      }
      return feed;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMap));
    return updatedFeeds;
  } catch {
    return loadThreatFeeds();
  }
}

export function resetAllApiKeys(): ThreatFeedConfig[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return DEFAULT_FEEDS;
}

export function getActiveApiKey(feedId: string): string | undefined {
  try {
    const feeds = loadThreatFeeds();
    const feed = feeds.find((f) => f.id === feedId);
    return feed?.isCustomKeyActive && feed.customApiKey.trim().length > 0
      ? feed.customApiKey.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

export function getAllActiveApiKeys(): Record<string, string> {
  try {
    const feeds = loadThreatFeeds();
    const keys: Record<string, string> = {};
    for (const feed of feeds) {
      if (feed.isCustomKeyActive && feed.customApiKey.trim().length > 0) {
        keys[feed.id] = feed.customApiKey.trim();
      }
    }
    return keys;
  } catch {
    return {};
  }
}
