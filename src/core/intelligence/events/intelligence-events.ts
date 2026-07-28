import mitt, { Emitter } from 'mitt';

export type IntelligenceEventsMap = {
  'workspace.saved': { workspaceId: string; tabCount: number };
  'workspace.updated': { workspaceId: string };
  'workspace.deleted': { workspaceId: string };
  'workspace.restored': { workspaceId: string };
  'provider.registered': { providerId: string; name: string };
  'provider.removed': { providerId: string };
  'provider.health_changed': { providerId: string; isHealthy: boolean };
  'task.queued': { taskId: string; priority: string };
  'task.completed': { taskId: string; durationMs: number };
  'task.failed': { taskId: string; error: string };
  'cache.hit': { key: string };
  'cache.invalidated': { pattern?: string };
};

export const intelligenceEventBus: Emitter<IntelligenceEventsMap> = mitt<IntelligenceEventsMap>();
