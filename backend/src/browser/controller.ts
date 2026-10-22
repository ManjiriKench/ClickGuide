import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs';
import { config } from '../config.js';
import { BrowserAction, ActionResult } from '../types/index.js';

export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isInitializing: boolean = false;

  public async launch(): Promise<void> {
    if (this.page && !this.page.isClosed()) {
      return;
    }

    if (this.isInitializing) {
      throw new Error('Browser is currently launching');
    }

    this.isInitializing = true;

    try {
      if (!this.browser || !this.browser.isConnected()) {
        this.browser = await chromium.launch({
          headless: config.browserHeadless,
          args: [
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-extensions'
          ]
        });
      }

      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      });

      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(config.actionTimeoutMs);

      await this.navigate(config.demoBaseUrl);
    } finally {
      this.isInitializing = false;
    }
  }

  public isLaunched(): boolean {
    return Boolean(this.page && !this.page.isClosed());
  }

  public getPage(): Page {
    if (!this.page || this.page.isClosed()) {
      throw new Error('Browser is not launched or has been closed');
    }
    return this.page;
  }

  public async navigate(targetUrl: string): Promise<void> {
    const page = this.getPage();
    let url = targetUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    const parsed = new URL(url);

    if (parsed.hostname === '169.254.169.254' || parsed.hostname === 'metadata.google.internal') {
      throw new Error('Security Exception: Navigation to cloud metadata IP is prohibited');
    }

    if (!config.allowedHosts.includes(parsed.hostname)) {
      config.allowedHosts.push(parsed.hostname);
    }

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  public async captureScreenshot(): Promise<string> {
    const page = this.getPage();
    const buffer = await page.screenshot({ type: 'jpeg', quality: 80 });
    return buffer.toString('base64');
  }

  public async executeAction(action: BrowserAction): Promise<ActionResult> {
    const startTime = Date.now();
    const page = this.getPage();

    try {
      const locator = page.locator(action.selector).first();
      await locator.waitFor({ state: 'attached', timeout: config.actionTimeoutMs });

      let beforeState: Record<string, unknown> = {};
      try {
        beforeState = await locator.evaluate((el: HTMLElement) => {
          const input = el as HTMLInputElement;
          const select = el as HTMLSelectElement;
          return {
            tagName: el.tagName,
            type: input.type || null,
            checked: typeof input.checked === 'boolean' ? input.checked : null,
            value: input.value !== undefined ? input.value : select.value !== undefined ? select.value : null,
            textContent: el.textContent?.trim() || null
          };
        });
      } catch {
        // Evaluate failure on state retrieval is non-fatal
      }

      switch (action.type) {
        case 'click':
          await locator.click();
          break;

        case 'check':
          await locator.check();
          break;

        case 'uncheck':
          await locator.uncheck();
          break;

        case 'fill':
          await locator.fill(action.value || '');
          if (/search|query/i.test(action.selector) || /search/i.test(action.description || '')) {
            try {
              await locator.press('Enter');
              await page.waitForLoadState('domcontentloaded', { timeout: 4000 }).catch(() => {});
            } catch {
              // Non-fatal submit
            }
          }
          break;

        case 'select':
          if (!action.value) {
            throw new Error('Value required for select action');
          }
          await locator.selectOption(action.value);
          break;

        case 'scroll':
          await locator.scrollIntoViewIfNeeded();
          break;

        default:
          throw new Error(`Unsupported action type: ${(action as BrowserAction).type}`);
      }

      await page.waitForTimeout(200);

      let afterState: Record<string, unknown> = {};
      try {
        afterState = await locator.evaluate((el: HTMLElement) => {
          const input = el as HTMLInputElement;
          const select = el as HTMLSelectElement;
          return {
            tagName: el.tagName,
            type: input.type || null,
            checked: typeof input.checked === 'boolean' ? input.checked : null,
            value: input.value !== undefined ? input.value : select.value !== undefined ? select.value : null,
            textContent: el.textContent?.trim() || null
          };
        });
      } catch {
        // Non-fatal
      }

      return {
        success: true,
        action,
        timestamp: Date.now(),
        durationMs: Date.now() - startTime,
        beforeState,
        afterState
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action,
        timestamp: Date.now(),
        durationMs: Date.now() - startTime,
        error: errorMessage
      };
    }
  }

  public async close(): Promise<void> {
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
    this.page = null;
  }
}

export const browserController = new BrowserController();
