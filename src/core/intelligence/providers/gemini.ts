import { BaseProvider } from './base-provider';
import { ProviderCapabilitiesMap } from '../interfaces/capability';
import { ProviderHealth } from '../interfaces/provider';
import { IntelligenceError } from '../interfaces/errors';

export class GeminiProvider extends BaseProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly version = '1.0.0';

  readonly capabilities: ProviderCapabilitiesMap = {
    chat: true,
    summarize: true,
    embeddings: true,
    vision: true,
    code: true,
    structured_output: true,
    classification: true,
    streaming: true,
  };

  private apiKey?: string;
  private model: string;

  constructor(config?: { apiKey?: string; model?: string }) {
    super();
    this.apiKey = config?.apiKey;
    this.model = config?.model || 'gemini-1.5-flash';
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    if (!this.apiKey) {
      return {
        isHealthy: false,
        lastChecked: startTime,
        errorMessage: 'Gemini API key is missing.',
      };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}?key=${this.apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        return {
          isHealthy: true,
          latencyMs: Date.now() - startTime,
          lastChecked: startTime,
        };
      }
      return {
        isHealthy: false,
        lastChecked: startTime,
        errorMessage: `HTTP ${res.status}: Invalid Gemini API Key or Model`,
      };
    } catch (err) {
      return {
        isHealthy: false,
        lastChecked: startTime,
        errorMessage: (err as Error).message,
      };
    }
  }

  async chat(prompt: string, options?: Record<string, unknown>): Promise<string> {
    if (!this.apiKey) {
      throw new IntelligenceError('INVALID_KEY', 'Gemini API key is missing.', this.id);
    }
    this.ensureCapability('chat');

    const maxTokens = (options?.maxTokens as number) || 250;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
          },
        }),
      });

      if (!res.ok) {
        throw new IntelligenceError('TASK_FAILED', `Gemini API returned HTTP ${res.status}`, this.id);
      }

      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      if (err instanceof IntelligenceError) throw err;
      throw new IntelligenceError('NETWORK_ERROR', (err as Error).message, this.id);
    }
  }
}
