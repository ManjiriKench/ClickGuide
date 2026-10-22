import { ElementDescriptor, PageSnapshot } from '../types/index.js';

export type ContextMode = 'full' | 'compressed' | 'incremental';

export interface ScoredElement {
  element: ElementDescriptor;
  score: number;
  matchedTerms: string[];
}

export interface ElementDiff {
  type: 'added' | 'removed' | 'modified';
  elementId: string;
  field?: string;
  previousValue?: unknown;
  currentValue?: unknown;
}

export interface ContextCompilationResult {
  mode: ContextMode;
  contextText: string;
  retainedElements: ElementDescriptor[];
  metrics: {
    fullSizeChars: number;
    compressedSizeChars: number;
    reductionPercentage: number;
    preparationLatencyMs: number;
    targetRetained: boolean;
  };
  diffs?: ElementDiff[];
  isCacheInvalidated?: boolean;
}

export class ContextCompiler {
  private previousSnapshot: PageSnapshot | null = null;

  public rankElements(goal: string, elements: ElementDescriptor[]): ScoredElement[] {
    const tokens = goal
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const isToggleGoal = /(disable|enable|turn off|turn on|toggle|switch|checkbox)/i.test(goal);
    const isSelectGoal = /(select|choose|format|dropdown|option)/i.test(goal);
    const isSaveGoal = /(save|submit|apply|confirm|update)/i.test(goal);

    return elements.map((el) => {
      let score = 0;
      const matchedTerms: string[] = [];
      const searchable = [
        el.id,
        el.name || '',
        el.text || '',
        el.role || '',
        el.tag,
        el.type || ''
      ].join(' ').toLowerCase();

      for (const token of tokens) {
        if (searchable.includes(token)) {
          score += 6;
          matchedTerms.push(token);
        }
      }

      if (el.id) {
        for (const token of tokens) {
          if (el.id.toLowerCase().includes(token)) {
            score += 4;
          }
        }
      }

      if (isToggleGoal && (el.type === 'checkbox' || el.role === 'switch' || el.role === 'checkbox')) {
        score += 5;
      }
      if (isSelectGoal && el.tag === 'select') {
        score += 5;
      }
      if (isSaveGoal && (el.tag === 'button' || el.type === 'submit')) {
        score += 4;
      }

      if (el.disabled) {
        score -= 5;
      }

      return {
        element: el,
        score,
        matchedTerms
      };
    }).sort((a, b) => b.score - a.score);
  }

  public compileFull(snapshot: PageSnapshot): string {
    const lines: string[] = [
      `PAGE URL: ${snapshot.url}`,
      `PAGE TITLE: ${snapshot.title}`,
      `INTERACTIVE DOM ELEMENTS (${snapshot.elements.length} controls):`
    ];

    for (const el of snapshot.elements) {
      const attrs: string[] = [
        `id="${el.id || el.selector}"`,
        `tag="${el.tag}"`
      ];
      if (el.type) attrs.push(`type="${el.type}"`);
      if (el.name) attrs.push(`name="${el.name}"`);
      if (el.role) attrs.push(`role="${el.role}"`);
      if (el.text) attrs.push(`text="${el.text.replace(/"/g, "'")}"`);
      if (typeof el.checked === 'boolean') attrs.push(`checked=${el.checked}`);
      if (el.value !== undefined && el.value !== '') attrs.push(`value="${el.value}"`);
      if (el.disabled) attrs.push('disabled="true"');
      if (el.boundingBox) {
        attrs.push(`bounds=[${el.boundingBox.x},${el.boundingBox.y},${el.boundingBox.width},${el.boundingBox.height}]`);
      }
      lines.push(`  <${el.tag} ${attrs.join(' ')} />`);
    }

    return lines.join('\n');
  }

