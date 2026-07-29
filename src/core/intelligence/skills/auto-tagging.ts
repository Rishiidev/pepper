import { IntelligenceSkill } from './base-skill';
import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceTask, TaskResult } from '../interfaces/task';
import { intelligenceService } from '../intelligence-service';
import { promptRegistry } from '../registry/prompt-registry';
import { PepperTab } from '../../types/session';

export class AutoTaggingSkill extends IntelligenceSkill<PepperTab[], string[]> {
  readonly id = 'auto-tagging';
  readonly name = 'Auto Tagging Skill';
  readonly description = 'Extracts 3-5 specific, non-generic tags for a workspace.';
  readonly version = '1.0.0';

  readonly requirements: CapabilityRequirements = {
    required: ['chat'],
  };

  async execute(task: IntelligenceTask<PepperTab[], string[]>): Promise<TaskResult<string[]>> {
    const tabs = task.input;
    const tabStr = tabs.map((t) => `${t.title || 'Untitled'} (${t.url || ''})`).join('\n');

    const prompt = promptRegistry.render('auto-tags', {
      tab_list: tabStr,
    });

    const executionTask: IntelligenceTask<string, string[]> = {
      ...task,
      input: prompt,
      parseOutput: (raw: string) => {
        // Attempt JSON parse
        try {
          const jsonMatch = raw.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed)) {
              return parsed.map((t) => String(t).replace(/^[#\s]+/, '').toLowerCase().trim()).slice(0, 5);
            }
          }
        } catch {}

        const rawTags = raw
          .split(/[,;\n]/)
          .map((t) => t.replace(/^[#\-*\s]+/, '').trim().toLowerCase())
          .filter((t) => t.length > 1 && !t.includes(':'));

        const uniqueTags = Array.from(new Set(rawTags));
        if (uniqueTags.length > 0) return uniqueTags.slice(0, 5);

        // Fallback domain extraction
        const domainTags: string[] = Array.from(
          new Set(
            tabs
              .map((t) => {
                try {
                  return t.url ? new URL(t.url).hostname.replace(/^www\./, '').split('.')[0] : '';
                } catch {
                  return '';
                }
              })
              .filter(Boolean)
          )
        ).slice(0, 4);

        return domainTags.length > 0 ? domainTags : ['workspace', 'research'];
      },
    };

    // Route through centralized intelligenceService for caching, telemetry, and logs
    return await intelligenceService.executeTask(executionTask, {
      cacheKey: `tags_${task.id}`,
    });
  }
}
