import { IntelligenceSkill } from './base-skill';
import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceTask, TaskResult } from '../interfaces/task';
import { aiRouter } from '../router/ai-router';
import { promptRegistry } from '../registry/prompt-registry';
import { PepperTab } from '../../types/session';

export class AutoTaggingSkill extends IntelligenceSkill<PepperTab[], string[]> {
  readonly id = 'auto-tagging';
  readonly name = 'Auto Tagging Skill';
  readonly description = 'Extracts 3-5 specific, non-generic tags for a workspace.';
  readonly version = '1.0.0';

  readonly requirements: CapabilityRequirements = {
    required: ['chat', 'classification'],
  };

  async execute(task: IntelligenceTask<PepperTab[], string[]>): Promise<TaskResult<string[]>> {
    const tabs = task.input;
    const tabStr = tabs.map((t) => `${t.title} (${t.url})`).join('\n');

    const prompt = promptRegistry.render('auto-tags', {
      tab_list: tabStr,
    });

    const executionTask: IntelligenceTask<string, string[]> = {
      ...task,
      input: prompt,
      parseOutput: (raw: string) => {
        const rawTags = raw.split(/[,;\n]/).map((t) => t.replace(/^[#\s]+/, '').trim().toLowerCase());
        return Array.from(new Set(rawTags.filter(Boolean))).slice(0, 5);
      },
    };

    return await aiRouter.executeTask(executionTask);
  }
}
