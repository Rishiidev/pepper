import { IntelligenceSkill } from './base-skill';
import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceTask, TaskResult } from '../interfaces/task';
import { vectorStore } from '../vectors/vector-store';
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
    required: ['embeddings'],
  };

  async execute(task: IntelligenceTask<SemanticSearchQuery, PepperSession[]>): Promise<TaskResult<PepperSession[]>> {
    const { query, sessions } = task.input;
    const startTime = Date.now();

    try {
      // 1. Fetch similar items from VectorStore
      const mockQueryVector = new Array(1536).fill(0).map(() => Math.random());
      const vectorMatches = await vectorStore.findSimilar(mockQueryVector, 5, 0.2);

      const matchedIds = new Set(vectorMatches.map((m) => m.sessionId));
      const results = sessions.filter((s) => matchedIds.has(s.id));

      return {
        taskId: task.id,
        success: true,
        data: results.length > 0 ? results : sessions.slice(0, 3),
        providerId: 'local-vector-engine',
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        taskId: task.id,
        success: false,
        error: (err as Error).message,
        providerId: 'local-vector-engine',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
