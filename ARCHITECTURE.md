# ThreatScope — Architecture Blueprint v2.0

> **Status:** Design Document  
> **Version:** 2.0  
> **Stack:** React + Vite + Mantine UI + FastAPI + PostgreSQL + Redis

---

## 1. Vision

An email intelligence platform that investigates an email address and delivers a contextual, actionable security report — evaluating breach exposure, trustworthiness, risk signals, and digital footprint — in seconds.

**The goal:** Be the tool a security analyst, recruiter, fraud investigator, or concerned individual opens when they need the full story behind an email.

---

## 2. Product Features (Complete)

### 2.1 Core Analysis Engine
- **Email Address Lookup** — Full OSINT scan on any email
- **Email Header Analysis** — Paste raw headers, get sending intelligence (IP, mail path, spoofing indicators)
- **Domain Intelligence** — SPF/DKIM/DMARC, whois, blacklists, age, registrar

### 2.2 AI Summary & Narrative Report
- AI-generated contextual summary of findings with written analysis
- Actionable suggestions per finding ("This domain is newly registered — verify sender identity before trusting links")
- Verdict level (Safe / Low Risk / Moderate / High Risk / Critical)
- Plain-language explanation of technical findings for non-expert users

### 2.3 Digital Footprint Timeline
- Chronological map of when the email/identity was first observed publicly
- Sources tagged with dates: GitHub (2018), forum posts (2019), breach appearances (2021), social profiles
- Visual timeline showing footprint growth over time
- Insights like: "3 years of public history," "Identity amplification detected in 2020"

### 2.4 Relationship Graph
- Interactive force-directed graph visualization
- Nodes: usernames, domains, social profiles, organizations, related emails
- Edges: discovered associations (same username, same domain, same password in breach)
- Filterable by node type, click to expand, hover for metadata
- Detects pattern: "5 accounts sharing the same password across 3 platforms"

### 2.5 Risk Alert System
Visible as highlight cards on the report:

| Alert | Trigger | Severity |
|-------|---------|----------|
| Disposable email | Matched against 10K+ temp mail domains | HIGH |
| Recently created domain | Domain age < 30 days | HIGH |
| High breach exposure | > 3 breaches or breach with high severity data | CRITICAL |
| Suspicious MX / SPF misconfigured | No SPF or SPF fails | MEDIUM |
| Typo-squatted domain | Levenshtein distance > known brands | CRITICAL |
| WHOIS privacy shield | Registrar privacy enabled | LOW |
| VPN/Proxy/Tor exit IP | Sender IP identified as anonymizing | MEDIUM |
| DMARC not enforced | p=none (monitoring only) | LOW |
| Role-based address | admin@, support@, noreply@ pattern | INFO |
| Gravatar-found identity | Profile picture resolution confirms identity | INFO |

### 2.6 Side-by-Side Email Comparison
- Compare two email addresses across all dimensions
- Overlay view: footprints, breaches, domains, professional presence, reputation
- Difference highlighting: "Email A has 0 breaches, Email B has 4"
- Shared indicators: "Both associated with domain example.com"
- Comparison verdict: "Use A over B based on risk score difference of 42 points"

### 2.7 Developer API
- REST API key authentication
- Endpoints mirroring web interface capabilities
- Rate tiers: Free (10 req/day), Pro (1000 req/day), Enterprise (unlimited)
- OpenAPI/Swagger documentation auto-generated
- Webhook support for async results
- SDKs: Python, Node.js, Go

---

## 3. System Architecture

### 3.1 Overall Architecture (Modular Monolith → Graduated Microservices)

