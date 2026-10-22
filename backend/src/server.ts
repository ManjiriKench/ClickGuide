import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { browserRouter } from './routes/browser.js';
import { demoRouter } from './routes/demo.js';
import { browserController } from './browser/controller.js';

const app = express();

app.use(cors({
  origin: [config.frontendOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.use('/demo', demoRouter);

app.use('/api/browser', browserRouter);

app.get('/api/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    browserActive: browserController.isLaunched()
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

export const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`ClickGuide backend listening on http://127.0.0.1:${config.port}`);
  console.log(`Demo site accessible at http://127.0.0.1:${config.port}/demo`);
});

const handleShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down cleanly...`);
  try {
    await browserController.close();
  } catch {
    // Non-fatal during shutdown
  }
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default app;
