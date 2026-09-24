import { useState, useEffect, useRef } from 'react';
import { Shield, FileText, Lock, ChevronDown } from 'lucide-react';

interface LegalConsentModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

const STORAGE_KEY = 'ts_legal_accepted_v1';

export function hasAcceptedLegal(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}

function markLegalAccepted(): void {
  try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* noop */ }
}
const YEAR = new Date().getFullYear();

// ── Legal Content ─────────────────────────────────────────────────────────────

const TOS_CONTENT = `THREATSCOPE — TERMS OF SERVICE

Last updated: ${YEAR}. Operated by ThreatScope (an independent open-source project).

1. ACCEPTANCE OF TERMS

By accessing or using the ThreatScope platform ("the Service"), you confirm that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, you must not use the Service.

2. DESCRIPTION OF SERVICE

ThreatScope is an open-source intelligence (OSINT) and threat investigation platform that enables users to research publicly available information about email addresses, domains, IP addresses, usernames, and associated digital artefacts. The Service is provided for lawful security research, threat analysis, and investigative journalism purposes only.

3. ACCEPTABLE USE POLICY

You agree that you will NOT use ThreatScope to:

  (a) Conduct unauthorized reconnaissance, surveillance, or profiling of any individual or organization without lawful authority or consent;
  (b) Engage in stalking, harassment, doxxing, or any form of targeted intimidation;
  (c) Collect information for the purpose of identity theft, fraud, or unauthorized access to computer systems;
  (d) Violate any applicable local, national, or international law, including but not limited to computer misuse laws, data protection regulations, or cybercrime statutes in your jurisdiction;
  (e) Automate or scrape the ThreatScope user interface without express written permission;
  (f) Use the Service to investigate minors, protected individuals, or any person without a legitimate professional or legal basis.

You are solely responsible for ensuring that your use of ThreatScope complies with all applicable laws in your jurisdiction.

4. AS-IS DISCLAIMER & NO WARRANTY

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND. THREATSCOPE DOES NOT WARRANT THAT:

  - Threat intelligence ratings, risk scores, GeoIP lookups, breach data, or DNS records are accurate, complete, or current;
  - Results are suitable for any particular purpose, including legal proceedings or personnel decisions;
  - The Service will be uninterrupted or error-free.

All outputs are provided for informational and research purposes ONLY. You must independently verify any findings before taking action.

5. LIMITATION OF LIABILITY

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THREATSCOPE AND ITS CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING:

  - Loss of data, revenue, or reputation;
  - Decisions made on the basis of inaccurate intelligence results;
  - Any harm caused by reliance on the Service's outputs.

YOUR SOLE REMEDY FOR DISSATISFACTION WITH THE SERVICE IS TO DISCONTINUE USE.

6. INTELLECTUAL PROPERTY

ThreatScope is open-source software distributed under the MIT License. Third-party data sources accessed through the platform remain subject to their respective terms.

7. MODIFICATIONS

We reserve the right to update these Terms at any time. Continued use of the Service following any changes constitutes acceptance of the revised Terms.

8. GOVERNING LAW

These Terms are governed by the laws of the jurisdiction in which the project is maintained. You are responsible for compliance with local laws applicable to your use of the Service.

9. CONTACT

For enquiries regarding these Terms, contact the project maintainer via the GitHub repository.`;