```
┌══════════════════════════════════════════════════════════════════┐
│                        CLIENT LAYER                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  React + Vite                                                     │  │
│  │  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌────────────┐  │  │
│  │  │ Landing  │ │ Dashboard  │ │ Compare  │ │ API Docs   │  │  │
│  │  │   Page   │ │  / Report  │ │  View    │ │  (Devs)    │  │  │
│  │  └──────────┘ └────────────┘ └──────────┘ └────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐   │  │
│  │  │  D3.js / React Flow → Relationship Graph           │   │  │
│  │  │  Timeline → Custom JSX timeline component          │   │  │
│  │  └────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
└══════════════════════════════════════════════════════════════════┘
                             │ HTTPS (REST + WebSocket)
                             ▼
┌══════════════════════════════════════════════════════════════════┐
│                    API LAYER (FastAPI)                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Middleware Stack                                            │  │
│  │  Auth (JWT + OAuth) → Rate Limiter → Caching → Logging     │  │
│  └──────────────────────┬─────────────────────────────────────┘  │
│                         │                                         │
│  ┌──────────────────────┼─────────────────────────────────────┐  │
│  │  Route Layer                                        │      │  │
│  │  /api/v1/                                       │      │  │
│  │  ├── auth/         → Registration, login, refresh            │  │
│  │  ├── investigate/  → Email lookup, header analysis           │  │
│  │  ├── compare/      → Side-by-side comparison                 │  │
│  │  ├── history/      → Saved investigations                    │  │
│  │  ├── developer/    → API key management                      │  │
│  │  └── webhooks/     → Async result delivery                   │  │
│  └────────────────────────────────────────────────────────────┘  │
└══════════════════════════════════════════════════════════════════┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌───────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   CORE ENGINE      │  │  REPORT SERVICE   │  │   AI SERVICE     │
│   (Python)         │  │                    │  │                   │
│                    │  │  Report Generator  │  │  LLM Integration  │
│  ┌──────────────┐ │  │  ──────────────    │  │  ──────────────    │
│  │ Header Parser│ │  │  Section renderers │  │  Narrative summary │
│  │ DNS Resolver  │ │  │  HTML → PDF (WP)  │  │  Context-aware     │
│  │ WHOIS Client  │ │  │  Comparison layout │  │  suggestions       │
│  │ SMTP Verifier │ │  │  Chunked streaming │  │  Risk explanation  │
│  │ OSINT Runner  │ │  │  Export formats    │  │  (Claude API)      │
│  │ Risk Scorer   │ │  └──────────────────┘  │  └──────────────────┘ │
│  │ Alert Engine  │ │                        │                       │
│  │ Graph Builder │ │                        │                       │
│  └──────────────┘ │                        │                       │
└──────────┬────────┘                        └───────────┬───────────┘
           │                                             │
           └──────────────────┬──────────────────────────┘
                              ▼
┌══════════════════════════════════════════════════════════════════┐
│                    INFRASTRUCTURE LAYER                            │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │   PostgreSQL   │  │    Redis     │  │  S3 / Blob Storage │   │
│  │                │  │              │  │                    │   │
│  │  investigations│  │ Rate limit   │  │  PDF reports       │   │
│  │  domain_intel  │  │ Session store│  │  Report assets     │   │
│  │  breaches      │  │ OSINT cache  │  │  Timeline data     │   │
│  │  ip_intel      │  │ Result cache │  │                    │   │
│  │  users + auth  │  │ Pub/Sub      │  │                    │   │
│  │  comparisons   │  │              │  │                    │   │
│  │  blacklists    │  │              │  │                    │   │
│  │  relationship  │  │              │  │                    │   │
│  │  _data         │  │              │  │                    │   │
│  └────────────────┘  └──────────────┘  └────────────────────┘   │
└══════════════════════════════════════════════════════════════════┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌─────────────────┐ ┌───────────────┐ ┌──────────────────┐
│ EXTERNAL APIs    │ │ OSINT SOURCES │ │  IP / GEO DATA   │
│                  │ │               │ │                   │
│ HIBP API         │ │ Google Custom  │ │ IP-API (free)    │
│ Gravatar API     │ │ Search Engine  │ │ ipapi.co         │
│ WHOIS XML API    │ │ (username via  │ │ ipwho.is         │
│ DNS (dnspython)  │ │  Google dorks) │ │                   │
│ SMTP (async)     │ │ GitHub API     │ │ ASN / Org data   │
│                   │ │ (username via  │ │ (via ipwhois)    │
│                   │ │  GitHub API)   │ │                   │
│                   │ │ Reddit API     │ │                   │
│                   │ │ (username via  │ │                   │
│                   │ │  JSON scrape)  │ │                   │
│                   │ │                 │ │                   │
│                   │ │ PublicRecord DB│ │                   │
└───────────────────┘ └───────────────┘ └────────────────────┘
```

---

## 4. Data Model (PostgreSQL)

