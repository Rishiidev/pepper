import { ModelProvider } from './interfaces';

export class ProviderRouter {
  private providers: Map<string, ModelProvider> = new Map();

  registerProvider(provider: ModelProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): ModelProvider | undefined {
    return this.providers.get(id);
  }

  listProviders(): { id: string; name: string }[] {
    return Array.from(this.providers.values()).map(p => ({ id: p.id, name: p.name }));
  }
}

export const providerRouter = new ProviderRouter();
