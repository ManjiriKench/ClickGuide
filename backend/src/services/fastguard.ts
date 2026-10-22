import { Page } from 'playwright';
import { config } from '../config.js';
import { PlannedAction } from '../types/index.js';
import { plannedActionSchema } from './gemma.js';

export interface FastGuardResolution {
  passed: boolean;
  reason?: string;
  selector?: string;
  matchedCount?: number;
  beforeState?: Record<string, unknown>;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface ExecutionReceipt {
  receiptId: string;
  taskId: string;
  timestamp: number;
  goal: string;
  action: PlannedAction;
  targetEvidence: {
    elementId: string;
    selector: string;
    tag?: string;
    type?: string;
    name?: string;
    boundingBox?: { x: number; y: number; width: number; height: number };
  };
  previousState: Record<string, unknown>;
  expectedState: string;
  observedState: string;
  verificationStatus: 'verified' | 'failed' | 'unverifiable';
  errorDetails?: string;
  reversibility: {
    canRollback: boolean;
    reason?: string;
    rollbackAction?: PlannedAction;
  };
  modelLatencyMs: number;
  browserActionLatencyMs: number;
}

export class FastGuardService {
  public validateAction(rawAction: unknown): PlannedAction {
    const parsed = plannedActionSchema.safeParse(rawAction);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`FastGuard Action Schema Rejection: ${msg}`);
    }

    const action = parsed.data;

