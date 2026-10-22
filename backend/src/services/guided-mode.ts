import { Page } from 'playwright';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { ElementDescriptor, PlannedAction } from '../types/index.js';

export interface GuidedStep {
  stepNumber: number;
  instruction: string;
  targetId: string;
  actionType: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  visualGrounded: boolean;
}

export class GuidedModeService {
  public async showHighlight(
    page: Page,
    elementId: string,
    instruction: string
  ): Promise<{ success: boolean; box?: { x: number; y: number; width: number; height: number } }> {
    const rawId = elementId.replace(/^[#.]/, '');
    const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    const selector = `#${safeId}`;

    try {
      const locator = page.locator(selector).first();
      await locator.waitFor({ state: 'visible', timeout: 3000 });
      const box = await locator.boundingBox();

      if (!box) {
        return { success: false };
      }

      await page.evaluate(
        ({ x, y, width, height, text }) => {
          let overlay = document.getElementById('clickguide-guided-overlay');
          if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'clickguide-guided-overlay';
            overlay.style.position = 'fixed';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '999999';
            overlay.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
            document.body.appendChild(overlay);
          }

          overlay.style.left = `${x - 4}px`;
          overlay.style.top = `${y - 4}px`;
          overlay.style.width = `${width + 8}px`;
          overlay.style.height = `${height + 8}px`;
          overlay.style.border = '3px solid #6366f1';
          overlay.style.borderRadius = '8px';
          overlay.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.6), inset 0 0 10px rgba(99, 102, 241, 0.2)';

          let badge = document.getElementById('clickguide-guided-badge');
          if (!badge) {
            badge = document.createElement('div');
            badge.id = 'clickguide-guided-badge';
            badge.style.position = 'fixed';
            badge.style.background = 'linear-gradient(135deg, #1e1b4b, #312e81)';
            badge.style.color = '#ffffff';
            badge.style.padding = '6px 14px';
            badge.style.borderRadius = '6px';
            badge.style.fontFamily = 'system-ui, -apple-system, sans-serif';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = '600';
            badge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            badge.style.border = '1px solid #6366f1';
            badge.style.pointerEvents = 'none';
            badge.style.zIndex = '1000000';
            document.body.appendChild(badge);
          }

          badge.textContent = `ClickGuide: ${text}`;
          badge.style.left = `${x}px`;
          badge.style.top = `${Math.max(8, y - 36)}px`;
        },
        {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
          text: instruction
        }
      );

      return {
        success: true,
        box: {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height)
        }
      };
    } catch {
      return { success: false };
    }
  }

  public async clearHighlight(page: Page): Promise<void> {
    try {
      await page.evaluate(() => {
        const overlay = document.getElementById('clickguide-guided-overlay');
        if (overlay) overlay.remove();
        const badge = document.getElementById('clickguide-guided-badge');
        if (badge) badge.remove();
      });
    } catch {
      // Non-fatal
    }
  }

  public async visualGroundedIdentification(
    page: Page,
    goal: string,
    elements: ElementDescriptor[]
  ): Promise<{ targetId: string | null; confidence: number; method: 'dom' | 'multimodal' | 'ambiguous' }> {
    const lower = goal.toLowerCase();

    for (const el of elements) {
      if (el.id && lower.includes(el.id.toLowerCase().replace(/-/g, ' '))) {
        return { targetId: el.id, confidence: 0.95, method: 'dom' };
      }
    }

    if (config.geminiApiKey) {
      try {
        const screenshotBuf = await page.screenshot({ type: 'jpeg', quality: 60 });
        const base64Img = screenshotBuf.toString('base64');

        const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

        const prompt = `Inspect this interface screenshot.
Task goal: "${goal}"
Available DOM element IDs: ${elements.map((e) => e.id).filter(Boolean).join(', ')}

Return ONLY JSON:
{
  "bestElementId": "<id from the list or null>",
  "confidence": 0.85
}`;

        const res = await ai.models.generateContent({
          model: config.gemmaModel,
          contents: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Img
              }
            }
          ]
        });

        const raw = res.text?.trim() || '';
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed.bestElementId && elements.some((e) => e.id === parsed.bestElementId)) {
            return {
              targetId: parsed.bestElementId,
              confidence: parsed.confidence || 0.8,
              method: 'multimodal'
            };
          }
        }
      } catch {
        // Fallback to deterministic
      }
    }

    return { targetId: null, confidence: 0, method: 'ambiguous' };
  }
}

export const guidedMode = new GuidedModeService();
