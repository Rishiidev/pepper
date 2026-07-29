import { BaseProvider } from './base-provider';
import { ProviderCapabilitiesMap } from '../interfaces/capability';
import { ProviderHealth } from '../interfaces/provider';
import { IntelligenceError } from '../interfaces/errors';

export class AnthropicProvider extends BaseProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic (Claude)';
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
  private endpoint: string;

  constructor(config?: { apiKey?: string; model?: string; endpoint?: string }) {
    super();
    this.apiKey = config?.apiKey;
    this.model = config?.model || 'claude-3-5-sonnet-20241022';
    this.endpoint = config?.endpoint || 'https://api.anthropic.com/v1';
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    if (!this.apiKey) {
      return {
        isHealthy: false,
        lastChecked: startTime,
        errorMessage: 'Anthropic API key is missing.',
      };
    }

    try {
      const res = await this.chat('ping');
      return {
        isHealthy: true,
        latencyMs: Date.now() - startTime,
        lastChecked: startTime,
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
      throw new IntelligenceError('INVALID_KEY', 'Anthropic API key is missing.', this.id);
    }
    this.ensureCapability('chat');

    const maxTokens = (options?.maxTokens as number) || 250;

    try {
      const res = await fetch(`${this.endpoint}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new IntelligenceError(
          res.status === 429 ? 'RATE_LIMIT' : 'TASK_FAILED',
          errJson.error?.message || `Anthropic API returned HTTP ${res.status}`,
          this.id
        );
      }

      const data = await res.json();
      return data.content?.[0]?.text || '';
    } catch (err) {
      if (err instanceof IntelligenceError) throw err;
      throw new IntelligenceError('NETWORK_ERROR', (err as Error).message, this.id);
    }
  }
}
