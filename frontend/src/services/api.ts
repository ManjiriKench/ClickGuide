import { ActionResult, BrowserAction, ElementDescriptor } from '../types/index.js';

const API_BASE = '/api/browser';

export async function launchBrowser(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to launch browser (${res.status})`);
  }
  return res.json();
}

export async function getBrowserStatus(): Promise<{ launched: boolean; timestamp: number }> {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) {
    throw new Error(`Failed to check browser status (${res.status})`);
  }
  return res.json();
}

export async function getScreenshot(): Promise<{ screenshot: string; timestamp: number }> {
  const res = await fetch(`${API_BASE}/screenshot`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to capture screenshot (${res.status})`);
  }
  return res.json();
}

export async function inspectPage(includeScreenshot: boolean = false): Promise<{
  url: string;
  title: string;
  elements: ElementDescriptor[];
  screenshotBase64?: string;
}> {
  const res = await fetch(`${API_BASE}/inspect?screenshot=${includeScreenshot}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to inspect page (${res.status})`);
  }
  const data = await res.json();
  return data.snapshot;
}

export async function executeAction(action: BrowserAction): Promise<ActionResult> {
  const res = await fetch(`${API_BASE}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Action failed (${res.status})`);
  }
  return res.json();
}

export async function navigateBrowser(url: string): Promise<void> {
  const res = await fetch(`${API_BASE}/navigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Navigation failed (${res.status})`);
  }
}

export async function closeBrowser(): Promise<void> {
  const res = await fetch(`${API_BASE}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to close browser (${res.status})`);
  }
}

export async function getModelConfig(): Promise<{ model: string; hasApiKey: boolean; timeoutMs: number }> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) {
    throw new Error(`Failed to fetch model configuration (${res.status})`);
  }
  return res.json();
}

export async function planTaskWithGemma(goal: string): Promise<import('../types/index.js').GemmaPlanResult> {
  const res = await fetch(`${API_BASE}/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Task planning failed (${res.status})`);
  }
  return data;
}

export async function fetchContextReduction(mode: 'full' | 'compressed' | 'incremental' = 'compressed', goal?: string) {
  const params = new URLSearchParams({ mode });
  if (goal) params.append('goal', goal);
  const res = await fetch(`${API_BASE}/context?${params.toString()}`);
  if (!res.ok) throw new Error(`Context retrieval failed (${res.status})`);
  return res.json();
}

export async function executeFastGuard(action: import('../types/index.js').PlannedAction, goal: string, taskId?: string) {
  const res = await fetch(`${API_BASE}/fastguard/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, goal, taskId })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `FastGuard execution failed (${res.status})`);
  }
  return res.json();
}

export async function fetchLedgerReceipts() {
  const res = await fetch(`${API_BASE}/ledger`);
  if (!res.ok) throw new Error(`Ledger retrieval failed (${res.status})`);
  return res.json();
}

export async function rewindLedgerAction(receiptId: string) {
  const res = await fetch(`${API_BASE}/ledger/rewind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiptId })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Rewind failed (${res.status})`);
  }
  return res.json();
}

export async function executeDeadlineChallenge() {
  const res = await fetch(`${API_BASE}/deadline/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Deadline challenge failed (${res.status})`);
  }
  return res.json();
}

export async function showGuidedHighlight(elementId: string, instruction?: string) {
  const res = await fetch(`${API_BASE}/guided/highlight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ elementId, instruction })
  });
  return res.json();
}

export async function clearGuidedHighlight() {
  const res = await fetch(`${API_BASE}/guided/clear`, {
    method: 'POST'
  });
  return res.json();
}

