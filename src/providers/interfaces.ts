export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
}

export interface ModelProvider {
  id: string;
  name: string;
  generateName(tabTitles: string[]): Promise<string>;
  summarizeWorkspace(tabTitles: string[], urls: string[]): Promise<string>;
  generateTags(tabTitles: string[]): Promise<string[]>;
}