  public compileCompressed(goal: string, snapshot: PageSnapshot, maxElements: number = 8): ContextCompilationResult {
    const startTime = performance.now();
    const fullText = this.compileFull(snapshot);

    const ranked = this.rankElements(goal, snapshot.elements);
    const topElements = ranked.slice(0, maxElements).map((r) => r.element);

    const lines: string[] = [
      `GOAL: "${goal}"`,
      `RELEVANT CONTROLS (${topElements.length} of ${snapshot.elements.length}):`
    ];

    for (const el of topElements) {
      const parts: string[] = [el.id || el.selector, el.tag];
      if (el.type) parts.push(`type:${el.type}`);
      if (el.name) parts.push(`name:${el.name}`);
      if (el.text) parts.push(`text:"${el.text.replace(/"/g, "'").slice(0, 40)}"`);
      if (typeof el.checked === 'boolean') parts.push(`checked:${el.checked}`);
      if (el.value !== undefined && el.value !== '') parts.push(`val:"${el.value}"`);
      lines.push(`- [${parts.join(' | ')}]`);
    }

    const compressedText = lines.join('\n');
    const latency = performance.now() - startTime;

    const fullSize = fullText.length;
    const compSize = compressedText.length;
    const reduction = fullSize > 0 ? Math.round(((fullSize - compSize) / fullSize) * 100) : 0;

    const topIds = new Set(topElements.map((e) => e.id));
    const targetRetained = ranked.length > 0 && ranked[0].score > 0 ? topIds.has(ranked[0].element.id) : true;

    return {
      mode: 'compressed',
      contextText: compressedText,
      retainedElements: topElements,
      metrics: {
        fullSizeChars: fullSize,
        compressedSizeChars: compSize,
        reductionPercentage: Math.max(0, reduction),
        preparationLatencyMs: Math.round(latency * 100) / 100,
        targetRetained
      }
    };
  }

  public compileIncremental(current: PageSnapshot): ContextCompilationResult {
    const startTime = performance.now();
    const fullText = this.compileFull(current);

    if (!this.previousSnapshot) {
      this.previousSnapshot = current;
      return {
        mode: 'incremental',
        contextText: `INITIAL SNAPSHOT: ${current.elements.length} elements recorded.`,
        retainedElements: current.elements,
        metrics: {
          fullSizeChars: fullText.length,
          compressedSizeChars: fullText.length,
          reductionPercentage: 0,
          preparationLatencyMs: Math.round((performance.now() - startTime) * 100) / 100,
          targetRetained: true
        },
        diffs: [],
        isCacheInvalidated: false
      };
    }

    const prevMap = new Map(this.previousSnapshot.elements.map((e) => [e.id || e.selector, e]));
    const currMap = new Map(current.elements.map((e) => [e.id || e.selector, e]));

    const diffs: ElementDiff[] = [];

    for (const [id, currEl] of currMap) {
      const prevEl = prevMap.get(id);
      if (!prevEl) {
        diffs.push({ type: 'added', elementId: id, currentValue: currEl });
      } else {
        if (currEl.checked !== prevEl.checked) {
          diffs.push({
            type: 'modified',
            elementId: id,
            field: 'checked',
            previousValue: prevEl.checked,
            currentValue: currEl.checked
          });
        }
        if (currEl.value !== prevEl.value) {
          diffs.push({
            type: 'modified',
            elementId: id,
            field: 'value',
            previousValue: prevEl.value,
            currentValue: currEl.value
          });
        }
      }
    }

    for (const [id, prevEl] of prevMap) {
      if (!currMap.has(id)) {
        diffs.push({ type: 'removed', elementId: id, previousValue: prevEl });
      }
    }

    const navigationOccurred = current.url !== this.previousSnapshot.url;
    const isCacheInvalidated = navigationOccurred || diffs.length > 0;

    const diffSummary = diffs.map((d) => {
      if (d.type === 'modified') {
        return `MODIFIED [${d.elementId}]: ${d.field} changed from "${d.previousValue}" to "${d.currentValue}"`;
      }
      return `${d.type.toUpperCase()} [${d.elementId}]`;
    });

    const contextText = [
      `INCREMENTAL STATE TRANSITIONS (${diffs.length} updates):`,
      navigationOccurred ? `* NAVIGATION: Navigated to ${current.url}` : '',
      ...diffSummary
    ].filter(Boolean).join('\n');

    this.previousSnapshot = current;
    const latency = performance.now() - startTime;

    const fullSize = fullText.length;
    const compSize = contextText.length;
    const reduction = fullSize > 0 ? Math.round(((fullSize - compSize) / fullSize) * 100) : 0;

    return {
      mode: 'incremental',
      contextText,
      retainedElements: current.elements,
      metrics: {
        fullSizeChars: fullSize,
        compressedSizeChars: compSize,
        reductionPercentage: Math.max(0, reduction),
        preparationLatencyMs: Math.round(latency * 100) / 100,
        targetRetained: true
      },
      diffs,
      isCacheInvalidated
    };
  }

  public resetSnapshot(): void {
    this.previousSnapshot = null;
  }
}

export const contextCompiler = new ContextCompiler();
