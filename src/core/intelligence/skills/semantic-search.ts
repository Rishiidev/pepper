import { IntelligenceSkill } from './base-skill';
import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceTask, TaskResult } from '../interfaces/task';
import { vectorStore } from '../vectors/vector-store';
import { providerRegistry } from '../registry/provider-registry';
import { PepperSession } from '../../types/session';

export interface SemanticSearchQuery {
  query: string;
  sessions: PepperSession[];
}

export class SemanticSearchSkill extends IntelligenceSkill<SemanticSearchQuery, PepperSession[]> {
  readonly id = 'semantic-search';
  readonly name = 'Semantic Vector Search Skill';
  readonly description = 'Ranks workspaces using cosine similarity vector embeddings.';
  readonly version = '1.0.0';

  readonly requirements: CapabilityRequirements = {
    required: ['chat'],
  };

  async execute(task: IntelligenceTask<SemanticSearchQuery, PepperSession[]>): Promise<TaskResult<PepperSession[]>> {
    const { query, sessions } = task.input;
    const startTime = Date.now();

    try {
      const active = providerRegistry.getActiveProvider();
      let queryVector: number[] | null = null;

      if (active && active.capabilities.embeddings && typeof (active as any).embed === 'function') {
        try {
          queryVector = await (active as any).embed(query);
        } catch {
          queryVector = null;
        }
      }

      if (queryVector) {
        const vectorMatches = await vectorStore.findSimilar(queryVector, 5, 0.2);
        const matchedIds = new Set(vectorMatches.map((m) => m.sessionId));
        const results = sessions.filter((s) => matchedIds.has(s.id));
        return {
          taskId: task.id,
          success: true,
          data: results.length > 0 ? results : sessions.slice(0, 3),
          providerId: active!.id,
          durationMs: Date.now() - startTime,
        };
      }

      // Safe keyword fallback matching if embeddings are not configured/supported
      const matched = sessions.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        (s.projectName && s.projectName.toLowerCase().includes(query.toLowerCase())) ||
        s.tabs.some((t) => t.title.toLowerCase().includes(query.toLowerCase()))
      );

      return {
        taskId: task.id,
        success: true,
        data: matched.length > 0 ? matched : sessions.slice(0, 3),
        providerId: 'local-keyword-matching',
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        taskId: task.id,
        success: false,
        error: (err as Error).message,
        providerId: 'local-keyword-matching',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
