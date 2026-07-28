import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceTask, TaskResult } from '../interfaces/task';

export abstract class IntelligenceSkill<TInput = unknown, TOutput = unknown> {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly version: string;
  abstract readonly requirements: CapabilityRequirements;

  abstract execute(task: IntelligenceTask<TInput, TOutput>): Promise<TaskResult<TOutput>>;
}
