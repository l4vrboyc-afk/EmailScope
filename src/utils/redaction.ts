/**
 * OSINT Redaction Utility — OpSec Shield
 * Masks personally identifiable information (emails, IPs, usernames, sensitive labels)
 * to prevent OPSEC leaks during screen sharing, briefings, report screenshots, or demos.
 */

export function redactEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  const maskedLocal =
    local.length <= 2
      ? `${local[0]}***`
      : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${maskedLocal}@${domain}`;
}

export function redactIp(ip: string): string {
  if (!ip) return ip;
  // IPv4
  const ipv4Parts = ip.split('.');
  if (ipv4Parts.length === 4) {
    return `${ipv4Parts[0]}.${ipv4Parts[1]}.*.*`;
  }
  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 2).join(':')}:****:****`;
  }
  return ip;
}

export function redactLabel(label: string, category?: string, opsec = true): string {
  if (!opsec || !label) return label;

  if (category === 'email' || label.includes('@')) {
    return redactEmail(label);
  }

  if (category === 'ip' || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(label)) {
    return redactIp(label);
  }

  if (category === 'telephony' || /^\+?\d{7,15}$/.test(label)) {
    return label.length > 5 ? `${label.slice(0, 3)}****${label.slice(-2)}` : '****';
  }

  if (category === 'username' || category === 'identity') {
    if (label.length <= 3) return '***';
    return `${label.slice(0, 2)}***${label.slice(-1)}`;
  }

  return label;
}

export function redactText(text: string, opsec = true): string {
  if (!opsec || !text) return text;

  // Mask emails in text
  let sanitized = text.replace(
    /([a-zA-Z0-9._%+-]+)(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (_, local, domain) => {
      const masked = local.length <= 2 ? `${local[0]}***` : `${local.slice(0, 2)}***`;
      return `${masked}${domain}`;
    }
  );

  // Mask IPv4 addresses
  sanitized = sanitized.replace(
    /\b(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}\b/g,
    '$1.*.*'
  );

  return sanitized;
}
