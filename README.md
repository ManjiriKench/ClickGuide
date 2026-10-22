# ClickGuide

> **Your goal. Verified actions. You stay in control.**

ClickGuide is an autonomous yet verifiable browser automation assistant built for complex and dynamic web interfaces. Instead of fragile coordinate clicking or unchecked execution, ClickGuide interprets natural-language intent, inspects live DOM and accessibility trees, executes through controlled browser sandboxes, and verifies postcondition states against actual observed values to issue inspectable execution receipts.

---

## Architecture Overview

```
               ┌────────────────────────────────────────────────────────┐
               │              ClickGuide React Dashboard                │
               │  - Task Input        - Guided / Auto Mode              │
               │  - Viewport Preview  - Proof-Carrying Verification     │
               │  - Rewind Controls   - FastGuard Telemetry             │
               └───────────────────────────┬────────────────────────────┘
                                           │ HTTP / REST
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │                  Node.js / Express                     │
               │                                                        │
               │  ┌───────────────────────┐  ┌───────────────────────┐  │
               │  │  Browser Controller   │  │    Page Inspector     │  │
               │  │  (Playwright Engine)  │  │ (DOM/Accessibility)   │  │
               │  └───────────┬───────────┘  └───────────┬───────────┘  │
               └──────────────┼──────────────────────────┼──────────────┘
                              │                          │
                              ▼                          ▼
               ┌────────────────────────────────────────────────────────┐
               │            Isolated Chromium Sandbox                   │
               │  - Dedicated temporary browser profile                 │
               │  - Origin-restricted navigation guard                  │
               │                                                        │
               │  ┌──────────────────────────────────────────────────┐  │
               │  │ Local Administrative Demo Application            │  │
               │  │ - Settings Form (Toggles, Selects, Persist)      │  │
               │  │ - Timed Challenge Arena                          │  │
               │  └──────────────────────────────────────────────────┘  │
               └────────────────────────────────────────────────────────┘
```

---

## Core Differentiators

1. **Visual-DOM Grounding**: Elements are identified through structural tags, accessibility roles, and attributes cross-referenced with live viewport rendering.
2. **Proof-Carrying Execution**: Every interaction emits an auditable receipt comparing intended vs. observed state directly from the DOM rather than inferring success from unhandled exceptions.
3. **FastGuard**: Safety-first architecture enforcing strict origin sandboxing, schema-validated parameters, and preventing unauthorized or destructive browser operations.
4. **Verified Rewind**: Reversible settings modifications retain prior states and can be safely rolled back with verified restoration checks.

---

## Project Structure

```
ClickGuide/
├── backend/
│   ├── src/
│   │   ├── browser/
│   │   │   ├── controller.ts    # Playwright browser lifecycle & action execution
│   │   │   └── inspector.ts     # Interactive DOM & accessibility tree extraction
│   │   ├── demo-site/public/    # Local administrative application & challenge page
│   │   ├── routes/
│   │   │   ├── browser.ts       # Browser control & inspection API endpoints
│   │   │   └── demo.ts          # Demo static asset hosting & persistence API
│   │   ├── types/               # Core data structures and telemetry types
│   │   ├── config.ts            # Environment and security configuration
│   │   └── server.ts            # Express server initialization
│   └── test/
│       └── foundation.test.ts   # Automated browser control & verification tests
├── frontend/
│   ├── src/
│   │   ├── components/          # Dashboard panels (Preview, Timeline, Verification, etc.)
│   │   ├── services/api.ts      # REST API client
│   │   ├── App.tsx              # Main orchestrator
│   │   └── index.css            # Custom design system
│   └── vite.config.ts           # Vite proxy and build configuration
└── package.json                 # Monorepo workspaces configuration
```

---

## Security Model

- **Dedicated Sandbox Profile**: Browser contexts run strictly in an isolated `.browser-profile` sandbox directory; personal Chrome profiles or credentials are never accessed.
- **Strict Origin Whitelist**: Automation is strictly bound to allowed origins (`http://localhost:*` and `http://127.0.0.1:*`).
- **No Unsafe Execution**: Arbitrary remote code or untrusted scripts are disallowed; all actions pass through validated typed schemas.

---

## Getting Started

### Prerequisites
- Node.js (v20+)
- npm (v10+)

### Installation

```bash
# Clone the repository
git clone https://github.com/ManjiriKench/ClickGuide.git
cd ClickGuide

# Install dependencies across all workspaces
npm install

# Install Playwright browser binaries
npx playwright install chromium
```

### Running Locally

To run backend and frontend concurrently:

```bash
npm run dev
```

Or run each service individually:

```bash
# Backend server (runs on http://127.0.0.1:5000)
npm run dev:backend

# Frontend dashboard (runs on http://localhost:3000)
npm run dev:frontend
```

Once running, navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Verification

Run the automated integration suite:

```bash
npm test
```

This validates:
- Health check and local demo site availability
- Chromium launch and viewport screenshot streaming
- Page element discovery and accessibility extraction
- Programmatic form interactions and DOM postcondition checks
- Clean browser session shutdown
