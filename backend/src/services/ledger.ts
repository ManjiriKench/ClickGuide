import { Page } from 'playwright';
import { ExecutionReceipt, fastGuard } from './fastguard.js';

export interface RewindResult {
  success: boolean;
  message: string;
  rollbackReceipt?: ExecutionReceipt;
  restoredValue?: unknown;
}

export class ActionLedgerService {
  private receipts: ExecutionReceipt[] = [];

  public appendReceipt(receipt: ExecutionReceipt): void {
    this.receipts.unshift(receipt);
  }

  public getReceipts(limit: number = 50): ExecutionReceipt[] {
    return this.receipts.slice(0, limit);
  }

  public getReceiptById(receiptId: string): ExecutionReceipt | undefined {
    return this.receipts.find((r) => r.receiptId === receiptId);
  }

  public clear(): void {
    this.receipts = [];
  }

  public async rewindAction(page: Page, receiptId: string): Promise<RewindResult> {
    const receipt = this.getReceiptById(receiptId);
    if (!receipt) {
      return { success: false, message: `Receipt "${receiptId}" not found in ledger` };
    }

    if (!receipt.reversibility.canRollback || !receipt.reversibility.rollbackAction) {
      return {
        success: false,
        message: 'Rollback unavailable: Action is not classified as reversible'
      };
    }

    const targetSelector = receipt.targetEvidence.selector;
    const locator = page.locator(targetSelector).first();

    const currentState = await locator.evaluate((el: HTMLElement) => {
      const input = el as HTMLInputElement;
      const select = el as HTMLSelectElement;
      return {
        checked: typeof input.checked === 'boolean' ? input.checked : null,
        value: input.value !== undefined ? input.value : select.value !== undefined ? select.value : null
      };
    }).catch(() => null);

    if (!currentState) {
      return {
        success: false,
        message: 'Rollback conflict: Target element is no longer accessible on the current page'
      };
    }

    if (receipt.action.type === 'check' && currentState.checked !== true) {
      return {
        success: false,
        message: 'Rollback conflict: State was modified externally after the recorded action'
      };
    }
    if (receipt.action.type === 'uncheck' && currentState.checked !== false) {
      return {
        success: false,
        message: 'Rollback conflict: State was modified externally after the recorded action'
      };
    }

    const rollbackReceipt = await fastGuard.executeWithVerification(
      page,
      receipt.reversibility.rollbackAction,
      `Rewind: ${receipt.goal}`,
      receipt.taskId,
      0
    );

    this.appendReceipt(rollbackReceipt);

    if (rollbackReceipt.verificationStatus === 'verified') {
      return {
        success: true,
        message: `Successfully rolled back ${receipt.action.elementId} to previous verified state`,
        rollbackReceipt,
        restoredValue: receipt.previousState.checked ?? receipt.previousState.value
      };
    } else {
      return {
        success: false,
        message: `Rewind execution failed verification: ${rollbackReceipt.errorDetails || rollbackReceipt.observedState}`,
        rollbackReceipt
      };
    }
  }
}

export const actionLedger = new ActionLedgerService();
