# ThreatScope

> Email intelligence & OSINT investigation toolkit with interactive graph visualization

ThreatScope investigates any email address and delivers a contextual, actionable security report — evaluating breach exposure, trustworthiness, risk signals, and digital footprint — in seconds.

## Features

- **Email Address Lookup** — Full OSINT scan on any email address
- **Email Header Analysis** — Paste raw headers, get sending intelligence (IP, mail path, spoofing indicators)
- **Domain Intelligence** — SPF/DKIM/DMARC validation, WHOIS lookup, blacklists, age, registrar
- **AI-Powered Summaries** — Contextual security report with actionable recommendations
- **Digital Footprint Timeline** — Chronological map of when the identity was first observed publicly
- **Relationship Graph** — Interactive force-directed graph showing connections between usernames, domains, and profiles
- **Risk Scoring Engine** — 0-100 risk score with detailed breakdown across 6 categories
- **Side-by-Side Comparison** — Compare two email addresses across all dimensions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + Vite + Tailwind CSS |
| **Desktop** | Tauri v2 |
| **Visualization** | Force Graph, ReactFlow, Three.js |
| **Backend** | Python (FastAPI planned) |
| **OSINT** | dnspython, httpx, pydantic |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- Rust (for Tauri builds)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ThreatScope.git
cd ThreatScope

# Install frontend dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

### Development

```bash
# Start Vite dev server
npm run dev

# Start with Tauri (desktop app)
npm run tauri dev
```

### Build

```bash
# Build frontend
npm run build

# Build Tauri desktop app
npm run tauri build
```

## Project Structure

```
ThreatScope/
├── src/
│   ├── components/      # React components
│   ├── api/             # API integration
│   ├── App.tsx          # Main app component
│   └── main.jsx         # Entry point
├── core/                # Python OSINT engine
├── src-tauri/           # Tauri configuration
├── tests/               # Test files
├── ARCHITECTURE.md      # Detailed architecture docs
└── package.json
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete system architecture, data models, and risk scoring engine documentation.

## Risk Score Categories

| Score | Verdict | Description |
|-------|---------|-------------|
| 0-20 | 🟢 Trusted | Strong indicators, low concern |
| 21-40 | 🟡 Low Risk | Minor signals detected |
| 41-60 | 🟡 Moderate Risk | Several risk factors |
| 61-80 | 🟠 High Risk | Multiple red flags |
| 81-100 | 🔴 Critical | Extremely suspicious |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.
