/**
 * MetadataDrawer — B&W, lighter edition.
 */
import { X, Server, AlertTriangle, User, Key, MapPin, Wifi, Phone } from 'lucide-react';
import { redactLabel, redactText } from '../utils/redaction';

const CAT_CONFIG = {
  infrastructure: { icon: Server,        label: 'Infrastructure', headText: 'text-sky-400',     border: 'border-sky-500/35', bg: 'bg-sky-950/30' },
  breach:         { icon: AlertTriangle,  label: 'Data Breach',    headText: 'text-rose-400',    border: 'border-rose-500/40', bg: 'bg-rose-950/30' },
  social:         { icon: User,           label: 'Social Profile', headText: 'text-pink-400',    border: 'border-pink-500/35', bg: 'bg-pink-950/30' },
  identity:       { icon: Key,            label: 'Identity',       headText: 'text-violet-400',  border: 'border-violet-500/35', bg: 'bg-violet-950/30' },
  geo:            { icon: MapPin,         label: 'Geolocation',    headText: 'text-emerald-400', border: 'border-emerald-500/35', bg: 'bg-emerald-950/30' },
  telephony:      { icon: Phone,          label: 'Telecom & Carrier', headText: 'text-amber-400', border: 'border-amber-500/35', bg: 'bg-amber-950/30' },
};

function getCatConfig(cat) {
  return CAT_CONFIG[cat] || CAT_CONFIG.identity;
}

function MetaRow({ label, value, mono = false, bright = false, opsec = false }) {
  if (value === undefined || value === null || value === '') return null;
  const rawDisplay = Array.isArray(value) ? value.join(', ') || '—' : String(value);
  const display = opsec ? redactText(rawDisplay, true) : rawDisplay;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-white/10 last:border-0">
      <span className="text-[9px] font-mono text-white/45 uppercase tracking-widest flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-[10px] text-right break-all ${mono ? 'font-mono' : ''} ${bright ? 'text-white font-medium' : 'text-white/85'}`}>
        {display}
      </span>
    </div>
  );
}

function BoolRow({ label, value, trueLabel = '✓ Yes', falseLabel = '✗ No', trueBright = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-white/10 last:border-0">
      <span className="text-[9px] font-mono text-white/45 uppercase tracking-widest flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-[10px] font-mono ${value ? 'text-emerald-400 font-bold' : 'text-neutral-500'}`}>
        {value ? trueLabel : falseLabel}
      </span>
    </div>
  );
}

