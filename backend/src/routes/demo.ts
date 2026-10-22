import { Router, Request, Response, static as expressStatic } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const demoRouter = Router();

const demoPublicPath = path.resolve(__dirname, '../demo-site/public');

let inMemoryDemoSettings = {
  promoNotifications: true,
  emailNotifications: true,
  reportFormat: 'PDF',
  theme: 'Light',
  updatedAt: new Date().toISOString()
};

demoRouter.use(expressStatic(demoPublicPath));

demoRouter.get('/api/settings', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    settings: inMemoryDemoSettings
  });
});

demoRouter.post('/api/settings', (req: Request, res: Response): void => {
  const { promoNotifications, emailNotifications, reportFormat, theme } = req.body;

  inMemoryDemoSettings = {
    promoNotifications: typeof promoNotifications === 'boolean' ? promoNotifications : inMemoryDemoSettings.promoNotifications,
    emailNotifications: typeof emailNotifications === 'boolean' ? emailNotifications : inMemoryDemoSettings.emailNotifications,
    reportFormat: reportFormat || inMemoryDemoSettings.reportFormat,
    theme: theme || inMemoryDemoSettings.theme,
    updatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    settings: inMemoryDemoSettings
  });
});
