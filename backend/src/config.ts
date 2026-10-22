import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  demoBaseUrl: process.env.DEMO_BASE_URL || 'http://127.0.0.1:5000/demo',
  browserProfileDir: path.resolve(process.cwd(), '.browser-profile'),
  allowedHosts: ['localhost', '127.0.0.1'],
  allowAnyOrigin: process.env.ALLOW_ANY_ORIGIN === 'true',
  browserHeadless: process.env.HEADLESS !== 'false',
  actionTimeoutMs: 5000,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  gemmaModel: process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it',
  modelTimeoutMs: parseInt(process.env.MODEL_TIMEOUT_MS || '45000', 10)
};
