import { TaskCapability, ProviderCapabilitiesMap } from './capability';

export interface ProviderHealth {
  isHealthy: boolean;
  latencyMs?: number;
  lastChecked: number;
  errorMessage?: string;
}

export interface StreamChunk {
  text: string;
  isDone: boolean;
}

export interface ModelProvider {
  id: string;
  name: string;
  version: string;
  capabilities: ProviderCapabilitiesMap;

  supports(capability: TaskCapability): boolean;
  healthCheck(): Promise<ProviderHealth>;
  chat(prompt: string, options?: Record<string, unknown>): Promise<string>;
  summarize(text: string, options?: Record<string, unknown>): Promise<string>;
  embed(text: string): Promise<number[]>;
  classify(text: string, categories: string[]): Promise<string>;
  generateTitle(input: string): Promise<string>;
  generateTags(input: string): Promise<string[]>;
  stream(prompt: string, onChunk: (chunk: StreamChunk) => void): Promise<void>;
}
