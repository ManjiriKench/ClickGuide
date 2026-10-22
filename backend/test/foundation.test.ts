import test from 'node:test';
import assert from 'node:assert';
import { browserController } from '../src/browser/controller.js';
import { PageInspector } from '../src/browser/inspector.js';
import { server } from '../src/server.js';
import { config } from '../src/config.js';

test('ClickGuide Foundation Integration Suite', async (t) => {
  // Ensure server is listening
  if (!server.listening) {
    await new Promise((resolve) => server.once('listening', resolve));
  }

  await t.test('Demo website and health endpoints respond', async () => {
    const res = await fetch(`http://127.0.0.1:${config.port}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');

    const demoRes = await fetch(`http://127.0.0.1:${config.port}/demo/index.html`);
    assert.strictEqual(demoRes.status, 200);
    const demoHtml = await demoRes.text();
    assert.ok(demoHtml.includes('Workspace Settings'));

    const challengeRes = await fetch(`http://127.0.0.1:${config.port}/demo/challenge.html`);
    assert.strictEqual(challengeRes.status, 200);
    const challengeHtml = await challengeRes.text();
    assert.ok(challengeHtml.includes('Countdown Challenge'));
  });

  await t.test('Browser launches and captures screenshot', async () => {
    await browserController.launch();
    assert.strictEqual(browserController.isLaunched(), true);

    await browserController.getPage().evaluate(() => {
      localStorage.clear();
    });
    await browserController.navigate(`http://127.0.0.1:${config.port}/demo/index.html`);

    const screenshot = await browserController.captureScreenshot();
    assert.ok(typeof screenshot === 'string');
    assert.ok(screenshot.length > 100);
  });

  await t.test('PageInspector extracts interactive form elements', async () => {
    const snapshot = await PageInspector.inspect(browserController.getPage(), true);
    assert.ok(snapshot.elements.length >= 4);

    const promoEl = snapshot.elements.find((el) => el.id === 'promo-notifications');
    assert.ok(promoEl, 'promo-notifications element found');
    assert.strictEqual(promoEl?.checked, true);

    const formatEl = snapshot.elements.find((el) => el.id === 'report-format');
    assert.ok(formatEl, 'report-format dropdown found');
  });

  await t.test('Browser executes programmatic actions and verifies state', async () => {
    const uncheckResult = await browserController.executeAction({
      type: 'uncheck',
      selector: '#promo-notifications',
      description: 'Disable promotional notifications'
    });
    assert.strictEqual(uncheckResult.success, true);

    const selectResult = await browserController.executeAction({
      type: 'select',
      selector: '#report-format',
      value: 'CSV',
      description: 'Change report format to CSV'
    });
    assert.strictEqual(selectResult.success, true);

    const saveResult = await browserController.executeAction({
      type: 'click',
      selector: '#save-settings-btn',
      description: 'Save Changes'
    });
    assert.strictEqual(saveResult.success, true);

    const postSnapshot = await PageInspector.inspect(browserController.getPage(), false);
    const updatedPromo = postSnapshot.elements.find((el) => el.id === 'promo-notifications');
    const updatedFormat = postSnapshot.elements.find((el) => el.id === 'report-format');

    assert.strictEqual(updatedPromo?.checked, false);
    assert.strictEqual(updatedFormat?.value, 'CSV');
  });

  await t.test('Clean shutdown', async () => {
    await browserController.close();
    assert.strictEqual(browserController.isLaunched(), false);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
