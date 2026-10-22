import { Page } from 'playwright';
import { fastGuard, ExecutionReceipt } from './fastguard.js';
import { PlannedAction } from '../types/index.js';

export interface DeadlineTaskResult {
  completed: boolean;
  timeRemainingSec: number;
  elapsedMs: number;
  totalActions: number;
  modelCalls: number;
  receipts: ExecutionReceipt[];
  statusMessage: string;
}

export class DeadlineModeService {
  public async executeChallengeDeadline(page: Page): Promise<DeadlineTaskResult> {
    const startMonotonic = performance.now();

    await page.goto('http://127.0.0.1:5000/demo/challenge.html', { waitUntil: 'domcontentloaded' });

    await page.locator('#start-timer-btn').click();
    await page.waitForTimeout(200);

    const initialTimeStr = await page.locator('#challenge-timer').innerText().catch(() => '00:45.00');

    const actions: PlannedAction[] = [
      {
        type: 'check',
        elementId: 'security-override',
        expectedResult: 'Security override switch enabled'
      },
      {
        type: 'select',
        elementId: 'emergency-region',
        value: 'ap-south',
        expectedResult: 'Emergency region set to ap-south'
      },
      {
        type: 'fill',
        elementId: 'auth-code',
        value: 'CONFIRM-2026',
        expectedResult: 'Auth code input filled'
      },
      {
        type: 'click',
        elementId: 'submit-challenge-btn',
        expectedResult: 'Challenge verification submitted'
      }
    ];

    const receipts: ExecutionReceipt[] = [];
    let completed = false;

    for (const act of actions) {
      const receipt = await fastGuard.executeWithVerification(
        page,
        act,
        'Deadline challenge operational sequence',
        'deadline_seq_1',
        0
      );
      receipts.push(receipt);

      if (receipt.verificationStatus === 'failed') {
        break;
      }
    }

    const elapsedMs = Math.round((performance.now() - startMonotonic) * 100) / 100;

    const statusBanner = await page.locator('#challenge-status').innerText().catch(() => '');
    completed = statusBanner.includes('Challenge PASSED');

    const timerText = await page.locator('#challenge-timer').innerText().catch(() => '00:00.00');
    const [minStr, secStr] = timerText.split(':');
    const timeRemainingSec = parseFloat(minStr) * 60 + parseFloat(secStr);

    return {
      completed,
      timeRemainingSec,
      elapsedMs,
      totalActions: receipts.length,
      modelCalls: 0, // Bounded fast path avoids redundant model roundtrips during time constraint
      receipts,
      statusMessage: statusBanner
    };
  }
}

export const deadlineMode = new DeadlineModeService();
