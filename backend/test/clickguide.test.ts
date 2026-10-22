import test from 'node:test';
import assert from 'node:assert';
import { browserController } from '../src/browser/controller.js';
import { PageInspector } from '../src/browser/inspector.js';
import { contextCompiler } from '../src/services/context-compiler.js';
import { fastGuard } from '../src/services/fastguard.js';
import { guidedMode } from '../src/services/guided-mode.js';
import { actionLedger } from '../src/services/ledger.js';
import { deadlineMode } from '../src/services/deadline-mode.js';
import { gemmaPlanner, plannedTaskSchema, plannedActionSchema } from '../src/services/gemma.js';
import { server } from '../src/server.js';
import { config } from '../src/config.js';
import { ElementDescriptor, PageSnapshot } from '../src/types/index.js';

test('ClickGuide Master Test Suite (Phases 1-7)', async (suite) => {
  if (!server.listening) {
    await new Promise<void>((resolve) => {
      if (server.listening) return resolve();
      server.once('listening', resolve);
      setTimeout(resolve, 1000);
    });
  }

  await browserController.launch();
  const page = browserController.getPage();

  // Phase 1: Foundation
  await suite.test('Phase 1 — Foundation: Server, demo site & browser controller', async () => {
    const healthRes = await fetch(`http://127.0.0.1:${config.port}/api/health`);
    assert.strictEqual(healthRes.status, 200);

    await browserController.navigate(`http://127.0.0.1:${config.port}/demo/index.html`);
    const screenshot = await browserController.captureScreenshot();
    assert.ok(screenshot.length > 100);

    const snapshot = await PageInspector.inspect(page, false);
    assert.ok(snapshot.elements.length >= 4);
    assert.ok(snapshot.elements.some((e) => e.id === 'promo-notifications'));
  });

  // Phase 2: Gemma 4 Task Planning
  await suite.test('Phase 2 — Gemma 4 Task Planning & Zod Validation', async () => {
    const mockElements: ElementDescriptor[] = [
      { id: 'promo-notifications', tag: 'input', type: 'checkbox', checked: true, selector: '#promo-notifications' },
      { id: 'report-format', tag: 'select', value: 'PDF', text: 'PDF', selector: '#report-format' },
      { id: 'save-settings-btn', tag: 'button', type: 'submit', text: 'Save Changes', selector: '#save-settings-btn' }
    ];

    const context = gemmaPlanner.compileContext(mockElements);
    assert.ok(context.includes('id="report-format"'));

    const validPlan = {
      goal: 'Change default report format to CSV',
      explanation: 'Select CSV option',
      actions: [
        {
          type: 'select' as const,
          elementId: 'report-format',
          value: 'CSV',
          expectedResult: 'Format set to CSV'
        }
      ]
    };
    const parsed = plannedTaskSchema.parse(validPlan);
    assert.strictEqual(parsed.actions[0].value, 'CSV');

    // Grounding check
    assert.throws(
      () => gemmaPlanner.parseAndValidateResponse(JSON.stringify({
        goal: 'test',
        actions: [{ type: 'select', elementId: 'ghost-dropdown', value: 'CSV', expectedResult: 'Done' }]
      }), new Set(['report-format'])),
      /Grounding Error/
    );

    // Injection defense
    assert.strictEqual(
      plannedActionSchema.safeParse({ type: 'executeScript', elementId: 'btn', expectedResult: 'ok' }).success,
      false
    );
  });

  // Phase 3: Context Compiler
  await suite.test('Phase 3 — Context Compiler: Full, Compressed, and Incremental Context', async () => {
    function generateControls(count: number): ElementDescriptor[] {
      const list: ElementDescriptor[] = [];
      for (let i = 1; i <= count - 2; i++) {
        list.push({ id: `ctl-${i}`, tag: 'input', type: 'text', text: `Field ${i}`, selector: `#ctl-${i}` });
      }
      list.push({ id: 'promo-notifications', tag: 'input', type: 'checkbox', checked: true, selector: '#promo-notifications' });
      list.push({ id: 'report-format', tag: 'select', value: 'PDF', selector: '#report-format' });
      return list;
    }

    const snap10: PageSnapshot = { url: 'http://127.0.0.1:5000/demo', title: '10', elements: generateControls(10), timestamp: Date.now() };
    const snap30: PageSnapshot = { url: 'http://127.0.0.1:5000/demo', title: '30', elements: generateControls(30), timestamp: Date.now() };
    const snap100: PageSnapshot = { url: 'http://127.0.0.1:5000/demo', title: '100', elements: generateControls(100), timestamp: Date.now() };

    const res10 = contextCompiler.compileCompressed('Disable promo notifications', snap10, 4);
    assert.ok(res10.metrics.reductionPercentage > 0);
    assert.strictEqual(res10.metrics.targetRetained, true);

    const res30 = contextCompiler.compileCompressed('Disable promo notifications', snap30, 4);
    assert.ok(res30.metrics.reductionPercentage >= 50);
    assert.strictEqual(res30.metrics.targetRetained, true);

    const res100 = contextCompiler.compileCompressed('Change report format', snap100, 4);
    assert.ok(res100.metrics.reductionPercentage >= 75);
    assert.strictEqual(res100.metrics.targetRetained, true);

    // Incremental diff
    contextCompiler.resetSnapshot();
    contextCompiler.compileIncremental(snap10);
    const modifiedSnap: PageSnapshot = {
      ...snap10,
      elements: snap10.elements.map((e) => (e.id === 'promo-notifications' ? { ...e, checked: false } : e))
    };
    const incRes = contextCompiler.compileIncremental(modifiedSnap);
    assert.strictEqual(incRes.isCacheInvalidated, true);
    assert.strictEqual(incRes.diffs?.length, 1);
    assert.strictEqual(incRes.diffs[0].field, 'checked');
  });

  // Phase 4: FastGuard
  await suite.test('Phase 4 — FastGuard: Target resolution, preconditions & verification', async () => {
    try {
      await browserController.navigate(`http://127.0.0.1:${config.port}/demo/index.html`);

      const receipt = await fastGuard.executeWithVerification(
        page,
        { type: 'uncheck', elementId: 'promo-notifications', expectedResult: 'Unchecked' },
        'Disable promotional notifications',
        'fg_task_1'
      );
      assert.strictEqual(receipt.verificationStatus, 'verified', `Receipt verification failed: ${receipt.errorDetails}`);
      assert.strictEqual(receipt.observedState, 'Unchecked (false)');

      const failReceipt = await fastGuard.executeWithVerification(
        page,
        { type: 'click', elementId: 'non-existent-button-xyz', expectedResult: 'Done' },
        'Click ghost button',
        'fg_task_2'
      );
      assert.strictEqual(failReceipt.verificationStatus, 'failed');
      assert.ok(failReceipt.errorDetails?.includes('Nonexistent target'));

      assert.throws(
        () => fastGuard.validateAction({ type: 'fill', elementId: 'user', value: '<script>evil()</script>', expectedResult: 'ok' }),
        /FastGuard Security Violation/
      );

      const originCheck = fastGuard.checkPermissions('https://untrusted-phishing.com', { type: 'click', elementId: 'btn', expectedResult: 'ok' });
      assert.strictEqual(originCheck.allowed, false);
    } catch (e) {
      throw e;
    }
  });

  // Phase 5: Guided Mode & Visual Grounding
  await suite.test('Phase 5 — Guided Mode: Visual highlight overlays & visual grounding', async () => {
    await browserController.navigate(`http://127.0.0.1:${config.port}/demo/index.html`);

    const highlightResult = await guidedMode.showHighlight(page, 'report-format', 'Select CSV option');
    assert.strictEqual(highlightResult.success, true);
    assert.ok(highlightResult.box && highlightResult.box.width > 0);

    const overlayVisible = await page.evaluate(() => Boolean(document.getElementById('clickguide-guided-overlay')));
    assert.strictEqual(overlayVisible, true);

    await guidedMode.clearHighlight(page);
    const overlayCleared = await page.evaluate(() => Boolean(document.getElementById('clickguide-guided-overlay')));
    assert.strictEqual(overlayCleared, false);

    // Visual-DOM Grounding
    const grounded = await guidedMode.visualGroundedIdentification(page, 'Change report format to CSV', [
      { id: 'report-format', tag: 'select', selector: '#report-format' }
    ]);
    assert.strictEqual(grounded.targetId, 'report-format');
    assert.strictEqual(grounded.method, 'dom');
  });

  // Phase 6: Action Ledger & Rewind
  await suite.test('Phase 6 — Action Ledger & Proof-Carrying Rewind', async () => {
    await page.evaluate(() => localStorage.clear());
    await browserController.navigate(`http://127.0.0.1:${config.port}/demo/index.html`);

    const toggleReceipt = await fastGuard.executeWithVerification(
      page,
      { type: 'uncheck', elementId: 'promo-notifications', expectedResult: 'Unchecked' },
      'Disable promo',
      'ledger_task_1'
    );
    assert.strictEqual(toggleReceipt.verificationStatus, 'verified');
    actionLedger.appendReceipt(toggleReceipt);

    // Rewind back to original checked state
    const rewindRes = await actionLedger.rewindAction(page, toggleReceipt.receiptId);
    assert.strictEqual(rewindRes.success, true);

    const isCheckedAgain = await page.locator('#promo-notifications').isChecked();
    assert.strictEqual(isCheckedAgain, true, 'Restored to checked state');

    // Rollback conflict check
    const conflictReceipt = await fastGuard.executeWithVerification(
      page,
      { type: 'uncheck', elementId: 'promo-notifications', expectedResult: 'Unchecked' },
      'Disable promo 2',
      'ledger_task_2'
    );
    actionLedger.appendReceipt(conflictReceipt);
    await page.locator('#promo-notifications').check(); // Simulate external out-of-band change
    const conflictRes = await actionLedger.rewindAction(page, conflictReceipt.receiptId);
    assert.strictEqual(conflictRes.success, false);
    assert.ok(conflictRes.message.includes('Rollback conflict'));

    // Irreversible action check
    const clickReceipt = await fastGuard.executeWithVerification(
      page,
      { type: 'click', elementId: 'save-settings-btn', expectedResult: 'Saved' },
      'Submit',
      'ledger_task_3'
    );
    actionLedger.appendReceipt(clickReceipt);
    const noRollbackRes = await actionLedger.rewindAction(page, clickReceipt.receiptId);
    assert.strictEqual(noRollbackRes.success, false);
    assert.ok(noRollbackRes.message.includes('Rollback unavailable'));
  });

  // Phase 7: Deadline Mode
  await suite.test('Phase 7 — Deadline Mode: Rapid bounded execution in countdown arena', async () => {
    const deadlineRes = await deadlineMode.executeChallengeDeadline(page);

    assert.strictEqual(deadlineRes.completed, true);
    assert.ok(deadlineRes.timeRemainingSec > 0);
    assert.strictEqual(deadlineRes.totalActions, 4);
    assert.strictEqual(deadlineRes.modelCalls, 0);
    assert.ok(deadlineRes.elapsedMs < 10000, `Completed in ${deadlineRes.elapsedMs}ms`);
  });

  await browserController.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
