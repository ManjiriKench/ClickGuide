export interface ElementDescriptor {
  id: string;
  tag: string;
  role?: string;
  name?: string;
  text?: string;
  type?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  selector: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type ActionType = 'click' | 'fill' | 'check' | 'uncheck' | 'select' | 'scroll';

export interface BrowserAction {
  type: ActionType;
  selector: string;
  value?: string;
  description?: string;
}

export interface ActionResult {
  success: boolean;
  action: BrowserAction;
  timestamp: number;
  error?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  durationMs: number;
}

export interface PageSnapshot {
  url: string;
  title: string;
  elements: ElementDescriptor[];
  screenshotBase64?: string;
  timestamp: number;
}

export interface AgentMetrics {
  totalActions: number;
  successfulActions: number;
  verifiedActions: number;
  failedActions: number;
  lastLatencyMs: number;
  totalTokensUsed: number;
}

export type GemmaActionType = 'click' | 'fill' | 'select' | 'check' | 'uncheck' | 'inspect';

export interface PlannedAction {
  type: GemmaActionType;
  elementId: string;
  value?: string;
  expectedResult: string;
  description?: string;
}

export interface PlannedTask {
  goal: string;
  explanation: string;
  actions: PlannedAction[];
}

export interface GemmaPlanTelemetry {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  model: string;
}

export interface GemmaPlanResult {
  success: boolean;
  plan?: PlannedTask;
  error?: string;
  metrics: GemmaPlanTelemetry;
  rawResponse?: string;
}
