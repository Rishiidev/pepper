import { BaseProvider } from './base-provider';
import { ProviderCapabilitiesMap } from '../interfaces/capability';
import { ProviderHealth } from '../interfaces/provider';
import { IntelligenceError } from '../interfaces/errors';

export class OpenRouterProvider extends BaseProvider {
  readonly id = 'openrouter';
  readonly name = 'OpenRouter Gateway';
  readonly version = '1.0.0';

  readonly capabilities: ProviderCapabilitiesMap = {
    chat: true,
    summarize: true,
    embeddings: false,
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
    this.model = config?.model || 'anthropic/claude-3.5-sonnet';
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    if (!this.apiKey) {
      return {
        isHealthy: false,
        lastChecked: startTime,
        errorMessage: 'OpenRouter API key is missing.',
      };
    }

    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (res.ok) {
        return {
          isHealthy: true,
          latencyMs: Date.now() - startTime,
          lastChecked: startTime,
        };
      }
      const errText = await res.text().catch(() => '');
      return {
        isHealthy: false,
        lastChecked: startTime,
        errorMessage: `HTTP ${res.status}: OpenRouter auth check failed ${errText.substring(0, 100)}`,
      };
    } catch (err) {
      return {
        isHealthy: false,
        lastChecked: startTime,
        errorMessage: (err as Error).message,
      };
    }
  }

  async chat(prompt: string, _options?: Record<string, unknown>): Promise<string> {
    if (!this.apiKey) {
      throw new IntelligenceError('INVALID_KEY', 'OpenRouter API key is missing. Please configure key in Settings.', this.id);
    }
    this.ensureCapability('chat');

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/Rishiidev/pepper',
          'X-Title': 'PEPPER Workspace Manager',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        let detailedMsg = `HTTP ${res.status}`;
        try {
          const parsed = JSON.parse(errorBody);
          if (parsed.error?.message) detailedMsg += `: ${parsed.error.message}`;
        } catch {
          if (errorBody) detailedMsg += `: ${errorBody.substring(0, 150)}`;
        }
        throw new IntelligenceError('TASK_FAILED', `OpenRouter ${detailedMsg}`, this.id);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new IntelligenceError('TASK_FAILED', 'OpenRouter returned empty choices array', this.id);
      }

      return content;
    } catch (err) {
      if (err instanceof IntelligenceError) throw err;
      throw new IntelligenceError('NETWORK_ERROR', (err as Error).message, this.id);
    }
  }
}
