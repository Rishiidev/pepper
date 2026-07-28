import { intelligenceEventBus } from '../events/intelligence-events';
import { db } from '../../../storage/db';

interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  workspaceId?: string;
  createdAt: number;
  expiresAt?: number;
}

export class IntelligenceCache {
  private static instance: IntelligenceCache;
  private memoryMap = new Map<string, CacheEntry>();
  private ttlMs = 1000 * 60 * 60 * 24; // 24 hours default TTL

  private constructor() {
    this.hydrateFromDb();
    this.registerEventListeners();
  }

  static getInstance(): IntelligenceCache {
    if (!IntelligenceCache.instance) {
      IntelligenceCache.instance = new IntelligenceCache();
    }
    return IntelligenceCache.instance;
  }

  private async hydrateFromDb(): Promise<void> {
    try {
      const items = await db.cache.toArray();
      const now = Date.now();

      for (const item of items) {
        if (item.expiresAt && now > item.expiresAt) {
          await db.cache.delete(item.key);
          continue;
        }

        this.memoryMap.set(item.key, {
          key: item.key,
          data: item.value,
          createdAt: now,
          expiresAt: item.expiresAt,
        });
      }
    } catch (err) {
      console.warn('[IntelligenceCache] Failed to hydrate cache from Dexie DB:', err);
    }
  }

  async set<T>(key: string, data: T, workspaceId?: string, customTtlMs?: number): Promise<void> {
    const expiresAt = Date.now() + (customTtlMs ?? this.ttlMs);
    const entry: CacheEntry<T> = {
      key,
      data,
      workspaceId,
      createdAt: Date.now(),
      expiresAt,
    };

    this.memoryMap.set(key, entry as CacheEntry);

    try {
      await db.cache.put({
        key,
        value: data,
        expiresAt,
      });
    } catch (err) {
      console.warn('[IntelligenceCache] Failed to persist cache entry to Dexie DB:', err);
    }
  }

  get<T>(key: string): T | null {
    const entry = this.memoryMap.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryMap.delete(key);
      db.cache.delete(key).catch(() => {});
      return null;
    }

    intelligenceEventBus.emit('cache.hit', { key });
    return entry.data as T;
  }

  async invalidateWorkspace(workspaceId: string): Promise<void> {
    let count = 0;
    for (const [key, entry] of this.memoryMap.entries()) {
      if (entry.workspaceId === workspaceId) {
        this.memoryMap.delete(key);
        db.cache.delete(key).catch(() => {});
        count++;
      }
    }
    if (count > 0) {
      intelligenceEventBus.emit('cache.invalidated', { pattern: `workspace_${workspaceId}` });
    }
  }

  async clear(): Promise<void> {
    this.memoryMap.clear();
    try {
      await db.cache.clear();
    } catch {}
    intelligenceEventBus.emit('cache.invalidated', { pattern: 'all' });
  }

  size(): number {
    return this.memoryMap.size;
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
