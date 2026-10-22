import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { config } from '../config.js';
import {
  ElementDescriptor,
  GemmaPlanResult,
  PlannedAction,
  PlannedTask
} from '../types/index.js';

export const plannedActionSchema = z.object({
  type: z.enum(['click', 'fill', 'select', 'check', 'uncheck', 'inspect']),
  elementId: z.string().min(1),
  value: z.string().optional(),
  expectedResult: z.string().min(1),
  description: z.string().optional()
});

export const plannedTaskSchema = z.object({
  goal: z.string().min(1),
  explanation: z.string().default(''),
  actions: z.array(plannedActionSchema).min(1)
});

export class GemmaPlannerService {
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    const key = config.geminiApiKey;
    if (!key) {
      throw new Error(
        'GEMINI_API_KEY is not set in backend environment. Please configure GEMINI_API_KEY to enable Gemma 4 task planning.'
      );
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: key });
    }
    return this.client;
  }

  public compileContext(elements: ElementDescriptor[]): string {
    const formatted = elements.map((el) => {
      const parts: string[] = [];
      const id = el.id || el.selector.replace(/^[#.]/, '');
      parts.push(`id="${id}"`);
      parts.push(`tag="${el.tag}"`);
      if (el.type) parts.push(`type="${el.type}"`);
      if (el.role) parts.push(`role="${el.role}"`);
      if (el.name) parts.push(`name="${el.name}"`);
      if (el.text) parts.push(`text="${el.text.replace(/"/g, "'")}"`);
      if (typeof el.checked === 'boolean') parts.push(`checked=${el.checked}`);
      if (el.value !== undefined && el.value !== '') parts.push(`value="${el.value}"`);
      if (el.disabled) parts.push('disabled');
      return `[Element ${parts.join(' ')}]`;
    });

    return formatted.join('\n');
  }

  public async planTask(goal: string, elements: ElementDescriptor[]): Promise<GemmaPlanResult> {
    const startTime = Date.now();
    const model = config.gemmaModel;

    const availableIds = new Set(
      elements
        .map((e) => e.id || e.selector.replace(/^[#.]/, ''))
        .filter(Boolean)
    );

    const compiledElements = this.compileContext(elements);

    const prompt = `You are ClickGuide, a browser automation agent using Gemma 4.
Your objective is to translate a user goal into an atomic, verified sequence of browser actions.

USER GOAL:
"${goal}"

AVAILABLE INTERACTIVE CONTROLS:
${compiledElements}

STRICT INSTRUCTIONS:
1. Return ONLY a single raw JSON object matching this schema. No markdown formatting, no backticks, no explanatory prose before or after.
2. Supported action types: "click", "fill", "select", "check", "uncheck", "inspect".
3. Every "elementId" MUST strictly match an id from the AVAILABLE INTERACTIVE CONTROLS list above. Do NOT invent IDs or selectors.
4. Never generate arbitrary JavaScript or executable code.
5. Provide a clear "expectedResult" for each action to verify after execution.

REQUIRED JSON FORMAT:
{
  "goal": "${goal}",
  "explanation": "Brief rationale for selected actions",
  "actions": [
    {
      "type": "select",
      "elementId": "report-format",
      "value": "CSV",
      "expectedResult": "Report format dropdown set to CSV",
      "description": "Select CSV format in report format dropdown"
    }
  ]
}`;

    try {
      const ai = this.getClient();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Gemma API request timed out after ${config.modelTimeoutMs}ms`)),
          config.modelTimeoutMs
        )
      );

      const apiCall = ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.1
        }
      });

      const response = await Promise.race([apiCall, timeoutPromise]);
      const latencyMs = Date.now() - startTime;

      const rawText = response.text?.trim() || '';

      const usage = response.usageMetadata;
      const promptTokens = usage?.promptTokenCount || 0;
      const completionTokens = usage?.candidatesTokenCount || 0;
      const totalTokens = usage?.totalTokenCount || promptTokens + completionTokens;

      const parsedPlan = this.parseAndValidateResponse(rawText, availableIds);

      return {
        success: true,
        plan: parsedPlan,
        metrics: {
          promptTokens,
          completionTokens,
          totalTokens,
          latencyMs,
          model
        },
        rawResponse: rawText
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      return {
        success: false,
        error: errorMessage,
        metrics: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          latencyMs,
          model
        }
      };
    }
  }

  public parseAndValidateResponse(rawText: string, validElementIds?: Set<string>): PlannedTask {
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      throw new Error(`Gemma returned invalid JSON: ${rawText.slice(0, 150)}`);
    }

    const validated = plannedTaskSchema.safeParse(parsed);
    if (!validated.success) {
      const issues = validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Schema validation failed on Gemma action plan: ${issues}`);
    }

    const task = validated.data;

    if (validElementIds && validElementIds.size > 0) {
      for (const action of task.actions) {
        const normalizedId = action.elementId.replace(/^[#.]/, '');
        if (!validElementIds.has(normalizedId)) {
          throw new Error(
            `Grounding Error: Target elementId "${action.elementId}" does not exist in the page context. Valid IDs: ${Array.from(validElementIds).join(', ')}`
          );
        }
      }
    }

    return task;
  }
}

export const gemmaPlanner = new GemmaPlannerService();
