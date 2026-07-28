import { BaseProvider } from './base-provider';
import { ProviderCapabilitiesMap } from '../interfaces/capability';
import { ProviderHealth } from '../interfaces/provider';
import { IntelligenceError } from '../interfaces/errors';

export class OllamaProvider extends BaseProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama (Local LLM)';
  readonly version = '1.0.0';

  readonly capabilities: ProviderCapabilitiesMap = {
    chat: true,
    summarize: true,
    embeddings: true,
    vision: false,
    code: true,
    structured_output: true,
    classification: true,
    streaming: true,
  };

  private endpoint: string;
  private model: string;

  constructor(config?: { endpoint?: string; model?: string }) {
    super();
    this.endpoint = config?.endpoint || 'http://localhost:11434';
    this.model = config?.model || 'llama3';
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      const res = await fetch(`${this.endpoint}/api/tags`);
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
        errorMessage: `HTTP ${res.status}: Ollama local server not responding`,
      };
    } catch {
      return {
        isHealthy: false,
        lastChecked: startTime,
        errorMessage: 'Ollama instance offline. Make sure Ollama is running locally.',
      };
    }
  }

  async chat(prompt: string, _options?: Record<string, unknown>): Promise<string> {
    this.ensureCapability('chat');

    try {
      const res = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
        }),
      });

      if (!res.ok) {
        throw new IntelligenceError('PROVIDER_OFFLINE', `Ollama returned HTTP ${res.status}`, this.id);
      }

      const data = await res.json();
      return data.response || '';
    } catch (err) {
      if (err instanceof IntelligenceError) throw err;
      throw new IntelligenceError('PROVIDER_OFFLINE', 'Failed to connect to local Ollama server.', this.id);
    }
  }
}