    const dangerousPatterns = /<script|javascript:|eval\(|Function\(|document\.cookie/i;
    if (action.value && dangerousPatterns.test(action.value)) {
      throw new Error('FastGuard Security Violation: Detected executable code pattern in action payload');
    }

    return action;
  }

  public checkPermissions(url: string, action: PlannedAction): { allowed: boolean; reason?: string } {
    try {
      const parsedUrl = new URL(url);
      if (!config.allowedHosts.includes(parsedUrl.hostname)) {
        return {
          allowed: false,
          reason: `FastGuard Origin Violation: Navigation to unauthorized host "${parsedUrl.hostname}" blocked`
        };
      }
    } catch {
      return { allowed: false, reason: `FastGuard URL Violation: Invalid URL "${url}"` };
    }

    const destructivePatterns = /delete|destroy|purge|drop|wipe|format/i;
    if (destructivePatterns.test(action.elementId) || (action.description && destructivePatterns.test(action.description))) {
      return {
        allowed: false,
        reason: `FastGuard Confirmation Required: Action on target "${action.elementId}" is classified as consequential`
      };
    }

    return { allowed: true };
  }

  public async resolveTarget(page: Page, action: PlannedAction): Promise<FastGuardResolution> {
    const rawId = action.elementId.replace(/^[#.]/, '');
    const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    const possibleSelectors = [
      `#${safeId}`,
      `[id="${rawId}"]`,
      `[name="${rawId}"]`,
      `button[id="${rawId}"]`,
      `input[id="${rawId}"]`,
      `select[id="${rawId}"]`
    ];

    let matchedSelector: string | null = null;
    let matchCount = 0;

    for (const sel of possibleSelectors) {
      try {
        const count = await page.locator(sel).count();
        if (count > 0) {
          matchedSelector = sel;
          matchCount = count;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!matchedSelector || matchCount === 0) {
      return {
        passed: false,
        matchedCount: 0,
        reason: `FastGuard Resolution Error: Nonexistent target "${action.elementId}"`
      };
    }

    if (matchCount > 1) {
      return {
        passed: false,
        matchedCount: matchCount,
        reason: `FastGuard Ambiguity Error: Found ${matchCount} matching elements for target "${action.elementId}"`
      };
    }

    const locator = page.locator(matchedSelector).first();

    const isVisible = await locator.isVisible().catch(() => false);
    if (!isVisible) {
      return {
        passed: false,
        matchedCount: 1,
        reason: `FastGuard Precondition Error: Target "${action.elementId}" is hidden or detached (stale)`
      };
    }

    const isDisabled = await locator.isDisabled().catch(() => false);
    if (isDisabled) {
      return {
        passed: false,
        matchedCount: 1,
        reason: `FastGuard Precondition Error: Target "${action.elementId}" is disabled`
      };
    }

    const box = await locator.boundingBox().catch(() => null);

    const beforeState: Record<string, unknown> = await locator.evaluate((el: HTMLElement) => {
      const input = el as HTMLInputElement;
      const select = el as HTMLSelectElement;
      return {
        tagName: el.tagName.toLowerCase(),
        type: input.type || null,
        name: input.name || null,
        checked: typeof input.checked === 'boolean' ? input.checked : null,
        value: input.value !== undefined ? input.value : select.value !== undefined ? select.value : null,
        textContent: el.textContent?.trim().slice(0, 50) || null
      };
    }).catch(() => ({}));

    return {
      passed: true,
      selector: matchedSelector,
      matchedCount: 1,
      beforeState,
      boundingBox: box ? { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) } : undefined
    };
  }

  public async executeWithVerification(
    page: Page,
    action: PlannedAction,
    goal: string,
    taskId: string,
    modelLatencyMs: number = 0
  ): Promise<ExecutionReceipt> {
    const startTime = performance.now();
    const receiptId = `rcpt_${Math.random().toString(36).substring(2, 10)}`;

    this.validateAction(action);

    const permCheck = this.checkPermissions(page.url(), action);
    if (!permCheck.allowed) {
      const latency = performance.now() - startTime;
      return {
        receiptId,
        taskId,
        timestamp: Date.now(),
        goal,
        action,
        targetEvidence: { elementId: action.elementId, selector: `#${action.elementId}` },
        previousState: {},
        expectedState: action.expectedResult,
        observedState: 'Action Blocked',
        verificationStatus: 'failed',
        errorDetails: permCheck.reason,
        reversibility: { canRollback: false, reason: 'Action blocked by FastGuard policy' },
        modelLatencyMs,
        browserActionLatencyMs: Math.round(latency * 100) / 100
      };
    }

    let resolution = await this.resolveTarget(page, action);

    if (!resolution.passed) {
      try {
        const locator = page.locator(`#${action.elementId}`).first();
        await locator.scrollIntoViewIfNeeded({ timeout: 1000 });
        resolution = await this.resolveTarget(page, action);
      } catch {
        // Recovery attempt non-fatal
      }
    }

    if (!resolution.passed || !resolution.selector) {
      const latency = performance.now() - startTime;
      return {
        receiptId,
        taskId,
        timestamp: Date.now(),
        goal,
        action,
        targetEvidence: { elementId: action.elementId, selector: `#${action.elementId}` },
        previousState: {},
        expectedState: action.expectedResult,
        observedState: 'Target Resolution Failed',
        verificationStatus: 'failed',
        errorDetails: resolution.reason,
        reversibility: { canRollback: false, reason: 'Target was never modified' },
        modelLatencyMs,
        browserActionLatencyMs: Math.round(latency * 100) / 100
      };
    }

    const locator = page.locator(resolution.selector).first();
    const beforeState = resolution.beforeState || {};

    let executionError: string | undefined;

    try {
      switch (action.type) {
        case 'click':
          await locator.click();
          break;
        case 'check':
          await locator.check();
          break;
        case 'uncheck':
          await locator.uncheck();
          break;
        case 'fill':
          await locator.fill(action.value || '');
          break;
        case 'select':
          if (!action.value) throw new Error('Value required for select action');
          await locator.selectOption(action.value);
          break;
        case 'inspect':
          break;
        default:
          throw new Error(`Unsupported action type: ${(action as PlannedAction).type}`);
      }
    } catch (err: unknown) {
      executionError = err instanceof Error ? err.message : String(err);
    }

    await page.waitForTimeout(150);

    let observedState = 'Unchanged';
    let verified = false;

    try {
      const afterState: Record<string, unknown> = await locator.evaluate((el: HTMLElement) => {
        const input = el as HTMLInputElement;
        const select = el as HTMLSelectElement;
        return {
          checked: typeof input.checked === 'boolean' ? input.checked : null,
          value: input.value !== undefined ? input.value : select.value !== undefined ? select.value : null,
          textContent: el.textContent?.trim().slice(0, 50) || null
        };
      });

      if (!executionError) {
        if (action.type === 'check') {
          observedState = afterState.checked ? 'Checked (true)' : 'Unchecked (false)';
          verified = afterState.checked === true;
        } else if (action.type === 'uncheck') {
          observedState = afterState.checked ? 'Checked (true)' : 'Unchecked (false)';
          verified = afterState.checked === false;
        } else if (action.type === 'select') {
          observedState = String(afterState.value || '');
          verified = afterState.value === action.value;
        } else if (action.type === 'fill') {
          observedState = String(afterState.value || '');
          verified = afterState.value === action.value;
        } else if (action.type === 'click') {
          observedState = 'Clicked';
          verified = true;
        } else if (action.type === 'inspect') {
          observedState = 'Inspected';
          verified = true;
        }
      }
    } catch {
      observedState = 'Evaluation failed';
      verified = false;
    }

    const latency = performance.now() - startTime;

    let rollbackAction: PlannedAction | undefined;
    let canRollback = false;

    if (action.type === 'check') {
      canRollback = true;
      rollbackAction = {
        type: 'uncheck',
        elementId: action.elementId,
        expectedResult: 'Restored unchecked state'
      };
    } else if (action.type === 'uncheck') {
      canRollback = true;
      rollbackAction = {
        type: 'check',
        elementId: action.elementId,
        expectedResult: 'Restored checked state'
      };
    } else if (action.type === 'select' && beforeState.value !== undefined) {
      canRollback = true;
      rollbackAction = {
        type: 'select',
        elementId: action.elementId,
        value: String(beforeState.value),
        expectedResult: `Restored format to ${beforeState.value}`
      };
    } else if (action.type === 'fill' && beforeState.value !== undefined) {
      canRollback = true;
      rollbackAction = {
        type: 'fill',
        elementId: action.elementId,
        value: String(beforeState.value),
        expectedResult: `Restored input value`
      };
    }

    return {
      receiptId,
      taskId,
      timestamp: Date.now(),
      goal,
      action,
      targetEvidence: {
        elementId: action.elementId,
        selector: resolution.selector,
        tag: String(beforeState.tagName || ''),
        type: String(beforeState.type || ''),
        name: String(beforeState.name || ''),
        boundingBox: resolution.boundingBox
      },
      previousState: beforeState,
      expectedState: action.expectedResult,
      observedState,
      verificationStatus: verified ? 'verified' : 'failed',
      errorDetails: executionError,
      reversibility: {
        canRollback,
        reason: canRollback ? undefined : 'Action type does not support automated rollback',
        rollbackAction
      },
      modelLatencyMs,
      browserActionLatencyMs: Math.round(latency * 100) / 100
    };
  }
}

export const fastGuard = new FastGuardService();
