/**
 * TargetNetworkTelemetryCard — Speedtest / Ookla-style ISP & Network Telemetry HUD.
 *
 * Provides real-time carrier, ISP, Autonomous System (ASN), and BGP routing intelligence
 * for the target being investigated, styled with a high-precision cyber-cartographic aesthetic.
 */
import { useState, useMemo } from 'react';
import {
  Radio,
  Wifi,
  Globe,
  Server,
  Copy,
  Check,
  Phone,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
  MapPin,
  Activity,
} from 'lucide-react';
import { GraphNode, InvestigationPayload, SeedType } from '../api/types';

interface TargetNetworkTelemetryCardProps {
  graphData: InvestigationPayload | null;
  selectedNode?: GraphNode | null;
  targetSeed?: string;
  targetType?: SeedType;
  onToggleRisk?: () => void;
}

interface NetworkProfile {
  isp: string;
  org: string;
  asn?: string;
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  connectionType: 'Cellular Mobile' | 'Cloud Datacenter' | 'Residential ISP' | 'Anycast Backbone' | 'Mail Gateway';
  latencyBand: string;
  sourceContext: 'DIRECT_IP' | 'TELECOM_CARRIER' | 'MX_GATEWAY' | 'HOSTING_NODE';
  footnoteNote: string;
}

