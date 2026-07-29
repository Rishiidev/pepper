import { IntelligenceSkill } from './base-skill';
import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceTask, TaskResult } from '../interfaces/task';
import { intelligenceService } from '../intelligence-service';
import { promptRegistry } from '../registry/prompt-registry';
import { PepperSession } from '../../types/session';
import { TokenBudgetEstimator } from '../utils/token-budget';

export interface WorkspaceSummaryOutput {
  summary: string;
  goals: string[];
  keyTopics: string[];
  suggestedNextStep: string;
}

export class WorkspaceSummarySkill extends IntelligenceSkill<PepperSession, WorkspaceSummaryOutput> {
  readonly id = 'workspace-summary';
  readonly name = 'Workspace Summary Skill';
  readonly description = 'Generates executive summary, project goals, key topics, and next steps for a workspace.';
  readonly version = '1.0.0';

  readonly requirements: CapabilityRequirements = {
    required: ['summarize', 'chat'],
  };

  async execute(task: IntelligenceTask<PepperSession, WorkspaceSummaryOutput>): Promise<TaskResult<WorkspaceSummaryOutput>> {
    const session = task.input;

    // Apply smart context compression for prompt size optimization
    const compressed = TokenBudgetEstimator.compressTabs(session.tabs);
    const tabListStr = compressed.map((t) => `- ${t.title} (${t.domain})`).join('\n');

    const prompt = promptRegistry.render('workspace-summary', {
      workspace_name: session.name,
      tab_count: session.tabCount,
      tab_list: tabListStr,
    });

    const executionTask: IntelligenceTask<string, WorkspaceSummaryOutput> = {
      ...task,
      input: prompt,
      parseOutput: (raw: string) => {
        // Attempt JSON parse first
        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.summary) {
              return {
                summary: parsed.summary,
                goals: Array.isArray(parsed.goals) ? parsed.goals : ['Review active research tabs'],
                keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
                suggestedNextStep: parsed.suggestedNextStep || 'Resume workspace tasks.',
              };
            }
          }
        } catch {}

        // Safe hostname extraction
        const safeTopics = Array.from(new Set(compressed.map((t) => t.domain.split('.')[0]).filter(Boolean))).slice(0, 4);
        const lines = raw.split('\n').filter((l) => l.trim().length > 0);
        const summaryText = lines[0]?.replace(/^Summary:?/i, '').trim() ||
          `Workspace containing ${session.tabCount} active browser tabs for ${session.projectName || 'tasks'}.`;

        return {
          summary: summaryText,
          goals: ['Review research tabs', 'Organize workspace project'],
          keyTopics: safeTopics,
          suggestedNextStep: 'Resume workspace tasks.',
        };
      },
    };

    return await intelligenceService.executeTask(executionTask, {
      cacheKey: `summary_${task.id}`,
      workspaceId: session.id,
    });
  }
}
