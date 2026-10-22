import { Page } from 'playwright';
import { ElementDescriptor, PageSnapshot } from '../types/index.js';

export class PageInspector {
  public static async inspect(page: Page, includeScreenshot: boolean = false): Promise<PageSnapshot> {
    const url = page.url();
    const title = await page.title();

    const elements: ElementDescriptor[] = await page.evaluate(() => {
      const results: ElementDescriptor[] = [];
      const interactiveQuery = 'button, input, select, textarea, a[href], [role="button"], [role="checkbox"], [role="switch"]';
      const nodes = Array.from(document.querySelectorAll(interactiveQuery));

      for (const node of nodes) {
        const el = node as HTMLElement;
        const input = el as HTMLInputElement;
        const select = el as HTMLSelectElement;

        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';

        if (!isVisible) continue;

        let selector = '';
        if (el.id) {
          selector = `#${el.id}`;
        } else if (input.name) {
          selector = `${el.tagName.toLowerCase()}[name="${input.name}"]`;
        } else {
          selector = el.tagName.toLowerCase();
        }

        results.push({
          id: el.id || '',
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role') || undefined,
          name: input.name || undefined,
          text: el.innerText ? el.innerText.trim().slice(0, 80) : undefined,
          type: input.type || undefined,
          value: input.value !== undefined ? input.value : select.value !== undefined ? select.value : undefined,
          checked: typeof input.checked === 'boolean' ? input.checked : undefined,
          disabled: input.disabled || false,
          selector,
          boundingBox: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        });
      }

      return results;
    });

    let screenshotBase64: string | undefined;
    if (includeScreenshot) {
      const buffer = await page.screenshot({ type: 'jpeg', quality: 75 });
      screenshotBase64 = buffer.toString('base64');
    }

    return {
      url,
      title,
      elements,
      screenshotBase64,
      timestamp: Date.now()
    };
  }
}