```sql
-- ============================================
-- USERS & AUTH
-- ============================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    plan            VARCHAR(50) DEFAULT 'free'
                    CHECK (plan IN ('free', 'pro', 'enterprise')),
    api_key_hash    VARCHAR(255) UNIQUE,
    email_verified  BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ  -- soft delete
);

CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    key_prefix      VARCHAR(12) NOT NULL,         -- first 12 chars for lookup
    key_hash        VARCHAR(255) NOT NULL,         -- bcrypt of full key
    name            VARCHAR(255),                  -- user's label
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVESTIGATIONS
-- ============================================
CREATE TABLE investigations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id),  -- NULL for anonymous
    email_address       VARCHAR(255) NOT NULL,
    investigation_type  VARCHAR(50) DEFAULT 'email'
                        CHECK (type IN ('email', 'header', 'compare')),
    status              VARCHAR(50) DEFAULT 'processing'
                        CHECK (status IN ('processing', 'complete', 'failed')),
    risk_score          INT CHECK (risk_score >= 0 AND risk_score <= 100),
    verdict             VARCHAR(50)
                        CHECK (verdict IN ('safe','low_risk','moderate','high_risk','critical')),
    ai_summary          TEXT,
    raw_data            JSONB,           -- raw OSINT results per source
    report_data         JSONB,           -- structured report
    result_data         JSONB,           -- AI-generated + final formatted
    processing_ms       INT,
    resolved_ip         INET,
    resolved_domain     VARCHAR(255),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    expires_at          TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days',
    INDEX investigations_email (email_address),
    INDEX investigations_user (user_id, created_at DESC),
    INDEX investigations_status (status)
);

-- ============================================
-- FOOTPRINT TIMELINE
-- ============================================
CREATE TABLE timeline_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id    UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    event_date          DATE NOT NULL,              -- YYYY-MM-DD (first-day precision)
    event_year          INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM event_date)) STORED,
    source_type         VARCHAR(50) NOT NULL,       -- 'breach','github','forum','social','paste','darkweb'
    source_name         VARCHAR(255) NOT NULL,      -- e.g. "Adobe 2013 Breach", "GitHub commit"
    event_description   TEXT,
    event_significance  VARCHAR(50)                 -- 'first_seen','milestone','risk_change'
                        DEFAULT 'milestone',
    metadata            JSONB,                      -- URL, breach ID, username, etc.
    INDEX timeline_investigation (investigation_id, event_date)
);

-- ============================================
-- RELATIONSHIP GRAPH
-- ============================================
CREATE TABLE graph_nodes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id    UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    node_type           VARCHAR(50) NOT NULL
                        CHECK (node_type IN ('email','username','domain','social_profile','organization','ip','breach','url','password','phone')),
    label               VARCHAR(500) NOT NULL,      -- display name
    canonical_id        VARCHAR(500) NOT NULL,      -- e.g. "github:johndoe" or "email:john@gmail.com"
    metadata            JSONB,                      -- platform, URL, avatar, etc.
    trust_weight        INT DEFAULT 50,             -- how reliable is this link? 0-100
    discovered_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (investigation_id, canonical_id)
);

CREATE TABLE graph_edges (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id    UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    source_node_id      UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    target_node_id      UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    edge_type           VARCHAR(50) NOT NULL
                        CHECK (edge_type IN ('same_password','same_username','domain_match','email_match','associated_with','registered_on','mentioned_on','ip_owner','breach_includes')),
    metadata            JSONB,
    discovered_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RISK ALERTS (per investigation)
-- ============================================
CREATE TABLE risk_alerts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id    UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    alert_type          VARCHAR(100) NOT NULL,
    severity            VARCHAR(20) NOT NULL
                        CHECK (severity IN ('info','low','medium','high','critical')),
    title               VARCHAR(255) NOT NULL,
    description         TEXT NOT NULL,
    recommendation      TEXT,
    evidence_data       JSONB,                      -- supporting data, source refs
    dismissed           BOOLEAN DEFAULT FALSE,
    dismissed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMAIL COMPARISONS
-- ============================================
CREATE TABLE comparisons (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id),
    email_a             VARCHAR(255) NOT NULL,
    email_b             VARCHAR(255) NOT NULL,
    inv_a_id            UUID REFERENCES investigations(id),
    inv_b_id            UUID REFERENCES investigations(id),
    comparison_data     JSONB NOT NULL,             -- full diff data
    verdict             TEXT,
    ai_summary          TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INTELLIGENCE CACHE
-- ============================================
CREATE TABLE breach_cache (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255) UNIQUE NOT NULL,
    domain              VARCHAR(255),
    breach_date         DATE,
    pwn_count           BIGINT,
    data_classes        TEXT[],
    fabricated          BOOLEAN DEFAULT FALSE,
    verified            BOOLEAN DEFAULT FALSE,
    retired             BOOLEAN DEFAULT FALSE,
    sensitive           BOOLEAN DEFAULT FALSE,
    description         TEXT,
    last_synced_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE domain_intel_cache (
    id                  SERIAL PRIMARY KEY,
    domain              VARCHAR(255) UNIQUE NOT NULL,
    domain_age_days     INT,
    registrar           VARCHAR(255),
    registrar_country   VARCHAR(5),
    whois_privacy       BOOLEAN,
    spf_record          TEXT,
    dkim_records        TEXT[],
    dmarc_policy        VARCHAR(50),
    dmarc_report_to     VARCHAR(255),
    mx_records          TEXT[],
    a_records           TEXT[],
    blacklist_hits      INT DEFAULT 0,
    blacklist_details   JSONB,
    disposable_flag     BOOLEAN DEFAULT FALSE,
    typo_squat_distance INT DEFAULT 0,             -- Levenshtein to nearest brand
    last_checked_at     TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ip_intel_cache (
    id                  SERIAL PRIMARY KEY,
    ip_address          INET UNIQUE NOT NULL,
    country             VARCHAR(2),
    country_name        VARCHAR(100),
    region              VARCHAR(100),
    city                VARCHAR(100),
    isp                 VARCHAR(255),
    org                 VARCHAR(255),
    asn                 VARCHAR(20),
    asn_org             VARCHAR(255),
    proxy               BOOLEAN DEFAULT FALSE,
    vpn                 BOOLEAN DEFAULT FALSE,
    tor                 BOOLEAN DEFAULT FALSE,
    hosting             BOOLEAN DEFAULT FALSE,
    mobile              BOOLEAN DEFAULT FALSE,
    last_checked_at     TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Risk Scoring Engine (Complete Model)

### 5.1 Full Scoring Breakdown

```
┌──────────────────────────────────────────────────────────────────┐
│                  THREATSCOPE RISK SCORING v2.0                    │
├──────────────┬──────────────────────────────────┬────────┬────────┤
│   Category   │          Factor                  │ Weight │ Score  │
├──────────────┼──────────────────────────────────┼────────┼────────┤
│ BREACH       │ # of breaches found              │   15%  │ 0-15   │
│  EXPOSURE    │ Breach severity (data classes)   │   10%  │ 0-10   │
│   (25%)      │ Recency of most recent breach    │        │        │
│              │ Password or personal data?       │        │        │
├──────────────┼──────────────────────────────────┼────────┼────────┤
│ DOMAIN       │ Domain age (older = better)      │   10%  │ 0-10   │
│  TRUST       │ Blacklist hits                   │    5%  │ 0-5    │
│  (20%)       │ SPF/DKIM/DMARC configured        │    5%  │ 0-5    │
│              │ WHOIS transparency               │        │        │
├──────────────┼──────────────────────────────────┼────────┼────────┤
│ SENDER       │ IP geo alignment with domain     │    5%  │ 0-5    │
│  INTEGRITY   │ Mail path consistency            │    5%  │ 0-5    │
│  (15%)       │ SPF/DKIM/DMARC pass/fail         │    5%  │ 0-5    │
│              │ Return-Path ≠ From (spoofing?)   │        │        │
├──────────────┼──────────────────────────────────┼────────┼────────┤
│ DISPOSABLE/  │ Is disposable/temp mail?         │   10%  │ 0-10   │
│  ROLE-BASED  │ Is role-based (admin@)?          │        │        │
│   (10%)      │ MX present but odd configuration? │        │        │
├──────────────┼──────────────────────────────────┼────────┼────────┤
│ FOOTPRINT    │ Timeline depth (years)           │    5%  │ 0-5    │
│  DEPTH       │ Source diversity (# sources)     │    5%  │ 0-5    │
│  (10%)       │ Trusted source presence (GitHub, │        │        │
│              │  academic, government)           │        │        │
├──────────────┼──────────────────────────────────┼────────┼────────┤
│ CONNECTIONS  │ Suspicious graph relationships   │    5%  │ 0-5    │
│  (5%)        │ Typo-squat detection             │    5%  │ 0-5    │
│              │ VPN/Proxy/Tor exit node          │        │        │
├──────────────┼──────────────────────────────────┼────────┼────────┤
│   TOTAL      │                                  │  100%  │ 0-100  │
└──────────────┴──────────────────────────────────┴────────┴────────┘

Score → Verdict
  0-20   : 🟢 TRUSTED        "Strong indicators. Low concern."
 21-40   : 🟡 LOW RISK       "Minor signals detected. Worth awareness."
 41-60   : 🟡 MODERATE RISK  "Several risk factors. Exercise caution."
 61-80   : 🟠 HIGH RISK      "Multiple red flags. Do not trust blindly."
 81-100  : 🔴 CRITICAL        "Extremely suspicious. Treat as fraudulent."
```

### 5.2 Scoring Logic (Pseudocode)

```python
class RiskScorer:
    WEIGHTS = {
        'breach_exposure': 25,
        'domain_trust': 20,
        'sender_integrity': 15,
        'disposable_role': 10,
        'footprint_depth': 10,
        'suspicious_conn': 10,  # typo-squat, vpn, graph anomalies
    }

    def calculate(self, signals: dict) -> RiskScore:
        # --- Breach Exposure (25 points) ---
        breach_score = 0
        total_breaches = signals['breach_count']
        if total_breaches == 0:
            breach_score = 0
        elif total_breaches <= 2:
            breach_score = 10 + (total_breaches * 3)
        elif total_breaches <= 5:
            breach_score = 20 + ((total_breaches - 2) * 2)
        else:
            breach_score = 25  # max

        if signals.get('breach_has_password'):
            breach_score = min(25, breach_score + 5)
        if signals.get('breach_has_pii'):
            breach_score = min(25, breach_score + 5)

        # --- Domain Trust (20 points) ---
        domain_score = 0
        age_days = signals.get('domain_age_days', 0)
        if age_days is not None:
            if age_days > 365 * 5:   domain_score += 0    # 5+ years : trust
            elif age_days > 365 * 2: domain_score += 3    # 2+ years
            elif age_days > 365:     domain_score += 7    # 1+ years
            elif age_days > 90:      domain_score += 12   # 3+ months
            else:                    domain_score += 15   # < 3 months

        domain_score += min(5, signals.get('blacklist_hits', 0) * 2)  # max 5

        if not signals.get('spf_configured'):
            domain_score += 4
        if not signals.get('dkim_configured'):
            domain_score += 3
        if not signals.get('dmarc_configured'):
            domain_score += 3
        # Max 20

        # --- Sender Integrity (15 points) ---
        integrity_score = 0
        if signals.get('spf_fail'):  integrity_score += 5
        if signals.get('dkim_fail'): integrity_score += 5
        if signals.get('dmarc_fail'): integrity_score += 5
        if signals.get('return_path_mismatch'): integrity_score += 3
        if signals.get('ip_domain_mismatch'): integrity_score += 3
        # Max 15

        # --- Disposable / Role-based (10 points) ---
        disposable_score = 0
        if signals.get('is_disposable'):
            disposable_score = 10  # MAX — instantly suspicious
        elif signals.get('is_role_based'):
            disposable_score = 4
        # Max 10

        # --- Footprint Depth (10 points) ---
        footprint_score = 0
        years_found = signals.get('timeline_span_years', 0)
        if years_found == 0:  footprint_score = 10        # no footprint = suspicious
        elif years_found >= 5: footprint_score = 0
        else: footprint_score = max(0, 10 - (years_found * 2))

        source_count = signals.get('source_count', 0)
        if source_count >= 5:
            footprint_score = max(0, footprint_score - 3)
        elif source_count == 0:
            footprint_score = min(10, footprint_score + 3)

        # --- Suspicious Connections (10 points) ---
        conn_score = 0
        if signals.get('typo_squat_detected'):
            conn_score = 10  # MAX
        if signals.get('sending_ip_is_vpn_tor'):
            conn_score = max(conn_score, 8)
        if signals.get('graph_anomaly_detected'):
            conn_score = max(conn_score, 6)
        if signals.get('smtp_vrfy_exists') is False:
            conn_score = max(conn_score, 5)
        
        # --- Composite ---
        total = (
            breach_score * (self.WEIGHTS['breach_exposure'] / 100) +
            domain_score * (self.WEIGHTS['domain_trust'] / 100) +
            integrity_score * (self.WEIGHTS['sender_integrity'] / 100) +
            disposable_score * (self.WEIGHTS['disposable_role'] / 100) +
            footprint_score * (self.WEIGHTS['footprint_depth'] / 100) +
            conn_score * (self.WEIGHTS['suspicious_conn'] / 100)
        )

        return RiskScore(
            total=round(min(100, total)),
            breakdown={
                'breach_exposure': breach_score,
                'domain_trust': domain_score,
                'sender_integrity': integrity_score,
                'disposable_role': disposable_score,
                'footprint_depth': footprint_score,
                'suspicious_connections': conn_score,
            },
            verdict=self._verdict(total),
            signals=signals
        )
```

---

## 6. AI Summary System

### 6.1 Architecture

```
User submits email
       │
       ▼
[Analysis Engine runs all OSINT] → produces structured JSON results
       │
       ▼
[AI Service receives context: raw results + user question]
       │
       ├── Generates AI Summary (Claude API)
       │   - Reads full result JSON
       │   - Writes narrative: "This email address appeared in X breaches..."
       │   - Follows strict template per verdict level
       │
       ├── Generates Comparison Summary (if compare mode)
       │   - Analyzes delta between two emails
       │   - Produces bullet highlights: "Address A is significantly safer"
       │
       └── Generates Alert Explanations
           - Each alert gets a human-readable explanation with sources
```

### 6.2 Prompt Template (Example)

```text
You are an email security analyst. Here are investigation results for {email}:

## Findings
- Breaches: {breach_count} ({names})
- Domain age: {domain_age}
- SPF: {spf_status} | DKIM: {dkim} | DMARC: {dmarc}
- Disposable: {disposable}
- Blacklists: {blacklist_count}
- Timeline: {timeline_summary}
- Graph: {relationships_summary}
- Risk Score: {score}/100

Write a concise security report summary (3-4 paragraphs) that:
1. Opens with the overall assessment and verdict
2. Highlights the most significant risk factors with context
3. Notes any positive indicators
4. Gives 2-3 actionable recommendations for the user

Use plain language. Be specific about what each finding means.
```

### 6.3 Why AI Fits Perfectly Here

- Raw OSINT data is meaningless without context to a non-expert
- AI can correlate signals across categories ("newly registered domain + high breach count = probable phishing setup")
- AI generates comparison summaries that feel human-written
- This is the feature that differentiates you from every other OSINT tool

---

## 7. Digital Footprint Timeline

### 7.1 Data Model (Already in Schema Above)

```
timeline_events table tracks:

┌──────┬───────────────┬────────────────┬───────────────────────────┐
│ Year │ Source Type   │ Source Name    │ Description                │
├──────┼───────────────┼────────────────┼───────────────────────────┤
│ 2016 │ social        │ Twitter        │ First Twitter account found│
│ 2017 │ github        │ GitHub         │ First commit on GitHub     │
│ 2018 │ forum         │ StackOverflow  │ Profile + posts            │
│ 2019 │ paste         │ Pastebin       │ Pastes found via email hash│
│ 2020 │ breach        │ Collection #1   │ 1 breach (1.2B creds)      │
│ 2021 │ breach        │ Facebook 2021   │ Over 533M records          │
│ 2022 │ social        │ LinkedIn       │ Professional profile found │
│ 2023 │ darkweb       │ Breach forum   │ Mentioned in hacker forum  │
└──────┴───────────────┴────────────────┴───────────────────────────┘
```

### 7.2 Frontend Timeline Component

```
Interactive Timeline
┌──────────────────────────────────────────────────┐
│  2016  ────●  Twitter account created            │
│  2017  ────●  GitHub activity begun              │
│  2018  ────●  StackOverflow profile found        │
│  2019  ────●  ⚠ Pastebin pastes discovered       │  ← highlighted
│  2020  ────●  🔴 BREACH: Collection #1            │  ← critical
│  2021  ────●  🔴 BREACH: Facebook 2021            │  ← critical
│  2022  ────●  LinkedIn profile found              │
│  2023  ────●  ⚠ Dark web mention                  │  ← warning
│          ▲                                          │
│          └── Scroll to zoom / filter by type       │
└──────────────────────────────────────────────────┘
    ┌──────────┐┌──────────┐
    │Filter: All││Filter: ⚠│   ← category filter chips
    └──────────┘└──────────┘
```

### 7.3 Timeline Intelligence Outputs

- **Span calculation:** `2023 - 2016 = 7 years of public history`
- **Activity velocity:** Average events per year
- **Milestone density:** Are events clustered (sudden amplification)?
- **First breach year → breach frequency trajectory**
- **Comparison timeline overlaid** (compare mode)

---

## 8. Relationship Graph

### 8.1 Graph Data Flow

```
OSINT Sources
    │
    ├── Username enumeration → same_username edges
    │   ├── GitHub API (search by email)
    │   ├── Google dorks ("intext:username")
    │   └── Public code search
    │
    ├── Breach data → same_password + email_match edges
    │   └── HIBP paste monitor + breach datasets
    │
    ├── Domain analysis → domain_match edges
    │   └── MX records verify domain ownership
    │
    ├── Social footprint → associated_with edges
    │   └── GitHub → Twitter → Reddit cross-links
    │
    └── IP intelligence → ip_owner edges
        └── Reverse DNS and ASN data
```

### 8.2 Node Types & Edge Types

```javascript
// Nodes
NODE_TYPES = {
  email:           { color: '#3B82F6', icon: '@' },
  username:        { color: '#8B5CF6', icon: '👤' },
  domain:          { color: '#10B981', icon: '🌐' },
  social_profile:  { color: '#EC4899', icon: '📱' },
  organization:    { color: '#F59E0B', icon: '🏢' },
  ip:               { color: '#EF4444', icon: '📍' },
  breach:            { color: '#DC2626', icon: '🔓' },
  url:               { color: '#06B6D4', icon: '🔗' },
  password_breach:   { color: '#991B1B', icon: '🔑' },
}

// Edges
EDGE_TYPES = {
  same_password:    { label: 'Shared password',  strength: 'critical', dashed: false },
  same_username:    { label: 'Same username',     strength: 'high',     dashed: false },
  domain_match:     { label: 'Shared domain',     strength: 'medium',   dashed: false },
  email_match:      { label: 'Shared email',      strength: 'high',     dashed: false },
  associated_with:  { label: 'Associated with',   strength: 'low',      dashed: true  },
  registered_on:    { label: 'Registered on',     strength: 'medium',   dashed: false },
  mentioned_on:     { label: 'Mentioned on',      strength: 'low',      dashed: true  },
  ip_owner:         { label: 'IP belongs to',     strength: 'medium',   dashed: false },
  breach_includes:  { label: 'Found in breach',   strength: 'critical', dashed: false },
}
```

### 8.3 Frontend Visualization (D3.js / React Flow)

- Force-directed layout (d3-force)
- Zoom, pan, node drag
- Click node → expand to show linked nodes
- Hover → tooltip with metadata
- Filter by node type / edge strength
- Color by risk signal
- Edge thickness = relationship strength
- "Same password" edges highlighted in red (highest severity connection)

---

## 9. Side-by-Side Comparison System

### 9.1 Comparison Flow

```
User enters: alice@example.com + bob@suspicious.com
              │
              ▼
    ┌─────────────────────────┐
    │  Run full scan on both  │
    │  (parallel, same engine)│
    └─────────────────────────┘
              │
              ▼
    ┌────────────────────────────────────────┐
    │         comparison_data JSON            │
    │  {                                     │
    │    "email_a": { ...full investigation },│
    │    "email_b": { ...full investigation },│
    │    "diffs": {                           │
    │      "risk_score": {                     │
    │        "a": 15, "b": 72, "winner": "a"  │
    │      },                                  │
    │      "breaches": { "a": 0, "b": 5 },    │
    │      "domain_age": { "a": 1825, "b": 23 },│
    │      "spf_configured": { "a": true,     │
    │                           "b": false }   │
    │    },                                    │
    │    "shared": {                           │
    │      "domain": "example.com"             │
    │    }                                     │
    │  }                                      │
    └────────────────────────────────────────┘
              │
              ▼
    ┌────────────────────────────────────────┐
    │  AI Comparison Summary                  │
    │  ─────────────────────────────          │
    │  "alice@example.com is significantly    │
    │   safer. It has no breach history vs     │
    │   bob@suspicious.com's 5 breaches.      │
    │   The domain for bob is only 23 days    │
    │   old and lacks SPF records. Based on   │
    │   the redacted risk score difference of  │
    │   57 points, recommend using alice."    │
    └────────────────────────────────────────┘
              │
              ▼
    ┌────────────────────────────────────────┐
    │  Comparison View (React)                │
    │  ┌─────────────┬─────────────┐         │
    │  │ alice@...   │ bob@...     │         │
    │  │ Risk: 15 🟢 │ Risk: 72 🔴 │ ← diff │
    │  │ Breaches: 0 │ Breaches: 5 │ ← diff │
    │  │ Age: 5yr    │ Age: 23 days│ ← diff │
    │  │ SPF: ✅    │ SPF: ❌    │ ← diff │
    │  │ Domain: ex. │ Domain: susp│         │
    │  │ ...         │ ...         │         │
    │  └─────────────┴─────────────┘         │
    │                                         │
    │  [ AI-Powered Comparison Summary ]     │
    └────────────────────────────────────────┘
```

### 9.2 Comparison Data Model

```python
@dataclass
class ComparisonResult:
    inv_a: Investigation
    inv_b: Investigation
    diffs: dict[str, DiffValue]        # per-field comparison
    shared: dict[str, list]             # shared indicators
    verdict: str                         # 'a_safer' | 'b_safer' | 'equivalent'
    verdict_reasoning: str
    ai_summary: str
    
@dataclass
class DiffValue:
    a_value: Any
    b_value: Any
    a_indicator: str    # 'good' | 'warning' | 'danger'
    b_indicator: str
    winner: str         # 'a' | 'b' | 'neutral'
    significance: str   # 'minor' | 'moderate' | 'major'
```

---

## 10. Developer API

### 10.1 Endpoints

```yaml
# API Authentication: Bearer <API_KEY>

# Investigation
POST   /api/v1/lookup/email         { "email": "user@domain.com" }
GET    /api/v1/lookup/{id}          # Poll for results
POST   /api/v1/lookup/headers       { "raw_headers": "..." }
POST   /api/v1/lookup/bulk          { "emails": ["a@x.com", "b@x.com"] }  # Enterprise

# Comparison
POST   /api/v1/compare              { "email_a": "...", "email_b": "..." }
GET    /api/v1/compare/{id}

# Intelligence (read-only cache queries)
GET    /api/v1/domain/{domain}
GET    /api/v1/ip/{ip}
GET    /api/v1/breach/{name}

# Developer Management
GET    /api/v1/developer/usage      # Rate limit usage stats
GET    /api/v1/developer/keys       # API key management
POST   /api/v1/developer/keys       # Create new key
POST   /api/v1/developer/webhooks   # Register webhook URL

# Async / Webhook mode
POST   /api/v1/lookup/async         # Returns job_id immediately
# → Webhook fires when results ready
```

### 10.2 Python SDK (Starter)

```python
import threatscope

client = threatscope.Client(api_key="es_live_...")

# Single lookup (async, returns job_id)
job = client.lookup.email("user@example.com")

# Wait for result
result = job.wait(timeout=30)

print(f"Risk Score: {result.risk_score}/100")
print(f"Verdict: {result.verdict}")
print(f"Breaches: {result.breach_count}")
print(result.ai_summary)  # AI narrative
```

### 10.3 Rate Tiers

| Plan | Price | Daily Limit | Features |
|------|-------|-------------|----------|
| Free | $0 | 10 lookups | Basic report, web only |
| Developer | $29/mo | 1,000/day | API access, bulk (100), async |
| Pro | $99/mo | 10,000/day | Full API, comparison, webhooks, priority |
| Enterprise | Custom | Unlimited | SLA, dedicated infra, white-label |

---

## 11. Tech Stack (Final)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14 + React + Tailwind CSS | SEO landing, fast SPA for dashboard |
| **UI Components** | shadcn/ui + Radix | High-quality accessible components |
| **Graph Viz** | D3.js / React Flow / Sigma.js | Timeline + relationship graph |
| **Backend** | FastAPI (Python 3.12) | Async I/O, Pydantic, auto-docs |
| **Database** | PostgreSQL 16 | JSONB for flexible OSINT, mature |
| **Cache** | Redis 7 | Rate limiting, OSINT result caching |
| **Queue** | BackgroundTasks / Celery | Async report processing |
| **Auth** | JWT + OAuth (Google, GitHub) | Stateless, easy login |
| **AI** | Anthropic Claude API | Report summaries, comparison analysis |
| **PDF** | WeasyPrint / Puppeteer | HTML → PDF export |
| **Storage** | S3-compatible (or local fs / Cloudflare R2) | Report assets, exports |
| **Deployment** | Docker Compose → VPS or Fly.io | Start simple, scale when needed |
| **Monitoring** | Sentry + basic logging | Error tracking, performance |

---

## 12. Module Structure

```
threatscope/
├── modules/
│   ├── email_analyzer/
│   │   ├── header_parser/       # Parse raw email headers
│   │   │   ├── parser.py        # Extract Received, X-Originating-IP, etc.
│   │   │   ├── extractors.py    # IP extraction, HELO, mail path
│   │   │   └── validators.py    # SPF/DKIM/DMARC parsing
│   │   ├── osint_engine/        # All external lookups
│   │   │   ├── hibp_client.py   # HaveIBeenPwned integration
│   │   │   ├── dns_resolver.py  # SPF, DKIM, DMARC, MX lookups
│   │   │   ├── whois_client.py  # Domain age, registrar
│   │   │   ├── smtp_verify.py   # Mailbox existence check
│   │   │   ├── ip_geo.py        # IP geolocation
│   │   │   ├── blacklist_check.py # RBL checks
│   │   │   ├── gravatar_client.py # Avatar / profile hash
│   │   │   ├── username_enum.py # GitHub, Twitter, Reddit
│   │   │   └── google_dorker.py # Public search via dorks
│   │   ├── risk_scorer.py       # Scoring engine (Section 5)
│   │   ├── alert_engine.py      # Generate risk alerts (Section 2.5)
│   │   ├── timeline_builder.py  # Build timeline from findings
│   │   ├── graph_builder.py     # Build relationship graph
│   │   └── signals.py           # Signal aggregation (pre-score)
│   │
│   ├── report_generator/
│   │   ├── engine.py            # Orchestrate report assembly
│   │   ├── sections/
│   │   │   ├── overview.py      # Verdict banner + risk meter
│   │   │   ├── ai_summary.py    # AI narrative section
│   │   │   ├── breach_section.py
│   │   │   ├── domain_section.py
│   │   │   ├── header_section.py
│   │   │   ├── timeline_section.py
│   │   │   ├── graph_section.py
│   │   │   ├── alerts_section.py
│   │   │   └── recommendations.py
│   │   ├── pdf_export.py        # HTML → PDF
│   │   ├── comparison_layout.py # Side-by-side report layout
│   │   └── templates/
│   │       ├── report.html      # Main report template
│   │       ├── comparison.html  # Comparison layout
│   │       └── components/      # Reusable report components
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.py          # Register, login, refresh
│   │   │   ├── investigate.py   # Email + header lookups
│   │   │   ├── compare.py       # Side-by-side
│   │   │   ├── history.py       # Saved investigations
│   │   │   ├── developer.py     # API keys, usage, webhooks
│   │   │   └── health.py        # Health check
│   │   ├── schemas/
│   │   │   ├── request.py       # Request DTOs
│   │   │   └── response.py      # Response DTOs
│   │   └── middleware/
│   │       ├── auth.py          # JWT + OAuth
│   │       ├── rate_limit.py    # Per-user + per-IP limits
│   │       ├── cache.py         # Redis caching middleware
│   │       └── logging.py       # Request logging
│   │
│   └── shared/
│       ├── cache.py             # Redis helpers
│       ├── config.py            # Pydantic Settings
│       ├── database.py          # SQLAlchemy engine + session
│       ├── logging.py           # Structured logging
│       └── ai_client.py         # Claude API wrapper
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── investigate/
│   │   │   ├── page.tsx         # Search bar + results
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Full report view
│   │   ├── compare/
│   │   │   └── page.tsx         # Comparison (dual input)
│   │   ├── history/
│   │   │   └── page.tsx         # User's saved items
│   │   ├── api-docs/
│   │   │   └── page.tsx         # Developer portal
│   │   └── layout.tsx           # Root layout
│   ├── components/
│   │   ├── ui/                  # shadcn components
│   │   ├── report/
│   │   │   ├── ReportViewer.tsx
│   │   │   ├── RiskMeter.tsx
│   │   │   ├── AlertCards.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── RelationshipGraph.tsx
│   │   │   ├── BreachList.tsx
│   │   │   └── AISummary.tsx
│   │   ├── compare/
│   │   │   ├── CompareView.tsx
│   │   │   └── DiffHighlight.tsx
│   │   ├── search/
│   │   │   ├── SearchBar.tsx
│   │   │   └── QuickResult.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── lib/
│   │   ├── api.ts               # Fetch helpers
│   │   ├── auth.ts              # Auth state management
│   │   └── utils.ts
│   └── public/
│
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── pyproject.toml              # Backend deps
├── package.json                # Frontend deps
└── README.md
```

---

## 13. Build Phases (Updated)

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **1: Engine** | 2-3 weeks | Core analysis engine. All OSINT integrations. CLI output. Risk scorer with your full model. Alert engine. |
| **2: Backend API** | 2 weeks | FastAPI app. Auth. Investigation CRUD. Basic HTML report endpoint. Database setup. |
| **3: Frontend MVP** | 3 weeks | Next.js app. Search → results page. Report viewer with all sections (timeline, graph, alerts, AI summary). User accounts. History. |
| **4: Comparison** | 2 weeks | Side-by-side view. Comparison engine. AI comparison summary. |
| **5: Developer API** | 2 weeks | API key system. Rate limiting tiers. SDK. API docs page. Webhook support. |
| **6: Polish** | 2 weeks | PDF export. Dark mode. Mobile responsive. Performance (caching, streaming). Error handling. |

**Total to production-ready: ~13-14 weeks**

---

## 14. Revenue Model

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 5 lookups/day, web only, basic report |
| Personal | $9/mo | Unlimited lookups, history, PDF export, dark mode |
| Professional | $29/mo | + Comparison tool, API access, bulk lookup |
| Team/Enterprise | $99+/mo | + Team seats, white-label, SLA, dedicated |

**Estimated unit economics (at scale):**
- OSINT API calls: mostly free (DNS, open APIs, cached)
- Claude API: ~$0.01-0.03 per report summary
- HIBP: free for non-commercial
- Infrastructure: ~$50-200/month for first 1K users
- Good margins from day one

---

## 15. Security & Legal Considerations

| Concern | Mitigation |
|---------|-----------|
| Data privacy (GDPR) | Don't store emails longer than 90 days. Self-serve deletion. No third-party sharing of PII. |
| HIBP TOS compliance | Use only for non-commercial/personal security. Cache results (don't hit API repeatedly for same data). |
| Abuse prevention | CAPTCHA for free tier (Google reCAPTCHA v3). Strict rate limits. IP-based throttling. |
| API key leakage | Hash stored keys (bcrypt). Prefix-only display. Rotate support. |
| AI hallucination | Ground AI output in structured data. Never let AI invent findings. Add source citations. |
| Terms of Service | Clear TOS: "for legitimate security and investigative purposes only." Prohibit harassment, stalking. |

---

## 16. What Makes This Special

1. **Narrative over data** — Every other OSINT tool dumps raw data. You give context, a story, a verdict.
2. **Timeline** — No competitor shows you the historical footprint of an identity.
3. **Relationship graph** — Makes invisible connections visible.
4. **Side-by-side comparison** — Unique to your platform. Fraud investigators love this.
5. **AI-powered intelligence** — Turns 50 data points into a 3-paragraph security assessment a non-technical user understands.
6. **Developer API** — Opens B2B revenue channel (security tools, fraud platforms, compliance software).

This isn't an OSINT tool. It's an **email security intelligence platform**. The difference matters.

---

**Ready to start building when you are.** Phase 1 first, or any specific module you want to drill into.
