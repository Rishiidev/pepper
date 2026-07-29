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
  readonly version = '1.1.0';

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
        return this.cleanWorkspaceTitle(raw, compressed);
      },
    };

    return await intelligenceService.executeTask(executionTask, {
      cacheKey: `title_${task.id}`,
    });
  }

  /**
   * Aggressively cleans and sanitizes raw LLM output into a crisp 3-5 word title.
   * Strips conversational filler, markdown formatting, links, image tags, and tab dumps.
   */
  private cleanWorkspaceTitle(raw: string, compressedTabs: Array<{ title: string; domain: string }>): string {
    if (!raw || typeof raw !== 'string') {
      return this.fallbackTitle(compressedTabs);
    }

    let text = raw.trim();

    // 1. Try extracting JSON first if present
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const titleVal = parsed.title || parsed.name || parsed.workspace_name;
        if (typeof titleVal === 'string' && titleVal.trim()) {
          text = titleVal.trim();
        }
      }
    } catch {}

    // 2. Strip Markdown images ![alt](url) and links [text](url)
    text = text.replace(/!\[.*?\]\(.*?\)/g, '');
    text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');

    // 3. Strip URLs & HTML tags
    text = text.replace(/https?:\/\/\S+/gi, '');
    text = text.replace(/<[^>]*>/g, '');

    // 4. Strip conversational preambles
    text = text.replace(/^(here's|here is|sure|this is|workspace|summary of|a summary of|collection of|list of|tabs open|open tabs|active workspace).*?:/gi, '');
    text = text.replace(/^(here's|here is|sure|this is|workspace|summary of|a summary of).*?\b(title|summary|overview|tabs|pages)\b/gi, '');

    // 5. Take first line and remove markdown syntax (*, #, `, ", ')
    const firstLine = text.split('\n').map((l) => l.trim()).filter(Boolean)[0] || '';
    let cleaned = firstLine
      .replace(/^(Title:|Workspace Name:|\*|\#|\`|>|\d+\.)/gi, '')
      .replace(/^["'`:-\s]+|["'`:-\s]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // 6. Validation checks: If output is still too long, contains URL artifacts, or looks like a tab dump/conversational preamble
    const isTabDump = cleaned.toLowerCase().includes('http') || cleaned.toLowerCase().includes('favicon') || cleaned.length > 50;
    const isConversational = /^(here|sure|below|following|i have|the tabs)/i.test(cleaned);

    if (!cleaned || isTabDump || isConversational) {
      return this.fallbackTitle(compressedTabs);
    }

    // Limit to 45 chars max
    if (cleaned.length > 45) {
      cleaned = cleaned.substring(0, 42).trim() + '...';
    }

    return cleaned;
  }

  private fallbackTitle(compressed: Array<{ title: string; domain: string }>): string {
    const topDomains = Array.from(
      new Set(
        compressed
          .map((t) => {
            const base = t.domain.replace(/^www\./, '').split('.')[0];
            return base.charAt(0).toUpperCase() + base.slice(1);
          })
          .filter(Boolean)
      )
    ).slice(0, 2);

    if (topDomains.length >= 2) {
      return `${topDomains[0]} & ${topDomains[1]}`;
    } else if (topDomains.length === 1) {
      const firstTabTitle = (compressed[0]?.title || 'Workspace').split(/[-|–:]/)[0].trim();
      return `${topDomains[0]} — ${firstTabTitle.substring(0, 20)}`;
    }
    return 'Active Workspace';
  }
}
