import { IntelligenceSkill } from './base-skill';
import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceTask, TaskResult } from '../interfaces/task';
import { intelligenceService } from '../intelligence-service';
import { promptRegistry } from '../registry/prompt-registry';
import { PepperSession } from '../../types/session';

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
    const tabListStr = session.tabs.map((t) => `- ${t.title || 'Untitled'} (${t.url || ''})`).join('\n');

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

        // Safe hostname extraction without throwing
        const safeTopics: string[] = Array.from(
          new Set(
            session.tabs
              .map((t) => {
                try {
                  return t.url ? new URL(t.url).hostname.replace(/^www\./, '') : '';
                } catch {
                  return '';
                }
              })
              .filter(Boolean)
          )
        ).slice(0, 4);

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

    // Route through centralized intelligenceService for caching, telemetry, and logs
    return await intelligenceService.executeTask(executionTask, {
      cacheKey: `summary_${task.id}`,
      workspaceId: session.id,
    });
  }
}
