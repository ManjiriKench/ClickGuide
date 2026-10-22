# Graph Report - ClickGuide  (2026-10-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 272 nodes · 465 edges · 13 communities (10 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `48967f1b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- clickguide.test.ts
- App.tsx
- backend/package.json
- frontend/package.json
- ElementDescriptor
- compilerOptions
- package.json
- compilerOptions
- ExecutionReceipt
- BrowserController
- app.js
- PlannedAction

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `ElementDescriptor` - 13 edges
3. `compilerOptions` - 12 edges
4. `BrowserController` - 11 edges
5. `PlannedAction` - 10 edges
6. `ExecutionReceipt` - 10 edges
7. `react` - 10 edges
8. `PageSnapshot` - 9 edges
9. `App()` - 9 edges
10. `config` - 9 edges

## Surprising Connections (you probably didn't know these)
- `HeaderProps` --references--> `AgentStatus`  [EXTRACTED]
  frontend/src/components/Header.tsx → frontend/src/types/index.ts
- `TimelineProps` --references--> `ActionResult`  [EXTRACTED]
  frontend/src/components/Timeline.tsx → frontend/src/types/index.ts
- `ExecutionReceipt` --references--> `PlannedAction`  [EXTRACTED]
  backend/src/services/fastguard.ts → backend/src/types/index.ts
- `ContextCompilationResult` --references--> `ElementDescriptor`  [EXTRACTED]
  backend/src/services/context-compiler.ts → backend/src/types/index.ts
- `ScoredElement` --references--> `ElementDescriptor`  [EXTRACTED]
  backend/src/services/context-compiler.ts → backend/src/types/index.ts

## Import Cycles
- None detected.

## Communities (13 total, 3 thin omitted)

### Community 0 - "clickguide.test.ts"
Cohesion: 0.08
Nodes (32): PageInspector, config, actionSchema, browserRouter, navigateSchema, planSchema, demoPublicPath, demoRouter (+24 more)

### Community 1 - "App.tsx"
Cohesion: 0.11
Nodes (30): App(), BrowserPreview(), BrowserPreviewProps, Controls(), ControlsProps, Header(), HeaderProps, MetricsPanel() (+22 more)

### Community 2 - "backend/package.json"
Cohesion: 0.06
Nodes (31): dependencies, cors, dotenv, express, @google/genai, playwright, zod, devDependencies (+23 more)

### Community 3 - "frontend/package.json"
Cohesion: 0.08
Nodes (23): typescript, dependencies, lucide-react, react, react-dom, devDependencies, @types/react, @types/react-dom (+15 more)

### Community 4 - "ElementDescriptor"
Cohesion: 0.13
Nodes (11): ContextCompilationResult, ContextCompiler, ContextMode, ElementDiff, ScoredElement, GemmaPlannerService, GuidedModeService, ElementDescriptor (+3 more)

### Community 5 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 7 - "package.json"
Cohesion: 0.13
Nodes (14): description, devDependencies, concurrently, name, private, scripts, build, dev (+6 more)

### Community 8 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, resolveJsonModule (+5 more)

### Community 9 - "ExecutionReceipt"
Cohesion: 0.36
Nodes (4): DeadlineTaskResult, ExecutionReceipt, ActionLedgerService, RewindResult

### Community 11 - "app.js"
Cohesion: 0.39
Nodes (6): applyTheme(), initChallengePage(), initSettingsPage(), loadSettings(), saveSettings(), updateSummaryDisplay()

## Knowledge Gaps
- **7 isolated node(s):** `tsx`, `@types/cors`, `@types/express`, `@types/node`, `@types/react` (+2 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 134 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `typescript` connect `frontend/package.json` to `backend/package.json`?**
  _High betweenness centrality (0.300) - this node is a cross-community bridge._
- **What connects `tsx`, `@types/cors`, `@types/express` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `clickguide.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08106219426974144 - nodes in this community are weakly interconnected._
- **Why does `react` connect `App.tsx` to `frontend/package.json`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11219512195121951 - nodes in this community are weakly interconnected._
- **Why does `playwright` connect `clickguide.test.ts` to `backend/package.json`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._