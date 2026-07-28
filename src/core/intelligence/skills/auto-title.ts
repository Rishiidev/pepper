import { IntelligenceSkill } from './base-skill';
import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceTask, TaskResult } from '../interfaces/task';
import { aiRouter } from '../router/ai-router';
import { promptRegistry } from '../registry/prompt-registry';
import { PepperTab } from '../../types/session';

export class AutoTitleSkill extends IntelligenceSkill<PepperTab[], string> {
  readonly id = 'auto-title';
  readonly name = 'Auto Title Skill';
  readonly description = 'Generates a short 3-5 word context-aware title for a collection of tabs.';
  readonly version = '1.0.0';

  readonly requirements: CapabilityRequirements = {
    required: ['chat'],
  };

  async execute(task: IntelligenceTask<PepperTab[], string>): Promise<TaskResult<string>> {
    const tabs = task.input;
    const tabTitles = tabs.map((t) => `- ${t.title}`).join('\n');

    const prompt = promptRegistry.render('auto-title', {
      tab_list: tabTitles,
    });

    const executionTask: IntelligenceTask<string, string> = {
      ...task,
      input: prompt,
      parseOutput: (raw: string) => {
        const cleaned = raw.replace(/^["']|["']$/g, '').trim();
        return cleaned.split('\n')[0] || 'Browser Workspace';
      },
    };

    return await aiRouter.executeTask(executionTask);
  }
}
