import { BaseProvider } from './base-provider';
import { ProviderCapabilitiesMap } from '../interfaces/capability';
import { ProviderHealth } from '../interfaces/provider';
import { IntelligenceError } from '../interfaces/errors';

export class OpenAIProvider extends BaseProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
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
  private endpoint: string;

  constructor(config?: { apiKey?: string; model?: string; endpoint?: string }) {
    super();
    this.apiKey = config?.apiKey;
    this.model = config?.model || 'gpt-4o-mini';
    this.endpoint = config?.endpoint || 'https://api.openai.com/v1';
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  setModel(model: string): void {
    this.model = model;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    if (!this.apiKey) {
      return {
        isHealthy: false,
        lastChecked: startTime,
        errorMessage: 'OpenAI API key is missing.',
      };
    }

    try {
      const res = await fetch(`${this.endpoint}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (res.ok) {
        return {
          isHealthy: true,
          latencyMs: Date.now() - startTime,
          lastChecked: startTime,
        };
      }
      const errJson = await res.json().catch(() => ({}));
      return {
        isHealthy: false,
        lastChecked: startTime,
        errorMessage: errJson.error?.message || `HTTP ${res.status}: Authentication failed`,
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
    this.ensureApiKey();
    this.ensureCapability('chat');

    const maxTokens = (options?.maxTokens as number) || 250;

    const payload: Record<string, any> = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    };

    if (this.model.startsWith('o1')) {
      payload.max_completion_tokens = maxTokens;
    } else {
      payload.max_tokens = maxTokens;
    }

    try {
      const res = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new IntelligenceError(
          res.status === 429 ? 'RATE_LIMIT' : 'TASK_FAILED',
          errJson.error?.message || `OpenAI API returned HTTP ${res.status}`,
          this.id
        );
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      if (err instanceof IntelligenceError) throw err;
      throw new IntelligenceError('NETWORK_ERROR', (err as Error).message, this.id);
    }
  }

  async embed(text: string): Promise<number[]> {
    this.ensureApiKey();
    this.ensureCapability('embeddings');

    try {
      const res = await fetch(`${this.endpoint}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!res.ok) {
        throw new IntelligenceError('TASK_FAILED', `Embedding request failed with HTTP ${res.status}`, this.id);
      }

      const data = await res.json();
      return data.data?.[0]?.embedding || [];
    } catch (err) {
      if (err instanceof IntelligenceError) throw err;
      throw new IntelligenceError('NETWORK_ERROR', (err as Error).message, this.id);
    }
  }

  private ensureApiKey(): void {
    if (!this.apiKey) {
      throw new IntelligenceError('INVALID_KEY', 'OpenAI API key is missing. Please configure it in Settings.', this.id);
    }
  }
}
