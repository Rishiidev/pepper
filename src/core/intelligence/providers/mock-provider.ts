import { BaseProvider } from './base-provider';
import { ProviderCapabilitiesMap } from '../interfaces/capability';

export class MockProvider extends BaseProvider {
  readonly id = 'mock-provider-offline';
  readonly name = 'PEPPER Mock Provider (Offline Stub)';
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

  async chat(prompt: string): Promise<string> {
    return `[Mock AI] Intelligence Architecture Ready. Processed: "${prompt.substring(0, 40)}..."`;
  }

  async summarize(text: string): Promise<string> {
    return `[Mock Summary] Concise summary of workspace containing ${text.length} chars.`;
  }

  async generateTitle(input: string): Promise<string> {
    const clean = input.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = clean.split(/\s+/).slice(0, 4).join(' ');
    return words ? `Workspace: ${words}` : 'New Workspace';
  }

  async generateTags(_input: string): Promise<string[]> {
    return ['development', 'web-tracker', 'pepper-v2'];
  }
}
