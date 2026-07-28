export interface LogEntry {
  id: string;
  taskId: string;
  skillId?: string;
  providerId?: string;
  status: 'STARTED' | 'COMPLETED' | 'FAILED';
  durationMs?: number;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  errorCode?: string;
  errorMessage?: string;
  timestamp: number;
}

export class IntelligenceLogger {
  private static instance: IntelligenceLogger;
  private logs: LogEntry[] = [];
  private maxLogs = 200;

  private constructor() {}

  static getInstance(): IntelligenceLogger {
    if (!IntelligenceLogger.instance) {
      IntelligenceLogger.instance = new IntelligenceLogger();
    }
    return IntelligenceLogger.instance;
  }

  logStart(taskId: string, skillId?: string, providerId?: string): string {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      taskId,
      skillId,
      providerId,
      status: 'STARTED',
      timestamp: Date.now(),
    };
    this.addLog(entry);
    return entry.id;
  }

  logComplete(
    taskId: string,
    providerId: string,
    durationMs: number,
    tokensUsed?: LogEntry['tokensUsed']
  ): void {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      taskId,
      providerId,
      status: 'COMPLETED',
      durationMs,
      tokensUsed,
      timestamp: Date.now(),
    };
    this.addLog(entry);
  }

  logFailure(taskId: string, providerId?: string, errorCode?: string, errorMessage?: string): void {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      taskId,
      providerId,
      status: 'FAILED',
      errorCode,
      errorMessage,
      timestamp: Date.now(),
    };
    this.addLog(entry);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  private addLog(entry: LogEntry): void {
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }
}

export const intelligenceLogger = IntelligenceLogger.getInstance();
