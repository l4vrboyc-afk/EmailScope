import { useState, useMemo, useEffect, useCallback, lazy, Suspense, type FormEvent } from 'react';
import SplashScreen from './components/SplashScreen';      // eager — must show instantly
import LandingPage from './components/LandingPage';        // eager — first meaningful paint
import ThreatScopeHeader from './components/EmailScopeHeader'; // eager — always visible in workspace
import ProgressVisualizer from './components/ProgressVisualizer'; // eager — shown during loading
import {
  CheckCircle,
  Network,
  AlertTriangle,
  Shield,
  Radio,
  ArrowRight,
  Sparkles,
  Archive,
  BarChart3,
  Wifi,
} from 'lucide-react';

import { hasAcceptedLegal } from './components/LegalConsentModal';

// ── Lazy-loaded: only fetched when the user actually needs them ──────────────
const EntityTopologyCard         = lazy(() => import('./components/EntityTopologyCard'));
const NodeDetailDrawer           = lazy(() => import('./components/NodeDetailDrawer'));
const ThreatMap                  = lazy(() => import('./components/ThreatMap'));
const RiskAssessmentCard         = lazy(() => import('./components/RiskAssessmentCard'));
const IntelligenceSummaryCard    = lazy(() => import('./components/IntelligenceSummaryCard'));
const TargetNetworkTelemetryCard = lazy(() => import('./components/TargetNetworkTelemetryCard'));
const CaseVaultModal             = lazy(() => import('./components/CaseVaultModal'));
const ApiKeysModal               = lazy(() => import('./components/ApiKeysModal'));
const NotFoundPage               = lazy(() => import('./components/NotFoundPage'));
const LegalFingerprintBadge      = lazy(() => import('./components/LegalFingerprintBadge'));
const LegalConsentModal          = lazy(() => import('./components/LegalConsentModal'));


import { runPivotQuery, deriveSeedType, mergePivotGraphs } from './api/pivot';
import {
  runEngineInvestigation,
  cancelEngineInvestigation,
  isProgressUpdate,
  isInvestigationResult,
  isErrorResponse,
  engineMode,
} from './api/engine';
import { buildIncidentReport, exportReportJson, exportReportPdf } from './api/report';
import { formatGraphNode } from './utils/graphTransform';
import {
  loadCaseVault,
  saveCaseToVault,
  deleteCaseFromVault,
  clearCaseVault,
  type InvestigationCase,
} from './utils/caseVault';
import type {
  SeedType,
  GraphNode,
  InvestigationPayload,
  RiskAssessment,
  IntelligenceSummary,
} from './api/types';

