export interface AITraceStage {
  stage: string;
  timestamp: number;
  status: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: unknown;
}

export class AILogger {
  private static instance: AILogger;
  private traces: Map<string, AITraceStage[]> = new Map();

  private constructor() {}

  static getInstance(): AILogger {
    if (!AILogger.instance) {
      AILogger.instance = new AILogger();
    }
    return AILogger.instance;
  }

  startTrace(traceId: string): void {
    this.traces.set(traceId, []);
    this.log(traceId, 'TRACE_START', 'info', `Started AI Request Trace [${traceId}]`);
  }

  log(traceId: string, stage: string, status: 'info' | 'success' | 'warning' | 'error', message: string, data?: unknown): void {
    const stages = this.traces.get(traceId) || [];
    const entry: AITraceStage = {
      stage,
      timestamp: Date.now(),
      status,
      message,
      data,
    };
    stages.push(entry);
    this.traces.set(traceId, stages);

    const prefix = `[AI Pipeline][${traceId}][${stage}]`;
    if (status === 'error') {
      console.error(`${prefix} ❌ ${message}`, data || '');
    } else if (status === 'warning') {
      console.warn(`${prefix} ⚠️ ${message}`, data || '');
    } else {
      console.log(`${prefix} ${status === 'success' ? '✔' : 'ℹ'} ${message}`, data || '');
    }
  }

  getTrace(traceId: string): AITraceStage[] {
    return this.traces.get(traceId) || [];
  }

  getAllTraces(): Map<string, AITraceStage[]> {
    return this.traces;
  }
}

export const aiLogger = AILogger.getInstance();
