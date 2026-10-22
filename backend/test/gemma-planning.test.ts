import test from 'node:test';
import assert from 'node:assert';
import { GemmaPlannerService, plannedTaskSchema, plannedActionSchema } from '../src/services/gemma.js';
import { ElementDescriptor } from '../src/types/index.js';
import { config } from '../src/config.js';

test('Gemma 4 Task Planning & Validation Suite', async (t) => {
  const planner = new GemmaPlannerService();

  const mockElements: ElementDescriptor[] = [
    {
      id: 'promo-notifications',
      tag: 'input',
      type: 'checkbox',
      name: 'promoNotifications',
      checked: true,
      text: 'Promotional Notifications',
      selector: '#promo-notifications'
    },
    {
      id: 'email-notifications',
      tag: 'input',
      type: 'checkbox',
      name: 'emailNotifications',
      checked: true,
      text: 'Email Notifications',
      selector: '#email-notifications'
    },
    {
      id: 'report-format',
      tag: 'select',
      name: 'reportFormat',
      value: 'PDF',
      text: 'PDF Document (.pdf)',
      selector: '#report-format'
    },
    {
      id: 'theme-selector',
      tag: 'select',
      name: 'theme',
      value: 'Light',
      text: 'Light',
      selector: '#theme-selector'
    },
    {
      id: 'save-settings-btn',
      tag: 'button',
      type: 'submit',
      text: 'Save Changes',
      selector: '#save-settings-btn'
    }
  ];

  await t.test('Compiles compact browser element context for Gemma 4', () => {
    const context = planner.compileContext(mockElements);
    assert.ok(context.includes('id="report-format"'));
    assert.ok(context.includes('id="promo-notifications"'));
    assert.ok(context.includes('tag="select"'));
    assert.ok(context.includes('checked=true'));
    assert.ok(context.includes('value="PDF"'));
  });

  await t.test('Strictly validates structured action plan schema with Zod', () => {
    const validPlan = {
      goal: 'Change default report format to CSV',
      explanation: 'Select CSV option in report format dropdown and save',
      actions: [
        {
          type: 'select',
          elementId: 'report-format',
          value: 'CSV',
          expectedResult: 'Report format set to CSV',
          description: 'Change report format dropdown to CSV'
        },
        {
          type: 'click',
          elementId: 'save-settings-btn',
          expectedResult: 'Settings saved',
          description: 'Persist updated configuration'
        }
      ]
    };

    const parsed = plannedTaskSchema.parse(validPlan);
    assert.strictEqual(parsed.actions.length, 2);
    assert.strictEqual(parsed.actions[0].type, 'select');
    assert.strictEqual(parsed.actions[0].elementId, 'report-format');
    assert.strictEqual(parsed.actions[0].value, 'CSV');
  });

  await t.test('Enforces grounding: rejects non-existent element IDs', () => {
    const validIds = new Set(['report-format', 'save-settings-btn']);
    const ungroundedPlanJson = JSON.stringify({
      goal: 'Change default report format to CSV',
      actions: [
        {
          type: 'select',
          elementId: 'non-existent-dropdown',
          value: 'CSV',
          expectedResult: 'Format changed'
        }
      ]
    });

    assert.throws(
      () => planner.parseAndValidateResponse(ungroundedPlanJson, validIds),
      /Grounding Error: Target elementId "non-existent-dropdown" does not exist/
    );
  });

  await t.test('Rejects arbitrary executable code or invalid action types', () => {
    const dangerousPlan = {
      type: 'executeScript',
      elementId: 'report-format',
      value: "document.cookie = 'stolen'",
      expectedResult: 'Executed'
    };

    const result = plannedActionSchema.safeParse(dangerousPlan);
    assert.strictEqual(result.success, false);
  });

  await t.test('Handles malformed and non-JSON output gracefully', () => {
    assert.throws(
      () => planner.parseAndValidateResponse('I am an AI assistant and I will click the button for you!'),
      /Gemma returned invalid JSON/
    );

    assert.throws(
      () => planner.parseAndValidateResponse('{"goal": "test"}'),
      /Schema validation failed/
    );
  });

  await t.test('Correctly extracts JSON wrapped in markdown code fences', () => {
    const validIds = new Set(['report-format']);
    const fencedJson = `\`\`\`json
{
  "goal": "Change report format",
  "explanation": "Update dropdown",
  "actions": [
    {
      "type": "select",
      "elementId": "report-format",
      "value": "CSV",
      "expectedResult": "CSV selected"
    }
  ]
}
\`\`\``;

    const parsed = planner.parseAndValidateResponse(fencedJson, validIds);
    assert.strictEqual(parsed.actions[0].value, 'CSV');
  });

  await t.test('Reports missing API key error without crashing', async () => {
    if (!config.geminiApiKey) {
      const planResult = await planner.planTask('Change report format to CSV', mockElements);
      assert.strictEqual(planResult.success, false);
      assert.ok(planResult.error?.includes('GEMINI_API_KEY is not set'));
      assert.strictEqual(planResult.metrics.model, 'gemma-4-26b-a4b-it');
    }
  });

  await t.test('Live Gemma 4 API call (executed if GEMINI_API_KEY is configured)', async () => {
    if (!config.geminiApiKey) {
      console.log('Skipping live Gemma 4 API test: GEMINI_API_KEY not configured yet in environment.');
      return;
    }

    console.log(`Executing live Gemma 4 call using model: ${config.gemmaModel}`);
    const result = await planner.planTask('Change default report format to CSV and save', mockElements);

    assert.strictEqual(result.success, true, `API call failed: ${result.error}`);
    assert.ok(result.plan, 'Plan is generated');
    assert.ok(result.metrics.latencyMs > 0, 'Latency measured');
    console.log(`Live Gemma 4 latency: ${result.metrics.latencyMs}ms, Total Tokens: ${result.metrics.totalTokens}`);

    const hasReportFormat = result.plan?.actions.some(
      (a) => a.elementId === 'report-format' && (a.value === 'CSV' || a.type === 'select')
    );
    assert.ok(hasReportFormat, 'Gemma 4 identified report-format control with CSV value');
  });
});
