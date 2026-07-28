import { IntelligenceError } from '../interfaces/errors';

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  template: string;
}

export class PromptRegistry {
  private static instance: PromptRegistry;
  private templates = new Map<string, PromptTemplate>();

  private constructor() {
    this.registerDefaults();
  }

  static getInstance(): PromptRegistry {
    if (!PromptRegistry.instance) {
      PromptRegistry.instance = new PromptRegistry();
    }
    return PromptRegistry.instance;
  }

  register(prompt: PromptTemplate): void {
    this.templates.set(prompt.id, prompt);
  }

  get(id: string): PromptTemplate {
    const template = this.templates.get(id);
    if (!template) {
      throw new IntelligenceError('INVALID_PROMPT', `Prompt template '${id}' not registered in PromptRegistry`);
    }
    return template;
  }

  render(id: string, variables: Record<string, string | number>): string {
    const prompt = this.get(id);
    let output = prompt.template;
    for (const [key, value] of Object.entries(variables)) {
      output = output.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return output;
  }

  getAll(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  private registerDefaults(): void {
    this.register({
      id: 'workspace-summary',
      name: 'Workspace Summary Template',
      version: '1.0.0',
      template: 'Analyze the following workspace tabs: {{workspace_name}} ({{tab_count}} tabs):\n{{tab_list}}',
    });

    this.register({
      id: 'auto-tags',
      name: 'Auto Tags Template',
      version: '1.0.0',
      template: 'Extract 3-5 tags for:\n{{tab_list}}',
    });

    this.register({
      id: 'auto-title',
      name: 'Auto Title Template',
      version: '1.0.0',
      template: 'Generate a title for:\n{{tab_list}}',
    });

    this.register({
      id: 'semantic-search',
      name: 'Semantic Search Ranking Template',
      version: '1.0.0',
      template: 'Rank items for query: "{{query}}"\nItems:\n{{workspace_items}}',
    });
  }
}

export const promptRegistry = PromptRegistry.getInstance();
