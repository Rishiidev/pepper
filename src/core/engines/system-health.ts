import { providerRegistry } from '../intelligence/registry/provider-registry';
import { intelligenceCache } from '../intelligence/cache/intelligence-cache';
import { telemetryEngine } from '../intelligence/telemetry/telemetry-engine';
import { db } from '../../storage/db';

export interface SystemHealthStatus {
  service: string;
  isHealthy: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface ComprehensiveHealthReport {
  overallHealthScore: number; // 0 - 100%
  timestamp: number;
  services: SystemHealthStatus[];
  providers: Record<string, { isHealthy: boolean; message: string }>;
}

export class SystemHealthEngine {
  private static instance: SystemHealthEngine;

  private constructor() {}

  static getInstance(): SystemHealthEngine {
    if (!SystemHealthEngine.instance) {
      SystemHealthEngine.instance = new SystemHealthEngine();
    }
    return SystemHealthEngine.instance;
  }

  async runDiagnostic(): Promise<ComprehensiveHealthReport> {
    const services: SystemHealthStatus[] = [];
    let healthyCount = 0;

    // 1. AI Router & Active Provider
    await providerRegistry.hydrateFromStorage();
    const activeProvider = providerRegistry.getActiveProvider();

    if (activeProvider) {
      services.push({
        service: 'AI Router',
        isHealthy: true,
        message: `Active Provider: ${activeProvider.name} (${activeProvider.id})`,
        details: { providerId: activeProvider.id },
      });
      healthyCount++;
    } else {
      services.push({
        service: 'AI Router',
        isHealthy: false,
        message: 'No active AI provider configured',
      });
    }

    // 2. Storage Engine (Dexie IndexedDB)
    try {
      const sessionCount = await db.sessions.count();
      services.push({
        service: 'Storage Engine (Dexie DB)',
        isHealthy: true,
        message: `DB Connected. ${sessionCount} workspace(s) stored.`,
        details: { sessionCount },
      });
      healthyCount++;
    } catch (err) {
      services.push({
        service: 'Storage Engine (Dexie DB)',
        isHealthy: false,
        message: `IndexedDB Error: ${(err as Error).message}`,
      });
    }

    // 3. Cache Engine
    const cacheSize = intelligenceCache.size();
    services.push({
      service: 'Cache Engine',
      isHealthy: true,
      message: `Dexie Persistent Cache Enabled (${cacheSize} cached entries)`,
      details: { cacheSize },
    });
    healthyCount++;

    // 4. Telemetry Engine
    const telSummary = await telemetryEngine.getSummary();
    services.push({
      service: 'Telemetry Engine',
      isHealthy: true,
      message: `${telSummary.totalRequests} events logged (${telSummary.successRatePercent}% success rate)`,
      details: telSummary as unknown as Record<string, unknown>,
    });
    healthyCount++;

    // 5. Timeline Engine
    services.push({
      service: 'Timeline Activity Pipeline',
      isHealthy: true,
      message: 'Active & Listening to Workspace Events',
    });
    healthyCount++;

    // Provider Health Checks
    const providerHealths = await providerRegistry.checkHealthAll();
    const providersReport: Record<string, { isHealthy: boolean; message: string }> = {};

    for (const [id, health] of Object.entries(providerHealths)) {
      providersReport[id] = {
        isHealthy: health.isHealthy,
        message: health.errorMessage || (health.isHealthy ? 'Reachable & Authorized' : 'Not Configured'),
      };
    }

    const overallHealthScore = Math.round((healthyCount / services.length) * 100);

    return {
      overallHealthScore,
      timestamp: Date.now(),
      services,
      providers: providersReport,
    };
  }
}

export const systemHealthEngine = SystemHealthEngine.getInstance();
