import { IntelligenceSkill } from './base-skill';
import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceTask, TaskResult } from '../interfaces/task';
import { aiRouter } from '../router/ai-router';
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
    const tabListStr = session.tabs.map((t) => `- ${t.title} (${t.url})`).join('\n');

    const prompt = promptRegistry.render('workspace-summary', {
      workspace_name: session.name,
      tab_count: session.tabCount,
      tab_list: tabListStr,
    });

    const executionTask: IntelligenceTask<string, WorkspaceSummaryOutput> = {
      ...task,
      input: prompt,
      parseOutput: (raw: string) => {
        const lines = raw.split('\n').filter(Boolean);
        return {
          summary: lines[0] || `Workspace containing ${session.tabCount} tabs related to ${session.projectName || 'general tasks'}.`,
          goals: ['Review active research tabs', 'Organize project resources'],
          keyTopics: Array.from(new Set(session.tabs.map((t) => new URL(t.url).hostname).filter(Boolean))).slice(0, 4),
          suggestedNextStep: 'Bookmark key references or group related tabs.',
        };
      },
    };

    return await aiRouter.executeTask(executionTask);
  }
}
