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
  readonly version = '1.1.0';

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
            if (parsed.summary && typeof parsed.summary === 'string') {
              return {
                summary: this.cleanSummaryText(parsed.summary, session),
                goals: Array.isArray(parsed.goals) ? parsed.goals : ['Review active research tabs'],
                keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
                suggestedNextStep: parsed.suggestedNextStep || 'Resume workspace tasks.',
              };
            }
          }
        } catch {}

        const safeTopics = Array.from(new Set(compressed.map((t) => t.domain.split('.')[0]).filter(Boolean))).slice(0, 4);
        const summaryText = this.cleanSummaryText(raw, session);

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

  private cleanSummaryText(raw: string, session: PepperSession): string {
    if (!raw || typeof raw !== 'string') {
      return `Workspace containing ${session.tabCount} active browser tabs for ${session.projectName || 'general tasks'}.`;
    }

    let text = raw.trim();

    // Strip Markdown images ![alt](url) and links [text](url)
    text = text.replace(/!\[.*?\]\(.*?\)/g, '');
    text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');

    // Strip URLs & HTML tags
    text = text.replace(/https?:\/\/\S+/gi, '');
    text = text.replace(/<[^>]*>/g, '');

    // Strip conversational preambles
    text = text.replace(/^(here's a summary of|here is a summary of|sure|summary:?|overview:?)/gi, '').trim();

    // Take the first clean non-empty paragraph/line
    const firstParagraph = text.split('\n\n')[0] || text.split('\n')[0] || '';
    let cleaned = firstParagraph
      .replace(/^[\*\#\`>\s\d\.-]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || cleaned.length < 10 || cleaned.toLowerCase().includes('favicon')) {
      const topDomains = Array.from(
        new Set(
          session.tabs
            .map((t) => {
              try {
                return new URL(t.url).hostname.replace(/^www\./, '');
              } catch {
                return '';
              }
            })
            .filter(Boolean)
        )
      ).slice(0, 3);

      return `Contains ${session.tabCount} browser tabs spanning ${topDomains.join(', ') || 'web resources'}.`;
    }

    // Limit to max 180 chars
    if (cleaned.length > 180) {
      cleaned = cleaned.substring(0, 177).trim() + '...';
    }

    return cleaned;
  }
}
