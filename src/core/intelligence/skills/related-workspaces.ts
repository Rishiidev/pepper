import { IntelligenceSkill } from './base-skill';
import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceTask, TaskResult } from '../interfaces/task';
import { PepperSession } from '../../types/session';

export interface RelatedWorkspacesInput {
  targetSession: PepperSession;
  allSessions: PepperSession[];
}

export interface RelatedWorkspaceMatch {
  session: PepperSession;
  similarityScore: number;
  reason: string;
}

export class RelatedWorkspacesSkill extends IntelligenceSkill<RelatedWorkspacesInput, RelatedWorkspaceMatch[]> {
  readonly id = 'related-workspaces';
  readonly name = 'Related Workspaces Skill';
  readonly description = 'Finds historical workspace matches using domain & topic overlap.';
  readonly version = '1.0.0';

  readonly requirements: CapabilityRequirements = {
    required: ['chat'],
  };

  async execute(task: IntelligenceTask<RelatedWorkspacesInput, RelatedWorkspaceMatch[]>): Promise<TaskResult<RelatedWorkspaceMatch[]>> {
    const { targetSession, allSessions } = task.input;
    const startTime = Date.now();

    const getSafeHostname = (url: string): string => {
      if (!url) return '';
      try {
        return new URL(url).hostname;
      } catch {
        return '';
      }
    };

    const targetDomains = new Set(targetSession.tabs.map((t) => getSafeHostname(t.url)).filter(Boolean));
    const matches: RelatedWorkspaceMatch[] = [];

    for (const other of allSessions) {
      if (other.id === targetSession.id) continue;

      const otherDomains = new Set(other.tabs.map((t) => getSafeHostname(t.url)).filter(Boolean));
      let overlap = 0;

      for (const domain of targetDomains) {
        if (otherDomains.has(domain)) overlap++;
      }

      if (overlap > 0) {
        const score = Math.round((overlap / Math.max(targetDomains.size, 1)) * 100);
        matches.push({
          session: other,
          similarityScore: score,
          reason: `Shares ${overlap} active domain(s) with ${targetSession.name}`,
        });
      }
    }

    matches.sort((a, b) => b.similarityScore - a.similarityScore);

    return {
      taskId: task.id,
      success: true,
      data: matches.slice(0, 3),
      providerId: 'local-similarity-engine',
      durationMs: Date.now() - startTime,
    };
  }
}
