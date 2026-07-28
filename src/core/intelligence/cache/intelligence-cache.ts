import { intelligenceEventBus } from '../events/intelligence-events';

interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  workspaceId?: string;
  createdAt: number;
  expiresAt?: number;
}

export class IntelligenceCache {
  private static instance: IntelligenceCache;
  private cache = new Map<string, CacheEntry>();
  private ttlMs = 1000 * 60 * 60 * 24; // 24 hours default TTL

  private constructor() {
    this.registerEventListeners();
  }

  static getInstance(): IntelligenceCache {
    if (!IntelligenceCache.instance) {
      IntelligenceCache.instance = new IntelligenceCache();
    }
    return IntelligenceCache.instance;
  }

  set<T>(key: string, data: T, workspaceId?: string, customTtlMs?: number): void {
    const entry: CacheEntry<T> = {
      key,
      data,
      workspaceId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (customTtlMs ?? this.ttlMs),
    };
    this.cache.set(key, entry as CacheEntry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    intelligenceEventBus.emit('cache.hit', { key });
    return entry.data as T;
  }

  invalidateWorkspace(workspaceId: string): void {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.workspaceId === workspaceId) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      intelligenceEventBus.emit('cache.invalidated', { pattern: `workspace_${workspaceId}` });
    }
  }

  clear(): void {
    this.cache.clear();
    intelligenceEventBus.emit('cache.invalidated', { pattern: 'all' });
  }

  size(): number {
    return this.cache.size;
  }

  private registerEventListeners(): void {
    intelligenceEventBus.on('workspace.updated', ({ workspaceId }) => {
      this.invalidateWorkspace(workspaceId);
    });

    intelligenceEventBus.on('workspace.deleted', ({ workspaceId }) => {
      this.invalidateWorkspace(workspaceId);
    });
  }
}

export const intelligenceCache = IntelligenceCache.getInstance();
