import type { SeedType, InvestigationPayload, RiskAssessment, IntelligenceSummary } from '../api/types';

export interface InvestigationCase {
  id: string;
  timestamp: number;
  dateStr: string;
  targetValue: string;
  targetType: SeedType;
  nodeCount: number;
  edgeCount: number;
  riskScore: number;
  riskLevel: string;
  payload: InvestigationPayload;
  riskAssessment: RiskAssessment;
  narrative: IntelligenceSummary;
  legalFingerprint?: Record<string, unknown> | null;
  tag?: string;
}

const VAULT_KEY = 'es_case_vault_v1';
const MAX_CASES = 50;

export function loadCaseVault(): InvestigationCase[] {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load case vault:', err);
    return [];
  }
}

export function saveCaseToVault(newCase: InvestigationCase): InvestigationCase[] {
  try {
    const current = loadCaseVault();
    // Check if duplicate target recently exists (within last minute), replace or prepend
    const filtered = current.filter((c) => c.id !== newCase.id);
    const updated = [newCase, ...filtered].slice(0, MAX_CASES);
    localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save case to vault:', err);
    return loadCaseVault();
  }
}

export function deleteCaseFromVault(id: string): InvestigationCase[] {
  try {
    const current = loadCaseVault();
    const updated = current.filter((c) => c.id !== id);
    localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to delete case:', err);
    return loadCaseVault();
  }
}

export function clearCaseVault(): void {
  try {
    localStorage.removeItem(VAULT_KEY);
  } catch {
    /* ignore */
  }
}

export function exportCaseAsJson(caseItem: InvestigationCase): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(caseItem, null, 2));
  const downloadAnchor = document.createElement('a');
  const safeName = caseItem.targetValue.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `threatscope_case_${safeName}_${caseItem.id.slice(0, 6)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function parseImportedCase(jsonString: string): InvestigationCase | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.payload || !parsed.riskAssessment || !parsed.narrative) {
      throw new Error('Missing core OSINT investigation components');
    }
    const validatedCase: InvestigationCase = {
      id: parsed.id || `case_${Date.now()}`,
      timestamp: parsed.timestamp || Date.now(),
      dateStr: parsed.dateStr || new Date().toLocaleString(),
      targetValue: parsed.targetValue || parsed.seedValue || 'imported_target',
      targetType: parsed.targetType || 'email',
      nodeCount: parsed.payload.nodes?.length || 0,
      edgeCount: parsed.payload.edges?.length || 0,
      riskScore: parsed.riskAssessment.score ?? 50,
      riskLevel: parsed.riskAssessment.level ?? 'MEDIUM',
      payload: parsed.payload,
      riskAssessment: parsed.riskAssessment,
      narrative: parsed.narrative,
      legalFingerprint: parsed.legalFingerprint || null,
      tag: parsed.tag || 'Imported Case',
    };
    return validatedCase;
  } catch (err) {
    console.error('Failed to parse imported case:', err);
    return null;
  }
}
