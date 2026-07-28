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

    // Build rich context with Title, URL, and Domain
    const richContext = tabs
      .map((t) => {
        let domain = '';
        try {
          if (t.url) domain = new URL(t.url).hostname.replace(/^www\./, '');
        } catch {
          domain = '';
        }
        return `- ${t.title || 'Untitled'} (${domain || t.url})`;
      })
      .slice(0, 10)
      .join('\n');

    const prompt = promptRegistry.render('auto-title', {
      tab_list: richContext,
    });

    const executionTask: IntelligenceTask<string, string> = {
      ...task,
      input: prompt,
      parseOutput: (raw: string) => {
        let cleaned = raw.replace(/^["']|["']$/g, '').trim();

        // If mock provider response, generate heuristic title from domains/titles
        if (cleaned.startsWith('[Mock AI]') || cleaned.includes('Intelligence Architecture')) {
          const topDomains = Array.from(
            new Set(
              tabs
                .map((t) => {
                  try {
                    return new URL(t.url).hostname.replace(/^www\./, '').split('.')[0];
                  } catch {
                    return '';
                  }
                })
                .filter(Boolean)
            )
          );

          const mainDomain = topDomains[0] || 'Web';
          const capitalizedDomain = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
          const firstTabTitle = tabs[0]?.title?.split(/[-|–]/)[0].trim() || 'Workspace';

          return `${capitalizedDomain} ${firstTabTitle}`.substring(0, 35);
        }

        const lines = cleaned.split('\n').filter(Boolean);
        const titleLine = lines[0] || 'Active Workspace';
        return titleLine.replace(/^(Title:|Workspace Name:|\*|\#)/i, '').trim();
      },
    };

    return await aiRouter.executeTask(executionTask);
  }
}
