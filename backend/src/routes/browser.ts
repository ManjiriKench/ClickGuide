import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { browserController } from '../browser/controller.js';
import { PageInspector } from '../browser/inspector.js';

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

browserRouter.post('/close', async (_req: Request, res: Response): Promise<void> => {
  try {
    await browserController.close();
    res.json({ success: true, status: 'closed' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});
