export type ExecutionMode = 'guided' | 'auto';

export type AgentStatus = 'idle' | 'inspecting' | 'planning' | 'executing' | 'verifying' | 'completed' | 'error' | 'stopped';

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

export interface VerificationRecord {
  id: string;
  actionDescription: string;
  targetSelector: string;
  expectedState: string;
  observedState: string;
  verified: boolean;
  timestamp: number;
  canRewind: boolean;
}

export interface ModelMetrics {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  inferenceLatencyMs: number;
  executionLatencyMs: number;
  totalActionsExecuted: number;
  verificationSuccessRate: number;
  model?: string;
  contextFullTokens?: number;
  contextCompressedTokens?: number;
  contextReductionPercent?: number;
  contextLatencyMs?: number;
}

export interface PlannedAction {
  type: 'click' | 'fill' | 'select' | 'check' | 'uncheck' | 'inspect';
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

export interface GemmaPlanResult {
  success: boolean;
  plan?: PlannedTask;
  error?: string;
  metrics: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
    model: string;
  };
  rawResponse?: string;
}