const PRIVACY_CONTENT = `THREATSCOPE — PRIVACY POLICY

Last updated: ${YEAR}. Operated by ThreatScope (an independent open-source project).

1. OVERVIEW

ThreatScope is built on a zero-telemetry, privacy-first architecture. We do not operate servers that collect your personal data.

2. DATA WE DO NOT COLLECT

We do NOT collect, transmit, or store:

  - Your identity, name, or email address;
  - Your IP address or geolocation;
  - The investigation targets you search for;
  - Your session history or query logs;
  - Crash reports or usage analytics;
  - Cookies for tracking or advertising.

There are NO third-party analytics, advertising networks, or telemetry frameworks integrated into ThreatScope.

3. DATA STORED LOCALLY ON YOUR DEVICE

The following data is stored exclusively in your browser's localStorage or the native app's local file system. It NEVER leaves your device:

  (a) Case Vault: Investigation cases you save are stored locally and can be deleted at any time from within the app;
  (b) API Keys: Third-party API keys you configure are stored locally and sent directly from your browser to the respective providers — ThreatScope never sees or proxies these keys;
  (c) Consent Record: A flag recording that you accepted these Terms is stored locally.

4. THIRD-PARTY API SERVICES

When you run an investigation, ThreatScope may make requests to third-party OSINT data providers. These requests are made directly from your browser or local desktop app. The data policies of those third-party services apply independently of this Privacy Policy.

5. COOKIES

ThreatScope does not use tracking or advertising cookies. No cookie consent banner is required.

6. CHILDREN'S PRIVACY

ThreatScope is intended for use by security professionals and researchers aged 18 and over. We do not knowingly collect data from minors.

7. YOUR RIGHTS

Since we do not store your personal data on any server, there is no data to request, correct, or delete from us. To remove locally stored data, clear your browser's localStorage or use the in-app "Clear Session" function.

8. CHANGES TO THIS POLICY

We may update this Privacy Policy periodically. The "Last updated" date at the top indicates when the most recent changes were made.

9. GOVERNING LAW & CONTACT

This Privacy Policy is governed by applicable data protection and privacy laws in the jurisdiction relevant to your use of the Service. For enquiries, contact the project maintainer via the GitHub repository.`;

// ── Component ──────────────────────────────────────────────────────────────────

export default function LegalConsentModal({ onAccept, onDecline }: LegalConsentModalProps) {
  const [activeTab, setActiveTab] = useState<'tos' | 'privacy'>('tos');
  const [checked, setChecked] = useState(false);
  const [visible, setVisible] = useState(false);
  const [scrolledEnough, setScrolledEnough] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      setScrolledEnough(true);
    }
  };

  const handleTabSwitch = (tab: 'tos' | 'privacy') => {
    setActiveTab(tab);
    setScrolledEnough(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const handleAccept = () => {
    markLegalAccepted();
    onAccept();
  };

  const content = activeTab === 'tos' ? TOS_CONTENT : PRIVACY_CONTENT;

  return (
    <div
      className="legal-overlay"
      style={{ opacity: visible ? 1 : 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Legal Agreement"
    >
      <div className="legal-backdrop" onClick={onDecline} />

      <div
        className="legal-modal"
        style={{ transform: visible ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.97)' }}
      >
        {/* ── Header ── */}
        <div className="legal-header">
          <div className="legal-header-brand">
            <Shield className="w-4 h-4" />
            <span className="legal-header-title">Before You Enter the Workspace</span>
          </div>
          <p className="legal-header-sub">
            Review and agree to our Terms of Service and Privacy Policy to continue.
          </p>

          <div className="legal-tabs">
            <button
              type="button"
              className={`legal-tab ${activeTab === 'tos' ? 'legal-tab--active' : ''}`}
              onClick={() => handleTabSwitch('tos')}
            >
              <FileText className="w-3 h-3" />
              Terms of Service
            </button>
            <button
              type="button"
              className={`legal-tab ${activeTab === 'privacy' ? 'legal-tab--active' : ''}`}
              onClick={() => handleTabSwitch('privacy')}
            >
              <Lock className="w-3 h-3" />
              Privacy Policy
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="legal-body" ref={scrollRef} onScroll={handleScroll}>
          <pre className="legal-text">{content}</pre>
        </div>

        {/* Scroll hint */}
        {!scrolledEnough && (
          <div className="legal-scroll-hint">
            <ChevronDown className="w-3 h-3" style={{ animation: 'bounce 1s ease-in-out infinite' }} />
            <span>Scroll to read in full</span>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="legal-footer">
          <label className="legal-checkbox-label">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="legal-checkbox"
            />
            <span className="legal-checkbox-text">
              I have read and agree to the{' '}
              <button type="button" className="legal-link" onClick={() => handleTabSwitch('tos')}>
                Terms of Service
              </button>
              {' '}and{' '}
              <button type="button" className="legal-link" onClick={() => handleTabSwitch('privacy')}>
                Privacy Policy
              </button>
            </span>
          </label>

          <div className="legal-btn-row">
            <button type="button" onClick={onDecline} className="legal-btn-decline">
              Decline
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={!checked}
              className="legal-btn-accept"
            >
              Enter Workspace →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
