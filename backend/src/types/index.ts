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
