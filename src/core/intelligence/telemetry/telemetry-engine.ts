import { db } from '../../../storage/db';

export interface TelemetryEvent {
  id: string;
  timestamp: number;
  task: string;
  provider: string;
  latencyMs: number;
  tokensEst: number;
  costEstUsd: number;
  cacheHit: boolean;
  status: 'success' | 'error';
  errorDetails?: string;
}

export interface TelemetrySummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRatePercent: number;
  avgLatencyMs: number;
  totalTokensEst: number;
  totalCostEstUsd: number;
  cacheHitRatePercent: number;
}

export class TelemetryEngine {
  private static instance: TelemetryEngine;
  private memoryLogs: TelemetryEvent[] = [];

  private constructor() {}

  static getInstance(): TelemetryEngine {
    if (!TelemetryEngine.instance) {
      TelemetryEngine.instance = new TelemetryEngine();
    }
    return TelemetryEngine.instance;
  }

  async recordEvent(event: Omit<TelemetryEvent, 'id' | 'timestamp'>): Promise<TelemetryEvent> {
    const fullEvent: TelemetryEvent = {
      id: `tel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      ...event,
    };

    this.memoryLogs.push(fullEvent);
    if (this.memoryLogs.length > 500) {
      this.memoryLogs.shift();
    }

    try {
      await db.cache.put({
        key: `telemetry_${fullEvent.id}`,
        value: fullEvent,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days retention
      });
    } catch {
      // Memory fallback
    }

    return fullEvent;
  }

  async getSummary(): Promise<TelemetrySummary> {
    const events = this.memoryLogs;
    if (events.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRatePercent: 100,
        avgLatencyMs: 0,
        totalTokensEst: 0,
        totalCostEstUsd: 0,
        cacheHitRatePercent: 0,
      };
    }

    const totalRequests = events.length;
    const successfulRequests = events.filter((e) => e.status === 'success').length;
    const failedRequests = events.filter((e) => e.status === 'error').length;
    const successRatePercent = Math.round((successfulRequests / totalRequests) * 100);

    const totalLatency = events.reduce((sum, e) => sum + e.latencyMs, 0);
    const avgLatencyMs = Math.round(totalLatency / totalRequests);

    const totalTokensEst = events.reduce((sum, e) => sum + e.tokensEst, 0);
    const totalCostEstUsd = Number(events.reduce((sum, e) => sum + e.costEstUsd, 0).toFixed(4));

    const cacheHits = events.filter((e) => e.cacheHit).length;
    const cacheHitRatePercent = Math.round((cacheHits / totalRequests) * 100);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRatePercent,
      avgLatencyMs,
      totalTokensEst,
      totalCostEstUsd,
      cacheHitRatePercent,
    };
  }

  getRecentLogs(limit = 20): TelemetryEvent[] {
    return [...this.memoryLogs].reverse().slice(0, limit);
  }
}

export const telemetryEngine = TelemetryEngine.getInstance();
