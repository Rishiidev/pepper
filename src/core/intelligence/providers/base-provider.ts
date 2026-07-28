import { ModelProvider, ProviderHealth, StreamChunk } from '../interfaces/provider';
import { TaskCapability, ProviderCapabilitiesMap } from '../interfaces/capability';
import { IntelligenceError } from '../interfaces/errors';

export abstract class BaseProvider implements ModelProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly capabilities: ProviderCapabilitiesMap;

  supports(capability: TaskCapability): boolean {
    return !!this.capabilities[capability];
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      isHealthy: true,
      lastChecked: Date.now(),
    };
  }

  async chat(prompt: string, _options?: Record<string, unknown>): Promise<string> {
    this.ensureCapability('chat');
    return `[${this.name}] Response to: ${prompt}`;
  }

  async summarize(text: string, _options?: Record<string, unknown>): Promise<string> {
    this.ensureCapability('summarize');
    return `Summary of ${text.length} characters using ${this.name}`;
  }

  async embed(_text: string): Promise<number[]> {
    this.ensureCapability('embeddings');
    return new Array(1536).fill(0).map(() => Math.random());
  }

  async classify(_text: string, categories: string[]): Promise<string> {
    this.ensureCapability('classification');
    return categories[0] || 'General';
  }

  async generateTitle(_input: string): Promise<string> {
    this.ensureCapability('chat');
    return 'Generated Workspace Title';
  }

  async generateTags(_input: string): Promise<string[]> {
    this.ensureCapability('chat');
    return ['productivity', 'work', 'research'];
  }

  async stream(prompt: string, onChunk: (chunk: StreamChunk) => void): Promise<void> {
    this.ensureCapability('streaming');
    onChunk({ text: `[${this.name}] Stream chunk for: ${prompt}`, isDone: true });
  }

  protected ensureCapability(capability: TaskCapability): void {
    if (!this.supports(capability)) {
      throw new IntelligenceError(
        'CAPABILITY_UNSUPPORTED',
        `Provider ${this.name} does not support capability '${capability}'`,
        this.id
      );
    }
  }
}
