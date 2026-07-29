import { IntelligenceSkill } from './base-skill';
import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceTask, TaskResult } from '../interfaces/task';
import { intelligenceService } from '../intelligence-service';
import { FocusSession } from '../../types/focus-session';

export interface FocusSummaryOutput {
  summary: string;
  accomplishments: string[];
  suggestedNextStep: string;
}

export class FocusSummarySkill extends IntelligenceSkill<FocusSession, FocusSummaryOutput> {
  readonly id = 'focus-summary';
  readonly name = 'Focus Session Summary Skill';
  readonly description = 'Generates executive work summary, accomplishments, and next step for a focus session.';
  readonly version = '1.0.0';

  readonly requirements: CapabilityRequirements = {
    required: ['summarize', 'chat'],
  };

  async execute(task: IntelligenceTask<FocusSession, FocusSummaryOutput>): Promise<TaskResult<FocusSummaryOutput>> {
    const session = task.input;
    const minutes = Math.max(1, Math.round(session.elapsedSeconds / 60));

    const prompt = `You are Pepper's Work Memory AI. Analyze this ${minutes}-minute focus session for workspace "${session.workspaceName}".

Workspace: ${session.workspaceName}
Project: ${session.projectName || 'General'}
Focus Mode: ${session.mode}
Duration Worked: ${minutes} minutes
Tabs / Context Domains: ${(session.visitedDomains || []).join(', ') || 'Web apps'}

Generate a crisp 2-sentence executive summary of the progress made, 3 bullet accomplishments, and 1 suggested next logical step.

Return JSON in this format:
{
  "summary": "You spent ${minutes} minutes working on ${session.workspaceName}.",
  "accomplishments": ["Progressed key tasks", "Researched technical context", "Reviewed open resources"],
  "suggestedNextStep": "Review completed work and resume workspace flow."
}`;

    const executionTask: IntelligenceTask<string, FocusSummaryOutput> = {
      ...task,
      input: prompt,
      parseOutput: (raw: string) => {
        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.summary) {
              return {
                summary: parsed.summary,
                accomplishments: Array.isArray(parsed.accomplishments) ? parsed.accomplishments : ['Advanced key workspace goals'],
                suggestedNextStep: parsed.suggestedNextStep || 'Resume workspace tasks.',
              };
            }
          }
        } catch {}

        return {
          summary: `Focused for ${minutes} minutes on ${session.workspaceName}.`,
          accomplishments: [
            `Completed ${minutes}m of deep work`,
            `Engaged with ${(session.visitedDomains || []).join(', ') || 'workspace tools'}`,
            `Preserved task momentum`,
          ],
          suggestedNextStep: 'Review workspace tabs and continue next action.',
        };
      },
    };

    return await intelligenceService.executeTask(executionTask, {
      cacheKey: `focus_summary_${session.id}`,
    });
  }
}