function Chip({ value, bright = false }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono border ${
      bright
        ? 'border-rose-500/60 text-rose-300 bg-rose-950/50 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
        : 'border-white/20 text-neutral-300 bg-white/5'
    }`}>
      {value}
    </span>
  );
}

function InfrastructurePanel({ node }) {
  const m = node.metadata || {};
  return (
    <div>
      <BoolRow label="SPF Policy"   value={m.has_spf}   trueLabel="✓ Present" falseLabel="✗ Missing" />
      <BoolRow label="DMARC Policy" value={m.has_dmarc} trueLabel="✓ Present" falseLabel="✗ Missing" />
      <BoolRow label="BIMI Record"  value={m.has_bimi}  trueLabel="✓ Present" falseLabel="✗ Missing" />
      <MetaRow label="FCrDNS"       value={m.fcrdns_status} mono />
      <MetaRow label="A Records"    value={m.a_records}     mono />
      <MetaRow label="AAAA Records" value={m.aaaa_records}  mono />
      <MetaRow label="MX Records"   value={m.mx_records}    mono />
      {(m.mx_host_details || []).map((mx, i) => (
        <div key={i} className="bg-white/8 border border-white/20 rounded-lg p-2 mt-1 font-mono text-[9px] space-y-0.5">
          <span className="text-white/90 block">{mx.host}</span>
          {mx.ips?.length > 0 && <span className="text-white/60">ips: {mx.ips.join(', ')}</span>}
          {mx.ptr_records?.length > 0 && <span className="text-white/60 block">ptr: {mx.ptr_records.join(', ')}</span>}
          <span className={mx.fcrdns_valid ? 'text-white/80' : 'text-white/50'}>
            fcrdns: {mx.fcrdns_valid ? 'valid' : 'invalid'}
          </span>
        </div>
      ))}
    </div>
  );
}

function BreachPanel({ node }) {
  const m = node.metadata || {};
  const critical = ['Passwords', 'Bank account details', 'Social security numbers'];
  return (
    <div>
      <MetaRow label="Breach Date"   value={m.breach_date} mono />
      <MetaRow label="Domain"        value={m.domain}      mono />
      <MetaRow label="Risk Severity" value={(m.risk_severity || '—').toUpperCase()} mono bright />
      <MetaRow label="Risk Score"    value={m.risk_score}  mono bright />
      {m.exposed_data?.length > 0 && (
        <div className="pt-2">
          <span className="text-[9px] font-mono text-white/45 uppercase tracking-widest block mb-1.5">Exposed Data Classes</span>
          <div className="flex flex-wrap gap-1">
            {m.exposed_data.map((cls) => (
              <Chip key={cls} value={cls} bright={critical.includes(cls)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SocialPanel({ node }) {
  const m = node.metadata || {};
  return (
    <div>
      <MetaRow label="Platform"  value={m.platform} />
      <MetaRow label="Handle"    value={m.handle}   mono bright />
      <MetaRow label="URL"       value={m.url}      mono />
      <BoolRow label="Verified"  value={m.verified} trueLabel="✓ Verified" falseLabel="Unverified" />
      <MetaRow label="Location"  value={m.location} />
      {m.associated_urls?.length > 0 && (
        <div className="pt-1.5">
          <span className="text-[9px] font-mono text-white/45 uppercase tracking-widest block mb-1">Associated URLs</span>
          {m.associated_urls.slice(0, 5).map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="block text-[9px] font-mono text-white/65 hover:text-white truncate transition-colors">
              {url}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function GeoPanel({ node }) {
  const m = node.metadata || {};
  return (
    <div>
      <MetaRow label="IP"          value={m.ip || node.label}  mono bright />
      <MetaRow label="City"        value={m.city} />
      <MetaRow label="Region"      value={m.region} />
      <MetaRow label="Country"     value={`${m.country || ''}${m.country_code ? ` (${m.country_code})` : ''}`} />
      <MetaRow label="Coordinates" value={m.latitude != null ? `${m.latitude}, ${m.longitude}` : null} mono />
      <MetaRow label="ISP"         value={m.isp} />
      <MetaRow label="Org"         value={m.org} />
      <MetaRow label="ASN"         value={m.asn} mono />
      <BoolRow label="Datacenter"  value={m.is_datacenter} trueLabel="✓ Yes"     falseLabel="✗ No"   />
      <BoolRow label="Proxy/VPN"   value={m.is_proxy}      trueLabel="⚠ Detected" falseLabel="Clean"  trueBright />
    </div>
  );
}

function IdentityPanel({ node }) {
  const m = node.metadata || {};
  return (
    <div>
      <MetaRow label="Fingerprint" value={m.fingerprint} mono />
      <MetaRow label="Key ID"      value={m.key_id}      mono bright />
      <MetaRow label="Source"      value={m.source} />
      <MetaRow label="Algorithm"   value={m.algorithm} />
      <MetaRow label="Created"     value={m.created} />
      <MetaRow label="UIDs"        value={m.uids} />
    </div>
  );
}

function TelephonyPanel({ node }) {
  const m = node.metadata || {};
  return (
    <div>
      <MetaRow label="International" value={m.international || m.e164 || node.label} mono bright />
      <MetaRow label="National"      value={m.national} mono />
      <MetaRow label="Carrier"       value={m.carrier || m.carrier_name} bright />
      <MetaRow label="Line Type"     value={m.line_type} />
      <MetaRow label="Country"       value={`${m.country || ''}${m.country_code ? ` (+${m.country_code})` : ''}`} />
      <MetaRow label="Region"        value={m.location} />
      <MetaRow label="Timezone(s)"   value={m.timezones} mono />
      <MetaRow label="Coordinates"   value={m.latitude != null ? `${m.latitude}, ${m.longitude}` : null} mono />
      <BoolRow label="VoIP / Burner" value={m.is_voip} trueLabel="⚠ Burner / VoIP Risk" falseLabel="✓ Standard Carrier" trueBright />
      <BoolRow label="Format Valid"  value={m.is_valid} trueLabel="✓ Valid E.164" falseLabel="✗ Invalid/Unallocated" />
    </div>
  );
}

export default function MetadataDrawer({ node, onClose, opsecEnabled = false }) {
  if (!node) return null;
  const cfg = getCatConfig(node.category);
  const Icon = cfg.icon;

  const displayLabel = opsecEnabled
    ? redactLabel(node.label, node.category)
    : node.label;
  const displayCanonical = opsecEnabled
    ? redactText(node.canonical_id)
    : node.canonical_id;

  const renderPanel = () => {
    switch (node.category) {
      case 'telephony':      return <TelephonyPanel node={node} />;
      case 'infrastructure': return <InfrastructurePanel node={node} />;
      case 'breach':         return <BreachPanel node={node} />;
      case 'social':         return <SocialPanel node={node} />;
      case 'geo':            return <GeoPanel node={node} />;
      case 'identity':       return <IdentityPanel node={node} />;
      default:
        if (node.canonical_id?.startsWith('ip:') && node.metadata?.latitude != null) return <GeoPanel node={node} />;
        return (
          <div>
            {Object.entries(node.metadata || {}).map(([k, v]) => (
              <MetaRow key={k} label={k.replace(/_/g, ' ')} value={typeof v === 'object' ? JSON.stringify(v) : v} opsec={opsecEnabled} />
            ))}
          </div>
        );
    }
  };

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${cfg.border}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.headText}`} />
          <div className="min-w-0">
            <span className={`text-[9px] font-mono font-bold tracking-widest uppercase block ${cfg.headText}`}>{cfg.label}</span>
            <span className="text-[10px] text-white/65 truncate block max-w-[200px]">{displayLabel}</span>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose}
            className="p-1 rounded hover:bg-white/15 text-white/50 hover:text-white transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="px-3.5 py-3">
        <MetaRow label="Canonical ID" value={displayCanonical} mono />
        {renderPanel()}
      </div>
    </div>
  );
}
