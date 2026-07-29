import { IntelligenceSkill } from './base-skill';
import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceTask, TaskResult } from '../interfaces/task';
import { intelligenceService } from '../intelligence-service';
import { promptRegistry } from '../registry/prompt-registry';
import { PepperTab } from '../../types/session';
import { TokenBudgetEstimator } from '../utils/token-budget';

export class AutoTitleSkill extends IntelligenceSkill<PepperTab[], string> {
  readonly id = 'auto-title';
  readonly name = 'Auto Title Skill';
  readonly description = 'Generates a short 3-5 word context-aware title for a collection of tabs.';
  readonly version = '1.0.0';

  readonly requirements: CapabilityRequirements = {
    required: ['chat'],
  };

  async execute(task: IntelligenceTask<PepperTab[], string>): Promise<TaskResult<string>> {
    const rawTabs = task.input;

    // Apply smart context compression for prompt size optimization
    const compressed = TokenBudgetEstimator.compressTabs(rawTabs);
    const richContext = compressed
      .map((t) => `- ${t.title} (${t.domain})`)
      .join('\n');

    const prompt = promptRegistry.render('auto-title', {
      tab_list: richContext,
    });

    const executionTask: IntelligenceTask<string, string> = {
      ...task,
      input: prompt,
      parseOutput: (raw: string) => {
        let cleaned = raw.replace(/^["'`]|["'`]$/g, '').trim();

        // 1. Check for JSON output
        try {
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const titleVal = parsed.title || parsed.name || parsed.workspace_name;
            if (typeof titleVal === 'string' && titleVal.trim()) {
              return titleVal.trim();
            }
          }
        } catch {}

        // 2. Check for Mock Provider or Offline Stub
        if (cleaned.startsWith('[Mock AI]') || cleaned.includes('Intelligence Architecture')) {
          const topDomains = Array.from(new Set(compressed.map((t) => t.domain.split('.')[0]).filter(Boolean)));
          const mainDomain = topDomains[0] || 'Web';
          const capitalizedDomain = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
          const firstTabTitle = compressed[0]?.title || 'Workspace';

          return `${capitalizedDomain} ${firstTabTitle}`.substring(0, 35);
        }

        // 3. Clean line prefixes
        const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
        const firstLine = lines[0] || 'Active Workspace';
        return firstLine
          .replace(/^(Title:|Workspace Name:|\*|\#|\`)/i, '')
          .replace(/^["']|["']$/g, '')
          .trim();
      },
    };

    return await intelligenceService.executeTask(executionTask, {
      cacheKey: `title_${task.id}`,
    });
  }
}
