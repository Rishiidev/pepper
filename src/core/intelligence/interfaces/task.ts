import { CapabilityRequirements } from './capability';

export type TaskPriority = 'HIGH' | 'LOW' | 'BACKGROUND' | 'SCHEDULED';

export interface ExecutionContext {
  workspaceId?: string;
  userId?: string;
  traceId: string;
  createdAt: number;
}

export interface IntelligenceTask<TInput = unknown, TOutput = unknown> {
  id: string;
  skillId: string;
  priority: TaskPriority;
  requirements: CapabilityRequirements;
  input: TInput;
  context: ExecutionContext;
  maxRetries?: number;
  timeoutMs?: number;
  parseOutput?: (raw: string) => TOutput;
}

export interface TaskResult<TOutput = unknown> {
  taskId: string;
  success: boolean;
  data?: TOutput;
  error?: string;
  providerId: string;
  durationMs: number;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cached?: boolean;
}