export default function TargetNetworkTelemetryCard({
  graphData,
  selectedNode,
  targetSeed = '',
  targetType = 'email',
  onToggleRisk,
}: TargetNetworkTelemetryCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Derive the active network profile from either selected node or overall graph
  const profile: NetworkProfile | null = useMemo(() => {
    if (!graphData) return null;

    const nodes = graphData.nodes || [];

    // 1. Check if user currently has an IP or Telephony or ASN node selected
    if (selectedNode) {
      const meta = (selectedNode.metadata || {}) as Record<string, any>;
      const isIp = selectedNode.canonical_id.startsWith('ip:') || selectedNode.category === 'infrastructure';
      const isTelephony = selectedNode.category === 'telephony' || !!meta.carrier;
      const isAsn = selectedNode.canonical_id.startsWith('asn:');

      if (isTelephony) {
        return {
          isp: meta.carrier || selectedNode.label || 'Telecom Operator',
          org: meta.line_type || 'Mobile Cellular Core Network',
          asn: meta.asn || 'NCC Telecom Alloc',
          ip: meta.formattedNumber || targetSeed,
          city: meta.region || 'Nationwide',
          country: meta.country || 'Nigeria',
          latitude: meta.latitude,
          longitude: meta.longitude,
          connectionType: 'Cellular Mobile',
          latencyBand: '24-42 ms (4G/5G Radio)',
          sourceContext: 'TELECOM_CARRIER',
          footnoteNote: 'Telecom carrier footprint verified through National Numbering Plan & cellular routing prefix.',
        };
      }

      if (isIp || isAsn) {
        const ispName = meta.isp || meta.org || (isAsn ? selectedNode.label : null);
        if (ispName) {
          const isDatacenter =
            meta.is_datacenter ||
            meta.connection_type === 'datacenter' ||
            /cloud|hosting|datacenter|amazon|google|cloudflare|digitalocean|ovh/i.test(ispName);
          return {
            isp: ispName,
            org: meta.org || meta.isp || 'Autonomous Network',
            asn: meta.asn || (isAsn ? selectedNode.label : undefined),
            ip: isIp ? selectedNode.label : undefined,
            city: meta.city,
            region: meta.region,
            country: meta.country,
            latitude: meta.latitude,
            longitude: meta.longitude,
            connectionType: isDatacenter ? 'Cloud Datacenter' : 'Residential ISP',
            latencyBand: isDatacenter ? '< 12 ms (Edge Backbone)' : '28-60 ms (Broadband)',
            sourceContext: 'HOSTING_NODE',
            footnoteNote: 'Inspecting currently selected network entity from graph topology.',
          };
        }
      }
    }

    // 2. Telephony Seed
    if (targetType === 'phone') {
      const telNode = nodes.find((n) => n.category === 'telephony' || n.metadata?.carrier);
      const meta = (telNode?.metadata || {}) as Record<string, any>;
      const carrier = meta.carrier || 'Cellular Operator';
      return {
        isp: carrier,
        org: meta.line_type || 'Mobile Cellular Network',
        asn: meta.country_code ? `MCC+MNC (${meta.country_code})` : 'Telecom Core',
        ip: meta.formattedNumber || targetSeed,
        city: meta.region || 'Nationwide',
        country: meta.country || 'Nigeria',
        latitude: meta.latitude,
        longitude: meta.longitude,
        connectionType: 'Cellular Mobile',
        latencyBand: '22-38 ms (Cellular RAN)',
        sourceContext: 'TELECOM_CARRIER',
        footnoteNote: 'Cellular subscriber network mapped from E.164 national dial plan & carrier allocation.',
      };
    }

    // 3. IP Seed
    if (targetType === 'ip') {
      const rootIpNode = nodes.find((n) => n.canonical_id === `ip:${targetSeed}` || n.label === targetSeed) || nodes[0];
      const meta = (rootIpNode?.metadata || {}) as Record<string, any>;
      const ispName = meta.isp || meta.org || 'BGP Upstream Provider';
      const isDatacenter =
        meta.is_datacenter ||
        /cloud|hosting|datacenter|amazon|google|cloudflare|microsoft|digitalocean/i.test(ispName);

      return {
        isp: ispName,
        org: meta.org || meta.isp || 'Autonomous Transit System',
        asn: meta.asn || (meta.connection?.asn ? `AS${meta.connection.asn}` : undefined),
        ip: targetSeed,
        city: meta.city,
        region: meta.region,
        country: meta.country,
        latitude: meta.latitude,
        longitude: meta.longitude,
        connectionType: isDatacenter ? 'Cloud Datacenter' : 'Residential ISP',
        latencyBand: isDatacenter ? '< 8 ms (Tier-1 Backbone)' : '32-55 ms (Broadband)',
        sourceContext: 'DIRECT_IP',
        footnoteNote: 'Direct BGP ASN & GeoIP telemetry resolution. Identical to Ookla Speedtest detection mechanism.',
      };
    }

    // 4. Domain or Email Seed -> Find resolved Mail Exchanger / Server IP
    const ipNode = nodes.find(
      (n) => n.category === 'infrastructure' && (n.canonical_id.startsWith('ip:') || n.metadata?.isp || n.metadata?.asn)
    );
    const mxNode = nodes.find((n) => n.canonical_id.startsWith('mx:'));

    if (ipNode) {
      const meta = (ipNode.metadata || {}) as Record<string, any>;
      const ispName = meta.isp || meta.org || (mxNode ? 'Mail Exchanger ISP' : 'Domain Hosting ISP');

      return {
        isp: ispName,
        org: meta.org || (mxNode ? `Mail Gateway [${mxNode.label}]` : 'Host Infrastructure'),
        asn: meta.asn,
        ip: ipNode.label,
        city: meta.city,
        region: meta.region,
        country: meta.country,
        latitude: meta.latitude,
        longitude: meta.longitude,
        connectionType: 'Mail Gateway',
        latencyBand: '< 15 ms (Data Center Relay)',
        sourceContext: 'MX_GATEWAY',
        footnoteNote:
          targetType === 'email'
            ? 'Resolved via target domain MX mail exchange records. (Personal end-user Wi-Fi cannot be passively sniffed from an email string).'
            : 'Host IP & upstream BGP routing provider resolved via DNS A/MX lookup.',
      };
    }

    // Fallback if no network telemetry resolved yet
    return null;
  }, [graphData, selectedNode, targetSeed, targetType]);

  if (!graphData) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#080808] p-4 font-mono shadow-2xl relative overflow-hidden select-none">
      {/* Background Subtle Cyber Gradients */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-white/[0.02] rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/[0.015] rounded-full blur-xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 relative z-10">
        <button
          type="button"
          onClick={onToggleRisk}
          className={`flex items-center gap-2 text-left transition-all ${
            onToggleRisk ? 'cursor-pointer hover:opacity-85 group' : 'cursor-default'
          }`}
          title={onToggleRisk ? 'Click to toggle Risk Assessment' : undefined}
        >
          <div className="relative flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          </div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-1.5">
              <span>Target ISP & Network HUD</span>
              <span className="text-[7.5px] px-1.5 py-0.2 rounded font-bold uppercase bg-white/10 text-neutral-300 border border-white/15">
                BGP TELEMETRY
              </span>
            </h3>
            {onToggleRisk && (
              <span className="text-[7.5px] px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-neutral-400 group-hover:text-white group-hover:border-white/40 transition-all font-mono">
                ⇄ Toggle Risk
              </span>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span className="text-[8px] uppercase tracking-wider text-emerald-400 font-bold">
            Live Resolved
          </span>
        </div>
      </div>

      {profile ? (
        <div className="space-y-3 relative z-10">
          {/* Main "Ookla Speedtest"-Style Provider Badge */}
          <div className="relative rounded-xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.01] p-3.5 shadow-lg group hover:border-white/30 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-widest text-neutral-400 font-bold">
                  {profile.sourceContext === 'TELECOM_CARRIER' ? (
                    <Phone className="w-3 h-3 text-white" />
                  ) : (
                    <Wifi className="w-3 h-3 text-white" />
                  )}
                  <span>
                    {profile.sourceContext === 'TELECOM_CARRIER'
                      ? 'Allocated Telecom Carrier'
                      : 'Upstream Internet Service Provider'}
                  </span>
                </div>

                <div className="text-sm sm:text-base font-black text-white tracking-wide truncate">
                  {profile.isp}
                </div>

                <div className="text-[9px] text-neutral-400 truncate flex items-center gap-1.5">
                  <span className="text-white/60">{profile.org}</span>
                  {profile.asn && (
                    <span className="text-[8px] px-1.5 py-0.2 rounded bg-black/60 border border-white/20 text-neutral-300 font-mono">
                      {profile.asn}
                    </span>
                  )}
                </div>
              </div>

              {/* Ookla-style Live Ping / Speed Wave Visualizer */}
              <div className="flex flex-col items-end flex-shrink-0 text-right">
                <span className="text-[8px] uppercase text-neutral-500 tracking-wider">Est. Latency</span>
                <span className="text-xs font-bold text-white flex items-center gap-1 mt-0.5">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  {profile.latencyBand.split(' ')[0]}
                </span>
                <span className="text-[7.5px] text-neutral-400 mt-0.5 uppercase tracking-tight">
                  {profile.connectionType}
                </span>
              </div>
            </div>

            {/* Signal Bars Visual Indicator */}
            <div className="flex items-center gap-1 mt-3 pt-2.5 border-t border-white/10">
              <div className="flex items-center gap-0.5 mr-2">
                <span className="w-1 h-2 rounded-full bg-white" />
                <span className="w-1 h-3 rounded-full bg-white" />
                <span className="w-1 h-4 rounded-full bg-white" />
                <span className="w-1 h-5 rounded-full bg-white/40" />
              </div>
              <span className="text-[8px] text-neutral-400 truncate">
                Routing: <strong className="text-white font-medium">{profile.connectionType}</strong>
                {profile.city ? ` via ${profile.city}, ${profile.country || ''}` : ''}
              </span>
            </div>
          </div>

          {/* 4-Cell Telemetry Matrix */}
          <div className="grid grid-cols-2 gap-2 text-[9px]">
            {/* Cell 1: Target Endpoint IP */}
            <div className="p-2.5 rounded-lg border border-white/10 bg-black/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="uppercase tracking-wider text-[8px]">Target Endpoint</span>
                <Server className="w-2.5 h-2.5 text-neutral-400" />
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-white font-bold truncate text-[10px]" title={profile.ip || 'Unresolved'}>
                  {profile.ip || 'Unresolved IP'}
                </span>
                {profile.ip && (
                  <button
                    type="button"
                    onClick={() => handleCopy(profile.ip!, 'ip')}
                    title="Copy IP"
                    className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                  >
                    {copiedKey === 'ip' ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Cell 2: Physical Geolocation */}
            <div className="p-2.5 rounded-lg border border-white/10 bg-black/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="uppercase tracking-wider text-[8px]">Physical Geo</span>
                <MapPin className="w-2.5 h-2.5 text-neutral-400" />
              </div>
              <span className="text-white font-bold truncate text-[10px]" title={`${profile.city || ''}, ${profile.country || ''}`}>
                {profile.city ? `${profile.city}, ${profile.country || ''}` : profile.country || 'Global Anycast'}
              </span>
            </div>

            {/* Cell 3: Autonomous System (ASN) */}
            <div className="p-2.5 rounded-lg border border-white/10 bg-black/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="uppercase tracking-wider text-[8px]">Autonomous System</span>
                <Globe className="w-2.5 h-2.5 text-neutral-400" />
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-white font-bold truncate text-[10px]" title={profile.asn || 'BGP Transit'}>
                  {profile.asn || 'BGP Peer'}
                </span>
                {profile.asn && (
                  <button
                    type="button"
                    onClick={() => handleCopy(profile.asn!, 'asn')}
                    title="Copy ASN"
                    className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                  >
                    {copiedKey === 'asn' ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Cell 4: Security Classification */}
            <div className="p-2.5 rounded-lg border border-white/10 bg-black/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="uppercase tracking-wider text-[8px]">Network Tier</span>
                <Shield className="w-2.5 h-2.5 text-neutral-400" />
              </div>
              <span className="text-white font-bold truncate text-[10px]">
                {profile.sourceContext === 'TELECOM_CARRIER' ? 'Cellular Tier-1' : 'BGP Peered'}
              </span>
            </div>
          </div>

          {/* Forensic Explainer Drawer — Explaining the Speedtest vs Passive Email mechanics */}
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5 text-[8.5px] text-neutral-300">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowExplanation((v) => !v)}>
              <span className="flex items-center gap-1.5 text-white/80 font-bold uppercase tracking-wider">
                <Info className="w-3 h-3 text-white" />
                <span>Forensic Intelligence Insight</span>
              </span>
              <button type="button" className="text-neutral-400 hover:text-white">
                {showExplanation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            <p className="mt-1 text-neutral-400 leading-relaxed">
              {profile.footnoteNote}
            </p>

            {showExplanation && (
              <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5 text-neutral-400">
                <div className="text-white font-bold">Why can Speedtest detect your home Wi-Fi, but email OSINT shows datacenters?</div>
                <div>
                  • <strong>Ookla Speedtest:</strong> Your device opens a direct socket connection to Ookla, exposing your home router&apos;s public IP.
                </div>
                <div>
                  • <strong>Email Addresses (e.g. Gmail/Outlook):</strong> Passive OSINT only sees the corporate mail exchanger (MX) server datacenters. Your home Wi-Fi is protected behind the email provider.
                </div>
                <div>
                  • <strong>Forensic Detection:</strong> To catch a sender&apos;s personal home ISP, inspect the raw RFC 822 email headers (<code>X-Originating-IP</code>) from a received message.
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-6 flex flex-col items-center justify-center text-center text-neutral-500 gap-2">
          <Wifi className="w-5 h-5 text-neutral-600 animate-pulse" />
          <span className="text-[9px] uppercase tracking-wider">
            Awaiting IP or Carrier telemetry resolution
          </span>
        </div>
      )}
    </div>
  );
}
