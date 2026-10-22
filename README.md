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

---

## Core Differentiators & Pipeline

1. **Gemma 4 Task Planning**: Generates structured, deterministic browser action plans using Google's `gemma-4-26b-a4b-it` model with strict Zod schema validation.
2. **Context Compiler**: Reduces model input tokens by up to **74.2%** without loss of task-critical context. Features three modes:
   - *Full Context*: Clean structural extraction omitting non-semantic styles/scripts.
   - *Compressed Context*: Deterministic relevance ranking based on accessible names, roles, and nearby text.
   - *Incremental Context*: Snapshot delta tracking with automatic plan cache invalidation on DOM change.
3. **FastGuard & Verified Execution**: Turn model actions into verified browser interactions:
   - Origin allowlist enforcement (`localhost`, `127.0.0.1`).
   - Unique element target resolution and stale selector rejection.
   - Precondition checks and injection rejection (blocks arbitrary scripts/harmful payloads).
   - Postcondition verification using actual DOM state as the single source of truth.
4. **Guided Mode & Visual-DOM Grounding**: Non-blocking in-browser highlight overlays and step-by-step guidance, with multimodal visual fallback for dynamic interfaces.
5. **Action Ledger & Proof-Carrying Rewind**: Every action emits an immutable execution receipt. Reversible operations (checkboxes, dropdowns, settings) support verified one-click rollback with state conflict protection.
6. **Deadline Mode**: Ultra-low-latency bounded execution for time-sensitive tasks, completing multi-step operations under countdown pressure with 0 redundant model calls.

---

## Project Structure

```
ClickGuide/
├── backend/
│   ├── src/
│   │   ├── browser/
│   │   │   ├── controller.ts      # Playwright browser lifecycle & action execution
│   │   │   └── inspector.ts       # Interactive DOM & accessibility tree extraction
│   │   ├── demo-site/public/      # Administrative demo application & benchmark pages (10, 30, 100 elements)
│   │   ├── routes/
│   │   │   ├── browser.ts         # FastGuard, Context, Guided, Ledger & Deadline APIs
│   │   │   └── demo.ts            # Demo static asset hosting & persistence API
│   │   ├── services/
│   │   │   ├── context-compiler.ts# Context reduction & deterministic element ranker
│   │   │   ├── deadline-mode.ts   # Bounded rapid execution for countdown arena
│   │   │   ├── fastguard.ts       # Action safety, resolution & verification engine
│   │   │   ├── gemma.ts           # Gemma 4 SDK integration & structured planning
│   │   │   ├── guided-mode.ts     # Visual highlights & DOM grounding fallback
│   │   │   └── ledger.ts          # Action ledger & verified rewind manager
│   │   ├── types/                 # Shared domain types and telemetry schemas
│   │   ├── config.ts              # Security, origin whitelist, and model configs
│   │   └── server.ts              # Express API server
│   └── test/
│       └── clickguide.test.ts     # Master end-to-end integration test suite
├── frontend/
│   ├── src/
│   │   ├── components/            # React dashboard (Controls, Preview, Timeline, Metrics, Verification)
│   │   ├── services/api.ts        # Typed client for all backend capabilities
│   │   ├── App.tsx                # Dashboard orchestrator
│   │   └── index.css              # Custom dark-mode design system
│   └── vite.config.ts             # Vite proxy and configuration
└── package.json                   # Workspaces configuration
```

---

## Security Model

- **Dedicated Sandbox Profile**: Browser contexts run strictly in an isolated `.browser-profile` sandbox directory; personal Chrome profiles or credentials are never accessed.
- **Strict Origin Allowlist**: Automation is bound to configured allowed origins (`localhost` and `127.0.0.1`).
- **No Unsafe Execution**: Arbitrary remote code or untrusted scripts are disallowed; all actions pass through validated typed schemas.
- **Untrusted Web Content Guard**: Webpage text is treated as untrusted data and cannot override system instructions or safety rules.

---

## Getting Started

### Prerequisites
- Node.js (v20+)
- npm (v10+)
- Gemini API Key with access to `gemma-4-26b-a4b-it` (set in `backend/.env`)

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

### Configuration

Create a `.env` file in `backend/`:
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemma-4-26b-a4b-it
```

### Running Locally

```bash
# Run both backend and frontend concurrently
npm run dev

# Or run separately:
npm run dev:backend   # http://127.0.0.1:5000
npm run dev:frontend  # http://localhost:3000
```

---

## Testing & Verification

Run the master test suite:

```bash
npm test
```

### Master Test Suite Results
```text
▶ ClickGuide Master Test Suite (Phases 1-7)
  ✔ Phase 1 — Foundation: Server, demo site & browser controller (223ms)
  ✔ Phase 2 — Gemma 4 Task Planning & Zod Validation (5ms)
  ✔ Phase 3 — Context Compiler: Full, Compressed, and Incremental Context (4ms)
  ✔ Phase 4 — FastGuard: Target resolution, preconditions & verification (1473ms)
  ✔ Phase 5 — Guided Mode: Visual highlight overlays & visual grounding (147ms)
  ✔ Phase 6 — Action Ledger & Proof-Carrying Rewind (1304ms)
  ✔ Phase 7 — Deadline Mode: Rapid bounded execution in countdown arena (1406ms)
✔ ClickGuide Master Test Suite (Phases 1-7) (5546ms)
ℹ tests 8, pass 8, fail 0
```