interface PresetScenario {
  title: string;
  desc: string;
  value: string;
  type: SeedType;
  badge: string;
}

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    title: 'Executive Spear-Phishing Audit',
    desc: 'Deep sweep for credential exposures, burner inboxes, and SPF/DMARC mail policy status.',
    value: 'target@example.com',
    type: 'email',
    badge: 'Email OSINT',
  },
  {
    title: 'Domain & Spoofing Recon',
    desc: 'Map DNS topology, nameservers, MX mail routing, and Certificate Transparency records.',
    value: 'github.com',
    type: 'domain',
    badge: 'Domain Intel',
  },
  {
    title: 'Suspicious Relay & Tor Audit',
    desc: 'Geolocate IP routing infrastructure, upstream ASN, Tor/Proxy hops, and datacenter fingerprints.',
    value: '1.1.1.1',
    type: 'ip',
    badge: 'IP Cartography',
  },
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  const [seedValue, setSeedValue] = useState('');
  const [seedType, setSeedType] = useState<SeedType>('email');
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'workbench' | 'radar'>('radar');

  // Legal consent — shown once on first workspace entry
  const [legalAccepted, setLegalAccepted] = useState(hasAcceptedLegal);
  const [showLegal, setShowLegal] = useState(false);

  // Intercepts any action that would enter the workspace
  const enterWorkspace = useCallback(() => {
    if (legalAccepted) {
      setActiveView('workbench');
    } else {
      setShowLegal(true);
    }
  }, [legalAccepted]);

  const handleLegalAccept = useCallback(() => {
    setLegalAccepted(true);
    setShowLegal(false);
    setActiveView('workbench');
  }, []);

  const handleLegalDecline = useCallback(() => {
    setShowLegal(false);
  }, []);

  const [showMap, setShowMap] = useState(true);
  const [mapExpanded, setMapExpanded] = useState(false);

  // Workstation features
  const [opsecEnabled, setOpsecEnabled] = useState(false);
  const [persistEnabled, setPersistEnabled] = useState(false);
  const [caseVault, setCaseVault] = useState<InvestigationCase[]>(loadCaseVault);
  const [caseVaultOpen, setCaseVaultOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);

  const [showOfflinePage, setShowOfflinePage] = useState(!navigator.onLine);

  // Show 404/offline overlay whenever the browser loses connectivity
  useEffect(() => {
    const goOffline = () => setShowOfflinePage(true);
    const goOnline = () => setShowOfflinePage(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const [progressStage, setProgressStage] = useState<string | null>(null);
  const [seenStages, setSeenStages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pivotNotice, setPivotNotice] = useState<string | null>(null);

  // Investigation state
  const [graphData, setGraphData] = useState<InvestigationPayload | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [narrative, setNarrative] = useState<IntelligenceSummary | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [pivotingNode, setPivotingNode] = useState<GraphNode | null>(null);
  const [topologyMinimized, setTopologyMinimized] = useState(false);
  const [rightRailTab, setRightRailTab] = useState<'risk' | 'network'>('risk');

  const hasSession = !!graphData;
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const rootSeedNode = useMemo(() => {
    if (!graphData) return null;
    const root = (graphData.nodes || []).find(
      (n) => n.metadata?.is_root_seed || n.label === graphData.seed?.value
    ) || graphData.nodes?.[0];
    return root || null;
  }, [graphData]);

  const activeInspectorNode = selectedNode || rootSeedNode;

  const activeDrawerNode = useMemo(() => {
    if (!activeInspectorNode) return null;
    const formatted = formatGraphNode(activeInspectorNode);
    const edge = graphData?.edges?.find(
      (e) => e.target_canonical_id === activeInspectorNode.canonical_id
    );
    return { ...formatted, category: activeInspectorNode.category, relationship: edge?.relationship };
  }, [activeInspectorNode, graphData]);

  // Session persistence
  const SESSION_KEY = 'es_session_v1';
  useEffect(() => {
    if (!persistEnabled) return;
    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ graphData, riskAssessment, narrative, seedValue, seedType })
      );
    } catch { /* quota errors ignored */ }
  }, [persistEnabled, graphData, riskAssessment, narrative, seedValue, seedType]);

  useEffect(() => {
    if (!persistEnabled) return;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.graphData) {
        setGraphData(saved.graphData);
        setActiveView('workbench');
      }
      if (saved.riskAssessment) setRiskAssessment(saved.riskAssessment);
      if (saved.narrative) setNarrative(saved.narrative);
      if (saved.seedValue) setSeedValue(saved.seedValue);
      if (saved.seedType) setSeedType(saved.seedType);
    } catch { /* corrupt snapshots ignored */ }
  }, []);

  const handleRunInvestigation = async (overrideSeed?: string, overrideType?: SeedType, e?: FormEvent) => {
    e?.preventDefault();
    const targetVal = (overrideSeed || seedValue).trim();
    const targetType = overrideType || seedType;
    if (!targetVal || loading) return;

    if (overrideSeed) setSeedValue(targetVal);
    if (overrideType) setSeedType(targetType);

    setLoading(true);
    setProgressStage(null);
    setError(null);
    setPivotNotice(null);
    setExportNotice(null);
    setGraphData(null);
    setRiskAssessment(null);
    setNarrative(null);
    setSelectedNode(null);
    setActiveView('workbench');

    try {
      setSeenStages([]);
      const iterator = runEngineInvestigation({ value: targetVal, type: targetType });
      for await (const response of iterator) {
        if (isProgressUpdate(response)) {
          setProgressStage(response.stage);
          setSeenStages((prev) => [...prev, response.stage]);
        } else if (isInvestigationResult(response)) {
          setGraphData(response.payload);
          setRiskAssessment(response.risk);
          setNarrative(response.narrative);
        } else if (isErrorResponse(response)) {
          setError(response.message || 'An error occurred during investigation.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setProgressStage(null);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelEngineInvestigation();
      setLoading(false);
      setProgressStage(null);
      setError('Investigation cancelled by user.');
    } catch (err) {
      setError(`Failed to cancel: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handlePivot = async (node: GraphNode) => {
    if (!graphData || loading || pivotingNode) return;

    setPivotingNode(node);
    setError(null);
    setPivotNotice(null);

    try {
      const pivotSeedType = deriveSeedType(node);
      const pivotResult = await runPivotQuery({
        value: node.label,
        type: pivotSeedType,
      });
      const { payload: mergedPayload, addedCount } = mergePivotGraphs(graphData, pivotResult);
      setGraphData(mergedPayload);
      setPivotNotice(
        addedCount > 0
          ? `Pivot complete on "${node.label}" (${pivotSeedType}): ${addedCount} new entit${addedCount === 1 ? 'y' : 'ies'} discovered.`
          : `Pivot complete on "${node.label}" (${pivotSeedType}): no new entities discovered.`
      );
    } catch (err) {
      setError(`Pivot failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPivotingNode(null);
    }
  };

  const handleKAnonymityScan = (node: { data?: { kAnonymityStatus?: unknown } }) => {
    if (node?.data?.kAnonymityStatus) return;
    const graceState = {
      status: 'unverified',
      compromised: false,
      pwned_count: 0,
      threat_level: 'UNVERIFIED',
      k_anonymity_bucket_size: 0,
      cache_hit: false,
      reason: 'No k-anonymity telemetry attached to this node. Run a full investigation with the breach module enabled.',
    };
    setSelectedNode((prev) =>
      prev ? { ...prev, metadata: { ...prev.metadata, k_anonymity: graceState } } : prev
    );
  };

  const handleExport = async (format: 'json' | 'pdf') => {
    if (!graphData || !riskAssessment || !narrative) return;

    try {
      const report = buildIncidentReport(graphData, riskAssessment, narrative);
      if (format === 'json') {
        const destination = await exportReportJson(report);
        setExportNotice(`JSON incident report saved — ${destination}`);
      } else {
        exportReportPdf(report);
        setExportNotice('Print dialog opened — select "Save as PDF" to export briefing.');
      }
    } catch (err) {
      setError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSaveCurrentCase = () => {
    if (!graphData || !riskAssessment || !narrative) return;
    const newCase: InvestigationCase = {
      id: `case_${Date.now()}`,
      timestamp: Date.now(),
      dateStr: new Date().toLocaleString(),
      targetValue: graphData.seed?.value ?? seedValue,
      targetType: graphData.seed?.seed_type ?? seedType,
      nodeCount: graphData.nodes?.length ?? 0,
      edgeCount: graphData.edges?.length ?? 0,
      riskScore: riskAssessment.score,
      riskLevel: riskAssessment.level,
      payload: graphData,
      riskAssessment,
      narrative,
    };
    setCaseVault(saveCaseToVault(newCase));
  };

  const handleLoadCase = (c: InvestigationCase) => {
    setGraphData(c.payload);
    setRiskAssessment(c.riskAssessment);
    setNarrative(c.narrative);
    setSeedValue(c.targetValue);
    setSeedType(c.targetType);
    setSelectedNode(null);
    setActiveView('workbench');
  };

  const handleClearSession = () => {
    setGraphData(null);
    setRiskAssessment(null);
    setNarrative(null);
    setSelectedNode(null);
    setError(null);
    setPivotNotice(null);
    setExportNotice(null);
    setTopologyMinimized(false);
  };

  const emptyState = !graphData;

  // Minimal dark skeleton shown while a lazy chunk is downloading
  const LazyFallback = () => (
    <div className="flex items-center justify-center w-full h-full bg-[#000000]">
      <div className="flex gap-1.5">
        {[0,1,2].map(i => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-white/20"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-[#000000] text-white font-mono overflow-hidden select-none">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {/* Top Command Bar (Workbench only) */}
      {activeView === 'workbench' && (
        <ThreatScopeHeader
          seedValue={seedValue}
          onSeedValueChange={setSeedValue}
          seedType={seedType}
          onSeedTypeChange={setSeedType}
          onRunInvestigation={() => handleRunInvestigation()}
          onCancel={handleCancel}
          loading={loading}
          hasSession={hasSession}
          showMap={showMap}
          onToggleMap={() => setShowMap((v) => !v)}
          onExportJson={() => handleExport('json')}
          onExportPdf={() => handleExport('pdf')}
          opsecEnabled={opsecEnabled}
          onToggleOpsec={() => setOpsecEnabled((v) => !v)}
          persistEnabled={persistEnabled}
          onTogglePersist={() => setPersistEnabled((v) => !v)}
          onClearSession={handleClearSession}
          onOpenCaseVault={() => setCaseVaultOpen(true)}
          onSaveCurrentCase={handleSaveCurrentCase}
          caseCount={caseVault.length}
          onOpenApiKeys={() => setApiKeysOpen(true)}
          activeView={activeView}
          onViewChange={setActiveView}
        />
      )}

      {/* Main Content Area */}
      {activeView === 'radar' ? (
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#000000]">
          <LandingPage
            onLaunchWorkspace={enterWorkspace}
            onOpenCaseVault={() => setCaseVaultOpen(true)}
            caseCount={caseVault.length}
            isNative={engineMode === 'native'}
          />
        </div>
      ) : (
        /* 3-Zone Workspace Grid */
        <div className="dashboard-grid bg-[#000000]">
          {/* LEFT RAIL: Threat Map & Discovered Entity Inventory */}
          <aside className="min-h-0 border-r border-white/[0.08] bg-[#080808] flex flex-col overflow-hidden p-3 gap-3 h-full">
            {graphData ? (
              <>
                {/* Threat Map (Threat Cartography) */}
                {showMap ? (
                  <div
                    className={`flex flex-col rounded-xl overflow-hidden border border-white/[0.1] shadow-2xl transition-all duration-300 ${
                      mapExpanded ? 'h-[440px] flex-shrink-0' : 'h-64 flex-shrink-0'
                    }`}
                  >
                    <Suspense fallback={<div className="w-full h-full bg-[#080808] animate-pulse rounded-xl" />}>
                      <ThreatMap
                        graphData={graphData}
                        targetSeed={graphData.seed?.value}
                        isExpanded={mapExpanded}
                        onToggleExpand={() => setMapExpanded((v) => !v)}
                        onClose={() => setShowMap(false)}
                      />
                    </Suspense>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    className="w-full text-[9px] uppercase tracking-widest px-3 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all font-bold flex-shrink-0"
                  >
                    Reopen Threat Cartography
                  </button>
                )}

                {/* Discovered Entity Inventory — placed under the map, giving way when map expands */}
                <div className="flex-1 min-h-[140px] rounded-xl border border-white/10 bg-[#000000] p-3 flex flex-col shadow-2xl font-mono overflow-hidden">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-widest text-white font-bold">
                        Discovered Entity Inventory
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-neutral-300 font-bold">
                        {graphData.nodes?.length || 0}
                      </span>
                    </div>
                    <span className="text-[7.5px] text-neutral-500 uppercase tracking-wider">
                      Click to inspect
                    </span>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
                    {(graphData.nodes || []).map((node) => {
                      const isSelected = activeInspectorNode?.canonical_id === node.canonical_id;
                      return (
                        <div
                          key={node.canonical_id}
                          onClick={() => setSelectedNode(node)}
                          className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer text-xs ${
                            isSelected
                              ? 'bg-white text-black border-white shadow-md'
                              : 'bg-white/[0.02] border-white/[0.06] text-neutral-300 hover:border-white/20 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                isSelected ? 'bg-black' : 'bg-white'
                              }`}
                            />
                            <span className="font-bold truncate text-[11px]" title={node.label}>
                              {node.label}
                            </span>
                            <span
                              className={`text-[8px] uppercase px-1 py-0.2 rounded font-mono flex-shrink-0 ${
                                isSelected
                                  ? 'bg-black/10 text-black font-bold'
                                  : 'bg-white/10 text-neutral-400'
                              }`}
                            >
                              {node.category}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePivot(node);
                            }}
                            disabled={!!pivotingNode}
                            className={`text-[8px] uppercase tracking-wider px-2 py-0.5 rounded font-bold transition-all flex-shrink-0 ${
                              isSelected
                                ? 'bg-black text-white hover:bg-neutral-800'
                                : 'border border-white/20 bg-white/5 text-white hover:bg-white/15'
                            }`}
                          >
                            Pivot
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col justify-between p-3 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2.5">
                    <Radio className="w-4 h-4 text-white animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">
                      Telemetry Feeds
                    </span>
                  </div>

                  <div className="space-y-2.5 text-[10px]">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-white/50">Core Engine</span>
                      <span className="text-white font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
                        {engineMode === 'native' ? 'Sidecar IPC' : 'Web OSINT'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-white/50">Privacy Protocol</span>
                      <span className="text-white/90 font-medium">k-Anonymity 5-Hex</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-white/50">GeoIP Database</span>
                      <span className="text-white/80">MaxMind GeoLite2</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-white/50">Rate Limiter</span>
                      <span className="text-white/80">Token Bucket 5/s</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-white/[0.06] bg-black/40 text-center">
                  <span className="text-[9px] text-white/50 uppercase tracking-widest block font-bold">
                    Cartography Standby
                  </span>
                  <span className="text-[8px] text-white/35 block mt-1">
                    Resolves IPs and coordinates upon search
                  </span>
                </div>
              </div>
            )}
          </aside>

          {/* CENTER STAGE */}
          <main className="center-workspace-stage p-3 flex flex-col gap-3 relative overflow-hidden">
            {graphData ? (
              <>
                {/* Topology Area */}
                {!topologyMinimized ? (
                  <div className="flex-1 min-h-0 w-full h-full">
                    <EntityTopologyCard
                      graphData={graphData}
                      onNodeSelect={setSelectedNode}
                      onPivot={handlePivot}
                      pivotingNode={pivotingNode}
                      isMinimized={false}
                      onToggleMinimize={() => setTopologyMinimized(true)}
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col gap-3">
                    <div className="flex flex-row items-start gap-3 flex-shrink-0">
                      <EntityTopologyCard
                        graphData={graphData}
                        onNodeSelect={setSelectedNode}
                        onPivot={handlePivot}
                        pivotingNode={pivotingNode}
                        isMinimized={true}
                        onToggleMinimize={() => setTopologyMinimized(false)}
                      />

                      {/* Target Dossier HUD alongside minimized topology */}
                      <div className="h-[235px] flex-1 min-w-0 rounded-xl border border-white/10 bg-[#080808] p-3.5 flex flex-col justify-between shadow-2xl font-mono">
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              Target Dossier
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full border border-white/20 bg-white/5 text-white font-bold uppercase">
                              {graphData.seed?.seed_type || seedType}
                            </span>
                          </div>

                          <div className="mt-2.5 space-y-2">
                            <div>
                              <span className="text-[8px] text-neutral-500 uppercase tracking-wider block font-semibold">
                                Target Seed Identity
                              </span>
                              <span className="text-xs font-bold text-white break-all">
                                {graphData.seed?.value || seedValue}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                                <span className="text-neutral-500 text-[8px] uppercase tracking-wider block">
                                  Risk Score
                                </span>
                                <span className="font-bold text-white text-sm">
                                  {riskAssessment?.score ?? '—'}/100
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                                <span className="text-neutral-500 text-[8px] uppercase tracking-wider block">
                                  Risk Level
                                </span>
                                <span className="font-bold text-white text-sm uppercase">
                                  {riskAssessment?.level || 'Standard'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[9px] text-neutral-400">
                          <span>{graphData.nodes?.length || 0} entities discovered</span>
                          <span>{graphData.edges?.length || 0} connections</span>
                        </div>
                      </div>
                    </div>

                    {/* Forensic Security Telemetry & Evidence Matrix filling the space down to the identity info tab */}
                    <div className="flex-1 min-h-0 rounded-xl border border-white/10 bg-[#080808] p-3.5 flex flex-col shadow-2xl font-mono overflow-y-auto">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 flex-shrink-0">
                        <span className="text-[10px] uppercase tracking-widest text-white font-bold flex items-center gap-1.5">
                          <Shield className="w-3 h-3 text-white" />
                          <span>Forensic Security Telemetry & Evidence Matrix</span>
                        </span>
                        <span className="text-[8px] text-neutral-500 uppercase">
                          Dynamic Threat Synthesis
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        <div className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                          <span className="text-[8px] text-neutral-500 uppercase block">Total Entities</span>
                          <span className="text-sm font-bold text-white">{graphData.nodes?.length || 0}</span>
                        </div>
                        <div className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                          <span className="text-[8px] text-neutral-500 uppercase block">Active Links</span>
                          <span className="text-sm font-bold text-white">{graphData.edges?.length || 0}</span>
                        </div>
                        <div className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                          <span className="text-[8px] text-neutral-500 uppercase block">Risk Verdict</span>
                          <span className="text-sm font-bold text-white uppercase">{riskAssessment?.level || 'LOW'}</span>
                        </div>
                        <div className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                          <span className="text-[8px] text-neutral-500 uppercase block">Privacy Shield</span>
                          <span className="text-sm font-bold text-white">k-Anon 5</span>
                        </div>
                      </div>

                      {riskAssessment?.triggered_rules && riskAssessment.triggered_rules.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold block mb-1">
                            Triggered Indicators ({riskAssessment.triggered_rules.length})
                          </span>
                          {riskAssessment.triggered_rules.map((rule, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-black/60 border border-white/10 text-[10px] text-neutral-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0 mt-1" />
                              <span>{rule}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Identity • Info Tab — ALWAYS visible with fixed dimensions */}
                <div className="h-[240px] flex-shrink-0 w-full z-20">
                  <NodeDetailDrawer
                    node={activeDrawerNode}
                    onClose={() => setSelectedNode(null)}
                    onPivot={() => activeInspectorNode && handlePivot(activeInspectorNode)}
                    onKAnonymityScan={handleKAnonymityScan}
                    opsecEnabled={opsecEnabled}
                    pivoting={!!pivotingNode}
                  />
                </div>
              </>
            ) : (
              /* MISSION CONTROL LAUNCHPAD */
              <div className="h-full flex flex-col items-center justify-center gap-6 px-6 py-8 overflow-y-auto bg-black relative">
                {/* Hero Title */}
                <div className="text-center space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/5 text-white/90 text-[10px] font-mono font-bold uppercase tracking-widest shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>OSINT Threat Intelligence Launchpad</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
                    Investigate Any Digital Identity
                  </h2>
                  <p className="text-xs text-white/60 font-mono leading-relaxed">
                    Query breach exposures, mail server security, DNS posture, and entity relationships with zero plaintext hash leakage.
                  </p>
                </div>

                {/* Main Launch Form */}
                <form
                  onSubmit={(e) => handleRunInvestigation(undefined, undefined, e)}
                  className="flex items-center gap-2 w-full max-w-2xl bg-[#080808] border border-white/20 rounded-xl p-2 shadow-2xl focus-within:border-white focus-within:ring-1 focus-within:ring-white/20 transition-all"
                >
                  <span className="pl-3 text-[10px] font-mono uppercase tracking-widest text-white/60 font-bold whitespace-nowrap">
                    {seedType}
                  </span>
                  <input
                    type="text"
                    placeholder="Enter target seed (e.g. target@example.com, domain.com, 1.1.1.1)..."
                    value={seedValue}
                    onChange={(e) => setSeedValue(e.target.value)}
                    className="flex-1 bg-transparent text-xs font-mono text-white placeholder-white/30 focus:outline-none px-2"
                  />
                  <button
                    type="submit"
                    disabled={loading || !seedValue.trim()}
                    className="bg-white hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:border-neutral-800 disabled:cursor-not-allowed
                               text-black font-mono font-bold text-[10px] uppercase tracking-widest px-5 py-3 rounded-lg transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white active:scale-95"
                  >
                    Investigate
                  </button>
                </form>

                {/* Quick Scenario Archetype Cards */}
                <div className="w-full max-w-3xl space-y-2.5">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono block text-center">
                    Select a Pre-Configured Investigation Archetype
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {PRESET_SCENARIOS.map((scenario) => (
                      <button
                        key={scenario.value}
                        type="button"
                        onClick={() => handleRunInvestigation(scenario.value, scenario.type)}
                        className="group flex flex-col text-left p-3.5 rounded-xl border border-white/10 bg-[#080808] hover:border-white/40 hover:bg-white/[0.04] transition-all relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[9px] px-2 py-0.5 rounded-full border border-white/15 bg-white/5 text-white/70 group-hover:text-white group-hover:border-white/30 transition-colors font-mono">
                            {scenario.badge}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <span className="text-xs font-bold text-white transition-colors mb-1 font-sans">
                          {scenario.title}
                        </span>
                        <span className="text-[10px] text-white/50 line-clamp-2 leading-snug font-mono">
                          {scenario.desc}
                        </span>
                        <span className="mt-2 text-[9px] text-white/40 font-mono truncate group-hover:text-white/70 transition-colors">
                          {scenario.value}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Case Vault Quick Load if cases exist */}
                {caseVault.length > 0 && (
                  <div className="w-full max-w-3xl pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Archive className="w-3.5 h-3.5 text-white/80" />
                      <span className="text-[10px] uppercase tracking-widest text-white/60">
                        {caseVault.length} Archived Case{caseVault.length === 1 ? '' : 's'} in Vault
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCaseVaultOpen(true)}
                      className="text-[9px] uppercase tracking-widest text-white/75 hover:text-white transition-colors underline underline-offset-4"
                    >
                      Open Case Vault →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Progress visualizer overlay */}
            {loading && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
                <div className="w-full max-w-md shadow-2xl">
                  <ProgressVisualizer stages={seenStages} currentStage={progressStage} />
                </div>
              </div>
            )}

            {/* Notification toasts */}
            {exportNotice && (
              <div className="absolute bottom-6 left-6 right-6 max-w-xl bg-[#0a0a0a]/98 border border-white/20 text-white px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-mono shadow-2xl z-30">
                <CheckCircle className="w-5 h-5 text-white flex-shrink-0" />
                <span className="break-all">{exportNotice}</span>
              </div>
            )}
            {pivotNotice && (
              <div className="absolute bottom-6 left-6 right-6 max-w-xl bg-[#0a0a0a]/98 border border-white/20 text-white px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-mono shadow-2xl z-30">
                <Network className="w-5 h-5 text-white flex-shrink-0" />
                <span>{pivotNotice}</span>
              </div>
            )}
            {error && (
              <div className="absolute bottom-6 left-6 right-6 max-w-xl bg-[#0a0a0a]/98 border border-white/30 text-white px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-mono shadow-2xl z-30">
                <AlertTriangle className="w-5 h-5 text-white flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </main>

          {/* RIGHT RAIL: Threat Telemetry or Diagnostics */}
          <aside className="min-h-0 border-l border-white/[0.08] bg-[#080808] flex flex-col h-full overflow-y-auto">
            {emptyState ? (
              <div className="p-4 space-y-4">
                <div className="border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-white" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                      Workstation Readiness
                    </span>
                  </div>
                  <p className="text-[9px] text-white/50">
                    Pre-investigation checklist and security parameters.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 block">
                    Execution Pipeline
                  </span>
                  {[
                    { title: 'Protocol Resolution', desc: 'DNS, MX, SPF, DMARC, RDAP' },
                    { title: 'Privacy Shield', desc: 'SHA-1/256 Range Query (Zero Leaks)' },
                    { title: 'Graph Synthesis', desc: 'Deduplication & Canonical Topology' },
                    { title: 'Risk Scorer', desc: 'Dynamic Bounded Threat Normalization' },
                    { title: 'Forensic Seal', desc: 'Immutable SHA-256 Chain of Custody' },
                  ].map((step, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-white/85 block">
                          {step.title}
                        </span>
                        <span className="text-[8px] text-white/45 block">{step.desc}</span>
                      </div>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white border border-white/20 font-bold">
                        READY
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setActiveView('radar')}
                    className="w-full p-2.5 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-colors text-[9px] uppercase tracking-widest font-bold flex items-center justify-center gap-1.5"
                  >
                    <span>Explore Threat Radar & Catalog</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Space-Saving Dual HUD: Risk Assessment ⇄ Target ISP & Network HUD */}
                <div className="p-3 border-b border-white/[0.08] flex flex-col gap-2">
                  <div className="flex items-center bg-black/80 p-1 rounded-xl border border-white/10 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setRightRailTab('risk')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold transition-all ${
                        rightRailTab === 'risk'
                          ? 'bg-white text-black shadow-md'
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <BarChart3 className="w-3 h-3" />
                      <span>Risk Assessment</span>
                      {riskAssessment && (
                        <span
                          className={`text-[7.5px] px-1.5 py-0.2 rounded font-black ${
                            rightRailTab === 'risk'
                              ? 'bg-black text-white'
                              : 'bg-white/10 text-neutral-300'
                          }`}
                        >
                          {riskAssessment.level}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRightRailTab('network')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold transition-all ${
                        rightRailTab === 'network'
                          ? 'bg-white text-black shadow-md'
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Wifi className="w-3 h-3" />
                      <span>Target ISP HUD</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </button>
                  </div>

                  {rightRailTab === 'risk' ? (
                    riskAssessment ? (
                      <RiskAssessmentCard
                        risk={riskAssessment}
                        onToggleNetwork={() => setRightRailTab('network')}
                      />
                    ) : (
                      <div className="text-white/40 text-xs italic">No risk assessment available.</div>
                    )
                  ) : (
                    <TargetNetworkTelemetryCard
                      graphData={graphData}
                      selectedNode={selectedNode}
                      targetSeed={graphData.seed?.value ?? seedValue}
                      targetType={graphData.seed?.seed_type ?? seedType}
                      onToggleRisk={() => setRightRailTab('risk')}
                    />
                  )}
                </div>

                {/* AI Narrative Section */}
                <div className="p-3 border-b border-white/[0.08]">
                  {narrative ? (
                    <IntelligenceSummaryCard summary={narrative} />
                  ) : (
                    <div className="text-white/40 text-xs italic">No intelligence summary available.</div>
                  )}
                </div>

                {/* Legal Fingerprint Badge (Forensic chain of custody) */}
                {graphData?.metadata?.legal_fingerprint && (
                  <div className="p-3 border-b border-white/[0.08]">
                    <LegalFingerprintBadge fingerprint={graphData.metadata.legal_fingerprint} />
                  </div>
                )}

                {/* Selected Entity Inspector */}
                <div className="p-4 flex-1 space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/90">
                    Entity Inspector
                  </span>
                  {selectedNode ? (
                    <div className="bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.08] space-y-2 text-xs">
                      <div>
                        <span className="text-white/40 block text-[9px] uppercase tracking-widest">
                          Identifier
                        </span>
                        <span className="font-mono text-white font-medium break-all">{selectedNode.label}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[9px] uppercase tracking-widest">
                          Canonical ID
                        </span>
                        <span className="font-mono text-white/60 break-all text-[10px]">
                          {selectedNode.canonical_id}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-white/[0.04]">
                        <div>
                          <span className="text-white/40 block text-[9px] uppercase tracking-widest">
                            Category
                          </span>
                          <span className="capitalize text-white font-medium">{selectedNode.category}</span>
                        </div>
                        <div>
                          <span className="text-white/40 block text-[9px] uppercase tracking-widest">
                            Pivot Node
                          </span>
                          <span className="text-white font-medium">
                            {selectedNode.metadata?.is_key_pivot_node ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                      Click any entity on the graph to inspect metadata.
                    </p>
                  )}
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* Workstation Modals — each in its own tight Suspense so no sibling flickers */}
      <Suspense fallback={null}>
        <CaseVaultModal
          isOpen={caseVaultOpen}
          onClose={() => setCaseVaultOpen(false)}
          cases={caseVault}
          onLoadCase={handleLoadCase}
          onDeleteCase={(id) => setCaseVault(deleteCaseFromVault(id))}
          onClearAllCases={() => { clearCaseVault(); setCaseVault([]); }}
          onImportCase={(imported) => setCaseVault(saveCaseToVault(imported))}
          opsecEnabled={opsecEnabled}
        />
      </Suspense>
      <Suspense fallback={null}>
        <ApiKeysModal isOpen={apiKeysOpen} onClose={() => setApiKeysOpen(false)} />
      </Suspense>

      {/* iyo-inspired 404 / offline overlay */}
      {showOfflinePage && (
        <Suspense fallback={null}>
          <NotFoundPage onBack={() => setShowOfflinePage(false)} />
        </Suspense>
      )}
      {/* Legal consent — shown once on first workspace entry */}
      {showLegal && (
        <Suspense fallback={null}>
          <LegalConsentModal
            onAccept={handleLegalAccept}
            onDecline={handleLegalDecline}
          />
        </Suspense>
      )}
    </div>
  );
}