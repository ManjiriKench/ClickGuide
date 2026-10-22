import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { browserController } from '../browser/controller.js';
import { PageInspector } from '../browser/inspector.js';
import { config } from '../config.js';

export const browserRouter = Router();

const navigateSchema = z.object({
  url: z.string().url()
});

const actionSchema = z.object({
  type: z.enum(['click', 'fill', 'check', 'uncheck', 'select', 'scroll']),
  selector: z.string().min(1),
  value: z.string().optional(),
  description: z.string().optional()
});

browserRouter.post('/launch', async (_req: Request, res: Response): Promise<void> => {
  try {
    await browserController.launch();
    res.json({
      success: true,
      status: 'launched',
      message: 'Chromium launched with dedicated profile'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

browserRouter.get('/status', (_req: Request, res: Response): void => {
  res.json({
    launched: browserController.isLaunched(),
    timestamp: Date.now()
  });
});

browserRouter.post('/navigate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = navigateSchema.parse(req.body);
    await browserController.navigate(url);
    res.json({ success: true, url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
});

browserRouter.get('/screenshot', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!browserController.isLaunched()) {
      res.status(400).json({ success: false, error: 'Browser not active' });
      return;
    }
    const screenshot = await browserController.captureScreenshot();
    res.json({ success: true, screenshot, timestamp: Date.now() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

browserRouter.get('/inspect', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!browserController.isLaunched()) {
      res.status(400).json({ success: false, error: 'Browser not active' });
      return;
    }
    const includeScreenshot = req.query.screenshot === 'true';
    const snapshot = await PageInspector.inspect(browserController.getPage(), includeScreenshot);
    res.json({ success: true, snapshot });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

browserRouter.post('/action', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!browserController.isLaunched()) {
      res.status(400).json({ success: false, error: 'Browser not active' });
      return;
    }
    const action = actionSchema.parse(req.body);
    const result = await browserController.executeAction(action);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
});

browserRouter.get('/config', (_req: Request, res: Response): void => {
  res.json({
    model: config.gemmaModel,
    hasApiKey: Boolean(config.geminiApiKey),
    timeoutMs: config.modelTimeoutMs
  });
});

const planSchema = z.object({
  goal: z.string().min(1)
});

browserRouter.post('/plan', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!browserController.isLaunched()) {
      res.status(400).json({ success: false, error: 'Browser not active. Launch browser first.' });
      return;
    }

    const { goal } = planSchema.parse(req.body);
    const snapshot = await PageInspector.inspect(browserController.getPage(), false);

    const { gemmaPlanner } = await import('../services/gemma.js');
    const result = await gemmaPlanner.planTask(goal, snapshot.elements);

    if (!result.success) {
      res.status(422).json(result);
      return;
    }

    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

browserRouter.post('/context', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!browserController.isLaunched()) {
      res.status(400).json({ success: false, error: 'Browser not active' });
      return;
    }
    const { goal = '', mode = 'compressed' } = req.body;
    const snapshot = await PageInspector.inspect(browserController.getPage(), false);
    const { contextCompiler } = await import('../services/context-compiler.js');

    if (mode === 'full') {
      const fullText = contextCompiler.compileFull(snapshot);
      res.json({
        success: true,
        mode: 'full',
        contextText: fullText,
        metrics: { fullSizeChars: fullText.length, compressedSizeChars: fullText.length, reductionPercentage: 0 }
      });
      return;
    }

    if (mode === 'incremental') {
      const result = contextCompiler.compileIncremental(snapshot);
      res.json({ success: true, ...result });
      return;
    }

    const result = contextCompiler.compileCompressed(goal, snapshot);
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

browserRouter.post('/fastguard/execute', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!browserController.isLaunched()) {
      res.status(400).json({ success: false, error: 'Browser not active' });
      return;
    }
    const { action, goal = 'User Task', taskId = 'task_1', modelLatencyMs = 0 } = req.body;
    const { fastGuard } = await import('../services/fastguard.js');
    const { actionLedger } = await import('../services/ledger.js');

    const receipt = await fastGuard.executeWithVerification(
      browserController.getPage(),
      action,
      goal,
      taskId,
      modelLatencyMs
    );

    actionLedger.appendReceipt(receipt);
    res.json({ success: true, receipt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

browserRouter.get('/ledger', async (_req: Request, res: Response): Promise<void> => {
  try {
    const { actionLedger } = await import('../services/ledger.js');
    res.json({ success: true, receipts: actionLedger.getReceipts() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

browserRouter.post('/ledger/rewind', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!browserController.isLaunched()) {
      res.status(400).json({ success: false, error: 'Browser not active' });
      return;
    }
    const { receiptId } = req.body;
    if (!receiptId) {
      res.status(400).json({ success: false, error: 'receiptId required' });
      return;
    }
    const { actionLedger } = await import('../services/ledger.js');
    const result = await actionLedger.rewindAction(browserController.getPage(), receiptId);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

browserRouter.post('/guided/highlight', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!browserController.isLaunched()) {
      res.status(400).json({ success: false, error: 'Browser not active' });
      return;
    }
    const { elementId, instruction } = req.body;
    const { guidedMode } = await import('../services/guided-mode.js');
    const result = await guidedMode.showHighlight(browserController.getPage(), elementId, instruction);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

browserRouter.post('/guided/clear', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!browserController.isLaunched()) {
      res.json({ success: true });
      return;
    }
    const { guidedMode } = await import('../services/guided-mode.js');
    await guidedMode.clearHighlight(browserController.getPage());
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

browserRouter.post('/deadline/run', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!browserController.isLaunched()) {
      await browserController.launch();
    }
    const { deadlineMode } = await import('../services/deadline-mode.js');
    const result = await deadlineMode.executeChallengeDeadline(browserController.getPage());
    res.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

browserRouter.post('/close', async (_req: Request, res: Response): Promise<void> => {
  try {
    await browserController.close();
    res.json({ success: true, status: 'closed' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});
